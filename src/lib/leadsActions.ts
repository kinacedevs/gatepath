/**
 * Gatepath Realtors — Leads Pipeline Actions (Server Functions)
 *
 * Same pattern as adminActions.ts: service-role client, caller re-verified
 * server-side via callerAccessToken, never trusting a client-asserted role.
 *
 * Backs the real drag-and-drop Kanban in admin.leads.tsx (Phase 5A). Status
 * updates only — document issuance (Offer Letter / Agreement) is entirely
 * payment-driven via paymentActions.ts's recordVerifiedPayment (Phase 7):
 * a deposit issues an Offer, full payment issues an Agreement. Dragging a
 * card to "approved" is a review-workflow flag, nothing more, matching
 * admin.inquiries.tsx's handleApproveInquiry.
 */
import { createServerFn } from "@tanstack/react-start";
import { getServiceClient, getAnonClient } from "./supabaseAdmin";

export const updateInquiryStatusFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      callerAccessToken: string;
      inquiryId: string;
      newStatus: "pending" | "reviewed" | "approved" | "rejected";
    }) => d,
  )
  .handler(async ({ data }) => {
    // 1. Verify the caller's session token is real.
    const anonClient = getAnonClient();
    const { data: callerData, error: callerErr } = await anonClient.auth.getUser(
      data.callerAccessToken,
    );
    if (callerErr || !callerData.user?.email) {
      return { success: false, error: "Not authenticated." };
    }

    const serviceClient = getServiceClient();

    // 2. Confirm the caller is recognised staff — any role, matching today's
    // behavior where any signed-in admin can move a lead through the pipeline.
    const { data: callerRow } = await serviceClient
      .from("admin_users")
      .select("role")
      .eq("email", callerData.user.email.toLowerCase())
      .maybeSingle();

    if (!callerRow) {
      return { success: false, error: "Not recognised as Gatepath staff." };
    }

    // 3. The actual status write. Document issuance is payment-driven
    // elsewhere (paymentActions.ts) — this never touches offers/agreements.
    const { error: updateErr } = await serviceClient
      .from("inquiries")
      .update({ status: data.newStatus })
      .eq("id", data.inquiryId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    return { success: true };
  });
