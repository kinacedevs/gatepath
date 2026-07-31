/**
 * Gatepath Realtors — Installment Tracker (Phase 5C redesign)
 * Replaces the Phase 5A mechanical split. Real fix: "Paid So Far" now sums
 * the actual `payments` table (status="success") per inquiry instead of
 * reading `inquiries.deposit`, which the original code's own comment
 * admitted was just an approximation ("In a real app we'd sum payments
 * table, but deposit holds initial"). Added a real collection-rate KPI and
 * a working "Send Reminder" action (src/lib/notifications.ts,
 * sendPaymentReminderFn) — the original tab had no reminder action at all.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Send, Check, DollarSign, TrendingUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatFromKes } from "@/lib/currency";
import { sendPaymentReminderFn } from "@/lib/notifications";
import { KpiCard } from "@/components/admin/KpiCard";
import type { Inquiry } from "@/lib/types";

export const Route = createFileRoute("/admin/installments")({
  component: InstallmentTracker,
});

interface Ledger {
  inquiry: Inquiry;
  paid: number;
  progress: number;
}

function InstallmentTracker() {
  const [ledgers, setLedgers] = useState<Ledger[]>([]);
  const [loading, setLoading] = useState(true);
  const [reminderState, setReminderState] = useState<Record<string, "sending" | "sent" | "error">>(
    {},
  );

  const loadData = async () => {
    setLoading(true);
    const [inquiriesRes, paymentsRes] = await Promise.all([
      supabase
        .from("inquiries")
        .select("*")
        .eq("terms_of_payment", "installment")
        .order("created_at", { ascending: false }),
      supabase.from("payments").select("inquiry_id, amount").eq("status", "success"),
    ]);

    const paidByInquiry = new Map<string, number>();
    for (const p of (paymentsRes.data ?? []) as { inquiry_id: string | null; amount: number }[]) {
      if (!p.inquiry_id) continue;
      paidByInquiry.set(p.inquiry_id, (paidByInquiry.get(p.inquiry_id) ?? 0) + Number(p.amount));
    }

    const rows = ((inquiriesRes.data as Inquiry[]) ?? []).map((inquiry) => {
      const paid = paidByInquiry.get(inquiry.id) ?? 0;
      const price = inquiry.price || 1;
      const progress = Math.min(100, Math.round((paid / price) * 100));
      return { inquiry, paid, progress };
    });
    setLedgers(rows);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalExpected = ledgers.reduce((sum, l) => sum + (l.inquiry.price || 0), 0);
  const totalCollected = ledgers.reduce((sum, l) => sum + l.paid, 0);
  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;

  const handleSendReminder = async (inquiryId: string) => {
    setReminderState((s) => ({ ...s, [inquiryId]: "sending" }));

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      setReminderState((s) => ({ ...s, [inquiryId]: "error" }));
      return;
    }

    const result = await sendPaymentReminderFn({
      data: { callerAccessToken: accessToken, inquiryId },
    });
    setReminderState((s) => ({ ...s, [inquiryId]: result.success ? "sent" : "error" }));
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-primary font-bold">
          Installment Tracker
        </h1>
        <p className="text-body-md text-on-surface-variant">
          Monitor progress of clients on installment payment plans.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          label="Total Expected"
          value={loading ? "…" : formatFromKes(totalExpected, "KES")}
          icon={DollarSign}
        />
        <KpiCard
          label="Total Collected"
          value={loading ? "…" : formatFromKes(totalCollected, "KES")}
          icon={DollarSign}
          tone="success"
        />
        <KpiCard
          label="Collection Rate"
          value={loading ? "…" : `${collectionRate}%`}
          icon={TrendingUp}
          tone={collectionRate < 50 ? "warning" : "success"}
        />
      </div>

      <div className="luxury-card rounded-xl shadow-sm overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low border-b border-outline-variant/30">
              <tr>
                <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase text-[11px]">
                  Client &amp; Plot
                </th>
                <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase text-[11px]">
                  Agreed Price
                </th>
                <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase text-[11px]">
                  Paid So Far
                </th>
                <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase text-[11px]">
                  Progress
                </th>
                <th className="px-6 py-4 font-label-md text-on-surface-variant uppercase text-[11px] text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {ledgers.map(({ inquiry, paid, progress }) => {
                const state = reminderState[inquiry.id];
                return (
                  <tr
                    key={inquiry.id}
                    className="hover:bg-surface-container-low/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-[14px] text-primary-container">
                        {inquiry.client_full_name}
                      </div>
                      <div className="text-[12px] text-on-surface-variant">
                        {inquiry.phase_name} · Plot {inquiry.plot_number_ref}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-primary-container">
                      {formatFromKes(inquiry.price || 0, "KES")}
                    </td>
                    <td className="px-6 py-4 font-semibold text-on-success-container">
                      {formatFromKes(paid, "KES")}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-surface-container-low rounded-full overflow-hidden min-w-[80px]">
                          <div
                            className={`h-full rounded-full ${
                              progress === 100 ? "bg-available" : "bg-primary"
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-[13px] font-semibold text-primary-container">
                          {progress}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {progress >= 100 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-on-success-container">
                          <Check size={13} /> Paid in full
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSendReminder(inquiry.id)}
                          disabled={state === "sending"}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary-container text-on-secondary-container font-label-md text-xs rounded-lg hover:opacity-90 transition-all disabled:opacity-60"
                        >
                          <Send size={13} />
                          {state === "sending"
                            ? "Sending…"
                            : state === "sent"
                              ? "Reminder Sent"
                              : state === "error"
                                ? "Retry Reminder"
                                : "Send Reminder"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!loading && ledgers.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-on-surface-variant">
                    No clients on an installment plan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
