import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { MapPin, CheckCircle2, Clock, Download, Loader2 } from "lucide-react";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { PlotMap } from "@/components/properties/PlotMap";
import { PlotPanel } from "@/components/properties/PlotPanel";
import { PhaseCard } from "@/components/properties/PhaseCard";
import { usePhase, type Plot, type Phase } from "@/lib/phases";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/properties/$slug")({
  loader: async ({ params }) => {
    // 1. Fetch phase from Supabase
    const { data: dbPhase, error: phaseErr } = await supabase
      .from("phases")
      .select("*")
      .eq("slug", params.slug)
      .single();

    if (phaseErr || !dbPhase) {
      console.error("[Gatepath Loader Error] Slug:", params.slug, "Error:", phaseErr);
      throw notFound();
    }

    // 2. Fetch plot sizes
    const { data: dbSizes } = await supabase
      .from("plot_sizes")
      .select("*")
      .eq("phase_id", dbPhase.id)
      .order("cash_price");

    // 3. Fetch plots
    const { data: dbPlots } = await supabase
      .from("plots")
      .select("*")
      .eq("phase_id", dbPhase.id)
      .order("plot_number");

    // 4. Fetch 3 similar phases (excluding current)
    const { data: rawSimilar } = await supabase
      .from("phases")
      .select("*")
      .neq("id", dbPhase.id)
      .limit(3);

    const similarIds = rawSimilar ? rawSimilar.map((p) => p.id) : [];
    const { data: similarSizes } = similarIds.length
      ? await supabase.from("plot_sizes").select("*").in("phase_id", similarIds)
      : { data: [] };

    // Adapt similar phases for PhaseCard
    const similarAdapted = (rawSimilar ?? []).map((p) => {
      const sizesForPhase = (similarSizes ?? []).filter((s) => s.phase_id === p.id);
      const defaultSize = sizesForPhase.find((s) => s.is_default) ?? sizesForPhase[0];
      const startingPrice = sizesForPhase.length
        ? Math.min(...sizesForPhase.map((s) => s.cash_price))
        : 320000;

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
        startingPrice,
        size: defaultSize ? defaultSize.label : "50x100 ft",
        plots: [],
      };
    });

    // Adapt loader phase for server-side render
    const defaultSize = (dbSizes ?? []).find((s) => s.is_default) ?? (dbSizes ?? [])[0];
    const startingPrice = (dbSizes ?? []).length
      ? Math.min(...(dbSizes ?? []).map((s) => s.cash_price))
      : 0;

    const mappedPlots = (dbPlots ?? []).map((p) => {
      const sizeObj = (dbSizes ?? []).find((s) => s.id === p.size_id) ?? defaultSize;
      return {
        id: p.plot_number,
        row: p.row_num,
        col: p.col_num,
        status: p.status as "available" | "booked" | "sold",
        size: sizeObj ? sizeObj.label.replace(" ft", "") : "50x100",
        price: sizeObj ? sizeObj.cash_price : 0,
      };
    });

    const initialPhase: Phase = {
      slug: dbPhase.slug,
      name: dbPhase.name,
      phaseNumber: dbPhase.phase_number ?? undefined,
      location: dbPhase.location,
      region: dbPhase.region,
      status: dbPhase.status === "active" ? "ACTIVE" : dbPhase.status === "sold_out" ? "SOLD OUT" : "COMING SOON",
      totalPlots: dbPhase.total_plots,
      available: dbPhase.available_count,
      booked: dbPhase.booked_count,
      sold: dbPhase.sold_count,
      image: dbPhase.image_url ?? "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80",
      description: dbPhase.description ?? "",
      features: dbPhase.features ?? [],
      startingPrice,
      size: defaultSize ? defaultSize.label : "50x100 ft",
      plots: mappedPlots,
    };

    return {
      initialPhase,
      similar: similarAdapted,
    };
  },
  component: PhaseDetailPage,
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="font-serif text-4xl text-primary">Phase not found</h1>
        <Link to="/properties" className="mt-4 inline-block text-accent underline">
          View all phases
        </Link>
      </div>
    </div>
  ),
  head: ({ loaderData }) => {
    const phase = loaderData?.initialPhase;
    const title = phase ? `${phase.name} — Phase ${phase.phaseNumber ?? ""} | Gatepath Realtors` : "Phase | Gatepath Realtors";
    const desc = phase?.description ?? "Browse plots in this phase.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        ...(phase?.image ? [{ property: "og:image" as const, content: phase.image }] : []),
      ],
    };
  },
});

