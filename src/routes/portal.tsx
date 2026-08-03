import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { useInquiry } from "@/context/InquiryContext";
import {
  requestPortalOtpFn,
  verifyPortalOtpFn,
  getPortalDataFn,
  getPortalDocumentSignedUrlFn,
  assertPortalOwnsInquiryFn,
  submitTestimonialFn,
} from "@/lib/portalActions";
import { verifyPaymentFn } from "@/lib/paymentActions";
import {
  resolveDealStage,
  CONVEYANCING_13_STAGES,
  NEXT_ACTION_BY_STAGE,
} from "@/lib/conveyancingStages";
import {
  ShieldCheck,
  User,
  Key,
  FolderOpen,
  ArrowRight,
  TrendingUp,
  FileText,
  CreditCard,
  LogOut,
  MapPin,
  Calendar,
  Loader2,
  Lock,
  Phone,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Clock,
  X,
  Check,
  Video,
  Eye,
} from "lucide-react";

export const Route = createFileRoute("/portal")({
  component: ClientPortalPage,
  head: () => ({
    meta: [
      { title: "Client Hub & Title Deed Tracker — Gatepath Realtors" },
      {
        name: "description",
        content:
          "Access your Gatepath purchase agreements, title deed conveyancing status, receipts, and track remaining installments.",
      },
    ],
  }),
});

interface InquiryData {
  id: string;
  phase_id: string;
  phase_name: string;
  plot_number_ref: number;
  plot_size: string;
  price: number;
  booking_date: string;
  payment_preference: string;
  balance: number;
  referred_by?: string;
  status: string;
  client_full_name: string;
  client_email: string;
  client_phone: string;
  cro_name: string | null;
  terms_of_payment: string | null;
}

interface PaymentData {
  id: string;
  inquiry_id: string;
  amount: number;
  created_at: string;
  paystack_reference: string;
  status: string;
}

interface BookingData {
  id: string;
  inquiry_id: string;
  visit_date: string;
  visit_time: string;
  status: string;
  pickup_location?: string;
  transport_required: boolean;
}

interface OfferData {
  id: string;
  inquiry_id: string;
  ceo_signed: boolean;
}

interface AgreementData {
  id: string;
  inquiry_id: string;
  ceo_signed: boolean;
}

interface InteractionData {
  id: string;
  inquiry_id: string;
}

interface DocumentData {
  id: string;
  inquiry_id: string | null;
  document_type: string;
  file_name: string;
  created_at: string;
}

interface PhaseVideoData {
  id: string;
  youtube_video_url: string | null;
}

interface TestimonialFlagData {
  submitted_by_inquiry_id: string | null;
}

const DOCUMENT_TYPE_LABEL: Record<string, string> = {
  agreement: "Agreement",
  offer: "Offer Letter",
  receipt: "Receipt",
  title_deed: "Title Deed",
  id_copy: "ID Copy",
  poa: "Power of Attorney",
  other: "Document",
};

const PORTAL_SESSION_KEY = "gatepath_portal_session";

const PAYSTACK_KEY = (import.meta.env?.VITE_PAYSTACK_PUBLIC_KEY ||
  "pk_test_b0065a39ea3c50c3b60c0ab7a84832b0ea31080a") as string;

