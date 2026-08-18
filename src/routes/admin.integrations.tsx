/**
 * Gatepath Realtors — Integrations & API (Part 2, Module 16)
 * CEO/manager only — API keys are security credentials in their own
 * right, matching the same elevated gate the api_keys table itself uses.
 *
 * Paystack/Africa's Talking/Resend are already real and integrated
 * elsewhere (paymentActions.ts/notifications.ts) — this screen surfaces
 * presence/activity, it doesn't reconnect anything. WhatsApp Business API
 * and Meta Lead Ads are honestly "Not Connected": both need a real vendor
 * account (Meta Business verification, phone provisioning, app/webhook
 * setup) this session cannot provision, not more code. n8n is reserved —
 * deliberately built last, after every other module that emits events for
 * it to react to.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Webhook,
  CheckCircle2,
  XCircle,
  Clock,
  KeyRound,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdminSession } from "@/context/AdminSessionContext";
import { getIntegrationStatusFn, generateApiKeyFn, revokeApiKeyFn } from "@/lib/apiKeyActions";
import { KpiCard } from "@/components/admin/KpiCard";
import { SectionCard } from "@/components/admin/SectionCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { EmptyState } from "@/components/admin/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { ApiKey } from "@/lib/types";

export const Route = createFileRoute("/admin/integrations")({
  component: Integrations,
});

const SCOPE_OPTIONS: { value: string; label: string }[] = [
  { value: "leads:read", label: "Leads — Read" },
  { value: "leads:write", label: "Leads — Create" },
  { value: "plots:read", label: "Plots — Read" },
  { value: "notify:send", label: "Notifications — Send (email/SMS via Gatepath)" },
];

function Integrations() {
  const { adminRole } = useAdminSession();
  const canView = adminRole === "ceo" || adminRole === "manager";

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<{
    paystackConfigured: boolean;
    africasTalkingConfigured: boolean;
    resendConfigured: boolean;
    lastPaymentAt: string | null;
    activeApiKeyCount: number;
  } | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [keyScopes, setKeyScopes] = useState<string[]>([]);
  const [fieldMappingText, setFieldMappingText] = useState("");
  const [saving, setSaving] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const getAccessToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  };

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    const token = await getAccessToken();
    if (!token) {
      setErrorMsg("Your session expired — please sign in again.");
      setLoading(false);
      return;
    }

    const [statusResult, keysRes] = await Promise.all([
      (getIntegrationStatusFn as any)({ data: { callerAccessToken: token } }),
      supabase.from("api_keys").select("*").order("created_at", { ascending: false }),
    ]);

    if (!statusResult.success) {
      setErrorMsg(statusResult.error);
    } else {
      setStatus(statusResult);
    }
    setApiKeys((keysRes.data as ApiKey[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (canView) loadData();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  const toggleScope = (scope: string) => {
    setKeyScopes((s) => (s.includes(scope) ? s.filter((x) => x !== scope) : [...s, scope]));
  };

  /** One "externalField=ourField" pair per line — e.g. "full_name=client_full_name" —
   * so a platform whose webhook payload uses different field names still maps
   * correctly in POST /api/v1/leads, without bespoke code per vendor. */
  const parseFieldMapping = (text: string): Record<string, string> => {
    const mapping: Record<string, string> = {};
    for (const line of text.split("\n")) {
      const [external, ours] = line.split("=").map((s) => s.trim());
      if (external && ours) mapping[external] = ours;
    }
    return mapping;
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) {
      setErrorMsg("Give this key a name.");
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setErrorMsg("Your session expired — please sign in again.");
        return;
      }
      const result = await (generateApiKeyFn as any)({
        data: {
          callerAccessToken: token,
          name: keyName.trim(),
          scopes: keyScopes,
          fieldMapping: parseFieldMapping(fieldMappingText),
        },
      });
      if (!result.success) {
        setErrorMsg(result.error);
      } else {
        setCreateOpen(false);
        setKeyName("");
        setKeyScopes([]);
        setFieldMappingText("");
        setRevealedKey(result.rawKey);
        loadData();
      }
    } catch (err: any) {
      setErrorMsg("Something went wrong: " + (err?.message || "Unknown error."));
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (keyId: string) => {
    if (!confirm("Revoke this API key? Any tool using it will stop working immediately.")) return;
    try {
      const token = await getAccessToken();
      if (!token) {
        setErrorMsg("Your session expired — please sign in again.");
        return;
      }
      const result = await (revokeApiKeyFn as any)({ data: { callerAccessToken: token, keyId } });
      if (!result.success) setErrorMsg(result.error);
      else loadData();
    } catch (err: any) {
      setErrorMsg("Something went wrong revoking the key: " + (err?.message || "Unknown error."));
    }
  };

  const copyKey = async () => {
    if (!revealedKey) return;
    await navigator.clipboard.writeText(revealedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <Webhook size={32} className="text-on-surface-variant" />
        <p className="text-sm font-semibold text-on-surface">
          Integrations & API is restricted to the CEO and managers.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary font-bold">
            Integrations &amp; API
          </h1>
          <p className="text-body-md text-on-surface-variant">
            Connection status for every real integration, plus a clean internal API for external
            tools (n8n, custom scripts) to read leads/plots and create new leads.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="px-4 py-2.5 bg-error/10 border border-error/30 rounded-lg text-[13px] text-error">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          label="Configured Integrations"
          value={
            loading || !status
              ? "…"
              : String(
                  [
                    status.paystackConfigured,
                    status.africasTalkingConfigured,
                    status.resendConfigured,
                  ].filter(Boolean).length,
                ) + " / 3"
          }
          icon={CheckCircle2}
          tone="success"
        />
        <KpiCard
          label="Active API Keys"
          value={loading || !status ? "…" : String(status.activeApiKeyCount)}
          icon={KeyRound}
        />
        <KpiCard
          label="Last Successful Payment"
          value={
            loading || !status
              ? "…"
              : status.lastPaymentAt
                ? new Date(status.lastPaymentAt).toLocaleDateString("en-KE")
                : "None yet"
          }
          icon={Clock}
        />
      </div>

      <SectionCard title="Connected">
        {loading ? (
          <Skeleton className="h-24 rounded-xl" />
        ) : (
          <div className="flex flex-col gap-3">
            {[
              {
                name: "Paystack",
                configured: status?.paystackConfigured,
                note: "Payment processing",
              },
              {
                name: "Africa's Talking",
                configured: status?.africasTalkingConfigured,
                note: "SMS (Bulk Messaging) — send history isn't logged",
              },
              {
                name: "Resend",
                configured: status?.resendConfigured,
                note: "Transactional email — send history isn't logged",
              },
            ].map((integration) => (
              <div
                key={integration.name}
                className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg"
              >
                <div>
                  <span className="font-semibold text-[14px] text-primary-container">
                    {integration.name}
                  </span>
                  <p className="text-[12px] text-on-surface-variant">{integration.note}</p>
                </div>
                <StatusBadge tone={integration.configured ? "success" : "error"}>
                  {integration.configured ? "Configured" : "Not Configured"}
                </StatusBadge>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Not Connected">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg">
            <div>
              <span className="font-semibold text-[14px] text-primary-container">
                WhatsApp Business API
              </span>
              <p className="text-[12px] text-on-surface-variant">
                Needs Meta Business verification and phone-number onboarding — a vendor-account
                step, not a code change.
              </p>
            </div>
            <StatusBadge tone="neutral">
              <XCircle size={11} /> Not Connected
            </StatusBadge>
          </div>
          <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg">
            <div>
              <span className="font-semibold text-[14px] text-primary-container">
                Meta Lead Ads
              </span>
              <p className="text-[12px] text-on-surface-variant">
                Needs a Meta App with Lead Ads permissions and a webhook subscription configured in
                Meta's own developer console.
              </p>
            </div>
            <StatusBadge tone="neutral">
              <XCircle size={11} /> Not Connected
            </StatusBadge>
          </div>
          <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg">
            <div>
              <span className="font-semibold text-[14px] text-primary-container">n8n</span>
              <p className="text-[12px] text-on-surface-variant">
                Reserved — deliberately built last, after every other module that emits events for
                it to react to. This screen's internal API is the foundation it will call.
              </p>
            </div>
            <StatusBadge tone="info">Reserved</StatusBadge>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Internal API"
        action={
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold"
          >
            Generate Key
          </button>
        }
      >
        <div className="mb-4 p-3 bg-info-container/10 border border-info-container/30 rounded-lg text-[12px] text-on-surface font-mono leading-relaxed">
          Authorization: Bearer &lt;key&gt;
          <br />
          GET /api/v1/leads?limit=50&amp;offset=0 — scope: leads:read
          <br />
          GET /api/v1/leads/:id — scope: leads:read
          <br />
          POST /api/v1/leads {"{"}client_full_name, client_email, client_phone, client_id_passport
          {"}"} — scope: leads:write
          <br />
          GET /api/v1/plots?status=available — scope: plots:read
          <br />
          POST /api/v1/notify {"{"}channel, to, subject?, message, templateKey?, vars?{"}"} — scope:
          notify:send
          <br />
          <br />
          curl -H &quot;Authorization: Bearer gpk_...&quot;
          https://gatepathrealtors.com/api/v1/plots
        </div>

        {loading ? (
          <Skeleton className="h-32 rounded-xl" />
        ) : apiKeys.length === 0 ? (
          <EmptyState icon={KeyRound} title="No API keys yet." />
        ) : (
          <div className="flex flex-col gap-2">
            {apiKeys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[14px] text-primary-container">
                      {key.name}
                    </span>
                    <span className="text-[11px] text-on-surface-variant font-mono">
                      {key.key_prefix}...
                    </span>
                    {key.revoked_at && <StatusBadge tone="error">Revoked</StatusBadge>}
                  </div>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">
                    {key.scopes.join(", ")} · created{" "}
                    {new Date(key.created_at).toLocaleDateString("en-KE")} · last used{" "}
                    {key.last_used_at
                      ? new Date(key.last_used_at).toLocaleDateString("en-KE")
                      : "never"}
                    {key.field_mapping && Object.keys(key.field_mapping).length > 0 && (
                      <> · custom field mapping</>
                    )}
                  </p>
                </div>
                {!key.revoked_at && (
                  <button
                    type="button"
                    onClick={() => handleRevoke(key.id)}
                    className="px-3 py-1.5 rounded-lg border border-error/40 text-error text-xs font-semibold"
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ══════ MODAL: GENERATE API KEY ══════ */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Generate API Key</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitCreate} className="flex flex-col gap-4">
            <input
              type="text"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              placeholder="Key name (e.g. n8n integration)"
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-md py-2.5 px-3 outline-none"
            />
            <div className="flex flex-col gap-2">
              {SCOPE_OPTIONS.map((s) => (
                <label key={s.value} className="flex items-center gap-2 text-[13px]">
                  <input
                    type="checkbox"
                    checked={keyScopes.includes(s.value)}
                    onChange={() => toggleScope(s.value)}
                  />
                  {s.label}
                </label>
              ))}
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">
                Field Mapping (optional — for leads:write)
              </label>
              <textarea
                value={fieldMappingText}
                onChange={(e) => setFieldMappingText(e.target.value)}
                placeholder={
                  "One per line: externalField=ourField\ne.g. full_name=client_full_name"
                }
                rows={3}
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg text-[12px] font-mono py-2.5 px-3 outline-none resize-y"
              />
              <p className="text-[11px] text-on-surface-variant mt-1">
                Only needed if this source's payload uses different field names than ours.
              </p>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="px-4 py-2 rounded-lg border border-outline-variant/40 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold inline-flex items-center gap-1.5"
              >
                {saving && <Loader2 size={13} className="animate-spin" />} Generate
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ══════ MODAL: REVEAL KEY (ONCE) ══════ */}
      <Dialog open={!!revealedKey} onOpenChange={(open) => !open && setRevealedKey(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Your New API Key</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-error font-semibold">
            Copy this now — you won't be able to see it again.
          </p>
          <div className="flex items-center gap-2 p-3 bg-surface-container-low rounded-lg font-mono text-[13px] break-all">
            {revealedKey}
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={copyKey}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold inline-flex items-center gap-1.5"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : "Copy Key"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
