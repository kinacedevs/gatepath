/**
 * Gatepath Realtors — Verified Payment Recording (Server Functions)
 *
 * Fixes CRITIQUE P0-2. Previously thank-you.tsx trusted the URL's `amount`
 * and `ref` params directly and wrote payments/agreements/bookings/plots
 * from the browser with no verification at all — a forged URL created a
 * fake paid record. Every write here instead comes from what Paystack's
 * own verify API confirms was actually charged, never from the client.
 *
 * Uses the service-role client from lib/supabaseAdmin.ts — see that file's
 * warning before touching this one.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServiceClient } from "./supabaseAdmin";
import {
  sendResendEmail,
  sendAfricaTalkingSms,
  getReservationEmailHtml,
  notifyOptedInAdmins,
} from "./notifications";
import { recomputePhaseCounts } from "./plotActions";
import { computeInstallmentPricing } from "./pricing";
import { fetchWithRetry } from "./httpRetry";

// Module 3 audit finding #5 — real runtime validation on the two functions
// in this file, the ones directly in the path of every real payment. Bounds
// periodMonths to the 4 values pricing.ts/the UI actually support (0 = paid
// in full) rather than letting an arbitrary number reach payment logic.
const VerifyPaymentInput = z
  .object({
    reference: z.string().trim().min(1).max(200),
    inquiryId: z.string().uuid(),
    periodMonths: z.union([z.literal(0), z.literal(3), z.literal(6), z.literal(12)]).optional(),
  })
  .strict();

const GetReceiptInput = z.object({ inquiryId: z.string().uuid() }).strict();

type PaystackVerifyData = {
  status: "success" | "failed" | "abandoned" | string;
  amount: number; // kobo/cents — divide by 100 for the real KES amount
  currency: string;
  reference: string;
  channel?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
};

async function verifyPaystackTransaction(reference: string): Promise<PaystackVerifyData> {
  const secretKey = typeof process !== "undefined" ? process.env.PAYSTACK_SECRET_KEY : "";
  if (!secretKey) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured on the server.");
  }

  // Unlike the sends in notifications.ts, this is a plain GET with no
  // side effects — verifying a reference twice is always safe, so retryOnTimeout
  // is enabled (safe here specifically because this call can never create
  // a duplicate anything, unlike an email/SMS send).
  let res: Response;
  try {
    res = await fetchWithRetry(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${secretKey}` } },
      { timeoutMs: 10000, maxAttempts: 3, retryOnTimeout: true },
    );
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error("Paystack verification timed out after 10s.");
    }
    throw err;
  }
  const json = (await res.json()) as {
    status: boolean;
    message?: string;
    data?: PaystackVerifyData;
  };

  if (!json.status || !json.data) {
    throw new Error(json.message || "Paystack could not verify this transaction.");
  }

  return json.data;
}

/**
 * The one place that records a payment. Idempotent on paystack_reference —
 * safe to call more than once for the same reference (client retry, or the
 * real Paystack webhook, src/lib/paystackWebhook.ts, landing on top of an
 * already-processed client verify — or being the only writer at all, for
 * the abandoned-tab case that path was built to close). Exported so the
 * webhook can call this exact function directly, never a second,
 * potentially-drifting copy of the same payment-recording logic.
 */
