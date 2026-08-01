-- Gatepath Realtors — Call Outcomes (Part 2, Module 11: Telephony / Call Logging)
-- ============================================================================
-- Adds a structured outcome to the already-real interaction_log (migration
-- 0008) instead of leaving call results buried in free-text notes. Nullable,
-- meaningful only when channel = 'call' — no default, no backfill claim over
-- historical rows logged before this column existed.
--
-- Postgres has no "ADD CONSTRAINT IF NOT EXISTS", so the check constraint is
-- wrapped in a duplicate_object exception guard to stay safe to re-run.
--
-- SAFE TO RE-RUN: idempotent throughout.
-- ============================================================================

alter table public.interaction_log
  add column if not exists call_outcome text;

do $$
begin
  alter table public.interaction_log
    add constraint interaction_log_call_outcome_check
    check (call_outcome is null or call_outcome in (
      'connected', 'voicemail', 'no_answer', 'wrong_number', 'callback_requested'
    ));
exception
  when duplicate_object then null;
end $$;
