-- Gatepath Realtors — Commission & Payout Tracking (Part 2, Module 12)
-- ============================================================================
-- commission_rate: nullable, no default — an agent with no rate set means
-- "not configured yet", never a fabricated 0%, same reasoning already
-- applied to inquiries.marketing_opt_in (migration 0013).
--
-- commission_payouts: one row per (inquiry_id, agent_email) pair, created
-- only when a payout is actually marked paid — the row's existence IS the
-- "paid" signal (no separate status column), same absence-as-pending
-- pattern already used by plot_title_verifications and bookings.staff_
-- feedback. commission_rate_applied/commission_amount_kes are snapshotted
-- at the moment of marking paid so a later rate change or additional
-- payments never retroactively rewrites a historical payout record.
-- Admin-only select RLS, no insert/update/delete policy — all writes go
-- through src/lib/commissionActions.ts's service role.
--
-- SAFE TO RE-RUN: idempotent throughout.
-- ============================================================================

alter table public.admin_users
  add column if not exists commission_rate numeric;

create table if not exists public.commission_payouts (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries(id) on delete cascade,
  agent_email text not null,
  agent_name text,
  commission_rate_applied numeric not null,
  commission_amount_kes numeric not null,
  paid_at timestamptz not null default now(),
  paid_by_email text,
  paid_by_name text,
  created_at timestamptz not null default now(),
  unique (inquiry_id, agent_email)
);

create index if not exists commission_payouts_agent_idx on public.commission_payouts (agent_email);

alter table public.commission_payouts enable row level security;

drop policy if exists "commission_payouts_admin_select" on public.commission_payouts;
create policy "commission_payouts_admin_select" on public.commission_payouts
  for select to authenticated using (public.is_admin());
