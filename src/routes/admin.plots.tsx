/**
 * Gatepath Realtors — Land Inventory (Phase 5B redesign)
 * Replaces the Phase 5A mechanical split of the old "plots" tab. Two real
 * fixes over the original: (1) plots are now fetched with a real
 * `plot_sizes` embed (`select("*, plot_sizes(*)")`) instead of the bare
 * `select("*")` that made every price/dimension display fall through to a
 * hardcoded fallback; (2) the "Deep Dive" plot detail view is now a real
 * route (admin.plots.$plotId.tsx) instead of a conditional sub-view stuffed
 * into this same file's state.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
  flexRender,
  type SortingState,
} from "@tanstack/react-table";
import { Layers, ArrowUpDown, Eye, PenTool } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdminSession } from "@/context/AdminSessionContext";
import { formatFromKes } from "@/lib/currency";
import { StatusBadge } from "@/components/admin/StatusBadge";
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

  const [phases, setPhases] = useState<Phase[]>([]);
  const [plots, setPlots] = useState<PlotWithSize[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [selectedPhaseId, setSelectedPhaseId] = useState<string>("");
  const [inventoryStatusFilter, setInventoryStatusFilter] = useState<
    "all" | "available" | "booked" | "sold"
  >("all");
  const [inventoryViewMode, setInventoryViewMode] = useState<"grid" | "table">("table");
  const [sorting, setSorting] = useState<SortingState>([]);

  const [editingPlot, setEditingPlot] = useState<PlotWithSize | null>(null);
  const [newPlotStatus, setNewPlotStatus] = useState<"available" | "booked" | "sold">("available");

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

  const handleUpdatePlotStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlot) return;

    if (adminRole === "agent") {
      alert("Access Denied: Agents cannot manually modify plot statuses.");
      return;
    }

    const { error } = await (supabase as any)
      .from("plots")
      .update({ status: newPlotStatus })
      .eq("id", editingPlot.id);

    if (error) {
      alert("Error updating plot status: " + error.message);
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
        <div className="flex items-center gap-3">
          <div className="bg-white border border-outline-variant/30 rounded-xl px-5 py-3 flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center text-secondary">
              <Layers size={20} />
            </div>
            <div>
              <p className="text-[10px] text-on-surface-variant uppercase font-bold">
                Total Plots Tracked
              </p>
              <p className="font-stat-lg text-stat-lg text-primary">
                {dataLoading ? "…" : plots.length}
              </p>
            </div>
          </div>
        </div>
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
              Interactive Plot Map Grid
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
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 pt-2">
            {activePhasePlots.map((plot) => {
              const bg =
                plot.status === "available"
                  ? "bg-green-100 border-green-300 text-green-800"
                  : plot.status === "booked"
                    ? "bg-yellow-100 border-yellow-300 text-yellow-800"
                    : "bg-red-100 border-red-300 text-red-800";
              return (
                <Link
                  key={plot.id}
                  to="/admin/plots/$plotId"
                  params={{ plotId: plot.id }}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center hover:scale-105 transition-all shadow-sm ${bg}`}
                >
                  <span className="text-[10px] font-bold opacity-70">PLOT</span>
                  <span className="font-stat-lg text-lg font-bold">#{plot.plot_number}</span>
                  <span className="text-[9px] uppercase font-bold mt-1 opacity-80">
                    {plot.status}
                  </span>
                </Link>
              );
            })}
          </div>
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
