/**
 * Gatepath Realtors — Currency
 * Single source of truth for KES exchange rates. Previously three different
 * hardcoded rates existed (diaspora.tsx, PhaseCard.tsx, properties.$slug.tsx)
 * with no common source — see CRITIQUE.md P1-4.
 */

export const CURRENCY_RATES = {
  KES: 1,
  USD: 129.5,
  GBP: 165.2,
  EUR: 139.8,
  CAD: 94.6,
  AUD: 85.1,
  AED: 35.2,
} as const;

export type Currency = keyof typeof CURRENCY_RATES;

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  KES: "Ksh",
  USD: "$",
  GBP: "£",
  EUR: "€",
  CAD: "CA$",
  AUD: "A$",
  AED: "AED",
};

export const CURRENCIES = Object.keys(CURRENCY_RATES) as Currency[];

/** Converts a KES amount to the target currency (rounded to whole units). */
export function fromKes(kesAmount: number, currency: Currency): number {
  return Math.round(kesAmount / CURRENCY_RATES[currency]);
}

/** Formats a KES amount as a display string in the target currency, e.g. "$ 2,463". */
export function formatFromKes(kesAmount: number, currency: Currency): string {
  return `${CURRENCY_SYMBOLS[currency]} ${fromKes(kesAmount, currency).toLocaleString()}`;
}

/**
 * Rates above are carried over from the pre-existing hardcoded values in
 * diaspora.tsx (main branch) — nobody has recorded when they were last
 * verified against a real FX source. Update by hand periodically; this file
 * is now the ONLY place that needs editing. Paystack always settles in KES —
 * any foreign-currency price shown to a buyer must be paired with the actual
 * KES amount before checkout (see payment.tsx).
 */
