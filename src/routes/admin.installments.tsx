/**
 * Gatepath Realtors — Installment Tracker (VIZ_BLUEPRINT Phase 2, Slice 3)
 * Builds on Phase 5C's real payment ledger ("Paid So Far" sums actual
 * `payments`, not the `inquiries.deposit` approximation the original code
 * used). Adds an Overdue KPI (same heuristic already used on Dashboard),
 * a collection-rate Gauge, an Outstanding vs Collected comparison, an
 * approximate aging-buckets chart, and upgrades the ledger to
 * AdminDataTable for real sorting. "Due this month" and multi-currency
 * splits are 🔴 needs-schema per docs/VIZ_SPEC.md §6 — not built here,
 * not faked.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Send, Check, DollarSign, TrendingUp, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatFromKes } from "@/lib/currency";
import { sendPaymentReminderFn } from "@/lib/notifications";
import { KpiCard } from "@/components/admin/KpiCard";
import { SectionCard } from "@/components/admin/SectionCard";
import { Gauge } from "@/components/admin/Gauge";
import { CategoryBarChart } from "@/components/admin/charts/CategoryBarChart";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { EmptyState } from "@/components/admin/EmptyState";
import { FreshnessStamp } from "@/components/admin/FreshnessStamp";
import { Skeleton } from "@/components/ui/skeleton";
import type { ColumnDef } from "@tanstack/react-table";
import type { Inquiry } from "@/lib/types";

export const Route = createFileRoute("/admin/installments")({
  component: InstallmentTracker,
});

interface Ledger {
  inquiry: Inquiry;
  paid: number;
  progress: number;
  daysBehind: number;
}

function monthsSince(isoDate: string, now: Date) {
  const then = new Date(isoDate);
  const months = (now.getFullYear() - then.getFullYear()) * 12 + (now.getMonth() - then.getMonth());
  return Math.max(0, months);
}

function InstallmentTracker() {
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [reminderState, setReminderState] = useState<Record<string, "sending" | "sent" | "error">>(
    {},
  );

  const loadData = async () => {
    setLoading(true);
    const [inquiriesRes, paymentsRes] = await Promise.all([
      supabase
        .from("inquiries")
        .select("*")
        .eq("terms_of_payment", "installment")
        .order("created_at", { ascending: false }),
      supabase.from("payments").select("inquiry_id, amount").eq("status", "success"),
    ]);

    const paidByInquiry = new Map<string, number>();
    for (const p of (paymentsRes.data ?? []) as { inquiry_id: string | null; amount: number }[]) {
      if (!p.inquiry_id) continue;
      paidByInquiry.set(p.inquiry_id, (paidByInquiry.get(p.inquiry_id) ?? 0) + Number(p.amount));
    }

    const now = new Date();
    const rows = ((inquiriesRes.data as Inquiry[]) ?? []).map((inquiry) => {
      const paid = paidByInquiry.get(inquiry.id) ?? 0;
      const price = inquiry.price || 1;
      const progress = Math.min(100, Math.round((paid / price) * 100));

      // Approximate "days behind" — no stored due-date schedule exists yet
      // (docs/VIZ_SPEC.md §6), so this reuses the same honest heuristic
      // already used on Dashboard: months elapsed since booking vs. how
      // many months' worth of installments the total paid actually covers.
      let daysBehind = 0;
      if (inquiry.monthly_payment && inquiry.booking_date && progress < 100) {
        const elapsed = monthsSince(inquiry.booking_date, now);
        const covered = paid / inquiry.monthly_payment;
        daysBehind = Math.max(0, Math.round((elapsed - covered) * 30));
      }

      return { inquiry, paid, progress, daysBehind };
    });
    setLedgers(rows);
    setLoading(false);
    setLastUpdated(new Date());
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalExpected = ledgers.reduce((sum, l) => sum + (l.inquiry.price || 0), 0);
  const totalCollected = ledgers.reduce((sum, l) => sum + l.paid, 0);
  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;
  const overdueCount = ledgers.filter((l) => l.daysBehind > 30).length;

  const outstandingVsCollected = useMemo(
    () => [
      { name: "Collected", value: totalCollected },
      { name: "Outstanding", value: Math.max(0, totalExpected - totalCollected) },
    ],
    [totalCollected, totalExpected],
  );

  const agingBuckets = useMemo(() => {
    const buckets = { "0-30": 0, "30-60": 0, "60-90": 0, "90+": 0 };
    for (const l of ledgers) {
      if (l.daysBehind <= 0) continue;
      if (l.daysBehind <= 30) buckets["0-30"] += 1;
      else if (l.daysBehind <= 60) buckets["30-60"] += 1;
      else if (l.daysBehind <= 90) buckets["60-90"] += 1;
      else buckets["90+"] += 1;
    }
    return Object.entries(buckets).map(([name, value]) => ({ name, value }));
  }, [ledgers]);

  const handleSendReminder = async (inquiryId: string) => {
    setReminderState((s) => ({ ...s, [inquiryId]: "sending" }));

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setReminderState((s) => ({ ...s, [inquiryId]: "error" }));
        return;
      }

      const result = await sendPaymentReminderFn({
        data: { callerAccessToken: accessToken, inquiryId },
      });
      setReminderState((s) => ({ ...s, [inquiryId]: result.success ? "sent" : "error" }));
    } catch {
      setReminderState((s) => ({ ...s, [inquiryId]: "error" }));
    }
  };

  const columns: ColumnDef<Ledger, any>[] = [
    {
      id: "client",
      header: "Client & Plot",
      accessorFn: (row) => row.inquiry.client_full_name,
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-[14px] text-primary-container">
            {row.original.inquiry.client_full_name}
          </div>
          <div className="text-[12px] text-on-surface-variant">
            {row.original.inquiry.phase_name} · Plot {row.original.inquiry.plot_number_ref}
          </div>
        </div>
      ),
    },
    {
      id: "price",
      header: "Agreed Price",
      accessorFn: (row) => row.inquiry.price || 0,
      cell: (info) => (
        <span className="font-semibold text-primary-container">
          {formatFromKes(info.getValue() as number, "KES")}
        </span>
      ),
    },
    {
      id: "paid",
      header: "Paid So Far",
      accessorFn: (row) => row.paid,
      cell: (info) => (
        <span className="font-semibold text-on-success-container">
          {formatFromKes(info.getValue() as number, "KES")}
        </span>
      ),
    },
    {
      id: "progress",
      header: "Progress",
      accessorFn: (row) => row.progress,
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-surface-container-low rounded-full overflow-hidden min-w-20">
            <div
              className={`h-full rounded-full ${
                row.original.progress === 100 ? "bg-available" : "bg-primary"
              }`}
              style={{ width: `${row.original.progress}%` }}
            />
          </div>
          <span className="text-[13px] font-semibold text-primary-container">
            {row.original.progress}%
          </span>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      accessorFn: (row) => row.daysBehind,
      cell: ({ row }) => {
        const { progress, daysBehind } = row.original;
        if (progress >= 100) return <StatusBadge tone="success">Paid in full</StatusBadge>;
        if (daysBehind > 30) return <StatusBadge tone="error">{daysBehind}d behind</StatusBadge>;
        if (daysBehind > 0) return <StatusBadge tone="warning">{daysBehind}d behind</StatusBadge>;
        return <StatusBadge tone="info">On track</StatusBadge>;
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const inquiryId = row.original.inquiry.id;
        const progress = row.original.progress;
        const state = reminderState[inquiryId];
        if (progress >= 100) {
          return (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-on-success-container">
              <Check size={13} /> Paid in full
            </span>
          );
        }
        return (
          <button
            onClick={() => handleSendReminder(inquiryId)}
            disabled={state === "sending"}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary-container text-on-secondary-container font-label-md text-xs rounded-lg hover:opacity-90 transition-all disabled:opacity-60"
          >
            <Send size={13} />
            {state === "sending"
              ? "Sending…"
              : state === "sent"
                ? "Reminder Sent"
                : state === "error"
                  ? "Retry Reminder"
                  : "Send Reminder"}
          </button>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary font-bold">
            Installment Tracker
          </h1>
          <p className="text-body-md text-on-surface-variant">
            Monitor progress of clients on installment payment plans.
          </p>
        </div>
        <FreshnessStamp updatedAt={lastUpdated} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Expected"
          value={loading ? "…" : formatFromKes(totalExpected, "KES")}
          icon={DollarSign}
        />
        <KpiCard
          label="Total Collected"
          value={loading ? "…" : formatFromKes(totalCollected, "KES")}
          icon={DollarSign}
          tone="success"
        />
        <KpiCard
          label="Collection Rate"
          value={loading ? "…" : `${collectionRate}%`}
          icon={TrendingUp}
          tone={collectionRate < 50 ? "warning" : "success"}
        />
        <KpiCard
          label="Overdue Clients"
          value={loading ? "…" : String(overdueCount)}
          icon={AlertTriangle}
          tone={overdueCount > 0 ? "warning" : "default"}
          sublabel="Approximate — no stored due-date schedule yet"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard title="Collection Rate">
          {loading ? (
            <Skeleton className="h-45 rounded-xl" />
          ) : (
            <Gauge value={collectionRate} label="Collected" height={200} />
          )}
        </SectionCard>
        <SectionCard title="Outstanding vs Collected">
          {loading ? (
            <Skeleton className="h-45 rounded-xl" />
          ) : (
            <CategoryBarChart
              data={outstandingVsCollected}
              xKey="name"
              yKey="value"
              height={200}
              valueFormatter={(v) => formatFromKes(v, "KES")}
            />
          )}
        </SectionCard>
        <SectionCard title="Aging Buckets (Approximate)">
          {loading ? (
            <Skeleton className="h-45 rounded-xl" />
          ) : agingBuckets.every((b) => b.value === 0) ? (
            <EmptyState title="No overdue clients" description="Everyone is on track." />
          ) : (
            <CategoryBarChart
              data={agingBuckets}
              xKey="name"
              yKey="value"
              height={200}
              color="var(--destructive)"
            />
          )}
        </SectionCard>
      </div>

      <div className="luxury-card rounded-xl shadow-sm overflow-hidden bg-white">
        <div className="px-6 py-4 border-b border-outline-variant/30">
          <h2 className="font-headline-md text-sm text-primary font-bold">Payment Ledger</h2>
        </div>
        {loading ? (
          <Skeleton className="h-64 rounded-xl m-4" />
        ) : (
          <AdminDataTable
            columns={columns}
            data={ledgers}
            emptyMessage="No clients on an installment plan."
          />
        )}
      </div>
    </div>
  );
}
