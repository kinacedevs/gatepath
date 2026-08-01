/**
 * Gatepath Realtors — Call Log (Part 2, Module 11: Telephony / Call Logging)
 * Any staff role — routine sales work, not CEO-gated (calls aren't legally
 * sensitive the way title deeds/POAs are, so this doesn't need Document
 * Vault's stricter gate).
 *
 * Real, honest scope: click-to-call already means "opens the device's
 * native dialer" everywhere in this codebase (Contacts, Plot Detail) —
 * Module 11 pairs that with real outcome logging via interaction_log
 * (Module 1) + the new call_outcome column (migration 0014), and surfaces
 * it here plus as new Calls Logged/Connect Rate figures on Agent
 * Performance. Real cloud-telephony calling, IVR, recording, and automatic
 * outcome detection all need a provisioned Voice vendor product that
 * doesn't exist in this codebase (only Africa's Talking's Bulk SMS is
 * integrated) — not built here, flagged not faked.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PhoneCall, PhoneMissed, CalendarClock, Percent } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { KpiCard } from "@/components/admin/KpiCard";
import { SectionCard } from "@/components/admin/SectionCard";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { FreshnessStamp } from "@/components/admin/FreshnessStamp";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { CategoryBarChart } from "@/components/admin/charts/CategoryBarChart";
import { Skeleton } from "@/components/ui/skeleton";
import type { ColumnDef } from "@tanstack/react-table";
import type { InteractionLog } from "@/lib/types";

interface InquiryNameRow {
  id: string;
  client_full_name: string;
}

export const Route = createFileRoute("/admin/telephony")({
  component: CallLog,
});

type CallOutcome = NonNullable<InteractionLog["call_outcome"]>;

const OUTCOME_LABEL: Record<CallOutcome, string> = {
  connected: "Connected",
  voicemail: "Voicemail",
  no_answer: "No Answer",
  wrong_number: "Wrong Number",
  callback_requested: "Callback Requested",
};

const OUTCOME_TONE: Record<CallOutcome, "success" | "warning" | "info" | "neutral"> = {
  connected: "success",
  callback_requested: "info",
  voicemail: "warning",
  no_answer: "warning",
  wrong_number: "neutral",
};

interface CallRow {
  id: string;
  clientName: string;
  agentName: string;
  direction: InteractionLog["direction"];
  outcome: CallOutcome | null;
  notes: string | null;
  occurredAt: string;
}

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function CallLog() {
  const [calls, setCalls] = useState<InteractionLog[]>([]);
  const [inquiriesById, setInquiriesById] = useState<Map<string, InquiryNameRow>>(new Map());
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [callsRes, inquiriesRes] = await Promise.all([
      supabase
        .from("interaction_log")
        .select("*")
        .eq("channel", "call")
        .order("occurred_at", { ascending: false })
        .limit(200),
      supabase.from("inquiries").select("id, client_full_name"),
    ]);

    if (callsRes.error) {
      setUnavailable(true);
      setLoading(false);
      return;
    }

    setCalls((callsRes.data as InteractionLog[]) ?? []);
    const byId = new Map<string, InquiryNameRow>();
    for (const inq of (inquiriesRes.data as InquiryNameRow[]) ?? []) {
      byId.set(inq.id, inq);
    }
    setInquiriesById(byId);
    setLoading(false);
    setLastUpdated(new Date());
  };

  useEffect(() => {
    loadData();
  }, []);

  const rows: CallRow[] = useMemo(
    () =>
      calls.map((c) => ({
        id: c.id,
        clientName: inquiriesById.get(c.inquiry_id)?.client_full_name ?? "Unknown client",
        agentName: c.logged_by_name ?? c.logged_by_email ?? "Unknown",
        direction: c.direction,
        outcome: c.call_outcome as CallOutcome | null,
        notes: c.notes,
        occurredAt: c.occurred_at,
      })),
    [calls, inquiriesById],
  );

  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const callsLast30Days = calls.filter((c) => new Date(c.occurred_at).getTime() >= thirtyDaysAgo);
  const callsToday = calls.filter((c) => {
    const d = new Date(c.occurred_at);
    const today = new Date();
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  }).length;
  const connectedCount = callsLast30Days.filter((c) => c.call_outcome === "connected").length;
  const connectRate =
    callsLast30Days.length > 0 ? Math.round((connectedCount / callsLast30Days.length) * 100) : null;
  const missedCount = callsLast30Days.filter(
    (c) => c.call_outcome === "no_answer" || c.call_outcome === "voicemail",
  ).length;

  const outcomeBreakdown = useMemo(() => {
    const counts: Record<CallOutcome, number> = {
      connected: 0,
      voicemail: 0,
      no_answer: 0,
      wrong_number: 0,
      callback_requested: 0,
    };
    for (const c of calls) {
      if (c.call_outcome) counts[c.call_outcome as CallOutcome] += 1;
    }
    return (Object.keys(OUTCOME_LABEL) as CallOutcome[])
      .map((o) => ({ name: OUTCOME_LABEL[o], value: counts[o] }))
      .filter((o) => o.value > 0);
  }, [calls]);

  const columns: ColumnDef<CallRow, any>[] = [
    {
      id: "clientName",
      header: "Client",
      accessorFn: (row) => row.clientName,
      cell: (info) => (
        <span className="font-semibold text-primary-container">{info.getValue() as string}</span>
      ),
    },
    {
      id: "agentName",
      header: "Agent",
      accessorFn: (row) => row.agentName,
      cell: (info) => <span className="text-on-surface">{info.getValue() as string}</span>,
    },
    {
      id: "direction",
      header: "Direction",
      accessorFn: (row) => row.direction,
      cell: (info) => (
        <span className="text-on-surface-variant capitalize">{info.getValue() as string}</span>
      ),
    },
    {
      id: "outcome",
      header: "Outcome",
      accessorFn: (row) => row.outcome ?? "",
      cell: ({ row }) =>
        row.original.outcome ? (
          <StatusBadge tone={OUTCOME_TONE[row.original.outcome]}>
            {OUTCOME_LABEL[row.original.outcome]}
          </StatusBadge>
        ) : (
          <span className="text-on-surface-variant text-xs">—</span>
        ),
    },
    {
      id: "notes",
      header: "Notes",
      accessorFn: (row) => row.notes ?? "",
      cell: (info) => (
        <span className="text-on-surface-variant text-[13px] truncate max-w-xs block">
          {(info.getValue() as string) || "—"}
        </span>
      ),
    },
    {
      id: "occurredAt",
      header: "When",
      accessorFn: (row) => row.occurredAt,
      cell: (info) => (
        <span className="text-on-surface-variant text-xs">
          {relativeTime(info.getValue() as string)}
        </span>
      ),
    },
  ];

  if (unavailable) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-headline-lg text-headline-lg text-primary font-bold">Call Log</h1>
        <EmptyState
          icon={PhoneCall}
          title="Call Log unavailable"
          description="Migration 0014 may not be applied yet."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary font-bold">Call Log</h1>
          <p className="text-body-md text-on-surface-variant">
            Click-to-call outcomes logged from Contacts and Plot Detail — real cloud calling,
            recording, and IVR aren't wired up yet (no Voice vendor is provisioned today).
          </p>
        </div>
        <FreshnessStamp updatedAt={lastUpdated} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Calls Logged (30d)"
          value={loading ? "…" : String(callsLast30Days.length)}
          icon={PhoneCall}
        />
        <KpiCard
          label="Connect Rate (30d)"
          value={loading ? "…" : connectRate === null ? "No calls yet" : `${connectRate}%`}
          icon={Percent}
          tone="success"
        />
        <KpiCard
          label="Calls Today"
          value={loading ? "…" : String(callsToday)}
          icon={CalendarClock}
        />
        <KpiCard
          label="Missed / No Answer (30d)"
          value={loading ? "…" : String(missedCount)}
          icon={PhoneMissed}
          tone={missedCount > 0 ? "warning" : "default"}
        />
      </div>

      <SectionCard title="Outcomes Breakdown">
        {loading ? (
          <Skeleton className="h-45 rounded-xl" />
        ) : outcomeBreakdown.length === 0 ? (
          <EmptyState title="No calls logged yet." />
        ) : (
          <CategoryBarChart
            data={outcomeBreakdown}
            xKey="name"
            yKey="value"
            height={200}
            horizontal
          />
        )}
      </SectionCard>

      <div className="luxury-card rounded-xl shadow-sm overflow-hidden bg-white">
        <div className="px-6 py-4 border-b border-outline-variant/30">
          <h2 className="font-headline-md text-sm text-primary font-bold">Recent Calls</h2>
        </div>
        {loading ? (
          <Skeleton className="h-64 rounded-xl m-4" />
        ) : (
          <AdminDataTable columns={columns} data={rows} emptyMessage="No calls logged yet." />
        )}
      </div>
    </div>
  );
}
