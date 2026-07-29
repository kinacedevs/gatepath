-- Gatepath Realtors — Admin authentication + Row-Level Security lockdown
-- ============================================================================
-- Fixes CRITIQUE.md P0-1: /admin had no authentication, and the anon key
-- could read every client's PII and payment history directly via the public
-- Supabase REST endpoint regardless of the UI. That is the actual hole this
-- migration closes — gating the admin.tsx route alone would have been
-- cosmetic without this.
--
-- SAFE TO RE-RUN: every statement is idempotent (CREATE OR REPLACE, DROP
-- POLICY IF EXISTS before CREATE POLICY, CREATE ... IF NOT EXISTS). Running
-- this twice, or against a database that already has some of these objects,
-- will not error and will not duplicate anything.
--
-- WHAT THIS DOES NOT FIX YET (by design, so it doesn't break what currently
-- works):
--   - payments/agreements/bookings/inquiries INSERT stays open to anonymous
--     visitors, because thank-you.tsx, the booking forms, and the diaspora
--     form all write to these tables directly from the browser today. This
--     is CRITIQUE P0-2 (forgeable payment records) — a separate, larger fix
--     requiring a verified Paystack webhook. Locking INSERT down now would
--     break every purchase and booking on the site immediately.
--   - plots UPDATE stays open to anonymous visitors for the same reason —
--     the reservation flow updates plot status from the browser. See
--     CRITIQUE P1-1 (reservation race condition), also pending.
--   - client_otps (the portal's OTP table) is untouched — it isn't even in
--     the generated Database type, and the whole mechanism needs a proper
--     server-verified rebuild (CRITIQUE P0-3), not an RLS patch.
--
-- What DOES close today: nobody but a recognised, logged-in Gatepath staff
-- account can SELECT/UPDATE/DELETE inquiries, bookings, payments,
-- agreements, or admin_users — the actual PII/payment-history exposure.
-- ============================================================================


-- ── 1. Admin identity helpers ──────────────────────────────────────────────
-- Matches by email against admin_users, since admin_users has no column
-- linking it to auth.users today. To grant someone access: create their
-- Supabase Auth user (Dashboard → Authentication → Users → Add User) with
-- the SAME email as their admin_users row. No UUID copying required.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where email = lower(auth.jwt() ->> 'email')
  );
$$;

create or replace function public.current_admin_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.admin_users
  where email = lower(auth.jwt() ->> 'email')
  limit 1;
$$;

-- Email must be unique for the matching above to be unambiguous.
create unique index if not exists admin_users_email_unique_idx
  on public.admin_users (lower(email));


-- ── 2. phases — public read, admin write ───────────────────────────────────
alter table public.phases enable row level security;

drop policy if exists "phases_public_select" on public.phases;
create policy "phases_public_select" on public.phases
  for select to anon, authenticated using (true);

drop policy if exists "phases_admin_insert" on public.phases;
create policy "phases_admin_insert" on public.phases
  for insert to authenticated with check (public.is_admin());

drop policy if exists "phases_admin_update" on public.phases;
create policy "phases_admin_update" on public.phases
  for update to authenticated using (public.is_admin());

drop policy if exists "phases_admin_delete" on public.phases;
create policy "phases_admin_delete" on public.phases
  for delete to authenticated using (public.is_admin());


-- ── 3. plot_sizes — public read, admin write ───────────────────────────────
alter table public.plot_sizes enable row level security;

drop policy if exists "plot_sizes_public_select" on public.plot_sizes;
create policy "plot_sizes_public_select" on public.plot_sizes
  for select to anon, authenticated using (true);

drop policy if exists "plot_sizes_admin_insert" on public.plot_sizes;
create policy "plot_sizes_admin_insert" on public.plot_sizes
  for insert to authenticated with check (public.is_admin());

drop policy if exists "plot_sizes_admin_update" on public.plot_sizes;
create policy "plot_sizes_admin_update" on public.plot_sizes
  for update to authenticated using (public.is_admin());

