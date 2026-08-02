/**
 * Gatepath Realtors — Interaction Log Actions (Server Functions)
 *
 * Same pattern as plotVerificationActions.ts/bookingActions.ts: service-role
 * client, caller re-verified server-side via callerAccessToken, never
 * trusting a client-asserted role. Any real staff member can log an
 * interaction (routine day-to-day work, not CEO-gated, matching
 * bookingActions.ts's precedent) — the check confirms they're recognised
 * Gatepath staff, not a specific role.
 */
import { createServerFn } from "@tanstack/react-start";
import { getServiceClient, getAnonClient } from "./supabaseAdmin";

async function verifyStaffCaller(callerAccessToken: string) {
  const anonClient = getAnonClient();
  const { data: callerData, error: callerErr } = await anonClient.auth.getUser(callerAccessToken);
  if (callerErr || !callerData.user?.email) {
    return { ok: false as const, error: "Not authenticated." };
  }

  const serviceClient = getServiceClient();
  const { data: callerRow } = await serviceClient
    .from("admin_users")
    .select("id, full_name, email")
    .eq("email", callerData.user.email.toLowerCase())
    .maybeSingle();

  if (!callerRow) {
    return { ok: false as const, error: "Not recognised as Gatepath staff." };
  }

  return { ok: true as const, serviceClient, caller: callerRow };
}

export const logInteractionFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      callerAccessToken: string;
      inquiryId: string;
      channel: "call" | "email" | "whatsapp" | "sms" | "site_visit" | "other";
      direction: "outbound" | "inbound";
      notes: string;
      occurredAt?: string;
      callOutcome?: "connected" | "voicemail" | "no_answer" | "wrong_number" | "callback_requested";
      latitude?: number;
      longitude?: number;
    }) => d,
  )
  .handler(async ({ data }) => {
    const caller = await verifyStaffCaller(data.callerAccessToken);
    if (!caller.ok) return { success: false, error: caller.error };

    const { error } = await caller.serviceClient.from("interaction_log").insert({
      inquiry_id: data.inquiryId,
      channel: data.channel,
      direction: data.direction,
      notes: data.notes || null,
      call_outcome: data.callOutcome ?? null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      logged_by_name: caller.caller.full_name,
      logged_by_email: caller.caller.email,
      occurred_at: data.occurredAt ?? new Date().toISOString(),
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
  });
