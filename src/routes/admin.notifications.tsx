/**
 * Gatepath Realtors — Notifications & Escalations Center (Part 2, Module 9)
 * Reuses the existing EscalationCard component (Phase 1) across 5
 * categories — the 2 already live on the Dashboard (overdue installments,
 * stale bookings, re-implemented here rather than shared, matching Module
 * 6's precedent) plus 3 new ones the brief named: stalled lead (real now
 * that interaction_log exists, Phase 10), missing feedback (needed a small
 * additive migration — bookings.staff_feedback, not a status transition),
 * and expiring grace period (the 14-day reservation hold, fully derivable
 * from offers/agreements with no new schema).
 *
 * One-click actions: stalled lead and missing feedback open a compact
 * inline dialog (quick-log / quick-feedback) rather than navigating away;
 * expiring grace period fires an existing reminder function directly;
 * overdue installment / stale booking jump to their real existing action
 * surfaces (Installments / Site Visits) rather than duplicating those.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Bell, AlertTriangle, Clock, MessageSquareWarning, Hourglass } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { logInteractionFn } from "@/lib/interactionLogActions";
import { logBookingFeedbackFn } from "@/lib/escalationActions";
import { sendPaymentReminderFn } from "@/lib/notifications";
import {
  findOverdueInstallments,
  findStaleBookings,
  findStalledLeads,
  findMissingFeedback,
  findExpiringGracePeriods,
  sortByUrgency,
  type EscalationItem,
} from "@/lib/escalations";
import { KpiCard } from "@/components/admin/KpiCard";
import { EscalationCard } from "@/components/admin/EscalationCard";
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
import type { Inquiry, Payment, Booking, InteractionLog, Offer, Agreement } from "@/lib/types";

export const Route = createFileRoute("/admin/notifications")({
  component: NotificationsCenter,
});

const CATEGORY_ICON: Record<EscalationItem["category"], typeof Bell> = {
  overdue_installment: Clock,
  stale_booking: AlertTriangle,
  stalled_lead: MessageSquareWarning,
  missing_feedback: MessageSquareWarning,
  expiring_grace_period: Hourglass,
};

function NotificationsCenter() {
  const navigate = useNavigate();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [interactions, setInteractions] = useState<InteractionLog[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [loggingInquiryId, setLoggingInquiryId] = useState<string | null>(null);
  const [quickChannel, setQuickChannel] = useState<InteractionLog["channel"]>("call");
  const [quickNotes, setQuickNotes] = useState("");

  const [feedbackBookingId, setFeedbackBookingId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  // Shared by both dialogs below — only one is ever open at a time, and
  // blocks a fast double-click on "Log It"/"Save Feedback" from firing
  // logInteractionFn/logBookingFeedbackFn twice.
  const [dialogSubmitting, setDialogSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [inquiriesRes, paymentsRes, bookingsRes, interactionsRes, offersRes, agreementsRes] =
      await Promise.all([
        supabase.from("inquiries").select("*"),
        supabase.from("payments").select("*").eq("status", "success"),
        supabase.from("bookings").select("*"),
        supabase.from("interaction_log").select("*"),
        supabase.from("offers").select("*"),
        supabase.from("agreements").select("*"),
      ]);
    setInquiries((inquiriesRes.data as Inquiry[]) ?? []);
    setPayments((paymentsRes.data as Payment[]) ?? []);
    setBookings((bookingsRes.data as Booking[]) ?? []);
    setInteractions((interactionsRes.data as InteractionLog[]) ?? []);
    setOffers((offersRes.data as Offer[]) ?? []);
    setAgreements((agreementsRes.data as Agreement[]) ?? []);
    setLoading(false);
    setLastUpdated(new Date());
  };

  useEffect(() => {
    loadData();
  }, []);

  const escalations = useMemo(() => {
    const items = [
      ...findOverdueInstallments(inquiries, payments),
      ...findStaleBookings(bookings, inquiries),
      ...findStalledLeads(inquiries, interactions),
      ...findMissingFeedback(bookings, inquiries),
      ...findExpiringGracePeriods(offers, agreements, inquiries),
    ];
    return sortByUrgency(items);
  }, [inquiries, payments, bookings, interactions, offers, agreements]);

  const countByCategory = (category: EscalationItem["category"]) =>
    escalations.filter((e) => e.category === category).length;

  const getAccessToken = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    return sessionData.session?.access_token;
  };

  const openQuickLog = (inquiryId: string) => {
    setQuickChannel("call");
    setQuickNotes("");
    setLoggingInquiryId(inquiryId);
  };

  const submitQuickLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggingInquiryId || dialogSubmitting) return;
    setDialogSubmitting(true);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setToast("Your session expired — please sign in again.");
        return;
      }
      await logInteractionFn({
        data: {
          callerAccessToken: accessToken,
          inquiryId: loggingInquiryId,
          channel: quickChannel,
          direction: "outbound",
          notes: quickNotes.trim(),
        },
      });
      setLoggingInquiryId(null);
      setToast("Interaction logged.");
      loadData();
    } catch (err: any) {
      setToast("Something went wrong: " + (err?.message || "Unknown error."));
    } finally {
      setDialogSubmitting(false);
    }
  };

  const openFeedback = (bookingId: string) => {
    setFeedbackText("");
    setFeedbackBookingId(bookingId);
  };

  const submitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackBookingId || !feedbackText.trim() || dialogSubmitting) return;
    setDialogSubmitting(true);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setToast("Your session expired — please sign in again.");
        return;
      }
      await logBookingFeedbackFn({
        data: {
          callerAccessToken: accessToken,
          bookingId: feedbackBookingId,
          feedback: feedbackText.trim(),
        },
      });
      setFeedbackBookingId(null);
      setToast("Feedback logged.");
      loadData();
    } catch (err: any) {
      setToast("Something went wrong: " + (err?.message || "Unknown error."));
    } finally {
      setDialogSubmitting(false);
    }
  };

  const sendGraceReminder = async (inquiryId: string) => {
    setBusyId(inquiryId);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setToast("Your session expired — please sign in again.");
        return;
      }
      const result = await sendPaymentReminderFn({
        data: { callerAccessToken: accessToken, inquiryId },
      });
      if (!(result as any)?.success) {
        setToast("Error: " + ((result as any)?.error ?? "Failed to send reminder."));
      } else {
        setToast("Reminder sent.");
      }
    } catch (err: any) {
      setToast("Something went wrong: " + (err?.message || "Unknown error."));
    } finally {
      setBusyId(null);
    }
  };

  const runAction = (item: EscalationItem) => {
    switch (item.category) {
      case "stalled_lead":
        if (item.relatedInquiryId) openQuickLog(item.relatedInquiryId);
        return;
      case "missing_feedback":
        if (item.relatedBookingId) openFeedback(item.relatedBookingId);
        return;
      case "expiring_grace_period":
        if (item.relatedInquiryId) sendGraceReminder(item.relatedInquiryId);
        return;
      case "overdue_installment":
        navigate({ to: "/admin/installments" });
        return;
      case "stale_booking":
        navigate({ to: "/admin/bookings" });
        return;
    }
  };

  const actionLabel = (item: EscalationItem): string => {
    switch (item.category) {
      case "stalled_lead":
        return "Log Interaction";
      case "missing_feedback":
        return "Log Feedback";
      case "expiring_grace_period":
        return busyId === item.relatedInquiryId ? "Sending…" : "Send Reminder";
      case "overdue_installment":
        return "View in Installments";
      case "stale_booking":
        return "View in Site Visits";
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary font-bold">
            Notifications &amp; Escalations
          </h1>
          <p className="text-body-md text-on-surface-variant">
            Every urgent task in one place, with a one-click action.
          </p>
        </div>
        <FreshnessStamp updatedAt={lastUpdated} />
      </div>

      {toast && (
        <div className="px-3.5 py-2.5 rounded-lg text-[13px] bg-success-container/15 text-on-success-container">
          {toast}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Active Escalations"
          value={loading ? "…" : String(escalations.length)}
          icon={Bell}
          tone={escalations.length > 0 ? "warning" : "default"}
        />
        <KpiCard
          label="Stalled Leads"
          value={loading ? "…" : String(countByCategory("stalled_lead"))}
          icon={MessageSquareWarning}
        />
        <KpiCard
          label="Missing Feedback"
          value={loading ? "…" : String(countByCategory("missing_feedback"))}
          icon={MessageSquareWarning}
        />
        <KpiCard
          label="Expiring Grace Periods"
          value={loading ? "…" : String(countByCategory("expiring_grace_period"))}
          icon={Hourglass}
          tone={countByCategory("expiring_grace_period") > 0 ? "warning" : "default"}
        />
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
      ) : escalations.length === 0 ? (
        <EmptyState icon={Bell} title="Nothing urgent right now — all clear." />
      ) : (
        <div className="flex flex-col gap-3">
          {escalations.map((item) => (
            <EscalationCard
              key={item.id}
              title={item.title}
              description={item.description}
              urgency={item.urgency}
              icon={CATEGORY_ICON[item.category]}
              actionLabel={actionLabel(item)}
              onAction={() => runAction(item)}
              disabled={
                item.category === "expiring_grace_period" && busyId === item.relatedInquiryId
              }
            />
          ))}
        </div>
      )}

      {/* ══════ MODAL: QUICK LOG INTERACTION (stalled lead) ══════ */}
      <Dialog open={!!loggingInquiryId} onOpenChange={(open) => !open && setLoggingInquiryId(null)}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Log Interaction</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitQuickLog} className="flex flex-col gap-4">
            <select
              value={quickChannel}
              onChange={(e) => setQuickChannel(e.target.value as InteractionLog["channel"])}
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-md py-2.5 px-3 outline-none"
            >
              <option value="call">Call</option>
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
              <option value="other">Other</option>
            </select>
            <textarea
              value={quickNotes}
              onChange={(e) => setQuickNotes(e.target.value)}
              placeholder="What happened?"
              rows={3}
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-md py-2.5 px-3 outline-none resize-y"
            />
            <DialogFooter className="gap-2 sm:gap-0">
              <button
                type="button"
                onClick={() => setLoggingInquiryId(null)}
                className="px-4 py-2 rounded-lg border border-outline-variant/40 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={dialogSubmitting}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-50"
              >
                {dialogSubmitting ? "Logging…" : "Log It"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ══════ MODAL: QUICK FEEDBACK (missing feedback) ══════ */}
      <Dialog
        open={!!feedbackBookingId}
        onOpenChange={(open) => !open && setFeedbackBookingId(null)}
      >
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Log Site Visit Feedback</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitFeedback} className="flex flex-col gap-4">
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="How did the visit go? Client reaction, concerns, next steps..."
              rows={4}
              required
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-md py-2.5 px-3 outline-none resize-y"
            />
            <DialogFooter className="gap-2 sm:gap-0">
              <button
                type="button"
                onClick={() => setFeedbackBookingId(null)}
                className="px-4 py-2 rounded-lg border border-outline-variant/40 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={dialogSubmitting}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-50"
              >
                {dialogSubmitting ? "Saving…" : "Save Feedback"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
