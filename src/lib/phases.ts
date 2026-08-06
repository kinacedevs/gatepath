/**
 * Gatepath Realtors — Data Layer
 * Serves fully-adapted UI types mapped from the Supabase database.
 * Enables real-time map updates and type safety with zero runtime overhead.
 */
import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import type {
  Phase as DbPhase,
  Plot as DbPlot,
  PlotSize as DbPlotSize,
  InfrastructureItem,
  NeighborhoodItem,
} from "./types";

// ─── UI Types (Expected by frontend components) ──────────────────────────────

export interface Plot {
  id: number;
  row: number;
  col: number;
  status: "available" | "booked" | "sold";
  size: string;
  price: number;
  /** Display-only promo pricing (Part 3, Phase A) — the real amount charged
   * at checkout still comes from the inquiry/reservation flow, unaffected. */
  promoActive?: boolean;
  promoLabel?: string | null;
  promoPrice?: number | null;
  /** Percentage (0-100) position on the phase's siteImageUrl (Phase 42).
   * Null means not positioned yet on the real site-plan image. */
  mapX?: number | null;
  mapY?: number | null;
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
  /** Staff-authored rich-text HTML (Phase 40D) — null means "use the
   * page's default generic sentence," not "show nothing." */
  location_narrative?: string | null;
  legal_narrative?: string | null;
  infrastructure_items?: InfrastructureItem[] | null;
  neighborhood_items?: NeighborhoodItem[] | null;
  startingPrice: number;
  size: string;
  plots: Plot[];
  youtube_video_url?: string | null;
  hero_image_urls?: string[] | null;
  /** PDF brochure URL — uploaded & managed from admin Media tab. */
  brochure_url?: string | null;
  /** Plot map PDF URL for client download. */
  plot_map_url?: string | null;
  /** Real uploaded site-plan image used as the interactive map background
   * once every plot is positioned on it (Phase 42). */
  site_plan_image_url?: string | null;
  /** True if any active pricing tier in this phase has a promo on (Part 3, Phase A). */
  hasPromo?: boolean;
  /** Manual homepage "Hot Picks" override (Part 3, Slice B). */
  isHotPick?: boolean;
  hotPickOrder?: number;
  hotPickExpiresAt?: string | null;
  hotPickBadgeText?: string | null;
}

// ─── Adapters ────────────────────────────────────────────────────────────────

const LOCATION_IMAGES: Record<string, string> = {
  malindi:
    "https://images.unsplash.com/photo-1473773508845-188df298d2d1?auto=format&fit=crop&w=800&q=80",
  sagana:
    "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80",
  diani:
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
  nanyuki:
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80",
  thika:
    "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80",
  matuu:
    "https://images.unsplash.com/photo-1501862700950-18382cd41497?auto=format&fit=crop&w=800&q=80",
  kithimani:
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=800&q=80",
  kiambu:
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80",
  gongoni:
    "https://images.unsplash.com/photo-1473773508845-188df298d2d1?auto=format&fit=crop&w=800&q=80",
  marafa:
    "https://images.unsplash.com/photo-1501862700950-18382cd41497?auto=format&fit=crop&w=800&q=80",
  makutano:
    "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80",
  juja: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80",
  pumwani:
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80",
  nairobi:
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80",
};

