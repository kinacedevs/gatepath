/**
 * Gatepath Realtors — Installment Tracker (Phase 5A mechanical split)
 * Relocated verbatim from the old "installments" tab (admin.tsx, previously
 * ~2333-2383). Same JSX, same inline styles, same NAVY hex — copied as-is,
 * not redesigned. The one real change: this tab's own scoped fetch
 * (inquiries only) replaces the old shared 9-table Promise.all.
 *
 * The `inq.deposit` approximation (instead of summing the real `payments`
 * table) is a known simplification, left exactly as-is — that's deferred to
 * a later phase, not this mechanical split.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Inquiry } from "@/lib/types";

export const Route = createFileRoute("/admin/installments")({
  component: InstallmentTracker,
});

const NAVY = "#0C1A30";
const CANVAS = "var(--stone)";
const CARD_BORDER = "#E5E0D8";

function InstallmentTracker() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  const loadData = async () => {
    setDataLoading(true);
    try {
      const inquiriesRes = await supabase
        .from("inquiries")
        .select("*")
        .eq("terms_of_payment", "installment")
        .order("created_at", { ascending: false });
      setInquiries((inquiriesRes.data as Inquiry[]) ?? []);
    } catch (err) {
      console.error("Error loading installment data:", err);
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
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 24, color: NAVY, margin: 0 }}>Installment Tracker</h1>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280", marginTop: 4 }}>
          Monitor progress of clients on installment payment plans.
        </p>
      </div>
      <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${CARD_BORDER}`, boxShadow: "0 2px 12px rgba(12,26,48,0.05)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead style={{ background: CANVAS, borderBottom: `1px solid ${CARD_BORDER}` }}>
            <tr>
              <th style={{ padding: "16px 24px", fontFamily: "Montserrat, sans-serif", fontSize: 12, fontWeight: 700, color: NAVY, textTransform: "uppercase" }}>Client & Plot</th>
              <th style={{ padding: "16px 24px", fontFamily: "Montserrat, sans-serif", fontSize: 12, fontWeight: 700, color: NAVY, textTransform: "uppercase" }}>Agreed Price</th>
              <th style={{ padding: "16px 24px", fontFamily: "Montserrat, sans-serif", fontSize: 12, fontWeight: 700, color: NAVY, textTransform: "uppercase" }}>Paid So Far</th>
              <th style={{ padding: "16px 24px", fontFamily: "Montserrat, sans-serif", fontSize: 12, fontWeight: 700, color: NAVY, textTransform: "uppercase" }}>Progress</th>
            </tr>
          </thead>
          <tbody>
            {inquiries.map((inq) => {
              const totalPaid = inq.deposit || 0; // In a real app we'd sum payments table, but deposit holds initial
              const price = inq.price || 1;
              const progress = Math.min(100, Math.round((totalPaid / price) * 100));
              return (
                <tr key={inq.id} style={{ borderBottom: "1px solid " + CARD_BORDER, background: "#fff" }}>
                  <td style={{ padding: "16px 24px" }}>
                    <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, color: NAVY }}>{inq.client_full_name}</div>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#6B7280" }}>{inq.phase_name} • Plot {inq.plot_number_ref}</div>
                  </td>
                  <td style={{ padding: "16px 24px", fontFamily: "Inter, sans-serif", fontSize: 14, color: NAVY, fontWeight: 600 }}>
                    Ksh {price.toLocaleString()}
                  </td>
                  <td style={{ padding: "16px 24px", fontFamily: "Inter, sans-serif", fontSize: 14, color: "#059669", fontWeight: 600 }}>
                    Ksh {totalPaid.toLocaleString()}
                  </td>
                  <td style={{ padding: "16px 24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ flex: 1, height: 8, background: CANVAS, borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ width: `${progress}%`, height: "100%", background: progress === 100 ? "#059669" : "var(--primary)", borderRadius: 4 }} />
                      </div>
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: NAVY }}>{progress}%</span>
                    </div>
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
