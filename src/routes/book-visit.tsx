import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle, Minus, Plus } from "lucide-react";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { InquiryStepper } from "@/components/InquiryStepper";
import { PlotSummaryCard } from "@/components/inquiry/PlotSummaryCard";
import { useInquiry } from "@/context/InquiryContext";

export const Route = createFileRoute("/book-visit")({
  component: BookVisitPage,
  head: () => ({
    meta: [
      { title: "Book Your Site Visit — Gatepath Realtors" },
      { name: "description", content: "Schedule a free, no-commitment visit to see your selected plot." },
    ],
  }),
});

function BookVisitPage() {
  const { form, setForm } = useInquiry();
  const navigate = useNavigate();
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [bannerError, setBannerError] = useState(false);

  useEffect(() => {
    if (!form.fullName) navigate({ to: "/inquire" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const maxDate = new Date(Date.now() + 60 * 86400000).toISOString().split("T")[0];

  const errors: Record<string, string> = {};
  if (!form.visitDate) errors.visitDate = "Please select a visit date";
  else if (new Date(form.visitDate).getDay() === 0) errors.visitDate = "We are closed on Sundays. Please select Monday–Saturday.";
  if (!form.visitTime) errors.visitTime = "Please select a time";

  const showErr = (k: string) => (touched[k] || submitted) && errors[k];

  const handleAttendees = (delta: number) => {
    const n = Math.max(1, Math.min(8, Number(form.attendees) + delta));
    setForm({ attendees: String(n) });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length > 0) {
      setBannerError(true);
      return;
    }
    setBannerError(false);
    navigate({ to: "/payment" });
  };

  const labelStyle: React.CSSProperties = { display: "block", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 500, color: "#1C1C1C", marginBottom: 6 };
  const inputStyle = (key: string): React.CSSProperties => ({
    width: "100%", padding: "12px 14px",
    border: `1.5px solid ${showErr(key) ? "#EF4444" : touched[key] && !errors[key] ? "#22C55E" : "#E5E0D8"}`,
    borderRadius: 8, fontFamily: "Inter, sans-serif", fontSize: 14, color: "#1C1C1C", background: "#FFFFFF", outline: "none",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#F8F4EE" }}>
      <Navbar />
      <div className="pt-20">
        <InquiryStepper currentStep={2} />

        <div style={{ background: "#0B7FC7", padding: "32px 24px" }}>
          <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-center">
            <div>
              <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 500, fontSize: 11, color: "#E8A020", letterSpacing: "0.25em" }}>STEP 2 OF 3</div>
              <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "clamp(28px, 5vw, 40px)", color: "#FFFFFF", marginTop: 8, lineHeight: 1.15 }}>
                Book Your Free Site Visit
              </h1>
              <p style={{ fontFamily: "Inter, sans-serif", fontWeight: 300, fontSize: 16, color: "rgba(255,255,255,0.75)", marginTop: 10 }}>
                See the land before you commit. Our agent will meet you on-site. Site visits are completely free.
              </p>
            </div>
            <PlotSummaryCard />
          </div>
        </div>

        <div className="mx-auto" style={{ maxWidth: 1100, padding: "40px 24px" }}>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
            <form onSubmit={handleSubmit} style={{ background: "#FFFFFF", borderRadius: 12, padding: "36px 28px", boxShadow: "0 4px 24px rgba(11,127,199,0.08)", border: "1px solid #E5E0D8" }}>
              {bannerError && (
                <div className="mb-5" style={{ background: "#FEE2E2", border: "1px solid #EF4444", borderRadius: 6, padding: "12px 16px", fontFamily: "Inter, sans-serif", fontWeight: 500, fontSize: 14, color: "#991B1B" }}>
                  Please fix the highlighted fields before continuing.
                </div>
              )}

              {/* Booking summary */}
              <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 600, fontSize: 11, color: "#E8A020", letterSpacing: "0.2em", marginBottom: 16 }}>BOOKING FOR</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  ["Name", form.fullName],
                  ["Phone", form.phone],
                  ["Plot", `${form.phaseName} — Plot #${form.plotNumber}`],
                  ["Location", form.plotLocation],
                ].map(([l, v]) => (
                  <div key={l} style={{ background: "#F8F4EE", border: "1px solid #E5E0D8", borderRadius: 6, padding: "12px 14px" }}>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#5A5A5A", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{l}</div>
                    <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 15, color: "#0B7FC7" }}>{v}</div>
                  </div>
                ))}
              </div>

              <div className="my-7" style={{ height: 1, background: "#E5E0D8" }} />

              <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 600, fontSize: 11, color: "#E8A020", letterSpacing: "0.2em", marginBottom: 16 }}>SCHEDULE YOUR VISIT</div>

              {/* Date */}
              <div className="mb-5">
                <label style={labelStyle}>Preferred Visit Date *</label>
                <input
                  name="visitDate"
                  type="date"
                  min={tomorrow}
                  max={maxDate}
                  value={form.visitDate}
                  onChange={(e) => setForm({ visitDate: e.target.value })}
                  onBlur={() => setTouched((t) => ({ ...t, visitDate: true }))}
                  style={inputStyle("visitDate")}
                />
                {showErr("visitDate") && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#EF4444", marginTop: 4 }}>{errors.visitDate}</div>}
              </div>

              {/* Time */}
              <label style={labelStyle}>Preferred Time *</label>
              <div className="grid grid-cols-2 gap-3 mb-5">
                {[
                  { id: "morning", icon: "🌅", title: "Morning Visit", sub: "8:00 AM – 12:00 PM" },
                  { id: "afternoon", icon: "🌆", title: "Afternoon Visit", sub: "1:00 PM – 5:00 PM" },
                ].map((opt) => {
                  const selected = form.visitTime === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setForm({ visitTime: opt.id })}
                      style={{
                        textAlign: "left",
                        border: `1.5px solid ${selected ? "#0B7FC7" : "#E5E0D8"}`,
                        borderLeft: selected ? "3px solid #E8A020" : "1.5px solid #E5E0D8",
                        borderRadius: 8, padding: "14px 16px",
                        background: selected ? "#F0F4F8" : "#FFFFFF", cursor: "pointer",
                      }}
                    >
                      <div style={{ fontSize: 22, marginBottom: 6 }}>{opt.icon}</div>
                      <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, color: "#0B7FC7" }}>{opt.title}</div>
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#5A5A5A", marginTop: 2 }}>{opt.sub}</div>
                    </button>
                  );
                })}
              </div>

              {/* Attendees */}
              <label style={labelStyle}>How many people will attend? *</label>
              <div className="mb-5" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid #E5E0D8", borderRadius: 8, padding: "10px 16px", maxWidth: 240 }}>
                <button type="button" onClick={() => handleAttendees(-1)} style={{ background: "none", border: "none", cursor: "pointer", color: "#5A5A5A" }}>
                  <Minus size={20} />
                </button>
                <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 20, color: "#0B7FC7", minWidth: 48, textAlign: "center" }}>{form.attendees}</div>
                <button type="button" onClick={() => handleAttendees(1)} style={{ background: "none", border: "none", cursor: "pointer", color: "#5A5A5A" }}>
                  <Plus size={20} />
                </button>
              </div>

              {/* Notes */}
              <div className="mb-5">
                <label style={labelStyle}>Any special requirements for the visit? (Optional)</label>
                <textarea
                  rows={3}
                  value={form.visitNotes}
                  placeholder="e.g. I will be coming from Mombasa — please confirm the meeting point in advance."
                  onChange={(e) => setForm({ visitNotes: e.target.value })}
                  style={{ ...inputStyle("visitNotes"), resize: "vertical" }}
                />
              </div>

              {/* Info box */}
              <div style={{ background: "#F0F4F8", borderLeft: "3px solid #E8A020", borderRadius: "0 8px 8px 0", padding: "16px 20px", fontFamily: "Inter, sans-serif", fontSize: 13, color: "#5A5A5A", lineHeight: 1.8 }}>
                <div style={{ fontWeight: 600, color: "#0B7FC7", marginBottom: 8 }}>ℹ️ About Your Site Visit</div>
                • Site visits are 100% free — no commitment required<br />
                • Our agent will confirm via WhatsApp within 2 hours of booking<br />
                • Meeting point directions will be shared on confirmation<br />
                • Please bring your national ID for verification
              </div>

              <button
                type="submit"
                style={{ marginTop: 28, width: "100%", background: "#E8A020", color: "#FFFFFF", fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 16, padding: "18px 0", borderRadius: 8, border: "none", cursor: "pointer" }}
              >
                Continue to Payment →
              </button>
              <button
                type="button"
                onClick={() => window.history.back()}
                style={{ marginTop: 10, width: "100%", background: "transparent", color: "#0B7FC7", fontFamily: "Inter, sans-serif", fontWeight: 500, fontSize: 14, padding: "13px 0", borderRadius: 8, border: "1.5px solid #0B7FC7", cursor: "pointer" }}
              >
                ← Back to My Inquiry
              </button>
            </form>

            <aside className="lg:sticky lg:top-[200px] lg:self-start">
              <div style={{ background: "#FFFFFF", borderRadius: 12, padding: 28, border: "1px solid #E5E0D8" }}>
                <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 22, color: "#0B7FC7", marginBottom: 20 }}>
                  Your Visit Checklist
                </h3>
                {[
                  "Bring your National ID",
                  "Wear comfortable walking shoes",
                  "Bring a trusted friend or family member",
                  "Have questions ready for the agent",
                  "Take photos during the visit — encouraged!",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 mb-3">
                    <CheckCircle size={18} style={{ color: "#22C55E", marginTop: 2, flexShrink: 0 }} />
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#1C1C1C" }}>{item}</div>
                  </div>
                ))}
                <div className="my-5" style={{ height: 1, background: "#E5E0D8" }} />
                <div style={{ background: "#F8F4EE", border: "1px solid #E5E0D8", borderRadius: 8, padding: 16 }}>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#5A5A5A", letterSpacing: "0.08em", textTransform: "uppercase" }}>Selected Plot</div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, color: "#0B7FC7", marginTop: 4 }}>{form.phaseName}</div>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 20, color: "#0B7FC7" }}>Plot #{form.plotNumber}</div>
                  <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 16, color: "#E8A020", marginTop: 4 }}>Ksh {form.plotPrice.toLocaleString()}</div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#5A5A5A", marginTop: 2 }}>{form.plotLocation}</div>
                </div>
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
