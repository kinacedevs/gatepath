/**
 * Gatepath Realtors — FX Rate Source Config (Settings Expansion)
 *
 * src/lib/currency.ts is confirmed still a static hand-edited table (its
 * own comment admits nobody tracks when it was last verified) — this ships
 * the real, honest, admin-editable, timestamped source of truth for it.
 * Reuses the existing site_banners generic key-value table (row
 * 'fx_rates') — no new schema. Gate: CEO/manager only, matching the
 * money-adjacent config precedent (Commission/Goals), since this affects
 * prices prospective diaspora buyers see.
 *
 * Deliberately NOT wired into the 4 public multi-currency pages this pass
 * (diaspora.tsx, properties.$slug.tsx, PlotPanel.tsx, PhaseCard.tsx) —
 * those keep reading currency.ts's hardcoded table exactly as today.
 * Wiring them to fetch this live config is a named next step, not done
 * here, given the real (if narrow) blast radius on revenue-critical public
 * pages.
 */
import { createServerFn } from "@tanstack/react-start";
import { getServiceClient, getAnonClient } from "./supabaseAdmin";
import { logAuditEvent } from "./auditLog";
import { CURRENCY_RATES, type Currency } from "./currency";

export const saveFxRatesFn = createServerFn({ method: "POST" })
  .validator((d: { callerAccessToken: string; rates: Record<Currency, number> }) => d)
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
    if (callerRow.role !== "ceo" && callerRow.role !== "manager") {
      return { success: false, error: "Only the CEO or a manager can update FX rates." };
    }

    const rates = { ...CURRENCY_RATES, ...data.rates, KES: 1 };

    const { error } = await (serviceClient as any).from("site_banners").upsert(
      {
        id: "fx_rates",
        data: { rates, updated_by: callerRow.full_name ?? callerRow.email },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    if (error) return { success: false, error: error.message };

    await logAuditEvent(serviceClient, {
      actorEmail: callerRow.email,
      actorName: callerRow.full_name,
      action: "fx_rates.save",
      entityType: "site_banners",
      entityId: "fx_rates",
      details: rates,
    });

    return { success: true };
  });
