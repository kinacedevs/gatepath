import { Search, FileText, MapPin, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/Reveal";

const steps = [
  { icon: Search, num: "01", title: "Browse Available Plots", text: "Explore our phases by location. Each plot is colour-coded: green for available, amber for reserved, red for sold." },
  { icon: FileText, num: "02", title: "Select & Send Inquiry", text: "Click your preferred plot. A form pre-fills with the plot details — just add your payment preference and any questions." },
  { icon: MapPin, num: "03", title: "Book Your Free Site Visit", text: "Schedule a free guided visit to the land. Our agent meets you at the site — see it before you commit." },
  { icon: ShieldCheck, num: "04", title: "Pay & Receive Agreement", text: "Pay your deposit securely online. Receive your signed purchase agreement and official receipt — instantly on your email." },
];

export function HowItWorks() {
  return (
    <section className="bg-primary py-24 md:py-32 relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <Reveal className="text-center max-w-3xl mx-auto">
          <span className="eyebrow">The Process</span>
          <h2 className="mt-5 font-serif font-semibold text-[36px] md:text-[52px] text-white leading-[1.15]">
            Your Land. Your Way.
            <br />
            In 4 Simple Steps.
          </h2>
        </Reveal>

        <div className="mt-20 relative">
          {/* dashed connector — desktop */}
          <div className="hidden lg:block absolute top-8 left-[12%] right-[12%] border-t border-dashed border-accent/40" />

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 lg:gap-8 relative">
            {steps.map((s, i) => (
              <Reveal key={s.num} className="text-center" >
                <div className="relative inline-flex">
                  <div className="h-16 w-16 rounded-full bg-accent flex items-center justify-center mx-auto shadow-[0_8px_24px_rgba(232,160,32,0.4)]">
                    <s.icon size={26} className="text-primary" strokeWidth={1.75} />
                  </div>
                </div>
                <div className="mt-5 font-numbers font-bold text-[13px] tracking-[0.2em] text-accent">
                  {s.num}
                </div>
                <h3 className="mt-3 font-display font-semibold text-[22px] text-white">
                  {s.title}
                </h3>
                <p className="mt-3 text-[15px] text-white/75 leading-[1.7] max-w-xs mx-auto">
                  {s.text}
                </p>
                {/* mobile vertical line */}
                {i < steps.length - 1 && (
                  <div className="lg:hidden mt-10 mx-auto h-10 w-px border-l border-dashed border-accent/40" />
                )}
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
