/**
 * Gatepath Realtors — Inquiries Queue (VIZ_BLUEPRINT Phase 2, Slice 8)
 * First token migration off the Phase 5A mechanical-split residue for this
 * screen — the largest and highest-stakes in the admin console, since the
 * two-document payment-gated Offer Letter / Agreement workflow (Phase 7)
 * lives in the review modal below. The gating logic itself (locked /
 * unlocked-unsigned / signed states, the three data sections) is UNCHANGED
 * — this is a restyle, not a rewrite of behavior.
 *
 * Real CLAUDE.md violation fixed here: handleCeoSignature/handleCeoSignOffer
 * used to write ceo_signed/ceo_signed_at directly to agreements/offers via a
 * client-side (supabase as any) update — forbidden by CLAUDE.md's explicit
 * rule. Now routed through signAgreementFn/signOfferFn (src/lib/
 * inquiryActions.ts), which re-verify the caller is the CEO server-side
 * before writing, using the service role.
 *
 * handleApproveInquiry/handleRejectInquiry (writing inquiries.status) are
 * intentionally left as direct client writes — CLAUDE.md's forbidden list
 * names payments/agreements/bookings/plots.status specifically, not
 * inquiries, matching the existing convention elsewhere in this codebase.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, X, Check, PenTool, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdminSession } from "@/context/AdminSessionContext";
import { sendAgreementSignedNotificationFn } from "@/lib/notifications";
import { signAgreementFn, signOfferFn } from "@/lib/inquiryActions";
import { KpiCard } from "@/components/admin/KpiCard";
import { SectionCard } from "@/components/admin/SectionCard";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { EmptyState } from "@/components/admin/EmptyState";
import { FreshnessStamp } from "@/components/admin/FreshnessStamp";
import { CategoryBarChart } from "@/components/admin/charts/CategoryBarChart";
import { SplitDonutChart } from "@/components/admin/charts/SplitDonutChart";
import { Skeleton } from "@/components/ui/skeleton";
import type { ColumnDef } from "@tanstack/react-table";
import type { Inquiry, Agreement, Offer, Payment } from "@/lib/types";

export const Route = createFileRoute("/admin/inquiries")({
  component: InquiriesQueue,
});

// Avatar color variety (not a brand token — decorative only, same set the
// screen has always used).
const avatarColors = [
  "var(--accent)",
  "var(--primary)",
  "var(--available)",
  "#A855F7",
  "#EC4899",
  "#14B8A6",
  "#F97316",
];

const INQUIRY_STATUS_TONE = {
  pending: "warning",
  reviewed: "info",
  approved: "success",
  rejected: "error",
} as const;

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function InquiriesQueue() {
  const { adminRole } = useAdminSession();

  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [inquiriesRes, agreementsRes, offersRes, paymentsRes] = await Promise.all([
        supabase.from("inquiries").select("*").order("created_at", { ascending: false }),
        supabase.from("agreements").select("*"),
        supabase.from("offers").select("*"),
        supabase.from("payments").select("*"),
      ]);

      setInquiries((inquiriesRes.data as Inquiry[]) ?? []);
      setAgreements((agreementsRes.data as Agreement[]) ?? []);
      setOffers((offersRes.data as Offer[]) ?? []);
      setPayments((paymentsRes.data as Payment[]) ?? []);
    } catch (err) {
      console.error("Error loading inquiries data:", err);
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 4. CEO CRITICAL OPERATIONS
  // Approval is purely a status flag — the Offer Letter and Agreement are
  // issued by payment state (see paymentActions.ts's recordVerifiedPayment),
  // never created directly from here. An inquiry can be fully paid (and have
  // an Offer/Agreement already) before a staff member ever clicks Approve.
  const handleApproveInquiry = async (inquiryId: string) => {
    const { error } = await (supabase as any)
      .from("inquiries")
      .update({ status: "approved" })
      .eq("id", inquiryId);

    if (error) {
      alert("Error approving inquiry: " + error.message);
      return;
    }

    loadData();
    setSelectedInquiry(null);
  };

  const handleRejectInquiry = async (inquiryId: string) => {
    const { error } = await (supabase as any)
      .from("inquiries")
      .update({ status: "rejected" })
      .eq("id", inquiryId);

    if (error) {
      alert("Error rejecting inquiry: " + error.message);
      return;
    }
    loadData();
    setSelectedInquiry(null);
  };

  const handleCeoSignature = async (inquiryId: string) => {
    if (adminRole !== "ceo") {
      alert("Critical Operation: Only the CEO (Joe Muchiri) can sign purchase agreements.");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      alert("Session expired — please refresh and sign in again.");
      return;
    }

    const result = await signAgreementFn({
      data: { callerAccessToken: accessToken, inquiryId },
    });

    if (!result.success) {
      alert("Error signing agreement: " + result.error);
      return;
    }

    alert("Purchase Agreement successfully signed digitally by CEO!");

    (sendAgreementSignedNotificationFn as any)({ data: { inquiryId } }).catch((err: any) => {
      console.error("[Gatepath CEO Sign] Notification error:", err);
    });

    loadData();
  };

  const handleCeoSignOffer = async (inquiryId: string) => {
    if (adminRole !== "ceo") {
      alert("Critical Operation: Only the CEO (Joe Muchiri) can sign offer letters.");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      alert("Session expired — please refresh and sign in again.");
      return;
    }

    const result = await signOfferFn({
      data: { callerAccessToken: accessToken, inquiryId },
    });

    if (!result.success) {
      alert("Error signing offer letter: " + result.error);
      return;
    }

    alert("Offer Letter successfully signed digitally by CEO!");
    loadData();
  };

  const filteredInquiries = useMemo(() => {
    return inquiries.filter((i) => {
      const matchesSearch =
        i.client_full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.client_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (i.phase_name && i.phase_name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === "all" ? true : i.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [inquiries, searchQuery, statusFilter]);

  // ── KPIs (kept modest — docs/VIZ_SPEC.md §7 confirms real data here is
  // thin; avg response time / SLA% need an interaction log that doesn't
  // exist, so only real counts are shown) ──
  const totalInquiries = inquiries.length;
  const openCount = inquiries.filter(
    (i) => i.status === "pending" || i.status === "reviewed",
  ).length;
  const approvedCount = inquiries.filter((i) => i.status === "approved").length;
  const rejectedCount = inquiries.filter((i) => i.status === "rejected").length;

  const volumeByChannel = useMemo(() => {
    const counts = new Map<string, number>();
    for (const i of inquiries) {
      const channel = i.heard_from?.trim() || "Unknown";
      counts.set(channel, (counts.get(channel) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [inquiries]);

  const openVsClosed = useMemo(
    () => [
      { name: "Open", value: openCount },
      { name: "Closed", value: approvedCount + rejectedCount },
    ],
    [openCount, approvedCount, rejectedCount],
  );

  const columns: ColumnDef<Inquiry, any>[] = [
    {
      id: "client",
      header: "Client",
      accessorFn: (row) => row.client_full_name,
      cell: ({ row }) => {
        const inq = row.original;
        const colorIdx = inq.client_full_name.charCodeAt(0) % avatarColors.length;
        return (
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-stat-lg text-[11px] font-bold text-white shrink-0"
              style={{ background: avatarColors[colorIdx] }}
            >
              {getInitials(inq.client_full_name)}
            </div>
            <div>
              <div className="font-semibold text-[13px] text-primary-container">
                {inq.client_full_name}
              </div>
              <div className="text-[11px] text-on-surface-variant mt-px">{inq.client_phone}</div>
            </div>
          </div>
        );
      },
    },
    {
      id: "plot",
      header: "Target Plot",
      accessorFn: (row) => row.phase_name ?? "",
      cell: ({ row }) => (
        <span className="text-[13px] text-on-surface">
          {row.original.phase_name || "Any Plot"}{" "}
          {row.original.plot_number_ref ? `#${row.original.plot_number_ref}` : ""}
        </span>
      ),
    },
    {
      id: "email",
      header: "Email",
      accessorFn: (row) => row.client_email,
      cell: (info) => (
        <span className="text-[13px] text-on-surface">{info.getValue() as string}</span>
      ),
    },
    {
      id: "terms",
      header: "Payment Terms",
      accessorFn: (row) => row.terms_of_payment ?? "",
      cell: (info) => (
        <span className="text-[12px] font-semibold text-accent bg-accent/10 px-2.5 py-1 rounded-md capitalize">
          {(info.getValue() as string) || "Not Selected"}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      accessorFn: (row) => row.status,
      cell: (info) => {
        const status = info.getValue() as keyof typeof INQUIRY_STATUS_TONE;
        return <StatusBadge tone={INQUIRY_STATUS_TONE[status] ?? "neutral"}>{status}</StatusBadge>;
      },
    },
    {
      id: "actions",
      header: () => <span className="block text-right">Actions</span>,
      cell: ({ row }) => (
        <div className="text-right">
          <button
            onClick={() => setSelectedInquiry(row.original)}
            className="text-[12px] font-semibold text-info-container underline hover:opacity-80"
          >
            Review &amp; Sign
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary font-bold">
            Inquiries Queue
          </h1>
          <p className="text-body-md text-on-surface-variant">
            Review, approve and manage all incoming buyer inquiries.
          </p>
        </div>
        <FreshnessStamp updatedAt={lastUpdated} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Inquiries"
          value={loading ? "…" : String(totalInquiries)}
          icon={Search}
        />
        <KpiCard
          label="Open"
          value={loading ? "…" : String(openCount)}
          icon={Search}
          tone={openCount > 0 ? "warning" : "default"}
        />
        <KpiCard
          label="Approved"
          value={loading ? "…" : String(approvedCount)}
          icon={Check}
          tone="success"
        />
        <KpiCard label="Rejected" value={loading ? "…" : String(rejectedCount)} icon={X} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Volume by Channel">
          {loading ? (
            <Skeleton className="h-45 rounded-xl" />
          ) : volumeByChannel.length === 0 ? (
            <EmptyState title="No inquiries yet" />
          ) : (
            <CategoryBarChart
              data={volumeByChannel}
              xKey="name"
              yKey="value"
              height={200}
              horizontal
            />
          )}
        </SectionCard>
        <SectionCard title="Open vs Closed">
          {loading ? (
            <Skeleton className="h-45 rounded-xl" />
          ) : (
            <SplitDonutChart data={openVsClosed} height={200} />
          )}
        </SectionCard>
      </div>

      <div className="luxury-card rounded-xl shadow-sm overflow-hidden bg-white">
        <div className="p-4.5 border-b border-outline-variant/30 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-60">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by client name, email, or phase..."
              className="w-full pl-9 pr-3 py-2.5 border border-outline-variant/40 rounded-lg text-[13px] text-primary-container outline-none focus:ring-2 focus:ring-secondary/20"
            />
          </div>
          <div className="flex gap-1.5">
            {["all", "pending", "approved", "rejected"].map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-4 py-2 rounded-lg font-label-md text-xs capitalize transition-colors ${
                  statusFilter === f
                    ? "bg-accent text-white"
                    : "bg-white border border-outline-variant/40 text-on-surface"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <Skeleton className="h-64 rounded-xl m-4" />
        ) : (
          <AdminDataTable
            columns={columns}
            data={filteredInquiries}
            emptyMessage="No inquiries match your filters."
          />
        )}
      </div>

      {/* ══════════════════════════════════════════════
          MODAL: REVIEW INQUIRY — logic unchanged, restyled only
      ══════════════════════════════════════════════ */}
      {selectedInquiry && (
        <div className="fixed inset-0 z-100 bg-primary-container/55 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-165 rounded-2xl p-9 shadow-2xl max-h-[88vh] overflow-y-auto relative">
            <button
              onClick={() => setSelectedInquiry(null)}
              className="absolute top-5 right-5 text-on-surface-variant hover:text-on-surface"
            >
              <X size={20} />
            </button>

            <h3 className="font-headline-lg text-[22px] text-primary font-bold">
              Inquiry Review Board
            </h3>
            <p className="text-[13px] text-on-surface-variant mt-1.5">
              Review the buyer's details and approve or reject the sale agreement.
            </p>

            <div className="mt-6 flex flex-col gap-4">
              {[
                {
                  title: "CLIENT DATA",
                  fields: [
                    { label: "Full Name", value: selectedInquiry.client_full_name },
                    { label: "Phone No", value: selectedInquiry.client_phone },
                    { label: "Email", value: selectedInquiry.client_email },
                    { label: "National ID / Passport", value: selectedInquiry.client_id_passport },
                    { label: "KRA PIN", value: selectedInquiry.client_kra_pin || "—" },
                    { label: "Address", value: selectedInquiry.client_postal_address || "—" },
                  ],
                },
                {
                  title: "NEXT OF KIN",
                  fields: [
                    { label: "Full Name", value: selectedInquiry.kin_full_name || "—" },
                    { label: "Relationship", value: selectedInquiry.kin_relationship || "—" },
                    { label: "Phone No", value: selectedInquiry.kin_phone || "—" },
                  ],
                },
                {
                  title: "TRANSACTION DATA",
                  fields: [
                    {
                      label: "Project / Phase",
                      value: `${selectedInquiry.phase_name} (Plot #${selectedInquiry.plot_number_ref})`,
                    },
                    { label: "Payment Terms", value: selectedInquiry.terms_of_payment ?? "—" },
                    {
                      label: "Agreed Price",
                      value: `Ksh ${selectedInquiry.price?.toLocaleString() || "—"}`,
                    },
                    {
                      label: "Deposit Paid",
                      value: `Ksh ${selectedInquiry.deposit?.toLocaleString() || "—"}`,
                    },
                  ],
                },
              ].map((section) => (
                <div
                  key={section.title}
                  className="bg-surface-container-low border border-outline-variant/30 rounded-lg px-5 py-4.5"
                >
                  <div className="text-[10px] font-bold text-accent uppercase tracking-[0.12em] mb-3.5">
                    {section.title}
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                    {section.fields.map((f) => (
                      <div key={f.label}>
                        <div className="text-[11px] text-on-surface-variant mb-0.5">{f.label}:</div>
                        <div className="font-semibold text-[13px] text-primary-container">
                          {f.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Action Footer */}
            <div className="mt-6 pt-5 border-t border-outline-variant/30 flex justify-end gap-2.5 flex-wrap">
              {selectedInquiry.status === "pending" && (
                <>
                  <button
                    onClick={() => handleRejectInquiry(selectedInquiry.id)}
                    className="px-5 py-2.5 border border-error/30 rounded-lg text-error bg-white font-semibold text-[13px]"
                  >
                    Reject Inquiry
                  </button>
                  <button
                    onClick={() => handleApproveInquiry(selectedInquiry.id)}
                    className="px-5 py-2.5 bg-info-container rounded-lg text-white font-semibold text-[13px]"
                  >
                    Approve &amp; Draft Agreement
                  </button>
                </>
              )}

              {selectedInquiry.status === "approved" &&
                (() => {
                  const offer = offers.find((o) => o.inquiry_id === selectedInquiry.id);
                  const agreement = agreements.find((a) => a.inquiry_id === selectedInquiry.id);
                  const linkedPayment = payments.find(
                    (p) => p.inquiry_id === selectedInquiry.id && p.status === "success",
                  );
                  return (
                    <div className="flex flex-col gap-3.5 w-full">
                      {/* Offer Letter — issued the moment the deposit/reservation payment lands */}
                      <div className="flex items-center justify-between gap-2.5 flex-wrap">
                        <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.08em]">
                          Offer Letter
                        </span>
                        {offer ? (
                          <div className="flex items-center gap-2.5 flex-wrap">
                            {linkedPayment && (
                              <Link
                                to="/document/receipt/$id"
                                params={{ id: linkedPayment.id }}
                                target="_blank"
                                className="px-4 py-2.5 border border-outline-variant/40 rounded-lg text-primary-container font-semibold text-[13px] bg-white"
                              >
                                View Receipt
                              </Link>
                            )}
                            <Link
                              to="/document/offer/$id"
                              params={{ id: selectedInquiry.id }}
                              target="_blank"
                              className="px-4 py-2.5 border border-outline-variant/40 rounded-lg text-primary-container font-semibold text-[13px] bg-white"
                            >
                              {offer.ceo_signed ? "View Signed Offer" : "View Draft Offer"}
                            </Link>
                            {offer.ceo_signed ? (
                              <div className="flex items-center gap-2 text-on-success-container bg-success-container/15 px-4 py-2.5 rounded-lg border border-success-container/30 font-semibold text-[13px]">
                                <Check size={15} /> Signed
                              </div>
                            ) : adminRole === "ceo" ? (
                              <button
                                onClick={() => handleCeoSignOffer(selectedInquiry.id)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-accent rounded-lg text-white font-semibold text-[13px] hover:bg-accent-dark"
                              >
                                <PenTool size={14} /> Sign Offer
                              </button>
                            ) : (
                              <span className="text-[13px] text-on-surface-variant italic">
                                Awaiting CEO Signature
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[13px] text-on-surface-variant italic">
                            Issued automatically once a deposit is received
                          </span>
                        )}
                      </div>

                      {/* Agreement — only becomes a valid document once payment is FULLY complete */}
                      <div className="flex items-center justify-between gap-2.5 flex-wrap pt-3.5 border-t border-outline-variant/30">
                        <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.08em]">
                          Agreement
                        </span>
                        {agreement ? (
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <Link
                              to="/document/agreement/$id"
                              params={{ id: selectedInquiry.id }}
                              target="_blank"
                              className="px-4 py-2.5 border border-outline-variant/40 rounded-lg text-primary-container font-semibold text-[13px] bg-white"
                            >
                              {agreement.ceo_signed
                                ? "View Signed Agreement"
                                : "View Draft Agreement"}
                            </Link>

                            {agreement.ceo_signed ? (
                              <div className="flex items-center gap-2 text-on-success-container bg-success-container/15 px-4 py-2.5 rounded-lg border border-success-container/30 font-semibold text-[13px]">
                                <Check size={15} /> Signed
                              </div>
                            ) : adminRole === "ceo" ? (
                              <button
                                onClick={() => handleCeoSignature(selectedInquiry.id)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-accent rounded-lg text-white font-semibold text-[13px] hover:bg-accent-dark"
                              >
                                <PenTool size={14} /> Sign Agreement
                              </button>
                            ) : (
                              <span className="text-[13px] text-on-surface-variant italic">
                                Awaiting CEO Signature
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="flex items-center gap-1.5 text-[13px] text-on-surface-variant italic">
                            <Lock size={13} /> Unlocks once payment is completed in full
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