export async function recordVerifiedPayment(params: {
  reference: string;
  inquiryId: string;
  periodMonths?: number;
}) {
  const service = getServiceClient();

  const { data: existing } = await service
    .from("payments")
    .select("*")
    .eq("paystack_reference", params.reference)
    .maybeSingle();

  if (existing && (existing as any).status === "success") {
    return { success: true as const, alreadyProcessed: true, payment: existing };
  }

  const paystackData = await verifyPaystackTransaction(params.reference);

  if (paystackData.status !== "success") {
    return {
      success: false as const,
      error: `Paystack reports this payment as "${paystackData.status}", not successful.`,
    };
  }

  // Security fix (GP-014, audit Phase 3): the reference itself is
  // authenticated (Paystack confirms the charge is real), but nothing
  // previously confirmed the charge actually belongs to params.inquiryId —
  // a client-triggered verify (verifyPaymentFn) took inquiryId straight
  // from the caller with no binding at all. payment.tsx and portal.tsx both
  // stamp metadata.inquiry_id onto the charge before Paystack ever sees it
  // (the same value the real webhook, paystackWebhook.ts:145-146, already
  // trusts instead of a caller-supplied id) — checking it here closes the
  // gap for the client-triggered path too, using data Paystack itself
  // returns rather than anything the caller sent this call.
  const metadata = paystackData.metadata ?? {};
  const metadataInquiryId = typeof metadata.inquiry_id === "string" ? metadata.inquiry_id : null;
  if (metadataInquiryId !== params.inquiryId) {
    console.error(
      `[Payment] Reference ${params.reference} metadata.inquiry_id (${metadataInquiryId}) does not match the inquiry it was verified against (${params.inquiryId}) — refusing to record.`,
    );
    return {
      success: false as const,
      error: "This payment reference does not match the specified inquiry.",
    };
  }

  const { data: inquiry, error: inqErr } = await (service as any)
    .from("inquiries")
    .select("*")
    .eq("id", params.inquiryId)
    .maybeSingle();

  if (inqErr || !inquiry) {
    return { success: false as const, error: "Could not find the associated inquiry." };
  }

  const amountKes = paystackData.amount / 100;

  // Never trust the client's periodMonths alone — if what Paystack actually
  // confirms was paid already covers the full cash price, this is a cash
  // sale regardless of which installment pill happened to be selected in
  // the browser (e.g. a stale value left over from an earlier step).
  // Matches pricing.ts's own full-payment rule. Computed once here, before
  // the payments row is even written, so loan_period_months is never
  // stamped with a period that doesn't match what was actually paid.
  const cashPriceForPeriodCheck = Number(inquiry.plot_price ?? inquiry.price ?? 0);
  const effectivePeriodMonths =
    typeof params.periodMonths === "number"
      ? amountKes >= cashPriceForPeriodCheck
        ? 0
        : params.periodMonths
      : undefined;

  const { data: payment, error: payErr } = await (service as any)
    .from("payments")
    .upsert(
      {
        inquiry_id: inquiry.id,
        paystack_reference: params.reference,
        amount: amountKes,
        deposit_amount: amountKes,
        loan_period_months:
          effectivePeriodMonths && effectivePeriodMonths > 0 ? effectivePeriodMonths : null,
        payment_method: paystackData.channel ?? null,
        currency: paystackData.currency ?? "KES",
        status: "success",
        paystack_response: paystackData,
      },
      { onConflict: "paystack_reference" },
    )
    .select()
    .single();

  if (payErr || !payment) {
    return { success: false as const, error: payErr?.message ?? "Failed to record the payment." };
  }

  // Only the FIRST payment against an inquiry should flip its plot to
  // booked — installment payments (from the client portal) come after the
  // plot is already booked, and would otherwise always report a false
  // "plot conflict" against their own prior payment.
  const { count: priorPaymentsCount } = await (service as any)
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("inquiry_id", inquiry.id)
    .neq("id", payment.id);
  const isFirstPayment = !priorPaymentsCount;

  // Real Gatepath business logic (confirmed against the company's actual
  // Offer Letter / Purchase-Sale Agreement templates): a deposit/reservation
  // payment issues an Offer Letter, NOT an Agreement. The Agreement only
  // becomes a valid document once the client has paid the FULL purchase
  // price — everything in between is tracked against the Offer.
  if (isFirstPayment) {
    // Upsert on the unique inquiry_id constraint (migration 0037), not a
    // check-then-insert — the client-triggered verify and the Paystack
    // webhook can both reach this line for the same payment, and a plain
    // "select, then insert if none found" lets both pass the check before
    // either insert commits, producing two offers rows for one inquiry
    // (this happened in production; ignoreDuplicates makes the loser of
    // the race a no-op instead of a duplicate row or a thrown error).
    const { error: offerErr } = await (service as any)
      .from("offers")
      .upsert(
        { inquiry_id: inquiry.id, payment_id: payment.id, ceo_signed: false },
        { onConflict: "inquiry_id", ignoreDuplicates: true },
      );
    if (offerErr) {
      console.error(`[Payment] Failed to create offer for inquiry ${inquiry.id}:`, offerErr);
    }
  }

  // Real, final pricing lock-in. inquire.tsx's Step 1 price/deposit/
  // balance/monthly_payment are a pre-checkout ESTIMATE — the buyer's
  // actual deposit and installment period are only chosen later, at
  // payment.tsx's checkout step. Recomputed here, server-side, from the
  // plot's real cash price plus what Paystack actually confirms was paid
  // (never trusted from the client), using the same formula payment.tsx
  // itself uses (src/lib/pricing.ts) — so the price/balance/monthly figures
  // that end up on the Offer Letter, Agreement, and Receipt are always
  // what the buyer actually agreed to and paid, not a superseded guess.
  if (isFirstPayment && effectivePeriodMonths !== undefined) {
    const { adjustedPrice, balance, monthlyPayment } = computeInstallmentPricing({
      cashPrice: cashPriceForPeriodCheck,
      depositAmount: amountKes,
      periodMonths: effectivePeriodMonths,
    });

    await (service as any)
      .from("inquiries")
      .update({
        price: adjustedPrice,
        deposit: amountKes,
        balance,
        monthly_payment: monthlyPayment,
        payment_period_months: effectivePeriodMonths,
        terms_of_payment: effectivePeriodMonths === 0 ? "cash" : "installment",
      })
      .eq("id", inquiry.id);

    // Keep the in-memory copy in sync — the agreement-trigger check below
    // and the confirmation email both need the real, just-locked-in price,
    // not the stale value fetched before this update.
    inquiry.price = adjustedPrice;
    inquiry.deposit = amountKes;
    inquiry.balance = balance;
    inquiry.monthly_payment = monthlyPayment;
    inquiry.payment_period_months = effectivePeriodMonths;
  }

  const { data: successfulPayments } = await (service as any)
    .from("payments")
    .select("amount")
    .eq("inquiry_id", inquiry.id)
    .eq("status", "success");
  const totalPaid = ((successfulPayments ?? []) as { amount: number }[]).reduce(
    (sum, p) => sum + Number(p.amount),
    0,
  );

  if (inquiry.price && totalPaid >= Number(inquiry.price)) {
    // Same upsert-on-unique-constraint fix as the offer above — this exact
    // check-then-insert race produced real duplicate agreements rows in
    // production (3 inquiries, cleaned up manually) before migration 0037
    // added the unique constraint this relies on.
    const { error: agreementErr } = await (service as any)
      .from("agreements")
      .upsert(
        { inquiry_id: inquiry.id, payment_id: payment.id, ceo_signed: false },
        { onConflict: "inquiry_id", ignoreDuplicates: true },
      );
    if (agreementErr) {
      console.error(
        `[Payment] Failed to create agreement for inquiry ${inquiry.id}:`,
        agreementErr,
      );
    }
  }

  // Atomic, conditional plot update — only flips a plot that's still
  // available, so two simultaneous buyers can't both "win" the same plot
  // (CRITIQUE P1-1). If it matches zero rows, the plot was taken by someone
  // else between reservation and payment verification — the payment still
  // succeeded, so this is flagged for manual reconciliation rather than
  // silently dropped.
  let plotWarning: string | null = null;
  if (isFirstPayment && inquiry.phase_slug && inquiry.plot_number_ref) {
    const { data: phase } = await service
      .from("phases")
      .select("id")
      .eq("slug", inquiry.phase_slug)
      .maybeSingle();

    if (phase) {
      const { data: updatedPlots } = await (service as any)
        .from("plots")
        .update({ status: "booked" })
        .eq("phase_id", (phase as any).id)
        .eq("plot_number", inquiry.plot_number_ref)
        .eq("status", "available")
        .select("id");

      if (!updatedPlots || updatedPlots.length === 0) {
        plotWarning =
          "Plot was already booked/sold by the time payment was verified — needs manual reconciliation.";
        console.error(
          `[Payment] Plot conflict: inquiry ${inquiry.id}, phase ${inquiry.phase_slug}, plot #${inquiry.plot_number_ref}, payment ${payment.id}`,
        );
      } else {
        // The status flip above bypasses every other write path that keeps
        // phases.total_plots/available_count/booked_count/sold_count in
        // sync (updatePlotStatusFn, inventoryActions.ts) — without this,
        // a real customer payment silently leaves those rollups stale.
        await recomputePhaseCounts(service, (phase as any).id);
      }
    }
  }

  try {
    const emailHtml = getReservationEmailHtml({
      buyerName: inquiry.client_full_name,
      plotNumber: String(inquiry.plot_number_ref ?? ""),
      phaseName: inquiry.phase_name ?? "",
      amount: amountKes,
      reference: params.reference,
      isHold: inquiry.payment_preference === "reserve",
    });
    const emailResult = await sendResendEmail(
      inquiry.client_email,
      `Payment Confirmed: Plot #${inquiry.plot_number_ref} secured!`,
      emailHtml,
    );
    const smsResult = await sendAfricaTalkingSms(
      inquiry.client_phone,
      `Payment Confirmed: Ksh ${amountKes.toLocaleString()} received for Plot #${inquiry.plot_number_ref} at ${inquiry.phase_name}. Gatepath Realtors Welcomes you!`,
    );
    // sendResendEmail/sendAfricaTalkingSms already swallow their own
    // errors into a returned { success, error } shape rather than
    // throwing, so the catch below never sees a real delivery failure —
    // this was previously the only place either result was checked at
    // all. A real client just paid real money; a silently-failed
    // confirmation is worth knowing about even with no retry built yet.
    if (!emailResult.success || !smsResult.success) {
      console.error(
        `[Payment] Confirmation notification partially/fully failed for inquiry ${inquiry.id}:`,
        { emailResult, smsResult },
      );
    }
  } catch (err) {
    // Notification failure must never undo an already-verified payment.
    console.error("[Payment] Notification dispatch failed:", err);
  }

  // Real "Email Notifications" staff preference (migration 0040) — its own
  // internal try/catch (notifyOptedInAdmins) already keeps this from ever
  // affecting the payment result.
  await notifyOptedInAdmins(
    `New Payment: Ksh ${amountKes.toLocaleString()} — ${inquiry.client_full_name}`,
    `<p><strong>${inquiry.client_full_name}</strong> paid <strong>Ksh ${amountKes.toLocaleString()}</strong> for Plot #${inquiry.plot_number_ref ?? "—"} at ${inquiry.phase_name ?? "—"}. Reference: ${params.reference}.</p>`,
  );

  return { success: true as const, payment, plotWarning };
}

