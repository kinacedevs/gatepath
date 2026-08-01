-- Gatepath Realtors — Buyer Preferences / Property-Matching (Part 2, Module 5)
-- ============================================================================
-- "Match buyer preferences (location, budget, currency, phase) to available
-- plots." A standing watch-request, genuinely separate from `inquiries` —
-- a buyer preference can exist before any formal inquiry is made (e.g. a
-- diaspora prospect who wants to be told when something in their budget
-- appears in a location), so it is its own table, not a column on
-- inquiries. Budgets are stored in KES (site-wide money convention);
-- stated_currency is kept only so the UI can show what currency the staff
-- member originally entered the figure in.
--
-- Internal CRM data only — no public policy, same shape as interaction_log/
-- tasks. All writes go through buyerPreferenceActions.ts's service role.
--
-- SAFE TO RE-RUN: idempotent throughout.
-- ============================================================================

create table if not exists public.buyer_preferences (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  client_email text,
  client_phone text,
  preferred_phase_id uuid references public.phases(id) on delete set null,
  preferred_location text,
  min_budget_kes numeric,
  max_budget_kes numeric,
  stated_currency text not null default 'KES',
  notes text,
  is_active boolean not null default true,
  created_by_email text,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists buyer_preferences_active_idx on public.buyer_preferences (is_active);

alter table public.buyer_preferences enable row level security;

drop policy if exists "buyer_preferences_admin_select" on public.buyer_preferences;
create policy "buyer_preferences_admin_select" on public.buyer_preferences
  for select to authenticated using (public.is_admin());
