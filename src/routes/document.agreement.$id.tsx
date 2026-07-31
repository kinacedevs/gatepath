/**
 * Gatepath Realtors — Purchase/Sale Agreement (Phase 7 rewrite)
 *
 * Only a valid document once the client has paid the FULL purchase price —
 * see paymentActions.ts's recordVerifiedPayment, which now only creates the
 * `agreements` row once cumulative successful payments reach inquiries.price
 * (previously it fired on every payment, including the very first deposit,
 * which is wrong: a deposit issues an Offer Letter — document.offer.$id.tsx
 * — not this document).
 *
 * Clause text below is transcribed from Gatepath's actual signed
 * Purchase/Sale Agreement template, not invented legal boilerplate. Clause
 * 17 (Interest) is transcribed verbatim including the source template's own
 * internal inconsistency ("amended to read Twelve Percent (18%)") — the
 * document itself is the source of truth, not an editorial correction.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Printer, ShieldCheck, ArrowLeft, Loader2, Award, AlertTriangle } from "lucide-react";
import logoIcon from "@/assets/logo-icon.png";
import { formatFromKes } from "@/lib/currency";
import type { Inquiry, Payment, Agreement } from "@/lib/types";

export const Route = createFileRoute("/document/agreement/$id")({
  component: AgreementDocumentPage,
  head: () => ({
    meta: [
      { title: "Purchase/Sale Agreement — Gatepath Realtors" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function AgreementDocumentPage() {
  const { id } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [brandingLogo, setBrandingLogo] = useState(logoIcon);
  const [companyBrandingName, setCompanyBrandingName] = useState("Gatepath Realtors Limited");
  const [data, setData] = useState<{
    inquiry: Inquiry;
    payment: Payment | null;
    agreement: Agreement | null;
  } | null>(null);

  useEffect(() => {
    async function loadAgreement() {
      try {
        setLoading(true);

        const { data: inquiry, error: iError } = await (supabase as any)
          .from("inquiries")
          .select("*")
          .eq("id", id)
          .single();

        if (iError || !inquiry) {
          throw new Error("Agreement details not found.");
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
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const { data: agreement } = await (supabase as any)
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
      <div className="min-h-screen flex items-center justify-center bg-ivory">
        <div className="text-center">
          <Loader2 className="animate-spin text-primary mx-auto mb-4" size={40} />
          <p className="text-muted-foreground font-medium">Generating legal agreement...</p>
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
            {error || "Unable to display purchase agreement details."}
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

  const { inquiry, payment, agreement } = data;
  const isCeoSigned = agreement?.ceo_signed || false;
  const isFullyPaid = !!agreement;

  const handlePrint = () => window.print();

  const agreementDate = new Date(
    agreement?.created_at ?? payment?.created_at ?? inquiry.created_at,
  );
  const formattedDate = agreementDate.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const year = agreementDate.getFullYear();

  const price = inquiry.price ?? 0;
  const deposit = inquiry.deposit ?? 0;
  const balance = inquiry.balance ?? Math.max(price - deposit, 0);
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

      {!isFullyPaid && (
        <div className="max-w-3xl mx-auto mb-4 no-print bg-amber-50 border border-amber-300 text-amber-800 text-[13px] rounded-lg px-4 py-3">
          This Agreement is not yet a valid document — it only takes effect once the client has paid
          the full purchase price. Until then, the client holds an Offer Letter only.
        </div>
      )}

      <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-[#E5E0D8] p-10 md:p-16 shadow-2xl relative print:border-none print:shadow-none print:p-0">
        <div className="text-center pb-8 border-b border-[#E5E0D8] mb-10">
          <img src={brandingLogo} alt="Logo" className="w-16 h-16 object-contain mx-auto mb-4" />
          <h1 className="font-serif font-bold text-xl text-primary tracking-tight uppercase">
            Republic of Kenya
          </h1>
          <p className="font-serif font-semibold text-[15px] text-[#06243A] mt-1">
            Purchase/Sale Agreement
          </p>
        </div>

        <div className="space-y-5 text-[14px] leading-relaxed text-[#3A3A3A] font-serif">
          <p>
            THIS AGREEMENT is made on <strong>{year}</strong> between{" "}
            <strong>GATEPATH REALTORS LIMITED OF P.O. BOX 10990-00400 THIKA</strong> (hereinafter
            called "the Vendor" which expression shall where the context so admits include its
            personal representatives and assigns) of the one part and{" "}
            <strong>{inquiry.client_full_name}</strong> of ID:{" "}
            <span className="font-mono">{inquiry.client_id_passport}</span> (hereinafter called "the
            Purchaser" which expression shall where the context so admits include their personal
            representatives and assigns) of the other part.
          </p>

          <p className="font-semibold uppercase tracking-wide text-[#06243A]">WHEREAS: -</p>
          <p className="pl-4">
            (A) The Vendor is registered as absolute proprietor of the Parcels of Land known as{" "}
            <strong>
              {inquiry.phase_name}
              {inquiry.plot_number_ref ? `, Plot #${inquiry.plot_number_ref}` : ""}
            </strong>{" "}
            (hereinafter called "the Parcels"). The Vendor has agreed to sell and the Purchaser has
            agreed to purchase the Parcels for the agreed sum of Kenya Shillings i.e. Ksh{" "}
            <strong>{formatFromKes(price, "KES")}</strong> and upon the terms and conditions
            hereinafter appearing.
          </p>

          <p className="font-semibold uppercase tracking-wide text-[#06243A]">
            NOW THIS AGREEMENT WITNESSETH as follows:
          </p>

          <p>
            <strong>1) Sale and Purchase</strong>
          </p>
          <div className="pl-4 space-y-2">
            <p>
              The Vendor shall sell, and the Purchaser shall purchase the Parcels for the sum of
              Kenya Shillings i.e. Ksh <strong>{formatFromKes(price, "KES")}</strong>. On or before
              signing this agreement, the purchaser shall pay a deposit of Ksh i.e.{" "}
              <strong>{formatFromKes(deposit, "KES")}</strong> and the balance of i.e.{" "}
              <strong>{formatFromKes(balance, "KES")}</strong> shall be paid with installments of{" "}
              {inquiry.payment_period_months ?? 1} month(s).
            </p>
            <p>
              1.1 Payment Plan: <strong>{isInstallment ? "Installment" : "Cash"}</strong>
            </p>
            <p>
              1.2 WE may incur in transferring the Title deed from our name to the Client's
              preferred name. The vendor will transfer the Title deed within <strong>90</strong>{" "}
              days upon the client making full payment and signing all the legal documents.
            </p>
            <p>
              1.3 Deposit Date:{" "}
              {payment ? new Date(payment.created_at).toLocaleDateString("en-KE") : "—"}. Total
              Deposit: Ksh {formatFromKes(deposit, "KES")}
            </p>
            <p>1.4 Balance: Ksh {formatFromKes(balance, "KES")}</p>
            {inquiry.payment_period_months ? (
              <p>
                1.5 Monthly Instalments: Ksh {formatFromKes(inquiry.monthly_payment ?? 0, "KES")}{" "}
                over {inquiry.payment_period_months} months.
              </p>
            ) : null}
          </div>

          <p className="font-semibold">Payment of the Purchase Price</p>
          <p className="pl-4">
            will be as per the payment schedule attached to this agreement and marked "Appendix A".
            The funds will be paid into the company account as follows:{" "}
            <strong>
              GATEPATH REALTORS LIMITED, ACCOUNT NO. 021000035032 AT FAMILY BANK DAGORETTI BRANCH
            </strong>{" "}
            or Pay bill. 222 111, Account Number: 4884880.
          </p>
          <p className="pl-4">
            2.1 Any installment not paid within ten days of its due date will bear interest at 1%
            per month prorated for the number of days that the installment remains outstanding.
          </p>

          <p>
            <strong>2) Sale subject to Law Society Conditions of Sale</strong>
          </p>
          <p className="pl-4">
            The sale is subject to the Law Society Conditions of Sale (1989 Edition) and all other
            applicable laws in so far as they are not inconsistent with the conditions contained in
            this Agreement.
          </p>

          <p>
            <strong>3) Possession</strong>
          </p>
          <p className="pl-4">
            The property is sold in vacant possession to be handed over to the Purchaser on receipt
            by the Vendor of the total purchase price and all apportioned rates and rents and
            interest (if any) due under this Agreement.
          </p>

          <p>
            <strong>4) No Encumbrances</strong>
          </p>
          <p className="pl-4">
            The property is sold subject to the Acts, Covenants, Conditions, and Stipulations as
            more particularly set out in the documents of title relating to the property but
            otherwise free from any mortgage, charge, lien, encumbrances, or adverse claims
            whatsoever.
          </p>

          <p>
            <strong>5) Completion</strong>
          </p>
          <p className="pl-4">
            The Vendor shall deliver to the Purchaser Executed Transfer documents in favor of the
            Purchaser for the property and the original title documents within ten days of receiving
            confirmation that the Purchaser has completed payment of the purchase price, after which
            the transfer documents may be lodged for Transfer at the Land Registry. Unless for
            reasons beyond the Vendor's control, the Vendor shall hand over to the Purchaser the
            additional transfer documents listed below no later than thirty days after full payment
            of the purchase price: 6.1 Consents to Transfer; and 6.2 Any other documents relating to
            the property.
          </p>

          <p>
            <strong>6) Failure to Complete</strong>
          </p>
          <div className="pl-4 space-y-2">
            <p>
              6.1 Suppose the Purchaser cannot complete the sale transaction for any reason save for
              default on the part of the Vendor. In that case, the Vendor shall be entitled to
              rescind the Agreement for Sale through writing. The Purchaser shall forfeit from the
              deposit equivalent to <strong>30%</strong> of the purchase price as per clause 1 as
              agreed liquidated damages and shall in addition pay the Vendor's advocates fees &amp;
              any costs incurred by the Vendor or by its advocates in respect of the failed
              transaction. The balance of the deposit after deduction of the above sum shall be
              refunded to Purchaser with the same duration as the one used in this agreement for
              installments and within 90 days for cash Option.
            </p>
            <p>
              6.2 The purchaser has an option of bringing another client and on this case the sum
              paid will be refunded 100%.
            </p>
            <p>
              6.3 The purchaser shall pay all other expenses incurred to process the title deed only
              if the process was initiated or completed.
            </p>
          </div>

          <p>
            <strong>7) Time is of the essence</strong>
          </p>
          <p className="pl-4">Time shall be of the essence for all purposes of this Agreement.</p>

          <p>
            <strong>8) Conditions of the Property</strong>
          </p>
          <p className="pl-4">
            The Purchaser having been afforded the opportunity of viewing the property before the
            execution of this Agreement and having viewed and inspected the property purchases the
            property in its current state and condition and the Vendor shall not be called upon to
            renew or improve the property in any way whatsoever.
          </p>

          <p>
            <strong>9) Rates and Rents</strong>
          </p>
          <p className="pl-4">
            All apportioned rates, rents, and interest (if any) for the year of completion shall be
            apportioned between the parties as of the Completion Date.
          </p>

          <p>
            <strong>10) Costs</strong>
          </p>
          <p className="pl-4">
            Each of the parties shall pay their Advocates' charges in connection with this
            transaction. The Purchaser shall be responsible for the Stamp Duty and Registration fees
            on the Transfers. The Vendor and Purchaser shall bear equally the cost of procuring the
            Consent to transfer.
          </p>

          <p>
            <strong>11) Waiver</strong>
          </p>
          <p className="pl-4">
            No failure or delay by the Vendor or the Purchaser in exercising any claim, remedy,
            right, power, or privilege under this Agreement shall operate as a waiver nor shall any
            single or partial exercise of any claim, remedy, right, power, or privilege preclude any
            further exercise thereof or the exercise of any other claim, right or power.
          </p>

          <p>
            <strong>12) Survival</strong>
          </p>
          <p className="pl-4">
            Save about matters which require to be fulfilled and are fulfilled before or at the
            agreed dates, this Agreement shall continue to be in full force and effect.
          </p>

          <p>
            <strong>13) Remedies Cumulative</strong>
          </p>
          <p className="pl-4">
            Any remedy or right conferred upon the Vendor or the Purchaser for breach of this
            Agreement including the right of rescission shall be in addition to and without
            prejudice to all other rights and remedies available to them.
          </p>

          <p>
            <strong>14) Amendment</strong>
          </p>
          <p className="pl-4">
            No amendment to this agreement shall be effective unless signed in the same manner as
            this agreement or as may be agreed between the parties hereto.
          </p>

          <p>
            <strong>15) Notice</strong>
          </p>
          <p className="pl-4">
            Any notice to be given to any party to this Agreement shall be in writing and shall be
            deemed to be duly served upon hand delivery to our official emails, the physical address
            of the office or the physical address of the firm of advocates acting for and on behalf
            of the party to be served or by registered post or certificate of delivery to the
            address of the firm of advocates acting for and on behalf of the party to be served.
          </p>

          <p>
            <strong>16) Entire Agreement</strong>
          </p>
          <p className="pl-4">
            This Agreement contains the whole agreement and understanding between the Parties
            relating to the transaction provided for in this agreement and supersedes all previous
            agreements (if any) whether written or oral between the parties in respect of such
            matters.
          </p>

          <p>
            <strong>17) Interest</strong>
          </p>
          <p className="pl-4">
            The Law Society Conditions of Sale relating to interest is hereby amended to read Twelve
            Percent (18%) per annum and the rate thereof applicable under this Agreement shall be
            Twelve Percent (18%) per annum.
          </p>

          {!isInstallment && (
            <>
              <p className="font-semibold uppercase tracking-wide text-[#06243A] pt-2">
                Sale, Purchase, and Interest
              </p>
              <p className="pl-4">
                The vendor shall sell, and Purchasers shall purchase the PARCEL for the Sum of{" "}
                {formatFromKes(price, "KES")}, which is all-inclusive.
              </p>
              <p className="pl-4 font-semibold">
                NB: No additional interest or any other charges will be required for this purchase.
              </p>
            </>
          )}
        </div>

        {/* Execution Block */}
        <div className="mt-16 pt-8 border-t border-[#E5E0D8]">
          <h3 className="font-serif font-bold text-center text-lg text-[#06243A] mb-8">
            IN WITNESS WHEREOF the Vendor and the Purchaser hereto have executed this Agreement the
            day and year first hereinbefore written.
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-10">
            <div className="flex flex-col items-center md:items-start text-center md:text-left relative">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-4">
                Vendor
              </p>
              {isCeoSigned ? (
                <div className="relative mb-4">
                  <div className="border-2 border-dashed border-accent text-accent px-6 py-3 rounded-xl bg-white rotate-[-2deg] flex flex-col items-center max-w-xs shadow-md">
                    <Award className="text-accent mb-1" size={24} />
                    <span className="font-bold text-[13px]">Joseph Muchiri</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">Director</span>
                    <span className="text-[8px] font-mono text-muted-foreground mt-0.5">
                      Verified Code: {agreement!.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className="text-[8px] font-mono text-muted-foreground">
                      Date: {new Date(agreement!.ceo_signed_at!).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-28 border border-dashed border-[#D5D0C8] rounded-xl flex items-center justify-center bg-[#FDFCF9] w-48 text-muted-foreground text-[12px] italic mb-4">
                  Awaiting CEO Signature
                </div>
              )}
              <p className="font-bold text-[14px]">Signed by: Joseph Muchiri</p>
              <p className="text-[12px] text-muted-foreground">
                On behalf of Gatepath Realtors Limited
              </p>
              <p className="text-[12px] text-muted-foreground">Director</p>
            </div>

            <div className="flex flex-col items-center md:items-end text-center md:text-right">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-4">
                Purchaser
              </p>
              <div className="h-28 border border-dashed border-available/30 bg-available/5 rounded-xl flex flex-col items-center justify-center w-48 text-available text-[12px] font-semibold mb-4 px-3">
                <ShieldCheck size={28} className="mb-1" />
                <span>Authorized Online</span>
                <span className="text-[9px] font-mono text-muted-foreground mt-0.5 font-normal">
                  {isFullyPaid ? "Fully Paid — Verified via Paystack" : "Verified via Paystack"}
                </span>
                <span className="text-[9px] font-mono text-muted-foreground font-normal">
                  Date: {formattedDate}
                </span>
              </div>
              <p className="font-bold text-[14px]">Signed by: {inquiry.client_full_name}</p>
              <p className="text-[12px] text-muted-foreground">Purchaser</p>
            </div>
          </div>
        </div>

        <div className="text-center mt-16 pt-6 border-t border-[#F5F0E8] text-[11px] text-muted-foreground">
          <p>
            This is a secure electronic purchase agreement generated in accordance with the Laws of
            Kenya.
          </p>
          <p className="mt-1">© {companyBrandingName}. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
