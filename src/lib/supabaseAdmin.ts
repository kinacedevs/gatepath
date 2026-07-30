/**
 * Gatepath Realtors — Supabase Service-Role Client (SERVER ONLY)
 *
 * Never import or call getServiceClient() outside a createServerFn
 * `.handler()` body — that's the part TanStack Start strips from the
 * client bundle. Doing it anywhere else risks shipping the service role
 * key, which bypasses RLS entirely, to every visitor's browser.
 *
 * Used by src/lib/adminActions.ts (staff invitation) and
 * src/lib/paymentActions.ts (verified payment recording).
 */
import { createClient } from "@supabase/supabase-js";

const FALLBACK_URL = "https://hcnbgtnghvyyokspotfe.supabase.co";

function getUrl(): string {
  return (typeof process !== "undefined" ? process.env.VITE_SUPABASE_URL : "") || FALLBACK_URL;
}

export function getServiceClient() {
  const serviceKey = typeof process !== "undefined" ? process.env.SUPABASE_SERVICE_ROLE_KEY : "";

  if (!serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured on the server. See docs/SECURITY_HARDENING.md.",
    );
  }

  // Bypasses RLS entirely. Server-only, by construction.
  return createClient(getUrl(), serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function getAnonClient() {
  const anonKey = typeof process !== "undefined" ? process.env.VITE_SUPABASE_ANON_KEY : "";
  return createClient(getUrl(), anonKey || "");
}
