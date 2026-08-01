/**
 * Gatepath Realtors — Escalation Finders (Part 2, Module 9)
 * Pure functions, no I/O — mirrors leadScoring.ts's shape: computed live
 * from data already fetched, never stored. Two of these (overdue
 * installments, stale bookings) deliberately re-implement formulas that
 * already exist inline on the Dashboard/Installments/Site Visits screens,
 * rather than refactoring those already-shipped screens to share this file
 * — same "some formula duplication across screens is fine, duplication of
 * UI is not" precedent already set in Module 6 (Reports & Analytics).
 */

export type EscalationCategory =
  | "overdue_installment"
  | "stale_booking"
  | "stalled_lead"
  | "missing_feedback"
  | "expiring_grace_period";

export interface EscalationItem {
  id: string;
  category: EscalationCategory;
  title: string;
  description: string;
  urgency: "warning" | "error";
  relatedInquiryId?: string;
  relatedBookingId?: string;
}

function daysSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
}

interface EscInquiry {
  id: string;
  client_full_name: string;
  status: string;
  created_at: string;
  price: number | null;
  monthly_payment: number | null;
  booking_date: string | null;
  terms_of_payment: string | null;
}
interface EscPayment {
  inquiry_id: string | null;
  amount: number;
  status: string;
}
interface EscBooking {
  id: string;
  inquiry_id: string | null;
  visit_date: string | null;
  status: string;
  staff_feedback: string | null;
}
interface EscInteraction {
  inquiry_id: string;
  occurred_at: string;
}
interface EscOffer {
  id: string;
  inquiry_id: string;
  created_at: string;
}
interface EscAgreement {
  inquiry_id: string | null;
}

const GRACE_PERIOD_DAYS = 14;

export function findOverdueInstallments(
  inquiries: EscInquiry[],
  payments: EscPayment[],
): EscalationItem[] {
  const paidByInquiry = new Map<string, number>();
  for (const p of payments) {
    if (p.status !== "success" || !p.inquiry_id) continue;
    paidByInquiry.set(p.inquiry_id, (paidByInquiry.get(p.inquiry_id) ?? 0) + Number(p.amount));
  }

  const items: EscalationItem[] = [];
  for (const inq of inquiries) {
    if (
      inq.status !== "approved" ||
      inq.terms_of_payment !== "installment" ||
      !inq.monthly_payment ||
      !inq.booking_date
    ) {
      continue;
    }
    const monthsElapsed = Math.max(0, Math.floor(daysSince(inq.booking_date) / 30));
    const expectedPaid = inq.monthly_payment * monthsElapsed;
    const actualPaid = paidByInquiry.get(inq.id) ?? 0;
    const shortfallMonths = (expectedPaid - actualPaid) / inq.monthly_payment;

    if (shortfallMonths >= 1) {
      items.push({
        id: `overdue-${inq.id}`,
        category: "overdue_installment",
        title: `${inq.client_full_name} — installment overdue`,
        description: `Approximately ${Math.floor(shortfallMonths)} month(s) behind on the installment plan.`,
        urgency: shortfallMonths >= 2 ? "error" : "warning",
        relatedInquiryId: inq.id,
      });
    }
  }
  return items;
}

export function findStaleBookings(
  bookings: EscBooking[],
  inquiries: EscInquiry[],
): EscalationItem[] {
  const todayKey = new Date().toISOString().slice(0, 10);
  const inquiryById = new Map(inquiries.map((i) => [i.id, i]));

  return bookings
    .filter((b) => b.status === "pending" && b.visit_date && b.visit_date < todayKey)
    .map((b) => {
      const inquiry = b.inquiry_id ? inquiryById.get(b.inquiry_id) : undefined;
      return {
        id: `stale-booking-${b.id}`,
        category: "stale_booking" as const,
        title: `Visit never confirmed — ${b.visit_date}`,
        description: `${inquiry?.client_full_name ?? "Unknown client"}'s visit is past its date and still pending.`,
        urgency: "error" as const,
        relatedBookingId: b.id,
        relatedInquiryId: b.inquiry_id ?? undefined,
      };
    });
}

