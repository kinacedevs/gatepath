/**
 * Gatepath Realtors — Property Matching (Part 2, Module 5)
 * "Match buyer preferences (location, budget, currency, phase) to available
 * plots." Matches computed live via src/lib/propertyMatching.ts (pure, no
 * I/O) from data this screen already fetches — no new schema needed to
 * keep it current, and it can never go stale since nothing is stored.
 *
 * "Auto-alert on new matches" is scoped honestly: automatic alerting on
 * newly-available inventory needs a trigger/scheduled job, which needs the
 * still-deferred Automation/n8n module (Part 2 Module 3, built last per the
 * user's own resequencing). This ships the real matching engine + a manual
 * "Send Match Alert" action instead, same honest scoping as Tasks' manual
 * reminder trigger.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Target, Users, Send, Loader2, MapPin, Ban, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  createBuyerPreferenceFn,
  updateBuyerPreferenceFn,
  sendMatchAlertFn,
} from "@/lib/buyerPreferenceActions";
import { findMatchingPlots } from "@/lib/propertyMatching";
import { formatFromKes, toKes, CURRENCIES, setLiveFxRates, type Currency } from "@/lib/currency";
import { KpiCard } from "@/components/admin/KpiCard";
import { SectionCard } from "@/components/admin/SectionCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { EmptyState } from "@/components/admin/EmptyState";
import { FreshnessStamp } from "@/components/admin/FreshnessStamp";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { BuyerPreference, Phase, Plot } from "@/lib/types";

export const Route = createFileRoute("/admin/property-matching")({
  component: PropertyMatching,
});

function PropertyMatching() {
  const [preferences, setPreferences] = useState<BuyerPreference[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionState, setActionState] = useState<Record<string, boolean>>({});

  const [creating, setCreating] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [preferredPhaseId, setPreferredPhaseId] = useState("");
  const [preferredLocation, setPreferredLocation] = useState("");
  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [statedCurrency, setStatedCurrency] = useState<Currency>("KES");
  const [notes, setNotes] = useState("");
  const [createSaving, setCreateSaving] = useState(false);
  const [createMsg, setCreateMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [preferencesRes, phasesRes, plotsRes] = await Promise.all([
      supabase.from("buyer_preferences").select("*").order("created_at", { ascending: false }),
      supabase.from("phases").select("*").order("name"),
      supabase.from("plots").select("*, plot_sizes(*)").eq("status", "available"),
    ]);
    if (preferencesRes.error) {
      setUnavailable(true);
    } else {
      setPreferences((preferencesRes.data as BuyerPreference[]) ?? []);
    }
    setPhases((phasesRes.data as Phase[]) ?? []);
    setPlots((plotsRes.data as Plot[]) ?? []);
    setLoading(false);
    setLastUpdated(new Date());
  };

  useEffect(() => {
    loadData();
  }, []);

  // Live FX rate config (Phase 26 pattern, same as diaspora.tsx/
  // properties.$slug.tsx) — this screen previously imported the static
  // CURRENCY_RATES seed directly and never fetched the admin-configured
  // live rate at all, so buyer budget matching/display silently went
  // stale the moment the CEO updated a rate elsewhere. fxVersion forces a
  // re-render once the real rate lands (setLiveFxRates itself only
  // mutates a module-level variable with no state to trigger React).
  const [, setFxVersion] = useState(0);
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from("site_banners")
          .select("data")
          .eq("id", "fx_rates")
          .maybeSingle();
        const rates = (data as { data?: { rates?: Partial<Record<Currency, number>> } } | null)
          ?.data?.rates;
        if (rates) {
          setLiveFxRates(rates);
          setFxVersion((v) => v + 1);
        }
      } catch {
        /* keep hardcoded seed rates */
      }
    })();
  }, []);

  const matchesByPreference = useMemo(() => {
    const m = new Map<string, ReturnType<typeof findMatchingPlots>>();
    for (const pref of preferences) {
      if (!pref.is_active) continue;
      m.set(pref.id, findMatchingPlots(pref, phases, plots));
    }
    return m;
  }, [preferences, phases, plots]);

  const activeCount = preferences.filter((p) => p.is_active).length;
  const totalCurrentMatches = Array.from(matchesByPreference.values()).reduce(
    (sum, m) => sum + m.length,
    0,
  );
  const buyersWithMatch = Array.from(matchesByPreference.values()).filter(
    (m) => m.length > 0,
  ).length;

  const getAccessToken = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    return sessionData.session?.access_token;
  };

  const toggleActive = async (pref: BuyerPreference) => {
    setActionState((s) => ({ ...s, [pref.id]: true }));
    const accessToken = await getAccessToken();
    if (accessToken) {
      await updateBuyerPreferenceFn({
        data: { callerAccessToken: accessToken, preferenceId: pref.id, isActive: !pref.is_active },
      });
      await loadData();
    }
    setActionState((s) => ({ ...s, [pref.id]: false }));
  };

  const sendAlert = async (preferenceId: string) => {
    setActionState((s) => ({ ...s, [preferenceId]: true }));
    const accessToken = await getAccessToken();
    if (accessToken) {
      await sendMatchAlertFn({ data: { callerAccessToken: accessToken, preferenceId } });
    }
    setActionState((s) => ({ ...s, [preferenceId]: false }));
  };

  const openCreate = () => {
    setClientName("");
    setClientEmail("");
    setClientPhone("");
    setPreferredPhaseId("");
    setPreferredLocation("");
    setMinBudget("");
    setMaxBudget("");
    setStatedCurrency("KES");
    setNotes("");
    setCreateMsg(null);
    setCreating(true);
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateSaving(true);
    setCreateMsg(null);
    const accessToken = await getAccessToken();
    if (!accessToken) {
      setCreateMsg("Your session expired — please sign in again.");
      setCreateSaving(false);
      return;
    }
    const result = await createBuyerPreferenceFn({
      data: {
        callerAccessToken: accessToken,
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim() || undefined,
        clientPhone: clientPhone.trim() || undefined,
        preferredPhaseId: preferredPhaseId || undefined,
        preferredLocation: preferredPhaseId ? undefined : preferredLocation.trim() || undefined,
        minBudgetKes: minBudget ? toKes(Number(minBudget), statedCurrency) : undefined,
        maxBudgetKes: maxBudget ? toKes(Number(maxBudget), statedCurrency) : undefined,
        statedCurrency,
        notes: notes.trim() || undefined,
      },
    });
    if (!result.success) {
      setCreateMsg("Error saving: " + result.error);
    } else {
      setCreating(false);
      loadData();
    }
    setCreateSaving(false);
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary font-bold">
            Property Matching
          </h1>
          <p className="text-body-md text-on-surface-variant">
            Track buyer preferences and see which available plots fit them right now.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <FreshnessStamp updatedAt={lastUpdated} />
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-4.5 py-2.5 bg-accent rounded-lg text-white font-bold text-[13px]"
          >
            <Plus size={14} /> New Watch Request
          </button>
        </div>
      </div>

      {unavailable ? (
        <SectionCard>
          <p className="text-sm text-on-surface-variant italic">
            Property matching unavailable — migration 0010 may not be applied yet.
          </p>
        </SectionCard>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KpiCard
              label="Active Watch Requests"
              value={loading ? "…" : String(activeCount)}
              icon={Target}
            />
            <KpiCard
              label="Buyers With a Match"
              value={loading ? "…" : String(buyersWithMatch)}
              icon={Users}
              tone={buyersWithMatch > 0 ? "success" : "default"}
            />
            <KpiCard
              label="Total Current Matches"
              value={loading ? "…" : String(totalCurrentMatches)}
              icon={CheckCircle2}
            />
          </div>

          <div className="luxury-card rounded-xl shadow-sm overflow-hidden bg-white">
            <div className="px-6 py-4 border-b border-outline-variant/30">
              <h2 className="font-headline-md text-sm text-primary font-bold">Buyer Watch List</h2>
            </div>
            {loading ? (
              <div className="p-6 flex flex-col gap-3">
                <Skeleton className="h-16 rounded-lg" />
                <Skeleton className="h-16 rounded-lg" />
              </div>
            ) : preferences.length === 0 ? (
              <EmptyState
                icon={Target}
                title="No watch requests yet."
                description="Add a buyer's preferences to see matching plots as inventory becomes available."
              />
            ) : (
              <div className="divide-y divide-outline-variant/10">
                {preferences.map((pref) => {
                  const matches = matchesByPreference.get(pref.id) ?? [];
                  const busy = actionState[pref.id];
                  const phase = phases.find((p) => p.id === pref.preferred_phase_id);
                  const expanded = expandedId === pref.id;
                  return (
                    <div key={pref.id} className="px-6 py-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-[14px] text-primary-container">
                              {pref.client_name}
                            </span>
                            <StatusBadge tone={pref.is_active ? "success" : "neutral"}>
                              {pref.is_active ? "active" : "paused"}
                            </StatusBadge>
                            {pref.is_active && matches.length > 0 && (
                              <StatusBadge tone="warning">{matches.length} match(es)</StatusBadge>
                            )}
                          </div>
                          <div className="text-[12px] text-on-surface-variant mt-1 flex items-center gap-1">
                            <MapPin size={11} />
                            {phase ? phase.name : pref.preferred_location || "Any location"}
                            {(pref.min_budget_kes || pref.max_budget_kes) && (
                              <>
                                {" "}
                                ·{" "}
                                {pref.min_budget_kes
                                  ? formatFromKes(
                                      pref.min_budget_kes,
                                      pref.stated_currency as Currency,
                                    )
                                  : "Any"}{" "}
                                –{" "}
                                {pref.max_budget_kes
                                  ? formatFromKes(
                                      pref.max_budget_kes,
                                      pref.stated_currency as Currency,
                                    )
                                  : "Any"}
                              </>
                            )}
                          </div>
                          {pref.notes && (
                            <p className="text-[12px] text-on-surface-variant mt-1 italic">
                              {pref.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 shrink-0">
                          {matches.length > 0 && (
                            <button
                              onClick={() => setExpandedId(expanded ? null : pref.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-info-container/15 text-on-info-container text-[11px] font-bold"
                            >
                              {expanded ? "Hide" : "View"} Matches
                            </button>
                          )}
                          {pref.client_email && matches.length > 0 && (
                            <button
                              disabled={busy}
                              onClick={() => sendAlert(pref.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-success-container/15 text-on-success-container text-[11px] font-bold disabled:opacity-50 inline-flex items-center gap-1"
                            >
                              {busy ? (
                                <Loader2 size={11} className="animate-spin" />
                              ) : (
                                <Send size={11} />
                              )}{" "}
                              Send Match Alert
                            </button>
                          )}
                          <button
                            disabled={busy}
                            onClick={() => toggleActive(pref)}
                            className="px-2.5 py-1.5 rounded-lg bg-surface-container-high text-on-surface text-[11px] font-bold disabled:opacity-50 inline-flex items-center gap-1"
                          >
                            <Ban size={11} /> {pref.is_active ? "Pause" : "Resume"}
                          </button>
                        </div>
                      </div>

                      {expanded && matches.length > 0 && (
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {matches.map((m) => (
                            <div
                              key={m.plot.id}
                              className="rounded-lg border border-outline-variant/30 p-3 bg-surface-container-lowest"
                            >
                              <div className="text-[12px] font-semibold text-primary-container">
                                {m.phase.name} · Plot #{m.plot.plot_number}
                              </div>
                              <div className="text-[13px] font-bold text-primary mt-0.5">
                                {formatFromKes(m.cashPriceKes, pref.stated_currency as Currency)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ══════ MODAL: NEW WATCH REQUEST ══════ */}
      <Dialog open={creating} onOpenChange={(open) => !open && setCreating(false)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>New Watch Request</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={submitCreate}
            className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">
                  Client Name
                </label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-md py-2.5 px-3 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-md py-2.5 px-3 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">
                Email
              </label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="Needed to send match alerts"
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-md py-2.5 px-3 outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">
                Preferred Phase (optional — leave blank to match by location instead)
              </label>
              <select
                value={preferredPhaseId}
                onChange={(e) => setPreferredPhaseId(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-md py-2.5 px-3 outline-none"
              >
                <option value="">-- Any phase --</option>
                {phases.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            {!preferredPhaseId && (
              <div>
                <label className="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">
                  Preferred Location (free text, e.g. "Diani" or "Coast")
                </label>
                <input
                  type="text"
                  value={preferredLocation}
                  onChange={(e) => setPreferredLocation(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-md py-2.5 px-3 outline-none"
                />
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">
                  Min Budget
                </label>
                <input
                  type="number"
                  min="0"
                  value={minBudget}
                  onChange={(e) => setMinBudget(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-md py-2.5 px-3 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">
                  Max Budget
                </label>
                <input
                  type="number"
                  min="0"
                  value={maxBudget}
                  onChange={(e) => setMaxBudget(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-md py-2.5 px-3 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">
                  Currency
                </label>
                <select
                  value={statedCurrency}
                  onChange={(e) => setStatedCurrency(e.target.value as Currency)}
                  className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-md py-2.5 px-3 outline-none"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-md py-2.5 px-3 outline-none resize-y"
              />
            </div>
            {createMsg && <p className="text-xs text-error">{createMsg}</p>}
            <DialogFooter className="gap-2 sm:gap-0">
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="px-4 py-2 rounded-lg border border-outline-variant/40 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createSaving}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-50"
              >
                {createSaving ? "Saving…" : "Save Watch Request"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
