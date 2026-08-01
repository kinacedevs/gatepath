/**
 * Gatepath Realtors — Property-Matching Engine (Part 2, Module 5)
 * "Match buyer preferences (location, budget, currency, phase) to available
 * plots." Pure functions, no I/O — mirrors leadScoring.ts's shape: computed
 * live from data already fetched, not stored, so it can never go stale.
 *
 * True automatic alerting on newly-available inventory needs a trigger or
 * scheduled job — the only automation mechanism for that (Part 2 Module 3,
 * the n8n bridge) is deliberately built last. This engine finds matches on
 * demand; sendMatchAlertFn (buyerPreferenceActions.ts) sends them manually,
 * same honest scoping as sendTaskReminderFn.
 */
import type { BuyerPreference, Phase, Plot } from "./types";

export interface MatchedPlot {
  plot: Plot;
  phase: Phase;
  cashPriceKes: number;
}

function locationMatches(preference: BuyerPreference, phase: Phase): boolean {
  if (preference.preferred_phase_id) return phase.id === preference.preferred_phase_id;
  if (!preference.preferred_location?.trim()) return true;
  const needle = preference.preferred_location.trim().toLowerCase();
  return (
    phase.location.toLowerCase().includes(needle) || phase.region.toLowerCase().includes(needle)
  );
}

function budgetMatches(preference: BuyerPreference, cashPriceKes: number): boolean {
  if (preference.min_budget_kes != null && cashPriceKes < preference.min_budget_kes) return false;
  if (preference.max_budget_kes != null && cashPriceKes > preference.max_budget_kes) return false;
  return true;
}

export function findMatchingPlots(
  preference: BuyerPreference,
  phases: Phase[],
  plots: Plot[],
): MatchedPlot[] {
  const phasesById = new Map(phases.map((p) => [p.id, p]));
  const matches: MatchedPlot[] = [];

  for (const plot of plots) {
    if (plot.status !== "available") continue;
    const phase = phasesById.get(plot.phase_id);
    if (!phase) continue;
    if (!locationMatches(preference, phase)) continue;

    const cashPriceKes = plot.plot_sizes?.cash_price;
    if (cashPriceKes == null) continue;
    if (!budgetMatches(preference, cashPriceKes)) continue;

    matches.push({ plot, phase, cashPriceKes });
  }

  return matches;
}
