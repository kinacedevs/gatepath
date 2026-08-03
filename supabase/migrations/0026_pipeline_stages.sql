-- Gatepath Realtors — Custom Pipeline Stages (Phase 35)
-- ============================================================================
-- Real add/remove/reorder flexibility for the Leads Kanban, without
-- touching inquiries.status itself. Every existing revenue/conversion
-- calculation that keys off the literal "approved"/"rejected" strings
-- (leadScoring.ts, reportAnalytics.ts, reportActions.ts, admin.reports.tsx,
-- admin.contacts.tsx, escalations.ts, admin.deals.tsx, dataGovernance.ts)
-- keeps working unchanged — a pipeline_stages row is a finer-grained
-- position *within* one of the 4 fixed status buckets, not a replacement
-- for them.
--
-- SAFE TO RE-RUN: idempotent throughout.
-- ============================================================================

create table if not exists public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  bucket text not null check (bucket in ('pending', 'reviewed', 'approved', 'rejected')),
  label text not null,
  display_order int not null default 0,
  is_active boolean not null default true,
  created_by_email text,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.inquiries
  add column if not exists pipeline_stage_id uuid references public.pipeline_stages(id) on delete set null;

alter table public.pipeline_stages enable row level security;

drop policy if exists "pipeline_stages_admin_select" on public.pipeline_stages;
create policy "pipeline_stages_admin_select" on public.pipeline_stages
  for select to authenticated using (public.is_admin());

-- No insert/update/delete policy — writes only via the service-role
-- server functions in src/lib/pipelineLabelsActions.ts.