export const verifyPaymentFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => VerifyPaymentInput.parse(d))
  .handler(async ({ data }) => {
    try {
      return await recordVerifiedPayment(data);
    } catch (err: any) {
      console.error("[Payment] verifyPaymentFn error:", err);
      return { success: false as const, error: err?.message ?? "Payment verification failed." };
    }
  });

// Security audit finding: getReceiptFn had zero ownership check, and
// inquiryId reaches it as a plain ?inquiryId= query param on the public
// /thank-you URL — a bearer credential with no expiry sitting in browser
// history, a shared screenshot, or an outbound referrer header, granting
// permanent access to client_id_passport/client_kra_pin/kin_kra_pin. The
// portal (getPortalDataFn) requires a real OTP-verified session for the
// same data; this path required nothing. Time-bounding it to a window that
// comfortably covers "just paid, checking my receipt" while forcing a
// long-lived or leaked link to fall back to the properly-authenticated
// portal for anything older.
const RECEIPT_LINK_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Read-only receipt lookup for thank-you.tsx. payments/inquiries/agreements/
 * bookings SELECT is admin-only under RLS (see migration 0001) — this is the
 * one legitimate path for a buyer to see their own just-completed receipt,
 * keyed by the inquiry id already sitting in their own browser session
 * (InquiryContext), not by anything guessable server-side.
 *
 * Plain exported function (same split as recordVerifiedPayment/
 * verifyPaymentFn above) so the time-bound PII-expiry logic can be
 * exercised directly in a test without needing a real TanStack Start
 * request context — getReceiptFn itself is just a thin createServerFn
 * wrapper around this.
 */
