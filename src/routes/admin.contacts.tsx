/**
 * Gatepath Realtors — Client Contacts (Phase 5A mechanical split)
 * Relocated verbatim from the old "contacts" tab (admin.tsx, previously
 * ~2273-2328). Same JSX, same inline styles, same NAVY hex, same dedup
 * pattern (Map keyed by client_email, capped at 15) — copied as-is, not
 * redesigned. The one real change: this tab's own scoped fetch (inquiries
 * only) replaces the old shared 9-table Promise.all.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, PhoneCall, Activity } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Inquiry } from "@/lib/types";

export const Route = createFileRoute("/admin/contacts")({
  component: ClientContacts,
});

const NAVY = "#0C1A30";
const CANVAS = "var(--stone)";
const CARD_BORDER = "#E5E0D8";

function ClientContacts() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  const loadData = async () => {
    setDataLoading(true);
    try {
      const inquiriesRes = await supabase
        .from("inquiries")
        .select("*")
        .order("created_at", { ascending: false });
      setInquiries((inquiriesRes.data as Inquiry[]) ?? []);
    } catch (err) {
      console.error("Error loading contacts data:", err);
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
        <h1 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 24, color: NAVY, margin: 0 }}>Client Contacts</h1>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280", marginTop: 4 }}>
          Centralized directory of all clients who have submitted inquiries or booked plots.
        </p>
      </div>
      <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${CARD_BORDER}`, boxShadow: "0 2px 12px rgba(12,26,48,0.05)", overflow: "hidden" }}>
        <div style={{ padding: 16, borderBottom: `1px solid ${CARD_BORDER}`, display: "flex", gap: 12 }}>
          <div style={{ position: "relative", flex: 1, maxWidth: 300 }}>
            <Search size={16} style={{ position: "absolute", left: 14, top: 12, color: "#9CA3AF" }} />
            <input type="text" placeholder="Search by name, phone or email..." style={{ width: "100%", padding: "10px 14px 10px 40px", borderRadius: 8, border: `1px solid ${CARD_BORDER}`, fontFamily: "Inter, sans-serif", fontSize: 13 }} />
          </div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead style={{ background: CANVAS, borderBottom: `1px solid ${CARD_BORDER}` }}>
            <tr>
              <th style={{ padding: "16px 24px", fontFamily: "Montserrat, sans-serif", fontSize: 12, fontWeight: 700, color: NAVY, textTransform: "uppercase", letterSpacing: "0.05em" }}>Client Details</th>
              <th style={{ padding: "16px 24px", fontFamily: "Montserrat, sans-serif", fontSize: 12, fontWeight: 700, color: NAVY, textTransform: "uppercase", letterSpacing: "0.05em" }}>Phone</th>
              <th style={{ padding: "16px 24px", fontFamily: "Montserrat, sans-serif", fontSize: 12, fontWeight: 700, color: NAVY, textTransform: "uppercase", letterSpacing: "0.05em" }}>ID / KRA</th>
              <th style={{ padding: "16px 24px", fontFamily: "Montserrat, sans-serif", fontSize: 12, fontWeight: 700, color: NAVY, textTransform: "uppercase", letterSpacing: "0.05em" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(new Map(inquiries.map(inq => [inq.client_email, inq])).values()).slice(0, 15).map((inq) => (
              <tr key={inq.id} style={{ borderBottom: "1px solid " + CARD_BORDER, background: "#fff" }}>
                <td style={{ padding: "16px 24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#EFF6FF", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>
                      {inq.client_full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, color: NAVY }}>{inq.client_full_name}</div>
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#6B7280" }}>{inq.client_email}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "16px 24px", fontFamily: "Inter, sans-serif", fontSize: 14, color: NAVY }}>{inq.client_phone}</td>
                <td style={{ padding: "16px 24px", fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280" }}>
                  <div>ID: {inq.client_id_passport}</div>
                  <div>KRA: {inq.client_kra_pin || "—"}</div>
                </td>
                <td style={{ padding: "16px 24px" }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <a href={`tel:${inq.client_phone}`} style={{ padding: 8, background: CANVAS, borderRadius: 6, color: NAVY }}><PhoneCall size={16} /></a>
                    <a href={`mailto:${inq.client_email}`} style={{ padding: 8, background: CANVAS, borderRadius: 6, color: NAVY }}><Activity size={16} /></a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
