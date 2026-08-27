/**
 * Gatepath Realtors — Integration test for getReceiptData's time-bound
 * PII-expiry logic
 *
 * This is the fix for a real security-audit finding: getReceiptFn had no
 * ownership check at all, and its inquiryId reaches it as a bare
 * ?inquiryId= query param on the public /thank-you URL — a bearer
 * credential with no expiry, sitting in browser history, a shared
 * screenshot, or a referrer header, granting permanent access to
 * client_id_passport/client_kra_pin/kin_kra_pin. This test exists so a
 * future edit can never silently remove the 7-day cutoff and reopen that
 * exposure without a test failing.
 *
 * Mocks getServiceClient() with a small fake query builder scoped to
 * exactly the call shape getReceiptData makes (one .maybeSingle() lookup
 * per table, keyed by table name) — not a general-purpose Supabase mock.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getReceiptData } from "./paymentActions";

const { tableResponses, fromMock } = vi.hoisted(() => {
  const tableResponses: Record<string, { data: any }> = {};
  const fromMock = vi.fn((table: string) => {
    const builder: any = {
      select: () => builder,
      eq: () => builder,
      order: () => builder,
      limit: () => builder,
      maybeSingle: async () => tableResponses[table] ?? { data: null },
    };
    return builder;
  });
  return { tableResponses, fromMock };
});

vi.mock("./supabaseAdmin", () => ({
  getServiceClient: () => ({ from: fromMock }),
}));

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

describe("getReceiptData", () => {
  beforeEach(() => {
    fromMock.mockClear();
    for (const key of Object.keys(tableResponses)) delete tableResponses[key];
  });

  it("returns found:false when no inquiry matches the id", async () => {
    tableResponses.inquiries = { data: null };
    const result = await getReceiptData("nonexistent-id");
    expect(result).toEqual({ found: false });
  });

  it("returns found:false + expired:true for an inquiry older than 7 days — the real security fix", async () => {
    tableResponses.inquiries = {
      data: { id: "inq-1", created_at: daysAgo(8), client_email: "old@example.com" },
    };
    const result = await getReceiptData("inq-1");
    expect(result).toEqual({ found: false, expired: true });
  });

  it("does NOT fetch payments/bookings/agreements once expired — stops immediately, no extra data leaked", async () => {
    tableResponses.inquiries = { data: { id: "inq-1", created_at: daysAgo(30) } };
    await getReceiptData("inq-1");
    expect(fromMock).toHaveBeenCalledTimes(1);
    expect(fromMock).toHaveBeenCalledWith("inquiries");
  });

  it("returns the full receipt for an inquiry within the 7-day window", async () => {
    tableResponses.inquiries = { data: { id: "inq-1", created_at: daysAgo(2) } };
    tableResponses.payments = { data: { id: "pay-1", amount: 55000, status: "success" } };
    tableResponses.bookings = { data: { id: "book-1", status: "confirmed" } };
    tableResponses.agreements = { data: { id: "agr-1", ceo_signed: true } };

    const result = await getReceiptData("inq-1");
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.inquiry.id).toBe("inq-1");
      expect(result.payment?.id).toBe("pay-1");
      expect(result.booking?.id).toBe("book-1");
      expect(result.agreement?.id).toBe("agr-1");
    }
  });

  it("skips the agreement lookup when there's no payment yet (nothing to match payment_id against)", async () => {
    tableResponses.inquiries = { data: { id: "inq-1", created_at: daysAgo(1) } };
    tableResponses.payments = { data: null };

    const result = await getReceiptData("inq-1");
    expect(result.found).toBe(true);
    if (result.found) {
      expect(result.payment).toBeNull();
      expect(result.agreement).toBeNull();
    }
    expect(fromMock).not.toHaveBeenCalledWith("agreements");
  });

  it("an inquiry created just under 7 days ago is still accessible (boundary check)", async () => {
    const almostSevenDays = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000 - 60_000)).toISOString();
    tableResponses.inquiries = { data: { id: "inq-1", created_at: almostSevenDays } };
    tableResponses.payments = { data: null };

    const result = await getReceiptData("inq-1");
    expect(result.found).toBe(true);
  });
});
