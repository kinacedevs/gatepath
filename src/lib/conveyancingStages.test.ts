/**
 * Gatepath Realtors — Tests for the 13-stage conveyancing resolver
 *
 * This is what a real client sees as their deal's progress on the portal —
 * a wrong stage here directly misleads a paying customer about where their
 * purchase actually stands. Pins the exact rule set the doc comment
 * describes (each stage's real backing signal), including the specific
 * correction noted inline: stage 10 ("Full Payment Cleared") must be
 * reached the moment an Agreement row exists, independent of whether the
 * CEO has actually countersigned it yet.
 */
import { describe, it, expect } from "vitest";
import { resolveDealStage } from "./conveyancingStages";

const baseInquiry = { cro_name: null, terms_of_payment: null, status: "pending" };
const noInputs = { payments: [], bookings: [], offers: [], agreements: [], interactions: [] };

describe("resolveDealStage", () => {
  it("a brand-new inquiry with no activity is at stage 1 only", () => {
    const { currentStage, reachedStages } = resolveDealStage(baseInquiry, noInputs);
    expect(currentStage).toBe(1);
    expect(reachedStages).toEqual(new Set([1]));
  });

  it("assigning a relationship officer reaches stage 2", () => {
    const { reachedStages } = resolveDealStage({ ...baseInquiry, cro_name: "Jane Doe" }, noInputs);
    expect(reachedStages.has(2)).toBe(true);
  });

  it("a logged interaction reaches stage 3 even if status is still pending", () => {
    const { reachedStages } = resolveDealStage(baseInquiry, {
      ...noInputs,
      interactions: [{}],
    });
    expect(reachedStages.has(3)).toBe(true);
  });

  it("status='reviewed' reaches stage 3 as a fallback for inquiries predating the interaction log", () => {
    const { reachedStages } = resolveDealStage({ ...baseInquiry, status: "reviewed" }, noInputs);
    expect(reachedStages.has(3)).toBe(true);
  });

  it("a booking reaches stage 4; a completed booking additionally reaches stage 5", () => {
    const scheduled = resolveDealStage(baseInquiry, {
      ...noInputs,
      bookings: [{ status: "confirmed" }],
    });
    expect(scheduled.reachedStages.has(4)).toBe(true);
    expect(scheduled.reachedStages.has(5)).toBe(false);

    const completed = resolveDealStage(baseInquiry, {
      ...noInputs,
      bookings: [{ status: "completed" }],
    });
    expect(completed.reachedStages.has(5)).toBe(true);
  });

  it("an unsigned offer reaches stage 6 but not 7; a signed offer reaches both", () => {
    const unsigned = resolveDealStage(baseInquiry, {
      ...noInputs,
      offers: [{ ceo_signed: false }],
    });
    expect(unsigned.reachedStages.has(6)).toBe(true);
    expect(unsigned.reachedStages.has(7)).toBe(false);

    const signed = resolveDealStage(baseInquiry, {
      ...noInputs,
      offers: [{ ceo_signed: true }],
    });
    expect(signed.reachedStages.has(6)).toBe(true);
    expect(signed.reachedStages.has(7)).toBe(true);
  });

  it("stage 8 needs both an offer and a recorded payment plan", () => {
    const noOffer = resolveDealStage({ ...baseInquiry, terms_of_payment: "installment" }, noInputs);
    expect(noOffer.reachedStages.has(8)).toBe(false);

    const withOffer = resolveDealStage(
      { ...baseInquiry, terms_of_payment: "installment" },
      { ...noInputs, offers: [{ ceo_signed: false }] },
    );
    expect(withOffer.reachedStages.has(8)).toBe(true);
  });

  it("stage 9 needs an installment plan AND at least 2 successful payments — a single deposit is not 'in progress'", () => {
    const oneSuccessful = resolveDealStage(
      { ...baseInquiry, terms_of_payment: "installment" },
      { ...noInputs, payments: [{ status: "success" }] },
    );
    expect(oneSuccessful.reachedStages.has(9)).toBe(false);

    const twoSuccessful = resolveDealStage(
      { ...baseInquiry, terms_of_payment: "installment" },
      { ...noInputs, payments: [{ status: "success" }, { status: "success" }] },
    );
    expect(twoSuccessful.reachedStages.has(9)).toBe(true);
  });

  it("a cash buyer with 2+ payments (e.g. a corrected duplicate) does NOT reach stage 9 — that stage means installment progress specifically", () => {
    const { reachedStages } = resolveDealStage(
      { ...baseInquiry, terms_of_payment: "cash" },
      { ...noInputs, payments: [{ status: "success" }, { status: "success" }] },
    );
    expect(reachedStages.has(9)).toBe(false);
  });

  it("stage 10 is reached the instant an agreement row exists, regardless of ceo_signed — payment-gated creation, not signature-gated", () => {
    const { reachedStages, agreementSigned } = resolveDealStage(baseInquiry, {
      ...noInputs,
      agreements: [{ ceo_signed: false }],
    });
    expect(reachedStages.has(10)).toBe(true);
    expect(agreementSigned).toBe(false);
  });

  it("agreementSigned is true only once ceo_signed is actually true on some agreement row", () => {
    const { agreementSigned } = resolveDealStage(baseInquiry, {
      ...noInputs,
      agreements: [{ ceo_signed: true }],
    });
    expect(agreementSigned).toBe(true);
  });

  it("stages 11-13 are never auto-marked reached, no matter how complete the other inputs are", () => {
    const { reachedStages } = resolveDealStage(
      { cro_name: "Jane", terms_of_payment: "installment", status: "approved" },
      {
        payments: [{ status: "success" }, { status: "success" }, { status: "success" }],
        bookings: [{ status: "completed" }],
        offers: [{ ceo_signed: true }],
        agreements: [{ ceo_signed: true }],
        interactions: [{}],
      },
    );
    expect(reachedStages.has(11)).toBe(false);
    expect(reachedStages.has(12)).toBe(false);
    expect(reachedStages.has(13)).toBe(false);
  });

  it("currentStage is always the highest reached stage number", () => {
    const { currentStage, reachedStages } = resolveDealStage(
      { cro_name: "Jane", terms_of_payment: "installment", status: "approved" },
      {
        payments: [{ status: "success" }, { status: "success" }],
        bookings: [{ status: "completed" }],
        offers: [{ ceo_signed: true }],
        agreements: [],
        interactions: [],
      },
    );
    expect(currentStage).toBe(Math.max(...Array.from(reachedStages)));
  });
});
