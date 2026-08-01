-- Gatepath Realtors — Content CMS: Testimonials, Team Profiles, FAQs (Phase 9)
-- ============================================================================
-- Part of the "site_banners + Content CMS" expansion track (see
-- docs/EXPANSION_GAP_ANALYSIS.md). Three public-facing content types that
-- were previously 100% hardcoded in JSX (Testimonials.tsx's 3 fabricated
-- quotes, about.tsx's staffMembers array, diaspora.tsx's FAQ array) become
-- real, CRM-editable tables. site_banners already exists and needs no new
-- schema — only a new admin UI, added in the same phase but not here.
--
-- Same idempotent, public-reads-published / admin-manages-all shape already
-- established for blog_posts (migration 0001).
--
-- SAFE TO RE-RUN: idempotent throughout.
-- ============================================================================

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  client_initials text not null,
  quote text not null,
  tag text,
  is_published boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.testimonials enable row level security;

drop policy if exists "testimonials_public_select_published" on public.testimonials;
create policy "testimonials_public_select_published" on public.testimonials
  for select to anon, authenticated using (is_published = true or public.is_admin());

drop policy if exists "testimonials_admin_insert" on public.testimonials;
create policy "testimonials_admin_insert" on public.testimonials
  for insert to authenticated with check (public.is_admin());

drop policy if exists "testimonials_admin_update" on public.testimonials;
create policy "testimonials_admin_update" on public.testimonials
  for update to authenticated using (public.is_admin());

drop policy if exists "testimonials_admin_delete" on public.testimonials;
create policy "testimonials_admin_delete" on public.testimonials
  for delete to authenticated using (public.is_admin());

create table if not exists public.team_profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  role_title text not null,
  photo_url text,
  bio text,
  is_published boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.team_profiles enable row level security;

drop policy if exists "team_profiles_public_select_published" on public.team_profiles;
create policy "team_profiles_public_select_published" on public.team_profiles
  for select to anon, authenticated using (is_published = true or public.is_admin());

drop policy if exists "team_profiles_admin_insert" on public.team_profiles;
create policy "team_profiles_admin_insert" on public.team_profiles
  for insert to authenticated with check (public.is_admin());

drop policy if exists "team_profiles_admin_update" on public.team_profiles;
create policy "team_profiles_admin_update" on public.team_profiles
  for update to authenticated using (public.is_admin());

drop policy if exists "team_profiles_admin_delete" on public.team_profiles;
create policy "team_profiles_admin_delete" on public.team_profiles
  for delete to authenticated using (public.is_admin());

-- Seed with the real staff roster already live in about.tsx (confirmed real
-- via commit 57009ee, "real staff names substituted for the placeholder
-- set (user's own edit)") — carried into the table so nothing is lost when
-- about.tsx switches from the hardcoded array to this table. Stock photo
-- URLs are the existing CRITIQUE.md P2-5 debt, not newly introduced; the
-- CEO can replace them from this new admin screen whenever real photos are
-- available. Unlike testimonials (deliberately left empty — those attribute
-- quotes to specific unverified "clients"), these are real named staff, so
-- seeding is not fabrication.
create unique index if not exists team_profiles_full_name_key on public.team_profiles (full_name);

insert into public.team_profiles (full_name, role_title, photo_url, bio, display_order)
values
  ('Joe Muchiri', 'CEO & Managing Director', 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80', 'Visionary founder committed to 100% title deed transparency and empowering everyday land ownership in Kenya.', 0),
  ('Marya Wanjiku', 'Head of Diaspora Relations', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80', 'Dedicated advisor assisting diaspora clients across the UK, USA, UAE, and Canada with seamless remote conveyancing.', 1),
  ('Joel Ochieng', 'Senior Legal Conveyancing Officer', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80', 'Oversees land registry title searches, survey beacon verifications, and legal deed transfers.', 2),
  ('RoseMary Njeri', 'Customer Operations Lead', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80', 'Coordinates free guided site visits, M-Pesa payment receipts, and client onboarding.', 3)
on conflict (full_name) do nothing;

create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  category text not null default 'general',
  is_published boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.faqs enable row level security;

drop policy if exists "faqs_public_select_published" on public.faqs;
create policy "faqs_public_select_published" on public.faqs
  for select to anon, authenticated using (is_published = true or public.is_admin());

drop policy if exists "faqs_admin_insert" on public.faqs;
create policy "faqs_admin_insert" on public.faqs
  for insert to authenticated with check (public.is_admin());

drop policy if exists "faqs_admin_update" on public.faqs;
create policy "faqs_admin_update" on public.faqs
  for update to authenticated using (public.is_admin());

drop policy if exists "faqs_admin_delete" on public.faqs;
create policy "faqs_admin_delete" on public.faqs
  for delete to authenticated using (public.is_admin());

-- Seed with the 5 real diaspora FAQs already live in diaspora.tsx — genuine
-- company-policy answers (payment terms, legal process, KES settlement),
-- not attributed to any unverified person, so carrying them into the table
-- is not fabrication, unlike testimonials.
create unique index if not exists faqs_category_question_key on public.faqs (category, question);

insert into public.faqs (question, answer, category, display_order)
values
  ('Do I need to travel to Kenya to purchase or receive my title deed?', 'No. The entire process is designed for remote completion. You can browse live plot maps, schedule virtual walkthroughs, review certified searches, sign agreements digitally via secure e-signatures, and have your original registered title deed shipped directly to your address globally via DHL.', 'diaspora', 0),
  ('How can I verify that the land is genuine before making a payment?', 'Once you reserve a plot, Gatepath Realtors provides a certified copy of the Land Search Certificate and the Registry Deed Plan. You can verify these documents independently at the Land Registry, through legal counsel in Kenya, or through Ardhisasa (Ministry of Lands portal).', 'diaspora', 1),
  ('Can I make installment payments from abroad?', 'Yes. We support installment plans (Lipa Pole Pole) spanning up to 12 months for diaspora buyers. Deposits and monthly installments can be paid securely using cards or international bank transfers via Paystack.', 'diaspora', 2),
  ('What currency will I actually be charged in?', 'Prices are shown in your selected currency for convenience, but Paystack always settles in Kenyan Shillings (KES) — the exact KES amount is shown before you confirm payment, so there are never surprises from exchange-rate estimates.', 'diaspora', 3),
  ('What legal protection do I have during the transaction?', 'All transactions are bound by a legally binding Land Purchase Agreement vetted by our legal department. Your deposit is secured in an escrow-backed account until all transfers are successfully registered under your name at the Land Office.', 'diaspora', 4)
on conflict (category, question) do nothing;
