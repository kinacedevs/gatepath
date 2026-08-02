/**
 * Gatepath Realtors — System Settings (Settings Expansion pass)
 * Restructured from a 2-panel screen into tabs, same shadcn Tabs
 * consolidation pattern already used in admin.campaigns.tsx/
 * admin.site-content.tsx. My Profile & Security content is unchanged from
 * before this pass.
 *
 * New tabs close 3 of the 4 gaps this screen's own "Coming to Settings"
 * roadmap named back in Phase 2 Slice 11: Pipeline Labels (relabel only,
 * per explicit user choice — inquiries.status itself is untouched),
 * Message Templates (7 outreach emails retrofitted with a fallback-first
 * design — see messageTemplateActions.ts), FX Rates (currency.ts is still
 * static; this is the real admin-editable source, not yet wired into the
 * 4 public multi-currency pages — a named next step), and Data Export
 * (CSV, not infrastructure backup — Supabase already provides that).
 * Integration health monitoring and the API key manager already shipped
 * in Module 16 (admin.integrations.tsx) — not duplicated here.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UserCheck, Shield, Rocket, Loader2, Download } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdminSession } from "@/context/AdminSessionContext";
import { SectionCard } from "@/components/admin/SectionCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { EmptyState } from "@/components/admin/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DEFAULT_PIPELINE_LABELS, savePipelineLabelsFn } from "@/lib/pipelineLabelsActions";
import { saveMessageTemplateFn, resetMessageTemplateFn } from "@/lib/messageTemplateActions";
import { saveFxRatesFn } from "@/lib/fxRateActions";
import { exportTableCsvFn } from "@/lib/dataExportActions";
import { CURRENCY_RATES, CURRENCIES, type Currency } from "@/lib/currency";
import type { MessageTemplate } from "@/lib/types";

export const Route = createFileRoute("/admin/settings")({
  component: SystemSettings,
});

const ROLE_TONE = {
  ceo: "warning",
  manager: "info",
  agent: "success",
} as const;

const ROADMAP_ITEMS = [
  "Custom fields for inquiries/leads",
  "Full pipeline restructuring (add/remove/reorder stages, not just relabel)",
  "Scheduled/automatic refresh (backups, FX rates) — needs the Automation/n8n module",
  "Live FX-rate propagation into the public diaspora/property pages",
];

const TEMPLATE_DEFS: { key: string; name: string }[] = [
  { key: "task_reminder", name: "Task Reminder" },
  { key: "payment_reminder", name: "Payment Reminder" },
  { key: "match_alert", name: "Property Match Alert" },
  { key: "testimonial_request", name: "Testimonial Request" },
  { key: "referral_invite", name: "Referral Invite" },
  { key: "commission_statement", name: "Commission Statement" },
  { key: "executive_report", name: "Executive Report" },
];

function SystemSettings() {
  const { adminName, adminRole, sessionUser } = useAdminSession();
  const canWrite = adminRole !== "agent";
  const canWriteMoney = adminRole === "ceo" || adminRole === "manager";

  const [loading, setLoading] = useState(true);
  const [pipelineLabels, setPipelineLabels] =
    useState<Record<"pending" | "reviewed" | "approved" | "rejected", string>>(
      DEFAULT_PIPELINE_LABELS,
    );
  const [savedTemplates, setSavedTemplates] = useState<MessageTemplate[]>([]);
  const [fxRates, setFxRates] = useState<Record<Currency, number>>(CURRENCY_RATES);

  const [pipelineSaving, setPipelineSaving] = useState(false);
  const [pipelineMsg, setPipelineMsg] = useState<string | null>(null);

  const [editingTemplateKey, setEditingTemplateKey] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateMsg, setTemplateMsg] = useState<string | null>(null);

  const [fxSaving, setFxSaving] = useState(false);
  const [fxMsg, setFxMsg] = useState<string | null>(null);

  const [exportingTable, setExportingTable] = useState<string | null>(null);
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  const getAccessToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  };

  const loadData = async () => {
    setLoading(true);
    const [bannersRes, templatesRes] = await Promise.all([
      supabase.from("site_banners").select("*").in("id", ["pipeline_labels", "fx_rates"]),
      supabase.from("message_templates").select("*").order("name"),
    ]);

    const banners = (bannersRes.data as { id: string; data: any }[]) ?? [];
    const labelBanner = banners.find((b) => b.id === "pipeline_labels");
    if (labelBanner?.data) {
      setPipelineLabels({ ...DEFAULT_PIPELINE_LABELS, ...labelBanner.data });
    }
    const fxBanner = banners.find((b) => b.id === "fx_rates");
    if (fxBanner?.data?.rates) {
      setFxRates({ ...CURRENCY_RATES, ...fxBanner.data.rates });
    }

    setSavedTemplates((templatesRes.data as MessageTemplate[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const savePipelineLabels = async (e: React.FormEvent) => {
    e.preventDefault();
    setPipelineSaving(true);
    setPipelineMsg(null);
    const token = await getAccessToken();
    if (!token) {
      setPipelineMsg("Your session expired — please sign in again.");
      setPipelineSaving(false);
      return;
    }
    const result = await (savePipelineLabelsFn as any)({
      data: { callerAccessToken: token, labels: pipelineLabels },
    });
    setPipelineMsg(result.success ? "Saved." : "Error: " + result.error);
    setPipelineSaving(false);
  };

  const openTemplateEditor = (key: string) => {
    const saved = savedTemplates.find((t) => t.key === key);
    setEditingTemplateKey(key);
    setEditSubject(saved?.subject ?? "");
    setEditBody(saved?.body ?? "");
    setTemplateMsg(null);
  };

  const saveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplateKey) return;
    setTemplateSaving(true);
    setTemplateMsg(null);
    const token = await getAccessToken();
    if (!token) {
      setTemplateMsg("Your session expired — please sign in again.");
      setTemplateSaving(false);
      return;
    }
    const def = TEMPLATE_DEFS.find((t) => t.key === editingTemplateKey)!;
    const result = await (saveMessageTemplateFn as any)({
      data: {
        callerAccessToken: token,
        key: editingTemplateKey,
        name: def.name,
        subject: editSubject,
        body: editBody,
      },
    });
    if (!result.success) {
      setTemplateMsg("Error: " + result.error);
    } else {
      setEditingTemplateKey(null);
      loadData();
    }
    setTemplateSaving(false);
  };

  const resetTemplate = async (key: string) => {
    if (!confirm("Reset this template to the default? Your custom version will be deleted."))
      return;
    const token = await getAccessToken();
    if (!token) {
      setTemplateMsg("Your session expired — please sign in again.");
      return;
    }
    const result = await (resetMessageTemplateFn as any)({
      data: { callerAccessToken: token, key },
    });
    if (!result.success) setTemplateMsg("Error: " + result.error);
    else loadData();
  };

  const saveFxRates = async (e: React.FormEvent) => {
    e.preventDefault();
    setFxSaving(true);
    setFxMsg(null);
    const token = await getAccessToken();
    if (!token) {
      setFxMsg("Your session expired — please sign in again.");
      setFxSaving(false);
      return;
    }
    const result = await (saveFxRatesFn as any)({
      data: { callerAccessToken: token, rates: fxRates },
    });
    setFxMsg(result.success ? "Saved." : "Error: " + result.error);
    setFxSaving(false);
  };

  const runExport = async (table: "inquiries" | "payments" | "plots") => {
    setExportingTable(table);
    setExportMsg(null);
    const token = await getAccessToken();
    if (!token) {
      setExportMsg("Your session expired — please sign in again.");
      setExportingTable(null);
      return;
    }
    const result = await (exportTableCsvFn as any)({ data: { callerAccessToken: token, table } });
    if (!result.success) {
      setExportMsg("Error: " + result.error);
    } else {
      const blob = new Blob([result.csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
    }
    setExportingTable(null);
  };

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

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">My Profile & Security</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline Labels</TabsTrigger>
          <TabsTrigger value="templates">Message Templates</TabsTrigger>
          <TabsTrigger value="fx">FX Rates</TabsTrigger>
          <TabsTrigger value="export">Data Export</TabsTrigger>
        </TabsList>

        {/* ── MY PROFILE & SECURITY (unchanged) ── */}
        <TabsContent value="profile">
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
                    <div className="font-semibold text-[14px] text-primary">
                      Email Notifications
                    </div>
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

          <SectionCard title="Coming to Settings" className="mt-6">
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
                <li
                  key={item}
                  className="flex items-center gap-2.5 text-[13px] text-on-surface pl-1"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-outline-variant shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </SectionCard>
        </TabsContent>

        {/* ── PIPELINE LABELS (relabel only) ── */}
        <TabsContent value="pipeline">
          <SectionCard title="Kanban Pipeline Labels">
            <p className="text-[13px] text-on-surface-variant mb-4">
              Display labels only — the underlying 4 statuses and every screen's write logic are
              unchanged. Shown on the Leads Kanban and Field Mode.
            </p>
            {loading ? (
              <Skeleton className="h-40 rounded-xl" />
            ) : (
              <form onSubmit={savePipelineLabels} className="flex flex-col gap-4 max-w-md">
                {(["pending", "reviewed", "approved", "rejected"] as const).map((status) => (
                  <div key={status}>
                    <label className="block text-xs font-semibold text-on-surface-variant mb-1.5 capitalize">
                      {status}
                    </label>
                    <input
                      type="text"
                      value={pipelineLabels[status]}
                      onChange={(e) =>
                        setPipelineLabels((p) => ({ ...p, [status]: e.target.value }))
                      }
                      disabled={!canWrite}
                      className="w-full px-4 py-2.5 rounded-lg border border-outline-variant/40 text-[14px] outline-none disabled:opacity-60"
                    />
                  </div>
                ))}
                {pipelineMsg && <p className="text-[13px] text-on-surface">{pipelineMsg}</p>}
                {canWrite && (
                  <button
                    type="submit"
                    disabled={pipelineSaving}
                    className="self-start px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold inline-flex items-center gap-1.5"
                  >
                    {pipelineSaving && <Loader2 size={13} className="animate-spin" />} Save Labels
                  </button>
                )}
              </form>
            )}
          </SectionCard>
        </TabsContent>

        {/* ── MESSAGE TEMPLATES ── */}
        <TabsContent value="templates">
          <SectionCard title="Message Templates">
            <p className="text-[13px] text-on-surface-variant mb-4">
              7 outreach emails. Each falls back to its built-in default until you save a custom
              version — nothing changes until you edit one. Use {"{{variableName}}"} placeholders.
            </p>
            {loading ? (
              <Skeleton className="h-40 rounded-xl" />
            ) : (
              <div className="flex flex-col gap-2">
                {TEMPLATE_DEFS.map((def) => {
                  const saved = savedTemplates.find((t) => t.key === def.key);
                  return (
                    <div
                      key={def.key}
                      className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg"
                    >
                      <div>
                        <span className="font-semibold text-[14px] text-primary-container">
                          {def.name}
                        </span>
                        <StatusBadge tone={saved ? "success" : "neutral"} className="ml-2">
                          {saved ? "Customized" : "Default"}
                        </StatusBadge>
                      </div>
                      {canWrite && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => openTemplateEditor(def.key)}
                            className="text-xs text-secondary underline"
                          >
                            Edit
                          </button>
                          {saved && (
                            <button
                              type="button"
                              onClick={() => resetTemplate(def.key)}
                              className="text-xs text-error underline"
                            >
                              Reset to Default
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          {editingTemplateKey && (
            <SectionCard
              title={`Edit — ${TEMPLATE_DEFS.find((t) => t.key === editingTemplateKey)?.name}`}
              className="mt-4"
            >
              <form onSubmit={saveTemplate} className="flex flex-col gap-4">
                <input
                  type="text"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  placeholder="Subject (leave blank to keep the built-in default)"
                  className="w-full px-4 py-2.5 rounded-lg border border-outline-variant/40 text-[14px] outline-none"
                />
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  placeholder="Full HTML body — required to override the default"
                  rows={10}
                  className="w-full px-4 py-2.5 rounded-lg border border-outline-variant/40 text-[13px] font-mono outline-none resize-y"
                />
                {templateMsg && <p className="text-[13px] text-on-surface">{templateMsg}</p>}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingTemplateKey(null)}
                    className="px-4 py-2 rounded-lg border border-outline-variant/40 text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={templateSaving || !editBody.trim()}
                    className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold inline-flex items-center gap-1.5"
                  >
                    {templateSaving && <Loader2 size={13} className="animate-spin" />} Save Template
                  </button>
                </div>
              </form>
            </SectionCard>
          )}
        </TabsContent>

        {/* ── FX RATES ── */}
        <TabsContent value="fx">
          <SectionCard title="FX Rate Source Config">
            <p className="text-[13px] text-on-surface-variant mb-4">
              The real, editable source of truth. Not yet wired into the public diaspora/property
              pages (a separate, dedicated follow-up) — this is the admin-side config only.
            </p>
            {loading ? (
              <Skeleton className="h-40 rounded-xl" />
            ) : (
              <form onSubmit={saveFxRates} className="flex flex-col gap-3 max-w-md">
                {CURRENCIES.filter((c) => c !== "KES").map((currency) => (
                  <div key={currency} className="flex items-center gap-3">
                    <label className="w-16 text-xs font-semibold text-on-surface-variant">
                      {currency}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={fxRates[currency]}
                      onChange={(e) =>
                        setFxRates((r) => ({ ...r, [currency]: Number(e.target.value) }))
                      }
                      disabled={!canWriteMoney}
                      className="flex-1 px-3 py-2 rounded-lg border border-outline-variant/40 text-[14px] outline-none disabled:opacity-60"
                    />
                    <span className="text-[11px] text-on-surface-variant">KES per unit</span>
                  </div>
                ))}
                {fxMsg && <p className="text-[13px] text-on-surface">{fxMsg}</p>}
                {canWriteMoney && (
                  <button
                    type="submit"
                    disabled={fxSaving}
                    className="self-start px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold inline-flex items-center gap-1.5"
                  >
                    {fxSaving && <Loader2 size={13} className="animate-spin" />} Save Rates
                  </button>
                )}
              </form>
            )}
          </SectionCard>
        </TabsContent>

        {/* ── DATA EXPORT ── */}
        <TabsContent value="export">
          <SectionCard title="Data Export">
            <p className="text-[13px] text-on-surface-variant mb-4">
              CSV export for portability/reporting — full infrastructure backup is already handled
              by Supabase's own managed platform. Redacted columns only (no ID/passport/KRA PIN).
            </p>
            {!canWriteMoney ? (
              <EmptyState title="Data export is restricted to the CEO and managers." />
            ) : (
              <div className="flex flex-col gap-2">
                {(["inquiries", "payments", "plots"] as const).map((table) => (
                  <div
                    key={table}
                    className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg"
                  >
                    <span className="font-semibold text-[14px] text-primary-container capitalize">
                      {table}
                    </span>
                    <button
                      type="button"
                      onClick={() => runExport(table)}
                      disabled={exportingTable === table}
                      className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      {exportingTable === table ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Download size={13} />
                      )}
                      Export CSV
                    </button>
                  </div>
                ))}
                {exportMsg && <p className="text-[13px] text-error mt-2">{exportMsg}</p>}
              </div>
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
