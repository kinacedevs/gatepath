-- Gatepath Realtors — Offer Letters + missing buyer/next-of-kin fields (Phase 7)
-- ============================================================================
-- Captures the real Gatepath business flow, confirmed against the company's
-- actual signed document templates (blank Offer Letter + Purchase/Sale
-- Agreement): a deposit/reservation payment issues an OFFER LETTER, not an
-- Agreement. The Agreement only becomes a valid document once the client has
-- paid the full purchase price. Previously the codebase created an
-- `agreements` row on every successful payment (paymentActions.ts) and again
-- on CEO approval (admin.inquiries.tsx) — both wrong. This table gives the
-- Offer Letter its own identity, matching how it is a genuinely separate
-- legal instrument from the Agreement, not a stage of the same one.
--
-- Also adds the buyer/next-of-kin columns the real Offer Letter template
-- requires that inquire.tsx does not currently collect (country/county/city
-- for the buyer; occupation/country of residence/county/city/KRA PIN for the
-- next of kin). Nullable — existing inquiries and inquiries created before
-- the inquiry form is extended (a separate, follow-up piece of work) will
-- simply render these fields blank on generated documents.
--
-- SAFE TO RE-RUN: idempotent throughout.
-- ============================================================================

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries(id) on delete cascade,
  payment_id uuid references public.payments(id),
  ceo_signed boolean not null default false,
  ceo_signed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists offers_inquiry_idx on public.offers (inquiry_id);

alter table public.offers enable row level security;

-- Creation happens exclusively server-side via paymentActions.ts's service
-- role (no insert policy — RLS fails closed for any direct client insert,
-- unlike agreements'/payments' TEMP anon-insert policies, since nothing in
-- the browser ever creates an offer). Signing follows the exact same direct
-- client-update pattern already used for agreements.ceo_signed
-- (admin.inquiries.tsx's handleCeoSignature/handleCeoSignOffer), so this
-- needs the matching update policy.
drop policy if exists "offers_admin_select" on public.offers;
create policy "offers_admin_select" on public.offers
  for select to authenticated using (public.is_admin());

drop policy if exists "offers_admin_update" on public.offers;
create policy "offers_admin_update" on public.offers
  for update to authenticated using (public.is_admin());

alter table public.inquiries
  add column if not exists client_country text,
  add column if not exists client_county text,
  add column if not exists client_city text,
  add column if not exists kin_occupation text,
  add column if not exists kin_country_of_residence text,
  add column if not exists kin_county text,
  add column if not exists kin_city text,
  add column if not exists kin_kra_pin text;
