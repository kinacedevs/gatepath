/**
 * Gatepath Realtors — Plot Title Verification Actions (Server Functions)
 *
 * Same pattern as adminActions.ts / leadsActions.ts: service-role client,
 * caller re-verified server-side via callerAccessToken, never trusting a
 * client-asserted role. Backs the "Verification Documents" panel in
 * admin.plots.$plotId.tsx (Phase 5B).
 *
 * There is no public Ardhisasa API (see docs/CRM_CAPABILITIES.md §5) — this
 * logs a manual check a staff member performed themselves, it does not
 * perform any automated lookup. See supabase/migrations/0004_plot_title_verification.sql.
 */
import { createServerFn } from "@tanstack/react-start";
import { getServiceClient, getAnonClient } from "./supabaseAdmin";

export const logPlotTitleVerificationFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      callerAccessToken: string;
      plotId: string;
      outcome: "verified_clean" | "discrepancy_found" | "inconclusive";
      reference?: string;
      notes?: string;
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
      .select("id")
      .eq("email", callerData.user.email.toLowerCase())
      .maybeSingle();

    if (!callerRow) {
      return { success: false, error: "Not recognised as Gatepath staff." };
    }

    const { error: insertErr } = await serviceClient.from("plot_title_verifications").insert({
      plot_id: data.plotId,
      checked_by: callerRow.id,
      outcome: data.outcome,
      reference: data.reference?.trim() || null,
      notes: data.notes?.trim() || null,
    });

    if (insertErr) {
      return { success: false, error: insertErr.message };
    }

    return { success: true };
  });
