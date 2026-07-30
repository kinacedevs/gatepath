/**
 * Gatepath Realtors — Land Inventory (Phase 5A mechanical split)
 * Relocated verbatim from the old "plots" tab (admin.tsx, previously
 * ~1509-1884), plus the "Edit Plot Status" modal (previously ~2806-2853) and
 * the phase YouTube-URL/media editor form embedded in this tab. Same JSX,
 * same inline/tailwind styles, same (supabase as any) casts — copied as-is,
 * not redesigned. The one real change: this tab's own scoped fetch (phases +
 * plots) replaces the old shared 9-table Promise.all.
 *
 * NOTE on plot_sizes: the original `plots` fetch was `select("*")` with no
 * join, so `plot.plot_sizes` was always undefined and every price display
 * fell through to the "Ksh 1,500,000" static fallback — that's a
 * pre-existing placeholder/bug, left exactly as-is per the mechanical-split
 * instructions rather than "fixed" by adding a real plot_sizes join here.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronRight, MapPin, PenTool, Layers, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdminSession } from "@/context/AdminSessionContext";
import type { Phase, Plot } from "@/lib/types";

export const Route = createFileRoute("/admin/plots")({
  component: LandInventory,
});

const NAVY = "#0C1A30";
const GOLD = "var(--accent)";
const CARD_BORDER = "#E5E0D8";

function LandInventory() {
  const { adminRole } = useAdminSession();

  const [phases, setPhases] = useState<Phase[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  const [selectedPhaseId, setSelectedPhaseId] = useState<string>("");
  const [editingPlot, setEditingPlot] = useState<Plot | null>(null);
  const [selectedPlotDetail, setSelectedPlotDetail] = useState<Plot | null>(null);
  const [inventoryStatusFilter, setInventoryStatusFilter] = useState<"all" | "available" | "booked" | "sold">("all");
  const [inventoryViewMode, setInventoryViewMode] = useState<"grid" | "table">("table");
  const [newPlotStatus, setNewPlotStatus] = useState<"available" | "booked" | "sold">("available");

  const [editingPhaseYoutube, setEditingPhaseYoutube] = useState("");
  const [phaseSaveLoading, setPhaseSaveLoading] = useState(false);
  const [phaseSaveMsg, setPhaseSaveMsg] = useState<string | null>(null);

  const loadData = async () => {
    setDataLoading(true);
    try {
      const [phasesRes, plotsRes] = await Promise.all([
        supabase.from("phases").select("*").order("name"),
        supabase.from("plots").select("*").order("plot_number"),
      ]);

      setPhases((phasesRes.data as Phase[]) ?? []);
      setPlots((plotsRes.data as Plot[]) ?? []);

      if (phasesRes.data && phasesRes.data.length > 0 && !selectedPhaseId) {
        setSelectedPhaseId((phasesRes.data[0] as Phase).id);
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

  const activePhase = useMemo(() => {
    return phases.find((p) => p.id === selectedPhaseId);
  }, [phases, selectedPhaseId]);

  useEffect(() => {
    if (activePhase) {
      setEditingPhaseYoutube(activePhase.youtube_video_url || "");
      setPhaseSaveMsg(null);
    }
  }, [activePhase]);

  const activePhasePlots = useMemo(() => {
    return plots.filter((p) => p.phase_id === selectedPhaseId);
  }, [plots, selectedPhaseId]);

  const handleUpdatePlotStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlot) return;

    if (adminRole === "agent") {
      alert("Access Denied: Agents cannot manually modify plot statuses.");
      return;
    }

    const { error } = await ((supabase as any)
      .from("plots")
      .update({ status: newPlotStatus })
      .eq("id", editingPlot.id));

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

    const { error } = await ((supabase as any)
      .from("phases")
      .update({ youtube_video_url: editingPhaseYoutube.trim() || null })
      .eq("id", selectedPhaseId));

    if (error) {
      setPhaseSaveMsg("Error saving video URL: " + error.message);
    } else {
      setPhaseSaveMsg("YouTube video URL saved successfully!");
      loadData();
    }
    setPhaseSaveLoading(false);
  };

  void dataLoading;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

      {/* ── CONDITIONAL SUB-VIEW: PROPERTY DETAILS DEEP-DIVE ── */}
      {selectedPlotDetail ? (
        <div className="space-y-6">
          {/* Header Actions */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4 border-b border-outline-variant/30">
            <div>
              <nav className="flex items-center gap-2 text-on-surface-variant text-[11px] uppercase tracking-widest font-bold mb-2">
                <button onClick={() => setSelectedPlotDetail(null)} className="hover:text-secondary flex items-center gap-1">
                  <ChevronRight size={12} className="rotate-180" /> Inventory
                </button>
                <span>/</span>
                <span className="text-secondary">Plot Details</span>
              </nav>
              <h2 className="font-headline-lg text-headline-lg text-primary-container font-bold">
                Plot #{selectedPlotDetail.plot_number} — {phases.find(p => p.id === selectedPlotDetail.phase_id)?.name || "Phase View"}
              </h2>
              <div className="flex items-center gap-3 mt-1 text-xs">
                <span className="flex items-center gap-1 text-secondary font-bold">
                  <MapPin size={14} /> Kenya Project Site
                </span>
                <span className="text-on-surface-variant">•</span>
                <span className="text-on-surface-variant font-medium">Ref ID: GP-PLOT-{selectedPlotDetail.plot_number}</span>
                <span className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                  selectedPlotDetail.status === 'available' ? 'bg-green-100 text-green-800' :
                  selectedPlotDetail.status === 'booked' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                }`}>
                  {selectedPlotDetail.status}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setEditingPlot(selectedPlotDetail);
                  setNewPlotStatus(selectedPlotDetail.status);
                }}
                className="px-6 py-3 bg-secondary-container text-on-secondary-container font-bold rounded-xl hover:opacity-90 transition-all flex items-center gap-2"
              >
                <PenTool size={16} /> Update Status
              </button>
              <button
                onClick={() => setSelectedPlotDetail(null)}
                className="px-6 py-3 border border-outline-variant text-on-surface-variant font-bold rounded-xl hover:bg-surface-container-low transition-all"
              >
                Back to Inventory
              </button>
            </div>
          </div>

          {/* Property Details Layout (Bento Cards & Media) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left Column: Media & Overview */}
            <div className="lg:col-span-2 space-y-6">
              <div className="luxury-card rounded-2xl overflow-hidden p-2 bg-white">
                <div className="h-[360px] relative rounded-xl overflow-hidden bg-primary-container/10 flex items-center justify-center">
                  {phases.find(p => p.id === selectedPlotDetail.phase_id)?.plot_map_url ? (
                    <img
                      src={phases.find(p => p.id === selectedPlotDetail.phase_id)?.plot_map_url!}
                      alt="Plot Map"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-8 text-on-surface-variant">
                      <MapPin size={48} className="mx-auto mb-3 opacity-40 text-secondary" />
                      <p className="font-headline-md text-headline-md font-bold text-primary">Plot #{selectedPlotDetail.plot_number}</p>
                      <p className="text-xs mt-1">High-Precision Boundary Map & Masterplan View</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Bento Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="luxury-card p-5 rounded-xl bg-white">
                  <p className="text-label-md text-on-surface-variant mb-1">Asking Price</p>
                  <h3 className="font-stat-lg text-stat-lg text-secondary">
                    {selectedPlotDetail.plot_sizes?.cash_price ? `Ksh ${selectedPlotDetail.plot_sizes.cash_price.toLocaleString()}` : "Ksh 1,500,000"}
                  </h3>
                  <p className="text-[11px] text-on-surface-variant mt-1">Standard Payment Plan Available</p>
                </div>
                <div className="luxury-card p-5 rounded-xl bg-white">
                  <p className="text-label-md text-on-surface-variant mb-1">Plot Dimensions</p>
                  <h3 className="font-stat-lg text-stat-lg text-primary">50 x 100 ft</h3>
                  <p className="text-[11px] text-on-surface-variant mt-1">1/8 Acre Standard</p>
                </div>
                <div className="luxury-card p-5 rounded-xl bg-white">
                  <p className="text-label-md text-on-surface-variant mb-1">Zoning & Utility</p>
                  <h3 className="font-stat-lg text-stat-lg text-primary">Residential</h3>
                  <p className="text-[11px] text-on-surface-variant mt-1">Water & Electricity On-Site</p>
                </div>
              </div>
            </div>

            {/* Right Column: Phase Context & Quick Action */}
            <div className="space-y-6">
              <div className="luxury-card p-6 rounded-2xl bg-white space-y-4">
                <h3 className="font-headline-md text-headline-md text-primary font-bold">Project Summary</h3>
                <div className="space-y-3 text-sm divide-y divide-outline-variant/20">
                  <div className="pt-2 flex justify-between">
                    <span className="text-on-surface-variant">Project Name</span>
                    <span className="font-semibold">{phases.find(p => p.id === selectedPlotDetail.phase_id)?.name || "Phase"}</span>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-on-surface-variant">Phase Number</span>
                    <span className="font-semibold">Phase {phases.find(p => p.id === selectedPlotDetail.phase_id)?.phase_number || 1}</span>
                  </div>
                  <div className="pt-2 flex justify-between">
                    <span className="text-on-surface-variant">Current Status</span>
                    <span className="font-bold capitalize">{selectedPlotDetail.status}</span>
                  </div>
                </div>

                <div className="pt-4 space-y-2">
                  <button
                    onClick={() => {
                      if (adminRole === "agent") {
                        alert("Access Denied: Agents cannot manually modify plot statuses.");
                        return;
                      }
                      setEditingPlot(selectedPlotDetail);
                      setNewPlotStatus(selectedPlotDetail.status);
                    }}
                    className="w-full py-3 bg-secondary-container text-on-secondary-container font-label-md rounded-xl hover:opacity-90 transition-all text-center block font-bold"
                  >
                    Override Status
                  </button>
                </div>
              </div>

              {/* YouTube Walkthrough config */}
              <div className="luxury-card p-6 rounded-2xl bg-white space-y-3">
                <h4 className="font-headline-md text-sm text-primary font-bold">Project Walkthrough Video</h4>
                <p className="text-xs text-on-surface-variant">Set or update the video tour link for this phase.</p>
                <form onSubmit={handleSavePhaseYoutube} className="space-y-3">
                  <input
                    type="url"
                    value={editingPhaseYoutube}
                    onChange={(e) => setEditingPhaseYoutube(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full p-2.5 bg-surface-container-low border border-outline-variant/30 rounded-lg text-xs outline-none"
                  />
                  <button
                    type="submit"
                    disabled={phaseSaveLoading}
                    className="w-full py-2 bg-primary text-white font-label-md text-xs rounded-lg hover:opacity-90"
                  >
                    {phaseSaveLoading ? "Saving..." : "Save Walkthrough URL"}
                  </button>
                </form>
              </div>
            </div>

          </div>
        </div>
      ) : (
        /* ── MAIN LAND INVENTORY OVERVIEW ── */
        <div className="space-y-6">
          {/* Top Bar Header & Stat */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="font-headline-lg text-headline-lg text-primary font-bold">Land Inventory</h1>
              <p className="text-body-md text-on-surface-variant">Manage masterplan plot inventory, statuses, and phase overrides</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-white border border-outline-variant/30 rounded-xl px-5 py-3 flex items-center gap-4 shadow-sm">
                <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center text-secondary">
                  <Layers size={20} />
                </div>
                <div>
                  <p className="text-[10px] text-on-surface-variant uppercase font-bold">Total Plots Tracked</p>
                  <p className="font-stat-lg text-stat-lg text-primary">{plots.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters Section */}
          <div className="luxury-card rounded-xl p-5 shadow-sm space-y-4 bg-white">
            <div className="flex flex-wrap items-center gap-4">

              {/* Project/Phase Selector */}
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">Select Project / Phase</label>
                <select
                  value={selectedPhaseId}
                  onChange={(e) => setSelectedPhaseId(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-md py-2.5 px-3 outline-none"
                >
                  {phases.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} (Phase {p.phase_number ?? "N/A"})</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex-1 min-w-[160px]">
                <label className="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">Plot Status</label>
                <select
                  value={inventoryStatusFilter}
                  onChange={(e: any) => setInventoryStatusFilter(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-md py-2.5 px-3 outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="available">Available</option>
                  <option value="booked">Booked</option>
                  <option value="sold">Sold</option>
                </select>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-end gap-2 pt-5">
                <button
                  onClick={() => setInventoryViewMode("table")}
                  className={`py-2.5 px-4 rounded-lg font-label-md text-xs transition-colors ${
                    inventoryViewMode === "table" ? "bg-primary text-white" : "bg-surface-container-high text-on-surface"
                  }`}
                >
                  Table View
                </button>
                <button
                  onClick={() => setInventoryViewMode("grid")}
                  className={`py-2.5 px-4 rounded-lg font-label-md text-xs transition-colors ${
                    inventoryViewMode === "grid" ? "bg-primary text-white" : "bg-surface-container-high text-on-surface"
                  }`}
                >
                  Grid Map
                </button>
              </div>
            </div>
          </div>

          {/* Content: Table View vs Grid View */}
          {inventoryViewMode === "table" ? (
            <div className="luxury-card rounded-xl shadow-sm overflow-hidden bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-surface-container-low border-b border-outline-variant/30">
                    <tr>
                      <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase text-[11px]">Plot Number</th>
                      <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase text-[11px]">Project Phase</th>
                      <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase text-[11px]">Dimensions</th>
                      <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase text-[11px]">Status</th>
                      <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase text-[11px]">Price</th>
                      <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase text-[11px] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {activePhasePlots
                      .filter(p => inventoryStatusFilter === "all" || p.status === inventoryStatusFilter)
                      .map((plot) => (
                        <tr key={plot.id} className="hover:bg-surface-container-low/50 transition-colors">
                          <td className="px-6 py-4 font-bold text-primary">
                            GP-PLOT-#{plot.plot_number}
                          </td>
                          <td className="px-6 py-4 text-body-md text-on-surface">
                            {phases.find(p => p.id === plot.phase_id)?.name || "Current Phase"}
                          </td>
                          <td className="px-6 py-4 text-body-md text-on-surface-variant">
                            50 x 100 ft
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                              plot.status === 'available' ? 'bg-green-100 text-green-800' :
                              plot.status === 'booked' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {plot.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-semibold text-secondary">
                            {plot.plot_sizes?.cash_price ? `Ksh ${plot.plot_sizes.cash_price.toLocaleString()}` : "Ksh 1,500,000"}
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button
                              onClick={() => setSelectedPlotDetail(plot)}
                              className="px-3 py-1.5 bg-surface-container-high text-primary font-label-md text-xs rounded-lg hover:bg-primary hover:text-white transition-all font-semibold"
                            >
                              Deep Dive
                            </button>
                            <button
                              onClick={() => {
                                if (adminRole === "agent") {
                                  alert("Access Denied: Agents cannot manually modify plot statuses.");
                                  return;
                                }
                                setEditingPlot(plot);
                                setNewPlotStatus(plot.status);
                              }}
                              className="px-3 py-1.5 border border-outline-variant text-on-surface-variant font-label-md text-xs rounded-lg hover:bg-surface-container-low transition-all"
                            >
                              Edit Status
                            </button>
                          </td>
                        </tr>
                      ))}
                    {activePhasePlots.length === 0 && (
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
            /* Grid View */
            <div className="luxury-card rounded-xl p-6 bg-white space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-headline-md text-headline-md text-primary font-bold">Interactive Plot Map Grid</h3>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500"></span> Available</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-yellow-500"></span> Booked</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500"></span> Sold</span>
                </div>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 pt-2">
                {activePhasePlots
                  .filter(p => inventoryStatusFilter === "all" || p.status === inventoryStatusFilter)
                  .map((plot) => {
                    const bg = plot.status === 'available' ? 'bg-green-100 border-green-300 text-green-800' :
                               plot.status === 'booked' ? 'bg-yellow-100 border-yellow-300 text-yellow-800' :
                               'bg-red-100 border-red-300 text-red-800';
                    return (
                      <button
                        key={plot.id}
                        onClick={() => setSelectedPlotDetail(plot)}
                        className={`p-3 rounded-xl border flex flex-col items-center justify-center hover:scale-105 transition-all shadow-sm ${bg}`}
                      >
                        <span className="text-[10px] font-bold opacity-70">PLOT</span>
                        <span className="font-stat-lg text-lg font-bold">#{plot.plot_number}</span>
                        <span className="text-[9px] uppercase font-bold mt-1 opacity-80">{plot.status}</span>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* YouTube Walkthrough URL Config */}
          <div className="luxury-card p-6 rounded-xl bg-white space-y-3">
            <h4 className="font-headline-md text-sm text-primary font-bold">Configure Project Media Walkthrough</h4>
            <p className="text-xs text-on-surface-variant">Set the YouTube video walkthrough URL for the selected project phase.</p>
            {phaseSaveMsg && (
              <div className={`p-3 rounded-lg text-xs font-semibold ${
                phaseSaveMsg.includes("Error") ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
              }`}>
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
        </div>
      )}

      {/* ══════════════════════════════════════════════
          MODAL: EDIT PLOT STATUS
      ══════════════════════════════════════════════ */}
      {editingPlot && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(12,26,48,0.55)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#fff", width: "100%", maxWidth: 360, borderRadius: 16, padding: 28, boxShadow: "0 32px 80px rgba(0,0,0,0.3)", position: "relative" }}>
            <button
              onClick={() => setEditingPlot(null)}
              style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "#9CA3AF" }}
            >
              <X size={18} />
            </button>
            <h3 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 20, color: NAVY, margin: 0 }}>
              Edit Plot #{editingPlot.plot_number}
            </h3>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#6B7280", marginTop: 6 }}>Override this plot's status in the inventory system.</p>

            <form onSubmit={handleUpdatePlotStatus} style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.09em" }}>
                  New Status
                </label>
                <select
                  value={newPlotStatus}
                  onChange={(e: any) => setNewPlotStatus(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", border: `1px solid ${CARD_BORDER}`, borderRadius: 8, fontFamily: "Inter, sans-serif", fontSize: 13, background: "#fff", outline: "none" }}
                >
                  <option value="available">🟢 Available</option>
                  <option value="booked">🟡 Booked</option>
                  <option value="sold">🔴 Sold</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setEditingPlot(null)}
                  style={{ flex: 1, padding: "11px", border: `1px solid ${CARD_BORDER}`, borderRadius: 8, background: "#fff", color: "#374151", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, padding: "11px", background: GOLD, border: "none", borderRadius: 8, color: "#fff", fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                >
                  Save Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
