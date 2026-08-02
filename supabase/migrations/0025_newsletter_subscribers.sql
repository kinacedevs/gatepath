-- Gatepath Realtors — Newsletter Capture (Part 3, Slice E)
-- ============================================================================
-- A genuinely distinct signal from inquiries.* — a bare email signup has none
-- of inquiries' NOT NULL, KYC-shaped required fields (client_full_name,
-- client_phone, client_id_passport). Gets its own minimal table rather than
-- stuffing placeholder values into a differently-shaped schema, matching
-- this codebase's precedent for other genuinely distinct concepts
-- (affiliates has its own table rather than reusing inquiries).
--
-- Public insert allowed (matches the accepted precedent for other
-- lead-capture forms — inquire.tsx/diaspora.tsx/contact.tsx all insert into
-- inquiries directly; newsletter_subscribers isn't one of CLAUDE.md's 4
-- protected tables). Admin-only read.
--
-- SAFE TO RE-RUN: idempotent throughout.
-- ============================================================================

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text not null default 'website',
  created_at timestamptz not null default now()
);

alter table public.newsletter_subscribers enable row level security;

drop policy if exists "newsletter_subscribers_public_insert" on public.newsletter_subscribers;
create policy "newsletter_subscribers_public_insert" on public.newsletter_subscribers
  for insert to anon, authenticated with check (true);

drop policy if exists "newsletter_subscribers_admin_select" on public.newsletter_subscribers;
create policy "newsletter_subscribers_admin_select" on public.newsletter_subscribers
  for select to authenticated using (public.is_admin());
