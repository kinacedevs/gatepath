import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Reveal } from "@/components/Reveal";
import { PhaseCard } from "@/components/properties/PhaseCard";
import { supabase } from "@/lib/supabase";
import { usePhases } from "@/lib/phases";
import { locationToSlug } from "@/lib/locations";

// Only the name survives here, to match a real phase via locationToSlug —
// price/plots/region/image were previously fabricated or dead-weight
// fallbacks; the phase's own real thumbnail (or a staff-curated override
// via customLocImages below) is the only image source now.
const defaultLocations = [
  { name: "Malindi" },
  { name: "Sagana" },
  { name: "Diani" },
  { name: "Nanyuki" },
  { name: "Thika" },
  { name: "Matuu" },
  { name: "Kithimani" },
  { name: "Kiambu" },
];

export function FeaturedLocations() {
  const { phases, loading } = usePhases();
  const [customLocImages, setCustomLocImages] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const fetchLocationImages = async () => {
      try {
        const { data } = await (supabase as any)
          .from("site_banners")
          .select("*")
          .eq("id", "location_images")
          .single();
        if (data?.data) {
          // Normalize legacy single-string values (pre-Phase 38) into
          // 1-element arrays so this component only ever deals with arrays.
          const normalized: Record<string, string[]> = {};
          for (const [name, val] of Object.entries(data.data as Record<string, unknown>)) {
            normalized[name] = Array.isArray(val) ? (val as string[]) : val ? [val as string] : [];
          }
          setCustomLocImages(normalized);
        }
      } catch (err) {
        // silent fallback
      }
    };
    fetchLocationImages();
  }, []);

  // Real data only — a location whose mapped phase is archived/removed is
  // skipped entirely rather than shown with stale/zero data (Part 3, Slice C).
  const visibleLocations = defaultLocations
    .map((l) => ({ ...l, phase: phases.find((p) => p.slug === locationToSlug[l.name]) }))
    .filter((l): l is typeof l & { phase: NonNullable<(typeof l)["phase"]> } => !!l.phase);

  return (
    <section className="bg-background py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <Reveal className="text-center max-w-3xl mx-auto">
          <span className="eyebrow">Prime Locations</span>
          <div className="gold-divider mx-auto mt-4" />
          <h2 className="mt-6 font-serif font-semibold text-[36px] md:text-[52px] text-primary leading-[1.15]">
            Kenya's Most Sought-After
            <br />
            Land Destinations
          </h2>
          <p className="mt-6 text-[17px] text-muted-foreground max-w-2xl mx-auto leading-[1.7]">
            Hand-picked plots in Kenya's fastest-growing corridors. Each location is researched for
            infrastructure growth, road access, and long-term investment value.
          </p>
        </Reveal>

        {loading ? (
          <div className="mt-16 flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-[#E5E0D8]">
            <p className="text-sm text-slate-500">Loading live availability...</p>
          </div>
        ) : (
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {visibleLocations.map(({ name, phase }) => (
              <Reveal key={name}>
                <PhaseCard phase={phase} imageOverride={customLocImages[name]?.[0] || undefined} />
              </Reveal>
            ))}
          </div>
        )}

        <div className="mt-14 text-center">
          <Link
            to="/properties"
            className="inline-flex items-center gap-2 border-2 border-primary text-primary px-7 py-3.5 text-sm font-semibold rounded-md hover:bg-primary hover:text-white transition-all duration-300"
          >
            View All {phases.length > 0 ? phases.length : "12+"} Locations →
          </Link>
        </div>
      </div>
    </section>
  );
}
