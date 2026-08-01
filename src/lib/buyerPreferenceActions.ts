/**
 * Gatepath Realtors — Buyer Preference Actions (Server Functions)
 *
 * Same pattern as taskActions.ts/interactionLogActions.ts: service-role
 * client, caller re-verified server-side via callerAccessToken, never
 * trusting a client-asserted role. Any recognised staff member can act —
 * this is routine sales work, not CEO-gated.
 *
 * sendMatchAlertFn reuses the same findMatchingPlots engine the admin
 * screen uses (src/lib/propertyMatching.ts, pure and I/O-free, safe to
 * import server-side too) so the alert always reflects the exact same
 * matches staff see on screen — no separate, potentially-drifting formula.
 * Manual trigger only, same honest scoping as sendTaskReminderFn — true
 * automatic alerting needs the future Automation/n8n module.
 */
import { createServerFn } from "@tanstack/react-start";
import { getServiceClient, getAnonClient } from "./supabaseAdmin";
import { sendResendEmail } from "./notifications";
import { findMatchingPlots } from "./propertyMatching";
import type { Phase, Plot } from "./types";

async function verifyStaffCaller(callerAccessToken: string) {
  const anonClient = getAnonClient();
  const { data: callerData, error: callerErr } = await anonClient.auth.getUser(callerAccessToken);
  if (callerErr || !callerData.user?.email) {
    return { ok: false as const, error: "Not authenticated." };
  }

  const serviceClient = getServiceClient();
  const { data: callerRow } = await serviceClient
    .from("admin_users")
    .select("id, full_name, email")
    .eq("email", callerData.user.email.toLowerCase())
    .maybeSingle();

  if (!callerRow) {
    return { ok: false as const, error: "Not recognised as Gatepath staff." };
  }

  return { ok: true as const, serviceClient, caller: callerRow };
}

export const createBuyerPreferenceFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      callerAccessToken: string;
      clientName: string;
      clientEmail?: string;
      clientPhone?: string;
      preferredPhaseId?: string;
      preferredLocation?: string;
      minBudgetKes?: number;
      maxBudgetKes?: number;
      statedCurrency?: string;
      notes?: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    const caller = await verifyStaffCaller(data.callerAccessToken);
    if (!caller.ok) return { success: false, error: caller.error };

    const { error } = await caller.serviceClient.from("buyer_preferences").insert({
      client_name: data.clientName,
      client_email: data.clientEmail || null,
      client_phone: data.clientPhone || null,
      preferred_phase_id: data.preferredPhaseId || null,
      preferred_location: data.preferredLocation || null,
      min_budget_kes: data.minBudgetKes ?? null,
      max_budget_kes: data.maxBudgetKes ?? null,
      stated_currency: data.statedCurrency ?? "KES",
      notes: data.notes || null,
      created_by_email: caller.caller.email,
      created_by_name: caller.caller.full_name,
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
  });

export const updateBuyerPreferenceFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      callerAccessToken: string;
      preferenceId: string;
      isActive?: boolean;
      minBudgetKes?: number | null;
      maxBudgetKes?: number | null;
      notes?: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    const caller = await verifyStaffCaller(data.callerAccessToken);
    if (!caller.ok) return { success: false, error: caller.error };

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.isActive !== undefined) patch.is_active = data.isActive;
    if (data.minBudgetKes !== undefined) patch.min_budget_kes = data.minBudgetKes;
    if (data.maxBudgetKes !== undefined) patch.max_budget_kes = data.maxBudgetKes;
    if (data.notes !== undefined) patch.notes = data.notes;

    const { error } = await caller.serviceClient
      .from("buyer_preferences")
      .update(patch)
      .eq("id", data.preferenceId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  });

export const sendMatchAlertFn = createServerFn({ method: "POST" })
  .validator((d: { callerAccessToken: string; preferenceId: string }) => d)
  .handler(async ({ data }) => {
    const caller = await verifyStaffCaller(data.callerAccessToken);
    if (!caller.ok) return { success: false, error: caller.error };

    const { data: preference } = await caller.serviceClient
      .from("buyer_preferences")
      .select("*")
      .eq("id", data.preferenceId)
      .maybeSingle();

    if (!preference) return { success: false, error: "Buyer preference not found." };
    if (!preference.client_email) {
      return { success: false, error: "This buyer has no email address on file." };
    }

    const [phasesRes, plotsRes] = await Promise.all([
      caller.serviceClient.from("phases").select("*"),
      caller.serviceClient.from("plots").select("*, plot_sizes(*)").eq("status", "available"),
    ]);

    const matches = findMatchingPlots(
      preference,
      (phasesRes.data as Phase[]) ?? [],
      (plotsRes.data as Plot[]) ?? [],
    );

    if (matches.length === 0) {
      return { success: false, error: "No current matches to send." };
    }

    const rows = matches
      .map(
        (m) =>
          `<tr><td style="padding:10px 0;border-bottom:1px solid #E5E0D8;font-family:Arial,sans-serif;font-size:14px;color:#333333;">
            <strong>${m.phase.name}</strong> — Plot #${m.plot.plot_number} — Ksh ${m.cashPriceKes.toLocaleString()}
          </td></tr>`,
      )
      .join("");

    const subject = `New Plot Matches for You — Gatepath Realtors`;
    const emailHtml = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8" /><title>Plot Matches</title></head>
<body style="margin: 0; padding: 0; background-color: #F8F4EE; font-family: Arial, sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr><td style="padding: 40px 0 30px 0;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse; border: 1px solid #E5E0D8; background-color: #FFFFFF; border-radius: 12px; overflow: hidden;">
        <tr><td align="center" bgcolor="#074B7D" style="padding: 40px 0 30px 0; color: #FFFFFF; font-size: 24px; font-weight: bold;">GATEPATH REALTORS</td></tr>
        <tr><td style="padding: 40px 30px 40px 30px;">
          <p style="font-family: Arial, sans-serif; font-size: 16px; line-height: 24px; color: #333333;">Hello <strong>${preference.client_name}</strong>,</p>
          <p style="font-family: Arial, sans-serif; font-size: 14px; line-height: 22px; color: #666666; margin-bottom: 20px;">
            Based on your preferences, we found ${matches.length} available plot${matches.length === 1 ? "" : "s"} that may interest you:
          </p>
          <table border="0" cellpadding="12" cellspacing="0" width="100%" style="background-color: #F8F4EE; border: 1px solid #E5E0D8; border-radius: 8px;">
            ${rows}
          </table>
        </td></tr>
        <tr><td bgcolor="#074B7D" style="padding: 30px; text-align: center; color: #FFFFFF; font-family: Arial, sans-serif; font-size: 12px;">
          1st Floor, CNM Centre, Ruiru Eastern Bypass, Nairobi, Kenya<br/>+254 799 488 488 | info@gatepathrealtors.com
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

    const emailResult = await sendResendEmail(preference.client_email, subject, emailHtml);
    return { success: true, emailResult, matchCount: matches.length };
  });
