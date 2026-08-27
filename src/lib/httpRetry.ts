/**
 * Gatepath Realtors — Shared fetch timeout/retry helper
 *
 * The core problem with retrying a fetch is that "the request failed" and
 * "the request failed AND the provider never processed it" are different
 * facts, and only the second one is safe to retry when the call is not
 * idempotent (an email/SMS send creates a new message every time it's
 * actually processed — a retry that lands on an already-processed send
 * duplicates it). This distinguishes three outcomes differently:
 *
 * - A genuine network-level failure (DNS, connection refused — fetch()
 *   itself rejects before any response exists) means the request never
 *   reached the provider at all. Always safe to retry.
 * - A 5xx response means the provider received the request and its own
 *   processing failed. Reasonable to retry (the provider's own signal is
 *   "this didn't work"), though not a 100% guarantee for a non-idempotent
 *   call — accepted as the standard, industry-normal interpretation of a
 *   5xx.
 * - A timeout (this file's own AbortController firing) is genuinely
 *   ambiguous: the provider may have received and fully processed the
 *   request, with only the response taking longer than our own patience.
 *   Retrying this for a non-idempotent send risks a real duplicate
 *   message — controlled via retryOnTimeout, which callers only enable
 *   for calls they know are idempotent (a plain GET, or a provider API
 *   with its own dedupe/idempotency key).
 * - A 4xx response means the request was malformed or unauthorized —
 *   identical retries fail identically. Never retried.
 */

export type FetchRetryOptions = {
  timeoutMs: number;
  maxAttempts: number;
  /** Only enable for calls known to be idempotent (safe to duplicate) — a
   * plain GET, or a POST the provider itself dedupes by an idempotency
   * key. Defaults to false, the safe default for a send. */
  retryOnTimeout?: boolean;
};

export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  opts: FetchRetryOptions,
): Promise<Response> {
  const { timeoutMs, maxAttempts, retryOnTimeout = false } = opts;
  let lastErr: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetchWithTimeout(url, init, timeoutMs);
      // 2xx/3xx, or a 4xx we won't fix by repeating — return either way
      // and let the caller interpret the response. Only a 5xx triggers a
      // retry loop here.
      if (response.status < 500) return response;
      lastErr = new Error(`HTTP ${response.status}`);
    } catch (err: any) {
      if (err?.name === "AbortError" && !retryOnTimeout) {
        // Ambiguous outcome on a non-idempotent call — never retry this,
        // surface the timeout to the caller as-is.
        throw err;
      }
      lastErr = err;
    }

    if (attempt < maxAttempts) {
      // Exponential backoff with jitter — spreads retries apart so a
      // transient provider blip isn't immediately re-hammered.
      const backoffMs = 300 * 2 ** (attempt - 1) + Math.random() * 200;
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  throw lastErr;
}
