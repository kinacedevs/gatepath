/**
 * Gatepath Realtors — Plot Detail (Phase 5B new route)
 * Was previously a conditional sub-view crammed into admin.plots.tsx's own
 * state (selectedPlotDetail). Now a real route, with real data throughout —
 * the original's bento stats were partly hardcoded fake placeholder text
 * ("50 x 100 ft", "Residential", "1/8 Acre Standard") regardless of the
 * actual plot; those are now real plot_sizes fields.
 *
 * "Interested Leads" matches on phase_slug + plot_number_ref, NOT
 * phase_id/plot_id — confirmed by reading inquire.tsx's insert payload,
 * inquiries never actually populates the FK columns, only the slug/ref
 * pair. Matching on the FK columns would have silently returned nothing.
 *
 * "Verification Documents" now includes the real manual title-verification
 * log (supabase/migrations/0004_plot_title_verification.sql) alongside the
 * existing phase brochure/plot-map links — see plotVerificationActions.ts
 * and docs/CRM_CAPABILITIES.md §5 for why this is a logged manual check,
 * not a live automated Ardhisasa lookup (no public API exists for that).
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ChevronRight,
  MapPin,
  PenTool,
  FileText,
  Map as MapIcon,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Plus,
  Phone,
  Mail,
  Archive,
  ArchiveRestore,
  Images,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdminSession } from "@/context/AdminSessionContext";
import { formatFromKes } from "@/lib/currency";
import { logPlotTitleVerificationFn } from "@/lib/plotVerificationActions";
import { updatePlotStatusFn } from "@/lib/plotActions";
import { updatePlotDetailsFn, setPlotArchivedFn } from "@/lib/inventoryActions";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { QuickCallLogger } from "@/components/admin/QuickCallLogger";
import { MediaDropzone } from "@/components/admin/MediaDropzone";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Phase, Plot, PlotSize, Inquiry } from "@/lib/types";

export const Route = createFileRoute("/admin/plots/$plotId")({
  component: PlotDetail,
});

type PlotWithSize = Plot & { plot_sizes: PlotSize | null };

type TitleVerification = {
  id: string;
  outcome: "verified_clean" | "discrepancy_found" | "inconclusive";
  reference: string | null;
  notes: string | null;
  checked_at: string;
  checked_by: string;
};

const PLOT_STATUS_TONE = { available: "success", booked: "warning", sold: "info" } as const;

const OUTCOME_META = {
  verified_clean: { label: "Verified Clean", icon: ShieldCheck, tone: "success" as const },
  discrepancy_found: { label: "Discrepancy Found", icon: ShieldAlert, tone: "error" as const },
  inconclusive: { label: "Inconclusive", icon: ShieldQuestion, tone: "neutral" as const },
};

function PlotDetail() {
  const { plotId } = Route.useParams();
  const { adminRole } = useAdminSession();

  const [loading, setLoading] = useState(true);
  const [plot, setPlot] = useState<PlotWithSize | null>(null);
  const [phase, setPhase] = useState<Phase | null>(null);
  const [phaseSizes, setPhaseSizes] = useState<PlotSize[]>([]);
  const [interestedLeads, setInterestedLeads] = useState<Inquiry[]>([]);
  const [verifications, setVerifications] = useState<TitleVerification[]>([]);
  const [verificationsError, setVerificationsError] = useState<string | null>(null);

  const [editingStatus, setEditingStatus] = useState(false);
  const [newPlotStatus, setNewPlotStatus] = useState<"available" | "booked" | "sold">("available");
  const [statusSaveError, setStatusSaveError] = useState<string | null>(null);

  const [editingDetails, setEditingDetails] = useState(false);
  const [editSizeId, setEditSizeId] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editPhotoUrls, setEditPhotoUrls] = useState<string[]>([]);
  const [editDetailsSaving, setEditDetailsSaving] = useState(false);
  const [editDetailsError, setEditDetailsError] = useState<string | null>(null);

  const [loggingVerification, setLoggingVerification] = useState(false);
  const [verifyOutcome, setVerifyOutcome] =
    useState<TitleVerification["outcome"]>("verified_clean");
  const [verifyReference, setVerifyReference] = useState("");
  const [verifyNotes, setVerifyNotes] = useState("");
  const [verifySubmitting, setVerifySubmitting] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);

    const { data: plotRow } = await supabase
      .from("plots")
      .select("*, plot_sizes(*)")
      .eq("id", plotId)
      .maybeSingle();
    const plotData = plotRow as PlotWithSize | null;
    setPlot(plotData);
    if (plotData) {
      setNewPlotStatus(plotData.status);
      setEditSizeId(plotData.size_id ?? "");
      setEditNotes(plotData.notes ?? "");
      setEditPhotoUrls(plotData.photo_urls ?? []);
    }

    if (plotData?.phase_id) {
      const [{ data: phaseRow }, { data: sizeRows }] = await Promise.all([
        supabase.from("phases").select("*").eq("id", plotData.phase_id).maybeSingle(),
        supabase.from("plot_sizes").select("*").eq("phase_id", plotData.phase_id),
      ]);
      const phaseData = phaseRow as Phase | null;
      setPhase(phaseData);
      setPhaseSizes((sizeRows as PlotSize[]) ?? []);

      if (phaseData?.slug) {
        const { data: leadRows } = await supabase
          .from("inquiries")
          .select("*")
          .eq("phase_slug", phaseData.slug)
          .eq("plot_number_ref", plotData.plot_number)
          .order("created_at", { ascending: false });
        setInterestedLeads((leadRows as Inquiry[]) ?? []);
      }
    }

    // The plot_title_verifications table only exists once
    // supabase/migrations/0004_plot_title_verification.sql has been applied
    // — fail gracefully rather than crash if it hasn't been run yet.
    const { data: verificationRows, error: verificationErr } = await supabase
      .from("plot_title_verifications")
      .select("*")
      .eq("plot_id", plotId)
      .order("checked_at", { ascending: false });
    if (verificationErr) {
      setVerificationsError(
        "Verification log unavailable — migration 0004_plot_title_verification.sql may not be applied yet.",
      );
    } else {
      setVerifications((verificationRows as TitleVerification[]) ?? []);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plotId]);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plot) return;
    if (adminRole === "agent") {
      alert("Access Denied: Agents cannot manually modify plot statuses.");
      return;
    }
    setStatusSaveError(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      setStatusSaveError("Session expired — please refresh and sign in again.");
      return;
    }

    const result = await updatePlotStatusFn({
      data: { callerAccessToken: accessToken, plotId: plot.id, status: newPlotStatus },
    });

    if (!result.success) {
      setStatusSaveError(result.error ?? "Error updating plot status.");
    } else {
      setEditingStatus(false);
      loadData();
    }
  };

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plot) return;
    setEditDetailsSaving(true);
    setEditDetailsError(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      setEditDetailsError("Session expired — please refresh and sign in again.");
      setEditDetailsSaving(false);
      return;
    }

    const result = await updatePlotDetailsFn({
      data: {
        callerAccessToken: accessToken,
        plotId: plot.id,
        sizeId: editSizeId || null,
        notes: editNotes || null,
        photoUrls: editPhotoUrls.length > 0 ? editPhotoUrls : null,
      },
    });

    setEditDetailsSaving(false);
    if (!result.success) {
      setEditDetailsError(result.error ?? "Error saving plot details.");
      return;
    }
    setEditingDetails(false);
    loadData();
  };

  const handleToggleArchived = async (archived: boolean) => {
    if (!plot) return;
    if (
      archived &&
      !confirm(
        `Archive Plot #${plot.plot_number}? It will be hidden from the public site, but nothing is deleted — you can restore it anytime.`,
      )
    ) {
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) return;
    await setPlotArchivedFn({
      data: { callerAccessToken: accessToken, plotId: plot.id, archived },
    });
    loadData();
  };

  const handleLogVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plot) return;
    setVerifySubmitting(true);
    setVerifyError(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      setVerifyError("Session expired — please refresh and sign in again.");
      setVerifySubmitting(false);
      return;
    }

    const result = await logPlotTitleVerificationFn({
      data: {
        callerAccessToken: accessToken,
        plotId: plot.id,
        outcome: verifyOutcome,
        reference: verifyReference,
        notes: verifyNotes,
      },
    });

    if (!result.success) {
      setVerifyError(result.error ?? "Failed to log the verification check.");
    } else {
      setLoggingVerification(false);
      setVerifyReference("");
      setVerifyNotes("");
      loadData();
    }
    setVerifySubmitting(false);
  };

  if (loading) {
    return <div className="text-center py-20 text-on-surface-variant text-[13px]">Loading…</div>;
  }

  if (!plot) {
    return (
      <div className="text-center py-20">
        <p className="text-on-surface-variant text-[14px] mb-4">Plot not found.</p>
        <Link to="/admin/plots" className="text-primary font-semibold text-sm hover:underline">
          Back to Inventory
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4 border-b border-outline-variant/30">
        <div>
          <nav className="flex items-center gap-2 text-on-surface-variant text-[11px] uppercase tracking-widest font-bold mb-2">
            <Link to="/admin/plots" className="hover:text-primary flex items-center gap-1">
              <ChevronRight size={12} className="rotate-180" /> Inventory
            </Link>
            <span>/</span>
            <span className="text-primary">Plot Details</span>
          </nav>
          <h2 className="font-headline-lg text-headline-lg text-primary-container font-bold">
            Plot #{plot.plot_number} — {phase?.name || "Phase View"}
          </h2>
          <div className="flex items-center gap-3 mt-1 text-xs">
            <span className="flex items-center gap-1 text-primary font-bold">
              <MapPin size={14} /> {phase?.location || "Kenya Project Site"}
            </span>
            <span className="text-on-surface-variant">•</span>
            <span className="text-on-surface-variant font-medium">
              Ref ID: GP-PLOT-{plot.plot_number}
            </span>
            <StatusBadge tone={PLOT_STATUS_TONE[plot.status]}>{plot.status}</StatusBadge>
            {plot.is_archived && <StatusBadge tone="neutral">Archived</StatusBadge>}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              if (adminRole === "agent") {
                alert("Access Denied: Agents cannot manually modify plot statuses.");
                return;
              }
              setStatusSaveError(null);
              setEditingStatus(true);
            }}
            className="px-6 py-3 bg-secondary-container text-on-secondary-container font-bold rounded-xl hover:opacity-90 transition-all flex items-center gap-2"
          >
            <PenTool size={16} /> Update Status
          </button>
          {adminRole !== "agent" && (
            <>
              <button
                onClick={() => {
                  setEditDetailsError(null);
                  setEditingDetails(true);
                }}
                className="px-6 py-3 border border-outline-variant text-on-surface font-bold rounded-xl hover:bg-surface-container-low transition-all flex items-center gap-2"
              >
                <PenTool size={16} /> Edit Details
              </button>
              <button
                onClick={() => handleToggleArchived(!plot.is_archived)}
                className="px-6 py-3 border border-outline-variant text-on-surface font-bold rounded-xl hover:bg-surface-container-low transition-all flex items-center gap-2"
              >
                {plot.is_archived ? (
                  <>
                    <ArchiveRestore size={16} /> Restore
                  </>
                ) : (
                  <>
                    <Archive size={16} /> Archive
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="luxury-card rounded-2xl overflow-hidden p-2 bg-white">
            <div className="h-[360px] relative rounded-xl overflow-hidden bg-primary-container/10 flex items-center justify-center">
              {phase?.plot_map_url ? (
                <img
                  src={phase.plot_map_url}
                  alt="Plot Map"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-8 text-on-surface-variant">
                  <MapPin size={48} className="mx-auto mb-3 opacity-40 text-primary" />
                  <p className="font-headline-md text-headline-md font-bold text-primary">
                    Plot #{plot.plot_number}
                  </p>
                  <p className="text-xs mt-1">No boundary map uploaded for this phase yet</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="luxury-card p-5 rounded-xl bg-white">
              <p className="text-label-md text-on-surface-variant mb-1">Asking Price</p>
              <h3 className="font-stat-lg text-stat-lg text-primary">
                {plot.plot_sizes?.cash_price
                  ? formatFromKes(plot.plot_sizes.cash_price, "KES")
                  : "Not set"}
              </h3>
              <p className="text-[11px] text-on-surface-variant mt-1">
                {plot.plot_sizes?.installment_price
                  ? `${formatFromKes(plot.plot_sizes.installment_price, "KES")} on instalments`
                  : "Standard payment plan available"}
              </p>
            </div>
            <div className="luxury-card p-5 rounded-xl bg-white">
              <p className="text-label-md text-on-surface-variant mb-1">Plot Dimensions</p>
              <h3 className="font-stat-lg text-stat-lg text-primary">
                {plot.plot_sizes?.label || "Not set"}
              </h3>
              <p className="text-[11px] text-on-surface-variant mt-1">
                {plot.plot_sizes?.area_ha ? `${plot.plot_sizes.area_ha} hectares` : " "}
              </p>
            </div>
            <div className="luxury-card p-5 rounded-xl bg-white">
              <p className="text-label-md text-on-surface-variant mb-1">Zoning & Utility</p>
              <h3 className="font-stat-lg text-stat-lg text-primary capitalize">
                {plot.plot_sizes?.plot_type || "Not set"}
              </h3>
              <p className="text-[11px] text-on-surface-variant mt-1">
                {phase?.features?.slice(0, 1).join(", ") || " "}
              </p>
            </div>
          </div>

          {/* Plot Photos */}
          {plot.photo_urls && plot.photo_urls.length > 0 && (
            <div className="luxury-card p-6 rounded-2xl bg-white space-y-3">
              <h3 className="font-headline-md text-sm text-primary font-bold flex items-center gap-2">
                <Images size={16} /> Plot Photos
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {plot.photo_urls.map((url) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block aspect-square rounded-lg overflow-hidden border border-outline-variant/20"
                  >
                    <img src={url} alt="Plot" className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Verification Documents */}
          <div className="luxury-card p-6 rounded-2xl bg-white space-y-4">
            <h3 className="font-headline-md text-headline-md text-primary font-bold">
              Verification Documents
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <a
                href={phase?.brochure_url || undefined}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-3 p-3 rounded-lg border border-outline-variant/30 ${
                  phase?.brochure_url
                    ? "hover:bg-surface-container-low"
                    : "opacity-50 pointer-events-none"
                }`}
              >
                <FileText size={18} className="text-primary shrink-0" />
                <span className="text-xs font-medium">
                  {phase?.brochure_url ? "Phase Brochure.pdf" : "No brochure uploaded"}
                </span>
              </a>
              <a
                href={phase?.plot_map_url || undefined}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-3 p-3 rounded-lg border border-outline-variant/30 ${
                  phase?.plot_map_url
                    ? "hover:bg-surface-container-low"
                    : "opacity-50 pointer-events-none"
                }`}
              >
                <MapIcon size={18} className="text-primary shrink-0" />
                <span className="text-xs font-medium">
                  {phase?.plot_map_url ? "Plot Map.pdf" : "No plot map uploaded"}
                </span>
              </a>
            </div>

            <div className="pt-2 border-t border-outline-variant/20">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[13px] font-bold text-primary-container">
                  Title Verification Log
                </h4>
                <button
                  onClick={() => setLoggingVerification(true)}
                  className="flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                >
                  <Plus size={13} /> Log a check
                </button>
              </div>
              <p className="text-[11px] text-on-surface-variant mb-3">
                No automated Ardhisasa check exists yet — a staff member performs the search
                themselves and logs the outcome here, so every title check is a real, timestamped,
                auditable record.
              </p>
              {verificationsError ? (
                <p className="text-[11px] text-on-surface-variant italic">{verificationsError}</p>
              ) : verifications.length === 0 ? (
                <p className="text-[11px] text-on-surface-variant italic">
                  No verification checks logged for this plot yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {verifications.map((v) => {
                    const meta = OUTCOME_META[v.outcome];
                    const Icon = meta.icon;
                    return (
                      <div
                        key={v.id}
                        className="flex items-start gap-3 p-3 rounded-lg bg-surface-container-low"
                      >
                        <Icon size={16} className="shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                            <span className="text-[10px] text-on-surface-variant">
                              {new Date(v.checked_at).toLocaleString()}
                            </span>
                          </div>
                          {v.reference && (
                            <p className="text-[11px] text-on-surface-variant mt-1">
                              Reference: {v.reference}
                            </p>
                          )}
                          {v.notes && <p className="text-[11px] text-on-surface mt-1">{v.notes}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="luxury-card p-6 rounded-2xl bg-white space-y-4">
            <h3 className="font-headline-md text-headline-md text-primary font-bold">
              Project Summary
            </h3>
            <div className="space-y-3 text-sm divide-y divide-outline-variant/20">
              <div className="pt-2 flex justify-between">
                <span className="text-on-surface-variant">Project Name</span>
                <span className="font-semibold">{phase?.name || "—"}</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-on-surface-variant">Phase Number</span>
                <span className="font-semibold">Phase {phase?.phase_number ?? 1}</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-on-surface-variant">Current Status</span>
                <span className="font-bold capitalize">{plot.status}</span>
              </div>
            </div>
          </div>

          {/* Interested Leads */}
          <div className="luxury-card p-6 rounded-2xl bg-white space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-md text-sm text-primary font-bold">Interested Leads</h3>
              <span className="text-[10px] font-bold text-on-surface-variant uppercase">
                {interestedLeads.length} total
              </span>
            </div>
            {interestedLeads.length === 0 ? (
              <p className="text-[12px] text-on-surface-variant italic">
                No inquiries reference this specific plot yet.
              </p>
            ) : (
              <div className="space-y-2 max-h-[360px] overflow-y-auto">
                {interestedLeads.map((lead) => (
                  <div key={lead.id} className="p-3 rounded-lg bg-surface-container-low">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[13px] font-semibold text-primary-container">
                        {lead.client_full_name}
                      </span>
                      <StatusBadge
                        tone={
                          lead.status === "approved"
                            ? "success"
                            : lead.status === "rejected"
                              ? "error"
                              : lead.status === "reviewed"
                                ? "info"
                                : "neutral"
                        }
                      >
                        {lead.status}
                      </StatusBadge>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-on-surface-variant">
                      <span className="flex items-center gap-1">
                        <Phone size={11} /> {lead.client_phone}
                      </span>
                      <a
                        href={`mailto:${lead.client_email}`}
                        className="flex items-center gap-1 hover:text-primary truncate"
                      >
                        <Mail size={11} /> {lead.client_email}
                      </a>
                      <QuickCallLogger
                        inquiryId={lead.id}
                        phone={lead.client_phone}
                        className="ml-auto"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={editingStatus} onOpenChange={setEditingStatus}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Edit Plot #{plot.plot_number}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateStatus} className="flex flex-col gap-4">
            <div>
              <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide block mb-1.5">
                New Status
              </label>
              <select
                value={newPlotStatus}
                onChange={(e) => setNewPlotStatus(e.target.value as typeof newPlotStatus)}
                className="w-full p-2.5 border border-outline-variant/40 rounded-lg text-sm bg-white outline-none"
              >
                <option value="available">Available</option>
                <option value="booked">Booked</option>
                <option value="sold">Sold</option>
              </select>
            </div>
            {statusSaveError && (
              <p className="text-xs font-semibold text-red-600">{statusSaveError}</p>
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <button
                type="button"
                onClick={() => setEditingStatus(false)}
                className="flex-1 py-2.5 border border-outline-variant/40 rounded-lg text-sm font-semibold text-on-surface hover:bg-surface-container-low"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-accent text-white rounded-lg text-sm font-bold hover:bg-accent-dark"
              >
                Save Status
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editingDetails} onOpenChange={setEditingDetails}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Edit Plot #{plot.plot_number} Details</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateDetails} className="flex flex-col gap-4">
            {editDetailsError && (
              <p className="text-xs font-semibold text-red-600">{editDetailsError}</p>
            )}
            <div>
              <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide block mb-1.5">
                Pricing Tier / Size
              </label>
              <select
                value={editSizeId}
                onChange={(e) => setEditSizeId(e.target.value)}
                className="w-full p-2.5 border border-outline-variant/40 rounded-lg text-sm bg-white outline-none"
              >
                <option value="">— None —</option>
                {phaseSizes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label} ({formatFromKes(s.cash_price, "KES")})
                    {!s.is_active ? " — inactive" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide block mb-1.5">
                Notes
              </label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={2}
                className="w-full p-2.5 border border-outline-variant/40 rounded-lg text-sm outline-none resize-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide block mb-1.5">
                Photos
              </label>
              <MediaDropzone
                value={editPhotoUrls}
                onChange={(v) => setEditPhotoUrls(v as string[])}
                multi
                category="plot"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <button
                type="button"
                onClick={() => setEditingDetails(false)}
                className="flex-1 py-2.5 border border-outline-variant/40 rounded-lg text-sm font-semibold text-on-surface hover:bg-surface-container-low"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editDetailsSaving}
                className="flex-1 py-2.5 bg-accent text-white rounded-lg text-sm font-bold hover:bg-accent-dark disabled:opacity-60"
              >
                {editDetailsSaving ? "Saving..." : "Save Details"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={loggingVerification} onOpenChange={setLoggingVerification}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Log a Title Verification Check</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-on-surface-variant -mt-2">
            Record the outcome of a manual Ardhisasa (or other registry) search you personally
            performed for this plot.
          </p>
          {verifyError && (
            <div className="p-2.5 bg-error/10 text-error text-xs rounded-lg">{verifyError}</div>
          )}
          <form onSubmit={handleLogVerification} className="flex flex-col gap-4">
            <div>
              <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide block mb-1.5">
                Outcome
              </label>
              <select
                value={verifyOutcome}
                onChange={(e) => setVerifyOutcome(e.target.value as typeof verifyOutcome)}
                className="w-full p-2.5 border border-outline-variant/40 rounded-lg text-sm bg-white outline-none"
              >
                <option value="verified_clean">Verified Clean</option>
                <option value="discrepancy_found">Discrepancy Found</option>
                <option value="inconclusive">Inconclusive</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide block mb-1.5">
                Reference (optional)
              </label>
              <input
                type="text"
                value={verifyReference}
                onChange={(e) => setVerifyReference(e.target.value)}
                placeholder="Ardhisasa parcel / search reference"
                className="w-full p-2.5 border border-outline-variant/40 rounded-lg text-sm outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide block mb-1.5">
                Notes (optional)
              </label>
              <textarea
                value={verifyNotes}
                onChange={(e) => setVerifyNotes(e.target.value)}
                rows={3}
                className="w-full p-2.5 border border-outline-variant/40 rounded-lg text-sm outline-none resize-none"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <button
                type="button"
                onClick={() => setLoggingVerification(false)}
                className="flex-1 py-2.5 border border-outline-variant/40 rounded-lg text-sm font-semibold text-on-surface hover:bg-surface-container-low"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={verifySubmitting}
                className="flex-1 py-2.5 bg-accent text-white rounded-lg text-sm font-bold hover:bg-accent-dark disabled:opacity-60"
              >
                {verifySubmitting ? "Saving…" : "Log Check"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
