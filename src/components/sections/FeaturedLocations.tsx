import { useEffect, useState } from "react";
import { MapPin, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Reveal } from "@/components/Reveal";
import { supabase } from "@/lib/supabase";
import { usePhases } from "@/lib/phases";
import { formatFromKes } from "@/lib/currency";
import { locationToSlug } from "@/lib/locations";

// Only the name (for matching a real phase via locationToSlug) and a
// fallback stock image survive here — price/plots/region used to be
// fabricated constants; now sourced live from usePhases() below.
const defaultLocations = [
  {
    name: "Malindi",
    img: "https://images.unsplash.com/photo-1473773508845-188df298d2d1?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Sagana",
    img: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Diani",
    img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Nanyuki",
    img: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Thika",
    img: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Matuu",
    img: "https://images.unsplash.com/photo-1501862700950-18382cd41497?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Kithimani",
    img: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Kiambu",
    img: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
  },
];

export function FeaturedLocations() {
  const { phases, loading } = usePhases();
  const [customLocImages, setCustomLocImages] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchLocationImages = async () => {
      try {
        const { data } = await (supabase as any)
          .from("site_banners")
          .select("*")
          .eq("id", "location_images")
          .single();
        if (data?.data) {
          setCustomLocImages(data.data);
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
            {visibleLocations.map(({ name, img, phase }) => {
              const hasCustomImg = !!customLocImages[name];
              const displayImg = customLocImages[name] || img;
              return (
                <Reveal key={name}>
                  <Link
                    to="/properties/$slug"
                    params={{ slug: phase.slug }}
                    className="group relative block h-[420px] rounded-[16px] overflow-hidden shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)] transition-all duration-400 hover:scale-[1.02] cursor-pointer bg-primary-deep border border-[#E5E0D8]"
                  >
                    <img
                      src={displayImg}
                      alt={`${name}, Kenya land`}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                    />

                    {/* Gradient Overlay — subtle edge-only for custom posters, standard for stock images */}
                    <div
                      className="absolute inset-0"
                      style={{
                        background: hasCustomImg
                          ? "linear-gradient(to top, rgba(7,75,125,0.7) 0%, rgba(0,0,0,0) 40%, rgba(7,75,125,0.5) 100%)"
                          : "linear-gradient(to top, rgba(11,127,199,0.92) 0%, rgba(11,127,199,0.35) 55%, transparent 100%)",
                      }}
                    />

                    {/* Top Floating Glassmorphism Badge Bar — keeps poster visual completely clear */}
                    <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-primary-deep/80 backdrop-blur-md border border-white/20 text-accent">
                        <MapPin size={12} strokeWidth={2} />
                        {name}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-available/90 text-white backdrop-blur-md shadow-sm">
                        {phase.available} plots available
                      </span>
                    </div>

                    {/* Bottom Info Bar — compact translucent bar */}
                    <div
                      className="absolute inset-x-0 bottom-0 p-5 text-white z-10"
                      style={{
                        background:
                          "linear-gradient(to top, rgba(7,75,125,0.92) 0%, rgba(7,75,125,0.4) 80%, transparent 100%)",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[11px] text-white/70 font-medium">
                            {phase.region}
                          </div>
                          <div className="font-numbers font-bold text-[14px] text-accent mt-0.5">
                            From {formatFromKes(phase.startingPrice, "KES")}
                          </div>
                        </div>
                        <div className="inline-flex items-center gap-1 bg-accent text-primary-deep text-[11px] font-extrabold px-3 py-1.5 rounded-lg group-hover:bg-accent-dark transition-all shadow-md">
                          Explore <ArrowRight size={12} />
                        </div>
                      </div>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
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
