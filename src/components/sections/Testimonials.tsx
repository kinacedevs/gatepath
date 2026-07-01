import { Reveal } from "@/components/Reveal";

const items = [
  {
    quote: "I was worried about buying land from Nairobi without seeing it first. Gatepath arranged a site visit within 48 hours. The process was seamless, and I received my signed agreement the same day I paid my deposit.",
    name: "Mary Njoroge",
    initials: "MN",
    tag: "Sagana, Phase 2 Owner",
  },
  {
    quote: "As someone in the diaspora, I needed a company I could trust to handle everything remotely. Gatepath's digital process is impressive — I paid by card, got my receipt by email, and my agreement was signed and delivered within hours.",
    name: "Samuel Kariuki",
    initials: "SK",
    tag: "Malindi, Phase 4 Owner — UK Diaspora",
  },
  {
    quote: "The loan calculator on their site helped me plan my installments before I even spoke to an agent. Transparent, professional, and genuinely helpful. I will be buying my second plot soon.",
    name: "David Mwangi",
    initials: "DM",
    tag: "Kithimani, Phase 1 Owner",
  },
];

export function Testimonials() {
  return (
    <section className="bg-background py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <Reveal className="text-center max-w-3xl mx-auto">
          <span className="eyebrow">Client Stories</span>
          <h2 className="mt-5 font-serif font-semibold text-[36px] md:text-[52px] text-primary leading-[1.15]">
            What Our Landowners Say
          </h2>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          {items.map((t) => (
            <Reveal
              key={t.name}
              className="relative bg-white rounded-lg p-9 border-t-4 border-accent shadow-[var(--shadow-card)] hover:-translate-y-1 hover:shadow-[var(--shadow-hover)] transition-all duration-400 flex flex-col"
            >
              <div className="flex gap-0.5 text-accent text-lg">★★★★★</div>
              <div className="relative mt-4 flex-1">
                <span className="absolute -top-4 -left-2 font-serif text-[60px] leading-none text-accent/80">"</span>
                <p className="relative font-serif italic text-[20px] text-foreground leading-[1.7]">
                  {t.quote}
                </p>
              </div>
              <div className="mt-6 h-px w-10 bg-accent" />
              <div className="mt-5 flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary text-white flex items-center justify-center font-sans font-semibold text-[14px]">
                  {t.initials}
                </div>
                <div>
                  <div className="font-sans font-semibold text-[16px] text-primary">{t.name}</div>
                  <div className="font-sans text-[13px] text-accent">{t.tag}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
