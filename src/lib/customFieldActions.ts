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
import { getServiceClient, getAnonClient } from "./supabaseAdmin";
import { logAuditEvent } from "./auditLog";

async function verifyManagerCaller(callerAccessToken: string) {
  const anonClient = getAnonClient();
  const { data: callerData, error: callerErr } = await anonClient.auth.getUser(callerAccessToken);
  if (callerErr || !callerData.user?.email) {
    return { ok: false as const, error: "Not authenticated." };
  }

  const serviceClient = getServiceClient();
  const { data: callerRow } = await serviceClient
    .from("admin_users")
    .select("id, full_name, email, role")
    .eq("email", callerData.user.email.toLowerCase())
    .maybeSingle();

  if (!callerRow) {
    return { ok: false as const, error: "Not recognised as Gatepath staff." };
  }
  if (callerRow.role !== "ceo" && callerRow.role !== "manager") {
    return { ok: false as const, error: "Only the CEO or a manager can manage custom fields." };
  }

  return { ok: true as const, serviceClient, caller: callerRow };
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
