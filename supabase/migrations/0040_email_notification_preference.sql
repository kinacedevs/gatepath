-- Gatepath Realtors — Real "Email Notifications" staff preference
-- ============================================================================
-- Closes one of the two "Coming Soon" toggles in /admin/settings (Phase 39
-- honest placeholders). "Alert on new bookings & payments" — per-staff-member
-- opt-in, defaulting to false (opt-in, not opt-out) so nobody starts
-- receiving emails they never asked for the moment this ships.
--
-- SAFE TO RE-RUN: ADD COLUMN IF NOT EXISTS.
-- ============================================================================

alter table public.admin_users add column if not exists email_notifications_enabled boolean not null default false;
