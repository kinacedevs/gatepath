import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Receipt, FileText, Check } from "lucide-react";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { useInquiry } from "@/context/InquiryContext";
import { supabase } from "@/lib/supabase";
import { sendReservationNotificationFn } from "@/lib/notifications";

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

  // Helper to clean quotes and whitespace from query strings (prevents 'NaN' and lookup failures)
  const cleanParam = (val?: string) => {
    if (!val) return "";
    return val.replace(/^["']|["']$/g, "").trim();
  };

  const cleanRef = cleanParam(ref);
  const cleanPlot = cleanParam(plot);
  const cleanPhase = cleanParam(phase);
  const cleanName = cleanParam(name);
  const cleanAmount = cleanParam(amount);

  const amountNum = Number(cleanAmount) || 0;

  const [animate, setAnimate] = useState(false);
  const [paymentRecord, setPaymentRecord] = useState<any>(null);
  const [agreementRecord, setAgreementRecord] = useState<any>(null);
  const [inquiryRecord, setInquiryRecord] = useState<any>(null);
  const [bookingRecord, setBookingRecord] = useState<any>(null);

  useEffect(() => { setTimeout(() => setAnimate(true), 50); }, []);

  useEffect(() => {
    async function fetchTransactionDetails() {
      if (!cleanRef) return;

      if (cleanRef === "free_visit") {
        const plotNum = cleanPlot ? parseInt(cleanPlot) : null;
        if (plotNum && !isNaN(plotNum)) {
          const { data: matched } = await supabase
            .from("inquiries")
            .select("*")
            .eq("plot_number_ref", plotNum)
            .or(`phase_slug.eq.${cleanPhase},phase_name.eq.${cleanPhase}`)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (matched) {
            setInquiryRecord(matched);
            const { data: book } = await supabase
              .from("bookings")
              .select("*")
              .eq("inquiry_id", matched.id)
              .maybeSingle();
            if (book) {
              setBookingRecord(book);
            }
          }
        }
        return;
      }

      // 1. Check if payment already exists
      let { data: payment } = await supabase
        .from("payments")
        .select("*")
        .eq("paystack_reference", cleanRef)
        .maybeSingle();

      // 2. If it does not exist, reconcile client-side (helps local testing without webhooks)
      if (!payment && cleanRef !== "free_visit") {
        const plotNum = cleanPlot ? parseInt(cleanPlot) : null;
        let inquiry = null;

        if (plotNum && !isNaN(plotNum)) {
          const { data: matched } = await supabase
            .from("inquiries")
            .select("*")
            .eq("plot_number_ref", plotNum)
            .eq("phase_name", cleanPhase)
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
              paystack_reference: cleanRef,
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
            await supabase
              .from("agreements")
              .insert({
                inquiry_id: inquiry.id,
                payment_id: payment.id,
                ceo_signed: false,
              });

            // Create booking if they specified a date, or if they wanted to hold and booked transport
            await supabase
              .from("bookings")
              .insert({
                inquiry_id: inquiry.id,
                visit_date: form.visitDate || null,
                visit_time: form.visitTime || null,
                attendees: parseInt(form.attendees) || 1,
                visit_notes: form.visitNotes || null,
                transport_mode: form.transportMode || null,
                status: "pending",
              });

            // Update the plot status to booked in plots table
            await supabase
              .from("plots")
              .update({ status: "booked" })
              .eq("plot_number", plotNum)
              .eq("phase_name", cleanPhase);

            // Send email & SMS notifications
            try {
              sendReservationNotificationFn({
                buyerName: inquiry.client_full_name,
                buyerEmail: inquiry.client_email,
                buyerPhone: inquiry.client_phone,
                plotNumber: String(inquiry.plot_number_ref),
                phaseName: inquiry.phase_name || "",
                amount: amountNum,
                reference: cleanRef,
                isHold: inquiry.payment_preference === "reserve",
                visitDate: form.visitDate || undefined,
                transportMode: form.transportMode || undefined,
              });
            } catch (err) {
              console.error("[Gatepath] Failed to send notification:", err);
            }
          }
        }
      }

      // 3. Load payment, inquiry, booking, and agreement records
      if (payment) {
        setPaymentRecord(payment);

        // Load inquiry
        const { data: inq } = await supabase
          .from("inquiries")
          .select("*")
          .eq("id", payment.inquiry_id)
          .maybeSingle();
        if (inq) {
          setInquiryRecord(inq);
        }

        // Load booking
        const { data: book } = await supabase
          .from("bookings")
          .select("*")
          .eq("inquiry_id", payment.inquiry_id)
          .maybeSingle();
        if (book) {
          setBookingRecord(book);
        }

        // Load agreement
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
  }, [cleanRef, cleanPlot, cleanPhase, amountNum, form]);

  const isFreeVisit = cleanRef === "free_visit" || amountNum <= 0;
  const isReserve = inquiryRecord?.payment_preference === "reserve" || form.reservePlot;
  const clientName = inquiryRecord?.client_full_name || cleanName || form.fullName || "Valued Client";
  const plotNum = inquiryRecord?.plot_number_ref || cleanPlot || form.plotNumber;
  const phaseName = inquiryRecord?.phase_name || cleanPhase || form.phaseName;
  const displayAmount = paymentRecord?.amount || amountNum;

  const visitDateText = bookingRecord?.visit_date
    ? `${bookingRecord.visit_date} — ${bookingRecord.visit_time || "morning"}`
    : "To be scheduled later";
  const transportText = bookingRecord?.transport_mode
    ? ` via ${bookingRecord.transport_mode.toUpperCase()}`
    : "";

  const nextSteps = isFreeVisit
    ? [
        ["Booking Confirmation", "⏱ Instant notification", "Our customer care team has received your booking details and preferred date."],
        ["Transport Coordination", "📞 Within 2 hours (Business hours)", `Our agent will contact you at ${inquiryRecord?.client_phone || form.phone || "your phone"} to finalize the pick-up location and coordinate timings.`],
        ["Guided Tour & Beacon Check", `📅 Scheduled: ${visitDateText}${transportText}`, "We will pick you up, drive you to the site, point out the surveyed beacons, and answer all infrastructure questions."],
        ["Priority Reservation Option", "🌟 Tour follow-up", "After the visit, you will have first priority to reserve this plot if it meets your expectations."],
      ]
    : [
        ["CEO Review & Signature", "⏱ Within 4 hours on business days", "Our CEO/MD will review your transaction and electronically sign your purchase agreement."],
        ["Documents Delivered to You", "📧 Same day as signing", `Your purchase agreement and official payment receipt will be sent to ${inquiryRecord?.client_email || form.email || "your email"} and via WhatsApp to ${inquiryRecord?.client_phone || form.phone || "your phone"}.`],
        ["Site Visit Status", `📅 ${visitDateText}${transportText}`, bookingRecord?.visit_date ? "Our agent will WhatsApp you to confirm the meeting point and any access details for your visit." : "You can coordinate with our office to schedule a free site visit at your convenience during your 14-day hold period."],
        ["You're a Gatepath Landowner!", "🏆 Welcome to the family", "Your plot is secured. Your journey to land ownership has begun."],
      ];

  const whatsappMsg = isFreeVisit
    ? `Hello Gatepath Realtors, I have just booked a free site visit for Plot %23${plotNum} at ${phaseName} and would like to follow up.`
    : `Hello Gatepath Realtors, I have just reserved Plot %23${plotNum} at ${phaseName} and would like to follow up.`;

  const emailSubject = isFreeVisit
    ? `Site Visit Booking %23${plotNum} - ${phaseName}`
    : `Plot Reservation %23${plotNum} - ${phaseName}`;
  const emailBody = isFreeVisit
    ? `Hello Gatepath Realtors,%0D%0AI have scheduled a free site visit for Plot %23${plotNum} at ${phaseName}. Please contact me to confirm the details.`
    : `Hello Gatepath Realtors,%0D%0AI have completed the reservation deposit for Plot %23${plotNum} at ${phaseName}. Please find my details attached.`;

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
            <Check size={40} style={{ color: "#22C55E" }} />
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 700, fontSize: "clamp(34px, 6vw, 52px)", color: "#FFFFFF", marginTop: 24, lineHeight: 1.15 }}>
            {isFreeVisit
              ? "Site Visit Booked Successfully! 📅"
              : isReserve
                ? "Plot Reserved Successfully! ✓"
                : "Payment Received. Your Plot is Secured. ✓"}
          </h1>
          <p style={{ fontFamily: "Inter, sans-serif", fontWeight: 300, fontSize: 18, color: "rgba(255,255,255,0.8)", marginTop: 16, maxWidth: 720, marginInline: "auto" }}>
            {isFreeVisit
              ? `Thank you, ${clientName}. Your free site visit for Plot #${plotNum} at ${phaseName} has been successfully scheduled. We look forward to showing you the property.`
              : isReserve
                ? `Thank you, ${clientName}. Your holding fee of Ksh ${displayAmount.toLocaleString()} for Plot #${plotNum}, ${phaseName} has been received. This plot is now held for you for 14 days.`
                : `Thank you, ${clientName}. Your deposit of Ksh ${displayAmount.toLocaleString()} for Plot #${plotNum}, ${phaseName} has been successfully received.`}
          </p>
          {!isFreeVisit && ref && (
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
              {nextSteps.map(([title, time, desc], i) => (
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
        {!isFreeVisit && (
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
                    Payment Receipt — Plot #{plotNum}
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
        )}

        {/* Bottom CTAs */}
        <div className="flex flex-wrap justify-center gap-3 pb-20 px-6">
          <Link to="/properties" style={{ background: "#0B7FC7", color: "#FFFFFF", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, padding: "12px 22px", borderRadius: 8, textDecoration: "none" }} className="hover:bg-[#09669E] transition-all">
            Browse More Properties
          </Link>
          {!isFreeVisit && !bookingRecord?.visit_date && (
            <Link
              to="/book-visit"
              search={{ inquiry_id: inquiryRecord?.id || paymentRecord?.inquiry_id || form.inquiryId || "" }}
              style={{ background: "#E8A020", color: "#FFFFFF", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, padding: "12px 22px", borderRadius: 8, textDecoration: "none" }}
              className="hover:bg-[#C8861A] transition-all"
            >
              📅 Schedule Site Visit for Plot #{plotNum}
            </Link>
          )}
          <a href={`https://wa.me/254799488488?text=${whatsappMsg}`} target="_blank" rel="noopener noreferrer" style={{ background: "#25D366", color: "#FFFFFF", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, padding: "12px 22px", borderRadius: 8, textDecoration: "none" }} className="hover:bg-[#1EBE57] transition-all">
            Chat on WhatsApp
          </a>
          <a href={`mailto:info@gatepathrealtors.com?subject=${emailSubject}&body=${emailBody}`} style={{ background: "#4B5563", color: "#FFFFFF", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, padding: "12px 22px", borderRadius: 8, textDecoration: "none" }} className="hover:bg-[#374151] transition-all">
            Email Us
          </a>
          <Link to="/" style={{ background: "transparent", color: "#0B7FC7", border: "1.5px solid #0B7FC7", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, padding: "10px 22px", borderRadius: 8, textDecoration: "none" }} className="hover:bg-primary/5 transition-all">
            Return to Homepage
          </Link>
        </div>
      </div>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
