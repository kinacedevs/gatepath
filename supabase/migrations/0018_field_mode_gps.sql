-- Gatepath Realtors — Mobile / Field Mode GPS (Part 2, Module 15)
-- ============================================================================
-- Adds optional GPS coordinates to the already-real interaction_log
-- (migration 0008) so a logged site_visit can carry proof an agent was
-- actually on-site. Nullable — capture uses the standard browser
-- Geolocation API, which can fail (permission denied, unsupported,
-- indoor) or simply not apply to a visit logged after the fact from a
-- desktop, so this is never a required field.
--
-- SAFE TO RE-RUN: idempotent throughout. 
-- ============================================================================

alter table public.interaction_log
  add column if not exists latitude numeric;

alter table public.interaction_log
  add column if not exists longitude numeric;
