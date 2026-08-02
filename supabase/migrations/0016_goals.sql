-- Gatepath Realtors — Goals & Quotas (Part 2, Module 13)
-- ============================================================================
-- One row per goal, targeting either an agent or a phase (exactly one of
-- agent_id/phase_id set per row — matches the same "two nullable FKs, one
-- populated" shape already used for document_records.inquiry_id and
-- buyer_preferences.preferred_phase_id, giving real referential integrity
-- instead of a generic polymorphic entity_id text column).
--
-- No DB-level duplicate-goal constraint: Postgres treats NULL as distinct
-- from itself in unique indexes, so a naive unique(agent_id, phase_id,
-- metric, period_start) wouldn't actually catch two agent-goals for the
-- same agent (phase_id is NULL in both, and NULLs never collide). A
-- partial index would work but isn't a pattern used anywhere else in this
-- codebase — kept simple, matching Buyer Preferences' own lack of dedup
-- enforcement. A mistaken duplicate is a one-click delete, not a schema
-- problem.
--
-- "Actual" is computed live in src/lib/goals.ts — nothing here stores a
-- derived progress value.
--
-- SAFE TO RE-RUN: idempotent throughout.
-- ============================================================================

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references public.admin_users(id) on delete cascade,
  phase_id uuid references public.phases(id) on delete cascade,
  metric text not null check (metric in ('revenue_kes', 'deals_closed', 'plots_sold')),
  period_type text not null check (period_type in ('month', 'quarter')),
  period_start date not null,
  target_value numeric not null,
  created_by_email text,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists goals_agent_idx on public.goals (agent_id);
create index if not exists goals_phase_idx on public.goals (phase_id);

alter table public.goals enable row level security;

drop policy if exists "goals_admin_select" on public.goals;
create policy "goals_admin_select" on public.goals
  for select to authenticated using (public.is_admin());
