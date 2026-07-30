/**
 * Gatepath Realtors — Closed Deals Ledger (Phase 5A mechanical split)
 * Relocated verbatim from the old "deals" tab (admin.tsx, previously
 * ~2440-2490). Same JSX, same inline styles, same NAVY hex — copied as-is,
 * not redesigned. The one real change: this tab's own scoped fetch
 * (agreements filtered ceo_signed, joined to inquiries) replaces the old
 * shared 9-table Promise.all.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Agreement, Inquiry } from "@/lib/types";

export const Route = createFileRoute("/admin/deals")({
  component: ClosedDealsLedger,
});

const NAVY = "#0C1A30";
const CANVAS = "var(--stone)";
const CARD_BORDER = "#E5E0D8";

function ClosedDealsLedger() {
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  const loadData = async () => {
    setDataLoading(true);
    try {
      const [agreementsRes, inquiriesRes] = await Promise.all([
        supabase.from("agreements").select("*").eq("ceo_signed", true),
        supabase.from("inquiries").select("*"),
      ]);

      setAgreements((agreementsRes.data as Agreement[]) ?? []);
      setInquiries((inquiriesRes.data as Inquiry[]) ?? []);
    } catch (err) {
      console.error("Error loading closed deals data:", err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  void dataLoading;

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 24, color: NAVY, margin: 0 }}>Closed Deals Ledger</h1>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280", marginTop: 4 }}>
            Agreements that have been finalized and signed by the CEO.
          </p>
        </div>
      </div>
      <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${CARD_BORDER}`, boxShadow: "0 2px 12px rgba(12,26,48,0.05)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead style={{ background: CANVAS, borderBottom: `1px solid ${CARD_BORDER}` }}>
            <tr>
              <th style={{ padding: "16px 24px", fontFamily: "Montserrat, sans-serif", fontSize: 12, fontWeight: 700, color: NAVY, textTransform: "uppercase" }}>Agreement ID</th>
              <th style={{ padding: "16px 24px", fontFamily: "Montserrat, sans-serif", fontSize: 12, fontWeight: 700, color: NAVY, textTransform: "uppercase" }}>Client</th>
              <th style={{ padding: "16px 24px", fontFamily: "Montserrat, sans-serif", fontSize: 12, fontWeight: 700, color: NAVY, textTransform: "uppercase" }}>Project</th>
              <th style={{ padding: "16px 24px", fontFamily: "Montserrat, sans-serif", fontSize: 12, fontWeight: 700, color: NAVY, textTransform: "uppercase" }}>Date Signed</th>
              <th style={{ padding: "16px 24px", fontFamily: "Montserrat, sans-serif", fontSize: 12, fontWeight: 700, color: NAVY, textTransform: "uppercase" }}>Contract</th>
            </tr>
          </thead>
          <tbody>
            {agreements.map((agr) => {
              const inquiry = inquiries.find(inq => inq.id === agr.inquiry_id);
              return (
                <tr key={agr.id} style={{ borderBottom: "1px solid " + CARD_BORDER, background: "#fff" }}>
                  <td style={{ padding: "16px 24px", fontFamily: "Inter, sans-serif", fontSize: 14, color: "#6B7280", fontWeight: 500 }}>
                    {agr.id.substring(0,8).toUpperCase()}
                  </td>
                  <td style={{ padding: "16px 24px", fontFamily: "Inter, sans-serif", fontSize: 14, color: NAVY, fontWeight: 600 }}>
                    {inquiry?.client_full_name}
                  </td>
                  <td style={{ padding: "16px 24px", fontFamily: "Inter, sans-serif", fontSize: 13, color: NAVY }}>
                    {inquiry?.phase_name} • Plot {inquiry?.plot_number_ref}
                  </td>
                  <td style={{ padding: "16px 24px", fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280" }}>
                    {new Date(agr.ceo_signed_at || "").toLocaleDateString()}
                  </td>
                  <td style={{ padding: "16px 24px" }}>
                    <a href={agr.pdf_agreement_url || "#"} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "#EFF6FF", color: "var(--primary)", borderRadius: 6, fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
                      <FileText size={14} /> View PDF
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
