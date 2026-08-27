/**
 * Gatepath Realtors — Shared server-function caller verification
 * (Module 3 audit finding #8, closing finding #4's server-side half)
 *
 * Before this file, 14 separate *Actions.ts files each independently
 * reimplemented their own "verify this caller" helper (apiKeyActions,
 * buyerPreferenceActions, commissionActions, customFieldActions,
 * documentVaultActions, goalActions, inquiryActions, interactionLogActions,
 * inventoryActions, mediaUploadActions, messageTemplateActions,
 * pipelineLabelsActions, taskActions, testimonialActions) — confirmed, by
 * reading every one of them in full before writing this file, to reduce to
 * exactly 3 real authorization levels: any staff, manager-or-CEO (the
 * "not agent" framing used by 2 of the 14 is the same check written a
 * second way — with only 3 roles total, "role === 'agent'" and
 * "role !== 'ceo' && role !== 'manager'" are the identical boundary), and
 * CEO-only. Consolidated here so there is exactly one place this
 * security-critical check lives.
 *
 * Behavior-preserving by construction: every one of the 14 original
 * functions' exact pass/fail semantics is reproduced, with each file's own
 * original rejection message kept via a thin per-file wrapper (see each
 * *Actions.ts file's own 2-3 line replacement) — this is a refactor, not a
 * policy change.
 *
 * New on top of the consolidation: real, server-enforced idle-session
 * timeout (admin_users.last_active_at, migration 0034). Every verified call
 * refreshes it; a caller idle past IDLE_TIMEOUT_MS is rejected here, before
 * any file's own business logic runs.
 *
 * CORRECTED (live production bug, caught by real testing): the original
 * version of this file selected last_active_at in the SAME query as the
 * core id/full_name/email/role lookup, on the assumption that an
 * unapplied migration would make the column read as null. That assumption
 * was wrong — selecting a column that does not exist yet fails the WHOLE
 * query, not just that one field, which meant every single admin write in
 * the entire CRM returned "Not recognised as Gatepath staff" (a real
 * staff member, correctly authenticated) until migration 0034 is applied.
 * Fixed by splitting core recognition (must always work) from idle-timeout
 * enforcement (optional, additive, wrapped so it can never break the core
 * check) into two separate queries.
 */
import { getAnonClient, getServiceClient } from "./supabaseAdmin";

export type CallerRow = {
  id: string;
  full_name: string | null;
  email: string;
  role: "ceo" | "manager" | "agent";
};

export type VerifyResult =
  | { ok: true; serviceClient: ReturnType<typeof getServiceClient>; caller: CallerRow }
  | { ok: false; error: string };

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

async function resolveCaller(callerAccessToken: string): Promise<VerifyResult> {
  const anonClient = getAnonClient();
  const { data: callerData, error: callerErr } = await anonClient.auth.getUser(callerAccessToken);
  if (callerErr || !callerData.user?.email) {
    return { ok: false, error: "Not authenticated." };
  }

  const serviceClient = getServiceClient();

  // Core recognition — must always work regardless of whether migration
  // 0034 has been applied yet. Deliberately does not select last_active_at.
  const { data: callerRow } = await (serviceClient as any)
    .from("admin_users")
    .select("id, full_name, email, role")
    .eq("email", callerData.user.email.toLowerCase())
    .maybeSingle();

  if (!callerRow) {
    return { ok: false, error: "Not recognised as Gatepath staff." };
  }

  // Idle-timeout enforcement is additive and optional — wrapped so that a
  // missing column (migration not yet applied) or any other transient
  // failure here can never block a real, recognised staff member. Awaited
  // deliberately, not fire-and-forget: a Cloudflare Worker can terminate
  // un-awaited background work once the response is sent.
  try {
    const { data: activityRow } = await (serviceClient as any)
      .from("admin_users")
      .select("last_active_at")
      .eq("id", callerRow.id)
      .maybeSingle();

    if (activityRow?.last_active_at) {
      const idleForMs = Date.now() - new Date(activityRow.last_active_at).getTime();
      if (idleForMs > IDLE_TIMEOUT_MS) {
        return { ok: false, error: "Session expired due to inactivity. Please sign in again." };
      }
    }

    await (serviceClient as any)
      .from("admin_users")
      .update({ last_active_at: new Date().toISOString() })
      .eq("id", callerRow.id);
  } catch {
    // Column may not exist yet, or the update failed transiently — never
    // allowed to block a real staff member's request.
  }

  return { ok: true, serviceClient, caller: callerRow as CallerRow };
}

/** Any recognised staff member — ceo, manager, or agent. */
export async function verifyStaffCaller(callerAccessToken: string): Promise<VerifyResult> {
  return resolveCaller(callerAccessToken);
}

/** CEO or manager only; agents rejected. */
export async function verifyManagerCaller(
  callerAccessToken: string,
  message = "Only the CEO or a manager can do this.",
): Promise<VerifyResult> {
  const result = await resolveCaller(callerAccessToken);
  if (!result.ok) return result;
  if (result.caller.role !== "ceo" && result.caller.role !== "manager") {
    return { ok: false, error: message };
  }
  return result;
}

/** CEO only. */
export async function verifyCeoCaller(
  callerAccessToken: string,
  message = "Only the CEO can do this.",
): Promise<VerifyResult> {
  const result = await resolveCaller(callerAccessToken);
  if (!result.ok) return result;
  if (result.caller.role !== "ceo") {
    return { ok: false, error: message };
  }
  return result;
}
