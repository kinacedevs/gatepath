/**
 * Gatepath Realtors — System Settings (VIZ_BLUEPRINT Phase 2, Slice 11 — last)
 * Token migration off the Phase 5A inline-style residue. Per docs/VIZ_SPEC.md
 * §12, every one of this screen's blueprint ambitions (integration health
 * dots, audit-log viewer, backup/FX-refresh status, pipeline/template
 * editors) is 🔴 Needs schema/build — none are buildable today, so this is
 * the one slice with no new KPIs or charts: there is nothing real to count
 * or chart here, and fabricating fake widgets would break the same
 * no-fabrication discipline followed on every prior slice. Instead: real
 * session data now backs "My Profile" (was hardcoded), the two decorative
 * toggles are honestly labeled "Coming soon" instead of implying they work,
 * and a roadmap card names the four real gaps in plain language.
 */
import { createFileRoute } from "@tanstack/react-router";
import { UserCheck, Shield, Rocket } from "lucide-react";
import { useAdminSession } from "@/context/AdminSessionContext";
import { SectionCard } from "@/components/admin/SectionCard";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const Route = createFileRoute("/admin/settings")({
  component: SystemSettings,
});

const ROLE_TONE = {
  ceo: "warning",
  manager: "info",
  agent: "success",
} as const;

const ROADMAP_ITEMS = [
  "Integration health monitoring (Paystack, Africa's Talking, Resend, n8n, WhatsApp/Meta)",
  "Audit-log viewer for staff and system activity",
  "Scheduled-backup and FX-rate refresh status",
  "Pipeline stage and message-template editors",
];

function SystemSettings() {
  const { adminName, adminRole, sessionUser } = useAdminSession();

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-primary font-bold">
          System Settings
        </h1>
        <p className="text-body-md text-on-surface-variant">
          Configure your Gatepath CRM preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-primary">
              <UserCheck size={20} />
            </div>
            <div className="flex items-center gap-2">
              <h2 className="font-headline-md text-lg text-primary font-bold">My Profile</h2>
              <StatusBadge tone={ROLE_TONE[adminRole]}>{adminRole}</StatusBadge>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={adminName || "—"}
                readOnly
                className="w-full px-4 py-3 rounded-lg border border-outline-variant/40 bg-surface-container-low text-[14px] text-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={sessionUser.email}
                readOnly
                className="w-full px-4 py-3 rounded-lg border border-outline-variant/40 bg-surface-container-low text-[14px] text-primary"
              />
            </div>
            <button
              disabled
              className="p-3 bg-primary-container text-white rounded-lg font-semibold text-sm opacity-50 cursor-not-allowed"
            >
              Profile editing coming soon
            </button>
          </div>
        </SectionCard>

        <SectionCard>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-surface-container-low flex items-center justify-center text-primary">
              <Shield size={20} />
            </div>
            <h2 className="font-headline-md text-lg text-primary font-bold">
              Security Preferences
            </h2>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center pb-4 border-b border-outline-variant/30">
              <div>
                <div className="font-semibold text-[14px] text-primary">
                  Two-Factor Authentication
                </div>
                <div className="text-xs text-on-surface-variant">
                  Require OTP for all admin logins.
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <StatusBadge tone="neutral">Coming soon</StatusBadge>
                <div className="w-11 h-6 rounded-full bg-accent/40 relative cursor-not-allowed">
                  <div className="w-5 h-5 rounded-full bg-white absolute top-0.5 right-0.5 shadow-sm" />
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <div className="font-semibold text-[14px] text-primary">Email Notifications</div>
                <div className="text-xs text-on-surface-variant">
                  Alert on new bookings &amp; payments.
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <StatusBadge tone="neutral">Coming soon</StatusBadge>
                <div className="w-11 h-6 rounded-full bg-accent/40 relative cursor-not-allowed">
                  <div className="w-5 h-5 rounded-full bg-white absolute top-0.5 right-0.5 shadow-sm" />
                </div>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Coming to Settings">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-surface-container-low flex items-center justify-center text-accent-dark shrink-0">
            <Rocket size={18} />
          </div>
          <p className="text-[13px] text-on-surface-variant pt-1.5">
            These need real backing data or a dedicated build before they can ship honestly —
            tracked here rather than shown as placeholder widgets.
          </p>
        </div>
        <ul className="flex flex-col gap-2.5">
          {ROADMAP_ITEMS.map((item) => (
            <li key={item} className="flex items-center gap-2.5 text-[13px] text-on-surface pl-1">
              <span className="w-1.5 h-1.5 rounded-full bg-outline-variant shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
