-- Gatepath Realtors — Close the payment/agreement/plot-status forgery holes (CRITIQUE P0-2, P1-1)
-- ============================================================================
-- Migration 0001 left payments/agreements INSERT open to anon on purpose,
-- marked _TEMP, because thank-you.tsx wrote to them directly from the
-- browser and locking it down immediately would have broken every purchase.
--
-- That write path has been replaced: src/lib/paymentActions.ts now verifies
-- every payment against Paystack's own API server-side, using the service
-- role, before writing anything. The service role bypasses RLS entirely, so
-- this migration doesn't touch that flow — it just removes the anon
-- policies that were the ACTUAL hole (gating the UI alone was never the
-- fix; the anon-writable table was).
--
-- bookings/inquiries INSERT stay open — those tables are still legitimately
-- written from the browser for non-payment flows (visit scheduling, the
-- diaspora inquiry form) that this migration doesn't touch.
--
-- SAFE TO RE-RUN: DROP POLICY IF EXISTS is idempotent.
--
-- Do not run this before confirming payment.tsx/thank-you.tsx are deployed
-- with the verified-payment flow (see docs/SECURITY_HARDENING.md) — running
-- it against the OLD client-side-insert code would silently break every
-- purchase on the site.
-- ============================================================================

drop policy if exists "payments_public_insert_TEMP" on public.payments;
drop policy if exists "agreements_public_insert_TEMP" on public.agreements;

-- No replacement anon-insert policy is added. Nothing legitimate writes to
-- these tables from the browser anymore — only the service-role client in
-- lib/paymentActions.ts, which bypasses RLS and needs no policy at all.


-- ── plots UPDATE — also closeable now (CRITIQUE P1-1) ──────────────────────
-- The only client-side code that used to update plots.status was the old
-- thank-you.tsx write path, now removed (see lib/paymentActions.ts, which
-- does this atomically via the service role instead — `WHERE status =
-- 'available'`, preventing the double-booking race this table's anon-open
-- policy allowed). admin.tsx still needs to edit plot status manually
-- (marking a plot sold/available by hand) — that gets its own admin-gated
-- policy instead of the removed anon-open one.
drop policy if exists "plots_public_update_TEMP" on public.plots;

drop policy if exists "plots_admin_update" on public.plots;
create policy "plots_admin_update" on public.plots
  for update to authenticated using (public.is_admin());
