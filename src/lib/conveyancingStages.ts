/**
 * Gatepath Realtors — Real 13-Stage Conveyancing Resolver (Part 2, Module 8)
 * Live-computed, read-only — mirrors leadScoring.ts's shape: a pure
 * function checking each stage's real existing signal, never stored, so it
 * can never go stale. Zero changes to any existing write path (payment
 * recording, agreement signing, booking status) — those stay exactly as
 * CLAUDE.md protects them ("Conveyancing stage transitions and audit
 * logging" change only in dedicated, separately-reviewed commits). This
 * does not touch a transition; it only reads already-real state more
 * accurately than the old payment-percentage heuristic did.
 *
 * The 13 stages and their real/partial/missing status are exactly as
 * documented in docs/CRM_STATE_AUDIT.md §4 — not re-derived here. Stages
 * 11 (Completion Documents) and 12 (Transfer & Registration) have no real
 * signal anywhere in the schema and are never auto-marked reached. Stage
 * 13 (Title Deed Issued & Handover) also has no real *post-sale* signal —
 * plot_title_verifications is a pre-sale check the company runs on its own
 * inventory, not a buyer-specific handover record — so it's never
 * auto-marked either, per that same audit's own finding.
 *
 * A timestamped history of *when* each stage was reached (a
 * deal_stage_events audit table, wired into paymentActions.ts/
 * inquiryActions.ts/bookingActions.ts) is a separate, larger, dedicated
 * slice — not built here.
 *
 * Deliberately uses minimal, duck-typed input shapes (just the fields
 * actually read) instead of importing the full Inquiry/Payment/Booking/
 * Offer/Agreement/InteractionLog row types — portal.tsx keeps its own
 * lightweight local interfaces (a subset of the real columns) rather than
 * the shared src/lib/types.ts shapes, so this stays decoupled and works
 * with either.
 */

export const CONVEYANCING_13_STAGES = [
  { stage: 1, label: "Lead Captured", desc: "Your inquiry was received and logged." },
  { stage: 2, label: "Lead Assigned", desc: "A relationship officer was assigned to you." },
  {
    stage: 3,
    label: "Contacted & Qualified",
    desc: "Our team reached out to understand your needs.",
  },
  { stage: 4, label: "Site Visit Scheduled", desc: "A guided site visit was booked." },
  { stage: 5, label: "Site Visit Completed", desc: "Your site visit took place." },
  {
    stage: 6,
    label: "Plot Reserved",
    desc: "Your deposit secured the plot and an Offer Letter was issued.",
  },
  { stage: 7, label: "Sale Agreement Issued & Signed", desc: "The CEO signed your Offer Letter." },
  {
    stage: 8,
    label: "Deposit Confirmed / Payment Plan Active",
    desc: "Your payment plan is active.",
  },
  {
    stage: 9,
    label: "Installments In Progress",
    desc: "You're making progress on your installment plan.",
  },
  {
    stage: 10,
    label: "Full Payment Cleared",
    desc: "Your purchase price is fully paid — your Agreement is being finalized.",
  },
  {
    stage: 11,
    label: "Completion Documents",
    desc: "Land control board consent, valuation, and stamp duty filing.",
  },
  {
    stage: 12,
    label: "Transfer & Registration",
    desc: "Ownership transfer and registration at the Land Registry.",
  },
  {
    stage: 13,
    label: "Title Deed Issued & Handover",
    desc: "Your title deed is ready for collection or dispatch.",
  },
] as const;

export const NEXT_ACTION_BY_STAGE: Record<number, string> = {
  1: "We've received your inquiry — a relationship officer will be assigned shortly.",
  2: "Your relationship officer will be in touch to understand your needs.",
  3: "Our team is preparing to schedule your site visit.",
  4: "Your site visit is booked — we look forward to showing you around.",
  5: "Ready when you are — reserve your plot with a deposit to secure it.",
  6: "Your Offer Letter is being prepared for the CEO's signature.",
  7: "Continue your payment plan to move towards full payment.",
  8: "Continue your installment payments — track your balance below.",
  9: "Continue your installment payments — track your balance below.",
  10: "Your Agreement is awaiting the CEO's countersignature.",
  11: "Your title is now being processed by the Lands Registry.",
  12: "Your title is now being processed by the Lands Registry.",
  13: "Your title deed is ready — contact us to arrange collection or dispatch.",
};

interface DealStageInquiry {
  cro_name: string | null;
  terms_of_payment: string | null;
  status: string;
}
interface DealStagePayment {
  status: string;
}
interface DealStageBooking {
  status: string;
}
interface DealStageOffer {
  ceo_signed: boolean;
}
interface DealStageAgreement {
  ceo_signed: boolean;
}

interface DealStageInputs {
  payments: DealStagePayment[];
  bookings: DealStageBooking[];
  offers: DealStageOffer[];
  agreements: DealStageAgreement[];
  interactions: unknown[];
}

export function resolveDealStage(
  inquiry: DealStageInquiry,
  { payments, bookings, offers, agreements, interactions }: DealStageInputs,
): { currentStage: number; reachedStages: Set<number>; agreementSigned: boolean } {
  const reached = new Set<number>();

  // 1. Lead Captured — always true, the inquiry exists.
  reached.add(1);

  // 2. Lead Assigned
  if (inquiry.cro_name) reached.add(2);

  // 3. Contacted & Qualified — a logged interaction, or the status flip as
  // a fallback for inquiries that predate the interaction log (Phase 10).
  if (interactions.length > 0 || inquiry.status === "reviewed" || inquiry.status === "approved") {
    reached.add(3);
  }

  // 4/5. Site Visit Scheduled / Completed
  if (bookings.length > 0) reached.add(4);
  if (bookings.some((b) => b.status === "completed")) reached.add(5);

  // 6/7. Plot Reserved / Sale Agreement Issued & Signed (the Offer Letter)
  const hasOffer = offers.length > 0;
  if (hasOffer) reached.add(6);
  if (offers.some((o) => o.ceo_signed)) reached.add(7);

  // 8. Deposit Confirmed / Payment Plan Active
  if (hasOffer && inquiry.terms_of_payment) reached.add(8);

  // 9. Installments In Progress — more than one successful payment against
  // an installment plan (i.e. progress beyond the initial deposit).
  const successfulPaymentCount = payments.filter((p) => p.status === "success").length;
  if (inquiry.terms_of_payment === "installment" && successfulPaymentCount >= 2) {
    reached.add(9);
  }

  // 10. Full Payment Cleared — an Agreement row only exists once the full
  // price has been paid (Phase 7's payment-gated creation), so this stage
  // is correctly "reached" the moment payment clears. Whether the CEO has
  // actually countersigned it yet is a separate fact (ceo_signed, set
  // false at creation) — surfaced via agreementSigned below rather than
  // conflated into this stage, so the client is never told "signed" before
  // it's true.
  if (agreements.length > 0) reached.add(10);
  const agreementSigned = agreements.some((a) => a.ceo_signed);

  // 11-13: no real signal anywhere in the schema — never auto-marked.

  const currentStage = Math.max(...Array.from(reached));
  return { currentStage, reachedStages: reached, agreementSigned };
}
