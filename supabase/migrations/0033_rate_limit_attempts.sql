-- Module 3 audit finding: no rate limiting exists anywhere in this codebase
-- (admin login, portal OTP request, /api/v1/*) — confirmed via a repo-wide
-- grep, zero matches. This table backs a small, shared fixed-window rate
-- limiter (src/lib/rateLimiter.ts), reused for all three surfaces rather
-- than three separate mechanisms. Service-role only, same as
-- client_otps/portal_sessions — never readable/writable from the browser.

create table if not exists public.rate_limit_attempts (
  rate_key text primary key,
  attempt_count int not null default 1,
  window_started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.rate_limit_attempts enable row level security;
-- No policies at all, intentionally — every access goes through the
-- service-role client inside src/lib/rateLimiter.ts's server functions.
