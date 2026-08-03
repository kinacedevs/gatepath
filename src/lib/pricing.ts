/**
 * Gatepath Realtors — Installment Pricing (single source of truth)
 *
 * Extracted from payment.tsx's checkout calculator, which is the formula
 * actually charged via Paystack — per an explicit business-policy decision,
 * this is now the one authoritative formula, replacing a second, disagreeing
 * calculation that inquire.tsx used to run independently at Step 1 (which
 * meant the price/balance/monthly figures saved to `inquiries` — and later
 * rendered on the Offer Letter/Agreement/Receipt — could differ from what
 * the buyer actually agreed to and paid at checkout).
 *
 * Pure function, no I/O — both inquire.tsx (Step 1 preview) and
 * paymentActions.ts (server-side, at the moment of verified payment) call
 * this with the same inputs and get the same answer.
 */
export interface InstallmentPricingInput {
  /** The plot's real, unadjusted cash price. */
  cashPrice: number;
  /** The amount being put down now. */
  depositAmount: number;
  /** 0 = cash / paid in full now. */
  periodMonths: number;
}

export interface InstallmentPricingResult {
  /** cashPrice + any installment surcharge - any cash/full-payment discount. */
  adjustedPrice: number;
  balance: number;
  monthlyPayment: number;
}

export function computeInstallmentPricing({
  cashPrice,
  depositAmount,
  periodMonths,
}: InstallmentPricingInput): InstallmentPricingResult {
  let surcharge = 0;
  let discount = 0;

  if (periodMonths === 0 || depositAmount >= cashPrice) {
    discount = cashPrice * 0.05;
  } else if (periodMonths === 3) {
    surcharge = 30000;
  } else if (periodMonths === 6) {
    surcharge = 50000;
  } else if (periodMonths === 12) {
    surcharge = 100000;
  }

  const adjustedPrice = cashPrice + surcharge - discount;
  const balance = Math.max(0, adjustedPrice - depositAmount);
  const monthlyPayment = periodMonths > 0 && balance > 0 ? Math.ceil(balance / periodMonths) : 0;

  return { adjustedPrice, balance, monthlyPayment };
}
