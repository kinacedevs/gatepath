import { Reveal } from "@/components/Reveal";

const features = [
  { emoji: "🏷️", title: "Fair Published Prices", text: "No phone calls needed to know what a plot costs. All prices visible online." },
  { emoji: "📜", title: "Verified Title Deeds", text: "Every plot carries a clean title deed. Full legal due diligence done for you." },
  { emoji: "📅", title: "Flexible Payment Plans", text: "Cash, installments, or bank loan. We structure a plan that works for your income." },
  { emoji: "🏢", title: "Physical Offices", text: "Visit us at CNM Centre, Ruiru Eastern Bypass. We are a real company with a real address." },
  { emoji: "🤝", title: "Guided Through Every Step", text: "From first inquiry to title transfer, a dedicated agent walks with you." },
  { emoji: "📱", title: "Full Digital Process", text: "Inquire, book, pay, and receive your signed agreement — all from your phone." },
];

export function WhyGatepath() {
  return (
    <section id="about" className="bg-background py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
        <Reveal>
          <span className="eyebrow">Why Choose Us</span>
          <h2 className="mt-5 font-serif font-semibold text-[36px] md:text-[52px] text-primary leading-[1.15]">
            Trusted. Transparent.
            <br />
            Proven.
          </h2>
          <p className="mt-6 text-[17px] text-muted-foreground leading-[1.8]">
            At Gatepath Realtors, we believe buying land should be simple, safe, and satisfying. Since 2023, we've helped hundreds of Kenyans — from Nairobi professionals to diaspora investors — secure titled land at fair prices.
          </p>
          <blockquote className="mt-8 pl-6 border-l-4 border-accent">
            <p className="font-serif italic text-[24px] md:text-[28px] text-primary leading-snug">
              "Your Interest is Our Priority."
            </p>
          </blockquote>
          <a
            href="#properties"
            className="mt-8 inline-flex items-center justify-center bg-accent text-white px-7 py-3.5 text-sm font-semibold rounded-md hover:bg-[#C8861A] hover:scale-[1.02] transition-all duration-300"
          >
            Explore Our Properties →
          </a>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {features.map((f) => (
            <Reveal
              key={f.title}
              className="group bg-white border-l-[3px] border-accent rounded-md p-6 shadow-[var(--shadow-card)] hover:-translate-y-1 hover:shadow-[var(--shadow-hover)] transition-all duration-400"
            >
              <div className="text-2xl mb-3">{f.emoji}</div>
              <h3 className="font-sans font-semibold text-[16px] text-primary">{f.title}</h3>
              <p className="mt-2 text-[14px] text-muted-foreground leading-[1.6]">{f.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
