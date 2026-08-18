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
import { verifyCeoCaller as verifyCeoCallerShared } from "./serverAuth";

// Module 3 audit finding #8: this file's own verify-caller implementation
// is consolidated into src/lib/serverAuth.ts — same strict role === 'ceo'
// check, same rejection message, kept as a thin wrapper so the two
// handlers below (which only ever read .ok/.error/.serviceClient, never
// .caller) are unchanged.
function verifyCeoCaller(callerAccessToken: string) {
  return verifyCeoCallerShared(callerAccessToken, "Only the CEO can sign legal documents.");
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
