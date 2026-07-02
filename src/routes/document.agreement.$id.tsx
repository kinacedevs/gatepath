import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Printer, ShieldCheck, ArrowLeft, Loader2, Award } from "lucide-react";
import logoIcon from "@/assets/logo-icon.png";

export const Route = createFileRoute("/document/agreement/$id")({
  component: AgreementDocumentPage,
  head: () => ({
    meta: [
      { title: "Purchase Agreement of Sale — Gatepath Realtors" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function AgreementDocumentPage() {
  const { id } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    inquiry: any;
    payment: any;
    agreement: any;
  } | null>(null);

  useEffect(() => {
    async function loadAgreement() {
      try {
        setLoading(true);

        // Fetch associated inquiry
        const { data: inquiry, error: iError } = await supabase
          .from("inquiries")
          .select("*")
          .eq("id", id)
          .single();

        if (iError || !inquiry) {
          throw new Error("Agreement details not found.");
        }

        // Fetch associated payment
        const { data: payment } = await supabase
          .from("payments")
          .select("*")
          .eq("inquiry_id", inquiry.id)
          .eq("status", "success")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Fetch signed agreement
        const { data: agreement, error: aError } = await supabase
          .from("agreements")
          .select("*")
          .eq("inquiry_id", inquiry.id)
          .maybeSingle();

        setData({ inquiry, payment: payment || null, agreement: agreement || null });
      } catch (err: any) {
        setError(err.message || "Failed to load document.");
      } finally {
        setLoading(false);
      }
    }

    loadAgreement();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F4EE]">
        <div className="text-center">
          <Loader2 className="animate-spin text-[#0B7FC7] mx-auto mb-4" size={40} />
          <p className="text-[#5A5A5A] font-medium">Generating legal agreement...</p>
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
          <p className="text-[#5A5A5A] mt-2 text-[14px]">{error || "Unable to display purchase agreement details."}</p>
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

  const { inquiry, payment, agreement } = data;
  const isCeoSigned = agreement?.ceo_signed || false;

  const handlePrint = () => {
    window.print();
  };

  const today = new Date(inquiry.created_at);
  const formattedDate = today.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

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

      {/* Legal Agreement Paper */}
      <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-[#E5E0D8] p-10 md:p-16 shadow-2xl relative print:border-none print:shadow-none print:p-0">
        
        {/* Header */}
        <div className="text-center pb-8 border-b border-[#E5E0D8] mb-10">
          <img src={logoIcon} alt="Logo" className="w-16 h-16 object-contain mx-auto mb-4" />
          <h1 className="font-serif font-bold text-2xl text-[#0B7FC7] tracking-tight uppercase">
            Agreement for Sale of Land
          </h1>
          <p className="text-[11px] uppercase tracking-wider text-[#E8A020] font-semibold mt-1">
            Gatepath Realtors Limited
          </p>
        </div>

        {/* Legal Preamble */}
        <div className="space-y-6 text-[14px] leading-relaxed text-[#3A3A3A] font-serif">
          <p className="font-semibold text-center italic">
            This agreement is made and entered into on this {formattedDate}.
          </p>

          <p>
            <strong>BETWEEN:</strong>
          </p>
          <div className="pl-6 border-l-2 border-[#E8A020]">
            <p>
              <strong>GATEPATH REALTORS LIMITED</strong>, a company incorporated in the Republic of Kenya with its
              registered office at Bruce House, 12th Floor, Standard St., P.O. Box 488-00100, Nairobi, Kenya
              (hereinafter referred to as the <strong>"Vendor"</strong>, which expression shall where the context so
              admits include its successors and assigns) of the one part;
            </p>
          </div>

          <p>
            <strong>AND:</strong>
          </p>
          <div className="pl-6 border-l-2 border-[#0B7FC7]">
            <p>
              <strong>{inquiry.client_full_name}</strong> of ID/Passport number{" "}
              <span className="font-semibold font-mono">{inquiry.client_id_passport}</span>, of Postal Address{" "}
              <span>{inquiry.client_postal_address || "N/A"}</span> and email address{" "}
              <span className="font-semibold">{inquiry.client_email}</span> (hereinafter referred to as the{" "}
              <strong>"Purchaser"</strong>, which expression shall include their personal representatives and
              permitted assigns) of the other part.
            </p>
          </div>

          <p className="pt-4 font-semibold text-center uppercase tracking-wider text-[#06243A]">
            WHEREAS:
          </p>
          <p>
            The Vendor is the registered owner and proprietor of all that parcel of land known as{" "}
            <strong>{inquiry.phase_name}</strong> (hereinafter referred to as the "Property").
          </p>
          <p>
            The Vendor has agreed to sell and the Purchaser has agreed to purchase a portion of the Property,
            specifically designated as <strong>Plot Number {inquiry.plot_number}</strong> measuring approximately{" "}
            <strong>{inquiry.plot_size || "1/8th Acre"}</strong>, on the terms and conditions hereinafter
            contained.
          </p>

          <p className="pt-4 font-semibold text-center uppercase tracking-wider text-[#06243A]">
            IT IS HEREBY AGREED AS FOLLOWS:
          </p>

          <div className="space-y-4">
            <p>
              <strong>1. PURCHASE PRICE AND TERMS OF PAYMENT</strong>
            </p>
            <div className="pl-4 space-y-2">
              <p>
                1.1. The total purchase price for the Plot is KES{" "}
                <span className="font-semibold">{Number(inquiry.plot_price).toLocaleString()}</span> (Kenya
                Shillings {inquiry.plot_price.toLocaleString()}).
              </p>
              <p>
                1.2. The Purchaser has paid a deposit of KES{" "}
                <span className="font-semibold">
                  {payment ? Number(payment.amount).toLocaleString() : Number(inquiry.deposit).toLocaleString()}
                </span>{" "}
                representing a commitment to purchase.
              </p>
              {inquiry.payment_period_months > 0 ? (
                <p>
                  1.3. The remaining balance of KES{" "}
                  <span className="font-semibold">
                    {Number(inquiry.plot_price - (payment?.amount || inquiry.deposit)).toLocaleString()}
                  </span>{" "}
                  shall be paid in monthly installments of KES{" "}
                  <span className="font-semibold">{Number(inquiry.monthly_payment).toLocaleString()}</span> over a
                  period of <strong>{inquiry.payment_period_months} months</strong>.
                </p>
              ) : (
                <p>1.3. The balance purchase price shall be paid in full upon issuance of the Title Deed.</p>
              )}
            </div>

            <p>
              <strong>2. TRANSFER OF TITLE AND COMPLETION</strong>
            </p>
            <div className="pl-4 space-y-2">
              <p>
                2.1. Upon completion of payment of the full purchase price, the Vendor shall execute the Transfer
                documents and deliver to the Purchaser the original Title Deed in respect of the Plot.
              </p>
              <p>
                2.2. All legal fees, stamp duty, and registration charges associated with the transfer of the Title
                Deed shall be borne by the Purchaser unless stated otherwise.
              </p>
            </div>

            <p>
              <strong>3. COVENANTS BY THE VENDOR</strong>
            </p>
            <div className="pl-4 space-y-2">
              <p>
                3.1. The Vendor covenants that it has good and lawful title to the Property and has full power to
                sell and transfer the same.
              </p>
              <p>
                3.2. The Vendor shall deliver the Plot to the Purchaser free from all encumbrances, charges, or
                disputes.
              </p>
            </div>

            <p>
              <strong>4. DISPUTE RESOLUTION</strong>
            </p>
            <p className="pl-4">
              Any dispute arising out of or in connection with this Agreement shall be resolved amicably through
              mediation in Nairobi, Kenya. If mediation fails, the dispute shall be referred to arbitration in
              accordance with the Arbitration Act of Kenya.
            </p>
          </div>
        </div>

        {/* Execution Block */}
        <div className="mt-16 pt-8 border-t border-[#E5E0D8]">
          <h3 className="font-serif font-bold text-center text-lg text-[#06243A] mb-8">
            IN WITNESS WHEREOF the parties hereto have executed this Agreement:
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-10">
            {/* Seller */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left relative">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-4">
                SIGNED FOR AND ON BEHALF OF THE VENDOR:
              </p>
              {isCeoSigned ? (
                <div className="relative mb-4">
                  {/* Digital Signature Badge */}
                  <div className="border-2 border-dashed border-[#E8A020] text-[#E8A020] px-6 py-3 rounded-xl bg-white rotate-[-2deg] flex flex-col items-center max-w-xs shadow-md">
                    <Award className="text-[#E8A020] mb-1" size={24} />
                    <span className="font-bold text-[13px]">Joe Muchiri</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">Managing Director, Gatepath</span>
                    <span className="text-[8px] font-mono text-muted-foreground mt-0.5">
                      Verified Code: {agreement.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className="text-[8px] font-mono text-muted-foreground">
                      Date: {new Date(agreement.ceo_signed_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-28 border border-dashed border-[#D5D0C8] rounded-xl flex items-center justify-center bg-[#FDFCF9] w-48 text-muted-foreground text-[12px] italic mb-4">
                  Awaiting CEO Signature
                </div>
              )}
              <p className="font-bold text-[14px]">Gatepath Realtors Limited</p>
              <p className="text-[12px] text-muted-foreground">Represented by: Joe Muchiri</p>
            </div>

            {/* Buyer */}
            <div className="flex flex-col items-center md:items-end text-center md:text-right">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-4">
                SIGNED BY THE PURCHASER:
              </p>
              <div className="h-28 border border-dashed border-[#22C55E]/30 bg-[#22C55E]/5 rounded-xl flex flex-col items-center justify-center w-48 text-[#22C55E] text-[12px] font-semibold mb-4 px-3">
                <ShieldCheck size={28} className="mb-1" />
                <span>Authorized Online</span>
                <span className="text-[9px] font-mono text-muted-foreground mt-0.5 font-normal">
                  IP: {payment ? "Verified via Paystack" : "Staged Inquiry"}
                </span>
                <span className="text-[9px] font-mono text-muted-foreground font-normal">
                  Date: {formattedDate}
                </span>
              </div>
              <p className="font-bold text-[14px]">{inquiry.client_full_name}</p>
              <p className="text-[12px] text-muted-foreground">Purchaser</p>
            </div>
          </div>
        </div>

        {/* Legal Disclaimer */}
        <div className="text-center mt-16 pt-6 border-t border-[#F5F0E8] text-[11px] text-muted-foreground">
          <p>This is a secure electronic purchase agreement generated in accordance with the Laws of Kenya.</p>
          <p className="mt-1">© Gatepath Realtors Limited. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
