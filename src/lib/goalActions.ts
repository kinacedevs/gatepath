/**
 * Gatepath Realtors — Goal Actions (Server Functions)
 *
 * Same pattern as commissionActions.ts: service-role client, caller
 * re-verified server-side, CEO/manager only — target-setting is a
 * managerial action, not routine day-to-day work. Viewing goal progress
 * itself is open to any staff role (handled client-side in
 * admin.goals.tsx; the real write-path enforcement is here).
 */
import { createServerFn } from "@tanstack/react-start";
// Module 3 audit finding #8: this file's own verify-caller implementation
// is consolidated into src/lib/serverAuth.ts.
import { verifyManagerCaller } from "./serverAuth";

export const createGoalFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      callerAccessToken: string;
      agentId?: string;
      phaseId?: string;
      metric: "revenue_kes" | "deals_closed" | "plots_sold";
      periodType: "month" | "quarter";
      periodStart: string;
      targetValue: number;
    }) => d,
  )
  .handler(async ({ data }) => {
    const caller = await verifyManagerCaller(data.callerAccessToken);
    if (!caller.ok) return { success: false, error: caller.error };

    if (!data.agentId && !data.phaseId) {
      return { success: false, error: "A goal must target either an agent or a phase." };
    }

    const { error } = await caller.serviceClient.from("goals").insert({
      agent_id: data.agentId || null,
      phase_id: data.phaseId || null,
      metric: data.metric,
      period_type: data.periodType,
      period_start: data.periodStart,
      target_value: data.targetValue,
      created_by_email: caller.caller.email,
      created_by_name: caller.caller.full_name,
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
  });

export const updateGoalFn = createServerFn({ method: "POST" })
  .validator((d: { callerAccessToken: string; goalId: string; targetValue: number }) => d)
  .handler(async ({ data }) => {
    const caller = await verifyManagerCaller(data.callerAccessToken);
    if (!caller.ok) return { success: false, error: caller.error };

    const { error } = await caller.serviceClient
      .from("goals")
      .update({ target_value: data.targetValue, updated_at: new Date().toISOString() })
      .eq("id", data.goalId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  });

export const deleteGoalFn = createServerFn({ method: "POST" })
  .validator((d: { callerAccessToken: string; goalId: string }) => d)
  .handler(async ({ data }) => {
    const caller = await verifyManagerCaller(data.callerAccessToken);
    if (!caller.ok) return { success: false, error: caller.error };

    const { error } = await caller.serviceClient.from("goals").delete().eq("id", data.goalId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  });
