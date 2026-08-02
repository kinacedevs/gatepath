import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import {
  ShieldCheck,
  Lock,
  FileText,
  Scale,
  Eye,
  Database,
  Globe,
  UserCheck,
  AlertTriangle,
  Mail,
  Phone,
} from "lucide-react";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Privacy Policy & Data Protection — Gatepath Realtors" },
      {
        name: "description",
        content:
          "Gatepath Realtors privacy notice and data protection compliance under the Kenya Data Protection Act No. 24 of 2019 (ODPC). Learn how we collect, use, and protect your personal data.",
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

function PrivacyPage() {
  const sections: Section[] = [
    {
      id: "controller",
      icon: UserCheck,
      color: "var(--primary)",
      title: "1. Data Controller Identity",
      content: (
        <div className="space-y-3 text-muted-foreground text-[15px] leading-[1.9]">
          <p>
            <strong className="text-foreground">Gatepath Realtors Limited</strong> (hereinafter
            "Gatepath Realtors", "we", "us", or "our") is the registered Data Controller for all
            personal data processed through this website and associated services. Our registration
            details are:
          </p>
          <ul className="list-none space-y-2 pl-0">
            <li className="flex items-center gap-3">
              <Globe size={14} className="text-primary shrink-0" />
              <span>
                <strong>Website:</strong> www.gatepathrealtors.com
              </span>
            </li>
            <li className="flex items-center gap-3">
              <Mail size={14} className="text-primary shrink-0" />
              <span>
                <strong>Data Protection Email:</strong> info@gatepathrealtors.com
              </span>
            </li>
            <li className="flex items-center gap-3">
              <Phone size={14} className="text-primary shrink-0" />
              <span>
                <strong>Phone:</strong> +254 799 488 488
              </span>
            </li>
          </ul>
          <p>
            We are committed to compliance with the{" "}
            <strong className="text-foreground">Kenya Data Protection Act No. 24 of 2019</strong>{" "}
            and the regulations published by the{" "}
            <strong className="text-foreground">
              Office of the Data Protection Commissioner (ODPC)
            </strong>{" "}
            of Kenya. This Privacy Notice is issued pursuant to Section 25 of that Act.
          </p>
        </div>
      ),
    },
    {
      id: "collection",
      icon: Database,
      color: "var(--primary)",
      title: "2. Personal Data We Collect",
      content: (
        <div className="space-y-4 text-muted-foreground text-[15px] leading-[1.9]">
          <p>
            We collect personal data only to the extent necessary to deliver our real estate
            services and comply with applicable law. The categories of personal data we process
            include:
          </p>
          <div className="space-y-4">
            {[
              {
                label: "Identity & Contact Data",
                items: [
                  "Full legal name",
                  "National Identification Card (ID) number or Passport number",
                  "Email address and phone number",
                  "Physical and postal address",
                ],
              },
              {
                label: "Financial & Tax Data",
                items: [
                  "Kenya Revenue Authority (KRA) Personal Identification Number (PIN)",
                  "Payment method details (processed securely via Paystack — we do not store raw card data)",
                  "Transaction references and receipts",
                  "Installment payment schedules",
                ],
              },
              {
                label: "Succession & Next-of-Kin Data",
                items: [
                  "Full name and contact details of nominated next of kin",
                  "Relationship to data subject",
                  "This is collected solely to protect your land interest in the event of death or incapacity",
                ],
              },
              {
                label: "Usage & Technical Data",
                items: [
                  "IP address and browser type (for security and fraud prevention)",
                  "Pages visited and interaction patterns (via anonymised analytics)",
                  "Property inquiries and site visit bookings submitted through web forms",
                ],
              },
            ].map((cat) => (
              <div
                key={cat.label}
                className="bg-ivory rounded-xl px-5 py-4 border border-[#EAE4DC]"
              >
                <h4 className="font-semibold text-foreground text-[14px] mb-2">{cat.label}</h4>
                <ul className="list-disc pl-5 space-y-1 text-[14px]">
                  {cat.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-[13px] italic text-[#8A8179]">
            We do not collect biometric data, health data, ethnic origin, or any other special
            category of personal data as defined under Section 45 of the Kenya Data Protection Act,
            unless you explicitly provide it and give written consent.
          </p>
        </div>
      ),
    },
    {
      id: "purpose",
      icon: FileText,
      color: "var(--accent)",
      title: "3. Purpose & Lawful Basis for Processing",
      content: (
        <div className="space-y-4 text-muted-foreground text-[15px] leading-[1.9]">
          <p>
            Under Section 30 of the Kenya Data Protection Act, we process your personal data only
            where a lawful basis exists. The table below maps each purpose to its corresponding
            legal ground:
          </p>
          <div className="overflow-x-auto rounded-xl border border-[#E5E0D8]">
            <table className="w-full text-[13px]">
              <thead className="bg-stone">
                <tr>
                  <th className="text-left px-4 py-3 font-bold text-foreground">Purpose</th>
                  <th className="text-left px-4 py-3 font-bold text-foreground">
                    Lawful Basis (KDPA S.30)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EBE3]">
                {[
                  ["Processing property inquiries and booking site visits", "Consent (S.30(a))"],
                  [
                    "Drafting and executing Sale Agreements (Purchase Agreements)",
                    "Performance of contract (S.30(b))",
                  ],
                  [
                    "Processing payments through our Paystack integration",
                    "Performance of contract (S.30(b))",
                  ],
                  [
                    "Conducting KRA PIN verification and stamp duty compliance",
                    "Legal obligation (S.30(c))",
                  ],
                  [
                    "Filing title transfer documents at the Ministry of Lands",
                    "Legal obligation (S.30(c))",
                  ],
                  [
                    "Performing anti-fraud screening and land registry searches",
                    "Legitimate interests (S.30(f))",
                  ],
                  [
                    "Sending property alerts and marketing communications (opt-in only)",
                    "Consent (S.30(a))",
                  ],
                  [
                    "Succession planning for next-of-kin registration",
                    "Consent + Legal obligation (S.30(a)/(c))",
                  ],
                ].map(([purpose, basis]) => (
                  <tr key={purpose} className="hover:bg-[#FAFAF8]">
                    <td className="px-4 py-3 text-muted-foreground">{purpose}</td>
                    <td className="px-4 py-3 font-semibold text-primary whitespace-nowrap">
                      {basis}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[14px] font-medium text-foreground">
            We will never sell, rent, or lease your personal information to third parties for their
            commercial use.
          </p>
        </div>
      ),
    },
    {
      id: "sharing",
      icon: Globe,
      color: "var(--primary)",
      title: "4. Data Sharing & Third-Party Disclosure",
      content: (
        <div className="space-y-4 text-muted-foreground text-[15px] leading-[1.9]">
          <p>
            We only share your data with third parties to the extent strictly necessary, and always
            within the framework of Section 38 of the Kenya Data Protection Act:
          </p>
          <div className="space-y-3">
            {[
              {
                party: "Paystack Inc.",
                purpose: "Secure online payment processing for deposits and installments",
                safeguard:
                  "Paystack is PCI DSS Level 1 compliant. Raw card data is never stored by Gatepath.",
              },
              {
                party: "Ministry of Lands & Physical Planning (Kenya)",
                purpose:
                  "Submission of title transfer instruments and official land registration documents",
                safeguard: "Mandatory disclosure under the Land Registration Act, 2012 (Kenya).",
              },
              {
                party: "Kenya Revenue Authority (KRA)",
                purpose: "Stamp duty assessment, income tax compliance, and KRA PIN verification",
                safeguard: "Required under the Stamp Duty Act and Finance Acts of Kenya.",
              },
              {
                party: "Licensed Legal Counsel & Conveyancing Advocates",
                purpose: "Preparation of Sale Agreements, title searches, and legal due diligence",
                safeguard: "Bound by attorney-client privilege and the Advocates Act of Kenya.",
              },
              {
                party: "Supabase Inc. (Cloud Infrastructure)",
                purpose: "Secure encrypted database hosting for all client records and documents",
                safeguard:
                  "Data stored in ISO 27001-certified data centres. GDPR-compliant data processor agreements in place.",
              },
            ].map((r) => (
              <div key={r.party} className="rounded-xl border border-[#E5E0D8] p-5 bg-white">
                <h4 className="font-semibold text-foreground text-[14px]">{r.party}</h4>
                <p className="text-[13px] mt-1 text-muted-foreground">
                  <strong>Purpose:</strong> {r.purpose}
                </p>
                <p className="text-[12px] mt-1 text-[#8A8179] italic">
                  <strong>Safeguard:</strong> {r.safeguard}
                </p>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "retention",
      icon: Lock,
      color: "var(--accent)",
      title: "5. Data Retention",
      content: (
        <div className="space-y-3 text-muted-foreground text-[15px] leading-[1.9]">
          <p>
            We retain personal data only for as long as necessary to fulfil the purpose for which it
            was collected, or as required by applicable law (Section 39 of the Kenya Data Protection
            Act):
          </p>
          <div className="overflow-x-auto rounded-xl border border-[#E5E0D8]">
            <table className="w-full text-[13px]">
              <thead className="bg-stone">
                <tr>
                  <th className="text-left px-4 py-3 font-bold text-foreground">Data Category</th>
                  <th className="text-left px-4 py-3 font-bold text-foreground">
                    Retention Period
                  </th>
                  <th className="text-left px-4 py-3 font-bold text-foreground">Basis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EBE3]">
                {[
                  [
                    "Inquiry / lead data (no purchase completed)",
                    "12 months from last interaction",
                    "Marketing consent withdrawal period",
                  ],
                  [
                    "Purchase Agreement & title deed records",
                    "Minimum 30 years",
                    "Land Registration Act requirements",
                  ],
                  [
                    "Payment receipts & transaction data",
                    "7 years",
                    "KRA / Finance Act audit requirements",
                  ],
                  [
                    "KRA PIN and ID copies",
                    "Duration of title holding + 7 years post-transfer",
                    "Tax compliance",
                  ],
                  ["Next-of-kin data", "Duration of title holding", "Succession Act obligations"],
                  [
                    "Website usage / analytics data",
                    "24 months (anonymised after 12 months)",
                    "Legitimate interest",
                  ],
                ].map(([cat, period, basis]) => (
                  <tr key={cat} className="hover:bg-[#FAFAF8]">
                    <td className="px-4 py-3 text-muted-foreground">{cat}</td>
                    <td className="px-4 py-3 font-semibold text-foreground">{period}</td>
                    <td className="px-4 py-3 text-primary text-[12px]">{basis}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ),
    },
    {
      id: "rights",
      icon: Scale,
      color: "var(--primary)",
      title: "6. Your Rights Under the Kenya Data Protection Act",
      content: (
        <div className="space-y-4 text-muted-foreground text-[15px] leading-[1.9]">
          <p>
            Pursuant to Part IV of the Kenya Data Protection Act No. 24 of 2019, you have the
            following enforceable rights as a data subject:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                right: "Right of Access (S.26)",
                desc: "Request a copy of all personal data we hold about you, free of charge within 21 days of your request.",
              },
              {
                right: "Right to Rectification (S.27)",
                desc: "Request correction of inaccurate or incomplete personal data (e.g., wrong KRA PIN, misspelled name).",
              },
              {
                right: "Right to Erasure (S.28)",
                desc: "Request deletion of your personal data where processing is no longer necessary, subject to our legal retention obligations.",
              },
              {
                right: "Right to Object (S.29)",
                desc: "Object to processing of your data for direct marketing purposes at any time, with immediate effect.",
              },
              {
                right: "Right to Data Portability (S.31)",
                desc: "Receive your personal data in a structured, machine-readable format to transfer to another service provider.",
              },
              {
                right: "Right to Withdraw Consent (S.30)",
                desc: "Where processing is based on consent, withdraw it at any time without affecting the lawfulness of prior processing.",
              },
            ].map((r) => (
              <div key={r.right} className="bg-ivory rounded-xl p-4 border border-[#EAE4DC]">
                <h4 className="font-bold text-[13px] text-primary mb-1">{r.right}</h4>
                <p className="text-[13px] text-muted-foreground leading-relaxed">{r.desc}</p>
              </div>
            ))}
          </div>
          <p>
            To exercise any of these rights, contact our Data Protection Officer at{" "}
            <a
              href="mailto:info@gatepathrealtors.com"
              className="text-primary hover:underline font-medium"
            >
              info@gatepathrealtors.com
            </a>{" "}
            with subject line <em>"Data Rights Request"</em>. We will respond within{" "}
            <strong className="text-foreground">21 calendar days</strong> as required by the Act.
          </p>
          <div className="bg-[#FFF8EC] border border-accent/30 rounded-xl p-4 flex gap-3">
            <AlertTriangle size={18} className="text-accent shrink-0 mt-0.5" />
            <p className="text-[13px] text-muted-foreground">
              If you believe your rights have been violated, you have the right to lodge a complaint
              with the{" "}
              <strong className="text-foreground">
                Office of the Data Protection Commissioner (ODPC)
              </strong>{" "}
              of Kenya at{" "}
              <a
                href="https://www.odpc.go.ke"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                www.odpc.go.ke
              </a>{" "}
              or call <strong>+254 20 222 2222</strong>.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "security",
      icon: ShieldCheck,
      color: "var(--available)",
      title: "7. Security Measures",
      content: (
        <div className="space-y-3 text-muted-foreground text-[15px] leading-[1.9]">
          <p>
            We implement appropriate technical and organisational measures under Section 41 of the
            Kenya Data Protection Act to protect your personal data against loss, unauthorised
            access, disclosure, or destruction:
          </p>
          <ul className="space-y-3">
            {[
              "All data transmitted between your browser and our servers is protected using TLS 1.3 encryption (HTTPS).",
              "Sensitive documents (ID copies, KRA PIN certificates) are stored in role-restricted, AES-256 encrypted Supabase Storage buckets — inaccessible to general staff.",
              "Admin access requires multi-factor authentication (MFA) and is audited by role (CEO / Manager / Agent).",
              "Payment processing is handled exclusively via Paystack — a PCI DSS Level 1 certified payment gateway. Card numbers are never stored on Gatepath servers.",
              "We conduct periodic security reviews of our data processing systems and promptly remedy identified vulnerabilities.",
              "In the event of a personal data breach likely to result in risk to your rights, we will notify the ODPC within 72 hours and affected data subjects without undue delay, as required by Section 43 of the Act.",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <ShieldCheck size={16} className="text-green-500 shrink-0 mt-0.5" />
                <span className="text-[14px]">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ),
    },
    {
      id: "cookies",
      icon: Eye,
      color: "#8B5CF6",
      title: "8. Cookies & Tracking Technologies",
      content: (
        <div className="space-y-3 text-muted-foreground text-[15px] leading-[1.9]">
          <p>Our website uses minimal, privacy-respecting cookies and similar technologies:</p>
          <div className="overflow-x-auto rounded-xl border border-[#E5E0D8]">
            <table className="w-full text-[13px]">
              <thead className="bg-stone">
                <tr>
                  <th className="text-left px-4 py-3 font-bold text-foreground">
                    Cookie Name / Type
                  </th>
                  <th className="text-left px-4 py-3 font-bold text-foreground">Purpose</th>
                  <th className="text-left px-4 py-3 font-bold text-foreground">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EBE3]">
                {[
                  [
                    "Session Cookie (Supabase Auth)",
                    "Maintains your login session in the Client Hub",
                    "Session (deleted on browser close)",
                  ],
                  [
                    "CSRF Token",
                    "Protects form submissions against cross-site request forgery attacks",
                    "Session",
                  ],
                  [
                    "Analytics (anonymised)",
                    "Aggregate, non-identifying website usage statistics to improve UX",
                    "24 months",
                  ],
                  [
                    "Paystack Payment Cookie",
                    "Tracks payment flow integrity during checkout. Set by Paystack, not Gatepath.",
                    "Session",
                  ],
                ].map(([name, purpose, duration]) => (
                  <tr key={name} className="hover:bg-[#FAFAF8]">
                    <td className="px-4 py-3 font-medium text-foreground">{name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{purpose}</td>
                    <td className="px-4 py-3 text-primary">{duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[13px]">
            You may disable non-essential cookies through your browser settings. Please note that
            disabling certain cookies may affect functionality such as the Client Hub login and
            payment processing.
          </p>
        </div>
      ),
    },
    {
      id: "international",
      icon: Globe,
      color: "var(--primary)",
      title: "9. International Data Transfers",
      content: (
        <div className="space-y-3 text-muted-foreground text-[15px] leading-[1.9]">
          <p>
            Gatepath Realtors uses cloud infrastructure (Supabase, Paystack) that may process data
            in data centres outside Kenya, including within the EU and United States. Any such
            transfer is conducted in strict compliance with Section 48 of the Kenya Data Protection
            Act, specifically:
          </p>
          <ul className="space-y-2 list-disc pl-5">
            <li>
              Transfers to Supabase are protected by Standard Contractual Clauses (SCCs) and their
              ISO 27001 certification, providing adequate safeguards.
            </li>
            <li>
              Paystack holds PCI DSS Level 1 certification and is regulated under Central Bank of
              Nigeria and operates in compliance with applicable data protection laws across Africa.
            </li>
            <li>
              No personal data is transferred to any country that does not afford an adequate level
              of protection without appropriate contractual safeguards in place.
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: "children",
      icon: UserCheck,
      color: "var(--accent)",
      title: "10. Children's Privacy",
      content: (
        <div className="space-y-3 text-muted-foreground text-[15px] leading-[1.9]">
          <p>
            Our real estate services are directed exclusively to adults aged 18 years and above. We
            do not knowingly collect personal data from persons under 18. If you believe a minor has
            submitted data through our platform, please contact us immediately at{" "}
            <a href="mailto:info@gatepathrealtors.com" className="text-primary hover:underline">
              info@gatepathrealtors.com
            </a>{" "}
            and we will delete that data promptly. Property ownership by minors may only be
            facilitated through their legal guardians in compliance with the Law of Succession Act
            (Kenya).
          </p>
        </div>
      ),
    },
    {
      id: "changes",
      icon: FileText,
      color: "var(--primary)",
      title: "11. Changes to This Privacy Notice",
      content: (
        <div className="space-y-3 text-muted-foreground text-[15px] leading-[1.9]">
          <p>
            We reserve the right to update this Privacy Notice from time to time to reflect changes
            in our data practices, legal requirements, or business operations. When we make material
            changes, we will:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              Update the <strong className="text-foreground">Effective Date</strong> at the top of
              this notice
            </li>
            <li>Display a prominent notice on our homepage for at least 30 days</li>
            <li>
              Email registered clients who have opted into communications with a summary of what has
              changed
            </li>
          </ul>
          <p>
            Continued use of our website or services after a material change constitutes acceptance
            of the revised Privacy Notice.
          </p>
        </div>
      ),
    },
    {
      id: "contact",
      icon: Mail,
      color: "var(--primary)",
      title: "12. Contact & Complaints",
      content: (
        <div className="space-y-4 text-muted-foreground text-[15px] leading-[1.9]">
          <p>
            For all data protection inquiries, rights requests, or complaints about how we handle
            your personal data, please contact our designated Data Protection Officer:
          </p>
          <div className="bg-[#F0F8FF] rounded-xl border border-primary/20 p-6 space-y-3">
            <div className="flex items-center gap-3">
              <UserCheck size={18} className="text-primary" />
              <div>
                <div className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">
                  Data Protection Officer
                </div>
                <div className="font-semibold text-foreground">Gatepath Realtors — DPO Desk</div>
              </div>
            </div>
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
              <Phone size={16} className="text-primary shrink-0" />
              <span>+254 799 488 488</span>
            </div>
            <div className="flex items-center gap-3">
              <Globe size={16} className="text-primary shrink-0" />
              <span>Nairobi, Kenya (East Africa Standard Time, GMT+3)</span>
            </div>
          </div>
          <p className="text-[14px]">
            If you are not satisfied with our response, you may file a complaint with the{" "}
            <strong className="text-foreground">
              Office of the Data Protection Commissioner (ODPC)
            </strong>
            :
          </p>
          <div className="bg-[#FFF8EC] border border-accent/30 rounded-xl p-5 space-y-2">
            <p className="font-bold text-foreground text-[14px]">
              Office of the Data Protection Commissioner
            </p>
            <p className="text-[13px]">
              Website:{" "}
              <a
                href="https://www.odpc.go.ke"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                www.odpc.go.ke
              </a>
            </p>
            <p className="text-[13px]">Email: info@odpc.go.ke</p>
            <p className="text-[13px]">Telephone: +254 20 222 2222</p>
            <p className="text-[13px]">Physical: Nairobi, Kenya</p>
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
              <ShieldCheck size={14} /> Kenya Data Protection Act Compliant
            </span>
            <h1 className="font-serif font-bold text-[36px] md:text-[52px] leading-tight">
              Privacy &amp; Data Protection Notice
            </h1>
            <p className="mt-5 text-white/75 text-[16px] max-w-2xl mx-auto leading-relaxed">
              This notice explains how Gatepath Realtors processes your personal data in compliance
              with the{" "}
              <strong className="text-white">Kenya Data Protection Act No. 24 of 2019</strong> and
              the regulations of the Office of the Data Protection Commissioner (ODPC).
            </p>
            <div className="mt-8 inline-flex items-center gap-3 bg-white/10 border border-white/20 rounded-xl px-6 py-3 text-[13px]">
              <Scale size={16} className="text-accent" />
              <span>
                <strong>Effective Date:</strong> July 14, 2026 &nbsp;|&nbsp;{" "}
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

        {/* POLICY SECTIONS */}
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

            {/* ANTI-FRAUD NOTICE */}
            <div className="bg-[#D97706] rounded-2xl p-8 text-white">
              <div className="flex items-start gap-4">
                <AlertTriangle size={28} className="shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-serif font-bold text-[20px] mb-3">
                    Official Anti-Fraud &amp; Payment Security Notice
                  </h3>
                  <div className="space-y-2 text-[14px] leading-relaxed text-white/90">
                    <p>
                      <strong className="text-white">
                        Gatepath Realtors will NEVER request direct bank transfers to personal
                        accounts
                      </strong>{" "}
                      from clients. All legitimate property payments must be processed exclusively
                      through:
                    </p>
                    <ul className="list-disc pl-5 space-y-1 mt-2">
                      <li>
                        Our official <strong>Paystack-powered</strong> online checkout (accessible
                        from our verified website only)
                      </li>
                      <li>
                        Our officially published <strong>M-Pesa Paybill</strong> numbers as
                        communicated in writing by staff
                      </li>
                    </ul>
                    <p className="mt-3">
                      If you receive any request to transfer money to a personal phone number or
                      bank account claiming to be from Gatepath Realtors, please report it
                      immediately to <strong>+254 799 488 488</strong> and the{" "}
                      <strong>Kenya DCI Cybercrime Unit</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>

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
