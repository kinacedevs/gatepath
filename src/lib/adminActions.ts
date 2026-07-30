/**
 * Gatepath Realtors — Privileged Admin Actions (Server Functions)
 *
 * Uses the service-role client from lib/supabaseAdmin.ts — see that file's
 * warning before touching this one. Never call getServiceClient() outside a
 * createServerFn `.handler()` body.
 *
 * admin_users.id is a foreign key to auth.users(id) (see SECURITY_HARDENING.md).
 * Creating an auth.users row requires the Admin API, which requires the
 * service role — the browser can never legitimately do this on its own.
 */
import { createServerFn } from "@tanstack/react-start";
import { getServiceClient, getAnonClient } from "./supabaseAdmin";

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
