/**
 * Gatepath Realtors — Data Governance (Part 2, Module 10)
 * CEO/manager only — this screen surfaces cross-client PII patterns
 * (duplicate matches, completeness gaps) and the audit log, a stricter bar
 * than the routine-work default, matching Document Vault's deletion gate.
 *
 * IMPORTANT: this screen supports data governance practices — it does not
 * certify legal compliance. Kenya Data Protection Act obligations require
 * actual legal review, which this cannot substitute for. Stated plainly in
 * the UI itself, not just here.
 *
 * Duplicate detection is read-only, no merge action (see
 * src/lib/dataGovernance.ts for why). Retention is a manual-review report,
 * no automatic deletion. The audit log only covers this session's own
 * newly-built server functions (Document Vault, Buyer Preferences, Tasks,
 * Escalations) — not the older protected write paths.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, Users, UserCheck2, Archive, ScrollText, ShieldAlert } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdminSession } from "@/context/AdminSessionContext";
import {
  findLikelyDuplicates,
  computeDataCompleteness,
  findRetentionCandidates,
} from "@/lib/dataGovernance";
import { KpiCard } from "@/components/admin/KpiCard";
import { SectionCard } from "@/components/admin/SectionCard";
import { EmptyState } from "@/components/admin/EmptyState";
import { FreshnessStamp } from "@/components/admin/FreshnessStamp";
import { CategoryBarChart } from "@/components/admin/charts/CategoryBarChart";
import { Skeleton } from "@/components/ui/skeleton";
import type { Inquiry, AuditLog } from "@/lib/types";

export const Route = createFileRoute("/admin/data-governance")({
  component: DataGovernance,
});

function DataGovernance() {
  const { adminRole } = useAdminSession();
  const canView = adminRole === "ceo" || adminRole === "manager";

  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [inquiriesRes, auditRes] = await Promise.all([
      supabase.from("inquiries").select("*"),
      supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setInquiries((inquiriesRes.data as Inquiry[]) ?? []);
    setAuditLog((auditRes.data as AuditLog[]) ?? []);
    setLoading(false);
    setLastUpdated(new Date());
  };

  useEffect(() => {
    if (canView) loadData();
    else setLoading(false);
  }, [canView]);

  const duplicates = useMemo(() => findLikelyDuplicates(inquiries), [inquiries]);
  const completeness = useMemo(() => computeDataCompleteness(inquiries), [inquiries]);
  const retentionCandidates = useMemo(() => findRetentionCandidates(inquiries), [inquiries]);

  const optInField = completeness.find((f) => f.field === "marketing_opt_in");
  const optInPct = optInField ? 100 - optInField.missingPct : 0;

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <ShieldAlert size={32} className="text-on-surface-variant" />
        <p className="text-sm font-semibold text-on-surface">
          Data Governance is restricted to the CEO and managers.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary font-bold">
            Data Governance
          </h1>
          <p className="text-body-md text-on-surface-variant">
            Duplicate detection, data completeness, consent, retention review, and the audit log.
          </p>
        </div>
        <FreshnessStamp updatedAt={lastUpdated} />
      </div>

      <div className="px-4 py-3 bg-info-container/10 border border-info-container/30 rounded-lg text-[13px] text-on-surface">
        <strong>
          This screen supports data governance practices — it does not certify legal compliance.
        </strong>{" "}
        Kenya Data Protection Act obligations require actual legal review, which no software feature
        can substitute for.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Clients"
          value={loading ? "…" : String(inquiries.length)}
          icon={Users}
        />
        <KpiCard
          label="Likely Duplicate Groups"
          value={loading ? "…" : String(duplicates.length)}
          icon={UserCheck2}
          tone={duplicates.length > 0 ? "warning" : "default"}
        />
        <KpiCard
          label="Marketing Opt-In"
          value={loading ? "…" : `${optInPct}% recorded`}
          icon={ShieldCheck}
        />
        <KpiCard
          label="Records Past Retention Review"
          value={loading ? "…" : String(retentionCandidates.length)}
          icon={Archive}
          tone={retentionCandidates.length > 0 ? "warning" : "default"}
        />
      </div>

      <SectionCard title="Data Completeness">
        {loading ? (
          <Skeleton className="h-45 rounded-xl" />
        ) : (
          <CategoryBarChart
            data={completeness.map((f) => ({ name: f.label, value: f.missingPct }))}
            xKey="name"
            yKey="value"
            height={180}
            horizontal
            valueFormatter={(v) => `${v}% missing`}
          />
        )}
      </SectionCard>

      <SectionCard title="Likely Duplicate Clients">
        <p className="text-xs text-on-surface-variant mb-3">
          Grouped by matching email, phone, or ID/passport number across different client names.
          Informational only — no merge action is offered here; merging would re-point payments,
          bookings, and legal documents onto a canonical record, a destructive step that needs its
          own dedicated review.
        </p>
        {loading ? (
          <Skeleton className="h-32 rounded-xl" />
        ) : duplicates.length === 0 ? (
          <EmptyState title="No likely duplicates found." />
        ) : (
          <div className="flex flex-col gap-2">
            {duplicates.map((group) => (
              <div
                key={`${group.matchType}-${group.matchValue}`}
                className="p-3 bg-surface-container-low rounded-lg text-[13px]"
              >
                <span className="font-semibold text-primary-container">
                  Matching {group.matchType.replace("_", "/")}: {group.matchValue}
                </span>
                <p className="text-on-surface-variant mt-1">
                  {group.inquiries.map((i) => i.client_full_name).join(", ")}
                </p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Retention Review — Rejected Inquiries Past 2 Years">
        <p className="text-xs text-on-surface-variant mb-3">
          A read-only list for manual review — no automatic deletion is performed.
        </p>
        {loading ? (
          <Skeleton className="h-32 rounded-xl" />
        ) : retentionCandidates.length === 0 ? (
          <EmptyState title="Nothing past the retention review window." />
        ) : (
          <div className="flex flex-col gap-2">
            {retentionCandidates.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg text-[13px]"
              >
                <span className="font-semibold text-primary-container">{c.client_full_name}</span>
                <span className="text-on-surface-variant">
                  Rejected, unchanged for {c.daysSinceUpdate} days
                </span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Recent Audit Log">
        <p className="text-xs text-on-surface-variant mb-3">
          Covers this session's newer admin actions (Document Vault, Buyer Preferences, Tasks,
          Escalations). Payment, agreement, and status-transition logic is not yet wired in — that
          remains separate, dedicated work.
        </p>
        {loading ? (
          <Skeleton className="h-40 rounded-xl" />
        ) : auditLog.length === 0 ? (
          <EmptyState icon={ScrollText} title="No audit events recorded yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead className="bg-surface-container-low border-b border-outline-variant/30">
                <tr>
                  {["When", "Actor", "Action", "Entity"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 font-label-md text-[11px] text-on-surface-variant uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {auditLog.map((event) => (
                  <tr key={event.id}>
                    <td className="px-4 py-2.5 text-[12px] text-on-surface-variant">
                      {new Date(event.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-[13px] text-primary-container font-semibold">
                      {event.actor_name ?? event.actor_email ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-[13px] text-on-surface">{event.action}</td>
                    <td className="px-4 py-2.5 text-[12px] text-on-surface-variant">
                      {event.entity_type}
                      {event.entity_id ? ` · ${event.entity_id.slice(0, 8)}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
