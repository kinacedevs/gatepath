/**
 * Gatepath Realtors — Reports & Analytics (Part 2, Module 6)
 * Pipeline/forecast/collection/agent analytics already have real dedicated
 * homes (Leads, Dashboard, Installments, Agent Performance) — deliberately
 * NOT duplicated here (link cards point at them instead). This screen's
 * real, new value: Lead-Source ROI ("which channel actually closes" — every
 * existing chart shows volume by source only, never conversion/revenue) and
 * Cohort Analysis (nothing groups leads by creation month and tracks
 * conversion over time anywhere today). Both computed live via
 * src/lib/reportAnalytics.ts, no new schema.
 *
 * "Scheduled report delivery to CEO" is a manual "Send Report to CEO"
 * button (sendExecutiveReportFn) — true scheduling needs the still-deferred
 * Automation/n8n module (Part 2 Module 3, built last).
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  Award,
  Send,
  Loader2,
  ArrowRight,
  Users,
  Wallet,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { sendExecutiveReportFn } from "@/lib/reportActions";
import { computeSourceRoi, computeCohorts } from "@/lib/reportAnalytics";
import { formatFromKes } from "@/lib/currency";
import { KpiCard } from "@/components/admin/KpiCard";
import { SectionCard } from "@/components/admin/SectionCard";
import { EmptyState } from "@/components/admin/EmptyState";
import { FreshnessStamp } from "@/components/admin/FreshnessStamp";
import { CategoryBarChart } from "@/components/admin/charts/CategoryBarChart";
import { Skeleton } from "@/components/ui/skeleton";
import type { Inquiry, Payment, Agreement } from "@/lib/types";

export const Route = createFileRoute("/admin/reports")({
  component: ReportsAndAnalytics,
});

const RELATED_SCREENS = [
  { to: "/admin/leads", label: "Pipeline & Forecast", icon: TrendingUp },
  { to: "/admin/installments", label: "Collection Tracking", icon: Wallet },
  { to: "/admin/agents", label: "Agent Analytics", icon: Users },
] as const;

function ReportsAndAnalytics() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [inquiriesRes, paymentsRes, agreementsRes] = await Promise.all([
      supabase.from("inquiries").select("*"),
      supabase.from("payments").select("*").eq("status", "success"),
      supabase.from("agreements").select("*"),
    ]);
    setInquiries((inquiriesRes.data as Inquiry[]) ?? []);
    setPayments((paymentsRes.data as Payment[]) ?? []);
    setAgreements((agreementsRes.data as Agreement[]) ?? []);
    setLoading(false);
    setLastUpdated(new Date());
  };

  useEffect(() => {
    loadData();
  }, []);

  const sourceRoi = useMemo(() => computeSourceRoi(inquiries, payments), [inquiries, payments]);
  const cohorts = useMemo(() => computeCohorts(inquiries, agreements), [inquiries, agreements]);

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const pipelineValue = inquiries
    .filter((i) => i.status === "pending" || i.status === "reviewed")
    .reduce((sum, i) => sum + (i.price ?? 0), 0);
  const monthCollections = payments
    .filter((p) => p.created_at.slice(0, 7) === monthKey)
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const approvedCount = inquiries.filter((i) => i.status === "approved").length;
  const teamConversionPct =
    inquiries.length > 0 ? Math.round((approvedCount / inquiries.length) * 100) : 0;
  const bestSource = sourceRoi[0];

  const sourceRoiChartData = sourceRoi
    .filter((s) => s.revenue > 0)
    .slice(0, 8)
    .map((s) => ({ name: s.source, value: s.revenue }));

  const sendReport = async () => {
    setSending(true);
    setSendMsg(null);
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      setSendMsg("Your session expired — please sign in again.");
      setSending(false);
      return;
    }
    const result = await sendExecutiveReportFn({ data: { callerAccessToken: accessToken } });
    setSendMsg(result.success ? "Report sent to the CEO." : "Error: " + result.error);
    setSending(false);
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary font-bold">
            Reports &amp; Analytics
          </h1>
          <p className="text-body-md text-on-surface-variant">
            Executive digest, lead-source ROI, and cohort conversion trends.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <FreshnessStamp updatedAt={lastUpdated} />
          <button
            onClick={sendReport}
            disabled={sending}
            className="flex items-center gap-1.5 px-4.5 py-2.5 bg-accent rounded-lg text-white font-bold text-[13px] disabled:opacity-50"
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send
            Report to CEO
          </button>
        </div>
      </div>

      {sendMsg && (
        <div
          className={`px-3.5 py-2.5 rounded-lg text-[13px] ${
            sendMsg.startsWith("Error")
              ? "bg-error/10 text-error"
              : "bg-success-container/15 text-on-success-container"
          }`}
        >
          {sendMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Open Pipeline Value"
          value={loading ? "…" : formatFromKes(pipelineValue, "KES")}
          icon={TrendingUp}
        />
        <KpiCard
          label="Collections This Month"
          value={loading ? "…" : formatFromKes(monthCollections, "KES")}
          icon={DollarSign}
          tone="success"
        />
        <KpiCard
          label="Team Conversion Rate"
          value={loading ? "…" : `${teamConversionPct}%`}
          icon={BarChart3}
        />
        <KpiCard
          label="Best-Performing Source"
          value={loading ? "…" : bestSource?.source || "No data yet"}
          icon={Award}
          tone="success"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {RELATED_SCREENS.map((s) => (
          <Link
            key={s.to}
            to={s.to}
            className="luxury-card rounded-xl p-5 bg-white flex items-center justify-between hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-surface-container-low flex items-center justify-center text-primary-container">
                <s.icon size={17} />
              </div>
              <span className="font-semibold text-[13px] text-primary-container">{s.label}</span>
            </div>
            <ArrowRight size={15} className="text-on-surface-variant" />
          </Link>
        ))}
      </div>

      <SectionCard title="Lead-Source ROI — Which Channel Actually Closes">
        {loading ? (
          <Skeleton className="h-64 rounded-xl" />
        ) : sourceRoi.length === 0 ? (
          <EmptyState title="No lead data yet" />
        ) : (
          <div className="flex flex-col gap-5">
            {sourceRoiChartData.length > 0 && (
              <CategoryBarChart
                data={sourceRoiChartData}
                xKey="name"
                yKey="value"
                height={200}
                horizontal
                valueFormatter={(v) => formatFromKes(v, "KES")}
              />
            )}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead className="bg-surface-container-low border-b border-outline-variant/30">
                  <tr>
                    {[
                      "Source",
                      "Leads",
                      "Approved",
                      "Conversion %",
                      "Revenue",
                      "Avg Deal Size",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-2.5 font-label-md text-[11px] text-on-surface-variant uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {sourceRoi.map((s) => (
                    <tr key={s.source}>
                      <td className="px-4 py-2.5 font-semibold text-[13px] text-primary-container">
                        {s.source}
                      </td>
                      <td className="px-4 py-2.5 text-[13px] text-on-surface">{s.leadCount}</td>
                      <td className="px-4 py-2.5 text-[13px] text-on-surface">{s.approvedCount}</td>
                      <td className="px-4 py-2.5 text-[13px] text-on-surface">
                        {s.conversionPct}%
                      </td>
                      <td className="px-4 py-2.5 text-[13px] font-semibold text-secondary">
                        {formatFromKes(s.revenue, "KES")}
                      </td>
                      <td className="px-4 py-2.5 text-[13px] text-on-surface-variant">
                        {s.avgDealSize > 0 ? formatFromKes(s.avgDealSize, "KES") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Cohort Analysis — Last 6 Months">
        {loading ? (
          <Skeleton className="h-56 rounded-xl" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead className="bg-surface-container-low border-b border-outline-variant/30">
                <tr>
                  {[
                    "Cohort Month",
                    "Leads",
                    "Converted",
                    "Conversion %",
                    "Avg Days to Convert",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 font-label-md text-[11px] text-on-surface-variant uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {cohorts.map((c) => (
                  <tr key={c.month}>
                    <td className="px-4 py-2.5 font-semibold text-[13px] text-primary-container">
                      {c.month}
                    </td>
                    <td className="px-4 py-2.5 text-[13px] text-on-surface">{c.leadCount}</td>
                    <td className="px-4 py-2.5 text-[13px] text-on-surface">{c.convertedCount}</td>
                    <td className="px-4 py-2.5 text-[13px] text-on-surface">{c.conversionPct}%</td>
                    <td className="px-4 py-2.5 text-[13px] text-on-surface-variant">
                      {c.avgDaysToConvert !== null ? `${c.avgDaysToConvert}d` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
