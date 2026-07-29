import React, { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { MessageCircle, ArrowRight, ShieldCheck, Award, MapPin } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function Hero() {
  const [images, setImages] = useState<string[]>([]);
  const [current, setCurrent] = useState(0);

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
        } else {
          setImages([
            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80",
            "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1920&q=80",
            "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1920&q=80"
          ]);
        }
      } catch (err) {
        setImages([
          "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80"
        ]);
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

  const locationsList = [
    "Diani", "Matuu", "Sagana", "Makutano", "Thika", "Juja", "Kithimani", "Kiambu", "Nanyuki", "Malindi", "Mambrui", "Gongoni"
  ];

  return (
    <section className="relative min-h-screen w-full flex flex-col justify-between pt-28 pb-0 bg-primary-deep overflow-hidden text-white">
      {/* Background Image Carousel with Non-Distorting Cover Fit & Deep Gradient Overlay */}
      {images.length > 0 && (
        <div className="absolute inset-0 w-full h-full z-0">
          <img
            src={images[current]}
            alt="Gatepath Premium Land Hero"
            className="w-full h-full object-cover object-center transition-opacity duration-1000"
          />
          {/* Deep Navy Gradient Mask matching Figma Exact DNA */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary-deep/95 via-primary-deep/80 to-primary-deep/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-primary-deep via-transparent to-primary-deep/50" />
        </div>
      )}

      {/* Main Content Container (Desktop & Mobile Pixel Perfect Layout) */}
      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-10 my-auto py-12 flex flex-col justify-center">
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
            This is <span className="italic font-normal">real land.</span><br />
            <span className="text-accent">Real title deeds.</span><br />
            Real futures.
          </h1>

          {/* Subheadline Description */}
          <p className="text-base sm:text-lg text-slate-200 font-sans max-w-2xl leading-relaxed">
            500+ plots sold across 12 Kenyan locations. Every title verified. Prices from <strong className="text-white">Ksh 160,000</strong>. Instalment plans, M-Pesa accepted.
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

      {/* Bottom Floating Stats & Marquee Strip */}
      <div className="relative z-10 w-full bg-footer-deep/90 backdrop-blur-lg border-t border-white/10">
        <div className="mx-auto max-w-7xl px-6 lg:px-10 py-6 grid grid-cols-2 md:grid-cols-5 gap-6 text-center md:text-left border-b border-white/10">
          <div>
            <span className="font-sans font-extrabold text-2xl lg:text-3xl text-accent block">500+</span>
            <span className="text-xs text-slate-300 font-medium uppercase tracking-wider">Plots Sold</span>
          </div>
          <div>
            <span className="font-sans font-extrabold text-2xl lg:text-3xl text-accent block">12+</span>
            <span className="text-xs text-slate-300 font-medium uppercase tracking-wider">Locations</span>
          </div>
          <div>
            <span className="font-sans font-extrabold text-2xl lg:text-3xl text-accent block">100%</span>
            <span className="text-xs text-slate-300 font-medium uppercase tracking-wider">Title Verified</span>
          </div>
          <div>
            <span className="font-sans font-extrabold text-2xl lg:text-3xl text-accent block">5★</span>
            <span className="text-xs text-slate-300 font-medium uppercase tracking-wider">Rated</span>
          </div>
          <div>
            <span className="font-sans font-extrabold text-2xl lg:text-3xl text-accent block">Est. 2018</span>
            <span className="text-xs text-slate-300 font-medium uppercase tracking-wider">Registered</span>
          </div>
        </div>

        {/* Continuous Auto-scrolling Location Marquee */}
        <div className="py-3 px-6 overflow-hidden flex items-center bg-primary-deep">
          <div className="flex items-center gap-6 whitespace-nowrap text-xs font-semibold text-slate-200 animate-marquee">
            {locationsList.concat(locationsList).map((loc, idx) => (
              <span key={idx} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                <span className="hover:text-white transition-colors cursor-pointer">{loc}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
