-- Gatepath Realtors — Widen client_otps.otp_code (fixes silent portal-OTP failure)
-- ============================================================================
-- client_otps predates this project's migrations (see 0003_portal_otp_lockdown.sql's
-- own comment: "existed before this project's RLS was ever turned on anywhere, and
-- isn't in the generated Database type"). Its otp_code column was sized
-- varchar(6) for the original plaintext 6-digit code.
--
-- The P0-3 security fix (src/lib/portalActions.ts) switched to storing a
-- salted SHA-256 hex digest (64 characters) instead of the plaintext code,
-- but never widened this column. Every OTP request since that fix has been
-- sending a real, working SMS/email code while the matching insert into
-- client_otps silently failed with "value too long for type character
-- varying(6)" (Postgres error 22001) — silent because requestPortalOtpFn's
-- insert call never checked its own error. The client always then failed to
-- verify with "Request a new code first.", since no row was ever saved.
--
-- SAFE TO RE-RUN: idempotent (ALTER COLUMN TYPE is a no-op if already text).
-- ============================================================================

alter table public.client_otps alter column otp_code type text;
