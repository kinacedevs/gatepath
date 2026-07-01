import { Link } from "@tanstack/react-router";
import { Reveal } from "@/components/Reveal";

export function CTABanner() {
  return (
    <section
      className="relative bg-cover bg-center"
      style={{
        backgroundImage:
          "linear-gradient(135deg, rgba(11,127,199,0.93) 0%, rgba(232,160,32,0.7) 100%), url('https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=2000&q=80')",
      }}
    >
      <div className="mx-auto max-w-4xl px-6 lg:px-10 py-28 md:py-32 text-center">
        <Reveal>
          <h2 className="font-serif font-bold text-[38px] md:text-[56px] text-white leading-[1.1]">
            Your Plot is Waiting.
            <br />
            Take the First Step Today.
          </h2>
          <p className="mt-8 text-[17px] md:text-[19px] font-light text-white/90 leading-[1.75] max-w-2xl mx-auto">
            Browse available plots across Malindi, Sagana, Diani, Nanyuki, Thika and 7 more locations.
            Secure yours with a simple deposit — and receive your signed agreement the same day.
          </p>
          <div className="mt-10 flex flex-wrap gap-5 justify-center">
            <Link
              to="/properties"
              className="inline-flex items-center justify-center bg-accent text-white px-11 py-4 text-base font-semibold rounded-md hover:bg-[#C8861A] hover:scale-[1.02] transition-all duration-300"
            >
              Browse Available Plots →
            </Link>
            <a
              href="https://wa.me/254799488488"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center bg-white text-primary border-2 border-white px-11 py-4 text-base font-semibold rounded-md hover:bg-primary hover:text-white transition-all duration-300"
            >
              WhatsApp Us Now
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
