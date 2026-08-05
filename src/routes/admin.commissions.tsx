/**
 * Gatepath Realtors — Commission & Payout Tracking (Part 2, Module 12)
 * Viewable by any staff role (Agent Performance already shows every agent's
 * revenue/conversion openly). Setting a rate, marking a payout paid, and
 * sending a statement are all CEO/manager only — compensation-
 * administration actions, gated in commissionActions.ts server-side (this
 * screen also hides the controls client-side for a clean UI, but the real
 * enforcement is server-side).
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Banknote, Wallet, Clock, UserCheck2, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatFromKes } from "@/lib/currency";
import { useAdminSession } from "@/context/AdminSessionContext";
import { computeAgentCommissions, type AgentCommissionSummary } from "@/lib/commissions";
import {
  updateAgentCommissionRateFn,
  markCommissionPaidFn,
  sendCommissionStatementFn,
} from "@/lib/commissionActions";
import { KpiCard } from "@/components/admin/KpiCard";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { FreshnessStamp } from "@/components/admin/FreshnessStamp";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { ColumnDef } from "@tanstack/react-table";
import type { AdminUser } from "@/lib/types";

export const Route = createFileRoute("/admin/commissions")({
  component: Commissions,
});

interface RateEditTarget {
  id: string;
  email: string;
  full_name: string | null;
  commission_rate: number | null;
}

function Commissions() {
  const { adminRole } = useAdminSession();
  const canManage = adminRole === "ceo" || adminRole === "manager";

  const [agents, setAgents] = useState<AdminUser[]>([]);
  const [inquiries, setInquiries] = useState<
    { id: string; client_full_name: string; cro_name: string | null }[]
  >([]);
  const [agreements, setAgreements] = useState<
    { inquiry_id: string | null; ceo_signed: boolean }[]
  >([]);
  const [payments, setPayments] = useState<{ inquiry_id: string | null; amount: number }[]>([]);
  const [payouts, setPayouts] = useState<{ inquiry_id: string; agent_email: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [detailAgentEmail, setDetailAgentEmail] = useState<string | null>(null);
  const [rateEditAgent, setRateEditAgent] = useState<RateEditTarget | null>(null);
  const [rateInput, setRateInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [agentsRes, inquiriesRes, agreementsRes, paymentsRes, payoutsRes] = await Promise.all([
      supabase.from("admin_users").select("*"),
      supabase.from("inquiries").select("id, client_full_name, cro_name"),
      supabase.from("agreements").select("inquiry_id, ceo_signed").eq("ceo_signed", true),
      supabase.from("payments").select("inquiry_id, amount").eq("status", "success"),
      supabase.from("commission_payouts").select("inquiry_id, agent_email"),
    ]);

    setAgents((agentsRes.data as AdminUser[]) ?? []);
    setInquiries(inquiriesRes.data ?? []);
    setAgreements(agreementsRes.data ?? []);
    setPayments(paymentsRes.data ?? []);
    setPayouts(payoutsRes.data ?? []);
    setLoading(false);
    setLastUpdated(new Date());
  };

  useEffect(() => {
    loadData();
  }, []);

  const summaries = useMemo(
    () => computeAgentCommissions(agents, inquiries, agreements, payments, payouts),
    [agents, inquiries, agreements, payments, payouts],
  );

  const totalOwed = summaries.reduce((sum, s) => sum + s.totalCommissionKes, 0);
  const totalPaid = summaries.reduce((sum, s) => sum + s.paidKes, 0);
  const totalPending = summaries.reduce((sum, s) => sum + s.pendingKes, 0);
  const agentsWithRate = agents.filter(
    (a) => a.role === "agent" && a.commission_rate != null,
  ).length;

  const detailSummary = summaries.find((s) => s.agent.email === detailAgentEmail) ?? null;

  const getAccessToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  };

  const submitRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rateEditAgent) return;
    const pct = Number(rateInput);
    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      setActionMsg("Enter a valid percentage between 0 and 100.");
      return;
    }
    setSaving(true);
    setActionMsg(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setActionMsg("Your session expired — please sign in again.");
        return;
      }
      const result = await (updateAgentCommissionRateFn as any)({
        data: {
          callerAccessToken: token,
          agentUserId: rateEditAgent.id,
          commissionRate: pct / 100,
        },
      });
      if (!result.success) {
        setActionMsg("Error: " + result.error);
      } else {
        setRateEditAgent(null);
        setRateInput("");
        loadData();
      }
    } catch (err: any) {
      setActionMsg("Something went wrong: " + (err?.message || "Unknown error."));
    } finally {
      setSaving(false);
    }
  };

  const markPaid = async (
    inquiryId: string,
    summary: AgentCommissionSummary,
    amountKes: number,
  ) => {
    setSaving(true);
    setActionMsg(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setActionMsg("Your session expired — please sign in again.");
        return;
      }
      const result = await (markCommissionPaidFn as any)({
        data: {
          callerAccessToken: token,
          inquiryId,
          agentEmail: summary.agent.email,
          agentName: summary.agent.full_name,
          commissionRateApplied: summary.agent.commission_rate,
          commissionAmountKes: amountKes,
        },
      });
      if (!result.success) {
        setActionMsg("Error: " + result.error);
      } else {
        loadData();
      }
    } catch (err: any) {
      setActionMsg("Something went wrong: " + (err?.message || "Unknown error."));
    } finally {
      setSaving(false);
    }
  };

  const sendStatement = async (agentEmail: string) => {
    setSaving(true);
    setActionMsg(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setActionMsg("Your session expired — please sign in again.");
        return;
      }
      const result = await (sendCommissionStatementFn as any)({
        data: { callerAccessToken: token, agentEmail },
      });
      setActionMsg(result.success ? "Statement sent." : "Error: " + result.error);
    } catch (err: any) {
      setActionMsg("Something went wrong: " + (err?.message || "Unknown error."));
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnDef<AgentCommissionSummary, any>[] = [
    {
      id: "agent",
      header: "Agent",
      accessorFn: (row) => row.agent.full_name || row.agent.email,
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-[14px] text-primary-container">
            {row.original.agent.full_name || "Unknown"}
          </div>
          <div className="text-[12px] text-on-surface-variant">{row.original.agent.email}</div>
        </div>
      ),
    },
    {
      id: "rate",
      header: "Rate",
      accessorFn: (row) => row.agent.commission_rate ?? -1,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="text-on-surface">
            {row.original.agent.commission_rate != null
              ? `${(row.original.agent.commission_rate * 100).toFixed(1)}%`
              : "Rate not set"}
          </span>
          {canManage && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setRateEditAgent(row.original.agent);
                setRateInput(
                  row.original.agent.commission_rate != null
                    ? String(row.original.agent.commission_rate * 100)
                    : "",
                );
              }}
              className="text-xs text-primary underline"
            >
              Edit
            </button>
          )}
        </div>
      ),
    },
    {
      id: "dealCount",
      header: "Deals Closed",
      accessorFn: (row) => row.dealCount,
      cell: (info) => <span className="text-on-surface">{info.getValue() as number}</span>,
    },
    {
      id: "totalCommissionKes",
      header: "Total Commission",
      accessorFn: (row) => row.totalCommissionKes,
      cell: (info) => (
        <span className="font-semibold text-primary">
          {formatFromKes(info.getValue() as number, "KES")}
        </span>
      ),
    },
    {
      id: "paidKes",
      header: "Paid",
      accessorFn: (row) => row.paidKes,
      cell: (info) => (
        <span className="text-on-success-container">
          {formatFromKes(info.getValue() as number, "KES")}
        </span>
      ),
    },
    {
      id: "pendingKes",
      header: "Pending",
      accessorFn: (row) => row.pendingKes,
      cell: (info) => (
        <span className="text-on-warning-container">
          {formatFromKes(info.getValue() as number, "KES")}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="block text-right">Actions</span>,
      cell: ({ row }) =>
        canManage ? (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                sendStatement(row.original.agent.email);
              }}
              disabled={saving}
              className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold"
            >
              Send Statement
            </button>
          </div>
        ) : null,
    },
  ];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary font-bold">
            Commission &amp; Payouts
          </h1>
          <p className="text-body-md text-on-surface-variant">
            Per-agent, per-deal commission computed from closed deals and actual collected revenue.
          </p>
        </div>
        <FreshnessStamp updatedAt={lastUpdated} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Commission Owed"
          value={loading ? "…" : formatFromKes(totalOwed, "KES")}
          icon={Banknote}
        />
        <KpiCard
          label="Paid Out"
          value={loading ? "…" : formatFromKes(totalPaid, "KES")}
          icon={Wallet}
          tone="success"
        />
        <KpiCard
          label="Pending"
          value={loading ? "…" : formatFromKes(totalPending, "KES")}
          icon={Clock}
          tone={totalPending > 0 ? "warning" : "default"}
        />
        <KpiCard
          label="Agents With a Rate Set"
          value={loading ? "…" : String(agentsWithRate)}
          icon={UserCheck2}
        />
      </div>

      {actionMsg && (
        <div className="px-4 py-2.5 bg-info-container/10 border border-info-container/30 rounded-lg text-[13px] text-on-surface">
          {actionMsg}
        </div>
      )}

      <div className="luxury-card rounded-xl shadow-sm overflow-hidden bg-white">
        <div className="px-6 py-4 border-b border-outline-variant/30">
          <h2 className="font-headline-md text-sm text-primary font-bold">Per-Agent Commission</h2>
        </div>
        {loading ? (
          <Skeleton className="h-64 rounded-xl m-4" />
        ) : summaries.length === 0 ? (
          <EmptyState
            title="No commission activity yet."
            description="Set a commission rate for an agent to start tracking their closed deals here."
          />
        ) : (
          <AdminDataTable
            columns={columns}
            data={summaries}
            emptyMessage="No commission activity yet."
            onRowClick={(row) => setDetailAgentEmail(row.agent.email)}
          />
        )}
      </div>

      {/* ══════ MODAL: EDIT COMMISSION RATE ══════ */}
      <Dialog open={!!rateEditAgent} onOpenChange={(open) => !open && setRateEditAgent(null)}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>
              Set Commission Rate — {rateEditAgent?.full_name ?? rateEditAgent?.email}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submitRate} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
                Rate (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value)}
                placeholder="e.g. 3"
                className="w-full mt-1 bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-md py-2.5 px-3 outline-none"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <button
                type="button"
                onClick={() => setRateEditAgent(null)}
                className="px-4 py-2 rounded-lg border border-outline-variant/40 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold inline-flex items-center gap-1.5"
              >
                {saving && <Loader2 size={13} className="animate-spin" />} Save Rate
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ══════ MODAL: AGENT DEAL DETAIL ══════ */}
      <Dialog open={!!detailAgentEmail} onOpenChange={(open) => !open && setDetailAgentEmail(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {detailSummary?.agent.full_name ?? detailSummary?.agent.email} — Closed Deals
            </DialogTitle>
          </DialogHeader>
          {detailSummary && detailSummary.deals.length === 0 ? (
            <EmptyState title="No closed deals for this agent yet." />
          ) : (
            <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
              {detailSummary?.deals.map((d) => (
                <div
                  key={d.inquiryId}
                  className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg"
                >
                  <div>
                    <div className="text-[13px] font-semibold text-primary-container">
                      {d.clientName}
                    </div>
                    <div className="text-[12px] text-on-surface-variant">
                      Collected {formatFromKes(d.collectedRevenueKes, "KES")} · Commission{" "}
                      {formatFromKes(d.commissionAmountKes, "KES")}
                    </div>
                  </div>
                  {d.paid ? (
                    <StatusBadge tone="success">Paid</StatusBadge>
                  ) : canManage ? (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        detailSummary && markPaid(d.inquiryId, detailSummary, d.commissionAmountKes)
                      }
                      className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold"
                    >
                      Mark Paid
                    </button>
                  ) : (
                    <StatusBadge tone="warning">Pending</StatusBadge>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
