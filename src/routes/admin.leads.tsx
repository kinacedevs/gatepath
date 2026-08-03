/**
 * Gatepath Realtors — Leads Pipeline (Phase 5A rebuild)
 * Replaces the old "leads" tab (admin.tsx, previously ~1996-2198), which was
 * labeled "Drag-and-drop Kanban board" but had zero actual drag-and-drop —
 * confirmed via repo-wide grep, it was a static filtered grouping. This is
 * the real thing: @dnd-kit-powered, writing through updateInquiryStatusFn
 * (src/lib/leadsActions.ts), which re-verifies the caller server-side.
 *
 * Columns are the 4 real inquiries.status buckets, each optionally split
 * into admin-configurable custom sub-stages (Phase 35, src/lib/
 * pipelineLabelsActions.ts's pipeline_stages table) — real add/remove/
 * reorder flexibility, but status itself and every revenue/conversion
 * calculation that depends on it stay completely untouched; a stage is a
 * finer position *within* a bucket, never a replacement for one. A "Site
 * visit booked" badge shows on cards with a matching bookings row instead
 * of being its own column, since that's a genuinely different signal from
 * pipeline stage.
 *
 * Lead score badge (Part 2, Module 4) added on each card — rules-based,
 * computed live from real data via src/lib/leadScoring.ts (source/budget/
 * engagement/response), not stored. See that file's header for why a
 * stored inquiries.score column was deliberately avoided.
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
import {
  GripVertical,
  Search,
  CalendarCheck,
  UserPlus,
  UserX,
  TrendingUp,
  Flame,
  Plus,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { updateInquiryStatusFn, assignLeadFn } from "@/lib/leadsActions";
import {
  computeSourceRates,
  computeLeadScore,
  scoreTier,
  type LeadScoreBreakdown,
} from "@/lib/leadScoring";
import { computeLifecycleStage, LIFECYCLE_LABELS, type LifecycleStage } from "@/lib/leadLifecycle";
import { StatusBadge, INQUIRY_STATUS_TONE } from "@/components/admin/StatusBadge";
import { DEFAULT_PIPELINE_LABELS } from "@/lib/pipelineLabelsActions";
import { KpiCard } from "@/components/admin/KpiCard";
import { SectionCard } from "@/components/admin/SectionCard";
import { EmptyState } from "@/components/admin/EmptyState";
import { FreshnessStamp } from "@/components/admin/FreshnessStamp";
import { FunnelChart } from "@/components/admin/charts/FunnelChart";
import { CategoryBarChart } from "@/components/admin/charts/CategoryBarChart";
import { TrendChart } from "@/components/admin/charts/TrendChart";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Inquiry, InteractionLog, AdminUser, PipelineStage } from "@/lib/types";

const LABEL_CLS =
  "text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide block mb-1.5";
const INPUT_CLS =
  "w-full p-2.5 border border-outline-variant/40 rounded-lg text-sm bg-white outline-none";

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

const BUCKET_ORDER: InquiryStatus[] = ["pending", "reviewed", "approved", "rejected"];

/** One Kanban column — either a bucket's own base position (stageId null)
 * or a custom stage within that bucket (Phase 35). */
type LeadColumn = { key: string; bucket: InquiryStatus; stageId: string | null; label: string };

