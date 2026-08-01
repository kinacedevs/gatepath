/**
 * Gatepath Realtors — Staff Accounts (VIZ_BLUEPRINT Phase 2, Slice 10)
 * Token migration off the Phase 5A inline-style residue. handleAddStaff is
 * untouched — already routed through the verified inviteStaffFn server
 * function (src/lib/adminActions.ts), which re-checks the caller is really
 * the CEO server-side from their session token, not from adminRole as sent
 * client-side. No CLAUDE.md violation here; nothing to fix.
 *
 * Per docs/VIZ_SPEC.md §11, this is one of the thinnest slices: only
 * "Active staff" and "Roles" are real. Recent logins, pending invites, a
 * login/activity audit timeline, and a permission matrix all need schema
 * that doesn't exist (Supabase Auth's internal logs aren't exposed to the
 * app; inviteStaffFn creates the user directly with no pending/accepted
 * invite state; RBAC today is 3 flat roles with scattered adminRole==="ceo"
 * checks, not a real matrix) — flagged, not built.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Users, ShieldCheck, UserCog, UserRound } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdminSession } from "@/context/AdminSessionContext";
import { inviteStaffFn } from "@/lib/adminActions";
import { KpiCard } from "@/components/admin/KpiCard";
import { SectionCard } from "@/components/admin/SectionCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { EmptyState } from "@/components/admin/EmptyState";
import { FreshnessStamp } from "@/components/admin/FreshnessStamp";
import { SplitDonutChart } from "@/components/admin/charts/SplitDonutChart";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminUser } from "@/lib/types";

export const Route = createFileRoute("/admin/staff")({
  component: StaffAccounts,
});

const ROLE_TONE = {
  ceo: "warning",
  manager: "info",
  agent: "success",
} as const;

const avatarColors = [
  "var(--accent)",
  "var(--primary)",
  "var(--available)",
  "#A855F7",
  "#EC4899",
  "#14B8A6",
  "#F97316",
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
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffName, setNewStaffName] = useState("");
  const [newStaffRole, setNewStaffRole] = useState<"ceo" | "manager" | "agent">("agent");
  const [staffMsg, setStaffMsg] = useState<string | null>(null);
  const [staffAddLoading, setStaffAddLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const staffRes = await supabase.from("admin_users").select("*").order("role");
      setStaff((staffRes.data as AdminUser[]) ?? []);
    } catch (err) {
      console.error("Error loading staff data:", err);
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
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

  const roleCounts = useMemo(() => {
    return {
      ceo: staff.filter((s) => s.role === "ceo").length,
      manager: staff.filter((s) => s.role === "manager").length,
      agent: staff.filter((s) => s.role === "agent").length,
    };
  }, [staff]);

  const roleDistribution = useMemo(
    () =>
      [
        { name: "CEO", value: roleCounts.ceo, color: "var(--accent)" },
        { name: "Manager", value: roleCounts.manager, color: "var(--primary)" },
        { name: "Agent", value: roleCounts.agent, color: "var(--available)" },
      ].filter((d) => d.value > 0),
    [roleCounts],
  );

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary font-bold">
            Staff Accounts
          </h1>
          <p className="text-body-md text-on-surface-variant">
            Manage operations team members and role assignments.
          </p>
        </div>
        <FreshnessStamp updatedAt={lastUpdated} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Staff" value={loading ? "…" : String(staff.length)} icon={Users} />
        <KpiCard
          label="Managers"
          value={loading ? "…" : String(roleCounts.manager)}
          icon={UserCog}
        />
        <KpiCard label="Agents" value={loading ? "…" : String(roleCounts.agent)} icon={UserRound} />
        <KpiCard
          label="CEOs"
          value={loading ? "…" : String(roleCounts.ceo)}
          icon={ShieldCheck}
          tone="success"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        <SectionCard title="Active Operations Team">
          {loading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
            </div>
          ) : staff.length === 0 ? (
            <EmptyState icon={Users} title="No staff profiles yet." />
          ) : (
            <div className="flex flex-col gap-3">
              {staff.map((member) => {
                const colorIdx = (member.full_name || "").charCodeAt(0) % avatarColors.length;
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between px-4 py-3.5 bg-surface-container-low border border-outline-variant/30 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-headline-md font-bold text-[13px] text-white"
                        style={{ background: avatarColors[colorIdx] }}
                      >
                        {getInitials(member.full_name || "S")}
                      </div>
                      <div>
                        <div className="font-semibold text-[14px] text-primary">
                          {member.full_name}
                        </div>
                        <div className="text-[12px] text-on-surface-variant mt-0.5">
                          {member.email}
                        </div>
                      </div>
                    </div>
                    <StatusBadge tone={ROLE_TONE[member.role]}>{member.role}</StatusBadge>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        <div className="flex flex-col gap-4">
          <SectionCard title="Role Distribution">
            {loading ? (
              <Skeleton className="h-45 rounded-xl" />
            ) : roleDistribution.length === 0 ? (
              <EmptyState title="No roles to show yet" />
            ) : (
              <SplitDonutChart data={roleDistribution} height={180} />
            )}
          </SectionCard>

          <SectionCard title="Add Staff Profile">
            {staffMsg && (
              <div
                className={`mb-4 px-3.5 py-2.5 rounded-lg text-[13px] ${
                  staffMsg.includes("Error") || staffMsg.includes("Critical")
                    ? "bg-error/10 text-error"
                    : "bg-success-container/15 text-on-success-container"
                }`}
              >
                {staffMsg}
              </div>
            )}

            <form onSubmit={handleAddStaff} className="flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  placeholder="Joe Wambua"
                  className="w-full p-2.5 border border-outline-variant/40 rounded-lg text-[13px] text-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  placeholder="wambua@gatepathrealtors.com"
                  className="w-full p-2.5 border border-outline-variant/40 rounded-lg text-[13px] text-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">
                  Assigned Role
                </label>
                <select
                  value={newStaffRole}
                  onChange={(e: any) => setNewStaffRole(e.target.value)}
                  className="w-full p-2.5 border border-outline-variant/40 rounded-lg text-[13px] bg-white text-primary outline-none"
                >
                  <option value="agent">Agent (View inquiries/bookings)</option>
                  <option value="manager">Manager (Approve/adjust plots)</option>
                  <option value="ceo">CEO (Joe Muchiri — E-Signatures)</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={staffAddLoading}
                className="mt-1 py-3 bg-accent rounded-lg text-white font-bold text-[13px] tracking-wide disabled:opacity-70"
              >
                {staffAddLoading ? "Sending Invite…" : "Invite Staff Member"}
              </button>
            </form>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
