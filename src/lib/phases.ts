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
  id: string;
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
    id: dbPhase.id,
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

// ─── Client Cache ─────────────────────────────────────────────────────────────

let cachePhases: Phase[] | null = null;
let cachePhasesPromise: Promise<Phase[]> | null = null;
const cacheSinglePhases: Record<string, Phase> = {};
const cacheSinglePromises: Record<string, Promise<Phase>> = {};

// Clean up cache when running on server to prevent cross-request leaks
const isServer = typeof window === "undefined";

/** Hook for all active phases. */
export function usePhases() {
  const [phases, setPhases] = useState<Phase[]>(cachePhases ?? []);
  const [loading, setLoading] = useState(cachePhases === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // If cache is ready, skip fetch
    if (cachePhases && !isServer) {
      setPhases(cachePhases);
      setLoading(false);
      return;
    }

    const fetch = async () => {
      // Deduplicate simultaneous requests
      if (!cachePhasesPromise || isServer) {
        cachePhasesPromise = Promise.all([
          supabase.from("phases").select("*").order("name"),
          supabase.from("plot_sizes").select("*"),
        ]).then(([phaseRes, plotSizeRes]) => {
          if (phaseRes.error) {
            throw new Error(phaseRes.error.message);
          }
          const dbPhases = phaseRes.data ?? [];
          const dbSizes = plotSizeRes.data ?? [];
          const adapted = dbPhases.map((p) => adaptPhase(p, dbSizes));
          if (!isServer) {
            cachePhases = adapted;
          }
          return adapted;
        });
      }

      try {
        const adapted = await cachePhasesPromise;
        if (cancelled) return;
        setPhases(adapted);
        setLoading(false);
      } catch (err: any) {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      }
    };

    fetch();
    return () => { cancelled = true; };
  }, []);

  return { phases, loading, error };
}

/** Hook for a single phase (with real-time plot subscription). */
export function usePhase(slug: string) {
  const [phase, setPhase] = useState<Phase | null>(cacheSinglePhases[slug] ?? null);
  const [loading, setLoading] = useState(cacheSinglePhases[slug] === undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    // SWR / Background Refresh
    const fetch = async () => {
      if (!cacheSinglePromises[slug] || isServer) {
        cacheSinglePromises[slug] = (async () => {
          const { data: dbPhase, error: phaseErr } = await supabase
            .from("phases")
            .select("*")
            .eq("slug", slug)
            .single();

          if (phaseErr || !dbPhase) {
            throw new Error(phaseErr?.message ?? "Phase not found");
          }

          const [plotSizeRes, plotsRes] = await Promise.all([
            supabase.from("plot_sizes").select("*").eq("phase_id", dbPhase.id),
            supabase
              .from("plots")
              .select("*")
              .eq("phase_id", dbPhase.id)
              .order("plot_number"),
          ]);

          const adapted = adaptPhase(
            dbPhase,
            plotSizeRes.data ?? [],
            plotsRes.data ?? []
          );
          
          if (!isServer) {
            cacheSinglePhases[slug] = adapted;
          }
          return adapted;
        })();
      }

      try {
        const adapted = await cacheSinglePromises[slug];
        if (cancelled) return;
        setPhase(adapted);
        setLoading(false);
      } catch (err: any) {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      }
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
          // Re-fetch plot details FOR THIS PHASE ONLY to preserve joined sizes
          const { data: updatedPlots } = await supabase
            .from("plots")
            .select("*")
            .eq("phase_id", phase.id)
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
              
              const updated = { ...prev, plots: mapped };
              if (!isServer) {
                cacheSinglePhases[phase.slug] = updated;
              }
              return updated;
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [phase?.slug, phase?.id]);

  return { phase, loading, error };
}

/** Format price for display. */
export function fmtPrice(price: number | null | undefined): string {
  if (!price) return "Contact us";
  return `Ksh ${price.toLocaleString()}`;
}
