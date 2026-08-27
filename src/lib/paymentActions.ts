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
import { sendResendEmail, sendAfricaTalkingSms, getReservationEmailHtml } from "./notifications";
import { recomputePhaseCounts } from "./plotActions";
import { computeInstallmentPricing } from "./pricing";

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
  [key: string]: unknown;
};

async function verifyPaystackTransaction(reference: string): Promise<PaystackVerifyData> {
  const secretKey = typeof process !== "undefined" ? process.env.PAYSTACK_SECRET_KEY : "";
  if (!secretKey) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured on the server.");
  }

  const res = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${secretKey}` } },
  );
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
    const { data: existingOffer } = await (service as any)
      .from("offers")
      .select("id")
      .eq("inquiry_id", inquiry.id)
      .maybeSingle();

    if (!existingOffer) {
      await (service as any)
        .from("offers")
        .insert({ inquiry_id: inquiry.id, payment_id: payment.id, ceo_signed: false });
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
    const { data: existingAgreement } = await (service as any)
      .from("agreements")
      .select("id")
      .eq("inquiry_id", inquiry.id)
      .maybeSingle();

    if (!existingAgreement) {
      await (service as any)
        .from("agreements")
        .insert({ inquiry_id: inquiry.id, payment_id: payment.id, ceo_signed: false });
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
    await sendResendEmail(
      inquiry.client_email,
      `Payment Confirmed: Plot #${inquiry.plot_number_ref} secured!`,
      emailHtml,
    );
    await sendAfricaTalkingSms(
      inquiry.client_phone,
      `Payment Confirmed: Ksh ${amountKes.toLocaleString()} received for Plot #${inquiry.plot_number_ref} at ${inquiry.phase_name}. Gatepath Realtors Welcomes you!`,
    );
  } catch (err) {
    // Notification failure must never undo an already-verified payment.
    console.error("[Payment] Notification dispatch failed:", err);
  }

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

/**
 * Read-only receipt lookup for thank-you.tsx. payments/inquiries/agreements/
 * bookings SELECT is admin-only under RLS (see migration 0001) — this is the
 * one legitimate path for a buyer to see their own just-completed receipt,
 * keyed by the inquiry id already sitting in their own browser session
 * (InquiryContext), not by anything guessable server-side.
 */
export const getReceiptFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => GetReceiptInput.parse(d))
  .handler(async ({ data }) => {
    const service = getServiceClient();

    const { data: inquiry } = await (service as any)
      .from("inquiries")
      .select("*")
      .eq("id", data.inquiryId)
      .maybeSingle();

    if (!inquiry) {
      return { found: false as const };
    }

    const { data: payment } = await (service as any)
      .from("payments")
      .select("*")
      .eq("inquiry_id", data.inquiryId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: booking } = await (service as any)
      .from("bookings")
      .select("*")
      .eq("inquiry_id", data.inquiryId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: agreement } = payment
      ? await (service as any)
          .from("agreements")
          .select("*")
          .eq("payment_id", payment.id)
          .maybeSingle()
      : { data: null };

    return { found: true as const, inquiry, payment, booking, agreement };
  });