// Security fix (GP-013, audit Phase 3): this function has no ownership
// check by design (see the comment above) — the 7-day window bounds how
// LONG a leaked/shared link works, but does nothing about WHAT it exposes.
// It previously returned full inquiry rows via select("*"), including
// client_id_passport/client_kra_pin/client_dob and the same three fields
// for next of kin — regulated identity data under the Kenya Data Protection
// Act, reachable by anyone holding the UUID from a public ?inquiryId= query
// param, no credential required. thank-you.tsx (the sole real consumer,
// confirmed by grep) never reads any of those fields — only the ones
// listed below. Selecting exactly that set closes the actual exposure
// without changing the receipt page's behavior at all.
const RECEIPT_INQUIRY_COLUMNS =
  "id, client_full_name, client_phone, client_email, plot_number_ref, phase_name, payment_preference, created_at";
const RECEIPT_PAYMENT_COLUMNS = "id, inquiry_id, amount, created_at";
const RECEIPT_BOOKING_COLUMNS = "id, inquiry_id, visit_date, visit_time, transport_mode";
const RECEIPT_AGREEMENT_COLUMNS = "id, inquiry_id, payment_id, ceo_signed";

export async function getReceiptData(inquiryId: string) {
  const service = getServiceClient();

  const { data: inquiry } = await (service as any)
    .from("inquiries")
    .select(RECEIPT_INQUIRY_COLUMNS)
    .eq("id", inquiryId)
    .maybeSingle();

  if (!inquiry) {
    return { found: false as const };
  }

  if (Date.now() - new Date(inquiry.created_at).getTime() > RECEIPT_LINK_MAX_AGE_MS) {
    return { found: false as const, expired: true as const };
  }

  const { data: payment } = await (service as any)
    .from("payments")
    .select(RECEIPT_PAYMENT_COLUMNS)
    .eq("inquiry_id", inquiryId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: booking } = await (service as any)
    .from("bookings")
    .select(RECEIPT_BOOKING_COLUMNS)
    .eq("inquiry_id", inquiryId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: agreement } = payment
    ? await (service as any)
        .from("agreements")
        .select(RECEIPT_AGREEMENT_COLUMNS)
        .eq("payment_id", payment.id)
        .maybeSingle()
    : { data: null };

  return { found: true as const, inquiry, payment, booking, agreement };
}

export const getReceiptFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => GetReceiptInput.parse(d))
  .handler(async ({ data }) => getReceiptData(data.inquiryId));
