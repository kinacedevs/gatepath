import React, { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { Clock, DollarSign, Globe, ShieldCheck, FileCheck, ArrowRight, MessageCircle, Download, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/diaspora")({
  component: DiasporaPage,
  head: () => ({
    meta: [
      { title: "Diaspora Hub — Buy Verified Land in Kenya from Abroad" },
      {
        name: "description",
        content:
          "Gatepath Realtors Diaspora Hub. Safely buy land in Kenya from the UK, USA, Canada, UAE or Australia with 100% verified titles and remote conveyancing.",
      },
    ],
  }),
});

type Currency = "KES" | "USD" | "GBP" | "EUR";

const currencyRates: Record<Currency, { symbol: string; rate: number }> = {
  KES: { symbol: "Ksh", rate: 1 },
  USD: { symbol: "$", rate: 0.0077 },
  GBP: { symbol: "£", rate: 0.0061 },
  EUR: { symbol: "€", rate: 0.0071 },
};

function DiasporaPage() {
  const [currency, setCurrency] = useState<Currency>("KES");
  const [nairobiTime, setNairobiTime] = useState<string>("");

  useEffect(() => {
    const updateClock = () => {
      const options: Intl.DateTimeFormatOptions = {
        timeZone: "Africa/Nairobi",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      };
      setNairobiTime(new Intl.DateTimeFormat("en-US", options).format(new Date()));
    };
    updateClock();
    const interval = setInterval(updateClock, 10000);
    return () => clearInterval(interval);
  }, []);

  const formatPrice = (kesAmount: number) => {
    const { symbol, rate } = currencyRates[currency];
    const converted = Math.round(kesAmount * rate);
    return `${symbol} ${converted.toLocaleString()}`;
  };

  return (
    <div className="min-h-screen bg-ivory text-foreground font-sans">
      <Navbar />

      {/* Hero Header Matching Exact Figma Prototype Screenshot 6 */}
      <section className="relative min-h-screen w-full flex flex-col justify-between pt-32 pb-16 bg-primary-deep overflow-hidden text-white">
        {/* Full-Bleed High-Res Landscape Backdrop & Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80"
            alt="Kenya Coastal Landscape"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary-deep/95 via-primary-deep/85 to-primary-deep/60" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-10 my-auto py-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column Text Content */}
          <div className="lg:col-span-7 space-y-6">
            <span className="text-xs font-extrabold uppercase tracking-[0.25em] text-accent block">
              FOR KENYANS IN THE DIASPORA
            </span>

            <h1 className="font-serif font-bold text-5xl sm:text-6xl lg:text-7xl leading-[1.08] text-white">
              Your land is waiting.<br />
              <span className="italic text-accent">You don't have to be</span><br />
              <span className="italic text-accent">there</span> to own it.
            </h1>

            <p className="text-base sm:text-lg text-slate-200 font-sans max-w-xl leading-relaxed">
              We have helped Kenyans in London, Toronto, Houston, and Dubai buy verified land safely — without travelling home.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-4">
              <a
                href="https://wa.me/254799488488?text=Hello%20Gatepath%20Diaspora%20Team%2C%20I%20am%20inquiring%20from%20abroad."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-4 bg-accent hover:bg-accent-dark text-white font-bold text-sm rounded-xl transition-all shadow-xl"
              >
                Chat with Diaspora Advisor <ArrowRight size={18} />
              </a>
            </div>
          </div>

          {/* Right Floating Widget Card (Nairobi Time & Live Currency Switcher) */}
          <div className="lg:col-span-5">
            <div className="bg-primary-deep/85 backdrop-blur-xl border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-white">
              {/* Nairobi Clock */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <Clock className="text-accent" size={24} />
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300 block">NAIROBI TIME</span>
                    <span className="font-stat-lg text-2xl font-extrabold text-accent">{nairobiTime || "12:00 PM"}</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-green-500/20 text-green-400 text-[10px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1.5 border border-green-500/30">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> EAT (Our Team Online)
                </span>
              </div>

              {/* Currency Converter Selector */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300 block">
                  VIEW PRICES IN CURRENCY
                </span>
                <div className="grid grid-cols-4 gap-2 bg-black/20 p-1.5 rounded-xl border border-white/10">
                  {(["KES", "USD", "GBP", "EUR"] as Currency[]).map((c) => (
                    <button
                      key={c}
                      onClick={() => setCurrency(c)}
                      className={`py-2 text-xs font-bold rounded-lg transition-all ${
                        currency === c
                          ? "bg-accent text-primary-deep shadow-md font-extrabold"
                          : "text-slate-300 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Converted Sample Prices */}
              <div className="space-y-2.5 pt-2 text-xs border-t border-white/10">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Baraka Plains (Matuu):</span>
                  <span className="font-stat-lg font-bold text-accent">{formatPrice(320000)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Beach Life (Malindi 1/4ac):</span>
                  <span className="font-stat-lg font-bold text-accent">{formatPrice(160000)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Amani Gardens (Sagana):</span>
                  <span className="font-stat-lg font-bold text-accent">{formatPrice(749000)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4-Fear Trust Resolution Framework */}
      <section className="mx-auto max-w-7xl px-6 lg:px-10 py-16 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-accent">REMOTE PEACE OF MIND</span>
          <h2 className="font-serif font-bold text-3xl sm:text-4xl text-primary-deep">
            Buying Land From Abroad? We Solve Your #1 Concerns.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <ShieldCheck className="text-primary" size={32} />
            <h3 className="font-serif font-bold text-lg text-primary-deep">1. Verified Title Deeds</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              We conduct official Ministry of Lands searches before you pay a single shilling.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <FileCheck className="text-available" size={32} />
            <h3 className="font-serif font-bold text-lg text-primary-deep">2. Zero Double Allocation</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Our real-time interactive masterplan locks your plot unit instantly upon reservation deposit.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <Download className="text-accent" size={32} />
            <h3 className="font-serif font-bold text-lg text-primary-deep">3. Power of Attorney Guide</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Download our legal Power of Attorney template to appoint a family representative easily.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <Globe className="text-[#3B82F6]" size={32} />
            <h3 className="font-serif font-bold text-lg text-primary-deep">4. Global Card & Wire Rails</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Pay securely via international Credit/Debit cards, M-Pesa, or direct bank transfer via Paystack.
            </p>
          </div>
        </div>
      </section>

      <Footer />
      <WhatsAppButton />
    </div>
  );
}
