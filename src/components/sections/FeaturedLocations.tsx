import { useEffect, useState } from "react";
import { MapPin, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Reveal } from "@/components/Reveal";
import { supabase } from "@/lib/supabase";

const locationToSlug: Record<string, string> = {
  Malindi: "malindi-acres-phase-5",
  Sagana: "baraka-plains-phase-6",
  Diani: "diani-plots",
  Nanyuki: "waridi-gardens-phase-1",
  Thika: "juja-plot",
  Matuu: "watali-gardens-phase-1",
  Kithimani: "zuri-court-phase-1",
  Kiambu: "watali-gardens-phase-2",
};

const defaultLocations = [
  {
    name: "Malindi",
    region: "Coast Region",
    price: "From Ksh 350,000",
    plots: 14,
    img: "https://images.unsplash.com/photo-1473773508845-188df298d2d1?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Sagana",
    region: "Kirinyaga County",
    price: "From Ksh 480,000",
    plots: 9,
    img: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Diani",
    region: "Kwale County",
    price: "From Ksh 550,000",
    plots: 7,
    img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Nanyuki",
    region: "Laikipia County",
    price: "From Ksh 420,000",
    plots: 11,
    img: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Thika",
    region: "Kiambu County",
    price: "From Ksh 620,000",
    plots: 6,
    img: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Matuu",
    region: "Machakos County",
    price: "From Ksh 380,000",
    plots: 13,
    img: "https://images.unsplash.com/photo-1501862700950-18382cd41497?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Kithimani",
    region: "Machakos County",
    price: "From Ksh 320,000",
    plots: 18,
    img: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Kiambu",
    region: "Kiambu County",
    price: "From Ksh 750,000",
    plots: 4,
    img: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
  },
];

export function FeaturedLocations() {
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

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {defaultLocations.map((l) => {
            const hasCustomImg = !!customLocImages[l.name];
            const displayImg = customLocImages[l.name] || l.img;
            return (
              <Reveal key={l.name}>
                <Link
                  to="/properties/$slug"
                  params={{ slug: locationToSlug[l.name] ?? "malindi-acres-phase-5" }}
                  className="group relative block h-[420px] rounded-[16px] overflow-hidden shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)] transition-all duration-400 hover:scale-[1.02] cursor-pointer bg-[#0A192F] border border-[#E5E0D8]"
                >
                  <img
                    src={displayImg}
                    alt={`${l.name}, Kenya land`}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                  />

                  {/* Gradient Overlay — subtle edge-only for custom posters, standard for stock images */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background: hasCustomImg
                        ? "linear-gradient(to top, rgba(10,25,47,0.7) 0%, rgba(0,0,0,0) 40%, rgba(10,25,47,0.5) 100%)"
                        : "linear-gradient(to top, rgba(11,127,199,0.92) 0%, rgba(11,127,199,0.35) 55%, transparent 100%)",
                    }}
                  />

                  {/* Top Floating Glassmorphism Badge Bar — keeps poster visual completely clear */}
                  <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-[#0A192F]/80 backdrop-blur-md border border-white/20 text-[#E8A020]">
                      <MapPin size={12} strokeWidth={2} />
                      {l.name}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#22C55E]/90 text-white backdrop-blur-md shadow-sm">
                      {l.plots} plots available
                    </span>
                  </div>

                  {/* Bottom Info Bar — compact translucent bar */}
                  <div className="absolute inset-x-0 bottom-0 p-5 text-white z-10" style={{ background: "linear-gradient(to top, rgba(10,25,47,0.92) 0%, rgba(10,25,47,0.4) 80%, transparent 100%)" }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[11px] text-white/70 font-medium">{l.region}</div>
                        <div className="font-numbers font-bold text-[14px] text-[#E8A020] mt-0.5">
                          {l.price}
                        </div>
                      </div>
                      <div className="inline-flex items-center gap-1 bg-[#E8A020] text-[#0A192F] text-[11px] font-extrabold px-3 py-1.5 rounded-lg group-hover:bg-[#D4AF37] transition-all shadow-md">
                        Explore <ArrowRight size={12} />
                      </div>
                    </div>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>

        <div className="mt-14 text-center">
          <Link
            to="/properties"
            className="inline-flex items-center gap-2 border-2 border-primary text-primary px-7 py-3.5 text-sm font-semibold rounded-md hover:bg-primary hover:text-white transition-all duration-300"
          >
            View All 12+ Locations →
          </Link>
        </div>
      </div>
    </section>
  );
}
