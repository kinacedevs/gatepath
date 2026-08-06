/**
 * Gatepath Realtors — Land Inventory (VIZ_BLUEPRINT Phase 2, Slice 5)
 * Builds on the Phase 5B redesign (real plot_sizes embed, real TanStack
 * table, shadcn Dialog). Two real changes this pass:
 * (1) handleUpdatePlotStatus now writes through updatePlotStatusFn
 * (src/lib/plotActions.ts) instead of a direct client update — the old
 * (supabase as any).from("plots").update(...) call violated CLAUDE.md's
 * explicit "never mutate plots.status from client-side code" rule.
 * (2) the "Grid Map" toggle now renders the real PlotMap SVG (masterplan
 * layout, compass rose, hover tooltips) via usePhase(slug) — the same hook
 * and component the public site uses, including its Realtime subscription
 * on plot status changes — instead of a flat grid of colored boxes.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
  flexRender,
  type SortingState,
} from "@tanstack/react-table";
import {
  Layers,
  ArrowUpDown,
  Eye,
  PenTool,
  MapPin,
  TrendingUp,
  Plus,
  Archive,
  ArchiveRestore,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdminSession } from "@/context/AdminSessionContext";
import { formatFromKes } from "@/lib/currency";
import { updatePlotStatusFn } from "@/lib/plotActions";
import {
  createPhaseFn,
  updatePhaseDetailsFn,
  updatePhaseYoutubeFn,
  setPhaseArchivedFn,
  createPlotFn,
  setPlotArchivedFn,
  savePlotSizeFn,
  setPlotSizeActiveFn,
  updatePlotDetailsFn,
} from "@/lib/inventoryActions";
import { usePhase, type Plot as MapPlot } from "@/lib/phases";
import { PlotMap } from "@/components/properties/PlotMap";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { KpiCard } from "@/components/admin/KpiCard";
import { SectionCard } from "@/components/admin/SectionCard";
import { EmptyState } from "@/components/admin/EmptyState";
import { FreshnessStamp } from "@/components/admin/FreshnessStamp";
import { MediaDropzone } from "@/components/admin/MediaDropzone";
import { CategoryBarChart } from "@/components/admin/charts/CategoryBarChart";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Phase, Plot, PlotSize, InfrastructureItem, NeighborhoodItem } from "@/lib/types";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { AMENITY_ICON_KEYS, getAmenityIcon } from "@/lib/amenityIcons";
import { Trash2, ArrowUp, ArrowDown } from "lucide-react";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const Route = createFileRoute("/admin/plots")({
  component: LandInventory,
});

type PlotWithSize = Plot & { plot_sizes: PlotSize | null };

const LABEL_CLS =
  "text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide block mb-1.5";
const INPUT_CLS =
  "w-full p-2.5 border border-outline-variant/40 rounded-lg text-sm bg-white outline-none";

const PLOT_STATUS_TONE = {
  available: "success",
  booked: "warning",
  sold: "info",
} as const;

function plotDimensions(size: PlotSize | null): string {
  if (!size) return "—";
  if (size.area_ha) return `${size.area_ha} ha`;
  return size.label;
}

function LandInventory() {
  const { adminRole } = useAdminSession();
  const navigate = useNavigate();

  const [phases, setPhases] = useState<Phase[]>([]);
  const [plots, setPlots] = useState<PlotWithSize[]>([]);
  const [plotSizes, setPlotSizes] = useState<PlotSize[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [selectedPhaseId, setSelectedPhaseId] = useState<string>("");
  const [inventoryStatusFilter, setInventoryStatusFilter] = useState<
    "all" | "available" | "booked" | "sold"
  >("all");
  const [inventoryViewMode, setInventoryViewMode] = useState<"grid" | "table" | "position">(
    "table",
  );
  const [sorting, setSorting] = useState<SortingState>([]);
  const [showArchived, setShowArchived] = useState(false);

  // Position Plots mode (Phase 42) — click-to-arm, click-to-place pin
  // positioning against the phase's real uploaded site-plan image.
  const positionImgRef = useRef<HTMLImageElement>(null);
  const [armedPlotId, setArmedPlotId] = useState<string | null>(null);
  const [positionSaving, setPositionSaving] = useState(false);
  const [positionMsg, setPositionMsg] = useState<string | null>(null);

  const [editingPlot, setEditingPlot] = useState<PlotWithSize | null>(null);
  const [newPlotStatus, setNewPlotStatus] = useState<"available" | "booked" | "sold">("available");
  const [statusSaveError, setStatusSaveError] = useState<string | null>(null);

  const [editingPhaseYoutube, setEditingPhaseYoutube] = useState("");
  const [phaseSaveLoading, setPhaseSaveLoading] = useState(false);
  const [phaseSaveMsg, setPhaseSaveMsg] = useState<string | null>(null);

  // ── New Phase dialog ──
  const [newPhaseDialogOpen, setNewPhaseDialogOpen] = useState(false);
  const [newPhaseSlug, setNewPhaseSlug] = useState("");
  const [newPhaseSlugTouched, setNewPhaseSlugTouched] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState("");
  const [newPhaseNumber, setNewPhaseNumber] = useState("");
  const [newPhaseLocation, setNewPhaseLocation] = useState("");
  const [newPhaseRegion, setNewPhaseRegion] = useState("");
  const [newPhaseCounty, setNewPhaseCounty] = useState("");
  const [newPhaseDescription, setNewPhaseDescription] = useState("");
  const [newPhaseFeatures, setNewPhaseFeatures] = useState("");
  const [newPhaseSaving, setNewPhaseSaving] = useState(false);
  const [newPhaseError, setNewPhaseError] = useState<string | null>(null);

  // ── Edit Phase Details dialog ──
  const [editPhaseDialogOpen, setEditPhaseDialogOpen] = useState(false);
  const [editPhaseName, setEditPhaseName] = useState("");
  const [editPhaseNumber, setEditPhaseNumber] = useState("");
  const [editPhaseLocation, setEditPhaseLocation] = useState("");
  const [editPhaseRegion, setEditPhaseRegion] = useState("");
  const [editPhaseCounty, setEditPhaseCounty] = useState("");
  const [editPhaseStatus, setEditPhaseStatus] = useState<Phase["status"]>("active");
  const [editPhaseDescription, setEditPhaseDescription] = useState("");
  const [editPhaseFeatures, setEditPhaseFeatures] = useState("");
  const [editLocationNarrative, setEditLocationNarrative] = useState("");
  const [editLegalNarrative, setEditLegalNarrative] = useState("");
  const [editInfraItems, setEditInfraItems] = useState<InfrastructureItem[]>([]);
  const [editNeighborhoodItems, setEditNeighborhoodItems] = useState<NeighborhoodItem[]>([]);
  const [editPhaseSaving, setEditPhaseSaving] = useState(false);
  const [editPhaseError, setEditPhaseError] = useState<string | null>(null);

  // ── Add Plot dialog ──
  const [addPlotDialogOpen, setAddPlotDialogOpen] = useState(false);
  const [newPlotNumber, setNewPlotNumber] = useState("");
  const [newPlotRow, setNewPlotRow] = useState("");
  const [newPlotCol, setNewPlotCol] = useState("");
  const [newPlotSizeId, setNewPlotSizeId] = useState("");
  const [newPlotNotes, setNewPlotNotes] = useState("");
  const [newPlotPhotoUrls, setNewPlotPhotoUrls] = useState<string[]>([]);
  const [addPlotSaving, setAddPlotSaving] = useState(false);
  const [addPlotError, setAddPlotError] = useState<string | null>(null);

  // ── Plot Size / Pricing dialog ──
  const [sizeDialogOpen, setSizeDialogOpen] = useState(false);
  const [editingSizeId, setEditingSizeId] = useState<string | null>(null);
  const [sizeLabel, setSizeLabel] = useState("");
  const [sizeDescription, setSizeDescription] = useState("");
  const [sizeAreaHa, setSizeAreaHa] = useState("");
  const [sizeCashPrice, setSizeCashPrice] = useState("");
  const [sizeInstallmentPrice, setSizeInstallmentPrice] = useState("");
  const [sizeInstallmentMonths, setSizeInstallmentMonths] = useState("");
  const [sizePlotType, setSizePlotType] = useState<PlotSize["plot_type"]>("residential");
  const [sizeIsDefault, setSizeIsDefault] = useState(false);
  const [sizePromoActive, setSizePromoActive] = useState(false);
  const [sizePromoLabel, setSizePromoLabel] = useState("");
  const [sizePromoPrice, setSizePromoPrice] = useState("");
  const [sizeSaving, setSizeSaving] = useState(false);
  const [sizeError, setSizeError] = useState<string | null>(null);

  const loadData = async () => {
    setDataLoading(true);
    try {
      const [phasesRes, plotsRes, sizesRes] = await Promise.all([
        supabase.from("phases").select("*").order("name"),
        supabase.from("plots").select("*, plot_sizes(*)").order("plot_number"),
        supabase.from("plot_sizes").select("*").order("cash_price"),
      ]);

      const phaseRows = (phasesRes.data as Phase[]) ?? [];
      setPhases(phaseRows);
      setPlots((plotsRes.data as PlotWithSize[]) ?? []);
      setPlotSizes((sizesRes.data as PlotSize[]) ?? []);

      if (phaseRows.length > 0 && !selectedPhaseId) {
        setSelectedPhaseId(phaseRows.find((p) => !p.is_archived)?.id ?? phaseRows[0].id);
      }
    } catch (err) {
      console.error("Error loading plots data:", err);
    } finally {
      setDataLoading(false);
      setLastUpdated(new Date());
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activePhase = useMemo(
    () => phases.find((p) => p.id === selectedPhaseId),
    [phases, selectedPhaseId],
  );

  // Real masterplan grid for the active phase — same hook + Realtime
  // subscription the public site uses (src/lib/phases.ts's usePhase).
  const { phase: mapPhase, loading: mapLoading } = usePhase(activePhase?.slug ?? "");

  useEffect(() => {
    if (activePhase) {
      setEditingPhaseYoutube(activePhase.youtube_video_url || "");
      setPhaseSaveMsg(null);
    }
  }, [activePhase]);

  const visiblePhases = useMemo(
    () => phases.filter((p) => showArchived || !p.is_archived),
    [phases, showArchived],
  );

  const activePhasePlots = useMemo(() => {
    return plots
      .filter((p) => p.phase_id === selectedPhaseId)
      .filter((p) => showArchived || !p.is_archived)
      .filter((p) => inventoryStatusFilter === "all" || p.status === inventoryStatusFilter);
  }, [plots, selectedPhaseId, inventoryStatusFilter, showArchived]);

  const activePhaseSizes = useMemo(
    () => plotSizes.filter((s) => s.phase_id === selectedPhaseId),
    [plotSizes, selectedPhaseId],
  );

  // ── Global KPIs (all phases) ──
  const globalTotals = useMemo(
    () =>
      phases.reduce(
        (acc, p) => ({
          available: acc.available + (p.available_count ?? 0),
          booked: acc.booked + (p.booked_count ?? 0),
          sold: acc.sold + (p.sold_count ?? 0),
        }),
        { available: 0, booked: 0, sold: 0 },
      ),
    [phases],
  );
  const globalTotal = globalTotals.available + globalTotals.booked + globalTotals.sold;
  const absorptionRate = globalTotal > 0 ? Math.round((globalTotals.sold / globalTotal) * 100) : 0;

  // ── Inventory by Phase (% sold, all phases) ──
  const inventoryByPhase = useMemo(
    () =>
      phases.map((p) => {
        const total = (p.available_count ?? 0) + (p.booked_count ?? 0) + (p.sold_count ?? 0);
        return {
          name: p.name,
          value: total > 0 ? Math.round(((p.sold_count ?? 0) / total) * 100) : 0,
        };
      }),
    [phases],
  );

  // ── Price Distribution (active phase only — price context is phase-specific) ──
  const priceDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of plots) {
      if (p.phase_id !== selectedPhaseId || !p.plot_sizes) continue;
      const label = p.plot_sizes.label;
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
  }, [plots, selectedPhaseId]);

  const handleUpdatePlotStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlot) return;
    setStatusSaveError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setStatusSaveError("Session expired — please refresh and sign in again.");
        return;
      }

      const result = await updatePlotStatusFn({
        data: { callerAccessToken: accessToken, plotId: editingPlot.id, status: newPlotStatus },
      });

      if (!result.success) {
        setStatusSaveError(result.error ?? "Error updating plot status.");
      } else {
        setEditingPlot(null);
        loadData();
      }
    } catch (err: any) {
      setStatusSaveError("Something went wrong: " + (err?.message || "Unknown error."));
    }
  };

  const getAccessToken = async (): Promise<string | null> => {
    const { data: sessionData } = await supabase.auth.getSession();
    return sessionData.session?.access_token ?? null;
  };

  const handleSavePhaseYoutube = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPhaseId) return;
    if (adminRole === "agent") {
      setPhaseSaveMsg("Only the CEO or a manager can edit phase media.");
      return;
    }
    setPhaseSaveLoading(true);
    setPhaseSaveMsg(null);

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setPhaseSaveMsg("Session expired — please refresh and sign in again.");
        return;
      }

      const result = await updatePhaseYoutubeFn({
        data: {
          callerAccessToken: accessToken,
          phaseId: selectedPhaseId,
          youtubeVideoUrl: editingPhaseYoutube.trim() || null,
        },
      });

      if (!result.success) {
        setPhaseSaveMsg("Error saving video URL: " + result.error);
      } else {
        setPhaseSaveMsg("YouTube video URL saved successfully!");
        loadData();
      }
    } catch (err: any) {
      setPhaseSaveMsg("Something went wrong: " + (err?.message || "Unknown error."));
    } finally {
      setPhaseSaveLoading(false);
    }
  };

  const resetNewPhaseForm = () => {
    setNewPhaseSlug("");
    setNewPhaseSlugTouched(false);
    setNewPhaseName("");
    setNewPhaseNumber("");
    setNewPhaseLocation("");
    setNewPhaseRegion("");
    setNewPhaseCounty("");
    setNewPhaseDescription("");
    setNewPhaseFeatures("");
    setNewPhaseError(null);
  };

  const handleCreatePhase = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewPhaseSaving(true);
    setNewPhaseError(null);

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setNewPhaseError("Session expired — please refresh and sign in again.");
        return;
      }

      const result = await createPhaseFn({
        data: {
          callerAccessToken: accessToken,
          slug: newPhaseSlug || slugify(newPhaseName),
          name: newPhaseName,
          phaseNumber: newPhaseNumber ? Number(newPhaseNumber) : undefined,
          location: newPhaseLocation,
          region: newPhaseRegion,
          county: newPhaseCounty || undefined,
          description: newPhaseDescription || undefined,
          features: newPhaseFeatures
            ? newPhaseFeatures
                .split(",")
                .map((f) => f.trim())
                .filter(Boolean)
            : undefined,
        },
      });

      if (!result.success) {
        setNewPhaseError(result.error ?? "Error creating phase.");
        return;
      }
      setNewPhaseDialogOpen(false);
      resetNewPhaseForm();
      await loadData();
      if (result.phaseId) setSelectedPhaseId(result.phaseId);
    } catch (err: any) {
      setNewPhaseError("Something went wrong: " + (err?.message || "Unknown error."));
    } finally {
      setNewPhaseSaving(false);
    }
  };

  const openEditPhase = () => {
    if (!activePhase) return;
    setEditPhaseName(activePhase.name);
    setEditPhaseNumber(activePhase.phase_number != null ? String(activePhase.phase_number) : "");
    setEditPhaseLocation(activePhase.location);
    setEditPhaseRegion(activePhase.region);
    setEditPhaseCounty(activePhase.county ?? "");
    setEditPhaseStatus(activePhase.status);
    setEditPhaseDescription(activePhase.description ?? "");
    setEditPhaseFeatures((activePhase.features ?? []).join(", "));
    setEditLocationNarrative(activePhase.location_narrative ?? "");
    setEditLegalNarrative(activePhase.legal_narrative ?? "");
    setEditInfraItems(activePhase.infrastructure_items ?? []);
    setEditNeighborhoodItems(activePhase.neighborhood_items ?? []);
    setEditPhaseError(null);
    setEditPhaseDialogOpen(true);
  };

  const addInfraItem = () =>
    setEditInfraItems((items) => [...items, { icon: AMENITY_ICON_KEYS[0], label: "", done: true }]);
  const removeInfraItem = (i: number) =>
    setEditInfraItems((items) => items.filter((_, idx) => idx !== i));
  const moveInfraItem = (i: number, dir: -1 | 1) =>
    setEditInfraItems((items) => {
      const next = [...items];
      const j = i + dir;
      if (j < 0 || j >= next.length) return items;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const addNeighborhoodItem = () =>
    setEditNeighborhoodItems((items) => [
      ...items,
      { icon: AMENITY_ICON_KEYS[0], label: "", value: "" },
    ]);
  const removeNeighborhoodItem = (i: number) =>
    setEditNeighborhoodItems((items) => items.filter((_, idx) => idx !== i));
  const moveNeighborhoodItem = (i: number, dir: -1 | 1) =>
    setEditNeighborhoodItems((items) => {
      const next = [...items];
      const j = i + dir;
      if (j < 0 || j >= next.length) return items;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const handleUpdatePhaseDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePhase) return;
    setEditPhaseSaving(true);
    setEditPhaseError(null);

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setEditPhaseError("Session expired — please refresh and sign in again.");
        return;
      }

      const result = await updatePhaseDetailsFn({
        data: {
          callerAccessToken: accessToken,
          phaseId: activePhase.id,
          name: editPhaseName,
          phaseNumber: editPhaseNumber ? Number(editPhaseNumber) : null,
          location: editPhaseLocation,
          region: editPhaseRegion,
          county: editPhaseCounty || null,
          status: editPhaseStatus,
          description: editPhaseDescription || null,
          features: editPhaseFeatures
            .split(",")
            .map((f) => f.trim())
            .filter(Boolean),
          locationNarrative: editLocationNarrative || null,
          legalNarrative: editLegalNarrative || null,
          infrastructureItems: editInfraItems.filter((it) => it.label.trim()),
          neighborhoodItems: editNeighborhoodItems.filter(
            (it) => it.label.trim() && it.value.trim(),
          ),
        },
      });

      if (!result.success) {
        setEditPhaseError(result.error ?? "Error saving phase details.");
        return;
      }
      setEditPhaseDialogOpen(false);
      loadData();
    } catch (err: any) {
      setEditPhaseError("Something went wrong: " + (err?.message || "Unknown error."));
    } finally {
      setEditPhaseSaving(false);
    }
  };

  const handleTogglePhaseArchived = async (archived: boolean) => {
    if (!activePhase) return;
    if (
      archived &&
      !confirm(
        `Archive "${activePhase.name}"? It will be hidden from the public site and this list, but nothing is deleted — you can restore it anytime.`,
      )
    ) {
      return;
    }
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setEditPhaseError("Session expired — please refresh and sign in again.");
        return;
      }
      const result = await setPhaseArchivedFn({
        data: { callerAccessToken: accessToken, phaseId: activePhase.id, archived },
      });
      if (!(result as any)?.success) {
        setEditPhaseError((result as any)?.error ?? "Error archiving phase.");
        return;
      }
      setEditPhaseDialogOpen(false);
      loadData();
    } catch (err: any) {
      setEditPhaseError("Something went wrong: " + (err?.message || "Unknown error."));
    }
  };

  const resetAddPlotForm = () => {
    setNewPlotNumber("");
    setNewPlotRow("");
    setNewPlotCol("");
    setNewPlotSizeId("");
    setNewPlotNotes("");
    setNewPlotPhotoUrls([]);
    setAddPlotError(null);
  };

  const handleCreatePlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPhaseId) return;
    setAddPlotSaving(true);
    setAddPlotError(null);

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setAddPlotError("Session expired — please refresh and sign in again.");
        return;
      }

      const result = await createPlotFn({
        data: {
          callerAccessToken: accessToken,
          phaseId: selectedPhaseId,
          plotNumber: Number(newPlotNumber),
          rowNum: Number(newPlotRow),
          colNum: Number(newPlotCol),
          sizeId: newPlotSizeId || undefined,
          notes: newPlotNotes || undefined,
          photoUrls: newPlotPhotoUrls.length > 0 ? newPlotPhotoUrls : undefined,
        },
      });

      if (!result.success) {
        setAddPlotError(result.error ?? "Error adding plot.");
        return;
      }
      setAddPlotDialogOpen(false);
      resetAddPlotForm();
      loadData();
    } catch (err: any) {
      setAddPlotError("Something went wrong: " + (err?.message || "Unknown error."));
    } finally {
      setAddPlotSaving(false);
    }
  };

  const handleTogglePlotArchived = async (plot: PlotWithSize, archived: boolean) => {
    if (
      archived &&
      !confirm(
        `Archive Plot #${plot.plot_number}? It will be hidden from the public site and this list, but nothing is deleted — you can restore it anytime.`,
      )
    ) {
      return;
    }
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        alert("Session expired — please refresh and sign in again.");
        return;
      }
      const result = await setPlotArchivedFn({
        data: { callerAccessToken: accessToken, plotId: plot.id, archived },
      });
      if (!(result as any)?.success) {
        alert("Error: " + ((result as any)?.error ?? "Unknown error."));
      }
      loadData();
    } catch (err: any) {
      alert("Something went wrong: " + (err?.message || "Unknown error."));
    }
  };

  const resetSizeForm = () => {
    setEditingSizeId(null);
    setSizeLabel("");
    setSizeDescription("");
    setSizeAreaHa("");
    setSizeCashPrice("");
    setSizeInstallmentPrice("");
    setSizeInstallmentMonths("");
    setSizePlotType("residential");
    setSizeIsDefault(false);
    setSizePromoActive(false);
    setSizePromoLabel("");
    setSizePromoPrice("");
    setSizeError(null);
  };

  const openCreateSize = () => {
    resetSizeForm();
    setSizeDialogOpen(true);
  };

  const openEditSize = (size: PlotSize) => {
    setEditingSizeId(size.id);
    setSizeLabel(size.label);
    setSizeDescription(size.size_description ?? "");
    setSizeAreaHa(size.area_ha != null ? String(size.area_ha) : "");
    setSizeCashPrice(String(size.cash_price));
    setSizeInstallmentPrice(size.installment_price != null ? String(size.installment_price) : "");
    setSizeInstallmentMonths(
      size.installment_months != null ? String(size.installment_months) : "",
    );
    setSizePlotType(size.plot_type);
    setSizeIsDefault(size.is_default);
    setSizePromoActive(size.promo_active);
    setSizePromoLabel(size.promo_label ?? "");
    setSizePromoPrice(size.promo_price != null ? String(size.promo_price) : "");
    setSizeError(null);
    setSizeDialogOpen(true);
  };

  const handleSaveSize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPhaseId) return;
    setSizeSaving(true);
    setSizeError(null);

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setSizeError("Session expired — please refresh and sign in again.");
        return;
      }

      const result = await savePlotSizeFn({
        data: {
          callerAccessToken: accessToken,
          id: editingSizeId ?? undefined,
          phaseId: selectedPhaseId,
          label: sizeLabel,
          sizeDescription: sizeDescription || undefined,
          areaHa: sizeAreaHa ? Number(sizeAreaHa) : undefined,
          cashPrice: Number(sizeCashPrice),
          installmentPrice: sizeInstallmentPrice ? Number(sizeInstallmentPrice) : undefined,
          installmentMonths: sizeInstallmentMonths ? Number(sizeInstallmentMonths) : undefined,
          plotType: sizePlotType,
          isDefault: sizeIsDefault,
          promoActive: sizePromoActive,
          promoLabel: sizePromoLabel || undefined,
          promoPrice: sizePromoPrice ? Number(sizePromoPrice) : undefined,
        },
      });

      if (!result.success) {
        setSizeError(result.error ?? "Error saving pricing tier.");
        return;
      }
      setSizeDialogOpen(false);
      resetSizeForm();
      loadData();
    } catch (err: any) {
      setSizeError("Something went wrong: " + (err?.message || "Unknown error."));
    } finally {
      setSizeSaving(false);
    }
  };

  const handleDeactivateSize = async (size: PlotSize) => {
    if (!confirm(`Deactivate "${size.label}"? It will no longer be selectable for new plots.`)) {
      return;
    }
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        alert("Session expired — please refresh and sign in again.");
        return;
      }
      const result = await setPlotSizeActiveFn({
        data: { callerAccessToken: accessToken, sizeId: size.id, active: false },
      });
      if (!(result as any)?.success) {
        alert("Error: " + ((result as any)?.error ?? "Unknown error."));
      }
      loadData();
    } catch (err: any) {
      alert("Something went wrong: " + (err?.message || "Unknown error."));
    }
  };

  // PlotMap's `id` is the plot NUMBER (see src/lib/phases.ts's adaptPhase),
  // not the database row id — look up the real plot to get a routable UUID.
  const handleMapPlotSelect = (mapPlot: MapPlot) => {
    const real = activePhasePlots.find((p) => p.plot_number === mapPlot.id);
    if (real) {
      navigate({ to: "/admin/plots/$plotId", params: { plotId: real.id } });
    }
  };

  // Position Plots: clicking the site-plan image places (or repositions)
  // the currently-armed plot at that click's percentage position.
  const handlePositionImageClick = async (e: React.MouseEvent<HTMLImageElement>) => {
    if (!armedPlotId || !positionImgRef.current) return;
    const rect = positionImgRef.current.getBoundingClientRect();
    const xPct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const yPct = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    setPositionSaving(true);
    setPositionMsg(null);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setPositionMsg("Session expired — please refresh and sign in again.");
        return;
      }
      const result = await updatePlotDetailsFn({
        data: { callerAccessToken: accessToken, plotId: armedPlotId, mapX: xPct, mapY: yPct },
      });
      if (!result.success) {
        setPositionMsg("Error: " + result.error);
      } else {
        setArmedPlotId(null);
        loadData();
      }
    } catch (err: any) {
      setPositionMsg("Something went wrong: " + (err?.message || "Unknown error."));
    } finally {
      setPositionSaving(false);
    }
  };

  const columnHelper = createColumnHelper<PlotWithSize>();
  const columns = useMemo(
    () => [
      columnHelper.accessor("plot_number", {
        header: "Plot Number",
        cell: (ctx) => (
          <span className="font-bold text-primary-container inline-flex items-center gap-2">
            GP-PLOT-#{ctx.getValue()}
            {ctx.row.original.is_archived && <StatusBadge tone="neutral">Archived</StatusBadge>}
          </span>
        ),
      }),
      columnHelper.display({
        id: "phase",
        header: "Project Phase",
        cell: (ctx) => phases.find((p) => p.id === ctx.row.original.phase_id)?.name || "—",
      }),
      columnHelper.accessor((row) => plotDimensions(row.plot_sizes), {
        id: "dimensions",
        header: "Dimensions",
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (ctx) => (
          <StatusBadge tone={PLOT_STATUS_TONE[ctx.getValue()]}>{ctx.getValue()}</StatusBadge>
        ),
      }),
      columnHelper.accessor((row) => row.plot_sizes?.cash_price ?? 0, {
        id: "price",
        header: "Price",
        cell: (ctx) =>
          ctx.getValue() > 0 ? (
            <span className="font-semibold text-primary">
              {formatFromKes(ctx.getValue(), "KES")}
            </span>
          ) : (
            <span className="text-on-surface-variant">—</span>
          ),
      }),
      columnHelper.display({
        id: "actions",
        header: () => <span className="block text-right">Actions</span>,
        cell: (ctx) => (
          <div className="flex justify-end gap-2">
            <Link
              to="/admin/plots/$plotId"
              params={{ plotId: ctx.row.original.id }}
              className="px-3 py-1.5 bg-surface-container-high text-primary font-label-md text-xs rounded-lg hover:bg-primary hover:text-white transition-all font-semibold inline-flex items-center gap-1"
            >
              <Eye size={13} /> Deep Dive
            </Link>
            <button
              onClick={() => {
                if (adminRole === "agent") {
                  alert("Access Denied: Agents cannot manually modify plot statuses.");
                  return;
                }
                setEditingPlot(ctx.row.original);
                setNewPlotStatus(ctx.row.original.status);
              }}
              className="px-3 py-1.5 border border-outline-variant text-on-surface-variant font-label-md text-xs rounded-lg hover:bg-surface-container-low transition-all inline-flex items-center gap-1"
            >
              <PenTool size={13} /> Edit Status
            </button>
            {adminRole !== "agent" && (
              <button
                onClick={() =>
                  handleTogglePlotArchived(ctx.row.original, !ctx.row.original.is_archived)
                }
                className="px-3 py-1.5 border border-outline-variant text-on-surface-variant font-label-md text-xs rounded-lg hover:bg-surface-container-low transition-all inline-flex items-center gap-1"
              >
                {ctx.row.original.is_archived ? (
                  <>
                    <ArchiveRestore size={13} /> Restore
                  </>
                ) : (
                  <>
                    <Archive size={13} /> Archive
                  </>
                )}
              </button>
            )}
          </div>
        ),
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [phases, adminRole],
  );

  const table = useReactTable({
    data: activePhasePlots,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary font-bold">
            Land Inventory
          </h1>
          <p className="text-body-md text-on-surface-variant">
            Manage masterplan plot inventory, statuses, and phase overrides
          </p>
        </div>
        <div className="flex items-center gap-3">
          <FreshnessStamp updatedAt={lastUpdated} />
          {adminRole !== "agent" && (
            <button
              onClick={() => {
                resetNewPhaseForm();
                setNewPhaseDialogOpen(true);
              }}
              className="px-4 py-2.5 bg-primary text-white font-label-md text-xs rounded-lg hover:opacity-90 inline-flex items-center gap-1.5"
            >
              <Plus size={14} /> New Phase
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          label="Total Plots Tracked"
          value={dataLoading ? "…" : String(plots.length)}
          icon={Layers}
        />
        <KpiCard
          label="Available"
          value={dataLoading ? "…" : String(globalTotals.available)}
          icon={MapPin}
          tone="success"
        />
        <KpiCard
          label="Booked"
          value={dataLoading ? "…" : String(globalTotals.booked)}
          icon={MapPin}
          tone="warning"
        />
        <KpiCard label="Sold" value={dataLoading ? "…" : String(globalTotals.sold)} icon={MapPin} />
        <KpiCard
          label="Absorption Rate"
          value={dataLoading ? "…" : `${absorptionRate}%`}
          icon={TrendingUp}
          tone="success"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Inventory by Phase (% Sold)">
          {dataLoading ? (
            <Skeleton className="h-45 rounded-xl" />
          ) : inventoryByPhase.length === 0 ? (
            <EmptyState title="No phases yet" />
          ) : (
            <CategoryBarChart
              data={inventoryByPhase}
              xKey="name"
              yKey="value"
              height={200}
              horizontal
              valueFormatter={(v) => `${v}%`}
            />
          )}
        </SectionCard>
        <SectionCard title="Price Distribution — Active Phase">
          {dataLoading ? (
            <Skeleton className="h-45 rounded-xl" />
          ) : priceDistribution.length === 0 ? (
            <EmptyState title="No plot sizes for this phase" />
          ) : (
            <CategoryBarChart data={priceDistribution} xKey="name" yKey="value" height={200} />
          )}
        </SectionCard>
      </div>

      <div className="luxury-card rounded-xl p-5 shadow-sm space-y-4 bg-white">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">
              Select Project / Phase
            </label>
            <div className="flex gap-2">
              <select
                value={selectedPhaseId}
                onChange={(e) => setSelectedPhaseId(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-md py-2.5 px-3 outline-none"
              >
                {visiblePhases.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Phase {p.phase_number ?? "N/A"}){p.is_archived ? " — Archived" : ""}
                  </option>
                ))}
              </select>
              {adminRole !== "agent" && activePhase && (
                <button
                  onClick={openEditPhase}
                  className="px-3 py-2.5 border border-outline-variant/40 rounded-lg text-xs font-semibold text-on-surface hover:bg-surface-container-low whitespace-nowrap"
                >
                  Edit Details
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-[160px]">
            <label className="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">
              Plot Status
            </label>
            <select
              value={inventoryStatusFilter}
              onChange={(e) =>
                setInventoryStatusFilter(e.target.value as typeof inventoryStatusFilter)
              }
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-md py-2.5 px-3 outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="available">Available</option>
              <option value="booked">Booked</option>
              <option value="sold">Sold</option>
            </select>
          </div>

          <div className="flex items-end gap-2 pt-5">
            <button
              onClick={() => setInventoryViewMode("table")}
              className={`py-2.5 px-4 rounded-lg font-label-md text-xs transition-colors ${
                inventoryViewMode === "table"
                  ? "bg-primary text-white"
                  : "bg-surface-container-high text-on-surface"
              }`}
            >
              Table View
            </button>
            <button
              onClick={() => setInventoryViewMode("grid")}
              className={`py-2.5 px-4 rounded-lg font-label-md text-xs transition-colors ${
                inventoryViewMode === "grid"
                  ? "bg-primary text-white"
                  : "bg-surface-container-high text-on-surface"
              }`}
            >
              Grid Map
            </button>
            <button
              onClick={() => setInventoryViewMode("position")}
              className={`py-2.5 px-4 rounded-lg font-label-md text-xs transition-colors ${
                inventoryViewMode === "position"
                  ? "bg-primary text-white"
                  : "bg-surface-container-high text-on-surface"
              }`}
            >
              Position Plots
            </button>
          </div>

          <label className="flex items-end gap-2 pt-5 text-xs font-semibold text-on-surface-variant whitespace-nowrap">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            Show Archived
          </label>

          {adminRole !== "agent" && (
            <div className="flex items-end pt-5">
              <button
                onClick={() => {
                  resetAddPlotForm();
                  setAddPlotDialogOpen(true);
                }}
                disabled={!selectedPhaseId}
                className="py-2.5 px-4 rounded-lg font-label-md text-xs bg-secondary-container text-on-secondary-container hover:opacity-90 inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                <Plus size={14} /> Add Plot
              </button>
            </div>
          )}
        </div>
      </div>

      {inventoryViewMode === "table" ? (
        <div className="luxury-card rounded-xl shadow-sm overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low border-b border-outline-variant/30">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        onClick={header.column.getToggleSortingHandler()}
                        className={`px-6 py-4 font-label-md text-on-surface-variant uppercase text-[11px] ${
                          header.column.getCanSort() ? "cursor-pointer select-none" : ""
                        }`}
                      >
                        <span className="inline-flex items-center gap-1">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            <ArrowUpDown size={11} className="opacity-50" />
                          )}
                        </span>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-surface-container-low/50 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-6 py-4 text-body-md text-on-surface">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
                {!dataLoading && activePhasePlots.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-on-surface-variant">
                      No plots found for this phase.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : inventoryViewMode === "grid" ? (
        <div className="luxury-card rounded-xl p-6 bg-white space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-headline-md text-headline-md text-primary font-bold">
              Interactive Plot Map — {activePhase?.name ?? "Select a phase"}
            </h3>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-green-500"></span> Available
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-yellow-500"></span> Booked
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500"></span> Sold
              </span>
            </div>
          </div>
          {mapLoading || dataLoading ? (
            <Skeleton className="h-96 rounded-xl" />
          ) : !mapPhase || mapPhase.plots.length === 0 ? (
            <EmptyState title="No masterplan grid for this phase" />
          ) : (
            <PlotMap
              plots={mapPhase.plots}
              selectedId={null}
              onSelect={handleMapPlotSelect}
              showAvailableOnly={false}
            />
          )}
        </div>
      ) : (
        <div className="luxury-card rounded-xl p-6 bg-white space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="font-headline-md text-headline-md text-primary font-bold">
              Position Plots — {activePhase?.name ?? "Select a phase"}
            </h3>
            {activePhase?.site_plan_image_url && (
              <span className="text-xs font-semibold text-on-surface-variant">
                {activePhasePlots.filter((p) => p.map_x != null && p.map_y != null).length} of{" "}
                {activePhasePlots.length} plots positioned
              </span>
            )}
          </div>

          {!activePhase ? (
            <EmptyState title="Select a phase" />
          ) : !activePhase.site_plan_image_url ? (
            <EmptyState
              title="No site plan image uploaded yet"
              description="Upload a real site-plan photo for this phase from Campaigns & Content → Media Manager before positioning plots here."
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
              <div className="relative rounded-xl overflow-hidden border border-outline-variant/30 bg-surface-container-low">
                <img
                  ref={positionImgRef}
                  src={activePhase.site_plan_image_url}
                  alt={`${activePhase.name} site plan`}
                  className={`w-full h-auto block select-none ${
                    armedPlotId ? "cursor-crosshair" : "cursor-default"
                  } ${positionSaving ? "opacity-60 pointer-events-none" : ""}`}
                  onClick={handlePositionImageClick}
                />
                {activePhasePlots
                  .filter((p) => p.map_x != null && p.map_y != null)
                  .map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setArmedPlotId(p.id);
                      }}
                      title={`Plot #${p.plot_number} — click to reposition`}
                      className={`absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow ${
                        armedPlotId === p.id ? "ring-2 ring-accent" : ""
                      } ${
                        p.status === "available"
                          ? "bg-green-500"
                          : p.status === "booked"
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                      style={{ left: `${p.map_x}%`, top: `${p.map_y}%` }}
                    />
                  ))}
              </div>
              <div className="space-y-3">
                {armedPlotId && (
                  <div className="text-xs bg-primary-container/20 text-primary rounded-lg p-3">
                    Click anywhere on the image to place Plot #
                    {activePhasePlots.find((p) => p.id === armedPlotId)?.plot_number}.{" "}
                    <button
                      type="button"
                      onClick={() => setArmedPlotId(null)}
                      className="underline"
                    >
                      Cancel
                    </button>
                  </div>
                )}
                {positionMsg && <div className="text-xs text-error">{positionMsg}</div>}
                <div>
                  <p className="text-[11px] font-semibold text-on-surface-variant uppercase mb-1.5">
                    Unpositioned Plots
                  </p>
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {activePhasePlots
                      .filter((p) => p.map_x == null || p.map_y == null)
                      .map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setArmedPlotId(p.id)}
                          disabled={positionSaving}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                            armedPlotId === p.id
                              ? "bg-primary text-white"
                              : "bg-surface-container-low hover:bg-surface-container-high"
                          }`}
                        >
                          Plot #{p.plot_number}
                        </button>
                      ))}
                    {activePhasePlots.length > 0 &&
                      activePhasePlots.every((p) => p.map_x != null && p.map_y != null) && (
                        <p className="text-xs text-on-surface-variant">
                          Every plot in this phase is positioned.
                        </p>
                      )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <SectionCard
        title="Pricing & Plot Sizes"
        action={
          adminRole !== "agent" ? (
            <button
              onClick={openCreateSize}
              disabled={!selectedPhaseId}
              className="px-3 py-1.5 bg-primary text-white font-label-md text-xs rounded-lg hover:opacity-90 inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <Plus size={13} /> Add Size
            </button>
          ) : undefined
        }
      >
        {activePhaseSizes.length === 0 ? (
          <EmptyState title="No pricing tiers defined for this phase yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="border-b border-outline-variant/20">
                <tr className="text-[11px] uppercase text-on-surface-variant">
                  <th className="py-2 pr-4">Label</th>
                  <th className="py-2 pr-4">Area</th>
                  <th className="py-2 pr-4">Cash Price</th>
                  <th className="py-2 pr-4">Promo</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {activePhaseSizes.map((size) => (
                  <tr key={size.id}>
                    <td className="py-2.5 pr-4 font-semibold">
                      {size.label}
                      {size.is_default && (
                        <span className="ml-2 text-[10px] text-primary font-bold uppercase">
                          Default
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4">{size.area_ha ? `${size.area_ha} ha` : "—"}</td>
                    <td className="py-2.5 pr-4 font-semibold text-primary">
                      {formatFromKes(size.cash_price, "KES")}
                    </td>
                    <td className="py-2.5 pr-4">
                      {size.promo_active ? (
                        <StatusBadge tone="warning">
                          {size.promo_label || "On Promo"}
                          {size.promo_price ? ` — ${formatFromKes(size.promo_price, "KES")}` : ""}
                        </StatusBadge>
                      ) : (
                        <span className="text-on-surface-variant">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4">
                      <StatusBadge tone={size.is_active ? "success" : "neutral"}>
                        {size.is_active ? "Active" : "Inactive"}
                      </StatusBadge>
                    </td>
                    <td className="py-2.5 text-right">
                      {adminRole !== "agent" && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditSize(size)}
                            className="px-2.5 py-1 border border-outline-variant text-on-surface-variant text-xs rounded-lg hover:bg-surface-container-low inline-flex items-center gap-1"
                          >
                            <PenTool size={12} /> Edit
                          </button>
                          {size.is_active && (
                            <button
                              onClick={() => handleDeactivateSize(size)}
                              className="px-2.5 py-1 border border-outline-variant text-on-surface-variant text-xs rounded-lg hover:bg-surface-container-low inline-flex items-center gap-1"
                            >
                              <Archive size={12} /> Deactivate
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <div className="luxury-card p-6 rounded-xl bg-white space-y-3">
        <h4 className="font-headline-md text-sm text-primary font-bold">
          Configure Project Media Walkthrough
        </h4>
        <p className="text-xs text-on-surface-variant">
          Set the YouTube video walkthrough URL for the selected project phase.
        </p>
        {phaseSaveMsg && (
          <div
            className={`p-3 rounded-lg text-xs font-semibold ${
              phaseSaveMsg.includes("Error")
                ? "bg-red-100 text-red-800"
                : "bg-green-100 text-green-800"
            }`}
          >
            {phaseSaveMsg}
          </div>
        )}
        <form onSubmit={handleSavePhaseYoutube} className="flex gap-3 max-w-lg">
          <input
            type="url"
            value={editingPhaseYoutube}
            onChange={(e) => setEditingPhaseYoutube(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="flex-1 p-2.5 bg-surface-container-low border border-outline-variant/30 rounded-lg text-xs outline-none"
          />
          <button
            type="submit"
            disabled={phaseSaveLoading}
            className="px-5 py-2.5 bg-primary text-white font-label-md text-xs rounded-lg hover:opacity-90"
          >
            {phaseSaveLoading ? "Saving..." : "Save Walkthrough URL"}
          </button>
        </form>
      </div>

      <Dialog open={!!editingPlot} onOpenChange={(open) => !open && setEditingPlot(null)}>
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Edit Plot #{editingPlot?.plot_number}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-on-surface-variant -mt-2">
            Override this plot's status in the inventory system.
          </p>
          <form onSubmit={handleUpdatePlotStatus} className="flex flex-col gap-4">
            {statusSaveError && (
              <div className="p-2.5 rounded-lg bg-error/10 text-error text-xs font-semibold">
                {statusSaveError}
              </div>
            )}
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
            <DialogFooter className="gap-2 sm:gap-0">
              <button
                type="button"
                onClick={() => setEditingPlot(null)}
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

      {/* ── New Phase ── */}
      <Dialog
        open={newPhaseDialogOpen}
        onOpenChange={(open) => {
          setNewPhaseDialogOpen(open);
          if (!open) resetNewPhaseForm();
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>New Phase</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreatePhase} className="flex flex-col gap-3">
            {newPhaseError && (
              <div className="p-2.5 rounded-lg bg-error/10 text-error text-xs font-semibold">
                {newPhaseError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={LABEL_CLS}>Name</label>
                <input
                  required
                  value={newPhaseName}
                  onChange={(e) => {
                    setNewPhaseName(e.target.value);
                    if (!newPhaseSlugTouched) setNewPhaseSlug(slugify(e.target.value));
                  }}
                  className={INPUT_CLS}
                  placeholder="Gatepath Malindi Heights"
                />
              </div>
              <div className="col-span-2">
                <label className={LABEL_CLS}>Slug (URL)</label>
                <input
                  required
                  value={newPhaseSlug}
                  onChange={(e) => {
                    setNewPhaseSlug(slugify(e.target.value));
                    setNewPhaseSlugTouched(true);
                  }}
                  className={INPUT_CLS}
                  placeholder="malindi-heights"
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Phase Number</label>
                <input
                  type="number"
                  value={newPhaseNumber}
                  onChange={(e) => setNewPhaseNumber(e.target.value)}
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Location</label>
                <input
                  required
                  value={newPhaseLocation}
                  onChange={(e) => setNewPhaseLocation(e.target.value)}
                  className={INPUT_CLS}
                  placeholder="Malindi"
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Region</label>
                <input
                  required
                  value={newPhaseRegion}
                  onChange={(e) => setNewPhaseRegion(e.target.value)}
                  className={INPUT_CLS}
                  placeholder="Coast"
                />
              </div>
              <div>
                <label className={LABEL_CLS}>County</label>
                <input
                  value={newPhaseCounty}
                  onChange={(e) => setNewPhaseCounty(e.target.value)}
                  className={INPUT_CLS}
                  placeholder="Kilifi"
                />
              </div>
              <div className="col-span-2">
                <label className={LABEL_CLS}>Description</label>
                <textarea
                  rows={3}
                  value={newPhaseDescription}
                  onChange={(e) => setNewPhaseDescription(e.target.value)}
                  className={INPUT_CLS}
                />
              </div>
              <div className="col-span-2">
                <label className={LABEL_CLS}>Features (comma-separated)</label>
                <input
                  value={newPhaseFeatures}
                  onChange={(e) => setNewPhaseFeatures(e.target.value)}
                  className={INPUT_CLS}
                  placeholder="Gated community, Title deed ready, Electricity"
                />
              </div>
            </div>
            <p className="text-[11px] text-on-surface-variant">
              New phases start as "Coming Soon" — set media (hero image, brochure, etc.) from
              Campaigns &amp; Content once created.
            </p>
            <DialogFooter className="gap-2 sm:gap-0">
              <button
                type="button"
                onClick={() => setNewPhaseDialogOpen(false)}
                className="flex-1 py-2.5 border border-outline-variant/40 rounded-lg text-sm font-semibold text-on-surface hover:bg-surface-container-low"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={newPhaseSaving}
                className="flex-1 py-2.5 bg-accent text-white rounded-lg text-sm font-bold hover:bg-accent-dark disabled:opacity-60"
              >
                {newPhaseSaving ? "Creating..." : "Create Phase"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Phase Details ── */}
      <Dialog open={editPhaseDialogOpen} onOpenChange={setEditPhaseDialogOpen}>
        <DialogContent className="sm:max-w-[680px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Phase Details — {activePhase?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdatePhaseDetails} className="flex flex-col gap-3">
            {editPhaseError && (
              <div className="p-2.5 rounded-lg bg-error/10 text-error text-xs font-semibold">
                {editPhaseError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={LABEL_CLS}>Name</label>
                <input
                  required
                  value={editPhaseName}
                  onChange={(e) => setEditPhaseName(e.target.value)}
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Phase Number</label>
                <input
                  type="number"
                  value={editPhaseNumber}
                  onChange={(e) => setEditPhaseNumber(e.target.value)}
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Status</label>
                <select
                  value={editPhaseStatus}
                  onChange={(e) => setEditPhaseStatus(e.target.value as Phase["status"])}
                  className={INPUT_CLS}
                >
                  <option value="active">Active</option>
                  <option value="coming_soon">Coming Soon</option>
                  <option value="sold_out">Sold Out</option>
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>Location</label>
                <input
                  required
                  value={editPhaseLocation}
                  onChange={(e) => setEditPhaseLocation(e.target.value)}
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Region</label>
                <input
                  required
                  value={editPhaseRegion}
                  onChange={(e) => setEditPhaseRegion(e.target.value)}
                  className={INPUT_CLS}
                />
              </div>
              <div className="col-span-2">
                <label className={LABEL_CLS}>County</label>
                <input
                  value={editPhaseCounty}
                  onChange={(e) => setEditPhaseCounty(e.target.value)}
                  className={INPUT_CLS}
                />
              </div>
              <div className="col-span-2">
                <label className={LABEL_CLS}>Description</label>
                <textarea
                  rows={3}
                  value={editPhaseDescription}
                  onChange={(e) => setEditPhaseDescription(e.target.value)}
                  className={INPUT_CLS}
                />
              </div>
              <div className="col-span-2">
                <label className={LABEL_CLS}>Features (comma-separated, short tags)</label>
                <input
                  value={editPhaseFeatures}
                  onChange={(e) => setEditPhaseFeatures(e.target.value)}
                  className={INPUT_CLS}
                />
              </div>
            </div>

            <div className="pt-3 border-t border-outline-variant/20">
              <label className={LABEL_CLS}>
                Location Details — the property page's "Location Details" tab
              </label>
              <RichTextEditor value={editLocationNarrative} onChange={setEditLocationNarrative} />
            </div>

            <div className="pt-3 border-t border-outline-variant/20">
              <div className="flex items-center justify-between mb-1.5">
                <label className={LABEL_CLS + " mb-0"}>Infrastructure &amp; Amenities</label>
                <button
                  type="button"
                  onClick={addInfraItem}
                  className="text-[11px] font-semibold text-primary hover:underline"
                >
                  + Add item
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {editInfraItems.length === 0 && (
                  <p className="text-[12px] text-on-surface-variant italic">
                    No items yet — the tab falls back to the default checklist until you add some.
                  </p>
                )}
                {editInfraItems.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 bg-surface-container-low rounded-lg p-2"
                  >
                    <select
                      value={item.icon}
                      onChange={(e) =>
                        setEditInfraItems((items) =>
                          items.map((it, idx) =>
                            idx === i ? { ...it, icon: e.target.value } : it,
                          ),
                        )
                      }
                      className="p-1.5 border border-outline-variant/40 rounded text-xs bg-white outline-none"
                    >
                      {AMENITY_ICON_KEYS.map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </select>
                    <input
                      placeholder="e.g. Tarmac road access"
                      value={item.label}
                      onChange={(e) =>
                        setEditInfraItems((items) =>
                          items.map((it, idx) =>
                            idx === i ? { ...it, label: e.target.value } : it,
                          ),
                        )
                      }
                      className="flex-1 p-1.5 border border-outline-variant/40 rounded text-xs bg-white outline-none"
                    />
                    <label className="flex items-center gap-1 text-[11px] font-medium text-on-surface-variant shrink-0">
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={(e) =>
                          setEditInfraItems((items) =>
                            items.map((it, idx) =>
                              idx === i ? { ...it, done: e.target.checked } : it,
                            ),
                          )
                        }
                      />
                      Done
                    </label>
                    <button
                      type="button"
                      onClick={() => moveInfraItem(i, -1)}
                      className="p-1 text-on-surface-variant hover:text-primary"
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveInfraItem(i, 1)}
                      className="p-1 text-on-surface-variant hover:text-primary"
                    >
                      <ArrowDown size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeInfraItem(i)}
                      className="p-1 text-error hover:text-error"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-outline-variant/20">
              <div className="flex items-center justify-between mb-1.5">
                <label className={LABEL_CLS + " mb-0"}>Neighborhood &amp; Distances</label>
                <button
                  type="button"
                  onClick={addNeighborhoodItem}
                  className="text-[11px] font-semibold text-primary hover:underline"
                >
                  + Add item
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {editNeighborhoodItems.length === 0 && (
                  <p className="text-[12px] text-on-surface-variant italic">
                    No items yet — this section stays hidden on the public page until you add some.
                  </p>
                )}
                {editNeighborhoodItems.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 bg-surface-container-low rounded-lg p-2"
                  >
                    <select
                      value={item.icon}
                      onChange={(e) =>
                        setEditNeighborhoodItems((items) =>
                          items.map((it, idx) =>
                            idx === i ? { ...it, icon: e.target.value } : it,
                          ),
                        )
                      }
                      className="p-1.5 border border-outline-variant/40 rounded text-xs bg-white outline-none"
                    >
                      {AMENITY_ICON_KEYS.map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </select>
                    <input
                      placeholder="e.g. Nearest Hospital"
                      value={item.label}
                      onChange={(e) =>
                        setEditNeighborhoodItems((items) =>
                          items.map((it, idx) =>
                            idx === i ? { ...it, label: e.target.value } : it,
                          ),
                        )
                      }
                      className="w-[150px] p-1.5 border border-outline-variant/40 rounded text-xs bg-white outline-none"
                    />
                    <input
                      placeholder="e.g. 4 minutes — Mama Rehema Clinic"
                      value={item.value}
                      onChange={(e) =>
                        setEditNeighborhoodItems((items) =>
                          items.map((it, idx) =>
                            idx === i ? { ...it, value: e.target.value } : it,
                          ),
                        )
                      }
                      className="flex-1 p-1.5 border border-outline-variant/40 rounded text-xs bg-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => moveNeighborhoodItem(i, -1)}
                      className="p-1 text-on-surface-variant hover:text-primary"
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveNeighborhoodItem(i, 1)}
                      className="p-1 text-on-surface-variant hover:text-primary"
                    >
                      <ArrowDown size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeNeighborhoodItem(i)}
                      className="p-1 text-error hover:text-error"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-outline-variant/20">
              <label className={LABEL_CLS}>
                Legal &amp; Title — the property page's "Legal &amp; Title" tab
              </label>
              <RichTextEditor value={editLegalNarrative} onChange={setEditLegalNarrative} />
            </div>

            <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-between">
              <span className="text-xs text-on-surface-variant">
                {activePhase?.is_archived
                  ? "This phase is archived — hidden from the public site."
                  : "Archiving hides this phase from the public site, reversibly."}
              </span>
              <button
                type="button"
                onClick={() => handleTogglePhaseArchived(!activePhase?.is_archived)}
                className="px-3 py-1.5 border border-outline-variant text-on-surface-variant text-xs rounded-lg hover:bg-surface-container-low inline-flex items-center gap-1.5"
              >
                {activePhase?.is_archived ? (
                  <>
                    <ArchiveRestore size={13} /> Restore Phase
                  </>
                ) : (
                  <>
                    <Archive size={13} /> Archive Phase
                  </>
                )}
              </button>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <button
                type="button"
                onClick={() => setEditPhaseDialogOpen(false)}
                className="flex-1 py-2.5 border border-outline-variant/40 rounded-lg text-sm font-semibold text-on-surface hover:bg-surface-container-low"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editPhaseSaving}
                className="flex-1 py-2.5 bg-accent text-white rounded-lg text-sm font-bold hover:bg-accent-dark disabled:opacity-60"
              >
                {editPhaseSaving ? "Saving..." : "Save Details"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Add Plot ── */}
      <Dialog
        open={addPlotDialogOpen}
        onOpenChange={(open) => {
          setAddPlotDialogOpen(open);
          if (!open) resetAddPlotForm();
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Add Plot — {activePhase?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreatePlot} className="flex flex-col gap-3">
            {addPlotError && (
              <div className="p-2.5 rounded-lg bg-error/10 text-error text-xs font-semibold">
                {addPlotError}
              </div>
            )}
            <p className="text-[11px] text-on-surface-variant -mt-1">
              Current grid for this phase:{" "}
              {activePhasePlots.length > 0
                ? `${Math.max(...activePhasePlots.map((p) => p.row_num))} row(s) × ${Math.max(...activePhasePlots.map((p) => p.col_num))} col(s)`
                : "empty — this will be the first plot"}
              . Row/column position and plot number must be unique within the phase.
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={LABEL_CLS}>Plot Number</label>
                <input
                  required
                  type="number"
                  value={newPlotNumber}
                  onChange={(e) => setNewPlotNumber(e.target.value)}
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Row</label>
                <input
                  required
                  type="number"
                  min={1}
                  value={newPlotRow}
                  onChange={(e) => setNewPlotRow(e.target.value)}
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Column</label>
                <input
                  required
                  type="number"
                  min={1}
                  value={newPlotCol}
                  onChange={(e) => setNewPlotCol(e.target.value)}
                  className={INPUT_CLS}
                />
              </div>
            </div>
            <div>
              <label className={LABEL_CLS}>Pricing Tier / Size</label>
              <select
                value={newPlotSizeId}
                onChange={(e) => setNewPlotSizeId(e.target.value)}
                className={INPUT_CLS}
              >
                <option value="">— Select a size —</option>
                {activePhaseSizes
                  .filter((s) => s.is_active)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label} ({formatFromKes(s.cash_price, "KES")})
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>Notes</label>
              <textarea
                rows={2}
                value={newPlotNotes}
                onChange={(e) => setNewPlotNotes(e.target.value)}
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>Photos &amp; Videos</label>
              <MediaDropzone
                value={newPlotPhotoUrls}
                onChange={(v) => setNewPlotPhotoUrls(v as string[])}
                multi
                accept="image/*,video/*"
                category="plot"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <button
                type="button"
                onClick={() => setAddPlotDialogOpen(false)}
                className="flex-1 py-2.5 border border-outline-variant/40 rounded-lg text-sm font-semibold text-on-surface hover:bg-surface-container-low"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addPlotSaving}
                className="flex-1 py-2.5 bg-accent text-white rounded-lg text-sm font-bold hover:bg-accent-dark disabled:opacity-60"
              >
                {addPlotSaving ? "Adding..." : "Add Plot"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Plot Size / Pricing ── */}
      <Dialog
        open={sizeDialogOpen}
        onOpenChange={(open) => {
          setSizeDialogOpen(open);
          if (!open) resetSizeForm();
        }}
      >
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{editingSizeId ? "Edit Pricing Tier" : "New Pricing Tier"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveSize} className="flex flex-col gap-3">
            {sizeError && (
              <div className="p-2.5 rounded-lg bg-error/10 text-error text-xs font-semibold">
                {sizeError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={LABEL_CLS}>Label</label>
                <input
                  required
                  value={sizeLabel}
                  onChange={(e) => setSizeLabel(e.target.value)}
                  className={INPUT_CLS}
                  placeholder="50 x 100 ft"
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Area (hectares)</label>
                <input
                  type="number"
                  step="0.01"
                  value={sizeAreaHa}
                  onChange={(e) => setSizeAreaHa(e.target.value)}
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Plot Type</label>
                <select
                  value={sizePlotType}
                  onChange={(e) => setSizePlotType(e.target.value as PlotSize["plot_type"])}
                  className={INPUT_CLS}
                >
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="agricultural">Agricultural</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>Cash Price (KES)</label>
                <input
                  required
                  type="number"
                  value={sizeCashPrice}
                  onChange={(e) => setSizeCashPrice(e.target.value)}
                  className={INPUT_CLS}
                />
              </div>
              <div>
                <label className={LABEL_CLS}>Installment Price (KES)</label>
                <input
                  type="number"
                  value={sizeInstallmentPrice}
                  onChange={(e) => setSizeInstallmentPrice(e.target.value)}
                  className={INPUT_CLS}
                />
              </div>
              <div className="col-span-2">
                <label className={LABEL_CLS}>Installment Months</label>
                <input
                  type="number"
                  value={sizeInstallmentMonths}
                  onChange={(e) => setSizeInstallmentMonths(e.target.value)}
                  className={INPUT_CLS}
                />
              </div>
              <label className="col-span-2 flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
                <input
                  type="checkbox"
                  checked={sizeIsDefault}
                  onChange={(e) => setSizeIsDefault(e.target.checked)}
                />
                Default size shown for this phase
              </label>
            </div>

            <div className="pt-2 border-t border-outline-variant/20 space-y-3">
              <label className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
                <input
                  type="checkbox"
                  checked={sizePromoActive}
                  onChange={(e) => setSizePromoActive(e.target.checked)}
                />
                Promo active — shows a discounted price and badge on the public site
              </label>
              {sizePromoActive && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LABEL_CLS}>Promo Label</label>
                    <input
                      value={sizePromoLabel}
                      onChange={(e) => setSizePromoLabel(e.target.value)}
                      className={INPUT_CLS}
                      placeholder="Limited Time Offer"
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Promo Price (KES)</label>
                    <input
                      type="number"
                      value={sizePromoPrice}
                      onChange={(e) => setSizePromoPrice(e.target.value)}
                      className={INPUT_CLS}
                    />
                  </div>
                </div>
              )}
              <p className="text-[11px] text-on-surface-variant">
                Display-only — the actual amount charged at checkout still comes from the real
                inquiry/reservation flow, unaffected by this promo price.
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <button
                type="button"
                onClick={() => setSizeDialogOpen(false)}
                className="flex-1 py-2.5 border border-outline-variant/40 rounded-lg text-sm font-semibold text-on-surface hover:bg-surface-container-low"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sizeSaving}
                className="flex-1 py-2.5 bg-accent text-white rounded-lg text-sm font-bold hover:bg-accent-dark disabled:opacity-60"
              >
                {sizeSaving ? "Saving..." : "Save Pricing Tier"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
