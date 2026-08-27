/**
 * Gatepath Realtors — Integration test for checkAndRecordRateLimit
 *
 * The first integration-style test in this codebase — mocks
 * getServiceClient() (rather than hitting a real or test Supabase
 * project, neither of which exists for this app) so this exercises the
 * REAL function's actual control flow: how it calls the RPC, and
 * critically, how it behaves when that RPC errors. That fail-open-but-
 * logged behavior is the exact real production bug fixed this session
 * (rate limiting was silently inert in production because a select/
 * upsert error was never checked) — this test exists specifically so
 * that regression can never silently return.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkAndRecordRateLimit } from "./rateLimiter";

// vi.mock's factory is hoisted above every import AND above plain `const`
// declarations by Vitest's transform — a bare `const rpcMock = vi.fn()`
// referenced inside the factory below would throw "cannot access before
// initialization". vi.hoisted() is the documented escape hatch: it runs
// (and is itself hoisted) before vi.mock's factory needs it.
const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }));

// rateLimiter.ts's own `import { getServiceClient } from "./supabaseAdmin"`
// resolves to this mock, not the real one (which would throw — no service
// role key is configured in this test environment, deliberately).
vi.mock("./supabaseAdmin", () => ({
  getServiceClient: () => ({ rpc: rpcMock }),
}));

describe("checkAndRecordRateLimit", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    // vi.spyOn on an already-spied method returns the SAME mock instance
    // rather than a fresh one — without an explicit clear here, an
    // earlier test's console.error calls silently carry over into a
    // later test's call-count assertions.
    vi.spyOn(console, "error")
      .mockClear()
      .mockImplementation(() => {});
  });

  it("calls rate_limit_check with the exact key/maxAttempts/windowSeconds", async () => {
    rpcMock.mockResolvedValue({ data: { allowed: true, retry_after_seconds: 0 }, error: null });
    await checkAndRecordRateLimit("otp-request:test@example.com", 3, 900);
    expect(rpcMock).toHaveBeenCalledWith("rate_limit_check", {
      p_key: "otp-request:test@example.com",
      p_max_attempts: 3,
      p_window_seconds: 900,
    });
  });

  it("returns allowed:true when the RPC reports allowed", async () => {
    rpcMock.mockResolvedValue({ data: { allowed: true, retry_after_seconds: 0 }, error: null });
    const result = await checkAndRecordRateLimit("key", 5, 60);
    expect(result).toEqual({ allowed: true });
  });

  it("returns allowed:false with the real retryAfterSeconds when the RPC denies", async () => {
    rpcMock.mockResolvedValue({
      data: { allowed: false, retry_after_seconds: 42 },
      error: null,
    });
    const result = await checkAndRecordRateLimit("key", 5, 60);
    expect(result).toEqual({ allowed: false, retryAfterSeconds: 42 });
  });

  it("handles the RPC returning an array of rows (Postgres table-returning functions do this)", async () => {
    rpcMock.mockResolvedValue({
      data: [{ allowed: false, retry_after_seconds: 15 }],
      error: null,
    });
    const result = await checkAndRecordRateLimit("key", 5, 60);
    expect(result).toEqual({ allowed: false, retryAfterSeconds: 15 });
  });

  it("falls back to a 60s retry when denied but retry_after_seconds is missing", async () => {
    rpcMock.mockResolvedValue({ data: { allowed: false }, error: null });
    const result = await checkAndRecordRateLimit("key", 5, 60);
    expect(result).toEqual({ allowed: false, retryAfterSeconds: 60 });
  });

  it("fails OPEN (allowed:true) when the RPC errors — e.g. the backing migration isn't applied yet", async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: 'function "rate_limit_check" does not exist' },
    });
    const result = await checkAndRecordRateLimit("key", 5, 60);
    expect(result).toEqual({ allowed: true });
  });

  it("logs the error when failing open, so it's visible instead of silent (the exact regression this test guards)", async () => {
    const errorSpy = console.error as ReturnType<typeof vi.fn>;
    rpcMock.mockResolvedValue({ data: null, error: { message: "boom" } });
    await checkAndRecordRateLimit("otp-verify:x@example.com", 10, 900);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0][0]).toContain("otp-verify:x@example.com");
  });
});