export function findStalledLeads(
  inquiries: EscInquiry[],
  interactions: EscInteraction[],
  thresholdDays = 7,
): EscalationItem[] {
  const lastInteractionByInquiry = new Map<string, string>();
  for (const entry of interactions) {
    const existing = lastInteractionByInquiry.get(entry.inquiry_id);
    if (!existing || entry.occurred_at > existing) {
      lastInteractionByInquiry.set(entry.inquiry_id, entry.occurred_at);
    }
  }

  const items: EscalationItem[] = [];
  for (const inq of inquiries) {
    if (inq.status !== "pending" && inq.status !== "reviewed") continue;
    const lastActivity = lastInteractionByInquiry.get(inq.id) ?? inq.created_at;
    const idleDays = daysSince(lastActivity);
    if (idleDays >= thresholdDays) {
      items.push({
        id: `stalled-${inq.id}`,
        category: "stalled_lead",
        title: `${inq.client_full_name} — stalled lead`,
        description: `No activity logged in ${Math.floor(idleDays)} days.`,
        urgency: idleDays >= thresholdDays * 2 ? "error" : "warning",
        relatedInquiryId: inq.id,
      });
    }
  }
  return items;
}

export function findMissingFeedback(
  bookings: EscBooking[],
  inquiries: EscInquiry[],
): EscalationItem[] {
  const inquiryById = new Map(inquiries.map((i) => [i.id, i]));

  return bookings
    .filter((b) => b.status === "completed" && !b.staff_feedback)
    .map((b) => {
      const inquiry = b.inquiry_id ? inquiryById.get(b.inquiry_id) : undefined;
      return {
        id: `feedback-${b.id}`,
        category: "missing_feedback" as const,
        title: `Missing feedback — ${inquiry?.client_full_name ?? "Unknown client"}`,
        description: `Site visit on ${b.visit_date ?? "an unrecorded date"} was completed with no staff feedback logged.`,
        urgency: "warning" as const,
        relatedBookingId: b.id,
        relatedInquiryId: b.inquiry_id ?? undefined,
      };
    });
}

export function findExpiringGracePeriods(
  offers: EscOffer[],
  agreements: EscAgreement[],
  inquiries: EscInquiry[],
): EscalationItem[] {
  const inquiryIdsWithAgreement = new Set(
    agreements.map((a) => a.inquiry_id).filter((id): id is string => !!id),
  );
  const inquiryById = new Map(inquiries.map((i) => [i.id, i]));

  const items: EscalationItem[] = [];
  for (const offer of offers) {
    if (inquiryIdsWithAgreement.has(offer.inquiry_id)) continue;
    const daysRemaining = GRACE_PERIOD_DAYS - daysSince(offer.created_at);
    if (daysRemaining > 3) continue;

    const inquiry = inquiryById.get(offer.inquiry_id);
    const isExpired = daysRemaining <= 0;
    items.push({
      id: `grace-${offer.id}`,
      category: "expiring_grace_period",
      title: isExpired
        ? `${inquiry?.client_full_name ?? "Client"} — reservation grace period expired`
        : `${inquiry?.client_full_name ?? "Client"} — grace period expiring soon`,
      description: isExpired
        ? `The 14-day reservation hold expired ${Math.abs(Math.floor(daysRemaining))} day(s) ago with no full payment yet.`
        : `The 14-day reservation hold expires in ${Math.ceil(daysRemaining)} day(s).`,
      urgency: isExpired ? "error" : "warning",
      relatedInquiryId: offer.inquiry_id,
    });
  }
  return items;
}

/** Sorted error-before-warning, matching the visual convention already used
 * for escalation feeds elsewhere in this codebase. */
export function sortByUrgency(items: EscalationItem[]): EscalationItem[] {
  return items
    .slice()
    .sort((a, b) => (a.urgency === b.urgency ? 0 : a.urgency === "error" ? -1 : 1));
}