function getEmbedUrl(url: string) {
  if (!url) return null;
  let videoId = "";
  if (url.includes("youtube.com/watch")) {
    const parts = url.split("v=");
    if (parts[1]) {
      videoId = parts[1].split("&")[0];
    }
  } else if (url.includes("youtu.be/")) {
    const parts = url.split("youtu.be/");
    if (parts[1]) {
      videoId = parts[1].split("?")[0];
    }
  } else if (url.includes("youtube.com/embed/")) {
    return url;
  }
  return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
}

function PhaseDetailPage() {
  const { slug } = Route.useParams();
  const { initialPhase, similar } = Route.useLoaderData();
  const { phase: livePhase, loading, error } = usePhase(slug);

  const [selected, setSelected] = useState<Plot | null>(null);
  const [tab, setTab] = useState<"location" | "infra" | "legal" | "payment">("location");
  const [availOnly, setAvailOnly] = useState(false);

  // Fallback to initial loader data during hydration/real-time setup
  const phase = livePhase || initialPhase;

  const onSelect = (p: Plot) => {
    setSelected(p);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setTimeout(() => {
        document.getElementById("plot-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  };

  if (!phase && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  if (error || !phase) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="font-serif text-2xl text-red-500">Error loading phase</h2>
          <p className="text-muted-foreground mt-2">{error || "Could not retrieve details."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* HERO */}
      <section
        className="relative pt-24 lg:pt-28"
        style={{
          height: "380px",
          backgroundImage: `linear-gradient(135deg, rgba(11,127,199,0.85) 0%, rgba(11,127,199,0.55) 100%), url(${phase.image})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute bottom-8 left-0 right-0">
          <div className="mx-auto max-w-7xl px-6 lg:px-12">
            <div className="text-[13px] text-white/50">
              <Link to="/" className="hover:text-accent">Home</Link> ›{" "}
              <Link to="/properties" className="hover:text-accent">Properties</Link> ›{" "}
              <span>{phase.name}</span>
            </div>
            {phase.phaseNumber && (
              <span className="mt-3 inline-block bg-accent text-white font-numbers font-semibold text-[11px] px-3.5 py-1.5 rounded-full">
                PHASE {phase.phaseNumber} — {phase.status}
              </span>
            )}
            <h1 className="mt-3 font-serif font-bold text-[42px] md:text-[72px] text-white leading-[1.0]">
              {phase.name}
            </h1>
            <div className="mt-3 flex items-center gap-2 text-white">
              <MapPin size={16} className="text-accent" />
              <span className="text-[16px]">{phase.location}, {phase.region}, Kenya</span>
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <div className="sticky top-20 z-30 bg-white border-b border-[#E5E0D8] shadow-sm">
        <div className="mx-auto max-w-7xl px-6 lg:px-12 py-5 flex flex-wrap items-center justify-between gap-6">
          <div className="flex flex-wrap items-center gap-8 divide-x divide-[#E5E0D8]">
            {[
              { v: phase.totalPlots, l: "Total Plots", c: "text-primary" },
              { v: phase.available, l: "Available", c: "text-[#22C55E]" },
              { v: phase.booked, l: "Booked", c: "text-[#F59E0B]" },
              { v: phase.sold, l: "Sold", c: "text-[#EF4444]" },
              { v: `Ksh ${phase.startingPrice.toLocaleString()}`, l: "Starting Price", c: "text-accent" },
            ].map((s, i) => (
              <div key={s.l} className={i > 0 ? "pl-8" : ""}>
                <div className={`font-numbers font-bold text-[22px] ${s.c}`}>{s.v}</div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-[0.08em]">{s.l}</div>
              </div>
            ))}
          </div>
          <button className="hidden md:inline-flex items-center gap-2 border border-[#D0CCC5] text-foreground text-[13px] font-medium px-4 py-2 rounded-md hover:border-primary transition-colors">
            <Download size={14} /> Download Phase Brochure
          </button>
        </div>
      </div>

      {/* TWO-COLUMN: MAP + PANEL */}
      <section className="mx-auto max-w-7xl px-6 lg:px-12 py-10 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
        <div>
          <div className="bg-white rounded-[12px] p-7 shadow-[var(--shadow-card)] border border-[#E5E0D8]">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
              <div>
                <h2 className="font-semibold text-[16px] text-primary">Phase Plot Map</h2>
                <p className="text-[13px] text-muted-foreground mt-0.5">
                  Click any green plot to begin your inquiry
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-[12px] text-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E]" /> Available ({phase.available})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" /> Booked ({phase.booked})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" /> Sold ({phase.sold})
                </span>
              </div>
            </div>

            <PlotMap
              plots={phase.plots}
              selectedId={selected?.id ?? null}
              onSelect={onSelect}
              showAvailableOnly={availOnly}
            />

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                onClick={() => setSelected(null)}
                className="text-[13px] font-medium text-foreground border border-[#D0CCC5] px-3.5 py-2 rounded-md hover:border-primary transition-colors"
              >
                Reset Selection
              </button>
              <button
                onClick={() => setAvailOnly((v) => !v)}
                className={`text-[13px] font-medium px-3.5 py-2 rounded-md border transition-colors ${
                  availOnly
                    ? "bg-[#D1FAE5] border-[#22C55E] text-[#065F46]"
                    : "border-[#D0CCC5] text-foreground hover:border-primary"
                }`}
              >
                Show Available Only
              </button>
            </div>

            <p className="mt-4 text-[12px] text-muted-foreground italic">
              Map is for illustrative purposes. Exact plot boundaries are confirmed during site visit.
            </p>
          </div>
        </div>

        <div id="plot-panel" className="lg:sticky lg:top-[200px] lg:self-start">
          <PlotPanel
            phase={phase}
            plot={selected}
            onSelectPlot={onSelect}
            onClear={() => setSelected(null)}
          />
        </div>
      </section>

      {/* TABS */}
      <section className="mx-auto max-w-7xl px-6 lg:px-12 pb-16">
        <div className="bg-white rounded-[12px] border border-[#E5E0D8] shadow-[var(--shadow-card)] overflow-hidden">
          <div className="flex border-b border-[#E5E0D8] overflow-x-auto">
            {([
              ["location", "Location Details"],
              ["infra", "Infrastructure & Amenities"],
              ["legal", "Legal & Title"],
              ["payment", "Payment Plans"],
            ] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`px-6 py-4 text-[14px] font-semibold whitespace-nowrap border-b-2 transition-colors ${
                  tab === k ? "border-accent text-primary" : "border-transparent text-muted-foreground hover:text-primary"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="p-8">
            {tab === "location" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <p className="text-[15px] text-foreground leading-[1.75]">
                    {phase.name} is situated in {phase.location}, {phase.region}. The phase is accessible via tarmac road with proximity to local amenities, water sources, and major transport corridors. The terrain is gentle and well-drained, ideal for residential and mixed-use development.
                  </p>
                </div>
                <div className="bg-[#F0F4F8] rounded-lg h-[260px] flex items-center justify-center text-muted-foreground">
                  <MapPin size={32} className="text-accent mr-2" /> Map preview
                </div>
              </div>
            )}

            {tab === "infra" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                {[
                  ["Tarmac road access", true],
                  ["Electricity on-site", true],
                  ["Borehole water available", true],
                  ["Ready title deeds", true],
                  ["Surveyed plots", true],
                  ["Security fence (perimeter)", true],
                  ["Sewerage (planned)", false],
                  ["Plot beacons installed", true],
                ].map(([label, done]) => (
                  <div key={label as string} className="flex items-center gap-3 text-[14px] text-foreground">
                    {done ? (
                      <CheckCircle2 size={20} className="text-[#22C55E] shrink-0" />
                    ) : (
                      <Clock size={20} className="text-[#F59E0B] shrink-0" />
                    )}
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            )}

            {tab === "legal" && (
              <div>
                <p className="text-[15px] text-foreground leading-[1.75]">
                  All plots carry individual freehold title deeds. The land is surveyed, registered, and free of any encumbrances.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button className="border-[1.5px] border-primary text-primary font-medium text-[14px] px-5 py-2.5 rounded-md hover:bg-primary hover:text-white transition-colors">
                    View Land Search Certificate
                  </button>
                  <button className="border-[1.5px] border-primary text-primary font-medium text-[14px] px-5 py-2.5 rounded-md hover:bg-primary hover:text-white transition-colors">
                    Download Plot Layout Survey
                  </button>
                </div>
                <p className="mt-4 text-[13px] text-muted-foreground italic">
                  Documents available after inquiry confirmation.
                </p>
              </div>
            )}

            {tab === "payment" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[
                  { name: "Plan A — Full Payment", body: "Pay 100% upfront and enjoy a 5% discount on the listed price.", tag: "5% Discount" },
                  { name: "Plan B — 6 Months", body: "30% deposit, balance spread over 6 monthly installments.", tag: "30% Deposit" },
                  { name: "Plan C — 12 Months", body: "20% deposit, balance over 12 months. installment markup applies.", tag: "20% Deposit" },
                ].map((p) => (
                  <div key={p.name} className="border border-[#E5E0D8] rounded-lg p-5 hover:border-accent transition-colors">
                    <div className="text-[11px] font-numbers font-semibold text-accent uppercase tracking-wider">{p.tag}</div>
                    <h4 className="mt-2 font-serif font-semibold text-[20px] text-primary">{p.name}</h4>
                    <p className="mt-2 text-[13px] text-muted-foreground leading-[1.6]">{p.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* YOUTUBE VIDEO SECTION */}
      <section className="mx-auto max-w-7xl px-6 lg:px-12 pb-16">
        <div className="bg-white rounded-[12px] border border-[#E5E0D8] shadow-[var(--shadow-card)] p-8">
          <h3 className="font-serif font-semibold text-[28px] text-primary mb-2">
            Property Video Tour
          </h3>
          <p className="text-[14px] text-muted-foreground mb-6">
            Take a virtual tour of the environment, road connectivity, and physical landmarks surrounding {phase.name}.
          </p>

          {phase.youtube_video_url ? (
            <div className="relative w-full aspect-video rounded-[8px] overflow-hidden border border-[#E5E0D8] shadow-md bg-black">
              {(() => {
                const embedUrl = getEmbedUrl(phase.youtube_video_url);
                if (embedUrl) {
                  return (
                    <iframe
                      src={embedUrl}
                      title={`${phase.name} Video Tour`}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute top-0 left-0 w-full h-full"
                    />
                  );
                } else {
                  return (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-white bg-slate-900">
                      <p className="text-[16px] font-semibold">Watch on YouTube</p>
                      <p className="text-[13px] opacity-75 mt-2 max-w-md">Our team has uploaded a video tour for this property. Click below to view it directly on YouTube.</p>
                      <a
                        href={phase.youtube_video_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 bg-[#FF0000] text-white font-semibold text-[13px] px-6 py-2.5 rounded-full hover:bg-[#CC0000] transition-colors"
                      >
                        Open YouTube Video ↗
                      </a>
                    </div>
                  );
                }
              })()}
            </div>
          ) : (
            <div 
              style={{
                backgroundImage: `linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.65)), url(${phase.image})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
              className="w-full aspect-video rounded-[8px] flex flex-col items-center justify-center text-center p-6 text-white border border-[#E5E0D8]"
            >
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-white fill-current" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
              <p className="text-[18px] font-serif font-semibold">Video Tour Coming Soon</p>
              <p className="text-[13px] opacity-80 mt-2 max-w-md">
                Our site media team is currently capturing drone footage and walkthrough tours of {phase.name}. Check back soon or request a live video tour!
              </p>
            </div>
          )}
        </div>
      </section>

      {/* SIMILAR PHASES */}
      <section className="bg-background py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-12">
          <h2 className="font-serif font-semibold text-[40px] text-primary text-center">
            You May Also Like
          </h2>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {similar.map((p) => (
              <PhaseCard key={p.slug} phase={p as Parameters<typeof PhaseCard>[0]["phase"]} />
            ))}
          </div>
        </div>
      </section>

      <Footer />
      <WhatsAppButton />
    </div>
  );
}
