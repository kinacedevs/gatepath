import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { supabase } from "@/lib/supabase";
import { Handshake, Award, Users, Share2, Clipboard, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/partner")({
  component: PartnerPage,
  head: () => ({
    meta: [
      { title: "Become a Partner — Gatepath Realtors" },
      {
        name: "description",
        content:
          "Join Gatepath Realtors affiliate program. Recommend verified properties and earn commissions.",
      },
    ],
  }),
});

function PartnerPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    code: "",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const referralLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/?ref=${formData.code.toUpperCase().trim()}`
      : `https://gatepathrealtors.com?ref=${formData.code.toUpperCase().trim()}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanCode = formData.code.toUpperCase().replace(/\s/g, "");

    // Insert into Supabase affiliates table
    const { error: insertErr } = await (supabase as any).from("affiliates").insert({
      partner_name: formData.name,
      email: formData.email.toLowerCase().trim(),
      phone: formData.phone.replace(/\s/g, ""),
      referral_code: cleanCode,
      commission_rate: 0.05, // 5% Standard Commission
    });

    setLoading(false);

    if (insertErr) {
      console.error("[Gatepath Affiliates Error]", insertErr.message);
      if (insertErr.message.includes("unique")) {
        setError(
          "This referral code, email or phone is already registered. Please choose another.",
        );
      } else {
        setError("Registration failed. Please verify your details or contact support.");
      }
      return;
    }

    setSuccess(true);
  };

  return (
    <div className="min-h-screen bg-[#F8F4EE]">
      <Navbar />

      <div className="pt-20">
        {/* Hero Section */}
        <section className="bg-primary text-white py-20 px-6 text-center">
          <div className="mx-auto max-w-4xl">
            <span className="inline-flex items-center gap-2 bg-[#E8A020]/20 text-[#E8A020] border border-[#E8A020]/30 font-semibold tracking-wider uppercase text-[12px] px-3.5 py-1.5 rounded-full mb-4">
              <Handshake size={14} /> Partner Channel
            </span>
            <h1 className="font-serif font-bold text-[38px] md:text-[56px] leading-tight">
              Earn Commissions with <span className="text-[#E8A020]">Gatepath</span>
            </h1>
            <p className="mt-4 text-white/80 text-[16px] md:text-[18px] max-w-2xl mx-auto font-light leading-relaxed">
              Recommend 100% verified, registry-checked plots to your network or diaspora clients.
              Earn up to **5% commission** on closed sales.
            </p>
          </div>
        </section>

        {/* Info Grid */}
        <section className="py-16 px-6 mx-auto max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white p-8 rounded-xl border border-[#E5E0D8] shadow-sm text-center">
              <Award className="mx-auto text-[#0B7FC7] mb-4" size={36} />
              <h3 className="font-serif font-semibold text-[18px] text-[#1C1C1C] mb-2">
                Generous Commissions
              </h3>
              <p className="text-[14px] text-muted-foreground font-light">
                Earn 5% payout on any successfully closed cash or installment plot reservations
                referred by you.
              </p>
            </div>
            <div className="bg-white p-8 rounded-xl border border-[#E5E0D8] shadow-sm text-center">
              <Users className="mx-auto text-[#0B7FC7] mb-4" size={36} />
              <h3 className="font-serif font-semibold text-[18px] text-[#1C1C1C] mb-2">
                Registry Search Trust
              </h3>
              <p className="text-[14px] text-muted-foreground font-light">
                Every title is verified by lands registry beforehand, ensuring your clients are safe
                from real estate fraud.
              </p>
            </div>
            <div className="bg-white p-8 rounded-xl border border-[#E5E0D8] shadow-sm text-center">
              <Share2 className="mx-auto text-[#0B7FC7] mb-4" size={36} />
              <h3 className="font-serif font-semibold text-[18px] text-[#1C1C1C] mb-2">
                Automated Link Track
              </h3>
              <p className="text-[14px] text-muted-foreground font-light">
                Generate your partner link, share it on social media or WhatsApp, and let our
                database automatically log your conversions.
              </p>
            </div>
          </div>

          {/* Registration Form / Success */}
          <div className="mx-auto max-w-2xl bg-white rounded-2xl border border-[#E5E0D8] p-8 md:p-12 shadow-md">
            {success ? (
              <div className="text-center animate-in fade-in duration-300">
                <CheckCircle2 className="mx-auto text-[#22C55E] mb-6" size={64} />
                <h2 className="font-serif font-bold text-[28px] text-[#1C1C1C] mb-3">
                  Partner Registered!
                </h2>
                <p className="text-muted-foreground text-[15px] font-light max-w-md mx-auto mb-8">
                  Your affiliate account has been created. Use the link below to refer clients and
                  automatically earn commissions.
                </p>

                <div className="bg-[#F8F4EE] rounded-lg p-5 border border-[#E5E0D8] text-left">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                    Your Referral Link
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={referralLink}
                      className="bg-white border border-[#D5D0C8] rounded px-3 py-2 text-[13px] font-numbers font-medium w-full text-[#1C1C1C] outline-none"
                    />
                    <button
                      onClick={handleCopy}
                      className="bg-[#0B7FC7] text-white px-4 py-2 rounded font-semibold text-sm hover:bg-[#09669E] shrink-0 flex items-center gap-1.5 transition-colors"
                    >
                      <Clipboard size={16} />
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>

                <div className="mt-8 flex gap-4 justify-center">
                  <Link
                    to="/portal"
                    className="bg-[#0B7FC7] text-white font-semibold text-[14px] px-8 py-3 rounded-lg hover:bg-[#09669E] transition-all shadow-sm"
                  >
                    Go to Client Portal
                  </Link>
                  <button
                    onClick={() => setSuccess(false)}
                    className="border border-[#D5D0C8] text-[#5A5A5A] font-semibold text-[14px] px-6 py-3 rounded-lg hover:bg-[#F8F4EE] transition-all"
                  >
                    Register Another
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <h2 className="font-serif font-bold text-[24px] text-primary text-center pb-4 border-b border-[#E5E0D8]">
                  Partner Registration Form
                </h2>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg font-medium">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-[#1C1C1C] mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter your official name"
                    className="w-full border border-[#D5D0C8] rounded-lg p-3 text-sm outline-none focus:border-[#0B7FC7]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1C1C1C] mb-1.5">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="name@example.com"
                      className="w-full border border-[#D5D0C8] rounded-lg p-3 text-sm outline-none focus:border-[#0B7FC7]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1C1C1C] mb-1.5">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="07XX XXX XXX"
                      className="w-full border border-[#D5D0C8] rounded-lg p-3 text-sm outline-none focus:border-[#0B7FC7]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#1C1C1C] mb-1.5">
                    Preferred Referral Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        code: e.target.value.toUpperCase().replace(/\s/g, ""),
                      })
                    }
                    placeholder="e.g. JOE_AGENTS"
                    className="w-full border border-[#D5D0C8] rounded-lg p-3 text-sm font-medium uppercase tracking-wider outline-none focus:border-[#0B7FC7]"
                  />
                  <span className="text-[11px] text-muted-foreground mt-1.5 block leading-normal">
                    This code will be appended to your links (e.g., `?ref=CODE`). Choose a short
                    alphanumeric string.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#E8A020] text-white font-bold text-base py-4 rounded-lg hover:bg-[#C8861A] transition-colors disabled:bg-gray-300"
                >
                  {loading ? "Registering Partner..." : "Register & Get Link →"}
                </button>
              </form>
            )}
          </div>
        </section>
      </div>

      <Footer />
      <WhatsAppButton />
    </div>
  );
}
