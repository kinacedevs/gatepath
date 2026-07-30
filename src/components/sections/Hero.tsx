import React, { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { MessageCircle, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DEFAULT_HERO_IMAGES } from "@/lib/heroImages";

export function Hero() {
  const [images, setImages] = useState<string[]>(DEFAULT_HERO_IMAGES);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const { data } = await (supabase as any)
          .from("site_banners")
          .select("*")
          .eq("id", "homepage_hero")
          .single();
        // Only override if a real CEO-uploaded set exists — otherwise keep
        // the default that's already rendering, no flash-to-nothing.
        if (data?.data?.images && data.data.images.length > 0) {
          setImages(data.data.images);
        }
      } catch {
        // Default images are already showing — nothing to do.
      }
    };
    fetchBanners();
  }, []);

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    }, 6000);
    return () => clearInterval(timer);
  }, [images]);

  return (
    <section className="relative min-h-screen w-full flex items-center pt-28 pb-24 bg-primary-deep overflow-hidden text-white">
      {/* Background Image Carousel with Non-Distorting Cover Fit & Deep Gradient Overlay.
          Overlay lightened from /95-/80-/60 (and a full-opacity vertical mask on top of
          that) so the photo is actually visible — it was reading as near-black before. */}
      {images.length > 0 && (
        <div className="absolute inset-0 w-full h-full z-0">
          <img
            src={images[current]}
            alt="Gatepath Premium Land Hero"
            className="w-full h-full object-cover object-center transition-opacity duration-1000"
            loading="eager"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary-deep/90 via-primary-deep/55 to-primary-deep/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-primary-deep/70 via-transparent to-primary-deep/20" />
        </div>
      )}

      {/* Main Content Container (Desktop & Mobile Pixel Perfect Layout) */}
      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-10 py-12 flex flex-col justify-center">
        <div className="max-w-3xl space-y-6">
          {/* Top Gold Eyebrow */}
          <div className="inline-flex items-center gap-2">
            <span className="h-[2px] w-8 bg-accent"></span>
            <span className="text-xs font-extrabold uppercase tracking-[0.25em] text-accent font-sans">
              GATEPATH REALTORS • KENYA
            </span>
          </div>

          {/* Main Headline (Cormorant Garamond 700 with Gold Accent) */}
          <h1 className="font-serif font-bold text-5xl sm:text-6xl lg:text-7xl tracking-tight leading-[1.08] text-white">
            This is <span className="italic font-normal">real land.</span>
            <br />
            <span className="text-accent">Real title deeds.</span>
            <br />
            Real futures.
          </h1>

          {/* Subheadline Description */}
          <p className="text-base sm:text-lg text-slate-200 font-sans max-w-2xl leading-relaxed">
            500+ plots sold across 12 Kenyan locations. Every title verified. Prices from{" "}
            <strong className="text-white">Ksh 160,000</strong>. Instalment plans, M-Pesa accepted.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-4 pt-4">
            <Link
              to="/properties"
              className="inline-flex items-center gap-2 px-8 py-4 bg-accent hover:bg-accent-dark text-white font-bold text-sm rounded-xl transition-all duration-300 shadow-xl hover:-translate-y-0.5"
            >
              Explore Our Land <ArrowRight size={18} />
            </Link>

            <a
              href="https://wa.me/254799488488?text=Hello%20Gatepath%20Realtors%2C%20I%20would%20like%20to%20inquire%20about%20your%20available%20plots."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-6 py-4 border-2 border-white/40 hover:border-white bg-white/10 backdrop-blur-md text-white font-semibold text-sm rounded-xl transition-all duration-300 hover:bg-white/20"
            >
              <MessageCircle size={18} className="text-[#25D366]" /> Chat on WhatsApp
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
