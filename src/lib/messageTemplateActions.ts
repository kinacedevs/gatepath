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
import { verifyManagerCaller as verifyNotAgentCallerShared } from "./serverAuth";
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

// Module 3 audit finding #8: this file's own verify-caller implementation
// ("not agent" — reject role === 'agent') is consolidated into
// src/lib/serverAuth.ts's verifyManagerCaller, which is the exact same
// check the other way around (with only 3 roles, "role !== 'ceo' &&
// role !== 'manager'" and "role === 'agent'" are the identical boundary).
function verifyWriteCaller(callerAccessToken: string) {
  return verifyNotAgentCallerShared(callerAccessToken, "Agents cannot manage message templates.");
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
