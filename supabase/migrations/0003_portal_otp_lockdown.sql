-- Gatepath Realtors — Lock down client_otps, add portal_sessions (CRITIQUE P0-3)
-- ============================================================================
-- The client portal generated its OTP with Math.random() in the browser,
-- displayed it on screen in a "WhatsApp OTP Code" box, stored it as PLAINTEXT
-- in client_otps, and verified it with a direct client-side query. The
-- "session" was just sessionStorage["gatepath_portal_email"] — settable to
-- any value in devtools to view any client's data. client_otps had no RLS
-- at all, so all of this was also directly readable/writable via the anon
-- key regardless of the UI.
--
-- Fixed in src/lib/portalActions.ts: OTP is generated server-side with a
-- CSPRNG, hashed before storage, never returned to the client. A real
-- session token (this migration's portal_sessions table) replaces the
-- email-in-sessionStorage pattern.
--
-- SAFE TO RE-RUN: idempotent throughout.
-- ============================================================================

-- client_otps existed before this project's RLS was ever turned on anywhere,
-- and isn't in the generated Database type. Add the attempt-limiting column
-- it was missing, then lock it down completely — after this, only the
-- service role (which bypasses RLS) can touch it. No anon/authenticated
-- policy is added on purpose: this table should never be readable or
-- writable from the browser, full stop.
alter table public.client_otps add column if not exists attempts int not null default 0;

alter table public.client_otps enable row level security;

-- Explicitly drop any legacy anon-open policy that might exist from before
-- RLS was formalized in this codebase, so this migration is safe to run
-- regardless of the table's prior state.
drop policy if exists "client_otps_public_all" on public.client_otps;
drop policy if exists "Enable read access for all users" on public.client_otps;
drop policy if exists "Enable insert for all users" on public.client_otps;


-- portal_sessions — opaque server-issued tokens, replacing the
-- sessionStorage-email "session". Also service-role only; the client only
-- ever holds the opaque token string, never queries this table directly.
create table if not exists public.portal_sessions (
  token uuid primary key default gen_random_uuid(),
  email text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists portal_sessions_email_idx on public.portal_sessions (email);

alter table public.portal_sessions enable row level security;
-- No policies added — service-role only, by the same reasoning as client_otps.
