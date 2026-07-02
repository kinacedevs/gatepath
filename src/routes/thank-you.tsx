import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Receipt, FileText, Check } from "lucide-react";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { useInquiry } from "@/context/InquiryContext";
import { supabase } from "@/lib/supabase";

type Search = {
  ref?: string;
  plot?: string;
  phase?: string;
  name?: string;
  amount?: string;
};

export const Route = createFileRoute("/thank-you")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    ref: typeof s.ref === "string" ? s.ref : undefined,
    plot: typeof s.plot === "string" ? s.plot : undefined,
    phase: typeof s.phase === "string" ? s.phase : undefined,
    name: typeof s.name === "string" ? s.name : undefined,
    amount: typeof s.amount === "string" ? s.amount : undefined,
  }),
  component: ThankYouPage,
  head: () => ({
    meta: [
      { title: "Thank You — Gatepath Realtors" },
      { name: "description", content: "Your plot is secured. Welcome to the Gatepath family." },
    ],
  }),
});

function ThankYouPage() {
  const { ref, plot, phase, name, amount } = Route.useSearch();
  const { form } = useInquiry();
  const [animate, setAnimate] = useState(false);
  const [paymentRecord, setPaymentRecord] = useState<any>(null);
  const [agreementRecord, setAgreementRecord] = useState<any>(null);

  useEffect(() => { setTimeout(() => setAnimate(true), 50); }, []);

  useEffect(() => {
    async function fetchTransactionDetails() {
      if (!ref) return;

      // 1. Check if payment already exists
      let { data: payment } = await supabase
        .from("payments")
        .select("*")
        .eq("paystack_reference", ref)
        .maybeSingle();

      // 2. If it does not exist, reconcile client-side (helps local testing without webhooks)
      if (!payment) {
        const plotNum = plot ? parseInt(plot) : null;
        let inquiry = null;

        if (plotNum) {
          const { data: matched } = await supabase
            .from("inquiries")
            .select("*")
            .eq("plot_number_ref", plotNum)
            .eq("phase_name", phase || "")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          inquiry = matched;
        }

        // Create transaction records
        if (inquiry) {
          const { data: createdPayment } = await supabase
            .from("payments")
            .insert({
              inquiry_id: inquiry.id,
              paystack_reference: ref,
              amount: amountNum,
              deposit_amount: amountNum,
              loan_period_months: form.loanPeriod || 6,
              payment_method: form.paymentMethod || "card",
              status: "success",
            })
            .select("*")
            .single();

          payment = createdPayment;

          if (payment) {
            // Create agreement
            const { data: ag } = await supabase
              .from("agreements")
              .insert({
                inquiry_id: inquiry.id,
                payment_id: payment.id,
                ceo_signed: false,
              })
              .select("*")
              .single();

            // Create booking
            await supabase
              .from("bookings")
              .insert({
                inquiry_id: inquiry.id,
                visit_date: form.visitDate || new Date(Date.now() + 86400000).toISOString().split("T")[0],
                visit_time: form.visitTime || "morning",
                attendees: parseInt(form.attendees) || 1,
                visit_notes: form.visitNotes || null,
                status: "pending",
              });

            // Update the plot status to booked in plots table
            await supabase
              .from("plots")
              .update({ status: "booked" })
              .eq("plot_number", plotNum)
              .eq("phase_name", phase || "");
          }
        }
      }

      // 3. Load payment and agreement records
      if (payment) {
        setPaymentRecord(payment);
        const { data: agreement } = await supabase
          .from("agreements")
          .select("*")
          .eq("payment_id", payment.id)
          .maybeSingle();
        if (agreement) {
          setAgreementRecord(agreement);
        }
      }
    }
    fetchTransactionDetails();
  }, [ref, plot, phase, amountNum, form]);

  const amountNum = Number(amount) || 0;

  return (
    <div style={{ minHeight: "100vh", background: "#F8F4EE" }}>
      <Navbar />
      <div className="pt-20">
        {/* Success hero */}
        <section style={{ background: "#0B7FC7", padding: "80px 24px", textAlign: "center" }}>
          <div
            style={{
              width: 80, height: 80, borderRadius: "50%", border: "3px solid #22C55E",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              transform: animate ? "scale(1)" : "scale(0)",
              transition: "transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
              background: "rgba(34,197,94,0.1)",
            }}
          >
            <Check size={44} strokeWidth={3} style={{ color: "#22C55E" }} />
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: "clamp(34px, 6vw, 52px)", color: "#FFFFFF", marginTop: 24, lineHeight: 1.15 }}>
            Payment Received. Your Plot is Secured. ✓
          </h1>
          <p style={{ fontFamily: "Inter, sans-serif", fontWeight: 300, fontSize: 18, color: "rgba(255,255,255,0.8)", marginTop: 16, maxWidth: 720, marginInline: "auto" }}>
            Thank you, {name || form.fullName}. Your deposit of <strong>Ksh {amountNum.toLocaleString()}</strong> for Plot #{plot || form.plotNumber}, {phase || form.phaseName} has been successfully received.
          </p>
          {ref && (
            <div className="mt-6 inline-block" style={{ background: "rgba(232,160,32,0.15)", padding: "8px 20px", borderRadius: 100, fontFamily: "Montserrat, sans-serif", fontWeight: 500, fontSize: 13, color: "#E8A020" }}>
              Transaction Ref: {ref}
            </div>
          )}
        </section>

        {/* What happens next */}
        <section style={{ padding: "80px 24px" }}>
          <div className="mx-auto" style={{ maxWidth: 900 }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 40, color: "#0B7FC7", textAlign: "center", marginBottom: 48 }}>
              Here's What Happens Next
            </h2>
            <div className="space-y-8">
              {[
                ["CEO Review & Signature", "⏱ Within 4 hours on business days", "Our CEO/MD will review your payment and electronically sign your purchase agreement."],
                ["Documents Delivered to You", "📧 Same day as signing", `Your signed purchase agreement and official payment receipt will be sent to ${form.email || "your email"} and via WhatsApp to ${form.phone || "your phone"}.`],
                ["Site Visit Confirmation", `📅 ${form.visitDate || "your scheduled date"} — ${form.visitTime}`, "Our agent will WhatsApp you to confirm the meeting point and any access details for your visit."],
                ["You're a Gatepath Landowner!", "🏆 Welcome to the family", "Your plot is secured. Your journey to land ownership has begun."],
              ].map(([title, time, desc], i) => (
                <div key={i} className="flex gap-5">
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#E8A020", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div>
                    <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 17, color: "#0B7FC7" }}>{title}</div>
                    <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 500, fontStyle: "italic", fontSize: 12, color: "#E8A020", marginTop: 2 }}>{time}</div>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 15, color: "#5A5A5A", lineHeight: 1.7, marginTop: 6 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Documents */}
        <section style={{ padding: "0 24px 60px" }}>
          <div className="mx-auto" style={{ maxWidth: 600, background: "#FFFFFF", borderRadius: 12, padding: 32, border: "1px solid #E5E0D8" }}>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: 26, color: "#0B7FC7" }}>Your Documents</h3>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#5A5A5A", marginTop: 8 }}>
              Your signed documents will appear here once the CEO approves your payment. You will also receive them by email and WhatsApp.
            </p>
            {/* Receipt */}
            <div className="mt-4 flex items-center justify-between" style={{ padding: "12px 16px", border: "1px solid #E5E0D8", borderRadius: 8 }}>
              <div className="flex items-center gap-3">
                <Receipt size={24} style={{ color: "#E8A020" }} />
                <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 500, fontSize: 14, color: "#1C1C1C" }}>
                  Payment Receipt — Plot #{plot || form.plotNumber}
                </span>
              </div>
              {paymentRecord ? (
                <Link
                  to="/document/receipt/$id"
                  params={{ id: paymentRecord.id }}
                  style={{
                    background: "rgba(34,197,94,0.1)",
                    color: "#22C55E",
                    fontFamily: "Inter, sans-serif",
                    fontSize: 12,
                    fontWeight: 600,
                    padding: "6px 14px",
                    borderRadius: 8,
                    textDecoration: "none",
                  }}
                  className="hover:bg-[rgba(34,197,94,0.15)] transition-all"
                >
                  View & Print Receipt ✓
                </Link>
              ) : (
                <span style={{ background: "#FEF3C7", color: "#92400E", fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 999 }}>
                  Generating...
                </span>
              )}
            </div>

            {/* Agreement */}
            <div className="mt-4 flex items-center justify-between" style={{ padding: "12px 16px", border: "1px solid #E5E0D8", borderRadius: 8 }}>
              <div className="flex items-center gap-3">
                <FileText size={24} style={{ color: "#E8A020" }} />
                <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 500, fontSize: 14, color: "#1C1C1C" }}>
                  Purchase Agreement
                </span>
              </div>
              {agreementRecord ? (
                agreementRecord.ceo_signed ? (
                  <Link
                    to="/document/agreement/$id"
                    params={{ id: agreementRecord.inquiry_id }}
                    style={{
                      background: "rgba(34,197,94,0.1)",
                      color: "#22C55E",
                      fontFamily: "Inter, sans-serif",
                      fontSize: 12,
                      fontWeight: 600,
                      padding: "6px 14px",
                      borderRadius: 8,
                      textDecoration: "none",
                    }}
                    className="hover:bg-[rgba(34,197,94,0.15)] transition-all"
                  >
                    View Signed Agreement ✓
                  </Link>
                ) : (
                  <Link
                    to="/document/agreement/$id"
                    params={{ id: agreementRecord.inquiry_id }}
                    style={{
                      background: "#FEF3C7",
                      color: "#92400E",
                      fontFamily: "Inter, sans-serif",
                      fontSize: 12,
                      fontWeight: 600,
                      padding: "6px 14px",
                      borderRadius: 8,
                      textDecoration: "none",
                    }}
                    className="hover:bg-[#FDE68A] transition-all"
                  >
                    View Draft (Pending CEO)
                  </Link>
                )
              ) : (
                <span style={{ background: "#F3F4F6", color: "#4B5563", fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 999 }}>
                  Awaiting Review
                </span>
              )}
            </div>
            <p style={{ fontFamily: "Inter, sans-serif", fontStyle: "italic", fontSize: 13, color: "#5A5A5A", marginTop: 16 }}>
              You will receive an email and WhatsApp notification the moment these are ready.
            </p>
          </div>
        </section>

        {/* Bottom CTAs */}
        <div className="flex flex-wrap justify-center gap-3 pb-20 px-6">
          <Link to="/properties" style={{ background: "#0B7FC7", color: "#FFFFFF", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, padding: "12px 22px", borderRadius: 8, textDecoration: "none" }}>
            Browse More Properties
          </Link>
          <a href="https://wa.me/254799488488" target="_blank" rel="noopener noreferrer" style={{ background: "#25D366", color: "#FFFFFF", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, padding: "12px 22px", borderRadius: 8, textDecoration: "none" }}>
            Chat With Us on WhatsApp
          </a>
          <Link to="/" style={{ background: "transparent", color: "#0B7FC7", border: "1.5px solid #0B7FC7", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, padding: "10px 22px", borderRadius: 8, textDecoration: "none" }}>
            Return to Homepage
          </Link>
        </div>
      </div>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
