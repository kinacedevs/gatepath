/**
 * Gatepath Realtors — API Key Management (Server Functions)
 *
 * CEO/manager only for the whole resource — an API key is a security
 * credential in its own right, a stricter case than the read-open/write-
 * gated split used for Commission/Goals. The plaintext key is returned
 * exactly once, at generation time, and never stored — only its SHA-256
 * hash is persisted (same hashing approach as the portal OTP in
 * portalActions.ts). src/lib/apiRoutes.ts is the consumer of these keys.
 */
import { createServerFn } from "@tanstack/react-start";
import { getServiceClient, getAnonClient } from "./supabaseAdmin";

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
    return { ok: false as const, error: "Only the CEO or a manager can manage API keys." };
  }

  return { ok: true as const, serviceClient, caller: callerRow };
}

function generateRawKey(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `gpk_${hex}`;
}

async function hashKey(rawKey: string): Promise<string> {
  const data = new TextEncoder().encode(rawKey);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const generateApiKeyFn = createServerFn({ method: "POST" })
  .validator((d: { callerAccessToken: string; name: string; scopes: string[] }) => d)
  .handler(async ({ data }) => {
    const caller = await verifyManagerCaller(data.callerAccessToken);
    if (!caller.ok) return { success: false as const, error: caller.error };

    if (!data.name.trim()) {
      return { success: false as const, error: "Give this key a name." };
    }
    if (data.scopes.length === 0) {
      return { success: false as const, error: "Select at least one scope." };
    }

    const rawKey = generateRawKey();
    const keyHash = await hashKey(rawKey);
    const keyPrefix = rawKey.slice(0, 12);

    const { error } = await caller.serviceClient.from("api_keys").insert({
      name: data.name.trim(),
      key_hash: keyHash,
      key_prefix: keyPrefix,
      scopes: data.scopes,
      created_by_email: caller.caller.email,
      created_by_name: caller.caller.full_name,
    });

    if (error) return { success: false as const, error: error.message };
    return { success: true as const, rawKey };
  });

export const revokeApiKeyFn = createServerFn({ method: "POST" })
  .validator((d: { callerAccessToken: string; keyId: string }) => d)
  .handler(async ({ data }) => {
    const caller = await verifyManagerCaller(data.callerAccessToken);
    if (!caller.ok) return { success: false, error: caller.error };

    const { error } = await caller.serviceClient
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.keyId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  });

/**
 * Presence-only checks (booleans returned, secrets never leave the server)
 * plus one real "last activity" figure where one genuinely exists —
 * Africa's Talking/Resend have no persisted send log anywhere in this
 * codebase, so that's stated honestly rather than faked.
 */
export const getIntegrationStatusFn = createServerFn({ method: "POST" })
  .validator((d: { callerAccessToken: string }) => d)
  .handler(async ({ data }) => {
    const caller = await verifyManagerCaller(data.callerAccessToken);
    if (!caller.ok) return { success: false as const, error: caller.error };

    const paystackConfigured = !!process.env.PAYSTACK_SECRET_KEY;
    const africasTalkingConfigured = !!process.env.AFRICAS_TALKING_API_KEY;
    const resendConfigured = !!process.env.RESEND_API_KEY;

    const { data: lastPayment } = await caller.serviceClient
      .from("payments")
      .select("created_at")
      .eq("status", "success")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { count: activeKeyCount } = await caller.serviceClient
      .from("api_keys")
      .select("id", { count: "exact", head: true })
      .is("revoked_at", null);

    return {
      success: true as const,
      paystackConfigured,
      africasTalkingConfigured,
      resendConfigured,
      lastPaymentAt: lastPayment?.created_at ?? null,
      activeApiKeyCount: activeKeyCount ?? 0,
    };
  });
