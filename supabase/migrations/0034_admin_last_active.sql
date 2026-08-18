-- Module 3 audit finding #4 (server-side half): backs real, server-enforced
-- idle-session timeout via src/lib/serverAuth.ts. Refreshed on every
-- verified server-function call; a caller idle past the threshold is
-- rejected server-side, not just by the client-side timer in admin.tsx
-- (which stays as a UX-layer nicety, never the actual enforcement, per
-- OWASP's own guidance that idle timeouts must not be client-trusted).

alter table public.admin_users add column if not exists last_active_at timestamptz;
