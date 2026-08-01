/**
 * Gatepath Realtors — Escalation Actions (Server Functions)
 *
 * Same pattern as bookingActions.ts/interactionLogActions.ts: service-role
 * client, caller re-verified server-side, any staff role (routine
 * day-to-day work). logBookingFeedbackFn writes ONLY staff_feedback/
 * feedback_logged_at — it never touches bookings.status, so this is an
 * annotation, not a status transition, and doesn't need the dedicated
 * separately-reviewed treatment CLAUDE.md requires for actual conveyancing/
 * booking-status changes.
 */
import { createServerFn } from "@tanstack/react-start";
import { getServiceClient, getAnonClient } from "./supabaseAdmin";
import { logAuditEvent } from "./auditLog";

export const logBookingFeedbackFn = createServerFn({ method: "POST" })
  .validator((d: { callerAccessToken: string; bookingId: string; feedback: string }) => d)
  .handler(async ({ data }) => {
    const anonClient = getAnonClient();
    const { data: callerData, error: callerErr } = await anonClient.auth.getUser(
      data.callerAccessToken,
    );
    if (callerErr || !callerData.user?.email) {
      return { success: false, error: "Not authenticated." };
    }

    const serviceClient = getServiceClient();
    const { data: callerRow } = await serviceClient
      .from("admin_users")
      .select("id, email, full_name")
      .eq("email", callerData.user.email.toLowerCase())
      .maybeSingle();
    if (!callerRow) {
      return { success: false, error: "Not recognised as Gatepath staff." };
    }

    const { error } = await serviceClient
      .from("bookings")
      .update({
        staff_feedback: data.feedback,
        feedback_logged_at: new Date().toISOString(),
      })
      .eq("id", data.bookingId);

    if (error) return { success: false, error: error.message };

    await logAuditEvent(serviceClient, {
      actorEmail: callerRow.email,
      actorName: callerRow.full_name,
      action: "booking.feedback_logged",
      entityType: "bookings",
      entityId: data.bookingId,
    });

    return { success: true };
  });
