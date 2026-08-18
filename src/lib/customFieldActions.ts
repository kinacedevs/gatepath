/**
 * Gatepath Realtors — Custom Field Definitions (Settings Expansion, Phase 27)
 *
 * CEO/manager only — defining what data the business collects is a more
 * foundational, schema-adjacent decision than routine marketing content
 * (Site Content's "not agent" bar), closer to Data Governance's/API keys'
 * elevated gate reasoning.
 *
 * No hard-delete action is exposed here on purpose, even though the RLS
 * technically permits one (same admin-manages-all shape as testimonials/
 * faqs) — deactivateCustomFieldDefinitionFn (is_active = false) is the only
 * removal path, since a hard delete would orphan the label for any
 * inquiry that already holds a value keyed to that field.
 */
import { createServerFn } from "@tanstack/react-start";
import { verifyManagerCaller as verifyManagerCallerShared } from "./serverAuth";
import { logAuditEvent } from "./auditLog";

// Module 3 audit finding #8: this file's own verify-caller implementation
// is consolidated into src/lib/serverAuth.ts.
function verifyManagerCaller(callerAccessToken: string) {
  return verifyManagerCallerShared(
    callerAccessToken,
    "Only the CEO or a manager can manage custom fields.",
  );
}

export const saveCustomFieldDefinitionFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      callerAccessToken: string;
      id?: string;
      key: string;
      label: string;
      fieldType: "text" | "number" | "select" | "checkbox" | "date";
      options?: string[];
      isRequired: boolean;
      displayOrder: number;
    }) => d,
  )
  .handler(async ({ data }) => {
    const caller = await verifyManagerCaller(data.callerAccessToken);
    if (!caller.ok) return { success: false, error: caller.error };

    const payload = {
      key: data.key.trim(),
      label: data.label.trim(),
      field_type: data.fieldType,
      options: data.fieldType === "select" ? (data.options ?? []) : null,
      is_required: data.isRequired,
      display_order: data.displayOrder,
      updated_at: new Date().toISOString(),
    };

    const { error } = data.id
      ? await (caller.serviceClient as any)
          .from("custom_field_definitions")
          .update(payload)
          .eq("id", data.id)
      : await (caller.serviceClient as any).from("custom_field_definitions").insert(payload);

    if (error) return { success: false, error: error.message };

    await logAuditEvent(caller.serviceClient, {
      actorEmail: caller.caller.email,
      actorName: caller.caller.full_name,
      action: data.id ? "custom_field.update" : "custom_field.create",
      entityType: "custom_field_definitions",
      entityId: data.key,
    });

    return { success: true };
  });

export const deactivateCustomFieldDefinitionFn = createServerFn({ method: "POST" })
  .validator((d: { callerAccessToken: string; id: string }) => d)
  .handler(async ({ data }) => {
    const caller = await verifyManagerCaller(data.callerAccessToken);
    if (!caller.ok) return { success: false, error: caller.error };

    const { error } = await (caller.serviceClient as any)
      .from("custom_field_definitions")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", data.id);

    if (error) return { success: false, error: error.message };

    await logAuditEvent(caller.serviceClient, {
      actorEmail: caller.caller.email,
      actorName: caller.caller.full_name,
      action: "custom_field.deactivate",
      entityType: "custom_field_definitions",
      entityId: data.id,
    });

    return { success: true };
  });
