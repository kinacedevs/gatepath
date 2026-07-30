/**
 * Gatepath Realtors — Staff Accounts (Phase 5A mechanical split)
 * Relocated verbatim from the old "staff" tab (admin.tsx, previously
 * ~1363-1504). Same JSX, same inline styles, same NAVY hex — copied as-is,
 * not redesigned. The one real change: this tab's own scoped fetch
 * (admin_users only) replaces the old shared 9-table Promise.all.
 *
 * handleAddStaff is kept AS-IS — already routed through the inviteStaffFn
 * server function (src/lib/adminActions.ts), which re-verifies the caller
 * is really the CEO from their session token server-side.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAdminSession } from "@/context/AdminSessionContext";
import { inviteStaffFn } from "@/lib/adminActions";
import type { AdminUser } from "@/lib/types";

export const Route = createFileRoute("/admin/staff")({
  component: StaffAccounts,
});

const NAVY = "#0C1A30";
const GOLD = "var(--accent)";
const CARD_BORDER = "#E5E0D8";

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

function StaffAccounts() {
  const { adminRole } = useAdminSession();

  const [staff, setStaff] = useState<AdminUser[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffRole, setNewStaffRole] = useState<"ceo" | "manager" | "agent">("agent");
  const [staffMsg, setStaffMsg] = useState<string | null>(null);
  const [staffAddLoading, setStaffAddLoading] = useState(false);

  const loadData = async () => {
    setDataLoading(true);
    try {
      const staffRes = await supabase.from("admin_users").select("*").order("role");
      setStaff((staffRes.data as AdminUser[]) ?? []);
    } catch (err) {
      console.error("Error loading staff data:", err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffMsg(null);

    if (adminRole !== "ceo") {
      setStaffMsg("Critical Operation: Only the CEO can add or modify staff.");
      return;
    }

    const email = newStaffEmail.trim();
    const fullName = newStaffName.trim();
    if (!email || !fullName) {
      setStaffMsg("Enter both an email and a full name.");
      return;
    }

    setStaffAddLoading(true);

    // Creating a login (auth.users row) requires the service-role key, which
    // the browser must never hold — that's why this goes through a server
    // function rather than a direct client insert. The server function
    // re-verifies the caller is really the CEO from their session token; it
    // does not trust adminRole as sent from here.
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      setStaffMsg("Your session expired — please sign in again.");
      setStaffAddLoading(false);
      return;
    }

    try {
      const result = await (inviteStaffFn as any)({
        data: { callerAccessToken: accessToken, email, fullName, role: newStaffRole },
      });

      if (!result.success) {
        setStaffMsg("Error adding staff: " + result.error);
      } else {
        setStaffMsg(`Invite sent to ${email}. They'll set their password from that email.`);
        setNewStaffEmail("");
        setNewStaffName("");
        loadData();
      }
    } catch (err: any) {
      setStaffMsg("Error adding staff: " + (err?.message ?? "Unknown error."));
    } finally {
      setStaffAddLoading(false);
    }
  };

  void dataLoading;

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 24, color: NAVY, margin: 0 }}>Staff Accounts</h1>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280", marginTop: 4 }}>Manage operations team members and role assignments.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20 }}>
        {/* Staff List */}
        <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${CARD_BORDER}`, boxShadow: "0 2px 12px rgba(12,26,48,0.05)", padding: "24px" }}>
          <h3 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 600, fontSize: 17, color: NAVY, marginBottom: 20, marginTop: 0 }}>
            Active Operations Team
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {staff.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0", color: "#9CA3AF", fontFamily: "Inter, sans-serif", fontSize: 13 }}>
                No staff profiles yet.
              </div>
            ) : staff.map((member) => {
              const colorIdx = (member.full_name || "").charCodeAt(0) % avatarColors.length;
              const roleColors: Record<string, { bg: string; color: string }> = {
                ceo: { bg: `${GOLD}20`, color: GOLD },
                manager: { bg: "#DBEAFE", color: "#2563EB" },
                agent: { bg: "#D1FAE5", color: "#059669" },
              };
              const rc = roleColors[member.role] ?? { bg: "#F3F4F6", color: "#6B7280" };
              return (
                <div key={member.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "14px 16px",
                  background: "#FAFAFA",
                  border: `1px solid ${CARD_BORDER}`,
                  borderRadius: 10,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 40, height: 40,
                      background: avatarColors[colorIdx],
                      borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "Montserrat, sans-serif",
                      fontWeight: 700, fontSize: 13, color: "#fff",
                    }}>
                      {getInitials(member.full_name || "S")}
                    </div>
                    <div>
                      <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, color: NAVY }}>{member.full_name}</div>
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{member.email}</div>
                    </div>
                  </div>
                  <span style={{
                    fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: "0.08em",
                    padding: "4px 12px", borderRadius: 20,
                    background: rc.bg, color: rc.color,
                  }}>
                    {member.role}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Add Staff Form */}
        <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${CARD_BORDER}`, boxShadow: "0 2px 12px rgba(12,26,48,0.05)", padding: "24px", alignSelf: "start" }}>
          <h3 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 600, fontSize: 17, color: NAVY, marginBottom: 18, marginTop: 0 }}>
            Add Staff Profile
          </h3>

          {staffMsg && (
            <div style={{
              marginBottom: 16,
              padding: "10px 14px",
              background: staffMsg.includes("Error") ? "#FEE2E2" : "#D1FAE5",
              border: `1px solid ${staffMsg.includes("Error") ? "#FECACA" : "#A7F3D0"}`,
              borderRadius: 8,
              fontFamily: "Inter, sans-serif", fontSize: 13,
              color: staffMsg.includes("Error") ? "#DC2626" : "#059669",
            }}>
              {staffMsg}
            </div>
          )}

          <form onSubmit={handleAddStaff} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { label: "Full Name", value: newStaffName, setter: setNewStaffName, type: "text", placeholder: "Joe Wambua" },
              { label: "Email Address", value: newStaffEmail, setter: setNewStaffEmail, type: "email", placeholder: "wambua@gatepathrealtors.com" },
            ].map((field) => (
              <div key={field.label}>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.09em" }}>
                  {field.label}
                </label>
                <input
                  type={field.type}
                  required
                  value={field.value}
                  onChange={(e) => field.setter(e.target.value)}
                  placeholder={field.placeholder}
                  style={{ width: "100%", padding: "10px 12px", border: `1px solid ${CARD_BORDER}`, borderRadius: 8, fontFamily: "Inter, sans-serif", fontSize: 13, color: NAVY, outline: "none", boxSizing: "border-box" }}
                />
              </div>
            ))}
            <div>
              <label style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "#6B7280", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.09em" }}>
                Assigned Role
              </label>
              <select
                value={newStaffRole}
                onChange={(e) => setNewStaffRole(e.target.value as any)}
                style={{ width: "100%", padding: "10px 12px", border: `1px solid ${CARD_BORDER}`, borderRadius: 8, fontFamily: "Inter, sans-serif", fontSize: 13, background: "#fff", color: NAVY, outline: "none" }}
              >
                <option value="agent">Agent (View inquiries/bookings)</option>
                <option value="manager">Manager (Approve/adjust plots)</option>
                <option value="ceo">CEO (Joe Muchiri — E-Signatures)</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={staffAddLoading}
              style={{
                marginTop: 4,
                padding: "12px",
                background: GOLD,
                border: "none",
                borderRadius: 9,
                color: "#fff",
                fontFamily: "Montserrat, sans-serif",
                fontWeight: 700,
                fontSize: 13,
                cursor: staffAddLoading ? "not-allowed" : "pointer",
                opacity: staffAddLoading ? 0.7 : 1,
                letterSpacing: "0.03em",
              }}
            >
              {staffAddLoading ? "Sending Invite…" : "Invite Staff Member"}
            </button>
          </form>
        </div>
      </div>

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
