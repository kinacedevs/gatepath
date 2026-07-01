import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { PhaseCard } from "@/components/properties/PhaseCard";
import { usePhases } from "@/lib/phases";
import type { Phase } from "@/lib/types";

export const Route = createFileRoute("/properties/")({
  component: PropertiesPage,
  head: () => ({
    meta: [
      { title: "All Land Phases — Gatepath Realtors" },
      {
        name: "description",
        content:
          "Browse all available land phases across Kenya. Real-time plot availability in Malindi, Sagana, Diani, Matuu, Kithimani, Gongoni and Juja.",
      },
      { property: "og:title", content: "All Land Phases — Gatepath Realtors" },
      {
        property: "og:description",
        content: "Real-time plot availability across active phases in Kenya.",
      },
    ],
  }),
});

const LOCATIONS = [
  "All Locations", "Malindi", "Gongoni", "Marafa", "Diani",
  "Matuu", "Sagana", "Makutano", "Juja", "Pumwani", "Nairobi",
];

/** Map Supabase Phase row → props expected by PhaseCard */
function adaptPhase(p: Phase) {
  return {
    slug: p.slug,
    name: p.name,
    phaseNumber: p.phase_number ?? undefined,
    location: p.location,
    region: p.region,
    status: p.status === "active" ? "ACTIVE" : p.status === "sold_out" ? "SOLD OUT" : "COMING SOON",
    totalPlots: p.total_plots,
    available: p.available_count,
    booked: p.booked_count,
    sold: p.sold_count,
    image: p.image_url ?? "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80",
    description: p.description ?? "",
    features: p.features ?? [],
    startingPrice: 0, // resolved from plot_sizes separately
    size: "",         // resolved from plot_sizes separately
    plots: [],        // resolved on detail page
  };
}

