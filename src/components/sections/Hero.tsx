import React, { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRotatingCarousel } from "@/hooks/useRotatingCarousel";
import { MediaSlide } from "@/components/MediaSlide";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { useContactInfo } from "@/hooks/useContactInfo";

export function Hero() {
  // No stock fallback here by design — the CEO uploads real photos via
  // Site Content, and only those should ever appear on the homepage hero.
  // The section renders on its own gradient background until real images
  // are uploaded, rather than showing an unapproved placeholder photo.
  const [images, setImages] = useState<string[]>([]);
  const current = useRotatingCarousel(images.length);
  const { whatsappNumber } = useContactInfo();

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const { data } = await (supabase as any)
          .from("site_banners")
          .select("*")
          .eq("id", "homepage_hero")
          .single();
        if (data?.data?.images && data.data.images.length > 0) {
          setImages(data.data.images);
        }
      } catch {
        // No real images uploaded yet — nothing to do.
      }
    };
    fetchBanners();
  }, []);

  return (
    <section className="relative min-h-screen w-full flex items-center pt-28 pb-24 bg-primary-deep overflow-hidden text-white">
      {/* Background Image Carousel with a real text-legibility scrim.
          Uploaded hero images are often full marketing posters with their
          own baked-in headline/contact text (not plain photography) — a
          light wash let that text ghost through and collide with our own
          heading. Two layers with no fully-transparent stop anywhere
          guarantee a real minimum darkness everywhere, strongest over the
          left text column. */}
      {images.length > 0 && (
        <div className="absolute inset-0 w-full h-full z-0">
          <MediaSlide
            src={images[current]}
            alt="Gatepath Premium Land Hero"
            className="w-full h-full object-cover object-center transition-opacity duration-1000"
            loading="eager"
            fetchPriority="high"
            autoPlay
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary-deep/95 via-primary-deep/70 to-primary-deep/45" />
          <div className="absolute inset-0 bg-gradient-to-t from-primary-deep/50 to-primary-deep/25" />
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
              href={`https://wa.me/${whatsappNumber}?text=Hello%20Gatepath%20Realtors%2C%20I%20would%20like%20to%20inquire%20about%20your%20available%20plots.`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-6 py-4 border-2 border-white/40 hover:border-white bg-white/10 backdrop-blur-md text-white font-semibold text-sm rounded-xl transition-all duration-300 hover:bg-white/20"
            >
              <WhatsAppIcon size={18} className="text-[#25D366]" /> Chat on WhatsApp
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
