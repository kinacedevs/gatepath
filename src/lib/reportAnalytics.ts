/**
 * Gatepath Realtors — Reporting & Analytics (Part 2, Module 6)
 * Pure functions, no I/O — mirrors leadScoring.ts/propertyMatching.ts's
 * shape: computed live from data already fetched, never stored.
 *
 * Only the two analyses genuinely missing elsewhere: lead-source ROI
 * ("which channel actually closes" — existing charts show volume by
 * source only, never conversion/revenue) and cohort analysis (nothing
 * groups leads by creation month and tracks conversion over time anywhere
 * today). Pipeline/forecast/collection/agent analytics already have real
 * dedicated homes (Leads, Dashboard, Installments, Agent Performance) and
 * are deliberately not recomputed here.
 */
import type { Inquiry, Payment, Agreement } from "./types";

export interface SourceRoi {
  source: string;
  leadCount: number;
  approvedCount: number;
  conversionPct: number;
  revenue: number;
  avgDealSize: number;
}

export function computeSourceRoi(inquiries: Inquiry[], payments: Payment[]): SourceRoi[] {
  const paidByInquiry = new Map<string, number>();
  for (const p of payments) {
    if (p.status !== "success" || !p.inquiry_id) continue;
    paidByInquiry.set(p.inquiry_id, (paidByInquiry.get(p.inquiry_id) ?? 0) + Number(p.amount));
  }

  const bySource = new Map<string, { leadCount: number; approvedCount: number; revenue: number }>();
  for (const inq of inquiries) {
    const source = inq.heard_from?.trim() || "Unknown";
    const entry = bySource.get(source) ?? { leadCount: 0, approvedCount: 0, revenue: 0 };
    entry.leadCount += 1;
    if (inq.status === "approved") entry.approvedCount += 1;
    entry.revenue += paidByInquiry.get(inq.id) ?? 0;
    bySource.set(source, entry);
  }

  return Array.from(bySource.entries())
    .map(([source, { leadCount, approvedCount, revenue }]) => ({
      source,
      leadCount,
      approvedCount,
      conversionPct: leadCount > 0 ? Math.round((approvedCount / leadCount) * 100) : 0,
      revenue,
      avgDealSize: approvedCount > 0 ? Math.round(revenue / approvedCount) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

export interface Cohort {
  month: string;
  leadCount: number;
  convertedCount: number;
  conversionPct: number;
  avgDaysToConvert: number | null;
}

/** Last 6 calendar months, oldest first, keyed by each inquiry's created_at. */
export function computeCohorts(inquiries: Inquiry[], agreements: Agreement[]): Cohort[] {
  const signedByInquiry = new Map<string, string>();
  for (const a of agreements) {
    if (a.ceo_signed && a.inquiry_id && a.ceo_signed_at) {
      signedByInquiry.set(a.inquiry_id, a.ceo_signed_at);
    }
  }

  const now = new Date();
  const months: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("en-KE", { month: "short", year: "2-digit" }),
    });
  }

  return months.map(({ key, label }) => {
    const cohortInquiries = inquiries.filter((inq) => inq.created_at.slice(0, 7) === key);
    const converted = cohortInquiries.filter((inq) => signedByInquiry.has(inq.id));
    const daysToConvert = converted.map((inq) => {
      const signedAt = signedByInquiry.get(inq.id)!;
      return (
        (new Date(signedAt).getTime() - new Date(inq.created_at).getTime()) / (1000 * 60 * 60 * 24)
      );
    });
    const avgDaysToConvert =
      daysToConvert.length > 0
        ? Math.round(daysToConvert.reduce((a, b) => a + b, 0) / daysToConvert.length)
        : null;

    return {
      month: label,
      leadCount: cohortInquiries.length,
      convertedCount: converted.length,
      conversionPct:
        cohortInquiries.length > 0
          ? Math.round((converted.length / cohortInquiries.length) * 100)
          : 0,
      avgDaysToConvert,
    };
  });
}