function PropertiesPage() {
  const { phases: rawPhases, loading, error } = usePhases();
  const [loc, setLoc] = useState("All Locations");
  const [status, setStatus] = useState("All Status");
  const [price, setPrice] = useState("Any Price");
  const [q, setQ] = useState("");

  const phases = rawPhases.map(adaptPhase);

  const filtered = useMemo(() => {
    return phases.filter((p) => {
      if (loc !== "All Locations" && !p.location.toLowerCase().includes(loc.toLowerCase())) return false;
      if (status !== "All Status" && p.status !== status) return false;
      if (price !== "Any Price") {
        // Price filter is approximate — use starting price from phase
        const sp = 0; // will be refined once plot_sizes are joined
        if (price === "Under Ksh 400K" && sp >= 400000) return false;
        if (price === "Ksh 400K–700K" && (sp < 400000 || sp > 700000)) return false;
        if (price === "Ksh 700K–1M" && (sp < 700000 || sp > 1000000)) return false;
        if (price === "Above Ksh 1M" && sp <= 1000000) return false;
      }
      if (q.trim()) {
        const needle = q.toLowerCase();
        if (
          !p.name.toLowerCase().includes(needle) &&
          !p.location.toLowerCase().includes(needle) &&
          !p.region.toLowerCase().includes(needle)
        )
          return false;
      }
      return true;
    });
  }, [phases, loc, status, price, q]);

  const selectCls =
    "font-sans text-[14px] text-foreground bg-white border-[1.5px] border-[#D0CCC5] rounded-md py-2.5 pl-3.5 pr-9 hover:border-primary focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/10 transition-colors appearance-none cursor-pointer";

  const activeCount = rawPhases.filter((p) => p.status === "active").length;
  const totalAvailable = rawPhases.reduce((s, p) => s + p.available_count, 0);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* HERO */}
      <section className="bg-primary pt-32 pb-16 lg:pt-36 lg:pb-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-12">
          <div className="max-w-3xl">
            <div className="text-[13px] text-white/50">
              <a href="/" className="hover:text-accent">Home</a> › <span>Properties</span>
            </div>
            <div className="eyebrow mt-4">All Available Phases</div>
            <h1 className="mt-4 font-serif font-bold text-[40px] md:text-[64px] text-white leading-[1.1]">
              Browse Our Land Phases
            </h1>
            <p className="mt-5 font-light text-[18px] text-white/75 max-w-[640px] leading-[1.75]">
              Every phase below is updated in real time. Green plots are available now. Select a phase to view its interactive map and find your perfect plot.
            </p>
            <div className="mt-8 flex flex-wrap gap-12">
              {[
                [String(activeCount), "Active Phases"],
                [String(totalAvailable) + "+", "Plots Available"],
                ["11", "Total Phases"],
              ].map(([n, l]) => (
                <div key={l}>
                  <div className="font-numbers font-bold text-[28px] text-accent">{n}</div>
                  <div className="text-[13px] text-white/60">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FILTER BAR */}
      <div className="sticky top-20 z-40 bg-white border-b border-[#E5E0D8] shadow-[0_2px_16px_rgba(11,127,199,0.08)]">
        <div className="mx-auto max-w-7xl px-6 lg:px-12 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-wrap gap-3">
            <select className={selectCls} value={loc} onChange={(e) => setLoc(e.target.value)}>
              {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
            </select>
            <select className={selectCls} value={status} onChange={(e) => setStatus(e.target.value)}>
              {["All Status", "ACTIVE", "COMING SOON", "SOLD OUT"].map((l) => <option key={l}>{l}</option>)}
            </select>
            <select className={selectCls} value={price} onChange={(e) => setPrice(e.target.value)}>
              {["Any Price", "Under Ksh 400K", "Ksh 400K–700K", "Ksh 700K–1M", "Above Ksh 1M"].map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search phases or locations..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="font-sans text-[14px] border-[1.5px] border-[#D0CCC5] rounded-md py-2.5 pl-10 pr-3.5 w-full lg:w-[260px] focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/10 transition-colors"
            />
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-6 lg:px-12 pb-3 text-[14px] text-muted-foreground">
          Showing {filtered.length} {filtered.length === 1 ? "phase" : "phases"}
        </div>
      </div>

      {/* GRID */}
      <section className="bg-background py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-12">
          {loading ? (
            <div className="flex justify-center items-center py-32">
              <Loader2 size={36} className="animate-spin text-primary" />
              <span className="ml-3 font-sans text-[16px] text-muted-foreground">Loading phases...</span>
            </div>
          ) : error ? (
            <div className="text-center py-24">
              <p className="text-[16px] text-red-500 mb-4">Could not load phases. Check your Supabase connection.</p>
              <code className="text-[13px] text-muted-foreground">{error}</code>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-24">
              No phases match your filters. Try clearing some.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
              {filtered.map((p) => <PhaseCard key={p.slug} phase={p as Parameters<typeof PhaseCard>[0]["phase"]} />)}
            </div>
          )}
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section className="bg-primary py-20 text-center px-6">
        <h2 className="font-serif font-semibold text-[40px] text-white">
          Can't find what you're looking for?
        </h2>
        <p className="mt-4 font-light text-[17px] text-white/75 max-w-[560px] mx-auto leading-[1.75]">
          Tell us your preferred location, budget, and plot size. We'll find the right phase for you personally.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <a
            href="https://wa.me/254799488488"
            target="_blank" rel="noopener noreferrer"
            className="bg-[#25D366] text-white font-semibold text-[15px] px-8 py-3.5 rounded-md hover:scale-[1.02] transition-transform"
          >
            WhatsApp Us Directly
          </a>
          <a
            href="tel:+254799488488"
            className="border border-white text-white font-semibold text-[15px] px-8 py-3.5 rounded-md hover:bg-white hover:text-primary transition-colors"
          >
            Call: +254 799 488 488
          </a>
        </div>
      </section>

      <Footer />
      <WhatsAppButton />
    </div>
  );
}
