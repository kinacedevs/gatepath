/**
 * Gatepath Realtors — Goals & Quotas (Part 2, Module 13)
 * Viewable by any staff role (matching Agent Performance/Commissions'
 * existing openness). Creating, editing, and deleting a goal are CEO/
 * manager only — target-setting is a managerial action, enforced
 * server-side in goalActions.ts (this screen also hides the controls
 * client-side for a clean UI).
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Goal as GoalIcon, CheckCircle2, Percent, ListChecks, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatFromKes } from "@/lib/currency";
import { useAdminSession } from "@/context/AdminSessionContext";
import { computeGoalProgress, periodBounds, type GoalProgress, type GoalRow } from "@/lib/goals";
import { createGoalFn, updateGoalFn, deleteGoalFn } from "@/lib/goalActions";
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
import type { AdminUser, Phase } from "@/lib/types";

export const Route = createFileRoute("/admin/goals")({
  component: GoalsAndQuotas,
});

const METRIC_LABEL: Record<GoalRow["metric"], string> = {
  revenue_kes: "Revenue",
  deals_closed: "Deals Closed",
  plots_sold: "Plots Sold",
};

function GoalsAndQuotas() {
  const { adminRole } = useAdminSession();
  const canManage = adminRole === "ceo" || adminRole === "manager";

  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [agents, setAgents] = useState<AdminUser[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [inquiries, setInquiries] = useState<
    { id: string; cro_name: string | null; phase_slug: string | null }[]
  >([]);
  const [agreements, setAgreements] = useState<
    {
      inquiry_id: string | null;
      ceo_signed: boolean;
      ceo_signed_at: string | null;
      created_at: string;
    }[]
  >([]);
  const [payments, setPayments] = useState<
    { inquiry_id: string | null; amount: number; created_at: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [entityType, setEntityType] = useState<"agent" | "phase">("agent");
  const [entityId, setEntityId] = useState("");
  const [metric, setMetric] = useState<GoalRow["metric"]>("revenue_kes");
  const [periodType, setPeriodType] = useState<"month" | "quarter">("month");
  const [periodStart, setPeriodStart] = useState("");
  const [targetValue, setTargetValue] = useState("");

  const [editingGoal, setEditingGoal] = useState<GoalProgress | null>(null);
  const [editTargetValue, setEditTargetValue] = useState("");

  const loadData = async () => {
    setLoading(true);
    const [goalsRes, agentsRes, phasesRes, inquiriesRes, agreementsRes, paymentsRes] =
      await Promise.all([
        supabase.from("goals").select("*"),
        supabase.from("admin_users").select("*"),
        supabase.from("phases").select("*"),
        supabase.from("inquiries").select("id, cro_name, phase_slug"),
        supabase.from("agreements").select("inquiry_id, ceo_signed, ceo_signed_at, created_at"),
        supabase.from("payments").select("inquiry_id, amount, created_at").eq("status", "success"),
      ]);

    if (goalsRes.error) {
      setGoals([]);
    } else {
      setGoals((goalsRes.data as GoalRow[]) ?? []);
    }
    setAgents((agentsRes.data as AdminUser[]) ?? []);
    setPhases((phasesRes.data as Phase[]) ?? []);
    setInquiries(inquiriesRes.data ?? []);
    setAgreements(agreementsRes.data ?? []);
    setPayments(paymentsRes.data ?? []);
    setLoading(false);
    setLastUpdated(new Date());
  };

  useEffect(() => {
    loadData();
  }, []);

  const progress = useMemo(
    () => computeGoalProgress(goals, agents, phases, inquiries, agreements, payments),
    [goals, agents, phases, inquiries, agreements, payments],
  );

  const now = new Date();
  const activeProgress = progress.filter((p) => {
    const { start, end } = periodBounds(p.goal.period_type, p.goal.period_start);
    return now >= start && now < end;
  });
  const activeGoalsCount = activeProgress.length;
  const achievedThisPeriod = activeProgress.filter((p) => p.achieved).length;
  const avgAttainment =
    activeProgress.length > 0
      ? Math.round(
          activeProgress.reduce((sum, p) => sum + p.attainmentPct, 0) / activeProgress.length,
        )
      : 0;

  const agentOptions = agents.filter((a) => a.role === "agent");
  const availableMetrics: GoalRow["metric"][] =
    entityType === "agent"
      ? ["revenue_kes", "deals_closed"]
      : ["revenue_kes", "deals_closed", "plots_sold"];

  const getAccessToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  };

  const resetCreateForm = () => {
    setEntityType("agent");
    setEntityId("");
    setMetric("revenue_kes");
    setPeriodType("month");
    setPeriodStart("");
    setTargetValue("");
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entityId) {
      setActionMsg("Choose an agent or phase.");
      return;
    }
    if (!periodStart) {
      setActionMsg("Choose a period start date.");
      return;
    }
    const val = Number(targetValue);
    if (Number.isNaN(val) || val <= 0) {
      setActionMsg("Enter a valid target value.");
      return;
    }
    setSaving(true);
    setActionMsg(null);
    const token = await getAccessToken();
    if (!token) {
      setActionMsg("Your session expired — please sign in again.");
      setSaving(false);
      return;
    }
    const result = await (createGoalFn as any)({
      data: {
        callerAccessToken: token,
        agentId: entityType === "agent" ? entityId : undefined,
        phaseId: entityType === "phase" ? entityId : undefined,
        metric,
        periodType,
        periodStart,
        targetValue: val,
      },
    });
    if (!result.success) {
      setActionMsg("Error: " + result.error);
    } else {
      setCreateOpen(false);
      resetCreateForm();
      loadData();
    }
    setSaving(false);
  };

  const submitEditTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGoal) return;
    const val = Number(editTargetValue);
    if (Number.isNaN(val) || val <= 0) {
      setActionMsg("Enter a valid target value.");
      return;
    }
    setSaving(true);
    setActionMsg(null);
    const token = await getAccessToken();
    if (!token) {
      setActionMsg("Your session expired — please sign in again.");
      setSaving(false);
      return;
    }
    const result = await (updateGoalFn as any)({
      data: { callerAccessToken: token, goalId: editingGoal.goal.id, targetValue: val },
    });
    if (!result.success) {
      setActionMsg("Error: " + result.error);
    } else {
      setEditingGoal(null);
      loadData();
    }
    setSaving(false);
  };

  const handleDelete = async (goalId: string) => {
    if (!confirm("Delete this goal permanently? This cannot be undone.")) return;
    setSaving(true);
    setActionMsg(null);
    const token = await getAccessToken();
    if (!token) {
      setActionMsg("Your session expired — please sign in again.");
      setSaving(false);
      return;
    }
    const result = await (deleteGoalFn as any)({ data: { callerAccessToken: token, goalId } });
    if (!result.success) {
      setActionMsg("Error: " + result.error);
    } else {
      loadData();
    }
    setSaving(false);
  };

  const formatActual = (p: GoalProgress) =>
    p.goal.metric === "revenue_kes"
      ? formatFromKes(p.actual, "KES")
      : `${p.actual}${p.isSnapshot ? " (snapshot)" : ""}`;

  const formatTarget = (p: GoalProgress) =>
    p.goal.metric === "revenue_kes" ? formatFromKes(p.target, "KES") : String(p.target);

  const columns: ColumnDef<GoalProgress, any>[] = [
    {
      id: "entity",
      header: "Target",
      accessorFn: (row) => row.entityName,
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-[14px] text-primary-container">
            {row.original.entityName}
          </div>
          <div className="text-[11px] text-on-surface-variant uppercase tracking-wide">
            {row.original.entityType}
          </div>
        </div>
      ),
    },
    {
      id: "metric",
      header: "Metric",
      accessorFn: (row) => METRIC_LABEL[row.goal.metric],
      cell: (info) => <span className="text-on-surface">{info.getValue() as string}</span>,
    },
    {
      id: "period",
      header: "Period",
      accessorFn: (row) => row.periodLabel,
      cell: (info) => (
        <span className="text-on-surface-variant text-[13px]">{info.getValue() as string}</span>
      ),
    },
    {
      id: "target",
      header: "Target",
      accessorFn: (row) => row.target,
      cell: ({ row }) => <span className="text-on-surface">{formatTarget(row.original)}</span>,
    },
    {
      id: "actual",
      header: "Actual",
      accessorFn: (row) => row.actual,
      cell: ({ row }) => <span className="text-on-surface">{formatActual(row.original)}</span>,
    },
    {
      id: "attainment",
      header: "Attainment",
      accessorFn: (row) => row.attainmentPct,
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-surface-container-low rounded-full overflow-hidden min-w-20">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${Math.min(100, row.original.attainmentPct)}%` }}
            />
          </div>
          <span className="text-[13px] font-semibold text-primary-container">
            {row.original.attainmentPct}%
          </span>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      accessorFn: (row) => (row.achieved ? "achieved" : "in_progress"),
      cell: ({ row }) =>
        row.original.achieved ? (
          <StatusBadge tone="success">Achieved</StatusBadge>
        ) : (
          <StatusBadge tone="info">In Progress</StatusBadge>
        ),
    },
    {
      id: "actions",
      header: () => <span className="block text-right">Actions</span>,
      cell: ({ row }) =>
        canManage ? (
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingGoal(row.original);
                setEditTargetValue(String(row.original.target));
              }}
              className="text-xs text-secondary underline"
            >
              Edit Target
            </button>
            <button
              type="button"
              onClick={() => handleDelete(row.original.goal.id)}
              className="p-1.5 rounded-lg text-error hover:bg-error/10 transition-colors"
              title="Delete goal"
            >
              <Trash2 size={14} />
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
            Goals &amp; Quotas
          </h1>
          <p className="text-body-md text-on-surface-variant">
            Monthly/quarterly targets per agent or phase, tracked against real collected revenue,
            closed deals, and — for phases — the live plots-sold count.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <FreshnessStamp updatedAt={lastUpdated} />
          {canManage && (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold"
            >
              New Goal
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Active Goals"
          value={loading ? "…" : String(activeGoalsCount)}
          icon={GoalIcon}
        />
        <KpiCard
          label="Achieved (This Period)"
          value={loading ? "…" : String(achievedThisPeriod)}
          icon={CheckCircle2}
          tone="success"
        />
        <KpiCard
          label="Avg Attainment"
          value={loading ? "…" : `${avgAttainment}%`}
          icon={Percent}
        />
        <KpiCard
          label="Total Goals Set"
          value={loading ? "…" : String(goals.length)}
          icon={ListChecks}
        />
      </div>

      {actionMsg && (
        <div className="px-4 py-2.5 bg-info-container/10 border border-info-container/30 rounded-lg text-[13px] text-on-surface">
          {actionMsg}
        </div>
      )}

      <div className="luxury-card rounded-xl shadow-sm overflow-hidden bg-white">
        <div className="px-6 py-4 border-b border-outline-variant/30">
          <h2 className="font-headline-md text-sm text-primary font-bold">All Goals</h2>
        </div>
        {loading ? (
          <Skeleton className="h-64 rounded-xl m-4" />
        ) : progress.length === 0 ? (
          <EmptyState
            title="No goals set yet."
            description={
              canManage
                ? "Click New Goal to set a target for an agent or phase."
                : "The CEO or a manager can set targets here."
            }
          />
        ) : (
          <AdminDataTable columns={columns} data={progress} emptyMessage="No goals set yet." />
        )}
      </div>

      {/* ══════ MODAL: NEW GOAL ══════ */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) resetCreateForm();
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>New Goal</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitCreate} className="flex flex-col gap-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setEntityType("agent");
                  setEntityId("");
                  setMetric("revenue_kes");
                }}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold border ${entityType === "agent" ? "bg-primary text-white border-primary" : "border-outline-variant/40 text-on-surface-variant"}`}
              >
                Agent
              </button>
              <button
                type="button"
                onClick={() => {
                  setEntityType("phase");
                  setEntityId("");
                  setMetric("revenue_kes");
                }}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold border ${entityType === "phase" ? "bg-primary text-white border-primary" : "border-outline-variant/40 text-on-surface-variant"}`}
              >
                Phase
              </button>
            </div>

            <select
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-md py-2.5 px-3 outline-none"
            >
              <option value="">
                {entityType === "agent" ? "Select an agent..." : "Select a phase..."}
              </option>
              {entityType === "agent"
                ? agentOptions.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.full_name || a.email}
                    </option>
                  ))
                : phases.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
            </select>

            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as GoalRow["metric"])}
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-md py-2.5 px-3 outline-none"
            >
              {availableMetrics.map((m) => (
                <option key={m} value={m}>
                  {METRIC_LABEL[m]}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-2.5">
              <select
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value as "month" | "quarter")}
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-md py-2.5 px-3 outline-none"
              >
                <option value="month">Monthly</option>
                <option value="quarter">Quarterly</option>
              </select>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-md py-2.5 px-3 outline-none"
              />
            </div>
            <p className="text-[11px] text-on-surface-variant -mt-2">
              Pick any date within the target month, or the first month of the target quarter.
            </p>

            <input
              type="number"
              min={0}
              step={0.01}
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              placeholder={metric === "revenue_kes" ? "Target amount (Ksh)" : "Target count"}
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-md py-2.5 px-3 outline-none"
            />

            <DialogFooter className="gap-2 sm:gap-0">
              <button
                type="button"
                onClick={() => {
                  setCreateOpen(false);
                  resetCreateForm();
                }}
                className="px-4 py-2 rounded-lg border border-outline-variant/40 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold inline-flex items-center gap-1.5"
              >
                {saving && <Loader2 size={13} className="animate-spin" />} Create Goal
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ══════ MODAL: EDIT TARGET ══════ */}
      <Dialog open={!!editingGoal} onOpenChange={(open) => !open && setEditingGoal(null)}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Edit Target — {editingGoal?.entityName}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitEditTarget} className="flex flex-col gap-4">
            <input
              type="number"
              min={0}
              step={0.01}
              value={editTargetValue}
              onChange={(e) => setEditTargetValue(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-md py-2.5 px-3 outline-none"
            />
            <DialogFooter className="gap-2 sm:gap-0">
              <button
                type="button"
                onClick={() => setEditingGoal(null)}
                className="px-4 py-2 rounded-lg border border-outline-variant/40 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold inline-flex items-center gap-1.5"
              >
                {saving && <Loader2 size={13} className="animate-spin" />} Save
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