function ClientPortalPage() {
  const navigate = useNavigate();
  const { setForm } = useInquiry();
  const [emailInput, setEmailInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [otpInput, setOtpInput] = useState("");
  // sessionToken is the actual credential (opaque, server-issued, stored in
  // sessionStorage). sessionEmail is display-only, set after a successful
  // verify — never trusted as proof of identity by itself. See
  // CRITIQUE.md P0-3: the old "session" was just the email in
  // sessionStorage, settable to any value in devtools.
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // OTP Authentication States
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(300);
  const [otpVerifying, setOtpVerifying] = useState(false);

  // Dashboard Data
  const [inquiries, setInquiries] = useState<InquiryData[]>([]);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [offers, setOffers] = useState<OfferData[]>([]);
  const [agreements, setAgreements] = useState<AgreementData[]>([]);
  const [interactions, setInteractions] = useState<InteractionData[]>([]);
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [phases, setPhases] = useState<PhaseVideoData[]>([]);
  const [testimonialFlags, setTestimonialFlags] = useState<TestimonialFlagData[]>([]);
  const [viewingDocId, setViewingDocId] = useState<string | null>(null);

  // Share Your Experience (testimonial self-submission) state, keyed by inquiry id
  const [testimonialQuote, setTestimonialQuote] = useState<Record<string, string>>({});
  const [testimonialSaving, setTestimonialSaving] = useState<string | null>(null);
  const [testimonialMsg, setTestimonialMsg] = useState<Record<string, string>>({});
  // Ids submitted THIS session — kept separately from testimonialFlags (the
  // set loaded from the server) so the card stays mounted long enough to
  // actually show its own confirmation message instead of unmounting on
  // the same render that would have painted it.
  const [justSubmittedIds, setJustSubmittedIds] = useState<string[]>([]);

  // In-Portal Installment Payment Modal State
  const [payingInquiry, setPayingInquiry] = useState<InquiryData | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [suggestedPayAmount, setSuggestedPayAmount] = useState<number>(0);
  const [payProcessing, setPayProcessing] = useState(false);
  const [paySuccessMsg, setPaySuccessMsg] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedToken = sessionStorage.getItem(PORTAL_SESSION_KEY);
      if (savedToken) {
        fetchClientData(savedToken);
      }
    }
  }, []);

  // OTP Countdown Timer
  useEffect(() => {
    let timer: any;
    if (otpSent && otpCountdown > 0) {
      timer = setTimeout(() => setOtpCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpSent, otpCountdown]);

  // Read-only dashboard fetch — server verifies the session token itself
  // (see portalActions.ts) rather than trusting anything the client asserts.
  const fetchClientData = async (token: string) => {
    setFetchingData(true);
    setError(null);
    try {
      const result = await (getPortalDataFn as any)({ data: { sessionToken: token } });

      if (!result?.success) {
        setError(result?.error || "Your session expired. Please sign in again.");
        if (typeof window !== "undefined") sessionStorage.removeItem(PORTAL_SESSION_KEY);
        setSessionToken(null);
        setSessionEmail(null);
        setFetchingData(false);
        return;
      }

      if (!result.inquiries || result.inquiries.length === 0) {
        setError("No client profile found matching this account.");
        setFetchingData(false);
        return;
      }

      setInquiries(result.inquiries);
      setPayments(result.payments || []);
      setBookings(result.bookings || []);
      setOffers(result.offers || []);
      setAgreements(result.agreements || []);
      setInteractions(result.interactions || []);
      setDocuments(result.documents || []);
      setPhases(result.phases || []);
      setTestimonialFlags(result.testimonials || []);
      setSessionToken(token);
      setSessionEmail(result.inquiries[0]?.client_email || null);
    } catch (err: any) {
      console.error("[Portal Fetch Error]", err.message);
      setError("Failed to synchronize dashboard metrics. Please check your network.");
    } finally {
      setFetchingData(false);
    }
  };

  const requestOtp = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await (requestPortalOtpFn as any)({
        data: { email: emailInput, phone: phoneInput },
      });

      setLoading(false);

      if (!result?.success) {
        setError(result?.error || "Could not send a verification code.");
        return;
      }

      setOtpInput("");
      setOtpSent(true);
      setOtpCountdown(300);
    } catch (err: any) {
      setLoading(false);
      setError("Connection failure. Please try again.");
      console.error("[Portal] OTP request failed:", err);
    }
  };

  const handleLoginRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    await requestOtp();
  };

  const handleBackToLogin = () => {
    setOtpSent(false);
    setOtpInput("");
    setError(null);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpVerifying(true);
    setError(null);

    if (otpCountdown <= 0) {
      setError("The verification code has expired. Please request a new OTP.");
      setOtpVerifying(false);
      return;
    }

    try {
      const result = await (verifyPortalOtpFn as any)({
        data: { email: emailInput, otp: otpInput },
      });

      if (!result?.success) {
        setError(result?.error || "Invalid verification code.");
        setOtpVerifying(false);
        return;
      }

      const token = result.sessionToken as string;
      if (typeof window !== "undefined") {
        sessionStorage.setItem(PORTAL_SESSION_KEY, token);
      }
      setOtpSent(false);
      await fetchClientData(token);
    } catch (err: any) {
      setError("Verification failed. Please try again.");
      console.error("[Portal] OTP verify failed:", err);
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(PORTAL_SESSION_KEY);
    }
    setSessionToken(null);
    setSessionEmail(null);
    setInquiries([]);
    setPayments([]);
    setBookings([]);
    setOffers([]);
    setAgreements([]);
    setInteractions([]);
    setDocuments([]);
    setPhases([]);
    setTestimonialFlags([]);
    setEmailInput("");
    setPhoneInput("");
    setOtpInput("");
    setOtpSent(false);
  };

  const submitTestimonial = async (inquiryId: string) => {
    const quote = (testimonialQuote[inquiryId] || "").trim();
    if (quote.length < 10) {
      setTestimonialMsg((m) => ({ ...m, [inquiryId]: "Please share a few more details." }));
      return;
    }
    setTestimonialSaving(inquiryId);
    setTestimonialMsg((m) => ({ ...m, [inquiryId]: "" }));
    try {
      const result = await (submitTestimonialFn as any)({
        data: { sessionToken, inquiryId, quote },
      });
      if (!result.success) {
        setTestimonialMsg((m) => ({ ...m, [inquiryId]: result.error }));
      } else {
        setTestimonialFlags((flags) => [...flags, { submitted_by_inquiry_id: inquiryId }]);
        setJustSubmittedIds((ids) => [...ids, inquiryId]);
        setTestimonialMsg((m) => ({
          ...m,
          [inquiryId]: "Thank you! Your testimonial is pending review.",
        }));
      }
    } catch {
      setTestimonialMsg((m) => ({ ...m, [inquiryId]: "Something went wrong. Please try again." }));
    } finally {
      setTestimonialSaving(null);
    }
  };

  // Open In-Portal Paystack Installment Modal
  const openInstallmentModal = (inq: InquiryData, remainingBalance: number) => {
    setPayingInquiry(inq);
    const suggestedInstallment = Math.min(26667, remainingBalance);
    const amount = suggestedInstallment > 0 ? suggestedInstallment : remainingBalance;
    setPayAmount(amount);
    setSuggestedPayAmount(amount);
    setPaySuccessMsg(null);
    setPayError(null);
  };

  // Execute In-Portal Installment Payment via Paystack. Reuses the same
  // verifyPaymentFn as the main buy flow (payment.tsx) — nothing is written
  // to payments until the server re-verifies the reference against
  // Paystack's own API. Previously this inserted a "success" payment
  // directly from the browser, and — if the Paystack SDK simply hadn't
  // loaded for any reason — did so WITHOUT ever opening a payment popup at
  // all (CRITIQUE P0-3 / the same class of bug as P0-2).
  const executeInPortalPayment = async () => {
    if (!payingInquiry || payAmount <= 0 || !sessionToken) return;
    setPayProcessing(true);
    setPayError(null);

    const ownership = await (assertPortalOwnsInquiryFn as any)({
      data: { sessionToken, inquiryId: payingInquiry.id },
    });
    if (!ownership?.success) {
      setPayError(ownership?.error || "You don't have permission to pay against this inquiry.");
      setPayProcessing(false);
      return;
    }

    if (typeof window === "undefined" || !(window as any).PaystackPop) {
      setPayError("Payment system is still loading. Please try again in a moment.");
      setPayProcessing(false);
      return;
    }

    const handler = (window as any).PaystackPop.setup({
      key: PAYSTACK_KEY,
      email: payingInquiry.client_email,
      amount: payAmount * 100,
      currency: "KES",
      ref: `INST-${payingInquiry.id.slice(0, 8)}-${Date.now()}`,
      callback: async (response: any) => {
        try {
          const result = await (verifyPaymentFn as any)({
            data: { reference: response.reference, inquiryId: payingInquiry.id },
          });

          if (!result?.success) {
            setPayError(
              result?.error ||
                `We couldn't confirm this payment. If money left your account, contact us with reference: ${response.reference}`,
            );
            setPayProcessing(false);
            return;
          }

          setPaySuccessMsg(
            `Payment of Ksh ${payAmount.toLocaleString()} confirmed! Reference: ${response.reference}`,
          );
          setPayProcessing(false);
          setPayingInquiry(null);
          await fetchClientData(sessionToken);
        } catch (err: any) {
          console.error("[Portal] Installment verify failed:", err);
          setPayError(
            `We couldn't confirm this payment. If money left your account, contact us with reference: ${response.reference}`,
          );
          setPayProcessing(false);
        }
      },
      onClose: () => {
        setPayProcessing(false);
      },
    });
    handler.openIframe();
  };

  // Opens a staff-uploaded vault document (Module 7) in a new tab via a
  // short-lived signed URL — ownership is re-verified server-side against
  // this portal session, never trusted from the client.
  const viewPortalDocument = async (documentId: string) => {
    if (!sessionToken) return;
    setViewingDocId(documentId);
    try {
      const result = await (getPortalDocumentSignedUrlFn as any)({
        data: { sessionToken, documentId },
      });
      if (result?.success) {
        window.open(result.signedUrl, "_blank", "noopener,noreferrer");
      } else {
        setError(result?.error || "Could not open this document.");
      }
    } catch (err: any) {
      console.error("[Portal] Document view failed:", err);
      setError("Could not open this document.");
    } finally {
      setViewingDocId(null);
    }
  };

  return (
    <div className="min-h-screen bg-ivory font-sans">
      <Navbar />

      <div className="pt-20">
        {!sessionToken ? (
          /* LOGIN & OTP VERIFICATION SCREENS */
          <section className="py-24 px-6 flex justify-center items-center">
            <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-8 md:p-10 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-primary-deep via-accent to-primary" />

              {!otpSent ? (
                <div>
                  <div className="text-center mb-8">
                    <div className="w-14 h-14 bg-primary-deep/10 text-primary-deep rounded-full flex items-center justify-center mx-auto mb-4">
                      <Lock size={26} className="text-accent" />
                    </div>
                    <h1 className="font-serif font-bold text-3xl text-primary-deep tracking-tight">
                      Client Hub Access
                    </h1>
                    <p className="text-slate-500 text-xs font-light mt-2 leading-relaxed">
                      Enter your registered email and phone number to access your title deed
                      conveyancing status and installment ledger.
                    </p>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 rounded-lg font-medium mb-6 flex items-start gap-2">
                      <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <form onSubmit={handleLoginRequest} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-primary-deep mb-1">
                        Registered Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder="e.g. client@example.com"
                        className="w-full border border-slate-200 rounded-xl p-3 text-xs outline-none focus:border-primary bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-primary-deep mb-1">
                        Registered Phone *
                      </label>
                      <input
                        type="tel"
                        required
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="e.g. 07XXXXXXXX"
                        className="w-full border border-slate-200 rounded-xl p-3 text-xs outline-none focus:border-primary bg-white"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-primary text-white font-bold text-xs py-3.5 rounded-xl hover:bg-primary-deep transition-all flex items-center justify-center gap-2 shadow-md"
                    >
                      {loading ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        "Request Access Code →"
                      )}
                    </button>
                  </form>
                </div>
              ) : (
                <div>
                  <div className="text-center mb-6">
                    <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                      <MessageSquare size={24} />
                    </div>
                    <h1 className="font-serif font-bold text-2xl text-primary-deep">
                      Enter OTP Code
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                      Code sent to <strong className="text-slate-800">{emailInput}</strong> and{" "}
                      <strong className="text-slate-800">{phoneInput}</strong> — expires in{" "}
                      {Math.floor(otpCountdown / 60)}:{String(otpCountdown % 60).padStart(2, "0")}
                    </p>
                  </div>

                  {error && (
                    <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg mb-4 flex items-start gap-2">
                      <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value)}
                      placeholder="Enter 6-digit OTP"
                      className="w-full border border-slate-200 rounded-xl p-3 text-center font-mono font-bold tracking-widest text-lg outline-none focus:border-primary"
                    />

                    <button
                      type="submit"
                      disabled={otpVerifying}
                      className="w-full bg-primary-deep text-white font-bold text-xs py-3.5 rounded-xl hover:opacity-90 transition-opacity"
                    >
                      {otpVerifying ? "Authorizing..." : "Verify & Log In →"}
                    </button>
                  </form>

                  <div className="flex items-center justify-between mt-4">
                    <button
                      type="button"
                      onClick={handleBackToLogin}
                      className="text-xs text-slate-500 hover:text-primary-deep font-medium"
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      onClick={requestOtp}
                      disabled={loading}
                      className="text-xs text-accent hover:text-primary-deep font-bold disabled:opacity-50"
                    >
                      {loading ? "Sending…" : "Resend Code"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        ) : (
          /* DASHBOARD SCREEN */
          <section className="py-12 px-6 mx-auto max-w-7xl space-y-8">
            {/* Success Toast */}
            {paySuccessMsg && (
              <div className="p-4 bg-green-100 border border-green-300 text-green-800 text-xs font-bold rounded-xl flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckCircle2 size={16} /> {paySuccessMsg}
                </span>
                <button onClick={() => setPaySuccessMsg(null)}>
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Header Block */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-200">
              <div>
                <span className="text-xs font-bold text-accent uppercase tracking-wider">
                  CLIENT HUB & TITLE TRACKER
                </span>
                <h1 className="font-serif font-bold text-3xl sm:text-4xl text-primary-deep mt-1">
                  Welcome Back, {inquiries[0]?.client_full_name}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Logged in as <strong className="text-slate-800">{sessionEmail}</strong>
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 border border-slate-200 hover:bg-red-50 text-slate-600 hover:text-red-700 font-semibold text-xs px-4 py-2.5 rounded-xl transition-colors cursor-pointer"
              >
                <LogOut size={16} /> Sign Out
              </button>
            </div>

            {fetchingData ? (
              <div className="py-24 text-center">
                <Loader2 className="animate-spin text-primary mx-auto mb-4" size={44} />
                <p className="text-xs text-slate-500 font-semibold">
                  Synchronizing title deed & payment records...
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Left Column (Purchased Plots & 5-Stage Title Deed Conveyancing Tracker) */}
                <div className="lg:col-span-8 space-y-8">
                  <h2 className="font-serif font-bold text-2xl text-primary-deep flex items-center gap-2">
                    <TrendingUp className="text-accent" size={24} /> My Purchased Plots &
                    Conveyancing Status
                  </h2>

                  {inquiries.map((inq) => {
                    const plotPayments = payments.filter(
                      (p) => p.inquiry_id === inq.id && p.status === "success",
                    );
                    const totalPaid = plotPayments.reduce((acc, curr) => acc + curr.amount, 0);
                    const remainingBalance = Math.max(0, inq.price - totalPaid);
                    const paidPct = inq.price
                      ? Math.min(100, Math.round((totalPaid / inq.price) * 100))
                      : 0;

                    // Real 13-stage resolver (Part 2, Module 8) — checks each
                    // stage's actual backing signal instead of the old
                    // payment-percentage-only heuristic. See
                    // src/lib/conveyancingStages.ts.
                    const inqOffers = offers.filter((o) => o.inquiry_id === inq.id);
                    const inqAgreements = agreements.filter((a) => a.inquiry_id === inq.id);
                    const inqInteractions = interactions.filter((i) => i.inquiry_id === inq.id);
                    const inqBookings = bookings.filter((b) => b.inquiry_id === inq.id);
                    const inqDocuments = documents.filter((d) => d.inquiry_id === inq.id);
                    const inqPhase = phases.find((p) => p.id === inq.phase_id);

                    const { currentStage, reachedStages, agreementSigned } = resolveDealStage(
                      {
                        cro_name: inq.cro_name,
                        terms_of_payment: inq.terms_of_payment,
                        status: inq.status,
                      },
                      {
                        payments: plotPayments,
                        bookings: inqBookings,
                        offers: inqOffers,
                        agreements: inqAgreements,
                        interactions: inqInteractions,
                      },
                    );

                    return (
                      <div
                        key={inq.id}
                        className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6"
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div>
                            <span className="text-[10px] font-bold text-accent uppercase tracking-wider">
                              Purchased Unit
                            </span>
                            <h3 className="font-serif font-bold text-2xl text-primary-deep">
                              Plot #{inq.plot_number_ref} · {inq.phase_name}
                            </h3>
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                              <MapPin size={13} className="text-accent" /> {inq.plot_size}
                            </p>
                          </div>

                          <span
                            className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                              remainingBalance === 0
                                ? "bg-green-100 text-green-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {remainingBalance === 0
                              ? "Paid In Full"
                              : `Installment Plan (${paidPct}% Paid)`}
                          </span>
                        </div>

                        {/* Financial Ledger Summary Bento */}
                        <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                              Total Plot Price
                            </span>
                            <span className="font-stat-lg text-lg font-extrabold text-primary-deep">
                              Ksh {inq.price.toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                              Total Paid So Far
                            </span>
                            <span className="font-stat-lg text-lg font-extrabold text-available">
                              Ksh {totalPaid.toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                              Remaining Balance
                            </span>
                            <span className="font-stat-lg text-lg font-extrabold text-accent">
                              Ksh {remainingBalance.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* Payment History — itemized, same successful payments already
                            summed above */}
                        {plotPayments.length > 0 && (
                          <div className="space-y-2">
                            <span className="text-xs font-bold text-primary-deep uppercase tracking-wider block">
                              Payment History
                            </span>
                            <div className="space-y-1.5">
                              {plotPayments
                                .slice()
                                .sort(
                                  (a, b) =>
                                    new Date(b.created_at).getTime() -
                                    new Date(a.created_at).getTime(),
                                )
                                .map((p) => (
                                  <div
                                    key={p.id}
                                    className="flex items-center justify-between text-xs p-2.5 bg-slate-50 rounded-lg border border-slate-100"
                                  >
                                    <span className="text-slate-600">
                                      {new Date(p.created_at).toLocaleDateString()}
                                    </span>
                                    <span className="font-mono text-[11px] text-slate-400">
                                      {p.paystack_reference}
                                    </span>
                                    <span className="font-bold text-primary-deep">
                                      Ksh {p.amount.toLocaleString()}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}

                        {/* 13-STAGE TITLE DEED CONVEYANCING PROGRESS RAIL */}
                        <div className="space-y-3 pt-2">
                          <span className="text-xs font-bold text-primary-deep uppercase tracking-wider block">
                            Title Deed Conveyancing Pipeline
                          </span>

                          {/* Next Step callout — derived from the same real
                              resolved stage, not fabricated */}
                          <div className="p-3.5 bg-accent/10 border border-accent/20 rounded-xl text-xs text-primary-deep font-medium">
                            <strong className="font-bold">Next step:</strong>{" "}
                            {currentStage === 10 && agreementSigned
                              ? "Your Agreement is signed. Your title is now being processed by the Lands Registry."
                              : NEXT_ACTION_BY_STAGE[currentStage]}
                          </div>

                          <div className="space-y-3">
                            {CONVEYANCING_13_STAGES.map((s) => {
                              // isCurrent takes precedence: currentStage is
                              // always the max of reachedStages, so it was
                              // always a member of "complete" too — checked
                              // in the wrong order before, which meant the
                              // "in progress" blue state could never render.
                              const isCurrent = s.stage === currentStage;
                              const isComplete = reachedStages.has(s.stage) && !isCurrent;

                              return (
                                <div
                                  key={s.stage}
                                  className={`p-3.5 rounded-xl border flex items-center gap-4 transition-all ${
                                    isCurrent
                                      ? "bg-blue-50 border-blue-200 text-blue-900 shadow-sm"
                                      : isComplete
                                        ? "bg-green-50/60 border-green-200 text-green-900"
                                        : "bg-slate-50 border-slate-200 text-slate-400"
                                  }`}
                                >
                                  <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                      isComplete
                                        ? "bg-green-500 text-white"
                                        : isCurrent
                                          ? "bg-blue-600 text-white"
                                          : "bg-slate-200 text-slate-600"
                                    }`}
                                  >
                                    {isComplete ? <Check size={16} /> : s.stage}
                                  </div>

                                  <div className="flex-1">
                                    <h4 className="font-bold text-xs">{s.label}</h4>
                                    <p className="text-[11px] text-slate-500 mt-0.5">{s.desc}</p>
                                  </div>

                                  {isCurrent && (
                                    <span className="px-2.5 py-1 bg-blue-600 text-white text-[10px] font-bold rounded-full uppercase tracking-wider animate-pulse">
                                      In Progress
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* In-Portal Installment Payment Button */}
                        {remainingBalance > 0 && (
                          <div className="pt-2 flex justify-end">
                            <button
                              onClick={() => openInstallmentModal(inq, remainingBalance)}
                              className="px-6 py-3 bg-primary hover:bg-primary-deep text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-md"
                            >
                              <CreditCard size={16} /> Pay Next Installment (Ksh{" "}
                              {Math.min(26667, remainingBalance).toLocaleString()})
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Right Column: Document Vault & Guided Site Visits */}
                <div className="lg:col-span-4 space-y-8">
                  {/* Document Vault */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                    <h3 className="font-serif font-bold text-xl text-primary-deep flex items-center gap-2">
                      <FolderOpen size={20} className="text-accent" /> Document Vault
                    </h3>

                    <div className="space-y-3">
                      {inquiries.map((inq) => {
                        const inqDocuments = documents.filter((d) => d.inquiry_id === inq.id);
                        return (
                          <div
                            key={inq.id}
                            className="space-y-2 pb-3 border-b border-slate-100 last:border-b-0"
                          >
                            <span className="text-[11px] font-bold text-slate-700 block">
                              Plot #{inq.plot_number_ref} Documents
                            </span>
                            <Link
                              to="/document/agreement/$id"
                              params={{ id: inq.id }}
                              className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              <span className="flex items-center gap-2">
                                <FileText size={16} className="text-primary" /> Purchase Agreement
                                PDF
                              </span>
                              <ArrowRight size={14} />
                            </Link>
                            <Link
                              to="/document/receipt/$id"
                              params={{ id: inq.id }}
                              className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              <span className="flex items-center gap-2">
                                <FileText size={16} className="text-available" /> Official Payment
                                Receipt
                              </span>
                              <ArrowRight size={14} />
                            </Link>
                            {inqDocuments.map((doc) => (
                              <button
                                key={doc.id}
                                onClick={() => viewPortalDocument(doc.id)}
                                disabled={viewingDocId === doc.id}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                              >
                                <span className="flex items-center gap-2">
                                  <FileText size={16} className="text-primary-deep" />{" "}
                                  {DOCUMENT_TYPE_LABEL[doc.document_type] ?? "Document"}
                                </span>
                                {viewingDocId === doc.id ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Eye size={14} />
                                )}
                              </button>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Virtual Tour — only if a real video exists for this
                      phase, no fabricated placeholder */}
                  {inquiries.some(
                    (inq) => phases.find((p) => p.id === inq.phase_id)?.youtube_video_url,
                  ) && (
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                      <h3 className="font-serif font-bold text-xl text-primary-deep flex items-center gap-2">
                        <Video size={20} className="text-accent" /> Virtual Tour
                      </h3>
                      {inquiries.map((inq) => {
                        const video = phases.find((p) => p.id === inq.phase_id)?.youtube_video_url;
                        if (!video) return null;
                        return (
                          <a
                            key={inq.id}
                            href={video}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            <span className="flex items-center gap-2">
                              <Video size={16} className="text-accent" /> {inq.phase_name} Virtual
                              Tour
                            </span>
                            <ArrowRight size={14} />
                          </a>
                        );
                      })}
                    </div>
                  )}

                  {/* Share Your Experience — only for deals that are fully
                      paid/finalized (agreements.ceo_signed), and only if this
                      client hasn't already submitted one for this deal */}
                  {inquiries
                    .filter(
                      (inq) =>
                        agreements.some((a) => a.inquiry_id === inq.id && a.ceo_signed) &&
                        (!testimonialFlags.some((t) => t.submitted_by_inquiry_id === inq.id) ||
                          justSubmittedIds.includes(inq.id)),
                    )
                    .map((inq) => (
                      <div
                        key={inq.id}
                        className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-3"
                      >
                        <h3 className="font-serif font-bold text-xl text-primary-deep flex items-center gap-2">
                          <MessageSquare size={20} className="text-accent" /> Share Your Experience
                        </h3>
                        {justSubmittedIds.includes(inq.id) ? (
                          <p className="text-xs text-primary-deep">
                            {testimonialMsg[inq.id] ||
                              "Thank you! Your testimonial is pending review."}
                          </p>
                        ) : (
                          <>
                            <p className="text-xs text-slate-500">
                              Congratulations on completing your purchase of Plot #
                              {inq.plot_number_ref}! We'd love a short testimonial — approved ones
                              are featured on our site.
                            </p>
                            <textarea
                              value={testimonialQuote[inq.id] || ""}
                              onChange={(e) =>
                                setTestimonialQuote((q) => ({ ...q, [inq.id]: e.target.value }))
                              }
                              rows={3}
                              placeholder="Tell us about your experience with Gatepath Realtors..."
                              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none resize-y"
                            />
                            {testimonialMsg[inq.id] && (
                              <p className="text-xs text-primary-deep">{testimonialMsg[inq.id]}</p>
                            )}
                            <button
                              onClick={() => submitTestimonial(inq.id)}
                              disabled={testimonialSaving === inq.id}
                              className="px-4 py-2 rounded-xl bg-accent text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
                            >
                              {testimonialSaving === inq.id && (
                                <Loader2 size={13} className="animate-spin" />
                              )}
                              Submit Testimonial
                            </button>
                          </>
                        )}
                      </div>
                    ))}

                  {/* Scheduled Site Visits */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                    <h3 className="font-serif font-bold text-xl text-primary-deep flex items-center gap-2">
                      <Calendar size={20} className="text-accent" /> Scheduled Visits
                    </h3>

                    {bookings.length === 0 ? (
                      <p className="text-xs text-slate-500">No active site visits scheduled.</p>
                    ) : (
                      bookings.map((b) => (
                        <div
                          key={b.id}
                          className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1"
                        >
                          <div className="flex justify-between font-bold">
                            <span className="text-primary-deep">Site Visit Scheduled</span>
                            <span className="text-green-600 uppercase">{b.status}</span>
                          </div>
                          <p className="text-slate-600">
                            Date: <strong>{b.visit_date || "Confirmed"}</strong> at{" "}
                            {b.visit_time || "Morning"}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      {/* IN-PORTAL PAYSTACK INSTALLMENT MODAL */}
      {payingInquiry && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setPayingInquiry(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>

            <div>
              <span className="text-[10px] font-bold text-accent uppercase tracking-wider block">
                IN-PORTAL PAYSTACK CHECKOUT
              </span>
              <h3 className="font-serif font-bold text-2xl text-primary-deep">Pay Installment</h3>
              <p className="text-xs text-slate-500 mt-1">
                Plot #{payingInquiry.plot_number_ref} · {payingInquiry.phase_name}
              </p>
            </div>

            {payError && (
              <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg">{payError}</div>
            )}

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Enter Payment Amount (Ksh)
              </label>
              <input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(Number(e.target.value))}
                className="w-full p-3.5 border border-slate-200 rounded-xl text-lg font-bold text-primary outline-none focus:border-primary"
              />
              <p className="text-[11px] text-slate-400">
                Suggested installment: <strong>Ksh {suggestedPayAmount.toLocaleString()}</strong>
              </p>
            </div>

            <div className="pt-2 flex justify-end gap-3">
              <button
                onClick={() => setPayingInquiry(null)}
                className="px-4 py-2.5 text-xs text-slate-500 font-bold hover:underline"
              >
                Cancel
              </button>
              <button
                onClick={executeInPortalPayment}
                disabled={payProcessing || payAmount <= 0}
                className="px-6 py-3 bg-primary hover:bg-primary-deep text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md"
              >
                {payProcessing ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  `Pay Ksh ${payAmount.toLocaleString()} via Paystack →`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
      <WhatsAppButton />
    </div>
  );
}