function leadColumnKeyFor(inquiry: Pick<Inquiry, "status" | "pipeline_stage_id">): string {
  const stageId = inquiry.pipeline_stage_id ?? null;
  return stageId ? `stage:${stageId}` : inquiry.status;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const TIER_CLASSES = {
  hot: "bg-success-container/15 text-on-success-container",
  warm: "bg-warning-container/15 text-on-warning-container",
  cool: "bg-surface-container-high text-on-surface-variant",
} as const;

const LIFECYCLE_CLASSES: Record<LifecycleStage, string> = {
  lead: "bg-surface-container-high text-on-surface-variant",
  contact: "bg-info-container/15 text-on-info-container",
  deal: "bg-warning-container/15 text-on-warning-container",
  won: "bg-success-container/15 text-on-success-container",
  lost: "bg-error/10 text-error",
};

function LeadCard({
  lead,
  hasSiteVisit,
  score,
  lifecycleStage,
  staff,
  onAssign,
}: {
  lead: Inquiry;
  hasSiteVisit: boolean;
  score?: { total: number; breakdown: LeadScoreBreakdown };
  lifecycleStage: LifecycleStage;
  staff: AdminUser[];
  onAssign: (inquiryId: string, croName: string | null) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
  });

  const tier = score ? scoreTier(score.total) : null;
  const scoreTitle = score
    ? `Lead Score ${score.total}/100 — Source ${score.breakdown.source}/25 · Budget ${score.breakdown.budget}/25 · Engagement ${score.breakdown.engagement}/25 · Response ${score.breakdown.response}/25`
    : undefined;

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
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            title="Lead lifecycle stage — how far this lead has progressed toward money"
            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${LIFECYCLE_CLASSES[lifecycleStage]}`}
          >
            {LIFECYCLE_LABELS[lifecycleStage]}
          </span>
          {tier && (
            <span
              title={scoreTitle}
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${TIER_CLASSES[tier]}`}
            >
              {score!.total}
            </span>
          )}
          <button
            {...attributes}
            {...listeners}
            aria-label="Drag to change status"
            className="p-1 text-on-surface-variant hover:text-primary-container cursor-grab active:cursor-grabbing touch-none"
          >
            <GripVertical size={16} />
          </button>
        </div>
      </div>

      <div className="px-2.5 py-2 bg-surface-container-low rounded-md mb-3">
        <div className="text-[12px] text-on-surface-variant font-medium mb-1">
          {lead.phase_name || "Unspecified Phase"} · Plot #{lead.plot_number_ref || "TBD"}
        </div>
        <div className="text-[13px] font-bold text-primary-container">
          Ksh {(lead.price || 0).toLocaleString()}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-outline-variant/20 pt-2.5 gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0 ${
              lead.cro_name
                ? "bg-info-container/15 text-on-info-container"
                : "bg-surface-container-high text-on-surface-variant"
            }`}
          >
            {getInitials(lead.cro_name || "UA")}
          </div>
          <select
            value={lead.cro_name ?? ""}
            onChange={(e) => onAssign(lead.id, e.target.value || null)}
            className="min-w-0 flex-1 bg-transparent text-[11px] text-on-surface-variant outline-none cursor-pointer hover:text-primary-container truncate"
          >
            <option value="">Unassigned</option>
            {staff.map((s) => {
              const name = s.full_name || s.email;
              return (
                <option key={s.id} value={name}>
                  {name}
                </option>
              );
            })}
          </select>
        </div>
        {hasSiteVisit && (
          <span
            className="shrink-0 flex items-center gap-1 text-[10px] font-semibold text-on-success-container"
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
  columnKey,
  bucket,
  label,
  leads,
  bookedInquiryIds,
  leadScores,
  lifecycleStages,
  staff,
  onAssign,
}: {
  columnKey: string;
  bucket: InquiryStatus;
  label: string;
  leads: Inquiry[];
  bookedInquiryIds: Set<string>;
  leadScores: Map<string, { total: number; breakdown: LeadScoreBreakdown }>;
  lifecycleStages: Map<string, LifecycleStage>;
  staff: AdminUser[];
  onAssign: (inquiryId: string, croName: string | null) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnKey });

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
        <StatusBadge tone={INQUIRY_STATUS_TONE[bucket]}>{leads.length}</StatusBadge>
      </div>
      <div className="p-3 flex flex-col gap-3 overflow-y-auto flex-1 min-h-[120px]">
        {leads.length === 0 ? (
          <div className="py-8 px-2.5 text-center text-on-surface-variant text-[13px]">
            No leads in this stage.
          </div>
        ) : (
          leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              hasSiteVisit={bookedInquiryIds.has(lead.id)}
              score={leadScores.get(lead.id)}
              lifecycleStage={lifecycleStages.get(lead.id) ?? "lead"}
              staff={staff}
              onAssign={onAssign}
            />
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
  const [staff, setStaff] = useState<AdminUser[]>([]);
  const [offerInquiryIds, setOfferInquiryIds] = useState<Set<string>>(new Set());
  const [agreementInquiryIds, setAgreementInquiryIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [pipelineLabels, setPipelineLabels] =
    useState<Record<InquiryStatus, string>>(DEFAULT_PIPELINE_LABELS);
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const [walkInDialogOpen, setWalkInDialogOpen] = useState(false);
  const [walkInName, setWalkInName] = useState("");
  const [walkInPhone, setWalkInPhone] = useState("");
  const [walkInEmail, setWalkInEmail] = useState("");
  const [walkInIdPassport, setWalkInIdPassport] = useState("");
  const [walkInNotes, setWalkInNotes] = useState("");
  const [walkInAssignTo, setWalkInAssignTo] = useState("");
  const [walkInSubmitting, setWalkInSubmitting] = useState(false);
  const [walkInError, setWalkInError] = useState<string | null>(null);

  const loadData = async () => {
    const [
      inquiriesRes,
      bookingsRes,
      interactionsRes,
      labelsRes,
      staffRes,
      offersRes,
      agreementsRes,
      pipelineStagesRes,
    ] = await Promise.all([
      supabase.from("inquiries").select("*").order("created_at", { ascending: false }),
      supabase.from("bookings").select("inquiry_id"),
      supabase.from("interaction_log").select("*"),
      supabase.from("site_banners").select("data").eq("id", "pipeline_labels").maybeSingle(),
      supabase.from("admin_users").select("*").order("full_name", { ascending: true }),
      supabase.from("offers").select("inquiry_id"),
      supabase.from("agreements").select("inquiry_id"),
      // pipeline_stages (migration 0026) may not be applied yet on every
      // environment — a query error here just leaves the board at today's
      // 4 base columns, never a crash.
      supabase.from("pipeline_stages").select("*"),
    ]);
    setInquiries((inquiriesRes.data as Inquiry[]) ?? []);
    const bookingRows = (bookingsRes.data ?? []) as { inquiry_id: string | null }[];
    setBookedInquiryIds(new Set(bookingRows.map((b) => b.inquiry_id).filter(Boolean) as string[]));
    setInteractions((interactionsRes.data as InteractionLog[]) ?? []);
    const labelOverrides = (labelsRes.data as { data: Record<string, string> } | null)?.data;
    if (labelOverrides) {
      setPipelineLabels({ ...DEFAULT_PIPELINE_LABELS, ...labelOverrides });
    }
    setStaff((staffRes.data as AdminUser[]) ?? []);
    const offerRows = (offersRes.data ?? []) as { inquiry_id: string | null }[];
    setOfferInquiryIds(new Set(offerRows.map((o) => o.inquiry_id).filter(Boolean) as string[]));
    const agreementRows = (agreementsRes.data ?? []) as { inquiry_id: string | null }[];
    setAgreementInquiryIds(
      new Set(agreementRows.map((a) => a.inquiry_id).filter(Boolean) as string[]),
    );
    setPipelineStages((pipelineStagesRes.data as PipelineStage[]) ?? []);
    setLoading(false);
    setLastUpdated(new Date());
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await loadData();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 4 fixed bucket columns (relabeled per pipelineLabels, write path
  // unchanged) plus, per bucket, any admin-configured active custom stages
  // (Phase 35) as their own additional columns, ordered by display_order.
  const columns = useMemo<LeadColumn[]>(() => {
    const result: LeadColumn[] = [];
    for (const bucket of BUCKET_ORDER) {
      result.push({ key: bucket, bucket, stageId: null, label: pipelineLabels[bucket] });
      const bucketStages = pipelineStages
        .filter((s) => s.bucket === bucket && s.is_active)
        .sort((a, b) => a.display_order - b.display_order);
      for (const stage of bucketStages) {
        result.push({ key: `stage:${stage.id}`, bucket, stageId: stage.id, label: stage.label });
      }
    }
    return result;
  }, [pipelineLabels, pipelineStages]);

  // ── Lead scoring (Part 2, Module 4) — rules-based, computed live from
  // the same `inquiries`/`bookings`/`interaction_log` fetch above. See
  // src/lib/leadScoring.ts for the formula and why it's computed here
  // rather than stored.
  const leadScores = useMemo(() => {
    const sourceRates = computeSourceRates(inquiries);
    const prices = inquiries
      .map((i) => i.price)
      .filter((p): p is number => typeof p === "number" && p > 0);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

    const interactionCountByInquiry = new Map<string, number>();
    const inboundByInquiry = new Set<string>();
    for (const entry of interactions) {
      interactionCountByInquiry.set(
        entry.inquiry_id,
        (interactionCountByInquiry.get(entry.inquiry_id) ?? 0) + 1,
      );
      if (entry.direction === "inbound") inboundByInquiry.add(entry.inquiry_id);
    }

    const scores = new Map<string, { total: number; breakdown: LeadScoreBreakdown }>();
    for (const inq of inquiries) {
      scores.set(
        inq.id,
        computeLeadScore(inq, {
          sourceRates,
          minPrice,
          maxPrice,
          hasSiteVisit: bookedInquiryIds.has(inq.id),
          interactionCount: interactionCountByInquiry.get(inq.id) ?? 0,
          hasInboundInteraction: inboundByInquiry.has(inq.id),
        }),
      );
    }
    return scores;
  }, [inquiries, interactions, bookedInquiryIds]);

  const hotLeadsCount = useMemo(
    () => Array.from(leadScores.values()).filter((s) => scoreTier(s.total) === "hot").length,
    [leadScores],
  );

  // ── Lead → Contact → Deal lifecycle (Phase 33) — computed live from the
  // same interaction_log/bookings fetch above, plus offers/agreements. See
  // src/lib/leadLifecycle.ts for why this is a deliberately different axis
  // from inquiries.status (the Kanban columns already claim "Won"/"Lost").
  const lifecycleStages = useMemo(() => {
    const interactionInquiryIds = new Set(interactions.map((e) => e.inquiry_id));
    const stages = new Map<string, LifecycleStage>();
    for (const inq of inquiries) {
      stages.set(
        inq.id,
        computeLifecycleStage(inq, {
          hasInteraction: interactionInquiryIds.has(inq.id),
          hasBooking: bookedInquiryIds.has(inq.id),
          hasOffer: offerInquiryIds.has(inq.id),
          hasAgreement: agreementInquiryIds.has(inq.id),
        }),
      );
    }
    return stages;
  }, [inquiries, interactions, bookedInquiryIds, offerInquiryIds, agreementInquiryIds]);

  const lifecycleFunnelData = useMemo(() => {
    const counts: Record<LifecycleStage, number> = {
      lead: 0,
      contact: 0,
      deal: 0,
      won: 0,
      lost: 0,
    };
    for (const stage of lifecycleStages.values()) counts[stage] += 1;
    return (["lead", "contact", "deal", "won"] as const).map((stage) => ({
      name: LIFECYCLE_LABELS[stage],
      value: counts[stage],
    }));
  }, [lifecycleStages]);

  // ── Insights layer (VIZ_BLUEPRINT Phase 2, Slice 2 + Phase 10 follow-up)
  // — derived entirely from the same `inquiries`/`interaction_log` fetch
  // above, no extra queries. An SLA gauge still needs a target-time config
  // that doesn't exist — not built here. Avg speed-to-lead is now real,
  // backed by interaction_log (Phase 10): the earliest logged interaction per inquiry vs. its
  // created_at, averaged only across inquiries with at least one logged
  // interaction. Shows "No data yet" rather than a fabricated number while
  // the log is still empty.
  const insights = useMemo(() => {
    const todayKey = new Date().toISOString().slice(0, 10);
    const newToday = inquiries.filter((i) => i.created_at.slice(0, 10) === todayKey).length;
    const unassigned = inquiries.filter((i) => !i.cro_name).length;
    const won = inquiries.filter((i) => i.status === "approved").length;
    const conversionPct = inquiries.length > 0 ? Math.round((won / inquiries.length) * 100) : 0;

    const funnelData = columns.map((col) => ({
      name: col.label,
      value: inquiries.filter((i) => leadColumnKeyFor(i) === col.key).length,
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
  }, [inquiries, interactions, columns]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const inquiryId = String(active.id);
    const overId = String(over.id);
    // A "stage:<uuid>" droppable resolves to that stage's own bucket; any
    // other id is a bucket value dropped directly (the bucket's base
    // column, stageId null).
    const targetStageId = overId.startsWith("stage:") ? overId.slice("stage:".length) : null;
    const targetStage = targetStageId
      ? pipelineStages.find((s) => s.id === targetStageId)
      : undefined;
    const targetBucket = (targetStage ? targetStage.bucket : overId) as InquiryStatus;

    const current = inquiries.find((i) => i.id === inquiryId);
    if (!current) return;
    const currentStageId = current.pipeline_stage_id ?? null;
    // Real no-op check on the (bucket, stage) pair — not status alone, so a
    // same-bucket drag between two custom stages (status unchanged, only
    // the stage differs) is never silently skipped.
    if (current.status === targetBucket && currentStageId === targetStageId) return;

    // Optimistic update, rolled back on server error.
    setInquiries((prev) =>
      prev.map((i) =>
        i.id === inquiryId ? { ...i, status: targetBucket, pipeline_stage_id: targetStageId } : i,
      ),
    );
    setError(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      setError("Session expired — please refresh and sign in again.");
      setInquiries((prev) =>
        prev.map((i) =>
          i.id === inquiryId
            ? { ...i, status: current.status, pipeline_stage_id: current.pipeline_stage_id }
            : i,
        ),
      );
      return;
    }

    const result = await updateInquiryStatusFn({
      data: {
        callerAccessToken: accessToken,
        inquiryId,
        newStatus: targetBucket,
        pipelineStageId: targetStageId,
      },
    });

    if (!result.success) {
      setError(result.error ?? "Failed to update lead status.");
      setInquiries((prev) =>
        prev.map((i) =>
          i.id === inquiryId
            ? { ...i, status: current.status, pipeline_stage_id: current.pipeline_stage_id }
            : i,
        ),
      );
    }
  };

  // Manual lead assignment (Phase 33) — any staff role, same server-verified
  // pattern as handleDragEnd, calling assignLeadFn instead of
  // updateInquiryStatusFn.
  const handleAssign = async (inquiryId: string, croName: string | null) => {
    const current = inquiries.find((i) => i.id === inquiryId);
    if (!current) return;
    const previousCroName = current.cro_name;

    setInquiries((prev) => prev.map((i) => (i.id === inquiryId ? { ...i, cro_name: croName } : i)));
    setError(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      setError("Session expired — please refresh and sign in again.");
      setInquiries((prev) =>
        prev.map((i) => (i.id === inquiryId ? { ...i, cro_name: previousCroName } : i)),
      );
      return;
    }

    const result = await assignLeadFn({
      data: { callerAccessToken: accessToken, inquiryId, croName },
    });

    if (!result.success) {
      setError(result.error ?? "Failed to assign lead.");
      setInquiries((prev) =>
        prev.map((i) => (i.id === inquiryId ? { ...i, cro_name: previousCroName } : i)),
      );
    }
  };

  const resetWalkInForm = () => {
    setWalkInName("");
    setWalkInPhone("");
    setWalkInEmail("");
    setWalkInIdPassport("");
    setWalkInNotes("");
    setWalkInAssignTo("");
    setWalkInError(null);
  };

  // Walk-in capture (Phase 33) — direct client insert into inquiries,
  // matching inquire.tsx/diaspora.tsx's established precedent: inquiries
  // isn't one of CLAUDE.md's protected tables and already has an open
  // public-insert RLS policy. client_full_name/client_phone/client_email/
  // client_id_passport are the real NOT NULL columns (confirmed against
  // apiRoutes.ts's own required-field list) — all four are collected here,
  // unlike a KYC-light lead capture form, since there's no schema-safe way
  // to omit client_id_passport.
  const handleAddWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !walkInName.trim() ||
      !walkInPhone.trim() ||
      !walkInEmail.trim() ||
      !walkInIdPassport.trim()
    ) {
      setWalkInError("Full name, phone, email, and ID/Passport are required.");
      return;
    }
    setWalkInSubmitting(true);
    setWalkInError(null);

    const { error: insertErr } = await (supabase as any).from("inquiries").insert({
      client_full_name: walkInName.trim(),
      client_phone: walkInPhone.trim(),
      client_email: walkInEmail.trim().toLowerCase(),
      client_id_passport: walkInIdPassport.trim().toUpperCase(),
      questions: walkInNotes.trim() || null,
      cro_name: walkInAssignTo || null,
      heard_from: "Walk-In",
      status: "pending",
    });

    setWalkInSubmitting(false);
    if (insertErr) {
      setWalkInError(insertErr.message);
      return;
    }

    setWalkInDialogOpen(false);
    resetWalkInForm();
    await loadData();
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
          <button
            onClick={() => {
              resetWalkInForm();
              setWalkInDialogOpen(true);
            }}
            className="px-4 py-2.5 bg-primary text-white font-label-md text-xs rounded-lg hover:opacity-90 inline-flex items-center gap-1.5 shrink-0"
          >
            <Plus size={14} /> Add Walk-In
          </button>
        </div>
      </div>

      {!loading && (
        <div className="mb-6 shrink-0 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
            <KpiCard
              label="Hot Leads"
              value={String(hotLeadsCount)}
              icon={Flame}
              tone={hotLeadsCount > 0 ? "success" : "default"}
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
          <div className="grid grid-cols-1 gap-4">
            <SectionCard title="Lead → Contact → Deal">
              {lifecycleFunnelData.every((f) => f.value === 0) ? (
                <EmptyState title="No leads yet" />
              ) : (
                <FunnelChart data={lifecycleFunnelData} height={180} />
              )}
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
            {columns.map((col) => (
              <KanbanColumn
                key={col.key}
                columnKey={col.key}
                bucket={col.bucket}
                label={col.label}
                leads={filtered.filter((i) => leadColumnKeyFor(i) === col.key)}
                bookedInquiryIds={bookedInquiryIds}
                leadScores={leadScores}
                lifecycleStages={lifecycleStages}
                staff={staff}
                onAssign={handleAssign}
              />
            ))}
          </div>
        </DndContext>
      )}

      <Dialog
        open={walkInDialogOpen}
        onOpenChange={(open) => {
          setWalkInDialogOpen(open);
          if (!open) resetWalkInForm();
        }}
      >
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Add Walk-In</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddWalkIn} className="flex flex-col gap-3">
            {walkInError && (
              <div className="p-2.5 rounded-lg bg-error/10 text-error text-xs font-semibold">
                {walkInError}
              </div>
            )}
            <div>
              <label className={LABEL_CLS}>Full Name *</label>
              <input
                required
                value={walkInName}
                onChange={(e) => setWalkInName(e.target.value)}
                className={INPUT_CLS}
                placeholder="Jane Wanjiru"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={LABEL_CLS}>Phone *</label>
                <input
                  required
                  value={walkInPhone}
                  onChange={(e) => setWalkInPhone(e.target.value)}
                  className={INPUT_CLS}
                  placeholder="07XX XXX XXX"
                />
              </div>
              <div>
                <label className={LABEL_CLS}>ID / Passport No. *</label>
                <input
                  required
                  value={walkInIdPassport}
                  onChange={(e) => setWalkInIdPassport(e.target.value)}
                  className={INPUT_CLS}
                  placeholder="12345678"
                />
              </div>
            </div>
            <div>
              <label className={LABEL_CLS}>Email *</label>
              <input
                required
                type="email"
                value={walkInEmail}
                onChange={(e) => setWalkInEmail(e.target.value)}
                className={INPUT_CLS}
                placeholder="jane@example.com"
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Assign To</label>
              <select
                value={walkInAssignTo}
                onChange={(e) => setWalkInAssignTo(e.target.value)}
                className={INPUT_CLS}
              >
                <option value="">Unassigned</option>
                {staff.map((s) => {
                  const name = s.full_name || s.email;
                  return (
                    <option key={s.id} value={name}>
                      {name}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Notes</label>
              <textarea
                value={walkInNotes}
                onChange={(e) => setWalkInNotes(e.target.value)}
                className={INPUT_CLS}
                rows={3}
                placeholder="What are they interested in?"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <button
                type="button"
                onClick={() => setWalkInDialogOpen(false)}
                className="px-4 py-2.5 border border-outline-variant/40 rounded-lg text-xs font-semibold text-on-surface-variant hover:bg-surface-container-low"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={walkInSubmitting}
                className="px-4 py-2.5 bg-primary text-white font-label-md text-xs rounded-lg hover:opacity-90 disabled:opacity-60"
              >
                {walkInSubmitting ? "Adding…" : "Add Lead"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
