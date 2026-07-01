import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import type { Phase } from "@/lib/phases";

const statusStyles: Record<Phase["status"], string> = {
  ACTIVE: "bg-[#D1FAE5] text-[#065F46] border border-[#22C55E]",
  "COMING SOON": "bg-[#FEF3C7] text-[#92400E]",
  "SOLD OUT": "bg-[#FEE2E2] text-[#991B1B]",
};

export function PhaseCard({ phase }: { phase: Phase }) {
  // Build a mini availability strip of 8 squares
  const ratio = (n: number) => phase.totalPlots > 0 ? Math.round((n / phase.totalPlots) * 8) : 0;
  const a = Math.max(0, Math.min(8, ratio(phase.available)));
  const b = Math.max(0, Math.min(8, ratio(phase.booked)));
  const s = Math.max(0, 8 - a - b);
  const strip: ("a" | "b" | "s")[] = [
    ...Array(a).fill("a"),
    ...Array(b).fill("b"),
    ...Array(s).fill("s"),
  ];

  return (
    <Link
      to="/properties/$slug"
      params={{ slug: phase.slug }}
      className="group block bg-white rounded-[12px] overflow-hidden shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-hover)] hover:-translate-y-1.5 transition-all duration-400 cursor-pointer"
    >
      <div className="relative h-[220px] overflow-hidden">
        <img
          src={phase.image}
          alt={phase.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(11,127,199,0.6) 0%, transparent 60%)",
          }}
        />
        <span className="absolute top-4 left-4 bg-white text-primary font-numbers font-semibold text-[11px] px-3 py-[5px] rounded-full">
          PHASE {phase.phaseNumber}
        </span>
        <span
          className={`absolute top-4 right-4 font-numbers font-semibold text-[10px] px-3 py-[5px] rounded-full ${statusStyles[phase.status]}`}
        >
          {phase.status}
        </span>
        <div className="absolute bottom-3 left-4 flex gap-[3px]">
          {strip.map((t, i) => (
            <span
              key={i}
              className="w-[14px] h-[14px] rounded-[2px]"
              style={{
                background:
                  t === "a" ? "#22C55E" : t === "b" ? "#F59E0B" : "#EF4444",
              }}
            />
          ))}
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <MapPin size={14} className="text-accent" strokeWidth={1.8} />
          <span>
            {phase.location}, {phase.region}
          </span>
        </div>
        <h3 className="mt-1 font-serif font-semibold text-[26px] text-primary leading-tight">
          {phase.name}
        </h3>
        <p
          className="mt-2 text-[14px] text-muted-foreground leading-[1.6] overflow-hidden"
          style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
        >
          {phase.description}
        </p>

        <div className="mt-4 pt-4 border-t border-[#F0F4F8] flex justify-between">
          <div>
            <div className="font-numbers font-bold text-[18px] text-primary">
              {phase.totalPlots}
            </div>
            <div className="text-[11px] text-muted-foreground">Total Plots</div>
          </div>
          <div>
            <div className="font-numbers font-bold text-[18px] text-[#22C55E]">
              {phase.available}
            </div>
            <div className="text-[11px] text-muted-foreground">Available</div>
          </div>
          <div className="text-right">
            <div className="font-numbers font-bold text-primary">
              <span className="text-[12px] mr-0.5">Ksh</span>
              <span className="text-[16px]">{phase.startingPrice.toLocaleString()}</span>
            </div>
            <div className="text-[11px] text-muted-foreground">Starting</div>
          </div>
        </div>

        <div className="mt-5 w-full bg-primary text-white font-semibold text-[14px] py-3 rounded-[6px] text-center group-hover:bg-accent transition-colors duration-300">
          Explore Phase Map →
        </div>
      </div>
    </Link>
  );
}