drop policy if exists "plot_sizes_admin_delete" on public.plot_sizes;
create policy "plot_sizes_admin_delete" on public.plot_sizes
  for delete to authenticated using (public.is_admin());


-- ── 4. plots — public read; UPDATE left open (see header note, P0-2/P1-1
--      pending); INSERT/DELETE (whole-row inventory changes) admin-only ────
alter table public.plots enable row level security;

drop policy if exists "plots_public_select" on public.plots;
create policy "plots_public_select" on public.plots
  for select to anon, authenticated using (true);

drop policy if exists "plots_public_update_TEMP" on public.plots;
create policy "plots_public_update_TEMP" on public.plots
  for update to anon, authenticated using (true);
-- ^ TEMP: remove this policy once the reservation flow is moved behind a
--   verified server-side write path (CRITIQUE P0-2/P1-1). Left permissive
--   on purpose so this migration doesn't break plot reservation today.

drop policy if exists "plots_admin_insert" on public.plots;
create policy "plots_admin_insert" on public.plots
  for insert to authenticated with check (public.is_admin());

drop policy if exists "plots_admin_delete" on public.plots;
create policy "plots_admin_delete" on public.plots
  for delete to authenticated using (public.is_admin());


-- ── 5. inquiries — public can create, only admin can read/manage ──────────
alter table public.inquiries enable row level security;

drop policy if exists "inquiries_public_insert" on public.inquiries;
create policy "inquiries_public_insert" on public.inquiries
  for insert to anon, authenticated with check (true);

drop policy if exists "inquiries_admin_select" on public.inquiries;
create policy "inquiries_admin_select" on public.inquiries
  for select to authenticated using (public.is_admin());

drop policy if exists "inquiries_admin_update" on public.inquiries;
create policy "inquiries_admin_update" on public.inquiries
  for update to authenticated using (public.is_admin());

drop policy if exists "inquiries_admin_delete" on public.inquiries;
create policy "inquiries_admin_delete" on public.inquiries
  for delete to authenticated using (public.is_admin());


-- ── 6. bookings — public can create, only admin can read/manage ───────────
alter table public.bookings enable row level security;

drop policy if exists "bookings_public_insert" on public.bookings;
create policy "bookings_public_insert" on public.bookings
  for insert to anon, authenticated with check (true);

drop policy if exists "bookings_admin_select" on public.bookings;
create policy "bookings_admin_select" on public.bookings
  for select to authenticated using (public.is_admin());

drop policy if exists "bookings_admin_update" on public.bookings;
create policy "bookings_admin_update" on public.bookings
  for update to authenticated using (public.is_admin());

drop policy if exists "bookings_admin_delete" on public.bookings;
create policy "bookings_admin_delete" on public.bookings
  for delete to authenticated using (public.is_admin());


-- ── 7. payments — public can create (pending P0-2 fix), only admin reads ──
-- This SELECT lockdown is the single highest-value line in this migration:
-- today anyone with the anon key can read every client's payment history.
alter table public.payments enable row level security;

drop policy if exists "payments_public_insert_TEMP" on public.payments;
create policy "payments_public_insert_TEMP" on public.payments
  for insert to anon, authenticated with check (true);
-- ^ TEMP: remove once Paystack webhook verification replaces the direct
--   browser insert in thank-you.tsx (CRITIQUE P0-2).

drop policy if exists "payments_admin_select" on public.payments;
create policy "payments_admin_select" on public.payments
  for select to authenticated using (public.is_admin());

drop policy if exists "payments_admin_update" on public.payments;
create policy "payments_admin_update" on public.payments
  for update to authenticated using (public.is_admin());

drop policy if exists "payments_admin_delete" on public.payments;
create policy "payments_admin_delete" on public.payments
  for delete to authenticated using (public.is_admin());


-- ── 8. agreements — public can create (pending P0-2 fix), only admin reads ─
alter table public.agreements enable row level security;

