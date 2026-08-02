-- Gatepath Realtors — Integrations & API Layer (Part 2, Module 16)
-- ============================================================================
-- API keys for the new /api/v1/* internal API (src/lib/apiRoutes.ts).
-- key_hash stores a SHA-256 of the real key — the plaintext is returned
-- exactly once at generation time (src/lib/apiKeyActions.ts) and never
-- stored. key_prefix (first 8 chars) lets admins tell keys apart in the UI
-- without re-exposing the secret.
--
-- CEO/manager only for this entire resource (view + write) — an API key
-- is itself a security credential, a stricter case than the read-open/
-- write-gated split used for Commission/Goals.
-- 
-- SAFE TO RE-RUN: idempotent throughout.
-- ============================================================================

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  key_hash text not null unique,
  key_prefix text not null,
  scopes text[] not null default '{}',
  created_by_email text,
  created_by_name text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

alter table public.api_keys enable row level security;

drop policy if exists "api_keys_admin_select" on public.api_keys;
create policy "api_keys_admin_select" on public.api_keys
  for select to authenticated using (public.is_admin());
