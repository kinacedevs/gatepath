/**
 * Gatepath Realtors — Sales Inquiry / Booking Form
 * Step 1 of 3. Matches the real Gatepath Sales Booking Form exactly.
 * Writes to Supabase inquiries table on submission.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { InquiryStepper } from "@/components/InquiryStepper";
import { PlotSummaryCard } from "@/components/inquiry/PlotSummaryCard";
import { useInquiry } from "@/context/InquiryContext";
import { supabase } from "@/lib/supabase";

type Search = {
  phase?: string;
  phaseName?: string;
  phaseNumber?: string;
  plotId?: string;
  plotNumber?: string;
  size?: string;
  price?: string;
  location?: string;
  intent?: "free_visit" | "reserve" | "deposit";
};

export const Route = createFileRoute("/inquire")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    phase: s.phase !== undefined ? String(s.phase) : undefined,
    phaseName: s.phaseName !== undefined ? String(s.phaseName) : undefined,
    phaseNumber: s.phaseNumber !== undefined ? String(s.phaseNumber) : undefined,
    plotId: s.plotId !== undefined ? String(s.plotId) : undefined,
    plotNumber: s.plotNumber !== undefined ? String(s.plotNumber) : undefined,
    size: s.size !== undefined ? String(s.size) : undefined,
    price: s.price !== undefined ? String(s.price) : undefined,
    location: s.location !== undefined ? String(s.location) : undefined,
    intent: (s.intent === "free_visit" || s.intent === "reserve" || s.intent === "deposit") ? s.intent : undefined,
  }),
  component: InquiryPage,
  head: () => ({
    meta: [
      { title: "Sales Booking Form — Gatepath Realtors" },
      { name: "description", content: "Fill in your details to secure your plot. Quick, secure, and binding." },
    ],
  }),
});

const HEARD_FROM = [
  "Facebook", "Instagram", "TikTok", "WhatsApp Group",
  "Friend / Family Referral", "Google Search", "Physical Signage",
  "Email Newsletter", "YouTube", "Radio / TV", "Other",
];

const RELATIONSHIPS = [
  "Spouse / Partner", "Parent", "Child", "Sibling",
  "Relative", "Friend", "Colleague", "Other",
];

function sanitize(val: string): string {
  return val.replace(/[<>"'&]/g, "").trim();
}

function validate(form: ReturnType<typeof useInquiry>["form"]) {
  const errs: Record<string, string> = {};

  // Full name
  const name = sanitize(form.fullName);
  if (name.length < 3) errs.fullName = "Enter your full name (minimum 3 characters)";
  else if (!/^[A-Za-z\s'-]+$/.test(name)) errs.fullName = "Name should contain letters only";

  // Phone — Kenyan local OR international
  const cleanPhone = form.phone.replace(/[\s-]/g, "");
  const kenyanLocal = /^(07|01)\d{8}$/.test(cleanPhone);
  const intlFormat = /^\+\d{7,15}$/.test(cleanPhone.startsWith("00") ? "+" + cleanPhone.slice(2) : cleanPhone);
  if (!kenyanLocal && !intlFormat) errs.phone = "Enter a valid phone number (Kenyan: 07XX... or international: +44...)";

  // Email
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Enter a valid email address";

  // ID / Passport
  const id = form.idNumber.trim().toUpperCase();
  const kenyanId = /^\d{7,8}$/.test(id);
  const passport = /^[A-Z]{1,2}\d{6,7}$/.test(id);
  if (!kenyanId && !passport) errs.idNumber = "Enter a valid Kenyan ID (7–8 digits) or Passport (e.g. A1234567)";

  // Terms of payment (only required for deposits/reservations)
  if (form.intent !== "free_visit" && !form.termsOfPayment) {
    errs.termsOfPayment = "Please select Cash or Instalment";
  }

  // How did you hear about us
  if (!form.heardFrom) errs.heardFrom = "Please tell us how you found us";

  return errs;
}

function InquiryPage() {
  const search = Route.useSearch();
  const { form, setForm } = useInquiry();
  const navigate = useNavigate();
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [bannerError, setBannerError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  // Seed form from URL params on first load
  useEffect(() => {
    if (search.phase || search.plotNumber) {
      const intentVal = search.intent || "free_visit";
      setForm({
        phaseSlug: search.phase || "",
        phaseName: search.phaseName || "",
        phaseNumber: search.phaseNumber || "",
        plotId: search.plotId || "",
        plotNumber: search.plotNumber || "",
        plotSize: search.size || "",
        plotPrice: Number(search.price) || 0,
        plotLocation: search.location || "",
        price: Number(search.price) || 0,
        intent: intentVal,
        reservePlot: intentVal === "reserve",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const errors = validate(form);
  const showErr = (key: string) => (touched[key] || submitted) && errors[key];

  const noPlot = !form.plotNumber && !search.plotNumber;

  const inp = (key: string): React.CSSProperties => ({
    width: "100%",
    padding: "11px 14px",
    border: `1.5px solid ${showErr(key) ? "#EF4444" : touched[key] && !errors[key] ? "#22C55E" : "#D5D0C8"}`,
    borderRadius: 8,
    fontFamily: "Inter, sans-serif",
    fontSize: 14,
    color: "#1C1C1C",
    background: "#FFFFFF",
    outline: "none",
    transition: "border-color 0.2s ease",
    boxSizing: "border-box",
  });

  const label: React.CSSProperties = {
    display: "block",
    fontFamily: "Inter, sans-serif",
    fontSize: 13,
    fontWeight: 500,
    color: "#1C1C1C",
    marginBottom: 5,
  };

  const sectionHead = (text: string) => (
    <div style={{
      fontFamily: "Montserrat, sans-serif",
      fontWeight: 700,
      fontSize: 11,
      color: "#FFFFFF",
      letterSpacing: "0.22em",
      background: "#0B7FC7",
      padding: "8px 16px",
      borderRadius: 4,
      marginBottom: 18,
      marginTop: 8,
    }}>
      {text}
    </div>
  );

  const blur = (k: string) => () => setTouched((t) => ({ ...t, [k]: true }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setDbError(null);

    if (Object.keys(errors).length > 0) {
      setBannerError(true);
      const firstKey = Object.keys(errors)[0];
      document.querySelector(`[name="${firstKey}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setBannerError(false);
    setLoading(true);

    // Calculate payment figures
    const cashPrice = form.plotPrice;
    const installmentPrice = cashPrice * 1.1; // 10% markup for installments if no DB value
    const finalPrice = form.termsOfPayment === "cash" ? cashPrice : installmentPrice;
    const deposit = Math.round(finalPrice * 0.3);
    const balance = finalPrice - deposit - (form.discount || 0);
    const monthly = form.paymentPeriodMonths > 0 ? Math.round(balance / form.paymentPeriodMonths) : 0;

    // Update form with calculated values
    setForm({ deposit, balance, monthlyPayment: monthly, price: finalPrice });

    // Write to Supabase
    const { data: insertedInq, error: insertErr } = await supabase
      .from("inquiries")
      .insert({
        phase_name: sanitize(form.phaseName),
        phase_slug: form.phaseSlug,
        plot_number_ref: form.plotNumber ? parseInt(form.plotNumber) : null,
        plot_size: form.plotSize,
        plot_price: form.plotPrice,
        plot_location: sanitize(form.plotLocation),
        project_name: sanitize(form.phaseName),
        booking_date: new Date().toISOString().split("T")[0],
        terms_of_payment: form.intent === "free_visit" ? null : (form.termsOfPayment || "cash") as "cash" | "installment",
        price: form.intent === "free_visit" ? form.plotPrice : finalPrice,
        discount: form.intent === "free_visit" ? 0 : (form.discount || 0),
        deposit: form.intent === "free_visit" ? 0 : deposit,
        balance: form.intent === "free_visit" ? form.plotPrice : balance,
        payment_period_months: form.intent === "free_visit" ? null : form.paymentPeriodMonths,
        monthly_payment: form.intent === "free_visit" ? 0 : monthly,
        client_full_name: sanitize(form.fullName),
        client_dob: form.intent === "free_visit" ? null : (form.dateOfBirth || null),
        client_phone: form.phone.replace(/\s/g, ""),
        client_postal_address: form.intent === "free_visit" ? null : (sanitize(form.postalAddress) || null),
        client_email: form.email.toLowerCase().trim(),
        client_kra_pin: form.intent === "free_visit" ? null : (sanitize(form.kraPin) || null),
        client_id_passport: sanitize(form.idNumber).toUpperCase(),
        client_occupation: form.intent === "free_visit" ? null : (sanitize(form.occupation) || null),
        kin_full_name: form.intent === "free_visit" ? null : (sanitize(form.kinFullName) || null),
        kin_phone: form.intent === "free_visit" ? null : (form.kinPhone || null),
        kin_dob: form.intent === "free_visit" ? null : (form.kinDob || null),
        kin_relationship: form.intent === "free_visit" ? null : (form.kinRelationship || null),
        kin_id_passport: form.intent === "free_visit" ? null : (sanitize(form.kinIdPassport) || null),
        heard_from: form.heardFrom,
        payment_preference: form.intent, // Set intent ('free_visit', 'reserve', 'deposit') as payment preference
        location_preference: sanitize(form.locationPreference),
        questions: sanitize(form.questions),
        status: "pending",
      })
      .select()
      .single();

    setLoading(false);

    if (insertErr) {
      console.error("[Gatepath] Inquiry insert error:", insertErr.message);
      setDbError("We couldn't save your inquiry. Please try again or WhatsApp us directly.");
      return;
    }

    if (insertedInq) {
      setForm({ inquiryId: insertedInq.id });
    }

    navigate({ to: "/book-visit" });
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F8F4EE" }}>
      <Navbar />
      <div className="pt-20">
        <InquiryStepper currentStep={1} />

        {/* Blue hero strip */}
        <div style={{ background: "#0B7FC7", padding: "32px 24px" }}>
          <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-center">
            <div>
              <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 600, fontSize: 11, color: "#E8A020", letterSpacing: "0.25em" }}>
                STEP 1 OF 3 — SALES BOOKING FORM
              </div>
              <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: "clamp(28px, 5vw, 44px)", color: "#FFFFFF", marginTop: 8, lineHeight: 1.1 }}>
                Secure Your Plot Today
              </h1>
              <p style={{ fontFamily: "Inter, sans-serif", fontWeight: 300, fontSize: 16, color: "rgba(255,255,255,0.75)", marginTop: 10, maxWidth: 560 }}>
                Complete this form accurately. All details go into your official purchase agreement.
              </p>
            </div>
            <PlotSummaryCard />
          </div>
        </div>

        {/* Body */}
        <div className="mx-auto" style={{ maxWidth: 1160, padding: "40px 24px" }}>

          {/* No plot selected warning */}
          {noPlot && (
            <div className="mb-6" style={{ background: "#FEF3C7", border: "1px solid #F59E0B", borderRadius: 8, padding: "14px 18px" }}>
              <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, color: "#92400E" }}>
                No plot selected yet.
              </div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#92400E", marginTop: 4 }}>
                Go back and choose a plot from the phase map first.{" "}
                <a href="/properties" style={{ color: "#92400E", textDecoration: "underline", fontWeight: 600 }}>
                  ← Browse Properties
                </a>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">

            {/* ── MAIN FORM ── */}
            <form
              onSubmit={handleSubmit}
              noValidate
              style={{
                background: "#FFFFFF",
                borderRadius: 12,
                padding: "36px 28px",
                boxShadow: "0 4px 28px rgba(11,127,199,0.09)",
                border: "1px solid #E5E0D8",
              }}
            >
              {/* Error banner */}
              {(bannerError || dbError) && (
                <div className="mb-5" style={{ background: "#FEE2E2", border: "1px solid #EF4444", borderRadius: 6, padding: "12px 16px", fontFamily: "Inter, sans-serif", fontWeight: 500, fontSize: 14, color: "#991B1B" }}>
                  {dbError || "Please fix the highlighted fields before continuing."}
                </div>
              )}

              {/* Intent Toggle Banner */}
              <div className="mb-8 p-5 bg-[#EFF6FF] border border-[#0B7FC7]/20 rounded-xl flex items-start gap-3.5">
                <input
                  type="checkbox"
                  id="reservePlotToggle"
                  checked={form.intent !== "free_visit"}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setForm({
                      intent: checked ? "reserve" : "free_visit",
                      reservePlot: checked
                    });
                  }}
                  style={{ width: 20, height: 20, cursor: "pointer", marginTop: 2, accentColor: "#0B7FC7" }}
                />
                <div>
                  <label htmlFor="reservePlotToggle" style={{ fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 14, color: "#0B7FC7", cursor: "pointer" }}>
                    Reserve plot instead (Ksh 10,000 hold fee)
                  </label>
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#5A5A5A", margin: "4px 0 0 0", lineHeight: 1.5 }}>
                    Secures this plot for 14 days and prepares the official purchase agreement. This requires additional details (Next of Kin, KRA PIN).
                  </p>
                </div>
              </div>

              {/* ─────────────────────────────────────────────── */}
              {/* SECTION 1: PLOT DETAILS (pre-filled, read-only) */}
              {/* ─────────────────────────────────────────────── */}
              {sectionHead("PLOT DETAILS")}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {[
                  ["Project Name", form.phaseName || "—"],
                  ["Plot No.", form.plotNumber ? `Plot #${form.plotNumber}` : "—"],
                  ["Size", form.plotSize || "—"],
                  ["Location", form.plotLocation || "—"],
                  ["Price", form.plotPrice ? `Ksh ${form.plotPrice.toLocaleString()}` : "—"],
                  ["Status", "Available ✓"],
                ].map(([l, v]) => (
                  <div key={l} style={{ background: "#F5F2EE", border: "1px solid #E5E0D8", borderRadius: 7, padding: "11px 14px" }}>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>{l}</div>
                    <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, color: l === "Status" ? "#22C55E" : "#0B7FC7" }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={label}>
                  Date of Booking
                </label>
                <input
                  readOnly
                  value={new Date().toLocaleDateString("en-KE", { day: "2-digit", month: "long", year: "numeric" })}
                  style={{ ...inp("bookingDate"), background: "#F5F2EE", color: "#5A5A5A" }}
                />
              </div>
              <button
                type="button"
                onClick={() => window.history.back()}
                style={{ background: "none", border: "none", padding: 0, fontFamily: "Inter, sans-serif", fontSize: 13, color: "#E8A020", cursor: "pointer", textDecoration: "underline", marginBottom: 24 }}
              >
                Wrong plot? ← Go back and reselect
              </button>

              {/* ─────────────────────────────────────────────── */}
              {/* SECTION 2: SPECIAL INSTRUCTIONS / PAYMENT TERMS */}
              {/* ─────────────────────────────────────────────── */}
              {form.intent !== "free_visit" && (
                <>
                  <div style={{ height: 1, background: "#E5E0D8", margin: "4px 0 24px" }} />
                  {sectionHead("SPECIAL INSTRUCTIONS")}

                  {/* Terms of Payment */}
                  <div className="mb-5">
                    <label style={label}>Terms of Payment *</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: "cash" as const, icon: "💵", label: "Cash", sub: `Ksh ${form.plotPrice.toLocaleString()} — full payment` },
                        { id: "installment" as const, icon: "📅", label: "Instalments (Lipa Pole Pole)", sub: "Spread over 6 months" },
                      ].map((opt) => {
                        const sel = form.termsOfPayment === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setForm({ termsOfPayment: opt.id });
                              setTouched((t) => ({ ...t, termsOfPayment: true }));
                            }}
                            style={{
                              textAlign: "left",
                              border: `1.5px solid ${sel ? "#0B7FC7" : "#D5D0C8"}`,
                              borderLeft: sel ? "4px solid #E8A020" : "1.5px solid #D5D0C8",
                              borderRadius: 8,
                              padding: "14px 14px",
                              background: sel ? "#EFF6FF" : "#FFFFFF",
                              cursor: "pointer",
                            }}
                          >
                            <div style={{ fontSize: 20, marginBottom: 4 }}>{opt.icon}</div>
                            <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, color: "#0B7FC7" }}>{opt.label}</div>
                            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#5A5A5A", marginTop: 2 }}>{opt.sub}</div>
                          </button>
                        );
                      })}
                    </div>
                    {showErr("termsOfPayment") && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#EF4444", marginTop: 6 }}>{errors.termsOfPayment}</div>}
                  </div>

                  {/* Payment period */}
                  {form.termsOfPayment === "installment" && (
                    <div className="mb-5">
                      <label style={label}>Payment Period (months) *</label>
                      <select
                        value={form.paymentPeriodMonths}
                        onChange={(e) => setForm({ paymentPeriodMonths: Number(e.target.value) })}
                        style={inp("paymentPeriodMonths")}
                      >
                        {[3, 6, 12, 18, 24].map((m) => (
                          <option key={m} value={m}>{m} months</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Discount (optional, CEO fills) */}
                  <div className="mb-5">
                    <label style={label}>Discount Applied (if any — Ksh)</label>
                    <input
                      type="number"
                      min={0}
                      value={form.discount || ""}
                      placeholder="0"
                      onChange={(e) => setForm({ discount: Number(e.target.value) })}
                      style={inp("discount")}
                    />
                  </div>
                </>
              )}

              <div style={{ height: 1, background: "#E5E0D8", margin: "4px 0 24px" }} />

              {/* ─────────────────────────────────────────────── */}
              {/* SECTION 3: CLIENT DETAILS                       */}
              {/* ─────────────────────────────────────────────── */}
              {sectionHead("CLIENT DETAILS")}

              {/* Full Name */}
              <div className="mb-5">
                <label style={label}>Full Name *</label>
                <input
                  name="fullName"
                  type="text"
                  value={form.fullName}
                  placeholder="e.g. Mary Wanjiku Njoroge"
                  onChange={(e) => setForm({ fullName: e.target.value })}
                  onBlur={blur("fullName")}
                  style={inp("fullName")}
                />
                {showErr("fullName") && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#EF4444", marginTop: 4 }}>{errors.fullName}</div>}
              </div>

              {/* Date of Birth + Phone — conditional DOB */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                {form.intent !== "free_visit" ? (
                  <div>
                    <label style={label}>Date of Birth *</label>
                    <input
                      name="dateOfBirth"
                      type="date"
                      value={form.dateOfBirth}
                      max={new Date(Date.now() - 18 * 365.25 * 86400000).toISOString().split("T")[0]}
                      onChange={(e) => setForm({ dateOfBirth: e.target.value })}
                      onBlur={blur("dateOfBirth")}
                      style={inp("dateOfBirth")}
                    />
                  </div>
                ) : (
                  <div>
                    <label style={label}>Date of Birth (Optional)</label>
                    <input
                      name="dateOfBirth"
                      type="date"
                      value={form.dateOfBirth}
                      onChange={(e) => setForm({ dateOfBirth: e.target.value })}
                      style={inp("dateOfBirth")}
                    />
                  </div>
                )}
                <div>
                  <label style={label}>Phone No. *</label>
                  <input
                    name="phone"
                    type="tel"
                    value={form.phone}
                    placeholder="0799 488 488 or +44..."
                    onChange={(e) => setForm({ phone: e.target.value })}
                    onBlur={blur("phone")}
                    style={inp("phone")}
                  />
                  {showErr("phone") && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#EF4444", marginTop: 4 }}>{errors.phone}</div>}
                </div>
              </div>

              {/* Postal Address (conditional) */}
              {form.intent !== "free_visit" && (
                <div className="mb-5">
                  <label style={label}>Postal Address</label>
                  <input
                    name="postalAddress"
                    type="text"
                    value={form.postalAddress}
                    placeholder="e.g. P.O. Box 1234-00100, Nairobi"
                    onChange={(e) => setForm({ postalAddress: e.target.value })}
                    onBlur={blur("postalAddress")}
                    style={inp("postalAddress")}
                  />
                </div>
              )}

              {/* Email */}
              <div className="mb-5">
                <label style={label}>E-mail Address *</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  placeholder="e.g. mary@gmail.com"
                  onChange={(e) => setForm({ email: e.target.value })}
                  onBlur={blur("email")}
                  style={inp("email")}
                />
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#5A5A5A", marginTop: 4 }}>
                  Your signed agreement and receipt will be emailed here
                </div>
                {showErr("email") && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#EF4444", marginTop: 4 }}>{errors.email}</div>}
              </div>

              {/* KRA PIN + ID — conditional KRA PIN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                {form.intent !== "free_visit" ? (
                  <div>
                    <label style={label}>KRA PIN</label>
                    <input
                      name="kraPin"
                      type="text"
                      value={form.kraPin}
                      placeholder="e.g. A123456789B"
                      onChange={(e) => setForm({ kraPin: e.target.value.toUpperCase() })}
                      onBlur={blur("kraPin")}
                      style={inp("kraPin")}
                    />
                  </div>
                ) : (
                  <div>
                    <label style={label}>Current Location (City/Town) *</label>
                    <input
                      name="postalAddress"
                      type="text"
                      value={form.postalAddress}
                      placeholder="e.g. Nairobi, Malindi"
                      onChange={(e) => setForm({ postalAddress: e.target.value })}
                      style={inp("postalAddress")}
                    />
                  </div>
                )}
                <div>
                  <label style={label}>ID / Passport No. *</label>
                  <input
                    name="idNumber"
                    type="text"
                    value={form.idNumber}
                    placeholder="e.g. 12345678 or A1234567"
                    onChange={(e) => setForm({ idNumber: e.target.value })}
                    onBlur={blur("idNumber")}
                    style={inp("idNumber")}
                  />
                  {showErr("idNumber") && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#EF4444", marginTop: 4 }}>{errors.idNumber}</div>}
                </div>
              </div>

              {/* Occupation (conditional) */}
              {form.intent !== "free_visit" && (
                <div className="mb-5">
                  <label style={label}>Occupation</label>
                  <input
                    name="occupation"
                    type="text"
                    value={form.occupation}
                    placeholder="e.g. Teacher, Business Owner, Engineer"
                    onChange={(e) => setForm({ occupation: e.target.value })}
                    style={inp("occupation")}
                  />
                </div>
              )}

              {/* ─────────────────────────────────────────────── */}
              {/* SECTION 4: NEXT OF KIN (conditional)           */}
              {/* ─────────────────────────────────────────────── */}
              {form.intent !== "free_visit" && (
                <>
                  <div style={{ height: 1, background: "#E5E0D8", margin: "4px 0 24px" }} />
                  {sectionHead("NEXT OF KIN DETAILS")}

                  {/* Kin Name + Kin Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                    <div>
                      <label style={label}>Full Name</label>
                      <input
                        name="kinFullName"
                        type="text"
                        value={form.kinFullName}
                        placeholder="Next of kin full name"
                        onChange={(e) => setForm({ kinFullName: e.target.value })}
                        style={inp("kinFullName")}
                      />
                    </div>
                    <div>
                      <label style={label}>Phone No.</label>
                      <input
                        name="kinPhone"
                        type="tel"
                        value={form.kinPhone}
                        placeholder="07XX XXX XXX"
                        onChange={(e) => setForm({ kinPhone: e.target.value })}
                        style={inp("kinPhone")}
                      />
                    </div>
                  </div>

                  {/* Kin DOB + Relationship */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                    <div>
                      <label style={label}>Date of Birth</label>
                      <input
                        type="date"
                        value={form.kinDob}
                        onChange={(e) => setForm({ kinDob: e.target.value })}
                        style={inp("kinDob")}
                      />
                    </div>
                    <div>
                      <label style={label}>Relationship</label>
                      <select
                        value={form.kinRelationship}
                        onChange={(e) => setForm({ kinRelationship: e.target.value })}
                        style={inp("kinRelationship")}
                      >
                        <option value="">Select relationship...</option>
                        {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Kin ID/Passport */}
                  <div className="mb-5">
                    <label style={label}>ID / Passport No.</label>
                    <input
                      type="text"
                      value={form.kinIdPassport}
                      placeholder="Next of kin ID or Passport number"
                      onChange={(e) => setForm({ kinIdPassport: e.target.value })}
                      style={inp("kinIdPassport")}
                    />
                  </div>
                </>
              )}

              <div style={{ height: 1, background: "#E5E0D8", margin: "4px 0 24px" }} />

              {/* ─────────────────────────────────────────────── */}
              {/* SECTION 5: HOW DID YOU HEAR ABOUT US?           */}
              {/* ─────────────────────────────────────────────── */}
              <div className="mb-5">
                <label style={{ ...label, fontWeight: 600 }}>How Did You Hear About Us? *</label>
                <select
                  name="heardFrom"
                  value={form.heardFrom}
                  onChange={(e) => { setForm({ heardFrom: e.target.value }); setTouched((t) => ({ ...t, heardFrom: true })); }}
                  onBlur={blur("heardFrom")}
                  style={inp("heardFrom")}
                >
                  <option value="">Select an option...</option>
                  {HEARD_FROM.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
                {showErr("heardFrom") && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#EF4444", marginTop: 4 }}>{errors.heardFrom}</div>}
              </div>

              {/* Any questions */}
              <div className="mb-6">
                <label style={label}>Any questions or special requirements? (Optional)</label>
                <textarea
                  rows={3}
                  value={form.questions}
                  placeholder="e.g. I prefer a corner plot. Is diaspora financing available?"
                  onChange={(e) => setForm({ questions: e.target.value })}
                  style={{ ...inp("questions"), resize: "vertical", maxHeight: 160 }}
                />
              </div>

              {/* Legal notice (from real booking form) */}
              <div style={{ background: "#F5F2EE", border: "1px solid #E5E0D8", borderRadius: 8, padding: "14px 16px", marginBottom: 24 }}>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#5A5A5A", lineHeight: 1.75, margin: 0 }}>
                  <strong style={{ color: "#0B7FC7" }}>N.B:</strong> Please note that all details on this form are important. Therefore, when filling this form, ensure that you accurately capture all information. After filling this form, it shall be forwarded to the legal department either physically or digitally.
                </p>
              </div>

              {/* Submit */}
              <button
                type="submit"
                id="btn-submit-inquiry"
                disabled={loading}
                style={{
                  width: "100%",
                  background: loading ? "#C8C3BB" : "#E8A020",
                  color: "#FFFFFF",
                  fontFamily: "Inter, sans-serif",
                  fontWeight: 700,
                  fontSize: 16,
                  padding: "18px 0",
                  borderRadius: 8,
                  border: "none",
                  cursor: loading ? "not-allowed" : "pointer",
                  letterSpacing: "0.04em",
                }}
              >
                {loading ? "Saving your booking..." : "SUBMIT → Continue to Site Visit"}
              </button>
            </form>

            {/* ── SIDEBAR ── */}
            <aside className="lg:sticky lg:top-[200px] lg:self-start">
              <div style={{ background: "#FFFFFF", borderRadius: 12, padding: 28, border: "1px solid #E5E0D8", marginBottom: 16 }}>
                <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: 22, color: "#0B7FC7", marginBottom: 18 }}>
                  What happens next?
                </h3>
                {[
                  ["Your details go to our legal team", "Captured digitally on this secure form"],
                  ["CEO reviews within 4 hours", "Your plot is soft-reserved during review"],
                  ["Book your free site visit", "Our agent meets you at the land — 100% free"],
                  ["Pay your deposit securely", "Receive signed agreement via email same day"],
                ].map(([title, desc], i) => (
                  <div key={i} className="flex gap-3 mb-4">
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#E8A020", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                      {i + 1}
                    </div>
                    <div>
                      <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, color: "#1C1C1C" }}>{title}</div>
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#5A5A5A", marginTop: 2 }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ background: "#FFFFFF", borderRadius: 12, padding: 24, border: "1px solid #E5E0D8" }}>
                <div style={{ borderLeft: "3px solid #E8A020", paddingLeft: 14, marginBottom: 16 }}>
                  <em style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: 18, color: "#0B7FC7", lineHeight: 1.4 }}>
                    "Your Interest is Our Priority."
                  </em>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#888", marginTop: 6 }}>— Gatepath Realtors</div>
                </div>
                <a
                  href="https://wa.me/254799488488"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 8, background: "#25D366", color: "#FFFFFF", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, padding: "12px 18px", borderRadius: 8, textDecoration: "none" }}
                >
                  <span style={{ fontSize: 18 }}>💬</span> Chat on WhatsApp
                </a>
              </div>
            </aside>

          </div>
        </div>
      </div>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
