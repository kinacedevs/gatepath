/**
 * Gatepath Realtors — Agent Performance (VIZ_BLUEPRINT Phase 2, Slice 7)
 * First token migration off the Phase 5A mechanical-split residue (raw
 * inline style={{}}, hardcoded NAVY/GOLD/CANVAS/CARD_BORDER hex) — same
 * situation Closed Deals was in before its redesign. Per docs/VIZ_SPEC.md
 * §3, this is honestly one of the thinner slices: team conversion % and
 * revenue contribution are real (via the existing cro_name-to-admin_users
 * text match already used here), but avg response time, composite score,
 * activity heatmap, and goal-vs-actual all need an interaction-log/goals
 * schema that doesn't exist — skipped, not faked.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Users, CheckCircle, Trophy, TrendingUp, DollarSign } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatFromKes } from "@/lib/currency";
import { KpiCard } from "@/components/admin/KpiCard";
import { SectionCard } from "@/components/admin/SectionCard";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { FreshnessStamp } from "@/components/admin/FreshnessStamp";
import { Gauge } from "@/components/admin/Gauge";
import { CategoryBarChart } from "@/components/admin/charts/CategoryBarChart";
import { TrendChart } from "@/components/admin/charts/TrendChart";
import { Skeleton } from "@/components/ui/skeleton";
import type { ColumnDef } from "@tanstack/react-table";
import type { AdminUser, Inquiry, Agreement } from "@/lib/types";

export const Route = createFileRoute("/admin/agents")({
  component: AgentPerformance,
});

interface AgentRow {
  agent: AdminUser;
  assignedLeads: number;
  closedDeals: number;
  revenue: number;
  conversionRate: number;
}

function monthLabel(d: Date) {
  return d.toLocaleDateString("en-KE", { day: "numeric", month: "short" });
}

function AgentPerformance() {
  const [staff, setStaff] = useState<AdminUser[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [payments, setPayments] = useState<
    { inquiry_id: string | null; amount: number; created_at: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [staffRes, inquiriesRes, agreementsRes, paymentsRes] = await Promise.all([
        supabase.from("admin_users").select("*").order("role"),
        supabase.from("inquiries").select("*"),
        supabase.from("agreements").select("*"),
        supabase.from("payments").select("inquiry_id, amount, created_at").eq("status", "success"),
      ]);

      setStaff((staffRes.data as AdminUser[]) ?? []);
      setInquiries((inquiriesRes.data as Inquiry[]) ?? []);
      setAgreements((agreementsRes.data as Agreement[]) ?? []);
      setPayments((paymentsRes.data as typeof payments) ?? []);
    } catch (err) {
      console.error("Error loading agent performance data:", err);
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const paidByInquiry = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of payments) {
      if (!p.inquiry_id) continue;
      m.set(p.inquiry_id, (m.get(p.inquiry_id) ?? 0) + Number(p.amount));
    }
    return m;
  }, [payments]);

  const agentRows: AgentRow[] = useMemo(() => {
    return staff
      .filter((s) => s.role === "agent")
      .map((agent) => {
        const agentLeads = inquiries.filter(
          (inq) => inq.cro_name === agent.full_name || inq.cro_name === agent.email,
        );
        const closed = agentLeads.filter((inq) =>
          agreements.some((a) => a.inquiry_id === inq.id && a.ceo_signed),
        );
        const revenue = agentLeads.reduce((sum, inq) => sum + (paidByInquiry.get(inq.id) ?? 0), 0);
        const conversionRate =
          agentLeads.length > 0 ? Math.round((closed.length / agentLeads.length) * 100) : 0;
        return {
          agent,
          assignedLeads: agentLeads.length,
          closedDeals: closed.length,
          revenue,
          conversionRate,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [staff, inquiries, agreements, paidByInquiry]);

  const totalAgents = agentRows.length;
  const teamRevenue = agentRows.reduce((sum, a) => sum + a.revenue, 0);
  const teamAssigned = agentRows.reduce((sum, a) => sum + a.assignedLeads, 0);
  const teamClosed = agentRows.reduce((sum, a) => sum + a.closedDeals, 0);
  const teamConversionRate = teamAssigned > 0 ? Math.round((teamClosed / teamAssigned) * 100) : 0;
  const topPerformer = agentRows[0];

  const leaderboardData = useMemo(
    () => agentRows.map((a) => ({ name: a.agent.full_name || a.agent.email, value: a.revenue })),
    [agentRows],
  );

  // Team revenue trend — aggregate across all agent-matched payments, not
  // fragile per-agent sparklines (would need one mini-chart per table row
  // for marginal gain; skipped as needless complexity, not a capability gap).
  const teamRevenueTrend = useMemo(() => {
    const agentInquiryIds = new Set(
      agentRows.flatMap((a) =>
        inquiries
          .filter((inq) => inq.cro_name === a.agent.full_name || inq.cro_name === a.agent.email)
          .map((inq) => inq.id),
      ),
    );
    const now = new Date();
    const weekBuckets = new Map<string, number>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      weekBuckets.set(monthLabel(d), 0);
    }
    const weekKeys = Array.from(weekBuckets.keys());
    for (const p of payments) {
      if (!p.inquiry_id || !agentInquiryIds.has(p.inquiry_id)) continue;
      const paidDate = new Date(p.created_at);
      const weeksAgo = Math.floor((now.getTime() - paidDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
      const idx = weekKeys.length - 1 - weeksAgo;
      if (idx >= 0 && idx < weekKeys.length) {
        const key = weekKeys[idx];
        weekBuckets.set(key, (weekBuckets.get(key) ?? 0) + Number(p.amount));
      }
    }
    return Array.from(weekBuckets.entries()).map(([week, value]) => ({ week, value }));
  }, [agentRows, inquiries, payments]);

  const columns: ColumnDef<AgentRow, any>[] = [
    {
      id: "agent",
      header: "Agent",
      accessorFn: (row) => row.agent.full_name || row.agent.email,
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center text-primary-container font-bold text-sm shrink-0">
            {(row.original.agent.full_name || row.original.agent.email).charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-[14px] text-primary-container">
              {row.original.agent.full_name || "Unknown"}
            </div>
            <div className="text-[12px] text-on-surface-variant">{row.original.agent.email}</div>
          </div>
        </div>
      ),
    },
    {
      id: "assignedLeads",
      header: "Assigned Leads",
      accessorFn: (row) => row.assignedLeads,
      cell: (info) => (
        <div className="flex items-center gap-2 text-on-surface">
          <Users size={15} className="text-on-surface-variant" /> {info.getValue() as number}
        </div>
      ),
    },
    {
      id: "closedDeals",
      header: "Closed Deals",
      accessorFn: (row) => row.closedDeals,
      cell: (info) => (
        <div className="flex items-center gap-2 font-semibold text-on-success-container">
          <CheckCircle size={15} /> {info.getValue() as number}
        </div>
      ),
    },
    {
      id: "revenue",
      header: "Revenue Contribution",
      accessorFn: (row) => row.revenue,
      cell: (info) => (
        <span className="font-semibold text-secondary">
          {formatFromKes(info.getValue() as number, "KES")}
        </span>
      ),
    },
    {
      id: "conversionRate",
      header: "Conversion Rate",
      accessorFn: (row) => row.conversionRate,
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-surface-container-low rounded-full overflow-hidden min-w-20">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${row.original.conversionRate}%` }}
            />
          </div>
          <span className="text-[13px] font-semibold text-primary-container">
            {row.original.conversionRate}%
          </span>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary font-bold">
            Agent Performance
          </h1>
          <p className="text-body-md text-on-surface-variant">
            Monitor sales performance and lead conversion rates for all registered agents.
          </p>
        </div>
        <FreshnessStamp updatedAt={lastUpdated} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Agents" value={loading ? "…" : String(totalAgents)} icon={Users} />
        <KpiCard
          label="Team Conversion Rate"
          value={loading ? "…" : `${teamConversionRate}%`}
          icon={TrendingUp}
          tone="success"
        />
        <KpiCard
          label="Team Revenue"
          value={loading ? "…" : formatFromKes(teamRevenue, "KES")}
          icon={DollarSign}
        />
        <KpiCard
          label="Top Performer"
          value={loading ? "…" : topPerformer?.agent.full_name || topPerformer?.agent.email || "—"}
          icon={Trophy}
          tone="success"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard title="Team Conversion Rate">
          {loading ? (
            <Skeleton className="h-45 rounded-xl" />
          ) : (
            <Gauge value={teamConversionRate} label="Converted" height={200} />
          )}
        </SectionCard>
        <SectionCard title="Agent Leaderboard">
          {loading ? (
            <Skeleton className="h-45 rounded-xl" />
          ) : leaderboardData.length === 0 ? (
            <EmptyState title="No agents yet" />
          ) : (
            <CategoryBarChart
              data={leaderboardData}
              xKey="name"
              yKey="value"
              height={200}
              horizontal
              valueFormatter={(v) => formatFromKes(v, "KES")}
            />
          )}
        </SectionCard>
        <SectionCard title="Team Revenue — Last 6 Weeks">
          {loading ? (
            <Skeleton className="h-45 rounded-xl" />
          ) : (
            <TrendChart
              data={teamRevenueTrend}
              xKey="week"
              yKey="value"
              height={200}
              valueFormatter={(v) => formatFromKes(v, "KES")}
            />
          )}
        </SectionCard>
      </div>

      <div className="luxury-card rounded-xl shadow-sm overflow-hidden bg-white">
        <div className="px-6 py-4 border-b border-outline-variant/30">
          <h2 className="font-headline-md text-sm text-primary font-bold">Agent Roster</h2>
        </div>
        {loading ? (
          <Skeleton className="h-64 rounded-xl m-4" />
        ) : (
          <AdminDataTable
            columns={columns}
            data={agentRows}
            emptyMessage="No agents registered yet."
          />
        )}
      </div>
    </div>
  );
}
