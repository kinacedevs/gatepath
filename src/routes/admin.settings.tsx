/**
 * Gatepath Realtors — System Settings (Phase 5A mechanical split)
 * Relocated verbatim from the old "settings" tab (admin.tsx, previously
 * ~2607-2671). Same JSX, same inline styles, same NAVY hex — copied as-is,
 * not redesigned. No data fetch: this tab is entirely static/hardcoded
 * placeholder content (disabled form fields, fake toggle switches) in the
 * original, so nothing needed relocating beyond the JSX itself.
 */
import { createFileRoute } from "@tanstack/react-router";
import { UserCheck, Shield } from "lucide-react";

export const Route = createFileRoute("/admin/settings")({
  component: SystemSettings,
});

const NAVY = "#0C1A30";
const GOLD = "var(--accent)";
const CANVAS = "var(--stone)";
const CARD_BORDER = "#E5E0D8";

function SystemSettings() {
  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 24, color: NAVY, margin: 0 }}>System Settings</h1>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280", marginTop: 4 }}>
          Configure your Gatepath CRM preferences.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${CARD_BORDER}`, padding: 32, boxShadow: "0 2px 12px rgba(12,26,48,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: CANVAS, display: "flex", alignItems: "center", justifyContent: "center", color: NAVY }}>
              <UserCheck size={20} />
            </div>
            <div>
              <h2 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 18, color: NAVY, margin: 0 }}>My Profile</h2>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 6 }}>Full Name</label>
              <input type="text" defaultValue="Gatepath CEO" readOnly style={{ width: "100%", padding: "12px 16px", borderRadius: 8, border: `1px solid ${CARD_BORDER}`, background: CANVAS, fontFamily: "Inter, sans-serif", fontSize: 14, color: NAVY }} />
            </div>
            <div>
              <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 6 }}>Email Address</label>
              <input type="email" defaultValue="ceo@gatepathrealtors.com" readOnly style={{ width: "100%", padding: "12px 16px", borderRadius: 8, border: `1px solid ${CARD_BORDER}`, background: CANVAS, fontFamily: "Inter, sans-serif", fontSize: 14, color: NAVY }} />
            </div>
            <button disabled style={{ padding: "12px", background: NAVY, color: "#fff", borderRadius: 8, border: "none", fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, opacity: 0.5, cursor: "not-allowed" }}>Update Profile (Auth Disabled)</button>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${CARD_BORDER}`, padding: 32, boxShadow: "0 2px 12px rgba(12,26,48,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: CANVAS, display: "flex", alignItems: "center", justifyContent: "center", color: NAVY }}>
              <Shield size={20} />
            </div>
            <div>
              <h2 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 18, color: NAVY, margin: 0 }}>Security Preferences</h2>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 16, borderBottom: `1px solid ${CARD_BORDER}` }}>
              <div>
                <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, color: NAVY }}>Two-Factor Authentication</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#6B7280" }}>Require OTP for all admin logins.</div>
              </div>
              <div style={{ width: 44, height: 24, borderRadius: 12, background: GOLD, position: "relative", cursor: "pointer" }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, right: 2, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, color: NAVY }}>Email Notifications</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#6B7280" }}>Alert on new bookings & payments.</div>
              </div>
              <div style={{ width: 44, height: 24, borderRadius: 12, background: GOLD, position: "relative", cursor: "pointer" }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, right: 2, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
