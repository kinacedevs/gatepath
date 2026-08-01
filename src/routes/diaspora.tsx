import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import {
  Globe,
  Video,
  FileCheck,
  ShieldCheck,
  Truck,
  ArrowRight,
  HelpCircle,
  Clock,
  PhoneCall,
  Mail,
  Loader2,
  CheckCircle,
  Search,
  Download,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import diasporaHeroAsset from "@/assets/diaspora.jpg";
import { PhaseCard } from "@/components/properties/PhaseCard";
import { usePhases } from "@/lib/phases";
import { CURRENCIES, formatFromKes, type Currency } from "@/lib/currency";
import type { Faq } from "@/lib/types";

export const Route = createFileRoute("/diaspora")({
  component: DiasporaPage,
  head: () => ({
    meta: [
      { title: "Diaspora Investment Channel — Gatepath Realtors" },
      {
        name: "description",
        content:
          "Securely purchase land in Kenya from anywhere in the world. Real-time plots, certified land searches, escrow protection, and DHL title deed delivery — priced in your own currency.",
      },
    ],
    links: [
      // Hero renders as a CSS background-image, which the browser's preload
      // scanner discovers later than an <img> — this hint gets the fetch
      // started as early as an eager <img> would.
      { rel: "preload", as: "image", href: diasporaHeroAsset, fetchPriority: "high" },
    ],
  }),
});

const TIMEZONES = [
  { id: "EST", label: "US Eastern (GMT-5) / New York" },
  { id: "CST", label: "US Central (GMT-6) / Chicago" },
  { id: "MST", label: "US Mountain (GMT-7) / Denver" },
  { id: "PST", label: "US Pacific (GMT-8) / Los Angeles" },
  { id: "GMT", label: "UK / London (GMT+0)" },
  { id: "CET", label: "Europe (GMT+1) / Berlin" },
  { id: "AST", label: "Gulf / Dubai (GMT+4)" },
  { id: "EAT", label: "East Africa (GMT+3) / Nairobi" },
  { id: "AEST", label: "Australia (GMT+10) / Sydney" },
];

const PREFERRED_COMM = [
  { id: "whatsapp", label: "WhatsApp Chat / Video Tour" },
  { id: "zoom", label: "Zoom Video Meeting" },
  { id: "google-meet", label: "Google Meet Session" },
  { id: "email", label: "Detailed Email Thread" },
  { id: "call", label: "Direct International Voice Call" },
];

const TRUST_POINTS = [
  {
    icon: ShieldCheck,
    title: "Verified Title Deeds",
    desc: "We conduct official Ministry of Lands searches before you pay a single shilling.",
  },
  {
    icon: FileCheck,
    title: "Zero Double Allocation",
    desc: "Our real-time interactive masterplan locks your plot instantly upon reservation deposit.",
  },
  {
    icon: Download,
    title: "Power of Attorney Guide",
    desc: "Download our legal Power of Attorney template to appoint a family representative easily.",
  },
  {
    icon: Globe,
    title: "Global Card & Wire Rails",
    desc: "Pay securely via international Credit/Debit cards, M-Pesa, or direct bank transfer via Paystack.",
  },
];

function sanitize(val: string): string {
  return val.replace(/[<>"'&]/g, "").trim();
}

const CURRENCY_STORAGE_KEY = "gatepath_diaspora_currency";

function DiasporaPage() {
  // ─── Global currency selection — persisted so a returning visitor keeps
  // their preference. Propagates into the catalog grid below and into any
  // property page reached from it (see PhaseCard's search param).
  const [currency, setCurrency] = useState<Currency>("USD");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(CURRENCY_STORAGE_KEY);
    if (saved && (CURRENCIES as string[]).includes(saved)) {
      setCurrency(saved as Currency);
    }
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
  }, [currency]);

  // ─── Hero — CEO-uploaded override (site_banners "diaspora_hero", same
  // pattern as Hero.tsx's "homepage_hero") falls back to the real branded
  // asset shot, never to generic stock.
  const [heroImage, setHeroImage] = useState<string>(diasporaHeroAsset);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await (supabase as any)
          .from("site_banners")
          .select("data")
          .eq("id", "diaspora_hero")
          .maybeSingle();
        const url = data?.data?.image_url;
        if (!cancelled && typeof url === "string" && url) {
          setHeroImage(url);
        }
      } catch {
        // keep the real asset fallback — never fall through to stock
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Diaspora FAQs — real, CRM-editable content (faqs table, category
  // "diaspora"). No fabricated fallback: if none are published yet, the
  // section below hides instead of showing placeholder Q&As.
  const [diasporaFaqs, setDiasporaFaqs] = useState<Faq[]>([]);
  useEffect(() => {
    const fetchFaqs = async () => {
      const { data } = await supabase
        .from("faqs")
        .select("*")
        .eq("category", "diaspora")
        .eq("is_published", true)
        .order("display_order");
      setDiasporaFaqs((data as Faq[]) ?? []);
    };
    fetchFaqs();
  }, []);

  const [nairobiTime, setNairobiTime] = useState<string>("");
  useEffect(() => {
    const update = () => {
      setNairobiTime(
        new Intl.DateTimeFormat("en-US", {
          timeZone: "Africa/Nairobi",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }).format(new Date()),
      );
    };
    update();
    const interval = setInterval(update, 10000);
    return () => clearInterval(interval);
  }, []);

  // ─── Property Catalog ────────────────────────────────────────────────────
  const { phases, loading: phasesLoading } = usePhases();

  const [loc, setLoc] = useState("All Locations");
  const [status, setStatus] = useState("All Status");
  const [price, setPrice] = useState("Any Price");
  const [q, setQ] = useState("");

  const filteredPhases = useMemo(() => {
    return phases.filter((p) => {
      if (loc !== "All Locations" && !p.location.toLowerCase().includes(loc.toLowerCase()))
        return false;
      if (status !== "All Status" && p.status !== status) return false;
      if (price !== "Any Price") {
        const spUsd = p.startingPrice / 129.5;
        if (price === "Under $3,000" && spUsd >= 3000) return false;
        if (price === "$3,000–$5,500" && (spUsd < 3000 || spUsd > 5500)) return false;
        if (price === "$5,500–$8,000" && (spUsd < 5500 || spUsd > 8000)) return false;
        if (price === "Above $8,000" && spUsd <= 8000) return false;
      }
      if (q.trim()) {
        const needle = q.toLowerCase();
        if (
          !p.name.toLowerCase().includes(needle) &&
          !p.location.toLowerCase().includes(needle) &&
          !p.region.toLowerCase().includes(needle)
        )
          return false;
      }
      return true;
    });
  }, [phases, loc, status, price, q]);

  const samplePrices = useMemo(() => {
    if (phases.length === 0) return [];
    return [...phases].sort((a, b) => a.startingPrice - b.startingPrice).slice(0, 3);
  }, [phases]);

  // ─── Virtual Tour / Callback Booking Form ────────────────────────────────
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [residence, setResidence] = useState("");
  const [timezone, setTimezone] = useState("EST");
  const [commChannel, setCommChannel] = useState("whatsapp");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("morning");
  const [budget, setBudget] = useState("Ksh 300K - 600K");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName || !email || !phone || !residence) {
      setErrorMsg("Please fill in all required fields marked with *");
      return;
    }

    setLoading(true);

    try {
      const { data: inquiry, error: inquiryErr } = await (supabase as any)
        .from("inquiries")
        .insert({
          client_full_name: sanitize(fullName),
          client_email: email.toLowerCase().trim(),
          client_phone: phone.trim(),
          client_postal_address: sanitize(residence),
          heard_from: "Diaspora Portal",
          questions: sanitize(
            `[Diaspora Request] Timezone: ${timezone} | Preferred Channel: ${commChannel} | Budget: ${budget} | Notes: ${notes}`,
          ),
          status: "pending",
        })
        .select()
        .single();

      if (inquiryErr || !inquiry) {
        throw new Error(inquiryErr?.message ?? "Failed to save inquiry");
      }

      if (preferredDate) {
        const { error: bookingErr } = await (supabase as any).from("bookings").insert({
          inquiry_id: inquiry.id,
          visit_date: preferredDate,
          visit_time: preferredTime as "morning" | "afternoon",
          visit_type: "virtual",
          visit_notes: sanitize(`Preferred channel: ${commChannel} | Notes: ${notes}`),
          status: "pending",
        });

        if (bookingErr) {
          console.warn("Virtual booking insertion warning:", bookingErr.message);
        }
      }

      setSuccess(true);
      setFullName("");
      setEmail("");
      setPhone("");
      setResidence("");
      setNotes("");
      setPreferredDate("");
    } catch (err: any) {
      console.error("Diaspora booking error:", err);
      setErrorMsg(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ivory">
      <Navbar />

      {/* HERO — real branded asset (or CEO-uploaded override), never stock */}
      <section
        className="relative pt-44 pb-20 bg-primary-deep overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(7,75,125,0.92) 0%, rgba(7,75,125,0.72) 100%), url(${heroImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="relative mx-auto max-w-7xl px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-12 items-center">
          <div className="text-white max-w-2xl">
            <span className="inline-flex items-center gap-2 bg-accent/20 text-accent border border-accent/30 font-semibold tracking-wider uppercase text-[12px] px-3.5 py-1.5 rounded-full mb-6">
              <Globe size={14} /> Certified Diaspora Channel
            </span>
            <h1 className="font-serif font-bold text-[42px] md:text-[62px] leading-[1.08] tracking-tight">
              Your land is waiting.
              <br />
              <span className="italic text-accent">You don't have to be there</span>
              <br />
              to own it.
            </h1>
            <p className="mt-6 text-[17px] md:text-[19px] text-white/85 font-light leading-relaxed max-w-2xl">
              We've helped Kenyans in London, Toronto, Houston and Dubai buy verified land safely —
              without travelling home. No middlemen, no family run-arounds, no legal uncertainty.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="#catalog"
                className="bg-accent text-white font-semibold text-[15px] px-8 py-3.5 rounded-md hover:bg-accent-dark transition-all"
              >
                Browse Catalog in {currency}
              </a>
              <a
                href="https://wa.me/254799488488?text=Hello%20Gatepath%20Diaspora%20Team%2C%20I%20am%20inquiring%20from%20abroad."
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/10 border border-white/30 text-white font-semibold text-[15px] px-8 py-3.5 rounded-md hover:bg-white/20 backdrop-blur-md transition-all"
              >
                Chat with Diaspora Advisor
              </a>
            </div>
          </div>

          {/* FLOATING WIDGET — Nairobi clock + live currency switcher */}
          <div className="bg-primary-deep/80 backdrop-blur-xl border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-white">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <Clock className="text-accent" size={24} />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300 block">
                    NAIROBI TIME
                  </span>
                  <span className="font-numbers text-2xl font-extrabold text-accent">
                    {nairobiTime || "—:—"}
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-green-500/20 text-green-400 text-[10px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1.5 border border-green-500/30">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Team Online
              </span>
            </div>

            <div className="space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300 block">
                VIEW PRICES IN YOUR CURRENCY
              </span>
              <div className="grid grid-cols-4 gap-2 bg-black/20 p-1.5 rounded-xl border border-white/10">
                {CURRENCIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    className={`py-2 text-[11px] font-bold rounded-lg transition-all ${
                      currency === c
                        ? "bg-accent text-primary-deep shadow-md"
                        : "text-slate-300 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {samplePrices.length > 0 && (
              <div className="space-y-2.5 pt-2 text-xs border-t border-white/10">
                {samplePrices.map((p) => (
                  <div key={p.slug} className="flex justify-between items-center gap-4">
                    <span className="text-slate-300 truncate">{p.name}:</span>
                    <span className="font-numbers font-bold text-accent whitespace-nowrap">
                      {formatFromKes(p.startingPrice, currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 border-t border-white/10 text-[10px] text-slate-400 leading-relaxed">
              Rates are indicative — Paystack settles in KES. The exact KES amount is always shown
              before you pay.
            </div>
          </div>
        </div>
      </section>

      {/* 4-POINT TRUST STRIP */}
      <section className="py-14 bg-white border-b border-[#E5E0D8]">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-accent">
              REMOTE PEACE OF MIND
            </span>
            <h2 className="font-serif font-bold text-2xl sm:text-3xl text-primary-deep">
              Buying Land From Abroad? We Solve Your #1 Concerns.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {TRUST_POINTS.map((t) => (
              <div
                key={t.title}
                className="bg-ivory p-6 rounded-2xl border border-[#E5E0D8] shadow-sm space-y-3"
              >
                <t.icon className="text-primary" size={30} />
                <h3 className="font-serif font-bold text-[17px] text-primary-deep">{t.title}</h3>
                <p className="text-[13px] text-muted-foreground leading-relaxed">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DIASPORA PROPERTY CATALOG — priced in the selected currency */}
      <section id="catalog" className="py-24 bg-[#F5F2EE] border-b border-[#E5E0D8]">
        <div className="mx-auto max-w-7xl px-6 lg:px-12">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="font-serif font-semibold text-[38px] md:text-[52px] text-primary leading-tight">
              Exclusive Property Catalog
            </h2>
            <p className="mt-4 text-[16px] text-muted-foreground leading-relaxed">
              Browse every active phase with real-time availability, priced in{" "}
              <strong className="text-primary">{currency}</strong>. Switch currency anytime using
              the selector above — Paystack always settles the exact amount in KES at checkout.
            </p>
          </div>

          <div className="bg-white border border-[#E5E0D8] rounded-xl p-4 shadow-sm mb-12 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-wrap gap-3">
              <select
                className="font-sans text-[14px] text-foreground bg-white border border-[#D0CCC5] rounded-md py-2.5 pl-3.5 pr-9 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 transition-colors cursor-pointer"
                value={loc}
                onChange={(e) => setLoc(e.target.value)}
              >
                {[
                  "All Locations",
                  "Malindi",
                  "Gongoni",
                  "Marafa",
                  "Diani",
                  "Matuu",
                  "Sagana",
                  "Juja",
                  "Nairobi",
                ].map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
              <select
                className="font-sans text-[14px] text-foreground bg-white border border-[#D0CCC5] rounded-md py-2.5 pl-3.5 pr-9 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 transition-colors cursor-pointer"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {["All Status", "ACTIVE", "COMING SOON", "SOLD OUT"].map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
              <select
                className="font-sans text-[14px] text-foreground bg-white border border-[#D0CCC5] rounded-md py-2.5 pl-3.5 pr-9 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 transition-colors cursor-pointer"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              >
                {[
                  "Any Price",
                  "Under $3,000",
                  "$3,000–$5,500",
                  "$5,500–$8,000",
                  "Above $8,000",
                ].map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </div>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                placeholder="Search phases..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="font-sans text-[14px] border border-[#D0CCC5] rounded-md py-2.5 pl-10 pr-3.5 w-full lg:w-[260px] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 transition-colors"
              />
            </div>
          </div>

          {phasesLoading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-[#E5E0D8] shadow-sm">
              <Loader2 className="animate-spin text-accent mb-3" size={40} />
              <p className="font-sans text-[14px] text-muted-foreground">
                Syncing property registry database...
              </p>
            </div>
          ) : phases.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-[#E5E0D8] shadow-sm">
              <p className="text-muted-foreground text-[14px]">
                No project phases found in database.
              </p>
            </div>
          ) : filteredPhases.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-[#E5E0D8] shadow-sm">
              <p className="text-muted-foreground text-[14px]">
                No properties match your filter preferences.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
              {filteredPhases.map((p) => (
                <PhaseCard key={p.slug} phase={p} currency={currency} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 6-STEP SECURE PURCHASE TIMELINE */}
      <section id="process" className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-12">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="font-serif font-semibold text-[38px] md:text-[52px] text-primary leading-tight">
              Purchasing Land from Abroad, <br />
              <span className="text-accent">Made Completely Secure</span>
            </h2>
            <p className="mt-4 text-[16px] text-muted-foreground leading-relaxed">
              We design our diaspora service around transparency, offering legal audits and direct
              live video walks.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                num: "01",
                icon: Globe,
                title: "Choose Plot from the Live Map",
                desc: "Explore real-time property maps. Any green plot is available. Your selection soft-locks instantly during booking.",
              },
              {
                num: "02",
                icon: Video,
                title: "Live HD Virtual Walkthrough",
                desc: "Schedule a live video walk. Our agent visits the exact plot beacon and does a WhatsApp Video or Zoom call with you.",
              },
              {
                num: "03",
                icon: FileCheck,
                title: "Certified Search & Due Diligence",
                desc: "We send you a certified copy of the Land Registry search and deed plan. Verify it independently before paying.",
              },
              {
                num: "04",
                icon: ShieldCheck,
                title: "Pay to Secure Escrow",
                desc: "Submit your payment safely through Paystack. Funds are securely escrowed and protected until contract sign-off.",
              },
              {
                num: "05",
                icon: ArrowRight,
                title: "Digital Agreement & Signing",
                desc: "Sign your land purchase agreement digitally via secure e-signature. CEO signs same day.",
              },
              {
                num: "06",
                icon: Truck,
                title: "Deed Delivered Globally via DHL",
                desc: "Once title transfer is completed at the Registry, your original title deed is couriered straight to you via DHL.",
              },
            ].map((step) => (
              <div
                key={step.num}
                className="relative bg-ivory border border-[#E5E0D8] rounded-xl p-8 hover:border-primary transition-all group"
              >
                <span className="absolute top-6 right-8 font-serif font-bold text-[36px] text-primary/10 group-hover:text-accent/20 transition-all">
                  {step.num}
                </span>
                <step.icon className="text-accent" size={32} />
                <h3 className="mt-6 font-serif font-semibold text-[20px] text-primary">
                  {step.title}
                </h3>
                <p className="mt-3 text-[14px] text-muted-foreground leading-[1.65]">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VIRTUAL TOUR / CALLBACK BOOKING FORM */}
      <section id="booking" className="py-20 bg-stone">
        <div className="mx-auto max-w-7xl px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-[1fr_450px] gap-12">
          <div>
            <span className="text-[11px] font-semibold text-accent uppercase tracking-wider block">
              DIASPORA BOARD
            </span>
            <h2 className="font-serif font-bold text-[38px] md:text-[48px] text-primary mt-2 leading-tight">
              Schedule a Virtual Tour & Inquiry Call
            </h2>
            <p className="mt-4 text-[15px] text-muted-foreground leading-relaxed">
              Fill in the form to coordinate a live video tour of your preferred plot or to schedule
              an appointment with our diaspora support desk. We adapt to your timezone.
            </p>

            <div className="mt-8 space-y-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center shrink-0">
                  <Clock size={20} />
                </div>
                <div>
                  <h4 className="font-serif font-semibold text-[16px] text-primary">
                    Timezone Adaptability
                  </h4>
                  <p className="text-[13px] text-muted-foreground mt-1">
                    We take care of scheduling convenient virtual calls in your local time zone
                    (EST, GMT, PST, etc.).
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center shrink-0">
                  <Video size={20} />
                </div>
                <div>
                  <h4 className="font-serif font-semibold text-[16px] text-primary">
                    Live Video Inspections
                  </h4>
                  <p className="text-[13px] text-muted-foreground mt-1">
                    Get actual visuals of plot beacons, roads, water boreholes, and layout via live
                    WhatsApp Video tour.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h4 className="font-serif font-semibold text-[16px] text-primary">
                    Direct Legal Support
                  </h4>
                  <p className="text-[13px] text-muted-foreground mt-1">
                    Direct access to legal audits, registry search certificates, and deed plans
                    before any purchase.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 p-6 bg-white rounded-xl border border-[#E5E0D8]">
              <h4 className="font-serif font-semibold text-[16px] text-primary">
                Diaspora Liaison Office
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-[13px]">
                <div className="flex items-center gap-2">
                  <PhoneCall size={14} className="text-primary" />
                  <span>+254 799 488 488</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-primary" />
                  <span>diaspora@gatepathrealtors.com</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-xl border border-[#E5E0D8]">
            {success ? (
              <div className="text-center py-12">
                <CheckCircle className="mx-auto text-available animate-bounce" size={56} />
                <h3 className="font-serif font-bold text-[26px] text-primary mt-6">
                  Request Received!
                </h3>
                <p className="text-[14px] text-muted-foreground mt-3 leading-relaxed">
                  Thank you for contacting Gatepath Realtors. Our diaspora desk is reviewing your
                  request and will contact you via your preferred communication channel shortly.
                </p>
                <button
                  onClick={() => setSuccess(false)}
                  className="mt-8 bg-primary text-white font-semibold text-[14px] py-3 px-6 rounded-lg hover:bg-accent transition-all"
                >
                  Book Another Session
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="font-serif font-bold text-[22px] text-primary">
                  Request Live Tour / Callback
                </h3>

                {errorMsg && (
                  <div className="p-3 bg-red-50 text-red-600 text-[13px] rounded-lg border border-red-200">
                    {errorMsg}
                  </div>
                )}

                <div>
                  <label className="text-[12px] font-semibold text-muted-foreground block mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Mary Wanjiku"
                    className="w-full px-3.5 py-2.5 border border-[#D5D0C8] rounded-lg text-[14px] focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[12px] font-semibold text-muted-foreground block mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="mary@gmail.com"
                      className="w-full px-3.5 py-2.5 border border-[#D5D0C8] rounded-lg text-[14px] focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold text-muted-foreground block mb-1">
                      Phone Number (with prefix) *
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 019-2834"
                      className="w-full px-3.5 py-2.5 border border-[#D5D0C8] rounded-lg text-[14px] focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[12px] font-semibold text-muted-foreground block mb-1">
                      Country of Residence *
                    </label>
                    <input
                      type="text"
                      required
                      value={residence}
                      onChange={(e) => setResidence(e.target.value)}
                      placeholder="e.g. United States"
                      className="w-full px-3.5 py-2.5 border border-[#D5D0C8] rounded-lg text-[14px] focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold text-muted-foreground block mb-1">
                      Your Timezone
                    </label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-[#D5D0C8] rounded-lg text-[14px] focus:outline-none focus:border-primary bg-white"
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz.id} value={tz.id}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[12px] font-semibold text-muted-foreground block mb-1">
                    Preferred Contact Channel
                  </label>
                  <select
                    value={commChannel}
                    onChange={(e) => setCommChannel(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-[#D5D0C8] rounded-lg text-[14px] focus:outline-none focus:border-primary bg-white"
                  >
                    {PREFERRED_COMM.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[12px] font-semibold text-muted-foreground block mb-1">
                      Target Budget
                    </label>
                    <select
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-[#D5D0C8] rounded-lg text-[14px] focus:outline-none focus:border-primary bg-white"
                    >
                      {[
                        "Under Ksh 300K",
                        "Ksh 300K - 600K",
                        "Ksh 600K - 1M",
                        "Ksh 1M - 2.5M",
                        "Above Ksh 2.5M",
                      ].map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold text-muted-foreground block mb-1">
                      Preferred Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={preferredDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setPreferredDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-[#D5D0C8] rounded-lg text-[14px] focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[12px] font-semibold text-muted-foreground block mb-1">
                    Specific Requirements or Preferred Phase
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Interested in Baraka Plains Phase 6 commercial plot, want to verify the title deed search."
                    className="w-full px-3.5 py-2.5 border border-[#D5D0C8] rounded-lg text-[14px] focus:outline-none focus:border-primary resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-accent text-white font-semibold text-[15px] py-4 rounded-lg hover:bg-accent-dark transition-all flex items-center justify-center gap-2 mt-4"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Scheduling your request...
                    </>
                  ) : (
                    "Schedule Tour & Callback →"
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* DIASPORA FAQS — hidden until real content exists, no fabricated fallback Q&As */}
      {diasporaFaqs.length > 0 && (
        <section className="py-20 bg-white">
          <div className="mx-auto max-w-7xl px-6 lg:px-12">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <Globe className="text-accent mx-auto" size={36} />
              <h2 className="font-serif font-semibold text-[38px] text-primary mt-4 leading-tight">
                Diaspora Investment FAQs
              </h2>
              <p className="text-[15px] text-muted-foreground mt-2">
                Everything you need to know about purchasing land securely from abroad.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {diasporaFaqs.map((faq) => (
                <div key={faq.id} className="flex gap-4">
                  <HelpCircle className="text-primary shrink-0" size={24} />
                  <div>
                    <h4 className="font-serif font-semibold text-[18px] text-primary">
                      {faq.question}
                    </h4>
                    <p className="text-[14px] text-muted-foreground leading-relaxed mt-2">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
      <WhatsAppButton />
    </div>
  );
}
