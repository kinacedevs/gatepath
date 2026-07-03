import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Printer, ShieldCheck, ArrowLeft, Loader2 } from "lucide-react";
import logoIcon from "@/assets/logo-icon.png";

export const Route = createFileRoute("/document/receipt/$id")({
  component: ReceiptDocumentPage,
  head: () => ({
    meta: [
      { title: "Official Payment Receipt — Gatepath Realtors" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function ReceiptDocumentPage() {
  const { id } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    payment: any;
    inquiry: any;
    agreement: any;
  } | null>(null);

  useEffect(() => {
    async function loadReceipt() {
      try {
        setLoading(true);
        // Fetch payment details
        const { data: payment, error: pError } = await supabase
          .from("payments")
          .select("*")
          .eq("id", id)
          .single();

        if (pError || !payment) {
          throw new Error("Payment record not found.");
        }

        // Fetch associated inquiry
        const { data: inquiry, error: iError } = await supabase
          .from("inquiries")
          .select("*")
          .eq("id", payment.inquiry_id)
          .single();

        if (iError || !inquiry) {
          throw new Error("Associated inquiry details not found.");
        }

        // Fetch optional signed agreement
        const { data: agreement } = await supabase
          .from("agreements")
          .select("*")
          .eq("payment_id", payment.id)
          .single();

        setData({ payment, inquiry, agreement: agreement || null });
      } catch (err: any) {
        setError(err.message || "Failed to load document.");
      } finally {
        setLoading(false);
      }
    }

    loadReceipt();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F4EE]">
        <div className="text-center">
          <Loader2 className="animate-spin text-[#0B7FC7] mx-auto mb-4" size={40} />
          <p className="text-[#5A5A5A] font-medium">Retrieving secure document...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F4EE] px-6">
        <div className="bg-white max-w-md w-full p-8 rounded-xl border border-[#E5E0D8] text-center shadow-xl">
          <span className="text-4xl">⚠️</span>
          <h2 className="font-serif font-bold text-2xl text-red-600 mt-4">Document Error</h2>
          <p className="text-[#5A5A5A] mt-2 text-[14px]">{error || "Unable to display receipt details."}</p>
          <Link
            to="/"
            className="mt-6 inline-block w-full py-2.5 bg-[#0B7FC7] text-white rounded-lg font-semibold text-[13px]"
          >
            Back to Safety
          </Link>
        </div>
      </div>
    );
  }

  const { payment, inquiry, agreement } = data;
  const isCeoSigned = agreement?.ceo_signed || false;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#F3EFE9] py-12 px-4 md:px-8 font-sans antialiased text-[#1C1C1C] print:bg-white print:py-0 print:px-0">
      {/* Print Controls (Hidden on Print) */}
      <div className="max-w-3xl mx-auto mb-6 flex justify-between items-center no-print">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-[13px] font-semibold text-[#0B7FC7] hover:text-[#06243A]"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-[#0B7FC7] text-white py-2 px-5 rounded-lg font-semibold text-[13px] hover:bg-[#06243A] shadow-md transition-all"
        >
          <Printer size={16} /> Print or Save as PDF
        </button>
      </div>

      {/* Corporate Receipt Paper */}
      <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-[#E5E0D8] p-8 md:p-12 shadow-2xl relative overflow-hidden print:border-none print:shadow-none print:p-0">
        
        {/* Subtle Watermark logo background */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none">
          <img src={logoIcon} alt="" className="w-96 h-96 object-contain" />
        </div>

        {/* Receipt Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-8 border-b border-[#E5E0D8]">
          <div className="flex items-center gap-3">
            <img src={logoIcon} alt="Logo" className="w-12 h-12 object-contain" />
            <div>
              <h1 className="font-serif font-bold text-xl md:text-2xl text-[#0B7FC7] tracking-tight">
                GATEPATH REALTORS
              </h1>
              <p className="text-[11px] uppercase tracking-wider text-[#E8A020] font-semibold">
                Your Interest is Our Priority
              </p>
            </div>
          </div>
          <div className="mt-4 md:mt-0 text-left md:text-right">
            <h2 className="font-serif font-bold text-2xl text-[#06243A]">PAYMENT RECEIPT</h2>
            <p className="text-[12px] text-muted-foreground mt-1">
              Date: {new Date(payment.created_at).toLocaleDateString("en-KE", { dateStyle: "long" })}
            </p>
            <p className="text-[12px] text-[#E8A020] font-mono mt-0.5">
              Ref: {payment.paystack_reference}
            </p>
          </div>
        </div>

        {/* Corporate Address & Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-8 text-[13px] border-b border-[#E5E0D8] relative z-10">
          <div>
            <h3 className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider mb-2">
              ISSUED BY
            </h3>
            <p className="font-semibold text-[#0B7FC7]">Gatepath Realtors Limited</p>
            <p className="text-muted-foreground mt-1">1st Floor, CNM Centre,</p>
            <p className="text-muted-foreground">Ruiru Eastern Bypass, Nairobi, Kenya</p>
            <p className="text-muted-foreground mt-1">Phone: +254 799 488 488</p>
            <p className="text-muted-foreground">Email: sales@gatepathrealtors.com</p>
          </div>
          <div>
            <h3 className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider mb-2">
              RECEIVED FROM (BUYER)
            </h3>
            <p className="font-semibold">{inquiry.client_full_name}</p>
            <p className="text-muted-foreground mt-1">Email: {inquiry.client_email}</p>
            <p className="text-muted-foreground">Phone: {inquiry.client_phone}</p>
            <p className="text-muted-foreground mt-1">
              ID / Passport No: <span className="font-mono">{inquiry.client_id_passport}</span>
            </p>
            {inquiry.client_kra_pin && (
              <p className="text-muted-foreground">
                KRA PIN: <span className="font-mono">{inquiry.client_kra_pin}</span>
              </p>
            )}
          </div>
        </div>

        {/* Plot and Payment Specifications */}
        <div className="py-8 relative z-10">
          <h3 className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider mb-4">
            TRANSACTION DETAILS
          </h3>
          <table className="w-full text-[13px] text-left">
            <thead>
              <tr className="border-b border-[#E5E0D8] text-muted-foreground">
                <th className="pb-3 font-semibold">Description</th>
                <th className="pb-3 font-semibold text-right">Property Details</th>
                <th className="pb-3 font-semibold text-right">Payment Info</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5F0E8]">
              <tr>
                <td className="py-4">
                  <span className="font-semibold text-[#0B7FC7]">Property Reservation Deposit</span>
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    Deposit to lock Plot #{inquiry.plot_number}
                  </p>
                </td>
                <td className="py-4 text-right">
                  <span className="font-medium">{inquiry.phase_name}</span>
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    Size: {inquiry.plot_size || "1/8th Acre"}
                  </p>
                </td>
                <td className="py-4 text-right font-mono font-semibold">
                  KES {Number(payment.amount).toLocaleString()}
                </td>
              </tr>
              {payment.loan_period_months > 0 && (
                <tr className="bg-[#FDFCF9]">
                  <td className="py-3" colSpan={2}>
                    <span className="text-muted-foreground text-[12px]">
                      Payment Plan Option selected: <strong>{payment.loan_period_months} Months In-House Installments</strong>
                    </span>
                  </td>
                  <td className="py-3 text-right text-[12px] font-mono text-muted-foreground">
                    Bal: KES {(inquiry.plot_price - payment.amount).toLocaleString()}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Transaction Summary Box */}
        <div className="bg-[#06243A] text-white rounded-xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center relative z-10">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-rgba(255,255,255,0.6) font-medium">
              Payment Method
            </p>
            <p className="font-semibold text-[15px] mt-1 capitalize">
              {payment.payment_method || "Paystack Web Gateway"}
            </p>
          </div>
          <div className="mt-4 md:mt-0 text-left md:text-right">
            <p className="text-[11px] uppercase tracking-wider text-rgba(255,255,255,0.6) font-medium">
              Amount Paid
            </p>
            <p className="font-serif font-bold text-2xl text-[#E8A020] mt-1">
              KES {Number(payment.amount).toLocaleString()}
            </p>
          </div>
        </div>

        {/* E-Signature & Audit Stamps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-10 mt-8 border-t border-[#E5E0D8] relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#22C55E]/10 rounded-full text-[#22C55E]">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h4 className="font-semibold text-[13px] text-[#22C55E] flex items-center gap-1">
                Transaction Verified ✓
              </h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Authorized by Paystack API. Settlement Reference recorded in Gatepath Registry.
              </p>
            </div>
          </div>

          <div className="text-left md:text-right flex flex-col items-start md:items-end justify-center">
            {isCeoSigned ? (
              <div className="relative">
                {/* Gold CEO Stamp mock */}
                <div className="border-2 border-dashed border-[#E8A020] text-[#E8A020] px-4 py-2 rounded-lg text-center rotate-[-3deg] uppercase font-bold text-[11px] tracking-wider bg-white">
                  <div>Joe Muchiri</div>
                  <div className="text-[9px] font-normal text-muted-foreground mt-0.5">CEO / MD, Gatepath</div>
                  <div className="text-[8px] font-mono text-muted-foreground mt-0.5">
                    SIGNED: {new Date(agreement.ceo_signed_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-[#D5D0C8] text-muted-foreground px-4 py-2 rounded-lg text-center uppercase font-semibold text-[11px] tracking-wider bg-[#FDFCF9]">
                Verification Pending Signature
              </div>
            )}
          </div>
        </div>

        {/* Document Footer Note */}
        <div className="text-center mt-12 pt-6 border-t border-[#F5F0E8] text-[11px] text-muted-foreground">
          <p>This is a system generated secure transaction receipt. No physical signature required.</p>
          <p className="mt-1">Gatepath Realtors Limited. Registered under the Companies Act of Kenya.</p>
        </div>
      </div>
    </div>
  );
}
