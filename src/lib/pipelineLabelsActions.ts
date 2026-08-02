/**
 * Gatepath Realtors — Pipeline Label Overrides (Settings Expansion)
 *
 * "Relabel only" per the user's explicit choice — inquiries.status (the 4-
 * value Kanban enum) stays exactly as-is; this only lets a CEO/manager
 * change the *display* labels shown for pending/reviewed/approved/rejected
 * (today's New/In Review/Won/Lost) across admin.leads.tsx and
 * admin.field-mode.tsx. Reuses the existing site_banners generic key-value
 * table (Phase 9's own established pattern) — no new schema. Gate matches
 * Site Content's precedent (adminRole !== "agent"): a label is cosmetic,
 * not financial/credential data.
 */
import { createServerFn } from "@tanstack/react-start";
import { getServiceClient, getAnonClient } from "./supabaseAdmin";
import { logAuditEvent } from "./auditLog";

export const DEFAULT_PIPELINE_LABELS: Record<
  "pending" | "reviewed" | "approved" | "rejected",
  string
> = {
  pending: "New",
  reviewed: "In Review",
  approved: "Won",
  rejected: "Lost",
};

export const savePipelineLabelsFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      callerAccessToken: string;
      labels: Record<"pending" | "reviewed" | "approved" | "rejected", string>;
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
      .select("id, full_name, email, role")
      .eq("email", callerData.user.email.toLowerCase())
      .maybeSingle();
    if (!callerRow) {
      return { success: false, error: "Not recognised as Gatepath staff." };
    }
    if (callerRow.role === "agent") {
      return { success: false, error: "Agents cannot manage pipeline labels." };
    }

    const { error } = await (serviceClient as any).from("site_banners").upsert(
      {
        id: "pipeline_labels",
        data: data.labels,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    if (error) return { success: false, error: error.message };

    await logAuditEvent(serviceClient, {
      actorEmail: callerRow.email,
      actorName: callerRow.full_name,
      action: "pipeline_labels.save",
      entityType: "site_banners",
      entityId: "pipeline_labels",
      details: data.labels,
    });

    return { success: true };
  });
