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
 */
import { createServerFn } from "@tanstack/react-start";
import { getServiceClient, getAnonClient } from "./supabaseAdmin";

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

    const { error: updateErr } = await serviceClient
      .from("plots")
      .update({ status: data.status })
      .eq("id", data.plotId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    return { success: true };
  });
