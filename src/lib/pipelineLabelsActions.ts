/**
 * Gatepath Realtors — Pipeline Label Overrides + Custom Stages
 *
 * Labels: inquiries.status (the 4-value Kanban enum) stays exactly as-is;
 * savePipelineLabelsFn only lets a CEO/manager change the *display* labels
 * shown for pending/reviewed/approved/rejected (today's New/In Review/Won/
 * Lost) across admin.leads.tsx and admin.field-mode.tsx. Reuses the
 * existing site_banners generic key-value table (Phase 9's own established
 * pattern) — no new schema.
 *
 * Custom stages (Phase 35): real add/remove/reorder flexibility, but as
 * sub-positions *within* one of the 4 fixed buckets, never a replacement
 * for status itself — see supabase/migrations/0026_pipeline_stages.sql's
 * header for why. savePipelineStageFn/deactivatePipelineStageFn manage the
 * new pipeline_stages table.
 *
 * Gate matches Site Content's precedent (adminRole !== "agent") throughout
 * this file: pipeline labels/stages are workflow/display configuration,
 * not financial/credential data.
 */
import { createServerFn } from "@tanstack/react-start";
import { verifyManagerCaller as verifyNotAgentCallerShared } from "./serverAuth";
import { logAuditEvent } from "./auditLog";

// Module 3 audit finding #8: this file's own verify-caller implementation
// ("not agent") is consolidated into src/lib/serverAuth.ts's
// verifyManagerCaller — the identical check the other way around.
function verifyNotAgentCaller(callerAccessToken: string) {
  return verifyNotAgentCallerShared(callerAccessToken, "Agents cannot manage the pipeline.");
}

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
    const caller = await verifyNotAgentCaller(data.callerAccessToken);
    if (!caller.ok) return { success: false, error: caller.error };

    const { error } = await (caller.serviceClient as any).from("site_banners").upsert(
      {
        id: "pipeline_labels",
        data: data.labels,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    if (error) return { success: false, error: error.message };

    await logAuditEvent(caller.serviceClient, {
      actorEmail: caller.caller.email,
      actorName: caller.caller.full_name,
      action: "pipeline_labels.save",
      entityType: "site_banners",
      entityId: "pipeline_labels",
      details: data.labels,
    });

    return { success: true };
  });

// ─── Custom pipeline stages (Phase 35) ─────────────────────────────────────

export const savePipelineStageFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      callerAccessToken: string;
      stageId?: string;
      bucket: "pending" | "reviewed" | "approved" | "rejected";
      label: string;
      displayOrder: number;
    }) => d,
  )
  .handler(async ({ data }) => {
    const caller = await verifyNotAgentCaller(data.callerAccessToken);
    if (!caller.ok) return { success: false, error: caller.error };

    const label = data.label.trim();
    if (!label) return { success: false, error: "Stage label is required." };

    const payload = {
      bucket: data.bucket,
      label,
      display_order: data.displayOrder,
      updated_at: new Date().toISOString(),
    };

    if (data.stageId) {
      // If this edit moves an already-in-use stage to a different bucket,
      // every inquiry currently pointing at it must follow — otherwise the
      // Kanban (which renders a card purely from pipeline_stage_id) and
      // every report/conversion metric (which keys strictly off the real
      // inquiries.status) permanently disagree about which bucket that
      // lead is actually in, with no reconciliation path. Same "fix the
      // real data, don't just relabel the stage" discipline already
      // applied to deactivatePipelineStageFn below.
      const { data: existingStage } = await (caller.serviceClient as any)
        .from("pipeline_stages")
        .select("bucket")
        .eq("id", data.stageId)
        .maybeSingle();

      if (existingStage && existingStage.bucket !== data.bucket) {
        const { error: cascadeErr } = await (caller.serviceClient as any)
          .from("inquiries")
          .update({ status: data.bucket })
          .eq("pipeline_stage_id", data.stageId);
        if (cascadeErr) return { success: false, error: cascadeErr.message };
      }

      const { error } = await (caller.serviceClient as any)
        .from("pipeline_stages")
        .update(payload)
        .eq("id", data.stageId);
      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await (caller.serviceClient as any).from("pipeline_stages").insert({
        ...payload,
        created_by_email: caller.caller.email,
        created_by_name: caller.caller.full_name,
      });
      if (error) return { success: false, error: error.message };
    }

    await logAuditEvent(caller.serviceClient, {
      actorEmail: caller.caller.email,
      actorName: caller.caller.full_name,
      action: data.stageId ? "pipeline_stage.update" : "pipeline_stage.create",
      entityType: "pipeline_stages",
      entityId: data.stageId,
      details: payload,
    });

    return { success: true };
  });

export const deactivatePipelineStageFn = createServerFn({ method: "POST" })
  .validator((d: { callerAccessToken: string; stageId: string }) => d)
  .handler(async ({ data }) => {
    const caller = await verifyNotAgentCaller(data.callerAccessToken);
    if (!caller.ok) return { success: false, error: caller.error };

    // Return every inquiry currently in this stage to its bucket's base
    // column first — without this, a card pointing at a now-hidden stage
    // would render in no column at all (see the migration's own header).
    const { error: clearErr } = await (caller.serviceClient as any)
      .from("inquiries")
      .update({ pipeline_stage_id: null })
      .eq("pipeline_stage_id", data.stageId);
    if (clearErr) return { success: false, error: clearErr.message };

    const { error } = await (caller.serviceClient as any)
      .from("pipeline_stages")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", data.stageId);
    if (error) return { success: false, error: error.message };

    await logAuditEvent(caller.serviceClient, {
      actorEmail: caller.caller.email,
      actorName: caller.caller.full_name,
      action: "pipeline_stage.deactivate",
      entityType: "pipeline_stages",
      entityId: data.stageId,
    });

    return { success: true };
  });
