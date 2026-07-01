/**
 * Gatepath Realtors — Data Layer
 * All phase and plot data is now served from Supabase.
 * The legacy hardcoded array has been removed.
 */
import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import type { Phase, Plot, PlotSize } from "./types";

// ─── Re-export types for backwards compatibility ──────────────────────────────
export type { Phase, Plot, PlotSize };

// ─── Hooks ───────────────────────────────────────────────────────────────────

/** Fetch all active phases (for properties listing page). */
export function usePhases() {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetch = async () => {
      setLoading(true);
      const { data, error: err } = await supabase
        .from("phases")
        .select("*")
        .order("status", { ascending: true }) // active first
        .order("name");

      if (!cancelled) {
        if (err) setError(err.message);
        else setPhases(data ?? []);
        setLoading(false);
      }
    };

    fetch();
    return () => { cancelled = true; };
  }, []);

  return { phases, loading, error };
}

/** Fetch a single phase with its plots and plot sizes. */
export function usePhase(slug: string) {
  const [phase, setPhase] = useState<Phase | null>(null);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [plotSizes, setPlotSizes] = useState<PlotSize[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    const fetch = async () => {
      setLoading(true);

      const [phaseRes, plotSizeRes] = await Promise.all([
        supabase.from("phases").select("*").eq("slug", slug).single(),
        supabase.from("plot_sizes").select("*").order("cash_price"),
      ]);

      if (cancelled) return;

      if (phaseRes.error || !phaseRes.data) {
        setError(phaseRes.error?.message ?? "Phase not found");
        setLoading(false);
        return;
      }

      const phaseData = phaseRes.data;
      setPhase(phaseData);

      const sizes = (plotSizeRes.data ?? []).filter(
        (s) => s.phase_id === phaseData.id
      );
      setPlotSizes(sizes);

      // Fetch plots for this phase
      const { data: plotData, error: plotErr } = await supabase
        .from("plots")
        .select("*")
        .eq("phase_id", phaseData.id)
        .order("plot_number");

      if (!cancelled) {
        if (plotErr) setError(plotErr.message);
        else setPlots(plotData ?? []);
        setLoading(false);
      }
    };

    fetch();
    return () => { cancelled = true; };
  }, [slug]);

  // Subscribe to real-time plot status changes
  useEffect(() => {
    if (!phase?.id) return;

    const channel = supabase
      .channel(`plots-${phase.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "plots",
          filter: `phase_id=eq.${phase.id}`,
        },
        (payload) => {
          setPlots((prev) =>
            prev.map((p) =>
              p.id === payload.new.id ? { ...p, ...(payload.new as Plot) } : p
            )
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [phase?.id]);

  return { phase, plots, plotSizes, loading, error };
}

/** Get a single plot's size for display. */
export function getDefaultSize(plotSizes: PlotSize[]): PlotSize | undefined {
  return plotSizes.find((s) => s.is_default) ?? plotSizes[0];
}

/** Format price for display. */
export function fmtPrice(price: number | null | undefined): string {
  if (!price) return "Contact us";
  return `Ksh ${price.toLocaleString()}`;
}

/** Get starting price for a phase (lowest cash price across its plot sizes). */
export function getStartingPrice(plotSizes: PlotSize[]): number {
  if (!plotSizes.length) return 0;
  return Math.min(...plotSizes.map((s) => s.cash_price));
}
