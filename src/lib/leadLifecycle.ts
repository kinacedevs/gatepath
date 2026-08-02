/**
 * Gatepath Realtors — Lead → Contact → Deal Lifecycle (computed-live)
 * Mirrors leadScoring.ts's shape: a pure function, no I/O, computed live
 * from data admin.leads.tsx already fetches — never stored.
 *
 * Deliberately NOT based on inquiries.status — the Kanban's own
 * DEFAULT_PIPELINE_LABELS already relabel approved/rejected as "Won"/"Lost"
 * at the review-workflow level, so a lifecycle stage built on status would
 * just duplicate that column. This axis tracks a genuinely different
 * signal: how far a lead has progressed toward money, independent of
 * whether staff has reviewed it —
 *   no engagement yet                          -> lead
 *   a logged interaction or a booked site visit -> contact
 *   a reservation/deposit is in (an offer)      -> deal
 *   paid in full and signed (an agreement)      -> won
 * `status === 'rejected'` short-circuits to "lost" regardless of stage.
 */
import type { Inquiry } from "./types";

export type LifecycleStage = "lead" | "contact" | "deal" | "won" | "lost";

export interface LifecycleSignals {
  hasInteraction: boolean;
  hasBooking: boolean;
  hasOffer: boolean;
  hasAgreement: boolean;
}

export function computeLifecycleStage(
  inquiry: Pick<Inquiry, "status">,
  signals: LifecycleSignals,
): LifecycleStage {
  if (inquiry.status === "rejected") return "lost";
  if (signals.hasAgreement) return "won";
  if (signals.hasOffer) return "deal";
  if (signals.hasInteraction || signals.hasBooking) return "contact";
  return "lead";
}

export const LIFECYCLE_LABELS: Record<LifecycleStage, string> = {
  lead: "Lead",
  contact: "Contact",
  deal: "Deal",
  won: "Won",
  lost: "Lost",
};
