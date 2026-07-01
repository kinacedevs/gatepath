import { MapPin, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Reveal } from "@/components/Reveal";

const phaseSlugs = ["malindi-greens", "sagana-valley", "nanyuki-ridge"];

type Status = "AVAILABLE" | "BOOKED" | "SOLD";

const plots: {
  phase: string; title: string; loc: string; price: string; status: Status; img: string;
}[] = [
  {
    phase: "Phase 4 — Malindi Greens",
    title: "Plot 12 — 50×100 ft",
    loc: "Malindi, Coast",
    price: "380,000",
    status: "AVAILABLE",
    img: "https://images.unsplash.com/photo-1473773508845-188df298d2d1?auto=format&fit=crop&w=1200&q=80",
  },
  {
    phase: "Phase 2 — Sagana Valley",
    title: "Plot 7 — 100×100 ft",
    loc: "Sagana, Kirinyaga",
    price: "720,000",
    status: "BOOKED",
    img: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
  },
  {
    phase: "Phase 6 — Nanyuki Ridge",
    title: "Plot 3 — 50×100 ft",
    loc: "Nanyuki, Laikipia",
    price: "490,000",
    status: "AVAILABLE",
    img: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
  },
];

const statusStyles: Record<Status, string> = {
  AVAILABLE: "bg-[oklch(0.72_0.18_145)] text-white",
  BOOKED:    "bg-[oklch(0.76_0.17_70)] text-white",
  SOLD:      "bg-[oklch(0.65_0.22_27)] text-white",
};

export function PropertyPreview() {
  return (
    <section id="properties" className="bg-primary py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <Reveal className="text-center max-w-3xl mx-auto">
          <span className="eyebrow">Available Now</span>
          <h2 className="mt-5 font-serif font-semibold text-[36px] md:text-[52px] text-white leading-[1.15]">
            Browse Live Plots.
            <br />
            Buy With Confidence.
          </h2>
          <p className="mt-6 text-[17px] text-white/75 max-w-xl mx-auto leading-[1.7]">
            Every plot on our platform shows real-time availability. Green means ready to buy. No outdated listings. No wasted visits.
          </p>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          {plots.map((p, i) => (
            <Reveal
              key={p.title}
              className="bg-background rounded-[10px] overflow-hidden shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)] hover:scale-[1.02] transition-all duration-400"
            >
              <div className="relative h-[200px] overflow-hidden">
                <img src={p.img} alt={p.title} loading="lazy" className="h-full w-full object-cover" />
                <span className={`absolute top-3 right-3 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide ${statusStyles[p.status]}`}>
                  {p.status}
                </span>
              </div>
              <div className="p-6">
                <div className="font-sans font-semibold text-[13px] text-accent uppercase tracking-[0.1em]">
                  {p.phase}
                </div>
                <h3 className="mt-2 font-serif font-semibold text-[24px] text-primary leading-tight">
                  {p.title}
                </h3>
                <div className="mt-3 flex items-center gap-2 text-muted-foreground text-[14px]">
                  <MapPin size={14} strokeWidth={1.8} />
                  <span>{p.loc}</span>
                </div>
                <div className="mt-4 font-numbers font-bold text-primary">
                  <span className="text-[14px] mr-1">Ksh</span>
                  <span className="text-[22px]">{p.price}</span>
                </div>
                <div className="my-4 h-px bg-border" />
                <Link
                  to="/properties/$slug"
                  params={{ slug: phaseSlugs[i] ?? "malindi-greens" }}
                  className="inline-flex items-center gap-1.5 text-[14px] font-medium text-accent hover:underline"
                >
                  View Plot Details <ArrowRight size={14} />
                </Link>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="mt-14 text-center">
          <Link
            to="/properties"
            className="inline-flex items-center justify-center bg-accent text-white px-10 py-4 text-base font-semibold rounded-md hover:bg-[#C8861A] hover:scale-[1.02] transition-all duration-300"
          >
            View All Available Plots
          </Link>
        </div>
      </div>
    </section>
  );
}
