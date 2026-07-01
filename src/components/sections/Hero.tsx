import { ChevronDown } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function Hero() {
  return (
    <section
      id="home"
      className="relative isolate min-h-screen flex items-center overflow-hidden"
    >
      <div className="absolute inset-0 -z-10">
        <img
          src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=2000&q=80"
          alt="Aerial view of lush green Kenyan farmland"
          className="h-full w-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(11,127,199,0.78) 0%, rgba(11,127,199,0.55) 50%, rgba(232,160,32,0.30) 100%)",
          }}
        />
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-10 w-full py-32 md:py-40">
        <div className="max-w-[860px] text-white text-center md:text-left fade-in-up is-visible">
          <div className="inline-flex items-center gap-4 mb-8">
            <span className="h-px w-[30px] bg-accent" />
            <span className="font-numbers font-medium text-[13px] tracking-[0.25em] uppercase text-accent">
              Kenya's Trusted Land Marketplace
            </span>
          </div>

          <h1 className="font-serif font-bold text-[48px] md:text-[72px] lg:text-[80px] leading-[1.0] tracking-[0.01em]">
            Own Your Piece of
            <br />
            <em className="not-italic md:italic text-accent">Kenya's Future.</em>
          </h1>

          <p className="mt-8 text-[17px] md:text-[20px] font-light leading-[1.7] text-white/90 max-w-2xl mx-auto md:mx-0">
            Premium plots in Malindi, Sagana, Diani, Thika, Nanyuki and beyond.
            Transparent pricing. Verified titles. Flexible payment plans.
            <br />
            <span className="font-serif italic text-accent text-[20px] md:text-[22px]">
              Your Interest is Our Priority.
            </span>
          </p>

          <div className="mt-10 flex flex-wrap gap-4 justify-center md:justify-start">
            <Link
              to="/properties"
              className="inline-flex items-center justify-center bg-accent text-white px-9 py-4 text-base font-semibold rounded-md hover:bg-[#C8861A] hover:scale-[1.02] transition-all duration-300"
            >
              Browse Available Plots →
            </Link>
            <a
              href="https://wa.me/254799488488?text=Hello%20Gatepath%20Realtors%2C%20I%20would%20like%20to%20book%20a%20free%20site%20visit."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center bg-transparent border-2 border-white text-white px-9 py-4 text-base font-medium rounded-md hover:bg-white/15 transition-all duration-300"
            >
              Book a Free Site Visit
            </a>
          </div>
        </div>
      </div>

      <a
        href="#trust"
        aria-label="Scroll down"
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-accent animate-bounce-down"
      >
        <ChevronDown size={32} strokeWidth={1.5} />
      </a>
    </section>
  );
}
