/**
 * Gatepath Realtors — Lead Scoring Engine (Part 2, Module 4)
 * Rules-based v1, per the user's own brief: "source, budget, engagement,
 * response... AI later once you have historical conversions." Pure
 * functions, no I/O — computed live from data already fetched by
 * admin.leads.tsx, not stored. A stored inquiries.score column would need a
 * trigger or scheduled recompute to stay fresh, and the only automation
 * mechanism for that (Module 3, n8n bridge) is deliberately built last, so
 * a stored score would go stale with no way to refresh it. Computing live
 * means it's always current by construction.
 *
 * Every input is real:
 * - source: historical approval rate for this inquiry's heard_from value.
 * - budget: this inquiry's price percentile among all real inquiry prices.
 * - engagement: a booked site visit + interaction_log activity count.
 * - response: presence of an inbound interaction_log entry (the lead
 *   reaching back out) — the strongest real responsiveness signal today.
 */
import type { Inquiry } from "./types";

/** Below this many historical inquiries, a source's own approval rate is
 * too noisy to trust (e.g. 1 conversion out of 1 inquiry reads as "100%")
 * — fall back to the global rate instead. */
const MIN_SOURCE_SAMPLE = 5;

export function computeSourceRates(inquiries: Inquiry[]): Map<string, number> {
  const bySource = new Map<string, { total: number; approved: number }>();
  let globalTotal = 0;
  let globalApproved = 0;

  for (const inq of inquiries) {
    const source = inq.heard_from?.trim() || "Unknown";
    const entry = bySource.get(source) ?? { total: 0, approved: 0 };
    entry.total += 1;
    if (inq.status === "approved") entry.approved += 1;
    bySource.set(source, entry);

    globalTotal += 1;
    if (inq.status === "approved") globalApproved += 1;
  }

  const globalRate = globalTotal > 0 ? globalApproved / globalTotal : 0;
  const rates = new Map<string, number>();
  for (const [source, { total, approved }] of bySource) {
    rates.set(source, total >= MIN_SOURCE_SAMPLE ? approved / total : globalRate);
  }
  return rates;
}

export interface LeadScoreBreakdown {
  source: number;
  budget: number;
  engagement: number;
  response: number;
}

export interface LeadScoreInputs {
  sourceRates: Map<string, number>;
  minPrice: number;
  maxPrice: number;
  hasSiteVisit: boolean;
  interactionCount: number;
  hasInboundInteraction: boolean;
}

/** Each component is 0-25; total is 0-100. */
export function computeLeadScore(
  inquiry: Inquiry,
  inputs: LeadScoreInputs,
): { total: number; breakdown: LeadScoreBreakdown } {
  const source = inquiry.heard_from?.trim() || "Unknown";
  const sourceRate = inputs.sourceRates.get(source) ?? 0;
  const sourceScore = Math.round(sourceRate * 25);

  const priceRange = inputs.maxPrice - inputs.minPrice;
  const pricePercentile =
    priceRange > 0 && inquiry.price ? (inquiry.price - inputs.minPrice) / priceRange : 0;
  const budgetScore = Math.round(Math.max(0, Math.min(1, pricePercentile)) * 25);

  const visitScore = inputs.hasSiteVisit ? 10 : 0;
  const interactionScore = Math.min(inputs.interactionCount, 3) * 5;
  const engagementScore = Math.min(25, visitScore + interactionScore);

  const responseScore = inputs.hasInboundInteraction ? 25 : 0;

  const total = sourceScore + budgetScore + engagementScore + responseScore;
  return {
    total,
    breakdown: {
      source: sourceScore,
      budget: budgetScore,
      engagement: engagementScore,
      response: responseScore,
    },
  };
}

export type LeadScoreTier = "hot" | "warm" | "cool";

export function scoreTier(total: number): LeadScoreTier {
  if (total >= 70) return "hot";
  if (total >= 40) return "warm";
  return "cool";
}
