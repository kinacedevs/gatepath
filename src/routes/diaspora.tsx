import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import {
  Globe,
  DollarSign,
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
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/diaspora")({
  component: DiasporaPage,
  head: () => ({
    meta: [
      { title: "Diaspora Investment Channel — Gatepath Realtors" },
      {
        name: "description",
        content:
          "Securely purchase land in Kenya from anywhere in the world. Real-time plots, certified land searches, escrow protection, and DHL title deed delivery.",
      },
    ],
  }),
});

const CURRENCY_RATES = {
  USD: 129.5, // 1 USD = 129.5 KES
  GBP: 165.2, // 1 GBP = 165.2 KES
  EUR: 139.8, // 1 EUR = 139.8 KES
  CAD: 94.6,  // 1 CAD = 94.6 KES
  AUD: 85.1,  // 1 AUD = 85.1 KES
  AED: 35.2,  // 1 AED = 35.2 KES
} as const;

type Currency = keyof typeof CURRENCY_RATES;

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

function sanitize(val: string): string {
  return val.replace(/[<>"'&]/g, "").trim();
}

function DiasporaPage() {
  // Exchange calculator states
  const [kesAmount, setKesAmount] = useState<number>(320000);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>("USD");

  // Form states
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

  // Conversion logic
  const convertedAmount = useMemo(() => {
    const rate = CURRENCY_RATES[selectedCurrency];
    return Number((kesAmount / rate).toFixed(2));
  }, [kesAmount, selectedCurrency]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName || !email || !phone || !residence) {
      setErrorMsg("Please fill in all required fields marked with *");
      return;
    }

    setLoading(true);

    try {
      // 1. Insert into inquiries
      const { data: inquiry, error: inquiryErr } = await supabase
        .from("inquiries")
        .insert({
          client_full_name: sanitize(fullName),
          client_email: email.toLowerCase().trim(),
          client_phone: phone.trim(),
          client_postal_address: sanitize(residence),
          heard_from: "Diaspora Portal",
          questions: sanitize(
            `[Diaspora Request] Timezone: ${timezone} | Preferred Channel: ${commChannel} | Budget: ${budget} | Notes: ${notes}`
          ),
          status: "pending",
        })
        .select()
        .single();

      if (inquiryErr || !inquiry) {
        throw new Error(inquiryErr?.message ?? "Failed to save inquiry");
      }

      // 2. Insert corresponding booking for virtual visit
      if (preferredDate) {
        const { error: bookingErr } = await supabase.from("bookings").insert({
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
    <div className="min-h-screen bg-[#F8F4EE]">
      <Navbar />

      {/* HERO SECTION */}
      <section className="relative pt-36 pb-20 bg-[#06243A] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#0A3D62] via-[#06243A] to-[#041521]"></div>
        <div className="relative mx-auto max-w-7xl px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-[1fr_480px] gap-12 items-center">
          <div className="text-white max-w-3xl">
            <span className="inline-flex items-center gap-2 bg-[#E8A020]/20 text-[#E8A020] border border-[#E8A020]/30 font-semibold tracking-wider uppercase text-[12px] px-3.5 py-1.5 rounded-full mb-6">
              <Globe size={14} /> Certified Diaspora Channel
            </span>
            <h1 className="font-serif font-bold text-[46px] md:text-[68px] leading-[1.05] tracking-tight">
              Invest in Kenyan Land, <br className="hidden md:inline" />
              <span className="text-[#E8A020]">With Complete Trust.</span>
            </h1>
            <p className="mt-6 text-[18px] md:text-[20px] text-white/75 font-light leading-relaxed max-w-2xl">
              We eliminate the middlemen, the family run-arounds, and the legal uncertainties. Secure title deeds delivered straight to your doorstep worldwide.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="#process"
                className="bg-accent text-white font-semibold text-[15px] px-8 py-3.5 rounded-md hover:bg-[#C8861A] transition-all"
              >
                Explore Secure Process
              </a>
              <a
                href="#booking"
                className="bg-white/10 border border-white/20 text-white font-semibold text-[15px] px-8 py-3.5 rounded-md hover:bg-white/20 transition-all"
              >
                Schedule Virtual Tour
              </a>
            </div>
          </div>

          {/* QUICK CALCULATOR */}
          <div className="bg-white rounded-2xl p-8 shadow-2xl border border-white/10 relative overflow-hidden">
            <h3 className="font-serif font-bold text-[24px] text-primary">Live Currency Estimator</h3>
            <p className="text-[13px] text-muted-foreground mt-1">Convert KES pricing instantly to your local currency.</p>

            <div className="mt-6 space-y-4">
              <div>
                <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">KES Amount</label>
                <div className="relative mt-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-primary">KES</span>
                  <input
                    type="number"
                    value={kesAmount}
                    onChange={(e) => setKesAmount(Number(e.target.value))}
                    className="w-full pl-14 pr-4 py-3 border border-[#D5D0C8] rounded-lg focus:border-primary focus:outline-none font-numbers font-bold text-[18px]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">Convert To</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {(Object.keys(CURRENCY_RATES) as Currency[]).map((cur) => (
                    <button
                      key={cur}
                      onClick={() => setSelectedCurrency(cur)}
                      className={`py-2 px-3 text-[13px] font-semibold border rounded-lg transition-all ${
                        selectedCurrency === cur
                          ? "bg-[#0B7FC7] border-[#0B7FC7] text-white"
                          : "bg-white border-[#D5D0C8] text-foreground hover:bg-[#F8F4EE]"
                      }`}
                    >
                      {cur}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 p-4 bg-[#F8F4EE] rounded-lg border border-[#E5E0D8]">
                <div className="text-[12px] text-muted-foreground uppercase tracking-wider">Estimated Amount</div>
                <div className="font-numbers font-bold text-[32px] text-primary flex items-baseline gap-1 mt-1">
                  <span className="text-[20px] font-semibold">{selectedCurrency}</span>
                  {convertedAmount.toLocaleString()}
                </div>
                <div className="text-[11px] text-muted-foreground mt-2 italic">
                  *Based on a fixed rate of 1 {selectedCurrency} = {CURRENCY_RATES[selectedCurrency]} KES. actual bank transaction rates will apply.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECURITY ESCROW BANNER */}
      <section className="bg-accent py-5">
        <div className="mx-auto max-w-7xl px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-4 text-white">
          <div className="flex items-center gap-3 text-center md:text-left">
            <ShieldCheck size={32} className="shrink-0" />
            <div>
              <h4 className="font-semibold text-[15px]">100% Escrow and Legal Protection for Diaspora Buyers</h4>
              <p className="text-[12px] text-white/80 mt-0.5">Title deeds are verified directly by the Land Registry before you complete payment.</p>
            </div>
          </div>
          <span className="bg-white/20 text-[12px] font-semibold uppercase tracking-wider px-3.5 py-1.5 rounded-full border border-white/20">
            Escrow Backed
          </span>
        </div>
      </section>

      {/* THE 6-STEP SECURE PURCHASE TIMELINE */}
      <section id="process" className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-12">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="font-serif font-semibold text-[38px] md:text-[52px] text-primary leading-tight">
              Purchasing Land from Abroad, <br />
              <span className="text-accent">Made Completely Secure</span>
            </h2>
            <p className="mt-4 text-[16px] text-muted-foreground leading-relaxed">
              We design our diaspora service around transparency, offering legal audits and direct live video walks.
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
            ].map((step, idx) => (
              <div key={idx} className="relative bg-[#F8F4EE] border border-[#E5E0D8] rounded-xl p-8 hover:border-primary transition-all group">
                <span className="absolute top-6 right-8 font-serif font-bold text-[36px] text-primary/10 group-hover:text-accent/20 transition-all">
                  {step.num}
                </span>
                <step.icon className="text-accent" size={32} />
                <h3 className="mt-6 font-serif font-semibold text-[20px] text-primary">{step.title}</h3>
                <p className="mt-3 text-[14px] text-muted-foreground leading-[1.65]">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DIASPORA BOOKING FORM & TOUR SCHEDULER */}
      <section id="booking" className="py-20 bg-[#F0F4F8]">
        <div className="mx-auto max-w-7xl px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-[1fr_450px] gap-12">
          {/* LEFT SIDEBAR / EXPLANATION */}
          <div>
            <span className="text-[11px] font-semibold text-accent uppercase tracking-wider block">DIASPORA BOARD</span>
            <h2 className="font-serif font-bold text-[38px] md:text-[48px] text-primary mt-2 leading-tight">
              Schedule a Virtual Tour & Inquiry Call
            </h2>
            <p className="mt-4 text-[15px] text-muted-foreground leading-relaxed">
              Fill in the form to coordinate a live video tour of your preferred plot or to schedule an appointment with our diaspora support desk. We adapt to your timezone.
            </p>

            <div className="mt-8 space-y-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-[#0B7FC7]/10 text-[#0B7FC7] rounded-full flex items-center justify-center shrink-0">
                  <Clock size={20} />
                </div>
                <div>
                  <h4 className="font-serif font-semibold text-[16px] text-primary">Timezone Adaptability</h4>
                  <p className="text-[13px] text-muted-foreground mt-1">We take care of scheduling convenient virtual calls in your local time zone (EST, GMT, PST, etc.).</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 bg-[#0B7FC7]/10 text-[#0B7FC7] rounded-full flex items-center justify-center shrink-0">
                  <Video size={20} />
                </div>
                <div>
                  <h4 className="font-serif font-semibold text-[16px] text-primary">Live Video Inspections</h4>
                  <p className="text-[13px] text-muted-foreground mt-1">Get actual visuals of plot beacons, roads, water boreholes, and layout via live WhatsApp Video tour.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 bg-[#0B7FC7]/10 text-[#0B7FC7] rounded-full flex items-center justify-center shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h4 className="font-serif font-semibold text-[16px] text-primary">Direct Legal Support</h4>
                  <p className="text-[13px] text-muted-foreground mt-1">Direct access to legal audits, registry search certificates, and deed plans before any purchase.</p>
                </div>
              </div>
            </div>

            <div className="mt-8 p-6 bg-white rounded-xl border border-[#E5E0D8]">
              <h4 className="font-serif font-semibold text-[16px] text-primary">Diaspora Liaison Office</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-[13px]">
                <div className="flex items-center gap-2">
                  <PhoneCall size={14} className="text-[#0B7FC7]" />
                  <span>+254 799 488 488</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-[#0B7FC7]" />
                  <span>diaspora@gatepathrealtors.com</span>
                </div>
              </div>
            </div>
          </div>

          {/* MAIN FORM CARD */}
          <div className="bg-white rounded-2xl p-8 shadow-xl border border-[#E5E0D8]">
            {success ? (
              <div className="text-center py-12">
                <CheckCircle className="mx-auto text-green-500 animate-bounce" size={56} />
                <h3 className="font-serif font-bold text-[26px] text-primary mt-6">Request Received!</h3>
                <p className="text-[14px] text-muted-foreground mt-3 leading-relaxed">
                  Thank you for contacting Gatepath Realtors. Our diaspora desk is reviewing your request and will contact you via your preferred communication channel shortly.
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
                <h3 className="font-serif font-bold text-[22px] text-primary">Request Live Tour / Callback</h3>

                {errorMsg && (
                  <div className="p-3 bg-red-50 text-red-600 text-[13px] rounded-lg border border-red-200">
                    {errorMsg}
                  </div>
                )}

                <div>
                  <label className="text-[12px] font-semibold text-muted-foreground block mb-1">Full Name *</label>
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
                    <label className="text-[12px] font-semibold text-muted-foreground block mb-1">Email Address *</label>
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
                    <label className="text-[12px] font-semibold text-muted-foreground block mb-1">Phone Number (with prefix) *</label>
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
                    <label className="text-[12px] font-semibold text-muted-foreground block mb-1">Country of Residence *</label>
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
                    <label className="text-[12px] font-semibold text-muted-foreground block mb-1">Your Timezone</label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-[#D5D0C8] rounded-lg text-[14px] focus:outline-none focus:border-primary bg-white"
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz.id} value={tz.id}>{tz.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[12px] font-semibold text-muted-foreground block mb-1">Preferred Contact Channel</label>
                  <select
                    value={commChannel}
                    onChange={(e) => setCommChannel(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-[#D5D0C8] rounded-lg text-[14px] focus:outline-none focus:border-primary bg-white"
                  >
                    {PREFERRED_COMM.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[12px] font-semibold text-muted-foreground block mb-1">Target Budget</label>
                    <select
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-[#D5D0C8] rounded-lg text-[14px] focus:outline-none focus:border-primary bg-white"
                    >
                      {["Under Ksh 300K", "Ksh 300K - 600K", "Ksh 600K - 1M", "Ksh 1M - 2.5M", "Above Ksh 2.5M"].map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold text-muted-foreground block mb-1">Preferred Date (Optional)</label>
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
                  <label className="text-[12px] font-semibold text-muted-foreground block mb-1">Specific Requirements or Preferred Phase</label>
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
                  className="w-full bg-[#E8A020] text-white font-semibold text-[15px] py-4 rounded-lg hover:bg-[#C8861A] transition-all flex items-center justify-center gap-2 mt-4"
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

      {/* DIASPORA FAQS */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-12">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Globe className="text-accent mx-auto" size={36} />
            <h2 className="font-serif font-semibold text-[38px] text-primary mt-4 leading-tight">
              Diaspora Investment FAQs
            </h2>
            <p className="text-[15px] text-muted-foreground mt-2">Everything you need to know about purchasing land securely from abroad.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {[
              {
                q: "Do I need to travel to Kenya to purchase or receive my title deed?",
                a: "No. The entire process is designed for remote completion. You can browse live plot maps, schedule virtual walkthroughs, review certified searches, sign agreements digitally via secure e-signatures, and have your original registered title deed shipped directly to your address globally via DHL.",
              },
              {
                q: "How can I verify that the land is genuine before making a payment?",
                a: "Once you reserve a plot, Gatepath Realtors provides a certified copy of the Land Search Certificate and the Registry Deed Plan. You can verify these documents independently at the Land Registry, through legal counsel in Kenya, or through Ardhisasa (Ministry of Lands portal).",
              },
              {
                q: "Can I make installment payments from abroad?",
                a: "Yes. We support installment plans (Lipa Pole Pole) spanning up to 12 months for diaspora buyers. Deposits and monthly installments can be paid securely using cards or international bank transfers via Paystack.",
              },
              {
                q: "What legal protection do I have during the transaction?",
                a: "All transactions are bound by a legally binding Land Purchase Agreement vetted by our legal department. Your deposit is secured in an escrow/escrow-backed account until all transfers are successfully registered under your name at the Land Office.",
              },
            ].map((faq, idx) => (
              <div key={idx} className="flex gap-4">
                <HelpCircle className="text-[#0B7FC7] shrink-0" size={24} />
                <div>
                  <h4 className="font-serif font-semibold text-[18px] text-primary">{faq.q}</h4>
                  <p className="text-[14px] text-muted-foreground leading-relaxed mt-2">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
      <WhatsAppButton />
    </div>
  );
}
