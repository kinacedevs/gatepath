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

// ─── Live rate override (Phase 26) ────────────────────────────────────────
// CURRENCY_RATES above stays the hardcoded seed/fallback. diaspora.tsx and
// properties.$slug.tsx (the only 2 route-level files with their own
// currency-selection state — PhaseCard/PlotPanel are pure consumers of
// fromKes/formatFromKes and need no changes) each fetch the real,
// admin-editable rate config (site_banners row 'fx_rates', set via
// admin.settings.tsx's FX Rates tab / src/lib/fxRateActions.ts) once on
// mount and call setLiveFxRates. A fetch failure or missing row is a true
// no-op — liveRates simply stays at its hardcoded seed, never a crash or a
// broken price.
let liveRates: Record<Currency, number> = { ...CURRENCY_RATES };

export function setLiveFxRates(rates: Partial<Record<Currency, number>>): void {
  liveRates = { ...liveRates, ...rates, KES: 1 };
}

/** Converts a KES amount to the target currency (rounded to whole units). */
export function fromKes(kesAmount: number, currency: Currency): number {
  return Math.round(kesAmount / liveRates[currency]);
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
