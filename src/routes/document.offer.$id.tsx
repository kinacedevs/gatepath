/**
 * Gatepath Realtors — Offer Letter (Phase 7)
 *
 * Issued the moment the FIRST (deposit/reservation) payment on an inquiry is
 * verified — see paymentActions.ts's recordVerifiedPayment. This is a
 * genuinely different legal instrument from the Purchase/Sale Agreement
 * (document.agreement.$id.tsx), which only becomes valid once the client has
 * paid the full purchase price. Content below is transcribed from Gatepath's
 * actual signed Offer Letter template, not invented boilerplate — see
 * sections A–M, matching the template's own lettering.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Printer, ShieldCheck, ArrowLeft, Loader2, Award, AlertTriangle } from "lucide-react";
import logoIcon from "@/assets/logo-icon.png";
import { formatFromKes } from "@/lib/currency";
import type { Inquiry, Payment, Offer } from "@/lib/types";

export const Route = createFileRoute("/document/offer/$id")({
  component: OfferDocumentPage,
  head: () => ({
    meta: [
      { title: "Offer Letter — Gatepath Realtors" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function field(value: string | number | null | undefined) {
  return value === null || value === undefined || value === "" ? "—" : String(value);
}

function OfferDocumentPage() {
  const { id } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [brandingLogo, setBrandingLogo] = useState(logoIcon);
  const [companyBrandingName, setCompanyBrandingName] = useState("Gatepath Realtors Limited");
  const [data, setData] = useState<{
    inquiry: Inquiry;
    payment: Payment | null;
    offer: Offer | null;
    totalPaid: number;
  } | null>(null);

  useEffect(() => {
    async function loadOffer() {
      try {
        setLoading(true);

        const { data: inquiry, error: iError } = await (supabase as any)
          .from("inquiries")
          .select("*")
          .eq("id", id)
          .single();

        if (iError || !inquiry) {
          throw new Error("Offer letter details not found.");
        }

        const { data: brandingData } = await (supabase as any)
          .from("site_banners")
          .select("data")
          .eq("id", "custom_branding")
          .maybeSingle();

        if (brandingData?.data) {
          if (brandingData.data.logo_url) setBrandingLogo(brandingData.data.logo_url);
          if (brandingData.data.company_name) {
            setCompanyBrandingName(
              brandingData.data.company_name.toLowerCase().includes("limited")
                ? brandingData.data.company_name
                : `${brandingData.data.company_name} Limited`,
            );
          }
        }

        const { data: payment } = await (supabase as any)
          .from("payments")
          .select("*")
          .eq("inquiry_id", inquiry.id)
          .eq("status", "success")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        // inquiries.balance is only ever written at the FIRST payment
        // (paymentActions.ts's pricing lock-in) and never updated again for
        // later installments — the real, current balance is always price
        // minus everything actually paid so far, computed live.
        const { data: allPayments } = await (supabase as any)
          .from("payments")
          .select("amount")
          .eq("inquiry_id", inquiry.id)
          .eq("status", "success");
        const totalPaid = ((allPayments || []) as { amount: number }[]).reduce(
          (sum, p) => sum + Number(p.amount),
          0,
        );

        const { data: offer } = await (supabase as any)
          .from("offers")
          .select("*")
          .eq("inquiry_id", inquiry.id)
          .maybeSingle();

        setData({ inquiry, payment: payment || null, offer: offer || null, totalPaid });
      } catch (err: any) {
        setError(err.message || "Failed to load document.");
      } finally {
        setLoading(false);
      }
    }

    loadOffer();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory">
        <div className="text-center">
          <Loader2 className="animate-spin text-primary mx-auto mb-4" size={40} />
          <p className="text-muted-foreground font-medium">Generating offer letter...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory px-6">
        <div className="bg-white max-w-md w-full p-8 rounded-xl border border-[#E5E0D8] text-center shadow-xl">
          <AlertTriangle className="mx-auto text-red-600" size={40} strokeWidth={1.75} />
          <h2 className="font-serif font-bold text-2xl text-red-600 mt-4">Document Error</h2>
          <p className="text-muted-foreground mt-2 text-[14px]">
            {error || "Unable to display offer letter details."}
          </p>
          <Link
            to="/"
            className="mt-6 inline-block w-full py-2.5 bg-primary text-white rounded-lg font-semibold text-[13px]"
          >
            Back to Safety
          </Link>
        </div>
      </div>
    );
  }

  const { inquiry, payment, offer, totalPaid } = data;
  const isCeoSigned = offer?.ceo_signed || false;

  const handlePrint = () => window.print();

  const offerDate = new Date(offer?.created_at ?? payment?.created_at ?? inquiry.created_at);
  const formattedDate = offerDate.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const propertyLabel = `${inquiry.phase_name ?? "Gatepath Project"}${
    inquiry.plot_number_ref ? ` — Plot #${inquiry.plot_number_ref}` : ""
  }`;
  const price = inquiry.price ?? 0;
  const discount = inquiry.discount ?? 0;
  const balance = Math.max(price - discount - totalPaid, 0);
  const depositAmount = payment?.amount ?? inquiry.deposit ?? 0;
  const isInstallment = inquiry.terms_of_payment === "installment";

  return (
    <div className="min-h-screen bg-[#F3EFE9] py-12 px-4 md:px-8 font-sans antialiased text-foreground print:bg-white print:py-0 print:px-0">
      <div className="max-w-3xl mx-auto mb-6 flex justify-between items-center no-print">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-[13px] font-semibold text-primary hover:text-[#06243A]"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-primary text-white py-2 px-5 rounded-lg font-semibold text-[13px] hover:bg-[#06243A] shadow-md transition-all"
        >
          <Printer size={16} /> Print or Save as PDF
        </button>
      </div>

      <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-[#E5E0D8] p-10 md:p-16 shadow-2xl relative print:border-none print:shadow-none print:p-0">
        {/* Header */}
        <div className="text-center pb-8 border-b border-[#E5E0D8] mb-10">
          <img src={brandingLogo} alt="Logo" className="w-16 h-16 object-contain mx-auto mb-4" />
          <p className="text-[11px] uppercase tracking-wider text-accent font-semibold">
            {companyBrandingName} · Ruiru Kihunguro, CNM Centre · P.O Box 10990-0400
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            info@gatepathrealtors.com · www.gatepathrealtors.com · 0799-488-488 / 0746-355-125
          </p>
          <h1 className="font-serif font-bold text-2xl text-primary tracking-tight uppercase mt-4">
            Offer Letter
          </h1>
        </div>

        <div className="space-y-5 text-[14px] leading-relaxed text-[#3A3A3A] font-serif">
          <p>
            <strong>DATE:</strong> {formattedDate}
          </p>
          <p>
            <strong>NAME:</strong> {inquiry.client_full_name}
          </p>
          <p>
            <strong>DEAR</strong> {inquiry.client_full_name.split(" ")[0]},
          </p>
          <p>
            <strong>SUBJECT: SALE OFFER FOR</strong> {propertyLabel}.
          </p>
          <p className="italic">Our Offer:</p>
          <p>
            We confirm that we are willing to sell you the property above subject to the following
            terms and conditions:
          </p>

          <p>
            <strong>A. THE VENDOR:</strong> {companyBrandingName.toUpperCase()}
          </p>
          <p>
            <strong>B. THE BUYER:</strong> {inquiry.client_full_name}
          </p>

          <p className="font-semibold uppercase tracking-wide text-[#06243A]">Personal Details</p>
          <table className="w-full border-collapse text-[13px]">
            <tbody>
              <tr>
                <td className="border border-[#E5E0D8] p-2 w-1/3">
                  <strong>Name:</strong> {field(inquiry.client_full_name)}
                </td>
                <td className="border border-[#E5E0D8] p-2 w-1/3">
                  <strong>ID Number:</strong> {field(inquiry.client_id_passport)}
                </td>
                <td className="border border-[#E5E0D8] p-2 w-1/3">
                  <strong>Phone:</strong> {field(inquiry.client_phone)}
                </td>
              </tr>
              <tr>
                <td className="border border-[#E5E0D8] p-2">
                  <strong>Email:</strong> {field(inquiry.client_email)}
                </td>
                <td className="border border-[#E5E0D8] p-2">
                  <strong>Country:</strong> {field(inquiry.client_country)}
                </td>
                <td className="border border-[#E5E0D8] p-2">
                  <strong>KRA PIN:</strong> {field(inquiry.client_kra_pin)}
                </td>
              </tr>
              <tr>
                <td className="border border-[#E5E0D8] p-2">
                  <strong>Occupation:</strong> {field(inquiry.client_occupation)}
                </td>
                <td className="border border-[#E5E0D8] p-2">
                  <strong>County:</strong> {field(inquiry.client_county)}
                </td>
                <td className="border border-[#E5E0D8] p-2">
                  <strong>City:</strong> {field(inquiry.client_city)}
                </td>
              </tr>
            </tbody>
          </table>

          <p className="font-semibold uppercase tracking-wide text-[#06243A] pt-2">Next of Kin</p>
          <table className="w-full border-collapse text-[13px]">
            <tbody>
              <tr>
                <td className="border border-[#E5E0D8] p-2 w-1/3">
                  <strong>Name:</strong> {field(inquiry.kin_full_name)}
                </td>
                <td className="border border-[#E5E0D8] p-2 w-1/3">
                  <strong>ID Number:</strong> {field(inquiry.kin_id_passport)}
                </td>
                <td className="border border-[#E5E0D8] p-2 w-1/3">
                  <strong>Phone:</strong> {field(inquiry.kin_phone)}
                </td>
              </tr>
              <tr>
                <td className="border border-[#E5E0D8] p-2">
                  <strong>Relationship:</strong> {field(inquiry.kin_relationship)}
                </td>
                <td className="border border-[#E5E0D8] p-2">
                  <strong>Country of Residence:</strong> {field(inquiry.kin_country_of_residence)}
                </td>
                <td className="border border-[#E5E0D8] p-2">
                  <strong>KRA PIN:</strong> {field(inquiry.kin_kra_pin)}
                </td>
              </tr>
              <tr>
                <td className="border border-[#E5E0D8] p-2">
                  <strong>Occupation:</strong> {field(inquiry.kin_occupation)}
                </td>
                <td className="border border-[#E5E0D8] p-2">
                  <strong>County:</strong> {field(inquiry.kin_county)}
                </td>
                <td className="border border-[#E5E0D8] p-2">
                  <strong>City:</strong> {field(inquiry.kin_city)}
                </td>
              </tr>
            </tbody>
          </table>

          <p className="font-semibold uppercase tracking-wide text-[#06243A] pt-2">Others</p>
          <p>
            <strong>Client Agent/CRO:</strong> {field(inquiry.cro_name)}{" "}
            <strong className="ml-4">Channel of Reach:</strong> {field(inquiry.cro_phone)}
          </p>

          <p>
            <strong>C. Property on Sale:</strong> Sale offer for {propertyLabel}
          </p>
          <table className="w-full border-collapse text-[13px]">
            <tbody>
              <tr>
                <td className="border border-[#E5E0D8] p-2 w-1/3">
                  <strong>Price:</strong> {formatFromKes(price, "KES")}
                </td>
                <td className="border border-[#E5E0D8] p-2 w-1/3">
                  <strong>Discount:</strong> {formatFromKes(discount, "KES")}
                </td>
                <td className="border border-[#E5E0D8] p-2 w-1/3">
                  <strong>Balance:</strong> {formatFromKes(balance, "KES")}
                </td>
              </tr>
            </tbody>
          </table>

          <p>
            <strong>E. Payment Plan:</strong> Payment Option:{" "}
            <strong>{isInstallment ? "Installments" : "Cash"}</strong>
          </p>
          <table className="w-full border-collapse text-[13px]">
            <tbody>
              <tr>
                <td className="border border-[#E5E0D8] p-2 w-1/3">
                  <strong>Deposit Date:</strong>{" "}
                  {payment ? new Date(payment.created_at).toLocaleDateString("en-KE") : "—"}
                </td>
                <td className="border border-[#E5E0D8] p-2 w-1/3">
                  <strong>Deposit KSH:</strong> {formatFromKes(depositAmount, "KES")}
                </td>
                <td className="border border-[#E5E0D8] p-2 w-1/3">
                  <strong>Balance KSH:</strong> {formatFromKes(balance, "KES")}
                </td>
              </tr>
            </tbody>
          </table>

          <p>
            <strong>F. Other Costs:</strong> Price inclusive of all incidental costs save for
            Capital Gains Tax including but not limited to Valuation Costs, Stamp Duty &amp;
            Registration Costs.
          </p>
          <p>
            <strong>G. Preparation of Documents:</strong> The Vendor's advocates will prepare a
            sales agreement which the Purchaser(s) will be required to execute and return to the
            Vendor or the vendors' advocates within seven (7) days.
          </p>
          <p>
            <strong>H. Confirmation:</strong> Through execution of this Letter of Offer the
            Purchaser (through himself/herself and/or through his/her Advocates) confirms that they
            have read and understood the contents hereof and has signed voluntarily.
          </p>
          <p>
            <strong>I. Non-Completion:</strong> Suppose the Purchaser cannot complete the sale
            transaction for any reason save for default on the part of the Vendor. In that case, the
            Vendor shall be entitled to rescind the Agreement for Sale. The Purchaser shall forfeit
            from the deposit equivalent to <strong>10%</strong> of the purchase price as agreed
            liquidated damages and shall in addition pay the Vendor's advocates fees &amp; any costs
            incurred by the Vendor or by its advocates in respect of the failed transaction. The
            balance of the deposit after deduction of the above sum shall be refunded to Purchaser.
          </p>

          <p className="font-semibold uppercase tracking-wide text-[#06243A] pt-2">
            Vendor's Account Details
          </p>
          <div className="pl-4 space-y-1 text-[13px]">
            <p>Bank: Family Bank Ltd — Bank Code: 70</p>
            <p>Branch: Dagoretti Branch — Branch Code: 021</p>
            <p>Account Number: 021000035032</p>
            <p>Account Name: Gatepath Realtors Limited</p>
            <p>Swift Code: FABLKENA</p>
            <p>Mpesa Paybill: 222 111 — Account Number: 4884880</p>
          </div>
          <p>
            <strong>J. NB:</strong> Address all cheques to Gatepath Realtors Limited.
          </p>

          <p className="font-semibold uppercase tracking-wide text-[#06243A] pt-2">
            K. Terms &amp; Conditions
          </p>
          <div className="pl-4 space-y-2 text-[13px]">
            <p>
              1. Cash Option Terms: The client will pay at least the agreed deposit on or before
              signing the offer letter agreement.
            </p>
            <p>
              2. Installment Option Terms: The client is required to make monthly installment
              payments as per the agreement.
            </p>
            <p>
              3. Refund Terms: We will initiate the Client to make a formal refund request by
              filling in a client refund form. We will deduct 10% from the payment made being
              administrative cost if the payment was cash and 30% from the payment if the payment
              was installments.
            </p>
          </div>

          <p>
            <strong>L. Title Deed:</strong> The above-mentioned price includes legal fees, stamp
            duty, and other related costs WE may incur in transferring the Title deed from our name
            to the Client's preferred name. We will transfer the Title deed within 90 working days
            upon the Client making the 100% and above payments. Where the client shows good
            consistency in the payments, the vendor may start the transfer process after the client
            hits 70+ (%) of the above payments.
          </p>

          <p>
            <strong>M. Acceptance:</strong> I/ {inquiry.client_full_name} of ID Number{" "}
            {field(inquiry.client_id_passport)} the undersigned, confirm my acceptance of the above
            terms and conditions.
          </p>
        </div>

        {/* Execution Block */}
        <div className="mt-16 pt-8 border-t border-[#E5E0D8]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-4">
            <div className="flex flex-col items-center md:items-start text-center md:text-left relative">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-4">
                For and on behalf of Gatepath Realtors Limited
              </p>
              {isCeoSigned ? (
                <div className="relative mb-4">
                  <div className="border-2 border-dashed border-accent text-accent px-6 py-3 rounded-xl bg-white rotate-[-2deg] flex flex-col items-center max-w-xs shadow-md">
                    <Award className="text-accent mb-1" size={24} />
                    <span className="font-bold text-[13px]">Joseph Muchiri</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">Director</span>
                    <span className="text-[8px] font-mono text-muted-foreground mt-0.5">
                      Verified Code: {offer!.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className="text-[8px] font-mono text-muted-foreground">
                      Date: {new Date(offer!.ceo_signed_at!).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-28 border border-dashed border-[#D5D0C8] rounded-xl flex items-center justify-center bg-[#FDFCF9] w-48 text-muted-foreground text-[12px] italic mb-4">
                  Awaiting CEO Signature
                </div>
              )}
              <p className="font-bold text-[14px]">Joseph Muchiri</p>
              <p className="text-[12px] text-muted-foreground">Director</p>
            </div>

            <div className="flex flex-col items-center md:items-end text-center md:text-right">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-4">
                Client Sign
              </p>
              <div className="h-28 border border-dashed border-available/30 bg-available/5 rounded-xl flex flex-col items-center justify-center w-48 text-available text-[12px] font-semibold mb-4 px-3">
                <ShieldCheck size={28} className="mb-1" />
                <span>Authorized Online</span>
                <span className="text-[9px] font-mono text-muted-foreground mt-0.5 font-normal">
                  {payment ? "Verified via Paystack" : "Awaiting Deposit"}
                </span>
                <span className="text-[9px] font-mono text-muted-foreground font-normal">
                  Date: {formattedDate}
                </span>
              </div>
              <p className="font-bold text-[14px]">{inquiry.client_full_name}</p>
              <p className="text-[12px] text-muted-foreground">Client</p>
            </div>
          </div>
        </div>

        <div className="text-center mt-16 pt-6 border-t border-[#F5F0E8] text-[11px] text-muted-foreground">
          <p>Yours Faithfully — {companyBrandingName}.</p>
          <p className="mt-1">© {companyBrandingName}. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
