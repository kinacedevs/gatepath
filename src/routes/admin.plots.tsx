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
import { useEffect, useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
  flexRender,
  type SortingState,
} from "@tanstack/react-table";
import { Layers, ArrowUpDown, Eye, PenTool, MapPin, TrendingUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdminSession } from "@/context/AdminSessionContext";
import { formatFromKes } from "@/lib/currency";
import { updatePlotStatusFn } from "@/lib/plotActions";
import { usePhase, type Plot as MapPlot } from "@/lib/phases";
import { PlotMap } from "@/components/properties/PlotMap";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { KpiCard } from "@/components/admin/KpiCard";
import { SectionCard } from "@/components/admin/SectionCard";
import { EmptyState } from "@/components/admin/EmptyState";
import { FreshnessStamp } from "@/components/admin/FreshnessStamp";
import { CategoryBarChart } from "@/components/admin/charts/CategoryBarChart";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Phase, Plot, PlotSize } from "@/lib/types";

export const Route = createFileRoute("/admin/plots")({
  component: LandInventory,
});

type PlotWithSize = Plot & { plot_sizes: PlotSize | null };

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
  const [dataLoading, setDataLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [selectedPhaseId, setSelectedPhaseId] = useState<string>("");
  const [inventoryStatusFilter, setInventoryStatusFilter] = useState<
    "all" | "available" | "booked" | "sold"
  >("all");
  const [inventoryViewMode, setInventoryViewMode] = useState<"grid" | "table">("table");
  const [sorting, setSorting] = useState<SortingState>([]);

  const [editingPlot, setEditingPlot] = useState<PlotWithSize | null>(null);
  const [newPlotStatus, setNewPlotStatus] = useState<"available" | "booked" | "sold">("available");
  const [statusSaveError, setStatusSaveError] = useState<string | null>(null);

  const [editingPhaseYoutube, setEditingPhaseYoutube] = useState("");
  const [phaseSaveLoading, setPhaseSaveLoading] = useState(false);
  const [phaseSaveMsg, setPhaseSaveMsg] = useState<string | null>(null);

  const loadData = async () => {
    setDataLoading(true);
    try {
      const [phasesRes, plotsRes] = await Promise.all([
        supabase.from("phases").select("*").order("name"),
        supabase.from("plots").select("*, plot_sizes(*)").order("plot_number"),
      ]);

      const phaseRows = (phasesRes.data as Phase[]) ?? [];
      setPhases(phaseRows);
      setPlots((plotsRes.data as PlotWithSize[]) ?? []);

      if (phaseRows.length > 0 && !selectedPhaseId) {
        setSelectedPhaseId(phaseRows[0].id);
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

  const activePhasePlots = useMemo(() => {
    return plots
      .filter((p) => p.phase_id === selectedPhaseId)
      .filter((p) => inventoryStatusFilter === "all" || p.status === inventoryStatusFilter);
  }, [plots, selectedPhaseId, inventoryStatusFilter]);

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
  };

  const handleSavePhaseYoutube = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPhaseId) return;
    setPhaseSaveLoading(true);
    setPhaseSaveMsg(null);

    const { error } = await (supabase as any)
      .from("phases")
      .update({ youtube_video_url: editingPhaseYoutube.trim() || null })
      .eq("id", selectedPhaseId);

    if (error) {
      setPhaseSaveMsg("Error saving video URL: " + error.message);
    } else {
      setPhaseSaveMsg("YouTube video URL saved successfully!");
      loadData();
    }
    setPhaseSaveLoading(false);
  };

  // PlotMap's `id` is the plot NUMBER (see src/lib/phases.ts's adaptPhase),
  // not the database row id — look up the real plot to get a routable UUID.
  const handleMapPlotSelect = (mapPlot: MapPlot) => {
    const real = activePhasePlots.find((p) => p.plot_number === mapPlot.id);
    if (real) {
      navigate({ to: "/admin/plots/$plotId", params: { plotId: real.id } });
    }
  };

  const columnHelper = createColumnHelper<PlotWithSize>();
  const columns = useMemo(
    () => [
      columnHelper.accessor("plot_number", {
        header: "Plot Number",
        cell: (ctx) => (
          <span className="font-bold text-primary-container">GP-PLOT-#{ctx.getValue()}</span>
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
            <span className="font-semibold text-secondary">
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
        <FreshnessStamp updatedAt={lastUpdated} />
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
            <select
              value={selectedPhaseId}
              onChange={(e) => setSelectedPhaseId(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-md py-2.5 px-3 outline-none"
            >
              {phases.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Phase {p.phase_number ?? "N/A"})
                </option>
              ))}
            </select>
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
          </div>
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
      ) : (
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
      )}

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
    </div>
  );
}
