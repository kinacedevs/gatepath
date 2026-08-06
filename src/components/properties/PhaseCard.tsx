import { Link } from "@tanstack/react-router";
import { MapPin, FileText, Map as MapIcon } from "lucide-react";
import type { Phase } from "@/lib/phases";
import { formatFromKes, type Currency } from "@/lib/currency";

const statusStyles: Record<Phase["status"], string> = {
  ACTIVE: "bg-[#D1FAE5] text-[#065F46] border border-available",
  "COMING SOON": "bg-[#FEF3C7] text-[#92400E]",
  "SOLD OUT": "bg-[#FEE2E2] text-[#991B1B]",
};

export function PhaseCard({
  phase,
  currency = "KES",
  imageOverride,
}: {
  phase: Phase;
  currency?: Currency;
  /** Staff-set alternate image (e.g. a curated location poster) — falls
   * back to the phase's own thumbnail when unset. Kept as a clean, top,
   * unobtrusive image only — never overlaid with text — since the card's
   * real info always lives in the solid panel below. */
  imageOverride?: string;
}) {
  // Build a mini availability strip of 8 squares
  const ratio = (n: number) => (phase.totalPlots > 0 ? Math.round((n / phase.totalPlots) * 8) : 0);
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
      search={currency !== "KES" ? { from: "diaspora", currency } : undefined}
      className="group block bg-white rounded-2xl overflow-hidden border border-[#EBE8E0] shadow-[0_10px_30px_rgba(7,75,125,0.04)] hover:shadow-[0_20px_45px_rgba(7,75,125,0.08)] hover:-translate-y-1.5 transition-all duration-400 cursor-pointer"
    >
      <div className="relative h-[220px] overflow-hidden">
        <img
          src={imageOverride || phase.image}
          alt={phase.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(to top, rgba(7,75,125,0.7) 0%, transparent 60%)",
          }}
        />
        <span className="absolute top-4 left-4 bg-white text-primary font-numbers font-bold text-[11px] px-3.5 py-[6px] rounded-full shadow-md">
          PHASE {phase.phaseNumber}
        </span>
        <span
          className={`absolute top-4 right-4 font-numbers font-bold text-[10px] px-3.5 py-[6px] rounded-full ${statusStyles[phase.status]}`}
        >
          {phase.status}
        </span>
        {phase.hasPromo && (
          <span className="absolute top-[52px] left-4 bg-accent text-white font-numbers font-bold text-[10px] px-3.5 py-[6px] rounded-full shadow-md uppercase tracking-wide">
            Sale
          </span>
        )}
        <div className="absolute bottom-3 left-4 flex gap-[3px]">
          {strip.map((t, i) => (
            <span
              key={i}
              className="w-[14px] h-[14px] rounded-[3px]"
              style={{
                background:
                  t === "a" ? "var(--available)" : t === "b" ? "#F59E0B" : "var(--destructive)",
              }}
            />
          ))}
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <MapPin size={14} className="text-accent" strokeWidth={2} />
          <span className="font-medium">
            {phase.location}, {phase.region}
          </span>
        </div>
        <h3 className="mt-1.5 font-serif font-bold text-[24px] text-primary leading-tight">
          {phase.name}
        </h3>
        <p
          className="mt-2 text-[14px] text-muted-foreground leading-[1.65] overflow-hidden"
          style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
        >
          {phase.description}
        </p>

        <div className="mt-4 pt-4 border-t border-[#F4EFE6] flex justify-between">
          <div>
            <div className="font-numbers font-bold text-[18px] text-primary">
              {phase.totalPlots}
            </div>
            <div className="text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider">
              Total Plots
            </div>
          </div>
          <div>
            <div className="font-numbers font-bold text-[18px] text-available">
              {phase.available}
            </div>
            <div className="text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider">
              Available
            </div>
          </div>
          <div className="text-right">
            <div className="font-numbers font-bold text-[17px] text-primary">
              {formatFromKes(phase.startingPrice, currency)}
            </div>
            <div className="text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider">
              Starting
            </div>
          </div>
        </div>

        {(phase.brochure_url || phase.plot_map_url) && (
          <div className="mt-4 flex gap-2">
            {phase.brochure_url && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open(phase.brochure_url!, "_blank", "noopener,noreferrer");
                }}
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-primary border border-[#EBE8E0] rounded-md px-2.5 py-1.5 hover:border-primary transition-colors"
              >
                <FileText size={13} /> Brochure
              </button>
            )}
            {phase.plot_map_url && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open(phase.plot_map_url!, "_blank", "noopener,noreferrer");
                }}
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-primary border border-[#EBE8E0] rounded-md px-2.5 py-1.5 hover:border-primary transition-colors"
              >
                <MapIcon size={13} /> Plot Map
              </button>
            )}
          </div>
        )}

        <div className="mt-5 w-full bg-primary text-white font-bold text-[14px] py-3 rounded-lg text-center group-hover:bg-gradient-to-r group-hover:from-accent group-hover:to-accent-dark group-hover:text-white transition-all duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.04)]">
          Explore Phase Map →
        </div>
      </div>
    </Link>
  );
}