drop policy if exists "agreements_public_insert_TEMP" on public.agreements;
create policy "agreements_public_insert_TEMP" on public.agreements
  for insert to anon, authenticated with check (true);
-- ^ TEMP: same reasoning as payments above.

drop policy if exists "agreements_admin_select" on public.agreements;
create policy "agreements_admin_select" on public.agreements
  for select to authenticated using (public.is_admin());

drop policy if exists "agreements_admin_update" on public.agreements;
create policy "agreements_admin_update" on public.agreements
  for update to authenticated using (public.is_admin());

drop policy if exists "agreements_admin_delete" on public.agreements;
create policy "agreements_admin_delete" on public.agreements
  for delete to authenticated using (public.is_admin());


-- ── 9. admin_users — admin-only read, CEO-only add ─────────────────────────
alter table public.admin_users enable row level security;

drop policy if exists "admin_users_admin_select" on public.admin_users;
create policy "admin_users_admin_select" on public.admin_users
  for select to authenticated using (public.is_admin());

drop policy if exists "admin_users_ceo_insert" on public.admin_users;
create policy "admin_users_ceo_insert" on public.admin_users
  for insert to authenticated with check (public.current_admin_role() = 'ceo');
-- No update/delete policy: the app doesn't perform these today, so they stay
-- implicitly denied to everyone (RLS fails closed, not open). Add a
-- CEO-scoped policy here if/when staff editing or removal is built.


-- ── 10. blog_posts — public reads published posts, admin manages all ──────
alter table public.blog_posts enable row level security;

drop policy if exists "blog_posts_public_select_published" on public.blog_posts;
create policy "blog_posts_public_select_published" on public.blog_posts
  for select to anon, authenticated using (status = 'published' or public.is_admin());

drop policy if exists "blog_posts_admin_insert" on public.blog_posts;
create policy "blog_posts_admin_insert" on public.blog_posts
  for insert to authenticated with check (public.is_admin());

drop policy if exists "blog_posts_admin_update" on public.blog_posts;
create policy "blog_posts_admin_update" on public.blog_posts
  for update to authenticated using (public.is_admin());

drop policy if exists "blog_posts_admin_delete" on public.blog_posts;
create policy "blog_posts_admin_delete" on public.blog_posts
  for delete to authenticated using (public.is_admin());


-- ── 11. affiliates — public can sign up, only admin can read/manage ───────
alter table public.affiliates enable row level security;

drop policy if exists "affiliates_public_insert" on public.affiliates;
create policy "affiliates_public_insert" on public.affiliates
  for insert to anon, authenticated with check (true);

drop policy if exists "affiliates_admin_select" on public.affiliates;
create policy "affiliates_admin_select" on public.affiliates
  for select to authenticated using (public.is_admin());

drop policy if exists "affiliates_admin_update" on public.affiliates;
create policy "affiliates_admin_update" on public.affiliates
  for update to authenticated using (public.is_admin());

drop policy if exists "affiliates_admin_delete" on public.affiliates;
create policy "affiliates_admin_delete" on public.affiliates
  for delete to authenticated using (public.is_admin());


-- ── 12. site_banners — public reads (Hero, FeaturedLocations, documents,
--       diaspora hero), only admin writes ─────────────────────────────────
alter table public.site_banners enable row level security;

drop policy if exists "site_banners_public_select" on public.site_banners;
create policy "site_banners_public_select" on public.site_banners
  for select to anon, authenticated using (true);

drop policy if exists "site_banners_admin_insert" on public.site_banners;
create policy "site_banners_admin_insert" on public.site_banners
  for insert to authenticated with check (public.is_admin());

drop policy if exists "site_banners_admin_update" on public.site_banners;
create policy "site_banners_admin_update" on public.site_banners
  for update to authenticated using (public.is_admin());

drop policy if exists "site_banners_admin_delete" on public.site_banners;
create policy "site_banners_admin_delete" on public.site_banners
  for delete to authenticated using (public.is_admin());