export function adaptPhase(dbPhase: DbPhase, dbSizes: DbPlotSize[], dbPlots: DbPlot[] = []): Phase {
  // `!== false` (not `=== true`) so this degrades gracefully before
  // migration 0022 is applied and the column doesn't exist yet (undefined
  // reads as "active", the pre-existing behavior).
  const sizesForPhase = dbSizes.filter(
    (s) => s.phase_id === dbPhase.id && (s as any).is_active !== false,
  );
  const plotsForPhase = dbPlots.filter((p) => (p as any).is_archived !== true);
  const defaultSize = sizesForPhase.find((s) => s.is_default) ?? sizesForPhase[0];
  const startingPrice = sizesForPhase.length
    ? Math.min(...sizesForPhase.map((s) => s.cash_price))
    : 0;

  const mappedPlots = plotsForPhase.map((p) => {
    const sizeObj = sizesForPhase.find((s) => s.id === p.size_id) ?? defaultSize;
    return {
      id: p.plot_number,
      row: p.row_num,
      col: p.col_num,
      status: p.status,
      size: sizeObj ? sizeObj.label.replace(" ft", "") : "50x100",
      price: sizeObj ? sizeObj.cash_price : 0,
      promoActive: (sizeObj as any)?.promo_active ?? false,
      promoLabel: (sizeObj as any)?.promo_label ?? null,
      promoPrice: (sizeObj as any)?.promo_price ?? null,
      mapX: (p as any).map_x ?? null,
      mapY: (p as any).map_y ?? null,
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
      dbPhase.image_urls?.[0] ??
      dbPhase.image_url ??
      LOCATION_IMAGES[dbPhase.location.toLowerCase()] ??
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80",
    description: dbPhase.description ?? "",
    features: dbPhase.features ?? [],
    location_narrative: dbPhase.location_narrative ?? null,
    legal_narrative: dbPhase.legal_narrative ?? null,
    infrastructure_items: dbPhase.infrastructure_items ?? null,
    neighborhood_items: dbPhase.neighborhood_items ?? null,
    startingPrice,
    size: defaultSize ? defaultSize.label : "50x100 ft",
    plots: mappedPlots,
    youtube_video_url: dbPhase.youtube_video_url,
    hero_image_urls: dbPhase.hero_image_urls,
    brochure_url: dbPhase.brochure_url,
    plot_map_url: dbPhase.plot_map_url,
    site_plan_image_url: (dbPhase as any).site_plan_image_url ?? null,
    hasPromo: sizesForPhase.some((s) => (s as any).promo_active),
    isHotPick: (dbPhase as any).is_hot_pick ?? false,
    hotPickOrder: (dbPhase as any).hot_pick_order ?? 0,
    hotPickExpiresAt: (dbPhase as any).hot_pick_expires_at ?? null,
    hotPickBadgeText: (dbPhase as any).hot_pick_badge_text ?? null,
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
          const dbPhases = (phaseRes.data ?? []).filter((p: any) => p.is_archived !== true);
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
    return () => {
      cancelled = true;
    };
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
          const { data: dbPhaseRaw, error: phaseErr } = await supabase
            .from("phases")
            .select("*")
            .eq("slug", slug)
            .single();

          if (phaseErr || !dbPhaseRaw) {
            throw new Error(phaseErr?.message ?? "Phase not found");
          }

          const dbPhase = dbPhaseRaw as import("./types").Phase;

          const [plotSizeRes, plotsRes] = await Promise.all([
            supabase.from("plot_sizes").select("*").eq("phase_id", dbPhase.id) as any,
            supabase
              .from("plots")
              .select("*")
              .eq("phase_id", dbPhase.id)
              .order("plot_number") as any,
          ]);

          const adapted = adaptPhase(
            dbPhase,
            (plotSizeRes.data ?? []) as import("./types").PlotSize[],
            (plotsRes.data ?? []) as import("./types").Plot[],
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
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Real-time listener for plot status/inventory changes. "*" (not just
  // UPDATE) so a plot added or archived by staff appears/disappears live —
  // Part 3 "pushed live to the interactive map" — not just status flips.
  useEffect(() => {
    if (!phase) return;

    const channel = supabase
      .channel(`realtime-plots-${phase.slug}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "plots" }, async () => {
        // Re-fetch plot details + the phase's own rolling counts FOR THIS
        // PHASE ONLY to preserve joined sizes and stay correct across
        // insert/archive, not just status updates.
        const [{ data: updatedPlots }, { data: updatedPhaseRow }] = await Promise.all([
          supabase.from("plots").select("*").eq("phase_id", phase.id).order("plot_number"),
          supabase.from("phases").select("*").eq("id", phase.id).maybeSingle(),
        ]);

        if (updatedPlots) {
          setPhase((prev) => {
            if (!prev) return null;
            // Map updated plots — cast needed due to supabase-js v2.110 inference in useEffect
            const typedPlots = (updatedPlots as import("./types").Plot[]).filter(
              (p) => (p as any).is_archived !== true,
            );
            const mapped = typedPlots.map((p) => {
              const existing = prev.plots.find((ep) => ep.id === p.plot_number);
              return {
                id: p.plot_number,
                row: p.row_num,
                col: p.col_num,
                status: p.status,
                size: existing ? existing.size : "50x100",
                price: existing ? existing.price : 0,
                promoActive: existing?.promoActive ?? false,
                promoLabel: existing?.promoLabel ?? null,
                promoPrice: existing?.promoPrice ?? null,
                mapX: (p as any).map_x ?? null,
                mapY: (p as any).map_y ?? null,
              };
            });

            const phaseRow = updatedPhaseRow as import("./types").Phase | null;
            const updated = {
              ...prev,
              plots: mapped,
              totalPlots: phaseRow?.total_plots ?? prev.totalPlots,
              available: phaseRow?.available_count ?? prev.available,
              booked: phaseRow?.booked_count ?? prev.booked,
              sold: phaseRow?.sold_count ?? prev.sold,
            };
            if (!isServer) {
              cacheSinglePhases[phase.slug] = updated;
            }
            return updated;
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // Deliberately scoped to slug/id, not the whole `phase` object — `phase`
    // itself changes identity every time this effect's own setPhase runs,
    // which would otherwise re-subscribe the channel in a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase?.slug, phase?.id]);

  return { phase, loading, error };
}

/** Format price for display. */
export function fmtPrice(price: number | null | undefined): string {
  if (!price) return "Contact us";
  return `Ksh ${price.toLocaleString()}`;
}
