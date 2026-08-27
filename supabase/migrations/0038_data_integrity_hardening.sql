-- Gatepath Realtors — Data integrity hardening (production audit backlog)
-- ============================================================================
-- Per the production audit (Phase 45): every constraint below was, until
-- now, enforced only in application code — the classic hierarchy-of-
-- enforcement gap ("the frontend validates it, the API validates it, but
-- the database itself would accept garbage"). A bug in application code,
-- a backfill script, or a support engineer running a manual UPDATE has no
-- backstop today. All of these are additive/defensive only — checked
-- directly against live production data before writing this migration:
-- zero existing rows would violate any constraint added here (confirmed
-- via direct query: no null/negative/zero money values, no out-of-enum
-- status values on any of the tables touched).
--
-- Also formalizes payments.paystack_reference's unique constraint, which
-- already exists live (confirmed) but is untracked in any migration —
-- payments predates this project's migration history, same as client_otps.
-- Re-declaring it here idempotently means a schema reset or a fresh
-- environment won't silently lose the one constraint the whole payment
-- idempotency design (recordVerifiedPayment's upsert-on-conflict) depends on.
--
-- Also adds indexes on the foreign-key columns hit on every payment write
-- and every portal load — none of these existed (payments/agreements/
-- bookings/plots all predate this project's migrations, so like the
-- constraints above, nobody had added them).
--
-- SAFE TO RE-RUN: every ADD CONSTRAINT is guarded against "already exists";
-- every CREATE INDEX uses IF NOT EXISTS.
-- ============================================================================

-- Money columns: never negative. price additionally never null — it's set
-- at inquire.tsx's Step 1 and always populated from that point on. deposit/
-- balance/monthly_payment stay nullable (legitimately null before an
-- inquiry's first payment — paymentActions.ts only sets them then).
alter table public.inquiries alter column price set not null;

do $$ begin
  alter table public.inquiries add constraint inquiries_price_check check (price > 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.inquiries add constraint inquiries_deposit_check check (deposit is null or deposit >= 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.inquiries add constraint inquiries_balance_check check (balance is null or balance >= 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.payments add constraint payments_amount_check check (amount > 0);
exception when duplicate_object then null; end $$;

-- Status columns: the exact enums already defined in src/lib/types.ts,
-- made real at the database layer so nothing outside this app's own
-- TypeScript (a manual UPDATE, a future integration, a bug) can write an
-- out-of-vocabulary value.
do $$ begin
  alter table public.payments add constraint payments_status_check
    check (status in ('pending', 'success', 'failed', 'abandoned'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.inquiries add constraint inquiries_status_check
    check (status in ('pending', 'reviewed', 'approved', 'rejected'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.bookings add constraint bookings_status_check
    check (status in ('pending', 'confirmed', 'completed', 'cancelled'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.plots add constraint plots_status_check
    check (status in ('available', 'booked', 'sold'));
exception when duplicate_object then null; end $$;

-- Formalize the pre-existing (confirmed live) unique constraint that
-- recordVerifiedPayment's onConflict: "paystack_reference" upsert depends
-- on for its whole idempotency guarantee.
do $$ begin
  alter table public.payments add constraint payments_paystack_reference_key unique (paystack_reference);
exception when duplicate_object then null; end $$;

-- Missing FK indexes on the columns hit on every payment write and every
-- portal/admin load.
create index if not exists payments_inquiry_id_idx on public.payments (inquiry_id);
create index if not exists agreements_inquiry_id_idx on public.agreements (inquiry_id);
create index if not exists agreements_payment_id_idx on public.agreements (payment_id);
create index if not exists bookings_inquiry_id_idx on public.bookings (inquiry_id);
create index if not exists plots_phase_id_idx on public.plots (phase_id);
