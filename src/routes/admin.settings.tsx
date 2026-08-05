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
import { UserCheck, Shield, Rocket, Loader2, Download, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdminSession } from "@/context/AdminSessionContext";
import { SectionCard } from "@/components/admin/SectionCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { EmptyState } from "@/components/admin/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DEFAULT_PIPELINE_LABELS,
  savePipelineLabelsFn,
  savePipelineStageFn,
  deactivatePipelineStageFn,
} from "@/lib/pipelineLabelsActions";
import { saveMessageTemplateFn, resetMessageTemplateFn } from "@/lib/messageTemplateActions";
import { saveFxRatesFn } from "@/lib/fxRateActions";
import { exportTableCsvFn } from "@/lib/dataExportActions";
import {
  saveCustomFieldDefinitionFn,
  deactivateCustomFieldDefinitionFn,
} from "@/lib/customFieldActions";
import { CURRENCY_RATES, CURRENCIES, type Currency } from "@/lib/currency";
import type { MessageTemplate, CustomFieldDefinition, PipelineStage } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/settings")({
  component: SystemSettings,
});

const ROLE_TONE = {
  ceo: "warning",
  manager: "info",
  agent: "success",
} as const;

const ROADMAP_ITEMS = [
  "Scheduled/automatic refresh (backups, FX rates) — needs the Automation/n8n module",
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

  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [stageBucket, setStageBucket] = useState<"pending" | "reviewed" | "approved" | "rejected">(
    "pending",
  );
  const [stageLabel, setStageLabel] = useState("");
  const [stageOrder, setStageOrder] = useState(0);
  const [stageSaving, setStageSaving] = useState(false);
  const [stageMsg, setStageMsg] = useState<string | null>(null);

  const [editingTemplateKey, setEditingTemplateKey] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateMsg, setTemplateMsg] = useState<string | null>(null);

  const [fxSaving, setFxSaving] = useState(false);
  const [fxMsg, setFxMsg] = useState<string | null>(null);

  const [exportingTable, setExportingTable] = useState<string | null>(null);
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [fieldKey, setFieldKey] = useState("");
  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldType, setFieldType] = useState<CustomFieldDefinition["field_type"]>("text");
  const [fieldOptionsText, setFieldOptionsText] = useState("");
  const [fieldRequired, setFieldRequired] = useState(false);
  const [fieldSaving, setFieldSaving] = useState(false);
  const [fieldMsg, setFieldMsg] = useState<string | null>(null);

  const getAccessToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  };

  const loadData = async () => {
    setLoading(true);
    const [bannersRes, templatesRes, customFieldsRes, pipelineStagesRes] = await Promise.all([
      supabase.from("site_banners").select("*").in("id", ["pipeline_labels", "fx_rates"]),
      supabase.from("message_templates").select("*").order("name"),
      supabase.from("custom_field_definitions").select("*").order("display_order"),
      supabase.from("pipeline_stages").select("*").order("display_order"),
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
    setCustomFields((customFieldsRes.data as CustomFieldDefinition[]) ?? []);
    setPipelineStages((pipelineStagesRes.data as PipelineStage[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const savePipelineLabels = async (e: React.FormEvent) => {
    e.preventDefault();
    setPipelineSaving(true);
    setPipelineMsg(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setPipelineMsg("Your session expired — please sign in again.");
        return;
      }
      const result = await (savePipelineLabelsFn as any)({
        data: { callerAccessToken: token, labels: pipelineLabels },
      });
      setPipelineMsg(result.success ? "Saved." : "Error: " + result.error);
    } catch (err: any) {
      setPipelineMsg("Something went wrong: " + (err?.message || "Unknown error."));
    } finally {
      setPipelineSaving(false);
    }
  };

  const resetStageForm = () => {
    setEditingStageId(null);
    setStageBucket("pending");
    setStageLabel("");
    setStageOrder(0);
    setStageMsg(null);
  };

  const openCreateStage = (bucket: "pending" | "reviewed" | "approved" | "rejected") => {
    resetStageForm();
    setStageBucket(bucket);
    setStageOrder(pipelineStages.filter((s) => s.bucket === bucket && s.is_active).length);
    setStageDialogOpen(true);
  };

  const openEditStage = (stage: PipelineStage) => {
    setEditingStageId(stage.id);
    setStageBucket(stage.bucket);
    setStageLabel(stage.label);
    setStageOrder(stage.display_order);
    setStageMsg(null);
    setStageDialogOpen(true);
  };

  const submitStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stageLabel.trim()) {
      setStageMsg("Label is required.");
      return;
    }
    setStageSaving(true);
    setStageMsg(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setStageMsg("Your session expired — please sign in again.");
        return;
      }
      const result = await (savePipelineStageFn as any)({
        data: {
          callerAccessToken: token,
          stageId: editingStageId ?? undefined,
          bucket: stageBucket,
          label: stageLabel.trim(),
          displayOrder: stageOrder,
        },
      });
      if (!result.success) {
        setStageMsg("Error: " + result.error);
      } else {
        setStageDialogOpen(false);
        resetStageForm();
        loadData();
      }
    } catch (err: any) {
      setStageMsg("Something went wrong saving the stage: " + (err?.message || "Unknown error."));
    } finally {
      setStageSaving(false);
    }
  };

  const deactivateStage = async (id: string) => {
    if (
      !confirm(
        "Deactivate this stage? Any leads currently in it will move back to its bucket's main column.",
      )
    ) {
      return;
    }
    try {
      const token = await getAccessToken();
      if (!token) {
        setStageMsg("Your session expired — please sign in again.");
        return;
      }
      const result = await (deactivatePipelineStageFn as any)({
        data: { callerAccessToken: token, stageId: id },
      });
      if (!result.success) setStageMsg("Error: " + result.error);
      else loadData();
    } catch (err: any) {
      setStageMsg("Something went wrong: " + (err?.message || "Unknown error."));
    }
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
    try {
      const token = await getAccessToken();
      if (!token) {
        setTemplateMsg("Your session expired — please sign in again.");
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
    } catch (err: any) {
      setTemplateMsg("Something went wrong: " + (err?.message || "Unknown error."));
    } finally {
      setTemplateSaving(false);
    }
  };

  const resetTemplate = async (key: string) => {
    if (!confirm("Reset this template to the default? Your custom version will be deleted."))
      return;
    try {
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
    } catch (err: any) {
      setTemplateMsg("Something went wrong: " + (err?.message || "Unknown error."));
    }
  };

  const saveFxRates = async (e: React.FormEvent) => {
    e.preventDefault();
    setFxSaving(true);
    setFxMsg(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setFxMsg("Your session expired — please sign in again.");
        return;
      }
      const result = await (saveFxRatesFn as any)({
        data: { callerAccessToken: token, rates: fxRates },
      });
      setFxMsg(result.success ? "Saved." : "Error: " + result.error);
    } catch (err: any) {
      setFxMsg("Something went wrong saving rates: " + (err?.message || "Unknown error."));
    } finally {
      setFxSaving(false);
    }
  };

  const runExport = async (table: "inquiries" | "payments" | "plots") => {
    setExportingTable(table);
    setExportMsg(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setExportMsg("Your session expired — please sign in again.");
        return;
      }
      const result = await (exportTableCsvFn as any)({
        data: { callerAccessToken: token, table },
      });
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
    } catch (err: any) {
      setExportMsg("Something went wrong: " + (err?.message || "Unknown error."));
    } finally {
      setExportingTable(null);
    }
  };

  const resetFieldForm = () => {
    setEditingFieldId(null);
    setFieldKey("");
    setFieldLabel("");
    setFieldType("text");
    setFieldOptionsText("");
    setFieldRequired(false);
    setFieldMsg(null);
  };

  const openCreateField = () => {
    resetFieldForm();
    setFieldDialogOpen(true);
  };

  const openEditField = (field: CustomFieldDefinition) => {
    setEditingFieldId(field.id);
    setFieldKey(field.key);
    setFieldLabel(field.label);
    setFieldType(field.field_type);
    setFieldOptionsText((field.options ?? []).join(", "));
    setFieldRequired(field.is_required);
    setFieldMsg(null);
    setFieldDialogOpen(true);
  };

  const submitField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fieldKey.trim() || !fieldLabel.trim()) {
      setFieldMsg("Key and label are required.");
      return;
    }
    setFieldSaving(true);
    setFieldMsg(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setFieldMsg("Your session expired — please sign in again.");
        return;
      }
      const result = await (saveCustomFieldDefinitionFn as any)({
        data: {
          callerAccessToken: token,
          id: editingFieldId ?? undefined,
          key: fieldKey.trim(),
          label: fieldLabel.trim(),
          fieldType,
          options:
            fieldType === "select"
              ? fieldOptionsText
                  .split(",")
                  .map((o) => o.trim())
                  .filter(Boolean)
              : undefined,
          isRequired: fieldRequired,
          displayOrder: customFields.length,
        },
      });
      if (!result.success) {
        setFieldMsg("Error: " + result.error);
      } else {
        setFieldDialogOpen(false);
        resetFieldForm();
        loadData();
      }
    } catch (err: any) {
      setFieldMsg("Something went wrong: " + (err?.message || "Unknown error."));
    } finally {
      setFieldSaving(false);
    }
  };

  const deactivateField = async (id: string) => {
    if (!confirm("Deactivate this field? It will no longer appear on the public inquiry form.")) {
      return;
    }
    try {
      const token = await getAccessToken();
      if (!token) {
        setFieldMsg("Your session expired — please sign in again.");
        return;
      }
      const result = await (deactivateCustomFieldDefinitionFn as any)({
        data: { callerAccessToken: token, id },
      });
      if (!result.success) setFieldMsg("Error: " + result.error);
      else loadData();
    } catch (err: any) {
      setFieldMsg("Something went wrong: " + (err?.message || "Unknown error."));
    }
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
          <TabsTrigger value="customfields">Custom Fields</TabsTrigger>
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

          <SectionCard title="Pipeline Stages" className="mt-6">
            <p className="text-[13px] text-on-surface-variant mb-4">
              Optional custom stages inside each status bucket — real add/remove/reorder, shown as
              their own columns on the Leads Kanban. The 4 buckets and every screen's underlying
              write logic stay exactly as they are; a stage is just a finer position within one.
            </p>
            {!canWrite ? (
              <EmptyState title="Pipeline stages are restricted to the CEO and managers." />
            ) : loading ? (
              <Skeleton className="h-40 rounded-xl" />
            ) : (
              <div className="flex flex-col gap-5">
                {(["pending", "reviewed", "approved", "rejected"] as const).map((bucket) => {
                  const bucketStages = pipelineStages
                    .filter((s) => s.bucket === bucket && s.is_active)
                    .sort((a, b) => a.display_order - b.display_order);
                  return (
                    <div key={bucket}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-on-surface uppercase tracking-wide">
                          {pipelineLabels[bucket]}
                        </span>
                        <button
                          type="button"
                          onClick={() => openCreateStage(bucket)}
                          className="flex items-center gap-1 text-[12px] text-primary underline"
                        >
                          <Plus size={12} /> Add Stage
                        </button>
                      </div>
                      {bucketStages.length === 0 ? (
                        <p className="text-[12px] text-on-surface-variant pl-1">
                          No custom stages — leads in {pipelineLabels[bucket]} show in one column.
                        </p>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {bucketStages.map((stage) => (
                            <div
                              key={stage.id}
                              className="flex items-center justify-between p-2.5 bg-surface-container-low rounded-lg"
                            >
                              <span className="text-[13px] text-primary-container">
                                {stage.label}{" "}
                                <span className="text-[11px] text-on-surface-variant">
                                  (order {stage.display_order})
                                </span>
                              </span>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => openEditStage(stage)}
                                  className="text-xs text-primary underline"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deactivateStage(stage.id)}
                                  className="p-1 rounded-lg text-error hover:bg-error/10 transition-colors"
                                  title="Deactivate"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {stageMsg && <p className="text-[13px] text-on-surface">{stageMsg}</p>}
              </div>
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
                            className="text-xs text-primary underline"
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

        {/* ── CUSTOM FIELDS ── */}
        <TabsContent value="customfields">
          <SectionCard
            title="Custom Fields for Inquiries/Leads"
            action={
              canWriteMoney && (
                <button
                  type="button"
                  onClick={openCreateField}
                  className="flex items-center gap-1.5 px-4.5 py-2.5 bg-accent rounded-lg text-white font-bold text-[13px]"
                >
                  <Plus size={14} /> Add Field
                </button>
              )
            }
          >
            <p className="text-[13px] text-on-surface-variant mb-4">
              Rendered dynamically on the public inquiry form's "Additional Information" section,
              and shown per-inquiry in the Inquiries Queue review modal. Deactivating a field
              removes it from the form but keeps historical values labeled correctly.
            </p>
            {!canWriteMoney ? (
              <EmptyState title="Custom fields are restricted to the CEO and managers." />
            ) : loading ? (
              <Skeleton className="h-32 rounded-xl" />
            ) : customFields.length === 0 ? (
              <EmptyState title="No custom fields defined yet." />
            ) : (
              <div className="flex flex-col gap-2">
                {customFields.map((field) => (
                  <div
                    key={field.id}
                    className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg"
                  >
                    <div>
                      <span className="font-semibold text-[14px] text-primary-container">
                        {field.label}
                      </span>
                      <StatusBadge tone={field.is_active ? "success" : "neutral"} className="ml-2">
                        {field.is_active ? "Active" : "Deactivated"}
                      </StatusBadge>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">
                        {field.key} · {field.field_type}
                        {field.is_required ? " · required" : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEditField(field)}
                        className="text-xs text-primary underline"
                      >
                        Edit
                      </button>
                      {field.is_active && (
                        <button
                          type="button"
                          onClick={() => deactivateField(field.id)}
                          className="p-1.5 rounded-lg text-error hover:bg-error/10 transition-colors"
                          title="Deactivate"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>

      {/* ══════ MODAL: CREATE/EDIT PIPELINE STAGE ══════ */}
      <Dialog
        open={stageDialogOpen}
        onOpenChange={(open) => {
          setStageDialogOpen(open);
          if (!open) resetStageForm();
        }}
      >
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>{editingStageId ? "Edit Stage" : "Add Stage"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitStage} className="flex flex-col gap-4">
            <select
              value={stageBucket}
              onChange={(e) =>
                setStageBucket(e.target.value as "pending" | "reviewed" | "approved" | "rejected")
              }
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-md py-2.5 px-3 outline-none"
            >
              {(["pending", "reviewed", "approved", "rejected"] as const).map((bucket) => (
                <option key={bucket} value={bucket}>
                  {pipelineLabels[bucket]}
                </option>
              ))}
            </select>
            {editingStageId && (
              <p className="text-[11px] text-on-surface-variant -mt-2">
                Changing the bucket moves every lead currently in this stage to the new bucket too —
                their status updates to match, so reports stay accurate.
              </p>
            )}
            <input
              type="text"
              value={stageLabel}
              onChange={(e) => setStageLabel(e.target.value)}
              placeholder="Stage name (e.g. Site Visit Booked)"
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-md py-2.5 px-3 outline-none"
            />
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
                Order within this bucket
              </label>
              <input
                type="number"
                value={stageOrder}
                onChange={(e) => setStageOrder(Number(e.target.value))}
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-md py-2.5 px-3 outline-none"
              />
            </div>
            {stageMsg && <p className="text-[13px] text-on-surface">{stageMsg}</p>}
            <DialogFooter className="gap-2 sm:gap-0">
              <button
                type="button"
                onClick={() => setStageDialogOpen(false)}
                className="px-4 py-2 rounded-lg border border-outline-variant/40 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={stageSaving}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold inline-flex items-center gap-1.5"
              >
                {stageSaving && <Loader2 size={13} className="animate-spin" />} Save Stage
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ══════ MODAL: CREATE/EDIT CUSTOM FIELD ══════ */}
      <Dialog
        open={fieldDialogOpen}
        onOpenChange={(open) => {
          setFieldDialogOpen(open);
          if (!open) resetFieldForm();
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{editingFieldId ? "Edit Field" : "Add Field"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitField} className="flex flex-col gap-4">
            <input
              type="text"
              value={fieldKey}
              onChange={(e) => setFieldKey(e.target.value)}
              disabled={!!editingFieldId}
              placeholder="Key (e.g. preferred_contact_time) — cannot change once set"
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-md py-2.5 px-3 outline-none disabled:opacity-60"
            />
            <input
              type="text"
              value={fieldLabel}
              onChange={(e) => setFieldLabel(e.target.value)}
              placeholder="Label shown on the form"
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-md py-2.5 px-3 outline-none"
            />
            <select
              value={fieldType}
              onChange={(e) => setFieldType(e.target.value as CustomFieldDefinition["field_type"])}
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-md py-2.5 px-3 outline-none"
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="select">Select (dropdown)</option>
              <option value="checkbox">Checkbox</option>
              <option value="date">Date</option>
            </select>
            {fieldType === "select" && (
              <input
                type="text"
                value={fieldOptionsText}
                onChange={(e) => setFieldOptionsText(e.target.value)}
                placeholder="Options, comma-separated (e.g. Morning, Afternoon, Evening)"
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-md py-2.5 px-3 outline-none"
              />
            )}
            <label className="flex items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                checked={fieldRequired}
                onChange={(e) => setFieldRequired(e.target.checked)}
              />
              Required on the inquiry form
            </label>
            {fieldMsg && <p className="text-[13px] text-on-surface">{fieldMsg}</p>}
            <DialogFooter className="gap-2 sm:gap-0">
              <button
                type="button"
                onClick={() => setFieldDialogOpen(false)}
                className="px-4 py-2 rounded-lg border border-outline-variant/40 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={fieldSaving}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold inline-flex items-center gap-1.5"
              >
                {fieldSaving && <Loader2 size={13} className="animate-spin" />} Save Field
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
