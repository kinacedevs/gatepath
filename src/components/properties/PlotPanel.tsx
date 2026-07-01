import { MapPin } from "lucide-react";
import type { Phase, Plot } from "@/lib/phases";

function PaymentPill({ icon, label }: { icon: string; label: string }) {
  return (
    <span className="bg-[#F0F4F8] text-primary font-medium text-[12px] px-3 py-1.5 rounded-full">
      {icon} {label}
    </span>
  );
}

export function PlotPanel({
  phase,
  plot,
  onSelectPlot,
  onClear,
}: {
  phase: Phase;
  plot: Plot | null;
  onSelectPlot: (p: Plot) => void;
  onClear: () => void;
}) {
  if (!plot) {
    return (
      <div className="bg-white rounded-[12px] p-7 shadow-[var(--shadow-card)] border border-[#E5E0D8] text-center">
        <MapPin size={48} className="mx-auto text-accent" strokeWidth={1.5} />
        <h3 className="mt-4 font-serif font-semibold text-[24px] text-primary">Select a Plot</h3>
        <p className="mt-3 text-[14px] text-muted-foreground leading-[1.7]">
          Click any green plot on the map to see its details and start your inquiry.
        </p>
        <div className="mt-6 flex flex-col gap-2 text-[13px]">
          <span className="flex items-center justify-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E]" /> {phase.available} Available
          </span>
          <span className="flex items-center justify-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" /> {phase.booked} Booked
          </span>
          <span className="flex items-center justify-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" /> {phase.sold} Sold
          </span>
        </div>
      </div>
    );
  }

  if (plot.status === "booked") {
    const alts = phase.plots.filter((p) => p.status === "available").slice(0, 3);
    return (
      <div className="bg-white rounded-[12px] overflow-hidden shadow-[var(--shadow-card)] border border-[#E5E0D8] animate-in fade-in duration-300">
        <div className="bg-[#F59E0B] px-6 py-5">
          <span className="bg-white text-[#92400E] font-numbers font-semibold text-[10px] px-3 py-1 rounded-full">
            RESERVED
          </span>
          <h3 className="mt-3 font-serif font-bold text-[28px] text-white">Plot #{plot.id}</h3>
        </div>
        <div className="p-6">
          <h4 className="font-serif font-semibold text-[22px] text-primary">Plot Reserved</h4>
          <p className="mt-3 text-[14px] text-muted-foreground leading-[1.7]">
            This plot has been reserved by another buyer. However, reservations are sometimes
            released. Join our waitlist to be notified first.
          </p>
          <button className="mt-5 w-full border-2 border-[#F59E0B] text-[#92400E] font-semibold text-[14px] py-3 rounded-lg hover:bg-[#FEF3C7] transition-colors">
            Join Waitlist for This Plot
          </button>
          <div className="my-5 h-px bg-[#F0F4F8]" />
          <p className="text-[13px] text-muted-foreground mb-3">
            Or explore other available plots in this phase:
          </p>
          <div className="flex flex-wrap gap-2">
            {alts.map((a) => (
              <button
                key={a.id}
                onClick={() => onSelectPlot(a)}
                className="bg-[#D1FAE5] text-[#065F46] font-medium text-[13px] px-3 py-1.5 rounded-md hover:bg-[#A7F3D0] transition-colors"
              >
                Plot #{a.id}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (plot.status === "sold") {
    return (
      <div className="bg-white rounded-[12px] overflow-hidden shadow-[var(--shadow-card)] border border-[#E5E0D8] animate-in fade-in duration-300">
        <div className="bg-[#EF4444] px-6 py-5">
          <span className="bg-white text-[#991B1B] font-numbers font-semibold text-[10px] px-3 py-1 rounded-full">
            SOLD
          </span>
          <h3 className="mt-3 font-serif font-bold text-[28px] text-white">Plot #{plot.id}</h3>
        </div>
        <div className="p-6">
          <h4 className="font-serif font-semibold text-[22px] text-primary">Plot Sold</h4>
          <p className="mt-3 text-[14px] text-muted-foreground leading-[1.7]">
            This plot has been sold. Explore other available plots in this phase, or view our
            other phases.
          </p>
          <button
            onClick={onClear}
            className="mt-5 w-full bg-[#22C55E] text-white font-semibold text-[14px] py-3 rounded-lg hover:bg-[#16A34A] transition-colors"
          >
            View Available Plots
          </button>
        </div>
      </div>
    );
  }

  // available
  const inquireHref = `/inquire?phase=${phase.slug}&phaseName=${encodeURIComponent(phase.name)}&phaseNumber=${phase.phaseNumber}&plotId=${plot.id}&plotNumber=${plot.id}&size=${encodeURIComponent(plot.size + " ft")}&price=${plot.price}&location=${encodeURIComponent(phase.location + ", " + phase.region)}`;

  return (
    <div className="bg-white rounded-[12px] overflow-hidden shadow-[var(--shadow-card)] border border-[#E5E0D8] animate-in fade-in duration-300">
      <div className="bg-primary px-6 py-5">
        <span className="bg-[#22C55E] text-[#065F46] font-numbers font-semibold text-[10px] px-3 py-1 rounded-full">
          AVAILABLE
        </span>
        <h3 className="mt-3 font-serif font-bold text-[32px] text-white leading-none">
          Plot #{plot.id}
        </h3>
        <p className="mt-1 text-[13px] text-white/65">
          {phase.name} · Phase {phase.phaseNumber}
        </p>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-2 gap-4 text-[13px]">
          <div>
            <div className="text-muted-foreground text-[11px] uppercase tracking-wider">Location</div>
            <div className="text-foreground font-medium mt-0.5">{phase.location}, {phase.region}</div>
          </div>
          <div>
            <div className="text-muted-foreground text-[11px] uppercase tracking-wider">Plot Size</div>
            <div className="text-foreground font-medium mt-0.5">{plot.size} ft</div>
          </div>
          <div>
            <div className="text-muted-foreground text-[11px] uppercase tracking-wider">Land Use</div>
            <div className="text-foreground font-medium mt-0.5">Residential / Mixed</div>
          </div>
          <div>
            <div className="text-muted-foreground text-[11px] uppercase tracking-wider">Road Access</div>
            <div className="text-foreground font-medium mt-0.5">Tarmac frontage</div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-[#F0F4F8]">
          <div className="font-numbers font-medium text-[11px] text-muted-foreground tracking-[0.1em] uppercase">
            Listed Price
          </div>
          <div className="font-numbers font-bold text-[36px] text-primary leading-tight">
            Ksh {plot.price.toLocaleString()}
          </div>
          <div className="text-[13px] text-accent italic mt-1">
            Flexible payment plan available
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <PaymentPill icon="💳" label="Card" />
            <PaymentPill icon="📱" label="M-Pesa" />
            <PaymentPill icon="🏦" label="Bank Transfer" />
            <PaymentPill icon="📆" label="Installments" />
          </div>
        </div>

        <a
          href={inquireHref}
          className="mt-6 block w-full text-center bg-accent text-white font-bold text-[15px] py-4 rounded-lg hover:bg-[#C8861A] hover:scale-[1.02] transition-all"
        >
          Start My Inquiry for Plot #{plot.id} →
        </a>
        <a
          href={inquireHref}
          className="mt-3 block w-full text-center border-[1.5px] border-primary text-primary font-medium text-[14px] py-3 rounded-lg hover:bg-primary hover:text-white transition-all"
        >
          Book Free Site Visit Instead
        </a>

        <div className="mt-4 flex items-center justify-center gap-3 text-[12px] text-muted-foreground">
          <span>Share this plot:</span>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Check out ${phase.name} Plot #${plot.id} on Gatepath Realtors`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 rounded-full bg-[#25D366] text-white flex items-center justify-center text-[14px]"
            aria-label="Share via WhatsApp"
          >
            💬
          </a>
        </div>
      </div>
    </div>
  );
}
