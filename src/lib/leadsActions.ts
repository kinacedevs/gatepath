/**
 * Gatepath Realtors — Leads Pipeline Actions (Server Functions)
 *
 * Same pattern as adminActions.ts: service-role client, caller re-verified
 * server-side via callerAccessToken, never trusting a client-asserted role.
 *
 * Backs the real drag-and-drop Kanban in admin.leads.tsx (Phase 5A). The old
 * admin.tsx handleApproveInquiry() did the status update AND a raw client-side
 * supabase.from("agreements").insert(...) — a violation of the "never write
 * to agreements from client-side code" rule. That agreement-creation side
 * effect is folded in here so the one legitimate server-side path replaces
 * both the old write and the old violation at once.
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

    // 3. The actual status write.
    const { error: updateErr } = await serviceClient
      .from("inquiries")
      .update({ status: data.newStatus })
      .eq("id", data.inquiryId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    // 4. Approval creates the paired (unsigned) agreement, same as before —
    // now server-side, and idempotent so re-dragging a card that's already
    // been approved once doesn't create a duplicate agreement row.
    if (data.newStatus === "approved") {
      const { data: existingAgreement } = await serviceClient
        .from("agreements")
        .select("id")
        .eq("inquiry_id", data.inquiryId)
        .maybeSingle();

      if (!existingAgreement) {
        const { data: linkedPayment } = await serviceClient
          .from("payments")
          .select("id")
          .eq("inquiry_id", data.inquiryId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const { error: agreementErr } = await serviceClient.from("agreements").insert({
          inquiry_id: data.inquiryId,
          payment_id: linkedPayment?.id ?? null,
          ceo_signed: false,
        });

        if (agreementErr) {
          return {
            success: false,
            error: `Status updated, but agreement creation failed: ${agreementErr.message}`,
          };
        }
      }
    }

    return { success: true };
  });
