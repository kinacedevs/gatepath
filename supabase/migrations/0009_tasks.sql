-- Gatepath Realtors — Tasks & Follow-ups (Part 2, Module 2)
-- ============================================================================
-- "Every follow-up is a dated task with reminders and SLA" — the SLA is
-- made concrete as due_at + status, not a separate config. Optionally links
-- to an inquiry (nullable — not every task is lead-related, e.g. an
-- internal admin task has nothing to link to). Internal CRM data only, same
-- shape as interaction_log: admin-only reads, no public policy, all writes
-- go through taskActions.ts's service role.
--
-- SAFE TO RE-RUN: idempotent throughout.
-- ============================================================================

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  due_at timestamptz,
  assigned_to_email text,
  assigned_to_name text,
  related_inquiry_id uuid references public.inquiries(id) on delete set null,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status text not null default 'pending' check (status in ('pending', 'completed', 'cancelled')),
  created_by_email text,
  created_by_name text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists tasks_due_at_idx on public.tasks (due_at);
create index if not exists tasks_assigned_to_idx on public.tasks (assigned_to_email);

alter table public.tasks enable row level security;

drop policy if exists "tasks_admin_select" on public.tasks;
create policy "tasks_admin_select" on public.tasks
  for select to authenticated using (public.is_admin());
