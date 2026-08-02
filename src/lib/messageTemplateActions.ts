/**
 * Gatepath Realtors — Message Template Manager (Settings Expansion)
 *
 * getTemplateOrDefault is NOT a server function — it's a small helper called
 * from inside the 7 retrofitted outreach send-functions (each already holds
 * a verified service client). It tries a saved message_templates row by key
 * first, falling back to that function's own existing hardcoded subject/body
 * on any miss (no row yet, or a read error) — so shipping this table changes
 * nothing about current behavior until a CEO/manager actually edits one.
 *
 * saveMessageTemplateFn's gate matches Site Content's precedent
 * (adminRole !== "agent") — these are marketing/relationship-outreach
 * templates, not financial or credential data, so the same bar as
 * testimonials/team profiles/FAQs applies, not the stricter CEO/manager-only
 * gate used for Commission/Goals/API keys.
 */
import { createServerFn } from "@tanstack/react-start";
import { getServiceClient, getAnonClient } from "./supabaseAdmin";
import { logAuditEvent } from "./auditLog";

/** Replaces {{key}} placeholders with the given values; leaves unknown ones as-is. */
export function renderTemplate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => vars[key] ?? match);
}

export async function getTemplateOrDefault(
  serviceClient: any,
  key: string,
  defaults: { subject: string; body: string },
): Promise<{ subject: string; body: string }> {
  try {
    const { data } = await serviceClient
      .from("message_templates")
      .select("subject, body")
      .eq("key", key)
      .maybeSingle();

    if (data?.body) {
      return { subject: data.subject || defaults.subject, body: data.body };
    }
  } catch {
    // Fall through to defaults — a template-lookup failure must never block
    // the real send.
  }
  return defaults;
}

async function verifyWriteCaller(callerAccessToken: string) {
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
  if (callerRow.role === "agent") {
    return { ok: false as const, error: "Agents cannot manage message templates." };
  }

  return { ok: true as const, serviceClient, caller: callerRow };
}

export const saveMessageTemplateFn = createServerFn({ method: "POST" })
  .validator(
    (d: { callerAccessToken: string; key: string; name: string; subject: string; body: string }) =>
      d,
  )
  .handler(async ({ data }) => {
    const caller = await verifyWriteCaller(data.callerAccessToken);
    if (!caller.ok) return { success: false, error: caller.error };

    const { error } = await caller.serviceClient.from("message_templates").upsert(
      {
        key: data.key,
        name: data.name,
        subject: data.subject,
        body: data.body,
        updated_by_email: caller.caller.email,
        updated_by_name: caller.caller.full_name,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );

    if (error) return { success: false, error: error.message };

    await logAuditEvent(caller.serviceClient, {
      actorEmail: caller.caller.email,
      actorName: caller.caller.full_name,
      action: "message_template.save",
      entityType: "message_templates",
      entityId: data.key,
    });

    return { success: true };
  });

export const resetMessageTemplateFn = createServerFn({ method: "POST" })
  .validator((d: { callerAccessToken: string; key: string }) => d)
  .handler(async ({ data }) => {
    const caller = await verifyWriteCaller(data.callerAccessToken);
    if (!caller.ok) return { success: false, error: caller.error };

    const { error } = await caller.serviceClient
      .from("message_templates")
      .delete()
      .eq("key", data.key);

    if (error) return { success: false, error: error.message };

    await logAuditEvent(caller.serviceClient, {
      actorEmail: caller.caller.email,
      actorName: caller.caller.full_name,
      action: "message_template.reset",
      entityType: "message_templates",
      entityId: data.key,
    });

    return { success: true };
  });
