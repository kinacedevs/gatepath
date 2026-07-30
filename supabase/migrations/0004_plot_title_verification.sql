-- Gatepath Realtors — Manual title-deed verification tracking (Phase 5B)
-- ============================================================================
-- No public Ardhisasa (Kenya Ministry of Lands digital system) API exists for
-- third-party automated integration — confirmed by direct search, see
-- docs/CRM_CAPABILITIES.md §5. So "checking a title against Ardhisasa" is
-- genuinely a manual step: a staff member logs into the real Ardhisasa portal
-- themselves and performs the search. Before this table, that check happened
-- with no permanent record of when it happened, who did it, or what the
-- result was — a real trust gap for a company whose entire pitch is verified
-- titles. This turns a one-off unrecorded manual action into a tracked,
-- auditable event tied to the specific plot.
--
-- If Gatepath later obtains real API/partner access to Ardhisasa, this same
-- table is what an automated version plugs into — the schema doesn't need to
-- change, only how a row gets inserted (a webhook/API call instead of a
-- staff-submitted form via verifyPlotTitleFn).
--
-- SAFE TO RE-RUN: idempotent throughout.
-- ============================================================================

create table if not exists public.plot_title_verifications (
  id uuid primary key default gen_random_uuid(),
  plot_id uuid not null references public.plots(id) on delete cascade,
  checked_by uuid not null references public.admin_users(id),
  checked_at timestamptz not null default now(),
  outcome text not null check (outcome in ('verified_clean', 'discrepancy_found', 'inconclusive')),
  reference text, -- e.g. the Ardhisasa parcel/search reference used, if any
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists plot_title_verifications_plot_idx
  on public.plot_title_verifications (plot_id, checked_at desc);

alter table public.plot_title_verifications enable row level security;

-- Reads happen directly from the admin client (same pattern as phases/plots/
-- inquiries elsewhere) — staff need to see a plot's verification history.
-- No insert/update/delete policy: every write goes through
-- verifyPlotTitleFn (src/lib/plotVerificationActions.ts), which uses the
-- service role and re-verifies the caller is real staff server-side, the
-- same pattern as every other CRM write in this codebase. RLS fails closed
-- for direct client writes on purpose.
drop policy if exists "plot_title_verifications_admin_select" on public.plot_title_verifications;
create policy "plot_title_verifications_admin_select" on public.plot_title_verifications
  for select to authenticated using (public.is_admin());
