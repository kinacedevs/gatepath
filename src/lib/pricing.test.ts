/**
 * Gatepath Realtors — Tests for pricing.ts
 *
 * This is the single formula both inquire.tsx's Step 1 estimate and
 * paymentActions.ts's server-side lock-in (at the moment of verified
 * payment) call with the same inputs — per its own doc comment, this
 * exists specifically because two disagreeing copies of this calculation
 * used to produce different price/balance/monthly figures. These tests
 * pin the exact behavior so any future edit that changes the formula does
 * so deliberately, not by accident.
 */
import { describe, it, expect } from "vitest";
import { computeInstallmentPricing } from "./pricing";

describe("computeInstallmentPricing", () => {
  it("applies a 5% cash discount when paying in full now (periodMonths = 0)", () => {
    const result = computeInstallmentPricing({
      cashPrice: 1_000_000,
      depositAmount: 1_000_000,
      periodMonths: 0,
    });
    expect(result.adjustedPrice).toBe(950_000);
    expect(result.balance).toBe(0);
    expect(result.monthlyPayment).toBe(0);
  });

  it("applies the same 5% cash discount when the deposit alone already covers the cash price, even with a nonzero periodMonths", () => {
    const result = computeInstallmentPricing({
      cashPrice: 500_000,
      depositAmount: 600_000,
      periodMonths: 12,
    });
    expect(result.adjustedPrice).toBe(475_000);
    expect(result.balance).toBe(0);
  });

  it("applies a Ksh 30,000 surcharge for a 3-month plan", () => {
    const result = computeInstallmentPricing({
      cashPrice: 1_000_000,
      depositAmount: 300_000,
      periodMonths: 3,
    });
    expect(result.adjustedPrice).toBe(1_030_000);
    expect(result.balance).toBe(730_000);
    expect(result.monthlyPayment).toBe(Math.ceil(730_000 / 3));
  });

  it("applies a Ksh 50,000 surcharge for a 6-month plan", () => {
    const result = computeInstallmentPricing({
      cashPrice: 1_000_000,
      depositAmount: 200_000,
      periodMonths: 6,
    });
    expect(result.adjustedPrice).toBe(1_050_000);
    expect(result.balance).toBe(850_000);
    expect(result.monthlyPayment).toBe(Math.ceil(850_000 / 6));
  });

  it("applies a Ksh 100,000 surcharge for a 12-month plan", () => {
    const result = computeInstallmentPricing({
      cashPrice: 1_000_000,
      depositAmount: 100_000,
      periodMonths: 12,
    });
    expect(result.adjustedPrice).toBe(1_100_000);
    expect(result.balance).toBe(1_000_000);
    expect(result.monthlyPayment).toBe(Math.ceil(1_000_000 / 12));
  });

  it("never returns a negative balance when the deposit exceeds the adjusted price", () => {
    const result = computeInstallmentPricing({
      cashPrice: 500_000,
      depositAmount: 10_000_000,
      periodMonths: 3,
    });
    expect(result.balance).toBe(0);
  });

  it("returns a zero monthly payment once the balance is already zero, even on an installment plan", () => {
    const result = computeInstallmentPricing({
      cashPrice: 500_000,
      depositAmount: 530_000,
      periodMonths: 12,
    });
    expect(result.balance).toBe(0);
    expect(result.monthlyPayment).toBe(0);
  });

  it("rounds the monthly payment up (ceil), never leaving a shortfall at the final installment", () => {
    // balance of 100 over 3 months = 33.33... — must round up so 3 * monthly >= balance
    const result = computeInstallmentPricing({
      cashPrice: 1_000_100,
      depositAmount: 1_000_000,
      periodMonths: 3,
    });
    expect(result.monthlyPayment).toBe(Math.ceil(result.balance / 3));
    expect(result.monthlyPayment * 3).toBeGreaterThanOrEqual(result.balance);
  });
});
