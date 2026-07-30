/**
 * Gatepath Realtors — Inquiries Queue (Phase 5A mechanical split)
 * Relocated verbatim from the old "inquiries" tab (admin.tsx, previously
 * ~1077-1248), plus the "Review Inquiry" modal (previously ~2678-2801) which
 * belongs to this tab, not floating separately. Same JSX, same inline
 * styles, same NAVY hex, same (supabase as any) casts — copied as-is, not
 * redesigned. The one real change: this tab's own scoped fetch (inquiries +
 * agreements + payments) replaces the old shared 9-table Promise.all.
 *
 * Note: the original handleApproveInquiry() looks up a linked payment from
 * the shared `payments` state (to attach payment_id to the new agreement
 * row), and the Review modal's "View Receipt" link also reads from
 * `payments` — so this tab needs `payments` too, not just inquiries +
 * agreements as first assumed.
 *
 * handleApproveInquiry / handleRejectInquiry / handleCeoSignature are kept
 * AS-IS: still direct client writes via (supabase as any), still calling
 * sendAgreementSignedNotificationFn on CEO sign. These are NOT routed
 * through updateInquiryStatusFn — that server function is only used by the
 * new leads Kanban (admin.leads.tsx).
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, X, Check, PenTool } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdminSession } from "@/context/AdminSessionContext";
import { sendAgreementSignedNotificationFn } from "@/lib/notifications";
import type { Inquiry, Agreement, Payment } from "@/lib/types";

export const Route = createFileRoute("/admin/inquiries")({
  component: InquiriesQueue,
});

// ─── Stitch Design Tokens ─────────────────────────────────────────────────────
const NAVY = "#0C1A30";
const GOLD = "var(--accent)";
const CARD_BORDER = "#E5E0D8";

// ─── Avatar color palette ─────────────────────────────────────────────────────
const avatarColors = [
  "var(--accent)", "var(--primary)", "var(--available)", "#A855F7", "#EC4899", "#14B8A6", "#F97316",
];

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
  const [payments, setPayments] = useState<Payment[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);

  const loadData = async () => {
    setDataLoading(true);
    try {
      const [inquiriesRes, agreementsRes, paymentsRes] = await Promise.all([
        supabase.from("inquiries").select("*").order("created_at", { ascending: false }),
        supabase.from("agreements").select("*"),
        supabase.from("payments").select("*"),
      ]);

      setInquiries((inquiriesRes.data as Inquiry[]) ?? []);
      setAgreements((agreementsRes.data as Agreement[]) ?? []);
      setPayments((paymentsRes.data as Payment[]) ?? []);
    } catch (err) {
      console.error("Error loading inquiries data:", err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 4. CEO CRITICAL OPERATIONS
  const handleApproveInquiry = async (inquiryId: string) => {
    const { error } = await ((supabase as any)
      .from("inquiries")
      .update({ status: "approved" })
      .eq("id", inquiryId));

    if (error) {
      alert("Error approving inquiry: " + error.message);
      return;
    }

    const linkedPayment = payments.find((p) => p.inquiry_id === inquiryId);

    await (supabase.from("agreements").insert({
      inquiry_id: inquiryId,
      payment_id: linkedPayment?.id ?? null,
      ceo_signed: false,
    } as any) as any);

    loadData();
    setSelectedInquiry(null);
  };

  const handleRejectInquiry = async (inquiryId: string) => {
    const { error } = await ((supabase as any)
      .from("inquiries")
      .update({ status: "rejected" })
      .eq("id", inquiryId));

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

    const { error } = await ((supabase as any)
      .from("agreements")
      .update({
        ceo_signed: true,
        ceo_signed_at: new Date().toISOString(),
      })
      .eq("inquiry_id", inquiryId));

    if (error) {
      alert("Error signing agreement: " + error.message);
      return;
    }

    alert("Purchase Agreement successfully signed digitally by CEO!");

    (sendAgreementSignedNotificationFn as any)({ data: { inquiryId } }).catch((err: any) => {
      console.error("[Gatepath CEO Sign] Notification error:", err);
    });

    loadData();
  };

  const filteredInquiries = useMemo(() => {
    return inquiries.filter((i) => {
      const matchesSearch =
        i.client_full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.client_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (i.phase_name && i.phase_name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === "all" ? true : i.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [inquiries, searchQuery, statusFilter]);

  void dataLoading;

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 24, color: NAVY, margin: 0 }}>Inquiries Queue</h1>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280", marginTop: 4 }}>
            Review, approve and manage all incoming buyer inquiries.
          </p>
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${CARD_BORDER}`, boxShadow: "0 2px 12px rgba(12,26,48,0.05)", overflow: "hidden" }}>
        {/* Search & Filter Bar */}
        <div style={{ padding: "18px 24px", borderBottom: `1px solid ${CARD_BORDER}`, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by client name, email, or phase..."
              style={{
                width: "100%",
                padding: "9px 12px 9px 34px",
                border: `1px solid ${CARD_BORDER}`,
                borderRadius: 9,
                fontFamily: "Inter, sans-serif",
                fontSize: 13,
                color: NAVY,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {["all", "pending", "approved", "rejected"].map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: `1px solid ${statusFilter === f ? GOLD : CARD_BORDER}`,
                  background: statusFilter === f ? GOLD : "#fff",
                  color: statusFilter === f ? "#fff" : "#374151",
                  fontFamily: "Inter, sans-serif",
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: "pointer",
                  textTransform: "capitalize",
                  transition: "all 0.15s",
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Inter, sans-serif" }}>
            <thead>
              <tr style={{ background: "#F9FAFB", borderBottom: `1px solid ${CARD_BORDER}` }}>
                {["Client", "Target Plot", "Email", "Payment Terms", "Status", "Actions"].map((h) => (
                  <th key={h} style={{
                    padding: "12px 20px",
                    textAlign: "left",
                    fontFamily: "Inter, sans-serif",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#6B7280",
                    textTransform: "uppercase",
                    letterSpacing: "0.09em",
                    whiteSpace: "nowrap",
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredInquiries.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "48px 20px", textAlign: "center", color: "#9CA3AF", fontFamily: "Inter, sans-serif", fontSize: 13 }}>
                    No inquiries match your filters.
                  </td>
                </tr>
              ) : (
                filteredInquiries.map((inq, idx) => {
                  const colorIdx = inq.client_full_name.charCodeAt(0) % avatarColors.length;
                  const statusMap: Record<string, { bg: string; color: string }> = {
                    pending: { bg: "#FEF3C7", color: "#D97706" },
                    approved: { bg: "#D1FAE5", color: "#059669" },
                    rejected: { bg: "#FEE2E2", color: "#DC2626" },
                    reviewed: { bg: "#DBEAFE", color: "#2563EB" },
                  };
                  const sc = statusMap[inq.status] ?? { bg: "#F3F4F6", color: "#6B7280" };
                  return (
                    <tr
                      key={inq.id}
                      style={{
                        borderBottom: idx < filteredInquiries.length - 1 ? `1px solid ${CARD_BORDER}` : "none",
                        transition: "background 0.12s",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "#F9FAFB"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                    >
                      <td style={{ padding: "14px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 32, height: 32,
                            borderRadius: "50%",
                            background: avatarColors[colorIdx],
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontFamily: "Montserrat, sans-serif",
                            fontWeight: 700, fontSize: 11, color: "#fff", flexShrink: 0,
                          }}>
                            {getInitials(inq.client_full_name)}
                          </div>
                          <div>
                            <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, color: NAVY }}>{inq.client_full_name}</div>
                            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#9CA3AF", marginTop: 1 }}>{inq.client_phone}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "14px 20px", fontFamily: "Inter, sans-serif", fontSize: 13, color: "#374151" }}>
                        {inq.phase_name || "Any Plot"} {inq.plot_number_ref ? `#${inq.plot_number_ref}` : ""}
                      </td>
                      <td style={{ padding: "14px 20px", fontFamily: "Inter, sans-serif", fontSize: 13, color: "#374151" }}>{inq.client_email}</td>
                      <td style={{ padding: "14px 20px" }}>
                        <span style={{
                          fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600,
                          color: GOLD, background: `${GOLD}18`,
                          padding: "3px 10px", borderRadius: 6, textTransform: "capitalize",
                        }}>
                          {inq.terms_of_payment || "Not Selected"}
                        </span>
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <span style={{
                          fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 700,
                          textTransform: "uppercase", letterSpacing: "0.07em",
                          padding: "4px 10px", borderRadius: 20,
                          background: sc.bg, color: sc.color,
                        }}>
                          {inq.status}
                        </span>
                      </td>
                      <td style={{ padding: "14px 20px", textAlign: "right" }}>
                        <button
                          onClick={() => setSelectedInquiry(inq)}
                          style={{
                            fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600,
                            color: "#2563EB", background: "none", border: "none", cursor: "pointer",
                            textDecoration: "underline",
                          }}
                        >
                          Review & Sign
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          MODAL: REVIEW INQUIRY
      ══════════════════════════════════════════════ */}
      {selectedInquiry && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(12,26,48,0.55)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: "#fff", width: "100%", maxWidth: 660, borderRadius: 18, padding: 36, boxShadow: "0 32px 80px rgba(0,0,0,0.3)", maxHeight: "88vh", overflowY: "auto", position: "relative" }}>
            <button
              onClick={() => setSelectedInquiry(null)}
              style={{ position: "absolute", top: 20, right: 20, background: "none", border: "none", cursor: "pointer", color: "#9CA3AF" }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 22, color: NAVY, margin: 0 }}>Inquiry Review Board</h3>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280", marginTop: 6 }}>Review the buyer's details and approve or reject the sale agreement.</p>

            <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 16 }}>
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
                    { label: "Project / Phase", value: `${selectedInquiry.phase_name} (Plot #${selectedInquiry.plot_number_ref})` },
                    { label: "Payment Terms", value: selectedInquiry.terms_of_payment ?? "—" },
                    { label: "Agreed Price", value: `Ksh ${selectedInquiry.price?.toLocaleString() || "—"}` },
                    { label: "Deposit Paid", value: `Ksh ${selectedInquiry.deposit?.toLocaleString() || "—"}` },
                  ],
                },
              ].map((section) => (
                <div key={section.title} style={{ background: "#F9FAFB", border: `1px solid ${CARD_BORDER}`, borderRadius: 10, padding: "18px 20px" }}>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 14 }}>
                    {section.title}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px" }}>
                    {section.fields.map((f) => (
                      <div key={f.label}>
                        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#9CA3AF", marginBottom: 2 }}>{f.label}:</div>
                        <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, color: NAVY }}>{f.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Action Footer */}
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${CARD_BORDER}`, display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
              {selectedInquiry.status === "pending" && (
                <>
                  <button
                    onClick={() => handleRejectInquiry(selectedInquiry.id)}
                    style={{ padding: "10px 20px", border: "1px solid #FECACA", borderRadius: 9, color: "#DC2626", background: "#fff", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
                  >
                    Reject Inquiry
                  </button>
                  <button
                    onClick={() => handleApproveInquiry(selectedInquiry.id)}
                    style={{ padding: "10px 20px", background: "#2563EB", border: "none", borderRadius: 9, color: "#fff", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
                  >
                    Approve & Draft Agreement
                  </button>
                </>
              )}

              {selectedInquiry.status === "approved" && (() => {
                const signed = agreements.some((a) => a.inquiry_id === selectedInquiry.id && a.ceo_signed);
                const linkedPayment = payments.find((p) => p.inquiry_id === selectedInquiry.id && p.status === "success");
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    {linkedPayment && (
                      <Link
                        to="/document/receipt/$id"
                        params={{ id: linkedPayment.id }}
                        target="_blank"
                        style={{ padding: "10px 16px", border: `1px solid ${CARD_BORDER}`, borderRadius: 9, color: NAVY, fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, textDecoration: "none", background: "#fff" }}
                      >
                        View Receipt
                      </Link>
                    )}
                    <Link
                      to="/document/agreement/$id"
                      params={{ id: selectedInquiry.id }}
                      target="_blank"
                      style={{ padding: "10px 16px", border: `1px solid ${CARD_BORDER}`, borderRadius: 9, color: NAVY, fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, textDecoration: "none", background: "#fff" }}
                    >
                      {signed ? "View Signed Agreement" : "View Draft Agreement"}
                    </Link>

                    {signed ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#059669", background: "#D1FAE5", padding: "10px 16px", borderRadius: 9, border: "1px solid #A7F3D0", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13 }}>
                        <Check size={15} /> Signed
                      </div>
                    ) : adminRole === "ceo" ? (
                      <button
                        onClick={() => handleCeoSignature(selectedInquiry.id)}
                        style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: GOLD, border: "none", borderRadius: 9, color: "#fff", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
                      >
                        <PenTool size={14} /> Sign Agreement
                      </button>
                    ) : (
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#9CA3AF", fontStyle: "italic" }}>Awaiting CEO Signature</span>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Fade-in keyframe */}
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
