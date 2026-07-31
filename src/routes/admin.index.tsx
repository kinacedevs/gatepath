/**
 * Gatepath Realtors — Admin Dashboard (VIZ_BLUEPRINT Phase 2, Slice 1)
 * Adds the two missing KPIs (Collection Rate %, Active Leads), a collection-
 * rate Gauge, a lead-stage FunnelChart, a 6-month collected-revenue
 * TrendChart, a coarse agent leaderboard mini, and a real Urgent Task
 * Escalations feed — all real, scoped Supabase queries, no fabricated
 * numbers. Plot inventory stays the existing 3-card summary rather than the
 * single-phase PlotMap SVG grid (see docs/VIZ_SPEC.md and the Phase 2
 * Slice 1 plan note — PlotMap has no multi-phase aggregate mode; it belongs
 * on the Plot Inventory tab, not here), with a small donut added alongside
 * it instead. Realtime + drill-downs are VIZ_BLUEPRINT Phase 3 — not this
 * slice.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DollarSign, Calendar, MapPin, AlertTriangle, TrendingUp, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatFromKes } from "@/lib/currency";
import { KpiCard } from "@/components/admin/KpiCard";
import { SectionCard } from "@/components/admin/SectionCard";
import { EscalationCard } from "@/components/admin/EscalationCard";
import { EmptyState } from "@/components/admin/EmptyState";
import { FreshnessStamp } from "@/components/admin/FreshnessStamp";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { Gauge } from "@/components/admin/Gauge";
import { TrendChart } from "@/components/admin/charts/TrendChart";
import { FunnelChart } from "@/components/admin/charts/FunnelChart";
import { SplitDonutChart } from "@/components/admin/charts/SplitDonutChart";
import { Skeleton } from "@/components/ui/skeleton";
import type { ColumnDef } from "@tanstack/react-table";
import type { Inquiry } from "@/lib/types";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

interface PlotInventoryTotals {
  available: number;
  booked: number;
  sold: number;
}

interface AgentRow {
  name: string;
  revenue: number;
}

interface Escalation {
  id: string;
  title: string;
  description: string;
  urgency: "warning" | "error";
  actionLabel: string;
  onAction: () => void;
}

const FUNNEL_LABELS: Record<string, string> = {
  pending: "New",
  reviewed: "In Review",
  approved: "Won",
  rejected: "Lost",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function monthLabel(d: Date) {
  return d.toLocaleDateString("en-KE", { month: "short" });
}

function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [totalSalesThisMonth, setTotalSalesThisMonth] = useState(0);
  const [siteVisitsToday, setSiteVisitsToday] = useState(0);
  const [inventory, setInventory] = useState<PlotInventoryTotals>({
    available: 0,
    booked: 0,
    sold: 0,
  });
  const [overdueCount, setOverdueCount] = useState(0);
  const [collectionRatePct, setCollectionRatePct] = useState(0);
  const [activeLeadsCount, setActiveLeadsCount] = useState(0);

  const [funnelData, setFunnelData] = useState<{ name: string; value: number }[]>([]);
  const [trendData, setTrendData] = useState<{ month: string; collected: number }[]>([]);
  const [projectedNextMonth, setProjectedNextMonth] = useState(0);
  const [leaderboard, setLeaderboard] = useState<AgentRow[]>([]);
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [recentInquiries, setRecentInquiries] = useState<Inquiry[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();
      const today = now.toISOString().slice(0, 10);

      const [
        salesRes,
        visitsRes,
        phasesRes,
        allInquiriesRes,
        allPaymentsRes,
        recentRes,
        adminUsersRes,
        pendingBookingsRes,
      ] = await Promise.all([
        supabase
          .from("payments")
          .select("amount")
          .eq("status", "success")
          .gte("created_at", startOfMonth),
        supabase
          .from("bookings")
          .select("*", { count: "exact", head: true })
          .eq("visit_date", today),
        supabase.from("phases").select("available_count, booked_count, sold_count"),
        supabase.from("inquiries").select("*"),
        supabase
          .from("payments")
          .select("inquiry_id, amount, status, created_at")
          .eq("status", "success")
          .gte("created_at", sixMonthsAgo),
        supabase.from("inquiries").select("*").order("created_at", { ascending: false }).limit(4),
        supabase.from("admin_users").select("id, full_name, email"),
        supabase
          .from("bookings")
          .select("id, inquiry_id, visit_date, status")
          .eq("status", "pending")
          .lt("visit_date", today),
      ]);

      if (cancelled) return;

      // ── Existing 4 KPIs ──
      const salesRows = (salesRes.data ?? []) as { amount: number }[];
      setTotalSalesThisMonth(salesRows.reduce((sum, p) => sum + Number(p.amount), 0));
      setSiteVisitsToday(visitsRes.count ?? 0);

      const phaseRows = (phasesRes.data ?? []) as {
        available_count: number | null;
        booked_count: number | null;
        sold_count: number | null;
      }[];
      const totals = phaseRows.reduce(
        (acc, p) => ({
          available: acc.available + (p.available_count ?? 0),
          booked: acc.booked + (p.booked_count ?? 0),
          sold: acc.sold + (p.sold_count ?? 0),
        }),
        { available: 0, booked: 0, sold: 0 },
      );
      setInventory(totals);

      const inquiries = (allInquiriesRes.data as Inquiry[]) ?? [];
      const payments =
        (allPaymentsRes.data as {
          inquiry_id: string | null;
          amount: number;
          created_at: string;
        }[]) ?? [];

      const paidByInquiry = new Map<string, number>();
      for (const p of payments) {
        if (!p.inquiry_id) continue;
        paidByInquiry.set(p.inquiry_id, (paidByInquiry.get(p.inquiry_id) ?? 0) + Number(p.amount));
      }

      const monthsSince = (isoDate: string) => {
        const then = new Date(isoDate);
        const months =
          (now.getFullYear() - then.getFullYear()) * 12 + (now.getMonth() - then.getMonth());
        return Math.max(0, months);
      };

      const installmentInquiries = inquiries.filter((i) => i.terms_of_payment === "installment");

      let overdue = 0;
      const overdueList: { inquiry: Inquiry; shortfall: number }[] = [];
      for (const inq of installmentInquiries) {
        if (!inq.monthly_payment || !inq.booking_date) continue;
        const expected = inq.monthly_payment * monthsSince(inq.booking_date);
        const actual = paidByInquiry.get(inq.id) ?? 0;
        const shortfall = expected - actual;
        if (shortfall > inq.monthly_payment) {
          overdue += 1;
          overdueList.push({ inquiry: inq, shortfall });
        }
      }
      setOverdueCount(overdue);

      // ── New KPI: Collection Rate % ──
      const totalExpected = installmentInquiries.reduce((sum, i) => sum + (i.price ?? 0), 0);
      const totalCollected = installmentInquiries.reduce(
        (sum, i) => sum + (paidByInquiry.get(i.id) ?? 0),
        0,
      );
      setCollectionRatePct(
        totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0,
      );

      // ── New KPI: Active Leads ──
      setActiveLeadsCount(
        inquiries.filter((i) => i.status === "pending" || i.status === "reviewed").length,
      );

      // ── Lead funnel snapshot ──
      const statusCounts: Record<string, number> = {
        pending: 0,
        reviewed: 0,
        approved: 0,
        rejected: 0,
      };
      for (const i of inquiries) {
        if (i.status in statusCounts) statusCounts[i.status] += 1;
      }
      setFunnelData(
        Object.entries(statusCounts).map(([status, value]) => ({
          name: FUNNEL_LABELS[status] ?? status,
          value,
        })),
      );

      // ── 6-month collected-revenue trend + a simple next-month projection ──
      const monthBuckets = new Map<string, number>();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthBuckets.set(`${d.getFullYear()}-${d.getMonth()}`, 0);
      }
      for (const p of payments) {
        const d = new Date(p.created_at);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (monthBuckets.has(key)) {
          monthBuckets.set(key, (monthBuckets.get(key) ?? 0) + Number(p.amount));
        }
      }
      setTrendData(
        Array.from(monthBuckets.entries()).map(([key, collected]) => {
          const [y, m] = key.split("-").map(Number);
          return { month: monthLabel(new Date(y, m, 1)), collected };
        }),
      );
      // Simple first-pass projection: sum of monthly_payment across
      // still-outstanding installment plans — a flat estimate, not a real
      // forecasting model (docs/VIZ_SPEC.md flags this metric 🟡 Partial).
      const projected = installmentInquiries.reduce((sum, i) => {
        const paid = paidByInquiry.get(i.id) ?? 0;
        const stillOwing = (i.price ?? 0) - paid > 0;
        return stillOwing ? sum + (i.monthly_payment ?? 0) : sum;
      }, 0);
      setProjectedNextMonth(projected);

      // ── Agent leaderboard mini (top 5 by revenue) ──
      // Same cro_name-text-match-to-admin_users join already used in
      // admin.agents.tsx — coarse (no real assigned_agent_id FK yet, see
      // docs/VIZ_SPEC.md), but real, not fabricated.
      const adminUsers =
        (adminUsersRes.data as { id: string; full_name: string | null; email: string }[]) ?? [];
      const revenueByAgentName = new Map<string, number>();
      for (const inq of inquiries) {
        if (!inq.cro_name) continue;
        const paid = paidByInquiry.get(inq.id) ?? 0;
        revenueByAgentName.set(inq.cro_name, (revenueByAgentName.get(inq.cro_name) ?? 0) + paid);
      }
      const board: AgentRow[] = adminUsers
        .map((a) => ({
          name: a.full_name || a.email,
          revenue: revenueByAgentName.get(a.full_name || "") ?? 0,
        }))
        .filter((a) => a.revenue > 0)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
      setLeaderboard(board);

      // ── Urgent Task Escalations ──
      const inquiryById = new Map(inquiries.map((i) => [i.id, i]));
      const pendingBookings =
        (pendingBookingsRes.data as {
          id: string;
          inquiry_id: string | null;
          visit_date: string | null;
        }[]) ?? [];
      const newEscalations: Escalation[] = [];
      for (const { inquiry, shortfall } of overdueList.slice(0, 3)) {
        newEscalations.push({
          id: `installment-${inquiry.id}`,
          title: `${inquiry.client_full_name} is behind on payments`,
          description: `Expected shortfall of ${formatFromKes(shortfall, "KES")} vs the agreed schedule.`,
          urgency: "warning",
          actionLabel: "Open Tracker",
          onAction: () => navigate({ to: "/admin/installments" }),
        });
      }
      for (const b of pendingBookings.slice(0, 3)) {
        const inq = b.inquiry_id ? inquiryById.get(b.inquiry_id) : undefined;
        newEscalations.push({
          id: `booking-${b.id}`,
          title: `Visit never confirmed — ${b.visit_date}`,
          description: `${inq?.client_full_name ?? "A client"}'s site visit is past its date with no confirmation.`,
          urgency: "error",
          actionLabel: "Open Site Visits",
          onAction: () => navigate({ to: "/admin/bookings" }),
        });
      }
      setEscalations(newEscalations);

      setRecentInquiries((recentRes.data as Inquiry[]) ?? []);
      setLoading(false);
      setLastUpdated(new Date());
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const leaderboardColumns: ColumnDef<AgentRow, any>[] = [
    { accessorKey: "name", header: "Agent" },
    {
      accessorKey: "revenue",
      header: "Revenue",
      cell: (info) => formatFromKes(info.getValue() as number, "KES"),
    },
  ];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-headline-md text-headline-md text-primary font-bold">Dashboard</h1>
          <p className="text-body-md text-on-surface-variant">
            Real-time operations overview — Gatepath Realtors CRM
          </p>
        </div>
        <FreshnessStamp updatedAt={lastUpdated} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard
          label="Total Sales This Month"
          value={loading ? "…" : formatFromKes(totalSalesThisMonth, "KES")}
          icon={DollarSign}
          sublabel="Confirmed payments"
        />
        <KpiCard
          label="Collection Rate"
          value={loading ? "…" : `${collectionRatePct}%`}
          icon={TrendingUp}
          tone={collectionRatePct < 50 ? "warning" : "success"}
        />
        <KpiCard
          label="Active Leads"
          value={loading ? "…" : String(activeLeadsCount)}
          icon={Users}
        />
        <KpiCard
          label="Site Visits Today"
          value={loading ? "…" : String(siteVisitsToday)}
          icon={Calendar}
        />
        <KpiCard
          label="Plots Available"
          value={loading ? "…" : String(inventory.available)}
          icon={MapPin}
          tone="success"
          sublabel={`${inventory.booked} booked · ${inventory.sold} sold`}
        />
        <KpiCard
          label="Overdue Installments"
          value={loading ? "…" : String(overdueCount)}
          icon={AlertTriangle}
          tone={overdueCount > 0 ? "warning" : "default"}
          sublabel="Approximate — see Installment Tracker"
        />
      </div>

      {!loading && escalations.length > 0 && (
        <div className="flex flex-col gap-2">
          {escalations.map((e) => (
            <EscalationCard
              key={e.id}
              title={e.title}
              description={e.description}
              urgency={e.urgency}
              actionLabel={e.actionLabel}
              onAction={e.onAction}
            />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Collection Rate">
          {loading ? (
            <Skeleton className="h-[220px] rounded-xl" />
          ) : (
            <Gauge value={collectionRatePct} label="Collected" />
          )}
        </SectionCard>
        <SectionCard title="Lead Pipeline Snapshot">
          {loading ? (
            <Skeleton className="h-[240px] rounded-xl" />
          ) : funnelData.every((f) => f.value === 0) ? (
            <EmptyState title="No leads yet" description="New inquiries will appear here." />
          ) : (
            <FunnelChart data={funnelData} />
          )}
        </SectionCard>
      </div>

      <SectionCard title="Revenue Collected — Last 6 Months">
        {loading ? (
          <Skeleton className="h-[220px] rounded-xl" />
        ) : (
          <>
            <TrendChart
              data={trendData}
              xKey="month"
              yKey="collected"
              valueFormatter={(v) => formatFromKes(v, "KES")}
            />
            <p className="text-xs text-on-surface-variant mt-3">
              Projected next month (active installment schedules only, not a full forecast model):{" "}
              <span className="font-semibold text-primary-container">
                {formatFromKes(projectedNextMonth, "KES")}
              </span>
            </p>
          </>
        )}
      </SectionCard>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-[40%] luxury-card rounded-xl flex flex-col">
          <div className="p-6 border-b border-outline-variant flex justify-between items-center">
            <h2 className="font-headline-md text-headline-md text-primary font-bold">
              Global Plot Inventory
            </h2>
            <Link
              to="/admin/plots"
              className="px-4 py-2 border border-secondary text-secondary font-label-md text-label-md rounded-lg hover:bg-secondary-fixed transition-colors"
            >
              Manage Inventory
            </Link>
          </div>
          <div className="p-6 grid grid-cols-2 gap-4 items-center">
            <div className="grid grid-cols-1 gap-3">
              {[
                { label: "Available", count: inventory.available, tone: "success" as const },
                { label: "Booked", count: inventory.booked, tone: "warning" as const },
                { label: "Sold", count: inventory.sold, tone: "info" as const },
              ].map((row) => (
                <div
                  key={row.label}
                  className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-3 flex items-center justify-between"
                >
                  <span className="font-label-md text-[12px] text-on-surface-variant uppercase tracking-wider">
                    {row.label}
                  </span>
                  <span className="font-stat-lg text-[22px] text-primary-container">
                    {row.count}
                  </span>
                </div>
              ))}
            </div>
            {loading ? (
              <Skeleton className="h-[160px] rounded-xl" />
            ) : inventory.available + inventory.booked + inventory.sold === 0 ? (
              <EmptyState title="No inventory yet" />
            ) : (
              <SplitDonutChart
                height={180}
                data={[
                  { name: "Available", value: inventory.available },
                  { name: "Booked", value: inventory.booked },
                  { name: "Sold", value: inventory.sold },
                ]}
              />
            )}
          </div>
        </div>

        <div className="lg:w-[30%] luxury-card rounded-xl flex flex-col">
          <div className="p-6 border-b border-outline-variant flex justify-between items-center">
            <h2 className="font-headline-md text-headline-md text-primary font-bold">Top Agents</h2>
            <Link
              to="/admin/agents"
              className="text-[12px] text-secondary font-label-md hover:underline"
            >
              View All
            </Link>
          </div>
          <div className="p-2">
            {loading ? (
              <div className="p-4 space-y-2">
                <Skeleton className="h-8 rounded-lg" />
                <Skeleton className="h-8 rounded-lg" />
                <Skeleton className="h-8 rounded-lg" />
              </div>
            ) : leaderboard.length === 0 ? (
              <EmptyState
                title="No agent revenue yet"
                description="Assign agents to inquiries to see them ranked here."
              />
            ) : (
              <AdminDataTable columns={leaderboardColumns} data={leaderboard} />
            )}
          </div>
        </div>

        <div className="lg:w-[30%] luxury-card rounded-xl flex flex-col">
          <div className="p-6 border-b border-outline-variant flex justify-between items-center">
            <h2 className="font-headline-md text-headline-md text-primary font-bold">
              Recent Inquiries
            </h2>
            <Link
              to="/admin/inquiries"
              className="text-[12px] text-secondary font-label-md hover:underline"
            >
              View All
            </Link>
          </div>
          <div className="flex-1 p-6 space-y-3">
            {recentInquiries.map((inq) => (
              <Link
                key={inq.id}
                to="/admin/inquiries"
                className="flex items-center gap-3 p-3 rounded-lg border border-outline-variant hover:bg-surface-container-low cursor-pointer transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary-deep font-bold text-sm shrink-0">
                  {getInitials(inq.client_full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-label-md text-[13px] text-primary truncate">
                    {inq.client_full_name}
                  </p>
                  <p className="text-[11px] text-on-surface-variant truncate">
                    {inq.phase_name || "Any Phase"}
                  </p>
                </div>
                <span
                  className={`text-[9px] font-bold uppercase px-2 py-1 rounded ${
                    inq.status === "pending"
                      ? "bg-warning-container/15 text-on-warning-container"
                      : "bg-success-container/15 text-on-success-container"
                  }`}
                >
                  {inq.status}
                </span>
              </Link>
            ))}
            {!loading && recentInquiries.length === 0 && (
              <div className="text-center text-on-surface-variant text-[13px] py-4">
                No recent inquiries
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
