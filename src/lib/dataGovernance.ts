/**
 * Gatepath Realtors — Data Governance (Part 2, Module 10)
 * Pure functions, no I/O — mirrors escalations.ts's shape: computed live
 * from data already fetched, never stored.
 *
 * Duplicate detection is read-only, no merge action — merging would mean
 * re-pointing payments/bookings/offers/agreements/interaction_log/
 * document_records foreign keys onto a canonical record, a destructive,
 * hard-to-reverse operation on core sales data that deserves its own
 * dedicated, carefully-reviewed migration path, not something folded into
 * this module.
 *
 * Retention candidates are a manual-review report, never an automatic
 * deletion job — deleting client PII automatically is exactly the kind of
 * destructive, hard-to-reverse action that needs explicit, separate
 * authorization, which a "Data Governance" feature brief does not
 * constitute on its own.
 */

interface GovInquiry {
  id: string;
  client_full_name: string;
  client_email: string;
  client_phone: string;
  client_id_passport: string | null;
  client_kra_pin: string | null;
  client_country: string | null;
  marketing_opt_in: boolean | null;
  status: string;
  updated_at: string;
}

export interface DuplicateGroup {
  matchType: "email" | "phone" | "id_passport";
  matchValue: string;
  inquiries: { id: string; client_full_name: string }[];
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

export function findLikelyDuplicates(inquiries: GovInquiry[]): DuplicateGroup[] {
  const groups: DuplicateGroup[] = [];

  const buildGroups = (
    matchType: DuplicateGroup["matchType"],
    keyFn: (inq: GovInquiry) => string | null,
  ) => {
    const byKey = new Map<string, GovInquiry[]>();
    for (const inq of inquiries) {
      const key = keyFn(inq);
      if (!key) continue;
      const normalized = normalize(key);
      const list = byKey.get(normalized) ?? [];
      list.push(inq);
      byKey.set(normalized, list);
    }
    for (const [key, list] of byKey) {
      // Only a genuine duplicate if it spans more than one distinct client
      // name — the same client submitting multiple real inquiries for
      // different plots is normal business activity, not a data-quality
      // problem, so a same-email group where every row shares one name is
      // not flagged.
      const distinctNames = new Set(list.map((i) => normalize(i.client_full_name)));
      if (list.length > 1 && distinctNames.size > 1) {
        groups.push({
          matchType,
          matchValue: key,
          inquiries: list.map((i) => ({ id: i.id, client_full_name: i.client_full_name })),
        });
      }
    }
  };

  buildGroups("email", (i) => i.client_email);
  buildGroups("phone", (i) => i.client_phone);
  buildGroups("id_passport", (i) => i.client_id_passport);

  return groups;
}

export interface DataCompletenessField {
  field: string;
  label: string;
  missingCount: number;
  missingPct: number;
}

export function computeDataCompleteness(inquiries: GovInquiry[]): DataCompletenessField[] {
  const total = inquiries.length;
  if (total === 0) return [];

  const fields: { field: string; label: string; isMissing: (i: GovInquiry) => boolean }[] = [
    { field: "client_kra_pin", label: "KRA PIN", isMissing: (i) => !i.client_kra_pin },
    { field: "client_country", label: "Country", isMissing: (i) => !i.client_country },
    {
      field: "marketing_opt_in",
      label: "Marketing Consent",
      isMissing: (i) => i.marketing_opt_in === null || i.marketing_opt_in === undefined,
    },
  ];

  return fields.map(({ field, label, isMissing }) => {
    const missingCount = inquiries.filter(isMissing).length;
    return {
      field,
      label,
      missingCount,
      missingPct: Math.round((missingCount / total) * 100),
    };
  });
}

export interface RetentionCandidate {
  id: string;
  client_full_name: string;
  status: string;
  daysSinceUpdate: number;
}

/** Default 730 days (~2 years) — a reasonable, clearly-labeled default, not
 * a claim of legal accuracy for any specific retention obligation. */
export function findRetentionCandidates(
  inquiries: GovInquiry[],
  thresholdDays = 730,
): RetentionCandidate[] {
  const now = Date.now();
  return inquiries
    .filter((i) => i.status === "rejected")
    .map((i) => ({
      id: i.id,
      client_full_name: i.client_full_name,
      status: i.status,
      daysSinceUpdate: Math.floor((now - new Date(i.updated_at).getTime()) / (1000 * 60 * 60 * 24)),
    }))
    .filter((c) => c.daysSinceUpdate >= thresholdDays);
}
