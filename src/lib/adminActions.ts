/**
 * Gatepath Realtors — Privileged Admin Actions (Server Functions)
 *
 * The ONLY place in this codebase allowed to hold the Supabase service-role
 * key. Never import GATEPATH_SERVICE_ROLE_KEY, and never construct a client
 * with it, outside a createServerFn `.handler()` body — the handler body is
 * the part TanStack Start strips from the client bundle. Doing it anywhere
 * else risks shipping the service role key to every visitor's browser.
 *
 * admin_users.id is a foreign key to auth.users(id) (see SECURITY_HARDENING.md).
 * Creating an auth.users row requires the Admin API, which requires the
 * service role — the browser can never legitimately do this on its own.
 */
import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  const url =
    (typeof process !== "undefined" ? process.env.VITE_SUPABASE_URL : "") ||
    "https://hcnbgtnghvyyokspotfe.supabase.co";
  const serviceKey = typeof process !== "undefined" ? process.env.SUPABASE_SERVICE_ROLE_KEY : "";

  if (!serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured on the server. See docs/SECURITY_HARDENING.md.",
    );
  }

  // service-role client: bypasses RLS entirely. Server-only, by construction —
  // this function only ever runs inside a server function handler.
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function getAnonClient() {
  const url =
    (typeof process !== "undefined" ? process.env.VITE_SUPABASE_URL : "") ||
    "https://hcnbgtnghvyyokspotfe.supabase.co";
  const anonKey = typeof process !== "undefined" ? process.env.VITE_SUPABASE_ANON_KEY : "";
  return createClient(url, anonKey || "");
}

/**
 * Invites a new staff member: creates their Supabase Auth login (they get an
 * invite email to set a password) and seeds the matching admin_users row
 * with the real auth user id, satisfying the foreign key.
 *
 * callerAccessToken authenticates and authorizes the request server-side —
 * never trust a client-asserted role. Only a verified CEO may call this.
 */
export const inviteStaffFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      callerAccessToken: string;
      email: string;
      fullName: string;
      role: "ceo" | "manager" | "agent";
    }) => d,
  )
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    if (!email || !data.fullName.trim()) {
      return { success: false, error: "Email and full name are required." };
    }

    // 1. Verify the caller's session token is real and get their email —
    // never trust anything the client claims about its own identity.
    const anonClient = getAnonClient();
    const { data: callerData, error: callerErr } = await anonClient.auth.getUser(
      data.callerAccessToken,
    );
    if (callerErr || !callerData.user?.email) {
      return { success: false, error: "Not authenticated." };
    }

    const serviceClient = getServiceClient();

    // 2. Confirm the caller is actually a recognised CEO — via the service
    // client, so this check itself doesn't depend on (and can't be spoofed
    // through) client-side RLS assumptions.
    const { data: callerRow } = await serviceClient
      .from("admin_users")
      .select("role")
      .eq("email", callerData.user.email.toLowerCase())
      .maybeSingle();

    if (callerRow?.role !== "ceo") {
      return { success: false, error: "Only the CEO can add staff." };
    }

    // 3. Create the Auth login. inviteUserByEmail sends Supabase's own
    // invite email with a link to set a password.
    const { data: inviteData, error: inviteErr } =
      await serviceClient.auth.admin.inviteUserByEmail(email);

    if (inviteErr || !inviteData?.user) {
      return {
        success: false,
        error: inviteErr?.message ?? "Failed to create the staff login.",
      };
    }

    // 4. Seed admin_users with the REAL id from the auth user just created.
    const { error: insertErr } = await serviceClient.from("admin_users").insert({
      id: inviteData.user.id,
      email,
      full_name: data.fullName.trim(),
      role: data.role,
    });

    if (insertErr) {
      return { success: false, error: insertErr.message };
    }

    return { success: true };
  });
