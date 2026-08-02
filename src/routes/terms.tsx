/**
 * Gatepath Realtors — Terms of Use (Part 3, Slice D)
 *
 * First draft, prepared from this platform's real business model and the
 * actual clauses already used in the signed Offer Letter / Purchase
 * Agreement templates (document.offer.$id.tsx / document.agreement.$id.tsx
 * — Law Society Conditions of Sale 1989, the real 10% non-completion
 * forfeiture, Family Bank account details). Specific transaction terms are
 * deliberately cross-referenced to those signed documents rather than
 * restated here, to avoid two sources of truth that could drift.
 *
 * This is a working first version, not a placeholder shell — but it has
 * NOT been reviewed by a qualified Kenyan advocate. Treat as a draft
 * pending legal review before relying on it as final and binding.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import {
  ShieldCheck,
  Scale,
  Globe,
  UserCheck,
  AlertTriangle,
  Mail,
  MapPin,
  CreditCard,
  XCircle,
  FileText,
  Gavel,
  Copyright,
} from "lucide-react";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "Terms of Use — Gatepath Realtors" },
      {
        name: "description",
        content:
          "Terms of Use governing property inquiries, reservations, and purchases through Gatepath Realtors, a licensed land seller operating in Kenya.",
      },
    ],
  }),
});

type Section = {
  id: string;
  icon: React.ElementType;
  color: string;
  title: string;
  content: React.ReactNode;
};

function TermsPage() {
  const sections: Section[] = [
    {
      id: "acceptance",
      icon: FileText,
      color: "var(--primary)",
      title: "1. Acceptance of These Terms",
      content: (
        <div className="space-y-3 text-muted-foreground text-[15px] leading-[1.9]">
          <p>
            These Terms of Use ("Terms") govern your access to and use of the Gatepath Realtors
            website, client portal, and related services (together, the "Platform"). By browsing the
            Platform, submitting an inquiry, booking a site visit, or making a payment, you agree to
            be bound by these Terms. If you do not agree, please do not use the Platform.
          </p>
          <p>
            These Terms apply alongside — and do not replace — any Offer Letter or Purchase
            Agreement you sign in connection with a specific plot. Where a signed document and these
            Terms conflict on a transaction-specific point (price, payment schedule, forfeiture),
            the signed document governs.
          </p>
        </div>
      ),
    },
    {
      id: "who-we-are",
      icon: UserCheck,
      color: "var(--primary)",
      title: "2. Who We Are",
      content: (
        <div className="space-y-3 text-muted-foreground text-[15px] leading-[1.9]">
          <p>
            <strong className="text-foreground">Gatepath Realtors Limited</strong> ("Gatepath
            Realtors", "we", "us", "our") is a Kenyan land-sales company. Unless a specific listing
            states otherwise, Gatepath Realtors is the direct <strong>Vendor</strong> of the plots
            offered on this Platform — not a broker introducing a third-party seller. Our registered
            office is at CNM Centre, Ruiru Eastern Bypass, Nairobi, Kenya.
          </p>
        </div>
      ),
    },
    {
      id: "listings",
      icon: MapPin,
      color: "var(--accent)",
      title: "3. Property Listings & Availability",
      content: (
        <div className="space-y-3 text-muted-foreground text-[15px] leading-[1.9]">
          <p>
            Plot availability, pricing, and inventory shown on the Platform reflect our real, live
            records at the time you view them. A plot marked "Available" is not reserved for you
            until a qualifying deposit clears — availability can change if another buyer completes a
            reservation first.
          </p>
          <p>
            Prices shown in a currency other than Kenyan Shillings (KES) are indicative, converted
            at the exchange rate displayed on the page at that time. The exact KES amount settled
            through Paystack is always shown to you before you pay, and that KES amount is what
            governs the transaction.
          </p>
        </div>
      ),
    },
    {
      id: "reservations",
      icon: ShieldCheck,
      color: "var(--available)",
      title: "4. Site Visits & Reservations",
      content: (
        <div className="space-y-3 text-muted-foreground text-[15px] leading-[1.9]">
          <p>
            You may book a free, no-obligation site visit through the Platform. Booking a visit does
            not reserve a plot and does not obligate you to purchase.
          </p>
          <p>
            A plot is reserved only once your reservation deposit clears, and only for the specific
            plot and period stated in the Offer Letter you receive at that point. The Offer Letter —
            not this page — sets out the exact reservation period, and what happens to your deposit
            if the purchase does not complete.
          </p>
        </div>
      ),
    },
    {
      id: "payments",
      icon: CreditCard,
      color: "var(--primary)",
      title: "5. Payments",
      content: (
        <div className="space-y-3 text-muted-foreground text-[15px] leading-[1.9]">
          <p>
            All online payments are processed through <strong>Paystack</strong>, a PCI DSS Level 1
            certified payment gateway. We do not see or store your card details. Every payment is
            settled in Kenyan Shillings (KES) at the amount confirmed to you before checkout.
          </p>
          <div className="bg-[#FFF8EC] border border-accent/30 rounded-xl p-4 flex gap-3">
            <AlertTriangle size={18} className="text-accent shrink-0 mt-0.5" />
            <p className="text-[13px] text-muted-foreground">
              <strong className="text-foreground">
                Gatepath Realtors will never ask you to pay
              </strong>{" "}
              by direct transfer to a personal bank account or personal M-Pesa number. Legitimate
              payments go only through our Paystack checkout or an officially published company
              M-Pesa Paybill or bank account, communicated to you in writing. If you receive any
              other payment request claiming to be from us, do not pay, and report it to{" "}
              <strong>+254 799 488 488</strong>.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "cancellations",
      icon: XCircle,
      color: "var(--destructive)",
      title: "6. Cancellations, Refunds & Forfeiture",
      content: (
        <div className="space-y-3 text-muted-foreground text-[15px] leading-[1.9]">
          <p>
            Once a reservation deposit is paid, the specific cancellation, refund, and forfeiture
            terms for that transaction are the ones stated in your signed Offer Letter and, once
            issued, your Purchase Agreement — not this general page. Those documents are prepared
            for every buyer and explain, in plain terms, what happens to your deposit if the sale
            does not complete for reasons other than our own default.
          </p>
          <p>
            If you have not yet received or cannot locate your Offer Letter, contact us at{" "}
            <a href="mailto:info@gatepathrealtors.com" className="text-primary hover:underline">
              info@gatepathrealtors.com
            </a>{" "}
            and we will provide a copy.
          </p>
        </div>
      ),
    },
    {
      id: "title-transfer",
      icon: Scale,
      color: "var(--primary)",
      title: "7. Title Transfer & Conveyancing",
      content: (
        <div className="space-y-3 text-muted-foreground text-[15px] leading-[1.9]">
          <p>
            Once your purchase is paid in full and your Purchase Agreement is executed, we progress
            your title transfer through the stages shown in your client portal — including survey,
            agreement execution, stamp duty, and registration at the Ministry of Lands. Sale
            Agreements are prepared subject to the{" "}
            <strong className="text-foreground">
              Law Society Conditions of Sale (1989 Edition)
            </strong>{" "}
            and applicable Kenyan land law, including the Land Registration Act, 2012.
          </p>
          <p>
            Timelines for stages that depend on government registries (e.g. title registration) are
            outside our direct control and can vary. We will keep you informed through your client
            portal.
          </p>
        </div>
      ),
    },
    {
      id: "portal-conduct",
      icon: UserCheck,
      color: "var(--accent)",
      title: "8. Client Portal & Acceptable Use",
      content: (
        <div className="space-y-3 text-muted-foreground text-[15px] leading-[1.9]">
          <p>
            Access to your client portal is verified by a one-time passcode sent to your registered
            email or phone. Keep that access private — you are responsible for activity under your
            own session. Notify us immediately at{" "}
            <a href="mailto:info@gatepathrealtors.com" className="text-primary hover:underline">
              info@gatepathrealtors.com
            </a>{" "}
            if you suspect unauthorised access.
          </p>
          <p>
            You agree not to misuse the Platform — including submitting false information,
            attempting to access another client's records, or using the Platform for any unlawful
            purpose.
          </p>
        </div>
      ),
    },
    {
      id: "ip",
      icon: Copyright,
      color: "#8B5CF6",
      title: "9. Intellectual Property",
      content: (
        <div className="space-y-3 text-muted-foreground text-[15px] leading-[1.9]">
          <p>
            The Gatepath Realtors name, logo, site content, photography, and masterplan graphics are
            owned by Gatepath Realtors Limited or used under licence. You may not copy, reproduce,
            or use them commercially without our prior written consent.
          </p>
        </div>
      ),
    },
    {
      id: "liability",
      icon: AlertTriangle,
      color: "var(--destructive)",
      title: "10. Limitation of Liability",
      content: (
        <div className="space-y-3 text-muted-foreground text-[15px] leading-[1.9]">
          <p>
            The Platform and its listings are provided on an "as is" basis. While we take real,
            documented steps to verify title before a plot is listed, we do not guarantee that the
            Platform will be error-free or uninterrupted. To the fullest extent permitted by Kenyan
            law, Gatepath Realtors is not liable for indirect or consequential losses arising from
            your use of the Platform, except where such liability cannot be excluded by law or is
            expressly assumed in your Purchase Agreement.
          </p>
        </div>
      ),
    },
    {
      id: "governing-law",
      icon: Gavel,
      color: "var(--primary)",
      title: "11. Governing Law & Dispute Resolution",
      content: (
        <div className="space-y-3 text-muted-foreground text-[15px] leading-[1.9]">
          <p>
            These Terms, and any transaction entered into through the Platform, are governed by the{" "}
            <strong className="text-foreground">Laws of Kenya</strong>. Any dispute arising from
            these Terms or a related Purchase Agreement is subject to the exclusive jurisdiction of
            the courts of Kenya, without prejudice to any dispute resolution clause in your specific
            signed Purchase Agreement.
          </p>
        </div>
      ),
    },
    {
      id: "changes",
      icon: FileText,
      color: "var(--primary)",
      title: "12. Changes to These Terms",
      content: (
        <div className="space-y-3 text-muted-foreground text-[15px] leading-[1.9]">
          <p>
            We may update these Terms from time to time to reflect changes in our services or legal
            requirements. We will update the Effective Date below when we do. Continued use of the
            Platform after a change constitutes acceptance of the revised Terms. Terms already
            agreed in a signed Offer Letter or Purchase Agreement are not affected retroactively by
            a later change to this page.
          </p>
        </div>
      ),
    },
    {
      id: "contact",
      icon: Mail,
      color: "var(--primary)",
      title: "13. Contact",
      content: (
        <div className="space-y-4 text-muted-foreground text-[15px] leading-[1.9]">
          <p>Questions about these Terms can be sent to:</p>
          <div className="bg-[#F0F8FF] rounded-xl border border-primary/20 p-6 space-y-3">
            <div className="flex items-center gap-3">
              <Mail size={16} className="text-primary shrink-0" />
              <a
                href="mailto:info@gatepathrealtors.com"
                className="text-primary hover:underline font-medium"
              >
                info@gatepathrealtors.com
              </a>
            </div>
            <div className="flex items-center gap-3">
              <Globe size={16} className="text-primary shrink-0" />
              <span>CNM Centre, Ruiru Eastern Bypass, Nairobi, Kenya</span>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-ivory">
      <Navbar />

      <div className="pt-20">
        {/* HEADER */}
        <section className="bg-primary text-white py-20 px-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-accent rounded-full translate-y-1/2 -translate-x-1/2" />
          </div>
          <div className="mx-auto max-w-4xl relative">
            <span className="inline-flex items-center gap-2 bg-accent/20 text-accent border border-accent/30 font-semibold tracking-wider uppercase text-[12px] px-3.5 py-1.5 rounded-full mb-5">
              <Scale size={14} /> Governed by the Laws of Kenya
            </span>
            <h1 className="font-serif font-bold text-[36px] md:text-[52px] leading-tight">
              Terms of Use
            </h1>
            <p className="mt-5 text-white/75 text-[16px] max-w-2xl mx-auto leading-relaxed">
              These Terms govern your use of the Gatepath Realtors Platform, including property
              inquiries, site visits, reservations, and purchases.
            </p>
            <div className="mt-8 inline-flex items-center gap-3 bg-white/10 border border-white/20 rounded-xl px-6 py-3 text-[13px]">
              <Scale size={16} className="text-accent" />
              <span>
                <strong>Effective Date:</strong> August 1, 2026 &nbsp;|&nbsp;{" "}
                <strong>Version:</strong> 1.0
              </span>
            </div>
          </div>
        </section>

        {/* TABLE OF CONTENTS */}
        <section className="py-10 px-6">
          <div className="mx-auto max-w-4xl">
            <div className="bg-white rounded-2xl border border-[#E5E0D8] shadow-sm p-6">
              <h2 className="font-serif font-semibold text-[16px] text-foreground mb-4">
                Table of Contents
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {sections.map((s, i) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="flex items-center gap-2 text-[13px] text-primary hover:underline py-0.5"
                  >
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                      {i + 1}
                    </span>
                    {s.title.replace(/^\d+\.\s/, "")}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* TERMS SECTIONS */}
        <section className="pb-20 px-6">
          <div className="mx-auto max-w-4xl space-y-6">
            {sections.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.id}
                  id={s.id}
                  className="bg-white rounded-2xl border border-[#E5E0D8] shadow-sm overflow-hidden scroll-mt-32"
                >
                  <div
                    className="px-8 py-5 border-b border-[#E5E0D8] flex items-center gap-4"
                    style={{ borderLeftColor: s.color, borderLeftWidth: "4px" }}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${s.color}15` }}
                    >
                      <Icon size={18} style={{ color: s.color }} />
                    </div>
                    <h2 className="font-serif font-bold text-[18px] text-foreground">{s.title}</h2>
                  </div>
                  <div className="px-8 py-7">{s.content}</div>
                </div>
              );
            })}

            {/* CTA */}
            <div className="text-center pt-4">
              <Link
                to="/"
                className="inline-flex items-center justify-center bg-primary text-white font-semibold text-[14px] px-10 py-4 rounded-xl hover:bg-[#09669E] transition-all shadow-md"
              >
                Return to Homepage
              </Link>
            </div>
          </div>
        </section>
      </div>

      <Footer />
      <WhatsAppButton />
    </div>
  );
}
