/**
 * Gatepath Realtors — Agent Performance (VIZ_BLUEPRINT Phase 2, Slice 7;
 * interaction-log KPIs added Phase 10 follow-up)
 * First token migration off the Phase 5A mechanical-split residue (raw
 * inline style={{}}, hardcoded NAVY/GOLD/CANVAS/CARD_BORDER hex) — same
 * situation Closed Deals was in before its redesign. Team conversion % and
 * revenue contribution are real (via the existing cro_name-to-admin_users
 * text match already used here). Avg response time and Total Activities
 * are now also real, backed by interaction_log (Phase 10): response time
 * is measured from an inquiry's created_at to whichever staff member's
 * interaction_log entry is earliest for that inquiry — matched by email,
 * a real join, not the fragile cro_name text match. Composite score and
 * goal-vs-actual still need a scoring formula / agent_goals table that
 * doesn't exist — skipped, not faked.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Users,
  CheckCircle,
  Trophy,
  TrendingUp,
  DollarSign,
  Clock,
  Activity,
  PhoneCall,
} from "lucide-react";
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
import type { AdminUser, Inquiry, Agreement, InteractionLog } from "@/lib/types";

function formatDuration(ms: number): string {
  const mins = ms / 60000;
  if (mins < 60) return `${Math.round(mins)}m`;
  const hours = mins / 60;
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

export const Route = createFileRoute("/admin/agents")({
  component: AgentPerformance,
});

interface AgentRow {
  agent: AdminUser;
  assignedLeads: number;
  closedDeals: number;
  revenue: number;
  conversionRate: number;
  totalActivities: number;
  avgResponseMs: number | null;
  callsLogged: number;
  connectRate: number | null;
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
  const [interactions, setInteractions] = useState<InteractionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [staffRes, inquiriesRes, agreementsRes, paymentsRes, interactionsRes] =
        await Promise.all([
          supabase.from("admin_users").select("*").order("role"),
          supabase.from("inquiries").select("*"),
          supabase.from("agreements").select("*"),
          supabase
            .from("payments")
            .select("inquiry_id, amount, created_at")
            .eq("status", "success"),
          supabase.from("interaction_log").select("*"),
        ]);

      setStaff((staffRes.data as AdminUser[]) ?? []);
      setInquiries((inquiriesRes.data as Inquiry[]) ?? []);
      setAgreements((agreementsRes.data as Agreement[]) ?? []);
      setPayments((paymentsRes.data as typeof payments) ?? []);
      setInteractions((interactionsRes.data as InteractionLog[]) ?? []);
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

  // First-touch per inquiry (earliest interaction_log row) — who responded
  // first and how long it took, keyed by email (a real join, unlike the
  // fragile cro_name text match used for lead assignment above).
  const firstTouchByInquiry = useMemo(() => {
    const m = new Map<string, InteractionLog>();
    for (const entry of interactions) {
      const existing = m.get(entry.inquiry_id);
      if (!existing || entry.occurred_at < existing.occurred_at) {
        m.set(entry.inquiry_id, entry);
      }
    }
    return m;
  }, [interactions]);

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

        const totalActivities = interactions.filter(
          (i) => i.logged_by_email === agent.email,
        ).length;

        const responseDeltas: number[] = [];
        for (const inq of inquiries) {
          const firstTouch = firstTouchByInquiry.get(inq.id);
          if (!firstTouch || firstTouch.logged_by_email !== agent.email) continue;
          const delta =
            new Date(firstTouch.occurred_at).getTime() - new Date(inq.created_at).getTime();
          if (delta >= 0) responseDeltas.push(delta);
        }
        const avgResponseMs =
          responseDeltas.length > 0
            ? responseDeltas.reduce((a, b) => a + b, 0) / responseDeltas.length
            : null;

        // Module 11 — Telephony: calls this agent logged and what fraction
        // actually connected. null (not 0%) when they've logged zero calls,
        // so an untouched agent doesn't misleadingly read as "never connects".
        const agentCalls = interactions.filter(
          (i) => i.channel === "call" && i.logged_by_email === agent.email,
        );
        const callsLogged = agentCalls.length;
        const connectedCalls = agentCalls.filter((i) => i.call_outcome === "connected").length;
        const connectRate =
          callsLogged > 0 ? Math.round((connectedCalls / callsLogged) * 100) : null;

        return {
          agent,
          assignedLeads: agentLeads.length,
          closedDeals: closed.length,
          revenue,
          conversionRate,
          totalActivities,
          avgResponseMs,
          callsLogged,
          connectRate,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [staff, inquiries, agreements, paidByInquiry, interactions, firstTouchByInquiry]);

  // Flat average across every agent-attributed first-touch delta — not an
  // average of per-agent averages, which would be skewed by agents with
  // very different first-touch counts.
  const teamAvgResponseMs = useMemo(() => {
    const agentEmails = new Set(agentRows.map((a) => a.agent.email));
    const deltas: number[] = [];
    for (const inq of inquiries) {
      const firstTouch = firstTouchByInquiry.get(inq.id);
      if (!firstTouch?.logged_by_email || !agentEmails.has(firstTouch.logged_by_email)) continue;
      const delta = new Date(firstTouch.occurred_at).getTime() - new Date(inq.created_at).getTime();
      if (delta >= 0) deltas.push(delta);
    }
    return deltas.length > 0 ? deltas.reduce((a, b) => a + b, 0) / deltas.length : null;
  }, [agentRows, inquiries, firstTouchByInquiry]);

  // Team-wide connect rate — aggregate connected/total across every agent's
  // logged calls, not an average of per-agent rates (same skew reasoning
  // already applied to teamAvgResponseMs above).
  const teamConnectRate = useMemo(() => {
    const teamCalls = interactions.filter(
      (i) => i.channel === "call" && agentRows.some((a) => a.agent.email === i.logged_by_email),
    );
    if (teamCalls.length === 0) return null;
    const connected = teamCalls.filter((i) => i.call_outcome === "connected").length;
    return Math.round((connected / teamCalls.length) * 100);
  }, [interactions, agentRows]);

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
    {
      id: "totalActivities",
      header: "Total Activities",
      accessorFn: (row) => row.totalActivities,
      cell: (info) => (
        <div className="flex items-center gap-2 text-on-surface">
          <Activity size={15} className="text-on-surface-variant" /> {info.getValue() as number}
        </div>
      ),
    },
    {
      id: "avgResponseMs",
      header: "Avg Response Time",
      accessorFn: (row) => row.avgResponseMs ?? -1,
      cell: ({ row }) => (
        <span className="text-[13px] text-on-surface-variant">
          {row.original.avgResponseMs === null
            ? "No data yet"
            : formatDuration(row.original.avgResponseMs)}
        </span>
      ),
    },
    {
      id: "callsLogged",
      header: "Calls Logged",
      accessorFn: (row) => row.callsLogged,
      cell: (info) => (
        <div className="flex items-center gap-2 text-on-surface">
          <PhoneCall size={15} className="text-on-surface-variant" /> {info.getValue() as number}
        </div>
      ),
    },
    {
      id: "connectRate",
      header: "Connect Rate",
      accessorFn: (row) => row.connectRate ?? -1,
      cell: ({ row }) => (
        <span className="text-[13px] text-on-surface-variant">
          {row.original.connectRate === null ? "No calls yet" : `${row.original.connectRate}%`}
        </span>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
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
        <KpiCard
          label="Avg Response Time"
          value={
            loading
              ? "…"
              : teamAvgResponseMs === null
                ? "No data yet"
                : formatDuration(teamAvgResponseMs)
          }
          icon={Clock}
        />
        <KpiCard
          label="Team Connect Rate"
          value={loading ? "…" : teamConnectRate === null ? "No calls yet" : `${teamConnectRate}%`}
          icon={PhoneCall}
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
