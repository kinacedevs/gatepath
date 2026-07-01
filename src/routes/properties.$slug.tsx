import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useState } from "react";
import { MapPin, CheckCircle2, Clock, Download } from "lucide-react";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { PlotMap } from "@/components/properties/PlotMap";
import { PlotPanel } from "@/components/properties/PlotPanel";
import { PhaseCard } from "@/components/properties/PhaseCard";
import { getPhaseBySlug, phases, type Plot } from "@/lib/phases";

export const Route = createFileRoute("/properties/$slug")({
  loader: ({ params }) => {
    const phase = getPhaseBySlug(params.slug);
    if (!phase) throw notFound();
    return { phase };
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
  head: ({ params }) => {
    const phase = getPhaseBySlug(params.slug);
    const title = phase ? `${phase.name} — Phase ${phase.phaseNumber} | Gatepath Realtors` : "Phase | Gatepath Realtors";
    const desc = phase?.description ?? "Browse plots in this phase.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        ...(phase ? [{ property: "og:image" as const, content: phase.image }] : []),
      ],
    };
  },
});

function PhaseDetailPage() {
  const { phase } = Route.useLoaderData();
  const [selected, setSelected] = useState<Plot | null>(null);
  const [tab, setTab] = useState<"location" | "infra" | "legal" | "payment">("location");
  const [availOnly, setAvailOnly] = useState(false);

  const onSelect = (p: Plot) => {
    setSelected(p);
    if (window.innerWidth < 1024) {
      setTimeout(() => {
        document.getElementById("plot-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  };

  const similar = phases
    .filter((p) => p.slug !== phase.slug)
    .sort((a, b) => b.available - a.available)
    .slice(0, 3);

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
            <span className="mt-3 inline-block bg-accent text-white font-numbers font-semibold text-[11px] px-3.5 py-1.5 rounded-full">
              PHASE {phase.phaseNumber} — {phase.status}
            </span>
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
              <button className="border border-[#D0CCC5] p-2 rounded-md hover:border-primary transition-colors" aria-label="Download map">
                <Download size={16} />
              </button>
            </div>

            <p className="mt-4 text-[12px] text-muted-foreground italic">
              Map is for illustrative purposes. Exact plot boundaries are confirmed during site visit. Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>

        <div id="plot-panel" className="lg:sticky lg:top-[200px] lg:self-start">
          <PlotPanel
            phase={phase}
            plot={selected}
            onSelectPlot={setSelected}
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
                  { name: "Plan B — 12 Months", body: "30% deposit, balance spread over 12 monthly installments.", tag: "30% Deposit" },
                  { name: "Plan C — 24 Months", body: "20% deposit, balance over 24 months. 5% facilitation fee applies.", tag: "20% Deposit" },
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

      {/* SIMILAR PHASES */}
      <section className="bg-background py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-12">
          <h2 className="font-serif font-semibold text-[40px] text-primary text-center">
            You May Also Like
          </h2>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {similar.map((p) => <PhaseCard key={p.slug} phase={p} />)}
          </div>
        </div>
      </section>

      <Footer />
      <WhatsAppButton />
    </div>
  );
}
