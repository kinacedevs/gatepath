/**
 * Gatepath Realtors — Inquiry Document Signing Actions (Server Functions)
 *
 * Same pattern as leadsActions.ts/bookingActions.ts/plotVerificationActions.ts:
 * service-role client, caller re-verified server-side via callerAccessToken,
 * never trusting a client-asserted role. Replaces admin.inquiries.tsx's
 * previous direct (supabase as any).from("agreements"/"offers").update(...)
 * calls in handleCeoSignature/handleCeoSignOffer, which violated CLAUDE.md's
 * explicit rule against client-side writes to `agreements`.
 *
 * Higher-stakes than the other server-function fixes this session: this is
 * the CEO's e-signature on legally binding documents, so the role check is
 * strict — `role === 'ceo'`, not just "is any recognised staff member" —
 * mirroring and making authoritative the existing client-side
 * `adminRole !== "ceo"` gate in admin.inquiries.tsx.
 */
import { createServerFn } from "@tanstack/react-start";
import { getServiceClient, getAnonClient } from "./supabaseAdmin";

async function verifyCeoCaller(callerAccessToken: string) {
  const anonClient = getAnonClient();
  const { data: callerData, error: callerErr } = await anonClient.auth.getUser(callerAccessToken);
  if (callerErr || !callerData.user?.email) {
    return { ok: false as const, error: "Not authenticated." };
  }

  const serviceClient = getServiceClient();
  const { data: callerRow } = await serviceClient
    .from("admin_users")
    .select("id, role")
    .eq("email", callerData.user.email.toLowerCase())
    .maybeSingle();

  if (!callerRow) {
    return { ok: false as const, error: "Not recognised as Gatepath staff." };
  }
  if (callerRow.role !== "ceo") {
    return { ok: false as const, error: "Only the CEO can sign legal documents." };
  }

  return { ok: true as const, serviceClient };
}

export const signAgreementFn = createServerFn({ method: "POST" })
  .validator((d: { callerAccessToken: string; inquiryId: string }) => d)
  .handler(async ({ data }) => {
    const caller = await verifyCeoCaller(data.callerAccessToken);
    if (!caller.ok) return { success: false, error: caller.error };

    const { error } = await caller.serviceClient
      .from("agreements")
      .update({ ceo_signed: true, ceo_signed_at: new Date().toISOString() })
      .eq("inquiry_id", data.inquiryId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  });

export const signOfferFn = createServerFn({ method: "POST" })
  .validator((d: { callerAccessToken: string; inquiryId: string }) => d)
  .handler(async ({ data }) => {
    const caller = await verifyCeoCaller(data.callerAccessToken);
    if (!caller.ok) return { success: false, error: caller.error };

    const { error } = await caller.serviceClient
      .from("offers")
      .update({ ceo_signed: true, ceo_signed_at: new Date().toISOString() })
      .eq("inquiry_id", data.inquiryId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  });
