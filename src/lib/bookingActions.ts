/**
 * Gatepath Realtors — Site Visit Booking Actions (Server Functions)
 *
 * Same pattern as leadsActions.ts/plotVerificationActions.ts: service-role
 * client, caller re-verified server-side via callerAccessToken, never
 * trusting a client-asserted role. Replaces admin.bookings.tsx's previous
 * direct (supabase as any).from("bookings").update(...) call, and gives the
 * old Meetings & Calls tab's non-functional "Reschedule" button a real
 * handler for the first time (it previously had no onClick at all).
 *
 * Any recognised staff member can act — site-visit logistics is routine
 * day-to-day work, not a CEO-gated action like agreement signing.
 */
import { createServerFn } from "@tanstack/react-start";
import { getServiceClient, getAnonClient } from "./supabaseAdmin";

export const updateBookingFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      callerAccessToken: string;
      bookingId: string;
      status?: "pending" | "confirmed" | "completed" | "cancelled";
      visitDate?: string;
      visitTime?: "morning" | "afternoon";
    }) => d,
  )
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
      .select("id")
      .eq("email", callerData.user.email.toLowerCase())
      .maybeSingle();

    if (!callerRow) {
      return { success: false, error: "Not recognised as Gatepath staff." };
    }

    const patch: Record<string, unknown> = {};
    if (data.status) patch.status = data.status;
    if (data.visitDate) patch.visit_date = data.visitDate;
    if (data.visitTime) patch.visit_time = data.visitTime;

    if (Object.keys(patch).length === 0) {
      return { success: false, error: "Nothing to update." };
    }

    const { error: updateErr } = await serviceClient
      .from("bookings")
      .update(patch)
      .eq("id", data.bookingId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    return { success: true };
  });
