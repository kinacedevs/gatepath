-- Gatepath Realtors — Lock down activity_logs / shift_logs (Phase 9 follow-up)
-- ============================================================================
-- Supabase's Advisor flagged both tables CRITICAL: RLS policies exist on
-- them but RLS itself was never enabled on the table, so those policies
-- were entirely inert — the tables were fully exposed to anyone holding the
-- public anon key. Neither table is referenced anywhere in this codebase
-- (confirmed via a repo-wide search) — they predate this session's work and
-- were never wired into the app, so tightening access here cannot break any
-- real feature.
--
-- The existing policy set on each table (per the Advisor: "{activity_logs_
-- admin_all, allow_all_activity_logs}" and "{allow_all_shift_logs, shift_
-- logs_admin_all}") included a permissive "allow_all_*" policy alongside an
-- "*_admin_all" one. Enabling RLS alone would not have closed the exposure
-- while that permissive policy remained active, so it is dropped here. The
-- "*_admin_all" policies are left in place — they already exist and are not
-- redefined by this migration, since their exact command scope (select vs.
-- write) is not something this migration should guess at from outside.
--
-- SAFE TO RE-RUN: idempotent throughout.
-- ============================================================================

alter table public.activity_logs enable row level security;
alter table public.shift_logs enable row level security;

drop policy if exists "allow_all_activity_logs" on public.activity_logs;
drop policy if exists "allow_all_shift_logs" on public.shift_logs;
