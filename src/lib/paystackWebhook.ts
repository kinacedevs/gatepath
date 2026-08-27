/**
 * Gatepath Realtors — Real Paystack Webhook (Module 3 / Phase 2a)
 *
 * SERVER-ONLY. Imported exclusively by src/server.ts (and, for unit
 * testing only, paystackWebhook.test.ts — Vitest runs in Node with its own
 * module graph, never bundled into dist/client, so this doesn't violate
 * the rule below), dispatched before the TanStack SSR handler — same
 * import-graph discipline as apiRoutes.ts, and for the same reason: this
 * file's call path reaches getServiceClient() (via recordVerifiedPayment),
 * which must never be reachable from client-bundled code.
 * computeSignature/constantTimeEqual are exported solely so the test file
 * can exercise them directly — neither is called from anywhere but this
 * file's own handler.
 *
 * Closes the one gap docs/SECURITY_HARDENING.md flagged as still open:
 * "the edge case where a buyer's money leaves their account but they
 * close the tab before the verify call completes." Until this file, the
 * ONLY way a payment got recorded was the client-triggered popup
 * callback in payment.tsx/portal.tsx calling verifyPaymentFn.
 *
 * This does NOT move verification into a new place — it calls the exact
 * same recordVerifiedPayment() function (src/lib/paymentActions.ts) the
 * client-verify path already uses, idempotent on paystack_reference, so
 * whichever path (client callback or this webhook) arrives first does
 * the real work and the second is a safe no-op.
 *
 * Deliberately does NOT trust anything in the webhook body as proof of
 * payment on its own — recordVerifiedPayment independently re-verifies
 * the transaction against Paystack's own GET /transaction/verify/:ref
 * API before writing anything, exactly as it already does for the
 * client-triggered path. The webhook's only job is to notice the event
 * happened and supply the reference + inquiry_id — never to assert an
 * amount or status directly from the webhook payload.
 */
import { recordVerifiedPayment } from "./paymentActions";
import { getServiceClient } from "./supabaseAdmin";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "Cache-Control": "private, no-store" },
  });
}

/** Hex-encoded HMAC-SHA512 over the raw request body, per Paystack's own
 * docs (https://paystack.com/docs/payments/webhooks/). Computed against
 * the exact bytes received — NOT a re-JSON.stringify()'d copy of the
 * parsed body, which Paystack's own sample code uses and which is not
 * guaranteed byte-identical to what was actually sent (key order,
 * whitespace, number formatting can all differ), risking false-negative
 * signature mismatches. */
export async function computeSignature(rawBody: string, secretKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secretKey),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  return Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Constant-time comparison — a plain === leaks timing information about
 * how many leading bytes matched, which matters for a signature check. */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

async function logAutomationEvent(
  outcome: "success" | "failed" | "skipped_duplicate",
  entityId: string | null,
  errorMessage?: string,
) {
  try {
    const service = getServiceClient();
    await (service as any).from("automation_log").insert({
      workflow_key: "payments-webhook-v1",
      event_type: "paystack.charge.success",
      entity_type: "payments",
      entity_id: entityId,
      outcome,
      error_message: errorMessage ? errorMessage.slice(0, 500) : null,
    });
  } catch (err) {
    // A logging failure must never affect the actual webhook response —
    // the payment recording above has already succeeded or failed on its
    // own by the time this runs.
    console.error("[Paystack Webhook] Failed to write automation_log:", err);
  }
}

export async function handlePaystackWebhook(request: Request): Promise<Response> {
  const secretKey = typeof process !== "undefined" ? process.env.PAYSTACK_SECRET_KEY : "";
  if (!secretKey) {
    console.error("[Paystack Webhook] PAYSTACK_SECRET_KEY is not configured.");
    // 500, not 200 — this is a real server misconfiguration Paystack
    // should retry against, not a payload problem to acknowledge away.
    return jsonResponse({ error: "Server not configured." }, 500);
  }

  // Read the raw body BEFORE any JSON parsing — see computeSignature's own
  // comment on why a re-serialized copy would risk false-negative matches.
  const rawBody = await request.text();
  const signatureHeader = request.headers.get("x-paystack-signature") ?? "";

  let expectedSignature: string;
  try {
    expectedSignature = await computeSignature(rawBody, secretKey);
  } catch (err) {
    console.error("[Paystack Webhook] Signature computation failed:", err);
    return jsonResponse({ error: "Internal server error." }, 500);
  }

  if (!signatureHeader || !constantTimeEqual(signatureHeader, expectedSignature)) {
    console.error("[Paystack Webhook] Signature mismatch — rejecting.");
    await logAutomationEvent("failed", null, "Signature verification failed.");
    return jsonResponse({ error: "Invalid signature." }, 401);
  }

  let event: { event?: string; data?: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }

  // Paystack sends many event types (transfer.success, subscription.*,
  // etc.) on the same webhook URL — this app only ever needs charge.success,
  // matching what verifyPaymentFn's client-triggered path already reacts to.
  if (event.event !== "charge.success") {
    return jsonResponse({ received: true, ignored: event.event ?? "unknown" });
  }

  const data = event.data ?? {};
  const reference = typeof data.reference === "string" ? data.reference : null;
  const metadata = (data.metadata ?? {}) as Record<string, unknown>;
  const inquiryId = typeof metadata.inquiry_id === "string" ? metadata.inquiry_id : null;
  const periodMonthsRaw = metadata.period_months;
  const periodMonths =
    typeof periodMonthsRaw === "number"
      ? periodMonthsRaw
      : typeof periodMonthsRaw === "string" && periodMonthsRaw.trim() !== ""
        ? Number(periodMonthsRaw)
        : undefined;

  if (!reference) {
    await logAutomationEvent("failed", null, "Webhook payload missing data.reference.");
    return jsonResponse({ error: "Missing reference." }, 400);
  }

  if (!inquiryId) {
    // A real, genuine gap: this charge was never initiated through
    // payment.tsx/portal.tsx's own metadata-carrying setup (an older
    // transaction from before this fix, or something outside the normal
    // flow). Acknowledge receipt so Paystack stops retrying, but flag it —
    // this needs a human to reconcile manually, the exact same honest
    // "flagged, not silently dropped" pattern recordVerifiedPayment
    // itself already uses for a plot-reservation conflict.
    console.error(
      `[Paystack Webhook] charge.success for reference ${reference} has no metadata.inquiry_id — cannot record automatically, needs manual reconciliation.`,
    );
    await logAutomationEvent(
      "failed",
      null,
      `Reference ${reference}: no inquiry_id in metadata, needs manual reconciliation.`,
    );
    return jsonResponse({ received: true, warning: "No inquiry_id in metadata." });
  }

  try {
    const result = await recordVerifiedPayment({ reference, inquiryId, periodMonths });
    if (!result.success) {
      await logAutomationEvent("failed", inquiryId, result.error);
      // Still 200 — Paystack's retry won't fix a Gatepath-side rejection
      // (e.g. the inquiry no longer exists), and the failure is already
      // logged for a human to see.
      return jsonResponse({ received: true, warning: result.error });
    }
    await logAutomationEvent(
      (result as any).alreadyProcessed ? "skipped_duplicate" : "success",
      inquiryId,
    );
    return jsonResponse({ received: true });
  } catch (err: any) {
    console.error("[Paystack Webhook] recordVerifiedPayment threw:", err);
    await logAutomationEvent("failed", inquiryId, err?.message ?? "Unknown error.");
    return jsonResponse({ error: "Internal server error." }, 500);
  }
}
