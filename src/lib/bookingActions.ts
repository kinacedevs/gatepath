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
import { notifyOptedInAdmins } from "./notifications";

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

/**
 * Public-facing (no caller auth — mirrors notifications.ts's
 * sendSiteVisitNotificationFn, already called from this exact flow with no
 * admin identity). Replaces book-visit.tsx's previous direct
 * (supabase as any).from("bookings").insert(...) call, which violated
 * CLAUDE.md's explicit "never write to bookings from client-side code"
 * rule — the paid path already goes through the service-role-verified
 * payment/webhook flow from Phase 1, but the free-visit path never did.
 *
 * Also enforces the real, admin-configurable daily capacity (Part 3, Slice
 * E) — a client-side-only check would be trivially bypassable, so this has
 * to be the server-side gate regardless of the write-path fix above.
 */
export const createFreeSiteVisitBookingFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      inquiryId: string;
      visitDate: string | null;
      visitTime: "morning" | "afternoon" | null;
      attendees: number;
      visitNotes: string | null;
      visitType: string;
      transportMode: string | null;
      pickupLocation: string | null;
    }) => d,
  )
  .handler(async ({ data }) => {
    const serviceClient = getServiceClient();

    if (data.visitDate) {
      // Same checks book-visit.tsx already does client-side — restated
      // here since a public server function can't trust the client ran them.
      const visit = new Date(`${data.visitDate}T00:00:00`);
      if (visit.getDay() === 0) {
        return {
          success: false,
          error: "We are closed on Sundays. Please select Monday–Saturday.",
        };
      }
      const maxDate = new Date(Date.now() + 60 * 86400000);
      if (visit > maxDate) {
        return { success: false, error: "Please select a date within the next 60 days." };
      }

      const { data: capacityRow } = await (serviceClient as any)
        .from("site_banners")
        .select("data")
        .eq("id", "booking_capacity")
        .maybeSingle();
      const maxPerDay = capacityRow?.data?.max_per_day ?? 8;

      const { count } = await serviceClient
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("visit_date", data.visitDate)
        .neq("status", "cancelled");

      if ((count ?? 0) >= maxPerDay) {
        return { success: false, error: "That day is fully booked — please choose another date." };
      }
    }

    // .select().single() so the caller gets a real bookingId back — needed
    // by sendSiteVisitNotificationFn's GP-015 fix, which now re-derives
    // every notification field from this row server-side instead of
    // trusting a caller-supplied copy of the form.
    const { data: booking, error } = await (serviceClient as any)
      .from("bookings")
      .insert({
        inquiry_id: data.inquiryId,
        visit_date: data.visitDate,
        visit_time: data.visitTime,
        attendees: data.attendees,
        visit_notes: data.visitNotes,
        visit_type: data.visitType,
        transport_mode: data.transportMode,
        pickup_location: data.pickupLocation,
        status: "pending",
      })
      .select("id")
      .single();

    if (error || !booking) {
      return { success: false, error: error?.message ?? "Failed to save your booking." };
    }

    // Real "Email Notifications" staff preference (migration 0040) — fire
    // after the booking is safely committed, never before, and never
    // allowed to affect the response (notifyOptedInAdmins swallows its
    // own errors).
    const { data: inquiry } = await (serviceClient as any)
      .from("inquiries")
      .select("client_full_name, phase_name, plot_number_ref")
      .eq("id", data.inquiryId)
      .maybeSingle();
    if (inquiry) {
      await notifyOptedInAdmins(
        `New Site Visit Booked: ${inquiry.client_full_name}`,
        `<p><strong>${inquiry.client_full_name}</strong> booked a site visit${data.visitDate ? ` for ${data.visitDate}${data.visitTime ? ` (${data.visitTime})` : ""}` : ""} — Plot #${inquiry.plot_number_ref ?? "—"} at ${inquiry.phase_name ?? "—"}.</p>`,
      );
    }

    return { success: true, bookingId: booking.id as string };
  });
