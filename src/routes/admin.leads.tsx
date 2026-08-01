/**
 * Gatepath Realtors — Leads Pipeline (Phase 5A rebuild)
 * Replaces the old "leads" tab (admin.tsx, previously ~1996-2198), which was
 * labeled "Drag-and-drop Kanban board" but had zero actual drag-and-drop —
 * confirmed via repo-wide grep, it was a static filtered grouping. This is
 * the real thing: @dnd-kit-powered, writing through updateInquiryStatusFn
 * (src/lib/leadsActions.ts), which re-verifies the caller server-side.
 *
 * Column mapping is the 4 real inquiries.status values, relabeled for staff
 * clarity — no invented 5th column. A "Site visit booked" badge shows on
 * cards with a matching bookings row instead, since that's a genuinely
 * different signal from pipeline stage (see the Phase 5A plan for why a
 * derived 5th column was rejected).
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { GripVertical, Search, CalendarCheck, UserPlus, UserX, TrendingUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { updateInquiryStatusFn } from "@/lib/leadsActions";
import { StatusBadge, INQUIRY_STATUS_TONE } from "@/components/admin/StatusBadge";
import { KpiCard } from "@/components/admin/KpiCard";
import { SectionCard } from "@/components/admin/SectionCard";
import { EmptyState } from "@/components/admin/EmptyState";
import { FreshnessStamp } from "@/components/admin/FreshnessStamp";
import { FunnelChart } from "@/components/admin/charts/FunnelChart";
import { CategoryBarChart } from "@/components/admin/charts/CategoryBarChart";
import { TrendChart } from "@/components/admin/charts/TrendChart";
import { Skeleton } from "@/components/ui/skeleton";
import type { Inquiry, InteractionLog } from "@/lib/types";

function formatDuration(ms: number): string {
  const mins = ms / 60000;
  if (mins < 60) return `${Math.round(mins)}m`;
  const hours = mins / 60;
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

export const Route = createFileRoute("/admin/leads")({
  component: LeadsPipeline,
});

type InquiryStatus = keyof typeof INQUIRY_STATUS_TONE;

const COLUMNS: { status: InquiryStatus; label: string }[] = [
  { status: "pending", label: "New" },
  { status: "reviewed", label: "In Review" },
  { status: "approved", label: "Won" },
  { status: "rejected", label: "Lost" },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function LeadCard({ lead, hasSiteVisit }: { lead: Inquiry; hasSiteVisit: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={
        transform
          ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 }
          : undefined
      }
      className={`bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-3.5 shadow-sm transition-shadow ${
        isDragging ? "opacity-60 shadow-lg" : "hover:shadow-md"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex gap-2.5 items-center min-w-0">
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-white text-[11px] font-bold shrink-0">
            {getInitials(lead.client_full_name)}
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-primary-container truncate">
              {lead.client_full_name}
            </div>
            <div className="text-[11px] text-on-surface-variant">
              {new Date(lead.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
        <button
          {...attributes}
          {...listeners}
          aria-label="Drag to change status"
          className="p-1 text-on-surface-variant hover:text-primary-container cursor-grab active:cursor-grabbing touch-none shrink-0"
        >
          <GripVertical size={16} />
        </button>
      </div>

      <div className="px-2.5 py-2 bg-surface-container-low rounded-md mb-3">
        <div className="text-[12px] text-on-surface-variant font-medium mb-1">
          {lead.phase_name || "Unspecified Phase"} · Plot #{lead.plot_number_ref || "TBD"}
        </div>
        <div className="text-[13px] font-bold text-primary-container">
          Ksh {(lead.price || 0).toLocaleString()}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-outline-variant/20 pt-2.5">
        <div className="flex items-center gap-1.5">
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold ${
              lead.cro_name
                ? "bg-info-container/15 text-on-info-container"
                : "bg-surface-container-high text-on-surface-variant"
            }`}
          >
            {getInitials(lead.cro_name || "UA")}
          </div>
          <span className="text-[11px] text-on-surface-variant">
            {lead.cro_name || "Unassigned"}
          </span>
        </div>
        {hasSiteVisit && (
          <span
            className="flex items-center gap-1 text-[10px] font-semibold text-on-success-container"
            title="Has a scheduled or completed site visit"
          >
            <CalendarCheck size={12} /> Site visit
          </span>
        )}
      </div>
    </div>
  );
}

function KanbanColumn({
  status,
  label,
  leads,
  bookedInquiryIds,
}: {
  status: InquiryStatus;
  label: string;
  leads: Inquiry[];
  bookedInquiryIds: Set<string>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`flex-none w-[300px] flex flex-col rounded-xl border transition-colors ${
        isOver
          ? "border-secondary bg-secondary-fixed/20"
          : "border-outline-variant/30 bg-surface-container-low/40"
      }`}
    >
      <div className="px-4 py-3.5 border-b border-outline-variant/20 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-primary-container">{label}</span>
        <StatusBadge tone={INQUIRY_STATUS_TONE[status]}>{leads.length}</StatusBadge>
      </div>
      <div className="p-3 flex flex-col gap-3 overflow-y-auto flex-1 min-h-[120px]">
        {leads.length === 0 ? (
          <div className="py-8 px-2.5 text-center text-on-surface-variant text-[13px]">
            No leads in this stage.
          </div>
        ) : (
          leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} hasSiteVisit={bookedInquiryIds.has(lead.id)} />
          ))
        )}
      </div>
    </div>
  );
}

function LeadsPipeline() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [bookedInquiryIds, setBookedInquiryIds] = useState<Set<string>>(new Set());
  const [interactions, setInteractions] = useState<InteractionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [inquiriesRes, bookingsRes, interactionsRes] = await Promise.all([
        supabase.from("inquiries").select("*").order("created_at", { ascending: false }),
        supabase.from("bookings").select("inquiry_id"),
        supabase.from("interaction_log").select("*"),
      ]);
      if (cancelled) return;
      setInquiries((inquiriesRes.data as Inquiry[]) ?? []);
      const bookingRows = (bookingsRes.data ?? []) as { inquiry_id: string | null }[];
      setBookedInquiryIds(
        new Set(bookingRows.map((b) => b.inquiry_id).filter(Boolean) as string[]),
      );
      setInteractions((interactionsRes.data as InteractionLog[]) ?? []);
      setLoading(false);
      setLastUpdated(new Date());
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Insights layer (VIZ_BLUEPRINT Phase 2, Slice 2 + Phase 10 follow-up)
  // — derived entirely from the same `inquiries`/`interaction_log` fetch
  // above, no extra queries. Hot-lead scoring and an SLA gauge still need
  // schema that doesn't exist (a score column, an SLA target config) — not
  // built here. Avg speed-to-lead is now real, backed by interaction_log
  // (Phase 10): the earliest logged interaction per inquiry vs. its
  // created_at, averaged only across inquiries with at least one logged
  // interaction. Shows "No data yet" rather than a fabricated number while
  // the log is still empty.
  const insights = useMemo(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    const newToday = inquiries.filter((i) => i.created_at.slice(0, 10) === todayKey).length;
    const unassigned = inquiries.filter((i) => !i.cro_name).length;
    const won = inquiries.filter((i) => i.status === "approved").length;
    const conversionPct = inquiries.length > 0 ? Math.round((won / inquiries.length) * 100) : 0;

    const funnelData = COLUMNS.map((col) => ({
      name: col.label,
      value: inquiries.filter((i) => i.status === col.status).length,
    }));

    const sourceCounts = new Map<string, number>();
    for (const i of inquiries) {
      const source = i.heard_from?.trim() || "Unknown";
      sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1);
    }
    const sourceData = Array.from(sourceCounts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    const dayBuckets = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dayBuckets.set(d.toISOString().slice(0, 10), 0);
    }
    for (const inq of inquiries) {
      const key = inq.created_at.slice(0, 10);
      if (dayBuckets.has(key)) dayBuckets.set(key, (dayBuckets.get(key) ?? 0) + 1);
    }
    const trendData = Array.from(dayBuckets.entries()).map(([date, value]) => ({
      day: new Date(date).toLocaleDateString("en-KE", { day: "numeric", month: "short" }),
      value,
    }));

    const firstInteractionByInquiry = new Map<string, string>();
    for (const entry of interactions) {
      const existing = firstInteractionByInquiry.get(entry.inquiry_id);
      if (!existing || entry.occurred_at < existing) {
        firstInteractionByInquiry.set(entry.inquiry_id, entry.occurred_at);
      }
    }
    const speedDeltas: number[] = [];
    for (const inq of inquiries) {
      const firstTouch = firstInteractionByInquiry.get(inq.id);
      if (!firstTouch) continue;
      const delta = new Date(firstTouch).getTime() - new Date(inq.created_at).getTime();
      if (delta >= 0) speedDeltas.push(delta);
    }
    const avgSpeedToLeadMs =
      speedDeltas.length > 0 ? speedDeltas.reduce((a, b) => a + b, 0) / speedDeltas.length : null;

    return {
      newToday,
      unassigned,
      conversionPct,
      funnelData,
      sourceData,
      trendData,
      avgSpeedToLeadMs,
    };
  }, [inquiries, interactions]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const inquiryId = String(active.id);
    const newStatus = over.id as InquiryStatus;
    const current = inquiries.find((i) => i.id === inquiryId);
    if (!current || current.status === newStatus) return;

    // Optimistic update, rolled back on server error.
    setInquiries((prev) => prev.map((i) => (i.id === inquiryId ? { ...i, status: newStatus } : i)));
    setError(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      setError("Session expired — please refresh and sign in again.");
      setInquiries((prev) =>
        prev.map((i) => (i.id === inquiryId ? { ...i, status: current.status } : i)),
      );
      return;
    }

    const result = await updateInquiryStatusFn({
      data: { callerAccessToken: accessToken, inquiryId, newStatus },
    });

    if (!result.success) {
      setError(result.error ?? "Failed to update lead status.");
      setInquiries((prev) =>
        prev.map((i) => (i.id === inquiryId ? { ...i, status: current.status } : i)),
      );
    }
  };

  const filtered = inquiries.filter(
    (i) =>
      searchQuery === "" || i.client_full_name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="mb-6 flex justify-between items-end shrink-0 flex-wrap gap-3">
        <div>
          <h1 className="font-headline-md text-headline-md text-primary font-bold">
            Leads &amp; Pipeline
          </h1>
          <p className="text-[13px] text-on-surface-variant mt-1">
            Drag a card to move it through the pipeline.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <FreshnessStamp updatedAt={lastUpdated} />
          <div className="relative w-[260px]">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search leads..."
              className="w-full pl-9 pr-3 py-2.5 border border-outline-variant/40 rounded-lg text-[13px] text-primary-container outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
            />
          </div>
        </div>
      </div>

      {!loading && (
        <div className="mb-6 shrink-0 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="New Today" value={String(insights.newToday)} icon={UserPlus} />
            <KpiCard
              label="Unassigned"
              value={String(insights.unassigned)}
              icon={UserX}
              tone={insights.unassigned > 0 ? "warning" : "default"}
            />
            <KpiCard
              label="Conversion Rate"
              value={`${insights.conversionPct}%`}
              icon={TrendingUp}
              tone="success"
            />
            <KpiCard
              label="Avg Speed-to-Lead"
              value={
                insights.avgSpeedToLeadMs === null
                  ? "No data yet"
                  : formatDuration(insights.avgSpeedToLeadMs)
              }
              icon={CalendarCheck}
            />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <SectionCard title="Pipeline Snapshot">
              {insights.funnelData.every((f) => f.value === 0) ? (
                <EmptyState title="No leads yet" />
              ) : (
                <FunnelChart data={insights.funnelData} height={180} />
              )}
            </SectionCard>
            <SectionCard title="Leads by Source">
              {insights.sourceData.length === 0 ? (
                <EmptyState title="No source data yet" />
              ) : (
                <CategoryBarChart
                  data={insights.sourceData}
                  xKey="name"
                  yKey="value"
                  height={180}
                  horizontal
                />
              )}
            </SectionCard>
            <SectionCard title="Leads — Last 30 Days">
              <TrendChart data={insights.trendData} xKey="day" yKey="value" height={180} />
            </SectionCard>
          </div>
        </div>
      )}
      {loading && (
        <div className="mb-6 shrink-0 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-45 rounded-xl" />
          <Skeleton className="h-45 rounded-xl" />
          <Skeleton className="h-45 rounded-xl" />
        </div>
      )}

      {error && (
        <div className="mb-4 px-4 py-2.5 bg-error/10 text-error text-[13px] rounded-lg shrink-0">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-on-surface-variant text-[13px]">
          Loading pipeline…
        </div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 flex-1 overflow-x-auto pb-5">
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.status}
                status={col.status}
                label={col.label}
                leads={filtered.filter((i) => i.status === col.status)}
                bookedInquiryIds={bookedInquiryIds}
              />
            ))}
          </div>
        </DndContext>
      )}
    </div>
  );
}
