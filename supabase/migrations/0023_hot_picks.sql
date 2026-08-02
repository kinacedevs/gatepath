-- Gatepath Realtors — Weekly Hot Picks CRM Control (Part 3, Slice B)
-- ============================================================================
-- Lets the CEO/manager manually feature specific phases on the homepage's
-- "Hot Picks" section, in a chosen order, with an optional expiry and custom
-- badge text ("eye-catching banners/stickers"). PropertyPreview.tsx falls
-- back to its existing real-scarcity automatic selection when no manual
-- picks are currently active — this migration only adds the override, it
-- doesn't remove the honest fallback.
--
-- No RLS change — phases' existing public-select / admin-write policies
-- already cover these new columns.
--
-- SAFE TO RE-RUN: idempotent throughout.
-- ============================================================================

alter table public.phases
  add column if not exists is_hot_pick boolean not null default false;

alter table public.phases
  add column if not exists hot_pick_order int not null default 0;

alter table public.phases
  add column if not exists hot_pick_expires_at timestamptz;

alter table public.phases
  add column if not exists hot_pick_badge_text text;
