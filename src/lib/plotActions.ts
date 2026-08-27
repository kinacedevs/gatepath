/**
 * Gatepath Realtors — Plot Status Actions (Server Functions)
 *
 * Same pattern as leadsActions.ts/bookingActions.ts/plotVerificationActions.ts:
 * service-role client, caller re-verified server-side via callerAccessToken,
 * never trusting a client-asserted role. Replaces admin.plots.tsx's previous
 * direct (supabase as any).from("plots").update(...) call, which violated
 * CLAUDE.md's explicit rule: "Never... mutate plots.status from client-side
 * code. All financial and status writes go through verified server-side
 * paths using the service role."
 *
 * recomputePhaseCounts (Part 3, Phase A / inventory CRUD): no code in this
 * repo previously wrote phases.total_plots/available_count/booked_count/
 * sold_count, implying an existing DB-side trigger (untracked, outside
 * version control) may already keep them in sync. Rather than guess at or
 * silently replace an unknown trigger, this recomputes and writes those
 * columns explicitly and defensively after every plots mutation — correct
 * regardless of what else may or may not already exist in the live DB.
 */
import { createServerFn } from "@tanstack/react-start";
import { getServiceClient, getAnonClient } from "./supabaseAdmin";

export async function recomputePhaseCounts(serviceClient: any, phaseId: string) {
  const { data: rows, error } = await serviceClient
    .from("plots")
    .select("status")
    .eq("phase_id", phaseId)
    .eq("is_archived", false);

  // A select failure here (e.g. is_archived missing if migration 0022
  // isn't applied in some environment) must never fall through to writing
  // zeros — that would silently show "0 available" on the live public
  // storefront for a phase that's actually fully stocked. Bail out loudly
  // instead, leaving the phase's existing counts untouched.
  if (error) {
    console.error(`[Plots] recomputePhaseCounts select failed for phase ${phaseId}:`, error);
    return;
  }

  const plots = (rows as { status: "available" | "booked" | "sold" }[]) ?? [];
  const available = plots.filter((p) => p.status === "available").length;
  const booked = plots.filter((p) => p.status === "booked").length;
  const sold = plots.filter((p) => p.status === "sold").length;

  await (serviceClient as any)
    .from("phases")
    .update({
      total_plots: plots.length,
      available_count: available,
      booked_count: booked,
      sold_count: sold,
    })
    .eq("id", phaseId);
}

export const updatePlotStatusFn = createServerFn({ method: "POST" })
  .validator(
    (d: { callerAccessToken: string; plotId: string; status: "available" | "booked" | "sold" }) =>
      d,
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
      .select("id, role")
      .eq("email", callerData.user.email.toLowerCase())
      .maybeSingle();

    if (!callerRow) {
      return { success: false, error: "Not recognised as Gatepath staff." };
    }
    if (callerRow.role === "agent") {
      return { success: false, error: "Agents cannot manually modify plot statuses." };
    }

    const { data: plotRow, error: updateErr } = await serviceClient
      .from("plots")
      .update({ status: data.status })
      .eq("id", data.plotId)
      .select("phase_id")
      .single();

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    if (plotRow?.phase_id) {
      await recomputePhaseCounts(serviceClient, plotRow.phase_id);
    }

    return { success: true };
  });
