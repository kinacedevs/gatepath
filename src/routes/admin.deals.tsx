/**
 * Gatepath Realtors — Closed Deals Ledger (VIZ_BLUEPRINT Phase 2, Slice 4)
 * First token migration off the Phase 5A "mechanical split" residue (raw
 * inline style={{}}, hardcoded NAVY/CANVAS/CARD_BORDER hex) — this screen
 * was never redesigned, unlike Dashboard/Leads/Installments. Real bug fixed
 * along the way: the "View PDF" link read agreements.pdf_agreement_url,
 * which no code path ever populates (docs/DATABASE_SCHEMA.md) — always a
 * dead "#" link. Fixed to link to /document/agreement/$id, the real route,
 * same pattern already used in admin.inquiries.tsx.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { FileText, Handshake, DollarSign, Clock, Target } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatFromKes } from "@/lib/currency";
import { KpiCard } from "@/components/admin/KpiCard";
import { SectionCard } from "@/components/admin/SectionCard";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { FreshnessStamp } from "@/components/admin/FreshnessStamp";
import { CategoryBarChart } from "@/components/admin/charts/CategoryBarChart";
import { TrendChart } from "@/components/admin/charts/TrendChart";
import { SplitDonutChart } from "@/components/admin/charts/SplitDonutChart";
import { Skeleton } from "@/components/ui/skeleton";
import type { ColumnDef } from "@tanstack/react-table";
import type { Agreement, Inquiry } from "@/lib/types";

export const Route = createFileRoute("/admin/deals")({
  component: ClosedDealsLedger,
});

interface DealRow {
  agreement: Agreement;
  inquiry: Inquiry | undefined;
}

function monthLabel(d: Date) {
  return d.toLocaleDateString("en-KE", { month: "short" });
}

function ClosedDealsLedger() {
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [agreementsRes, inquiriesRes] = await Promise.all([
        supabase.from("agreements").select("*").eq("ceo_signed", true),
        supabase.from("inquiries").select("*"),
      ]);

      setAgreements((agreementsRes.data as Agreement[]) ?? []);
      setInquiries((inquiriesRes.data as Inquiry[]) ?? []);
    } catch (err) {
      console.error("Error loading closed deals data:", err);
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const deals: DealRow[] = useMemo(
    () =>
      agreements.map((agreement) => ({
        agreement,
        inquiry: inquiries.find((inq) => inq.id === agreement.inquiry_id),
      })),
    [agreements, inquiries],
  );

  const totalValue = deals.reduce((sum, d) => sum + (d.inquiry?.price || 0), 0);

  const avgTimeToCloseDays = useMemo(() => {
    const durations = deals
      .filter((d) => d.inquiry)
      .map((d) => {
        const start = new Date(d.inquiry!.created_at).getTime();
        const end = new Date(d.agreement.created_at).getTime();
        return Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
      });
    if (durations.length === 0) return 0;
    return Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
  }, [deals]);

  const winRate = inquiries.length > 0 ? Math.round((deals.length / inquiries.length) * 100) : 0;

  const revenueByPhase = useMemo(() => {
    const byPhase = new Map<string, number>();
    for (const d of deals) {
      const phase = d.inquiry?.phase_name || "Unspecified";
      byPhase.set(phase, (byPhase.get(phase) ?? 0) + (d.inquiry?.price || 0));
    }
    return Array.from(byPhase.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [deals]);

  const dealsOverTime = useMemo(() => {
    const now = new Date();
    const monthBuckets = new Map<string, number>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthBuckets.set(`${d.getFullYear()}-${d.getMonth()}`, 0);
    }
    for (const d of deals) {
      if (!d.agreement.ceo_signed_at) continue;
      const signedDate = new Date(d.agreement.ceo_signed_at);
      const key = `${signedDate.getFullYear()}-${signedDate.getMonth()}`;
      if (monthBuckets.has(key)) monthBuckets.set(key, (monthBuckets.get(key) ?? 0) + 1);
    }
    return Array.from(monthBuckets.entries()).map(([key, value]) => {
      const [y, m] = key.split("-").map(Number);
      return { month: monthLabel(new Date(y, m, 1)), value };
    });
  }, [deals]);

  // Honest 3-way split, not a binary win/loss donut (docs/VIZ_SPEC.md flags
  // that an un-actioned inquiry isn't cleanly "lost") — every inquiry is
  // accounted for in exactly one bucket.
  const dealOutcomes = useMemo(() => {
    const closedIds = new Set(agreements.map((a) => a.inquiry_id));
    let rejected = 0;
    let inProgress = 0;
    for (const inq of inquiries) {
      if (closedIds.has(inq.id)) continue;
      if (inq.status === "rejected") rejected += 1;
      else inProgress += 1;
    }
    return [
      { name: "Closed", value: closedIds.size },
      { name: "Rejected", value: rejected },
      { name: "In Progress", value: inProgress },
    ];
  }, [agreements, inquiries]);

  const columns: ColumnDef<DealRow, any>[] = [
    {
      id: "id",
      header: "Agreement ID",
      accessorFn: (row) => row.agreement.id,
      cell: (info) => (
        <span className="text-on-surface-variant font-medium">
          {(info.getValue() as string).substring(0, 8).toUpperCase()}
        </span>
      ),
    },
    {
      id: "client",
      header: "Client",
      accessorFn: (row) => row.inquiry?.client_full_name ?? "",
      cell: (info) => (
        <span className="text-primary font-semibold">{info.getValue() as string}</span>
      ),
    },
    {
      id: "project",
      header: "Project",
      accessorFn: (row) => row.inquiry?.phase_name ?? "",
      cell: ({ row }) => (
        <span className="text-primary">
          {row.original.inquiry?.phase_name} · Plot {row.original.inquiry?.plot_number_ref}
        </span>
      ),
    },
    {
      id: "signed",
      header: "Date Signed",
      accessorFn: (row) => row.agreement.ceo_signed_at ?? "",
      cell: (info) => (
        <span className="text-on-surface-variant">
          {info.getValue() ? new Date(info.getValue() as string).toLocaleDateString() : "—"}
        </span>
      ),
    },
    {
      id: "contract",
      header: "Contract",
      cell: ({ row }) =>
        row.original.inquiry ? (
          <Link
            to="/document/agreement/$id"
            params={{ id: row.original.inquiry.id }}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-info-container/15 text-on-info-container rounded-md text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            <FileText size={14} /> View PDF
          </Link>
        ) : null,
    },
  ];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary font-bold">
            Closed Deals Ledger
          </h1>
          <p className="text-body-md text-on-surface-variant">
            Agreements that have been finalized and signed by the CEO.
          </p>
        </div>
        <FreshnessStamp updatedAt={lastUpdated} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Deals Closed"
          value={loading ? "…" : String(deals.length)}
          icon={Handshake}
          tone="success"
        />
        <KpiCard
          label="Total Value"
          value={loading ? "…" : formatFromKes(totalValue, "KES")}
          icon={DollarSign}
        />
        <KpiCard
          label="Avg Time to Close"
          value={loading ? "…" : `${avgTimeToCloseDays}d`}
          icon={Clock}
          sublabel="Inquiry created → agreement signed"
        />
        <KpiCard
          label="Win Rate"
          value={loading ? "…" : `${winRate}%`}
          icon={Target}
          tone={winRate < 20 ? "warning" : "success"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard title="Revenue by Phase">
          {loading ? (
            <Skeleton className="h-45 rounded-xl" />
          ) : revenueByPhase.length === 0 ? (
            <EmptyState title="No closed deals yet" />
          ) : (
            <CategoryBarChart
              data={revenueByPhase}
              xKey="name"
              yKey="value"
              height={200}
              horizontal
              valueFormatter={(v) => formatFromKes(v, "KES")}
            />
          )}
        </SectionCard>
        <SectionCard title="Deals Closed — Last 6 Months">
          {loading ? (
            <Skeleton className="h-45 rounded-xl" />
          ) : (
            <TrendChart data={dealsOverTime} xKey="month" yKey="value" height={200} />
          )}
        </SectionCard>
        <SectionCard title="Deal Outcomes">
          {loading ? (
            <Skeleton className="h-45 rounded-xl" />
          ) : (
            <SplitDonutChart data={dealOutcomes} height={200} />
          )}
        </SectionCard>
      </div>

      <div className="luxury-card rounded-xl shadow-sm overflow-hidden bg-white">
        <div className="px-6 py-4 border-b border-outline-variant/30">
          <h2 className="font-headline-md text-sm text-primary font-bold">Signed Agreements</h2>
        </div>
        {loading ? (
          <Skeleton className="h-64 rounded-xl m-4" />
        ) : (
          <AdminDataTable columns={columns} data={deals} emptyMessage="No deals have closed yet." />
        )}
      </div>
    </div>
  );
}
