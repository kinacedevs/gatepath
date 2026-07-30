/**
 * Gatepath Realtors — Agent Performance (Phase 5A mechanical split)
 * Relocated verbatim from the old "agents" tab (admin.tsx, previously
 * ~2204-2268). Same JSX, same inline styles, same NAVY hex — copied as-is,
 * not redesigned. The one real change: this tab's own scoped fetch
 * (admin_users filtered to agents, inquiries, agreements) replaces the old
 * shared 9-table Promise.all.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { AdminUser, Inquiry, Agreement } from "@/lib/types";

export const Route = createFileRoute("/admin/agents")({
  component: AgentPerformance,
});

const NAVY = "#0C1A30";
const GOLD = "var(--accent)";
const CANVAS = "var(--stone)";
const CARD_BORDER = "#E5E0D8";

function AgentPerformance() {
  const [staff, setStaff] = useState<AdminUser[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  const loadData = async () => {
    setDataLoading(true);
    try {
      const [staffRes, inquiriesRes, agreementsRes] = await Promise.all([
        supabase.from("admin_users").select("*").order("role"),
        supabase.from("inquiries").select("*"),
        supabase.from("agreements").select("*"),
      ]);

      setStaff((staffRes.data as AdminUser[]) ?? []);
      setInquiries((inquiriesRes.data as Inquiry[]) ?? []);
      setAgreements((agreementsRes.data as Agreement[]) ?? []);
    } catch (err) {
      console.error("Error loading agent performance data:", err);
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
          <h1 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 24, color: NAVY, margin: 0 }}>Agent Performance</h1>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280", marginTop: 4 }}>
            Monitor sales performance and lead conversion rates for all registered agents.
          </p>
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${CARD_BORDER}`, boxShadow: "0 2px 12px rgba(12,26,48,0.05)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead style={{ background: CANVAS, borderBottom: `1px solid ${CARD_BORDER}` }}>
            <tr>
              <th style={{ padding: "16px 24px", fontFamily: "Montserrat, sans-serif", fontSize: 12, fontWeight: 700, color: NAVY, textTransform: "uppercase", letterSpacing: "0.05em" }}>Agent</th>
              <th style={{ padding: "16px 24px", fontFamily: "Montserrat, sans-serif", fontSize: 12, fontWeight: 700, color: NAVY, textTransform: "uppercase", letterSpacing: "0.05em" }}>Assigned Leads</th>
              <th style={{ padding: "16px 24px", fontFamily: "Montserrat, sans-serif", fontSize: 12, fontWeight: 700, color: NAVY, textTransform: "uppercase", letterSpacing: "0.05em" }}>Closed Deals</th>
              <th style={{ padding: "16px 24px", fontFamily: "Montserrat, sans-serif", fontSize: 12, fontWeight: 700, color: NAVY, textTransform: "uppercase", letterSpacing: "0.05em" }}>Conversion Rate</th>
            </tr>
          </thead>
          <tbody>
            {staff.filter(s => s.role === "agent").map((agent, i) => {
              const agentLeads = inquiries.filter(inq => inq.cro_name === agent.full_name || inq.cro_name === agent.email);
              const closed = agentLeads.filter(inq => agreements.some(a => a.inquiry_id === inq.id && a.ceo_signed));
              const convRate = agentLeads.length > 0 ? ((closed.length / agentLeads.length) * 100).toFixed(1) : 0;
              return (
                <tr key={agent.id} style={{ borderBottom: i === staff.length - 1 ? "none" : `1px solid ${CARD_BORDER}`, background: "#fff" }}>
                  <td style={{ padding: "16px 24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: CANVAS, display: "flex", alignItems: "center", justifyContent: "center", color: NAVY, fontWeight: 600, fontSize: 14 }}>
                        {(agent.full_name || agent.email).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, color: NAVY }}>{agent.full_name || "Unknown"}</div>
                        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#6B7280" }}>{agent.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "16px 24px", fontFamily: "Inter, sans-serif", fontSize: 14, color: NAVY }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Users size={16} color="#6B7280" /> {agentLeads.length}
                    </div>
                  </td>
                  <td style={{ padding: "16px 24px", fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, color: "#059669" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <CheckCircle size={16} /> {closed.length}
                    </div>
                  </td>
                  <td style={{ padding: "16px 24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ flex: 1, height: 6, background: CANVAS, borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: `${convRate}%`, height: "100%", background: GOLD, borderRadius: 3 }} />
                      </div>
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: NAVY }}>{convRate}%</span>
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
