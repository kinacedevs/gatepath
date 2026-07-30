import { Receipt, Compass, FileSignature, Landmark, Award, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Reveal } from "@/components/Reveal";
import { CONVEYANCING_STAGES } from "@/lib/conveyancing";

const stageIcons = [Receipt, Compass, FileSignature, Landmark, Award];

export function ConveyancingJourney() {
  return (
    <section className="bg-stone py-24 md:py-32 relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <Reveal className="text-center max-w-3xl mx-auto">
          <span className="eyebrow">After You Pay</span>
          <h2 className="mt-5 font-serif font-semibold text-[36px] md:text-[52px] text-primary leading-[1.15]">
            We Don't Stop at Your Deposit.
            <br />
            We Track You to Your Title Deed.
          </h2>
          <p className="mt-6 text-[16px] text-muted-foreground leading-[1.8]">
            Most sellers go quiet after payment. Every Gatepath purchase moves through the same
            5-stage pipeline below — and you can watch it happen in real time from your own client
            portal, not just take our word for it.
          </p>
        </Reveal>

        <div className="mt-20 relative">
          <div className="hidden lg:block absolute top-8 left-[8%] right-[8%] border-t border-dashed border-primary/25" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-6 relative">
            {CONVEYANCING_STAGES.map((s, i) => {
              const Icon = stageIcons[i];
              return (
                <Reveal key={s.stage} className="text-center">
                  <div className="h-16 w-16 rounded-full bg-white border-2 border-primary flex items-center justify-center mx-auto shadow-[var(--shadow-card)]">
                    <Icon size={24} className="text-primary" strokeWidth={1.75} />
                  </div>
                  <div className="mt-5 font-numbers font-bold text-[13px] tracking-[0.2em] text-accent">
                    STAGE {s.stage}
                  </div>
                  <h3 className="mt-3 font-serif font-semibold text-[17px] text-primary leading-snug">
                    {s.label}
                  </h3>
                  <p className="mt-2.5 text-[13px] text-muted-foreground leading-[1.65] max-w-[220px] mx-auto">
                    {s.desc}
                  </p>
                </Reveal>
              );
            })}
          </div>
        </div>

        <Reveal className="mt-16 text-center">
          <Link
            to="/portal"
            className="inline-flex items-center gap-2 text-primary font-semibold text-sm hover:text-accent transition-colors"
          >
            See how the client portal tracks this live <ArrowRight size={16} />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
