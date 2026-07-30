import { ShieldCheck, FileSearch, Fingerprint, ScrollText } from "lucide-react";
import { Reveal } from "@/components/Reveal";

const safeguards = [
  {
    icon: FileSearch,
    title: "Ministry of Lands search, before you pay",
    text: "Every plot is independently searched at the registry before it's ever listed — not after you've committed.",
  },
  {
    icon: Fingerprint,
    title: "Verified against Ardhisasa",
    text: "We cross-check title records against Ardhisasa, the Ministry of Lands' own digital verification system — the same system regulators use.",
  },
  {
    icon: ScrollText,
    title: "A pipeline you can see, not just a promise",
    text: "From payment to title deed, every stage — survey, agreement, stamp duty, registration — is tracked and visible in your own client portal.",
  },
  {
    icon: ShieldCheck,
    title: "One buyer per plot, guaranteed",
    text: "Our reservation system locks a plot the moment a deposit clears — never sold twice, never double-booked.",
  },
];

export function TrustAndVerification() {
  return (
    <section className="bg-primary-deep py-24 md:py-32 relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-16 items-center">
          <Reveal>
            <span className="eyebrow text-accent">The Real Risk in Kenyan Land</span>
            <h2 className="mt-5 font-serif font-semibold text-[36px] md:text-[52px] text-white leading-[1.15]">
              1 in 10 title deeds
              <br />
              in Kenya may be fake.
            </h2>
            <p className="mt-6 text-[17px] text-white/75 leading-[1.8]">
              Kenya's Ministry of Lands estimates that{" "}
              <strong className="text-white">over 10%</strong> of title deeds currently in
              circulation may be fraudulent. In 2025 alone, the Ethics and Anti-Corruption
              Commission recovered <strong className="text-white">KES 5.2 billion</strong> in
              grabbed land — and fraudsters now produce documents that look genuine even to
              experienced buyers.
            </p>
            <p className="mt-4 text-[17px] text-white/75 leading-[1.8]">
              This isn't a reason to be afraid of buying land. It's the reason to buy it through
              someone who verifies every title before you ever see a listing.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {safeguards.map((s) => (
              <Reveal
                key={s.title}
                className="bg-white/[0.06] backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/[0.09] transition-colors duration-300"
              >
                <s.icon className="text-accent" size={28} strokeWidth={1.75} />
                <h3 className="mt-4 font-serif font-semibold text-[17px] text-white leading-snug">
                  {s.title}
                </h3>
                <p className="mt-2.5 text-[14px] text-white/70 leading-[1.65]">{s.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
