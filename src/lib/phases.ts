/**
 * Gatepath Realtors — Data Layer
 * Serves fully-adapted UI types mapped from the Supabase database.
 * Enables real-time map updates and type safety with zero runtime overhead.
 */
import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import type { Phase as DbPhase, Plot as DbPlot, PlotSize as DbPlotSize } from "./types";

// ─── UI Types (Expected by frontend components) ──────────────────────────────

export interface Plot {
  id: number;
  row: number;
  col: number;
  status: "available" | "booked" | "sold";
  size: string;
  price: number;
}

export interface Phase {
  slug: string;
  name: string;
  phaseNumber?: number;
  location: string;
  region: string;
  status: "ACTIVE" | "COMING SOON" | "SOLD OUT";
  totalPlots: number;
  available: number;
  booked: number;
  sold: number;
  image: string;
  description: string;
  features: string[];
  startingPrice: number;
  size: string;
  plots: Plot[];
}

// ─── Adapters ────────────────────────────────────────────────────────────────

export function adaptPhase(
  dbPhase: DbPhase,
  dbSizes: DbPlotSize[],
  dbPlots: DbPlot[] = []
): Phase {
  const sizesForPhase = dbSizes.filter((s) => s.phase_id === dbPhase.id);
  const defaultSize = sizesForPhase.find((s) => s.is_default) ?? sizesForPhase[0];
  const startingPrice = sizesForPhase.length
    ? Math.min(...sizesForPhase.map((s) => s.cash_price))
    : 0;

  const mappedPlots = dbPlots.map((p) => {
    const sizeObj = sizesForPhase.find((s) => s.id === p.size_id) ?? defaultSize;
    return {
      id: p.plot_number,
      row: p.row_num,
      col: p.col_num,
      status: p.status,
      size: sizeObj ? sizeObj.label.replace(" ft", "") : "50x100",
      price: sizeObj ? sizeObj.cash_price : 0,
    };
  });

  return {
    slug: dbPhase.slug,
    name: dbPhase.name,
    phaseNumber: dbPhase.phase_number ?? undefined,
    location: dbPhase.location,
    region: dbPhase.region,
    status:
      dbPhase.status === "active"
        ? "ACTIVE"
        : dbPhase.status === "sold_out"
          ? "SOLD OUT"
          : "COMING SOON",
    totalPlots: dbPhase.total_plots,
    available: dbPhase.available_count,
    booked: dbPhase.booked_count,
    sold: dbPhase.sold_count,
    image:
      dbPhase.image_url ??
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80",
    description: dbPhase.description ?? "",
    features: dbPhase.features ?? [],
    startingPrice,
    size: defaultSize ? defaultSize.label : "50x100 ft",
    plots: mappedPlots,
  };
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

/** Fetch all active phases for property listings. */
export function usePhases() {
  const [phases, setPhases] = useState<Phase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetch = async () => {
      setLoading(true);
      const [phaseRes, plotSizeRes] = await Promise.all([
        supabase.from("phases").select("*").order("name"),
        supabase.from("plot_sizes").select("*"),
      ]);

      if (cancelled) return;

      if (phaseRes.error) {
        setError(phaseRes.error.message);
        setLoading(false);
        return;
      }

      const dbPhases = phaseRes.data ?? [];
      const dbSizes = plotSizeRes.data ?? [];

      const adapted = dbPhases.map((p) => adaptPhase(p, dbSizes));
      setPhases(adapted);
      setLoading(false);
    };

    fetch();
    return () => { cancelled = true; };
  }, []);

  return { phases, loading, error };
}

/** Hook for a single phase (with real-time plot subscription). */
export function usePhase(slug: string) {
  const [phase, setPhase] = useState<Phase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    const fetch = async () => {
      setLoading(true);

      const { data: dbPhase, error: phaseErr } = await supabase
        .from("phases")
        .select("*")
        .eq("slug", slug)
        .single();

      if (cancelled) return;

      if (phaseErr || !dbPhase) {
        setError(phaseErr?.message ?? "Phase not found");
        setLoading(false);
        return;
      }

      const [plotSizeRes, plotsRes] = await Promise.all([
        supabase.from("plot_sizes").select("*").eq("phase_id", dbPhase.id),
        supabase
          .from("plots")
          .select("*")
          .eq("phase_id", dbPhase.id)
          .order("plot_number"),
      ]);

      if (cancelled) return;

      const adapted = adaptPhase(
        dbPhase,
        plotSizeRes.data ?? [],
        plotsRes.data ?? []
      );
      setPhase(adapted);
      setLoading(false);
    };

    fetch();
    return () => { cancelled = true; };
  }, [slug]);

  // Real-time listener for plot status changes
  useEffect(() => {
    if (!phase) return;

    const channel = supabase
      .channel(`realtime-plots-${phase.slug}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "plots" },
        async () => {
          // Re-fetch plot details to preserve joined sizes
          const { data: updatedPlots } = await supabase
            .from("plots")
            .select("*")
            .order("plot_number");

          if (updatedPlots) {
            setPhase((prev) => {
              if (!prev) return null;
              // Map updated plots
              const mapped = updatedPlots.map((p) => {
                const existing = prev.plots.find((ep) => ep.id === p.plot_number);
                return {
                  id: p.plot_number,
                  row: p.row_num,
                  col: p.col_num,
                  status: p.status,
                  size: existing ? existing.size : "50x100",
                  price: existing ? existing.price : 0,
                };
              });
              return { ...prev, plots: mapped };
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [phase?.slug]);

  return { phase, loading, error };
}

/** Format price for display. */
export function fmtPrice(price: number | null | undefined): string {
  if (!price) return "Contact us";
  return `Ksh ${price.toLocaleString()}`;
}
