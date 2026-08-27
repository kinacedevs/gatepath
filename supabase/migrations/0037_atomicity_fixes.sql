-- Gatepath Realtors — Close two real concurrency races found in a production
-- audit against a production-grade engineering checklist.
-- ============================================================================
--
-- 1. offers/agreements had no unique constraint on inquiry_id. paymentActions.ts
--    does a plain check-then-insert ("select ... maybeSingle() -> if none,
--    insert"), so a client-triggered verify and the Paystack webhook racing
--    on the same payment could both pass the check before either insert
--    committed, producing two rows for one inquiry. This actually happened
--    in production — 3 real inquiries had duplicate agreements rows (data
--    already cleaned up manually, this migration prevents recurrence).
--    Once a duplicate exists, every .maybeSingle() read against it
--    (document.offer.$id.tsx, document.agreement.$id.tsx, getReceiptFn,
--    submitTestimonialFn) silently gets null instead of the real row —
--    a signed agreement can appear to vanish from the buyer's own documents.
--
-- 2. rate_limit_attempts and client_otps.attempts were both check-then-write
--    races in application code (read count, compare, separately update) —
--    concurrent requests can all read the same pre-increment value and all
--    pass the limit check. This defeats every throttle built this session
--    (admin login, OTP request, OTP verify attempts, /api/v1/* rate limit)
--    under plain concurrency, no timing attack needed. Fixed with two
--    atomic single-statement RPC functions using INSERT ... ON CONFLICT ...
--    DO UPDATE, which Postgres serializes via row-level locking — this is
--    what actually makes the read-check-write atomic, not just closer
--    together in the code.
--
-- SAFE TO RE-RUN: idempotent (unique constraint additions are guarded;
-- CREATE OR REPLACE FUNCTION is idempotent by nature).
-- ============================================================================

do $$
begin
  alter table public.agreements add constraint agreements_inquiry_id_key unique (inquiry_id);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.offers add constraint offers_inquiry_id_key unique (inquiry_id);
exception when duplicate_object then null;
end $$;

-- Atomic fixed-window rate limiter. Replaces rateLimiter.ts's 3-step
-- select-then-upsert-or-update with one statement per call.
create or replace function public.rate_limit_check(
  p_key text,
  p_max_attempts int,
  p_window_seconds int
) returns table(allowed boolean, retry_after_seconds int) as $$
declare
  v_count int;
  v_window_start timestamptz;
begin
  insert into public.rate_limit_attempts (rate_key, attempt_count, window_started_at)
  values (p_key, 1, now())
  on conflict (rate_key) do update set
    attempt_count = case
      when rate_limit_attempts.window_started_at > now() - (p_window_seconds || ' seconds')::interval
        then rate_limit_attempts.attempt_count + 1
      else 1
    end,
    window_started_at = case
      when rate_limit_attempts.window_started_at > now() - (p_window_seconds || ' seconds')::interval
        then rate_limit_attempts.window_started_at
      else now()
    end
  returning attempt_count, window_started_at into v_count, v_window_start;

  if v_count > p_max_attempts then
    return query select
      false,
      greatest(1, ceil(extract(epoch from (v_window_start + (p_window_seconds || ' seconds')::interval - now()))))::int;
  else
    return query select true, 0;
  end if;
end;
$$ language plpgsql;

-- Atomic OTP wrong-attempt increment. Replaces portalActions.ts's
-- read-otpRow.attempts-then-update(attempts+1) with one statement.
create or replace function public.increment_otp_attempts(p_otp_id uuid)
returns int as $$
declare
  v_attempts int;
begin
  update public.client_otps
    set attempts = attempts + 1
    where id = p_otp_id
    returning attempts into v_attempts;
  return v_attempts;
end;
$$ language plpgsql;
