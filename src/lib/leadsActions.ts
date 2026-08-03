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
      /** Optional finer-grained position within newStatus's bucket (Phase
       * 35). Kanban drag-drop onto a custom stage column passes the target
       * stage's id (or explicit null, for dropping back on a bucket's own
       * base column). Omitted entirely by Field Mode's simpler bucket-only
       * buttons — in that case the handler always clears any existing
       * stage, since a bucket-only move can't know which of that bucket's
       * stages (if any) the lead should land in. */
      pipelineStageId?: string | null;
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
      .update({
        status: data.newStatus,
        pipeline_stage_id: data.pipelineStageId !== undefined ? data.pipelineStageId : null,
      })
      .eq("id", data.inquiryId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    return { success: true };
  });

/**
 * Manual lead assignment (Phase 33). Same "any signed-in admin" gate as
 * updateInquiryStatusFn — assigning a lead to a CRO is the same weight of
 * routine day-to-day work as dragging a status. Sets cro_name only:
 * admin_users has no phone column, and cro_phone is a dead/legacy field
 * (read once, in document.offer.$id.tsx, never written anywhere) that this
 * function deliberately leaves untouched rather than guessing a value for it.
 */
export const assignLeadFn = createServerFn({ method: "POST" })
  .validator((d: { callerAccessToken: string; inquiryId: string; croName: string | null }) => d)
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
      .select("role")
      .eq("email", callerData.user.email.toLowerCase())
      .maybeSingle();

    if (!callerRow) {
      return { success: false, error: "Not recognised as Gatepath staff." };
    }

    const { error: updateErr } = await serviceClient
      .from("inquiries")
      .update({ cro_name: data.croName })
      .eq("id", data.inquiryId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    return { success: true };
  });
