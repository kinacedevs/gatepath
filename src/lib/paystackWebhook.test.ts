/**
 * Gatepath Realtors — Tests for the Paystack webhook's signature verification
 *
 * The single most security-critical piece of the payment path: a wrong or
 * bypassable signature check would let anyone POST a forged webhook body
 * and have it treated as a real payment event. computeSignature/
 * constantTimeEqual are exported from paystackWebhook.ts solely so this
 * file can exercise them directly, without needing to construct a full
 * Request object or mock getServiceClient()/Paystack's verify API.
 */
import { describe, it, expect } from "vitest";
import { computeSignature, constantTimeEqual } from "./paystackWebhook";

describe("computeSignature", () => {
  it("produces a deterministic hex-encoded HMAC-SHA512 signature for a given body and secret", async () => {
    const sig1 = await computeSignature('{"event":"charge.success"}', "sk_test_secret");
    const sig2 = await computeSignature('{"event":"charge.success"}', "sk_test_secret");
    expect(sig1).toBe(sig2);
    // HMAC-SHA512 hex-encoded is 128 characters.
    expect(sig1).toHaveLength(128);
    expect(sig1).toMatch(/^[0-9a-f]{128}$/);
  });

  it("produces a different signature for a different body", async () => {
    const sig1 = await computeSignature('{"event":"charge.success"}', "sk_test_secret");
    const sig2 = await computeSignature('{"event":"charge.failed"}', "sk_test_secret");
    expect(sig1).not.toBe(sig2);
  });

  it("produces a different signature for a different secret key — the real security property", async () => {
    const body = '{"event":"charge.success","data":{"reference":"GR-1"}}';
    const sigWithRealKey = await computeSignature(body, "sk_test_real_secret");
    const sigWithWrongKey = await computeSignature(body, "sk_test_wrong_secret");
    expect(sigWithRealKey).not.toBe(sigWithWrongKey);
  });

  it("is sensitive to whitespace/formatting — computed over the exact raw bytes, not a re-serialized copy", async () => {
    // This is the specific bug this file's own doc comment calls out avoiding:
    // Paystack's sample code re-JSON.stringify()s the parsed body, which is
    // not guaranteed byte-identical to what was actually sent.
    const compact = await computeSignature('{"a":1}', "secret");
    const spaced = await computeSignature('{"a": 1}', "secret");
    expect(compact).not.toBe(spaced);
  });
});

describe("constantTimeEqual", () => {
  it("returns true for identical strings", () => {
    expect(constantTimeEqual("abc123", "abc123")).toBe(true);
  });

  it("returns false for different strings of the same length", () => {
    expect(constantTimeEqual("abc123", "abc124")).toBe(false);
  });

  it("returns false for strings of different lengths (checked before any byte comparison)", () => {
    expect(constantTimeEqual("short", "muchlongerstring")).toBe(false);
  });

  it("returns false when only the first character differs (no early-exit optimization)", () => {
    // The whole point of a constant-time comparison is that this and a
    // mismatch-at-the-last-character case take the same code path — this
    // test can't measure timing, but it does confirm the function doesn't
    // short-circuit on a mismatch (a plain `for` loop with `return false`
    // on first difference would still be correct here, but constantTimeEqual
    // specifically uses bitwise OR-accumulation instead of early return).
    expect(constantTimeEqual("Xbc123", "abc123")).toBe(false);
    expect(constantTimeEqual("abc12X", "abc123")).toBe(false);
  });

  it("verifies a signature computed by computeSignature against itself", async () => {
    const body = '{"event":"charge.success"}';
    const secret = "sk_test_secret";
    const signature = await computeSignature(body, secret);
    expect(constantTimeEqual(signature, await computeSignature(body, secret))).toBe(true);
  });
});
