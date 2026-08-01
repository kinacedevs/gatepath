-- Gatepath Realtors — Staff post-visit feedback (Part 2, Module 9)
-- ============================================================================
-- Closes the real gap named in docs/VIZ_SPEC.md §8: bookings.visit_notes is
-- the client's own pre-visit note, not staff post-visit feedback — no such
-- field existed. Additive only, NOT a status transition — staff_feedback is
-- an annotation, never touches bookings.status, so this doesn't need the
-- dedicated separately-reviewed treatment CLAUDE.md requires for actual
-- conveyancing/status transition changes. No RLS change needed — existing
-- bookings policies already cover these new columns.
-- 
-- SAFE TO RE-RUN: idempotent throughout.
-- ============================================================================

alter table public.bookings
  add column if not exists staff_feedback text,
  add column if not exists feedback_logged_at timestamptz;
