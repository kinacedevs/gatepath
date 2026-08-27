/**
 * Gatepath Realtors — Rate Limiting (Module 3 audit finding)
 *
 * No rate limiting existed anywhere in this codebase before this file —
 * confirmed via a repo-wide grep, zero matches on admin login, the portal
 * OTP request endpoint, or /api/v1/*. This is a small, shared fixed-window
 * limiter backed by the rate_limit_attempts table (migration 0033), reused
 * across all three surfaces rather than inventing three mechanisms.
 *
 * Backed by Supabase (the service-role client every other server function
 * in this codebase already uses) rather than a Cloudflare Workers Rate
 * Limiting binding — this app's TanStack server functions have no verified
 * path to raw Workers bindings, only to process.env-style vars and to
 * Supabase, so this reuses the one mechanism already proven to work
 * everywhere else in this codebase.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequestIP } from "@tanstack/react-start/server";
import { z } from "zod";
import { getServiceClient } from "./supabaseAdmin";

/** Best-effort client IP for rate-limit keying. Cloudflare sets
 * X-Forwarded-For for every request passing through its edge, which is
 * what { xForwardedFor: true } reads. Never throws — an unresolvable IP
 * just falls into one shared "unknown" bucket rather than breaking the
 * request the rate limiter is supposed to be protecting. */
function safeClientIp(): string {
  try {
    return getRequestIP({ xForwardedFor: true }) || "unknown";
  } catch {
    return "unknown";
  }
}

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

/**
 * Fixed-window rate limiter: allow up to `maxAttempts` within any
 * `windowSeconds` window per `key`, then deny until the window rolls over.
 * Not exported as a server function itself — called from inside the
 * handlers below and from requestPortalOtpFn/apiRoutes.ts, all of which
 * already run with service-role access.
 *
 * Delegates the actual check-and-increment to the rate_limit_check()
 * Postgres function (migration 0037) instead of doing it as three separate
 * JS round trips (select, then upsert-or-update). The old version was a
 * real check-then-write race: concurrent requests could all read the same
 * pre-increment count and all pass the limit check, defeating every
 * throttle in this codebase (login, OTP request, OTP attempts, /api/v1/*)
 * under plain concurrency. A single INSERT ... ON CONFLICT ... DO UPDATE
 * statement is what Postgres actually serializes via row-level locking —
 * moving the whole read-check-write into one statement is what makes it
 * atomic, not just faster.
 */
export async function checkAndRecordRateLimit(
  key: string,
  maxAttempts: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const service = getServiceClient();

  const { data, error } = await (service as any).rpc("rate_limit_check", {
    p_key: key,
    p_max_attempts: maxAttempts,
    p_window_seconds: windowSeconds,
  });

  // Fails open deliberately (a transient DB hiccup, or this migration not
  // yet applied, should never lock everyone out of login), but never
  // silently — this exact "the backing table/function isn't applied yet"
  // case has already made two other checks in this codebase silently inert
  // this week (client_otps.otp_code, admin_users.last_active_at), both
  // discovered only via production symptoms. Logging here means the next
  // one shows up in wrangler tail instead of as an unexplained incident.
  if (error) {
    console.error(`[RateLimiter] rate_limit_check failed for key "${key}" — failing open:`, error);
    return { allowed: true };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.allowed) {
    return { allowed: false, retryAfterSeconds: row?.retry_after_seconds ?? 60 };
  }
  return { allowed: true };
}

const loginCheckSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

/**
 * Called from admin.tsx BEFORE the browser attempts
 * supabase.auth.signInWithPassword — admin login talks directly to
 * Supabase's own Auth API from the browser, never through this app's
 * server, so this is a pre-flight gate on the login FORM, not a hard
 * block on the real auth call itself. Real, disclosed limitation: a
 * caller that skips the UI and calls Supabase directly bypasses this —
 * pairs with whatever the Supabase project's own Auth rate limiting
 * provides (Dashboard-configured, outside this codebase, unverifiable
 * from here). 5 attempts / 15 minutes, matching the portal OTP's own
 * existing 5-attempt lockout for consistency.
 */
export const checkLoginRateLimitFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => loginCheckSchema.parse(d))
  .handler(async ({ data }) => {
    const ip = safeClientIp();
    const result = await checkAndRecordRateLimit(`login:${data.email}:${ip}`, 5, 15 * 60);
    if (!result.allowed) {
      return {
        allowed: false as const,
        error: `Too many login attempts. Try again in ${Math.ceil(result.retryAfterSeconds / 60)} minute(s).`,
      };
    }
    return { allowed: true as const };
  });
