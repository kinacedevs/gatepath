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
 */
export async function checkAndRecordRateLimit(
  key: string,
  maxAttempts: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const service = getServiceClient();
  const now = Date.now();

  const { data: existing } = await (service as any)
    .from("rate_limit_attempts")
    .select("attempt_count, window_started_at")
    .eq("rate_key", key)
    .maybeSingle();

  const windowStart = existing ? new Date(existing.window_started_at).getTime() : 0;
  const windowExpired = !existing || now - windowStart > windowSeconds * 1000;

  if (windowExpired) {
    await (service as any)
      .from("rate_limit_attempts")
      .upsert(
        { rate_key: key, attempt_count: 1, window_started_at: new Date(now).toISOString() },
        { onConflict: "rate_key" },
      );
    return { allowed: true };
  }

  if (existing.attempt_count >= maxAttempts) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((windowStart + windowSeconds * 1000 - now) / 1000),
    );
    return { allowed: false, retryAfterSeconds };
  }

  await (service as any)
    .from("rate_limit_attempts")
    .update({ attempt_count: existing.attempt_count + 1 })
    .eq("rate_key", key);

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
