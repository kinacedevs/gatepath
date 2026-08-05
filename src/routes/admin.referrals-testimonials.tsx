/**
 * Gatepath Realtors — Referrals & Testimonials (Part 2, Module 14)
 * Any staff role — sending a thank-you/referral email is routine
 * relationship-management outreach, not a sensitive write, matching Tasks'/
 * Property Matching's gate rather than Commission's/Goals' elevated one.
 *
 * "Handover-eligible" here means fully paid and finalized
 * (agreements.ceo_signed) — the literal title-deed registry handover isn't
 * independently tracked in this system yet (no plot_status_history table),
 * so this is the closest real signal, stated plainly rather than implied.
 *
 * Reviewing/approving submitted testimonials happens in Site Content →
 * Testimonials (not duplicated here) — this screen is the outreach side.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { UserCheck2, MessageSquareQuote, Share2, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { sendTestimonialRequestFn, sendReferralInviteFn } from "@/lib/testimonialActions";
import { KpiCard } from "@/components/admin/KpiCard";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { FreshnessStamp } from "@/components/admin/FreshnessStamp";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import type { ColumnDef } from "@tanstack/react-table";

export const Route = createFileRoute("/admin/referrals-testimonials")({
  component: ReferralsAndTestimonials,
});

interface EligibleClient {
  id: string;
  clientName: string;
  dealLabel: string;
  testimonialRequestedAt: string | null;
  referralInviteSentAt: string | null;
  testimonialStatus: "not_submitted" | "pending_review" | "approved";
}

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.round(diffMs / (24 * 60 * 60 * 1000));
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

function ReferralsAndTestimonials() {
  const [inquiries, setInquiries] = useState<
    {
      id: string;
      client_full_name: string;
      phase_name: string | null;
      plot_number_ref: number | null;
      testimonial_requested_at: string | null;
      referral_invite_sent_at: string | null;
    }[]
  >([]);
  const [agreements, setAgreements] = useState<
    { inquiry_id: string | null; ceo_signed: boolean }[]
  >([]);
  const [testimonials, setTestimonials] = useState<
    { submitted_by_inquiry_id: string | null; is_published: boolean }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [inquiriesRes, agreementsRes, testimonialsRes] = await Promise.all([
      supabase
        .from("inquiries")
        .select(
          "id, client_full_name, phase_name, plot_number_ref, testimonial_requested_at, referral_invite_sent_at",
        ),
      supabase.from("agreements").select("inquiry_id, ceo_signed").eq("ceo_signed", true),
      supabase.from("testimonials").select("submitted_by_inquiry_id, is_published"),
    ]);

    setInquiries(inquiriesRes.data ?? []);
    setAgreements(agreementsRes.data ?? []);
    setTestimonials(testimonialsRes.data ?? []);
    setLoading(false);
    setLastUpdated(new Date());
  };

  useEffect(() => {
    loadData();
  }, []);

  const eligibleClients: EligibleClient[] = useMemo(() => {
    const closedInquiryIds = new Set(
      agreements.filter((a) => a.ceo_signed && a.inquiry_id).map((a) => a.inquiry_id as string),
    );

    return inquiries
      .filter((inq) => closedInquiryIds.has(inq.id))
      .map((inq) => {
        const testimonial = testimonials.find((t) => t.submitted_by_inquiry_id === inq.id);
        const testimonialStatus: EligibleClient["testimonialStatus"] = !testimonial
          ? "not_submitted"
          : testimonial.is_published
            ? "approved"
            : "pending_review";

        return {
          id: inq.id,
          clientName: inq.client_full_name,
          dealLabel: inq.phase_name
            ? `${inq.phase_name}${inq.plot_number_ref ? ` — Plot #${inq.plot_number_ref}` : ""}`
            : "—",
          testimonialRequestedAt: inq.testimonial_requested_at,
          referralInviteSentAt: inq.referral_invite_sent_at,
          testimonialStatus,
        };
      });
  }, [inquiries, agreements, testimonials]);

  const testimonialsRequestedCount = eligibleClients.filter((c) => c.testimonialRequestedAt).length;
  const referralInvitesSentCount = eligibleClients.filter((c) => c.referralInviteSentAt).length;
  const testimonialsSubmittedCount = eligibleClients.filter(
    (c) => c.testimonialStatus !== "not_submitted",
  ).length;

  const getAccessToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  };

  const sendTestimonialRequest = async (inquiryId: string) => {
    setSendingId(inquiryId);
    setActionMsg(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setActionMsg("Your session expired — please sign in again.");
        return;
      }
      const result = await (sendTestimonialRequestFn as any)({
        data: { callerAccessToken: token, inquiryId },
      });
      if (!result.success) {
        setActionMsg("Error: " + result.error);
      } else {
        loadData();
      }
    } catch (err: any) {
      setActionMsg("Something went wrong: " + (err?.message || "Unknown error."));
    } finally {
      setSendingId(null);
    }
  };

  const sendReferralInvite = async (inquiryId: string) => {
    setSendingId(inquiryId);
    setActionMsg(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setActionMsg("Your session expired — please sign in again.");
        return;
      }
      const result = await (sendReferralInviteFn as any)({
        data: { callerAccessToken: token, inquiryId },
      });
      if (!result.success) {
        setActionMsg("Error: " + result.error);
      } else {
        loadData();
      }
    } catch (err: any) {
      setActionMsg("Something went wrong: " + (err?.message || "Unknown error."));
    } finally {
      setSendingId(null);
    }
  };

  const columns: ColumnDef<EligibleClient, any>[] = [
    {
      id: "client",
      header: "Client",
      accessorFn: (row) => row.clientName,
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-[14px] text-primary-container">
            {row.original.clientName}
          </div>
          <div className="text-[12px] text-on-surface-variant">{row.original.dealLabel}</div>
        </div>
      ),
    },
    {
      id: "testimonialRequest",
      header: "Testimonial Request",
      accessorFn: (row) => row.testimonialRequestedAt ?? "",
      cell: ({ row }) =>
        row.original.testimonialRequestedAt ? (
          <span className="text-[12px] text-on-surface-variant inline-flex items-center gap-1">
            <Clock size={12} /> Sent {relativeTime(row.original.testimonialRequestedAt)}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => sendTestimonialRequest(row.original.id)}
            disabled={sendingId === row.original.id}
            className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold"
          >
            Send Request
          </button>
        ),
    },
    {
      id: "referralInvite",
      header: "Referral Invite",
      accessorFn: (row) => row.referralInviteSentAt ?? "",
      cell: ({ row }) =>
        row.original.referralInviteSentAt ? (
          <span className="text-[12px] text-on-surface-variant inline-flex items-center gap-1">
            <Clock size={12} /> Sent {relativeTime(row.original.referralInviteSentAt)}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => sendReferralInvite(row.original.id)}
            disabled={sendingId === row.original.id}
            className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold"
          >
            Send Invite
          </button>
        ),
    },
    {
      id: "testimonialStatus",
      header: "Testimonial Status",
      accessorFn: (row) => row.testimonialStatus,
      cell: ({ row }) => {
        const status = row.original.testimonialStatus;
        if (status === "approved") return <StatusBadge tone="success">Published</StatusBadge>;
        if (status === "pending_review")
          return <StatusBadge tone="warning">Pending Review</StatusBadge>;
        return <StatusBadge tone="neutral">Not Yet Submitted</StatusBadge>;
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary font-bold">
            Referrals &amp; Testimonials
          </h1>
          <p className="text-body-md text-on-surface-variant">
            "Handover-eligible" means fully paid and finalized — the literal title-deed handover
            isn't independently tracked yet. Review submitted testimonials in{" "}
            <Link to="/admin/site-content" className="text-primary underline">
              Site Content → Testimonials
            </Link>
            .
          </p>
        </div>
        <FreshnessStamp updatedAt={lastUpdated} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Handover-Eligible Clients"
          value={loading ? "…" : String(eligibleClients.length)}
          icon={UserCheck2}
        />
        <KpiCard
          label="Testimonials Requested"
          value={loading ? "…" : String(testimonialsRequestedCount)}
          icon={MessageSquareQuote}
        />
        <KpiCard
          label="Referral Invites Sent"
          value={loading ? "…" : String(referralInvitesSentCount)}
          icon={Share2}
        />
        <KpiCard
          label="Testimonials Submitted"
          value={loading ? "…" : String(testimonialsSubmittedCount)}
          icon={MessageSquareQuote}
          tone="success"
        />
      </div>

      {actionMsg && (
        <div className="px-4 py-2.5 bg-info-container/10 border border-info-container/30 rounded-lg text-[13px] text-on-surface">
          {actionMsg}
        </div>
      )}

      <div className="luxury-card rounded-xl shadow-sm overflow-hidden bg-white">
        <div className="px-6 py-4 border-b border-outline-variant/30">
          <h2 className="font-headline-md text-sm text-primary font-bold">
            Handover-Eligible Clients
          </h2>
        </div>
        {loading ? (
          <Skeleton className="h-64 rounded-xl m-4" />
        ) : eligibleClients.length === 0 ? (
          <EmptyState title="No handover-eligible clients yet." />
        ) : (
          <AdminDataTable
            columns={columns}
            data={eligibleClients}
            emptyMessage="No handover-eligible clients yet."
          />
        )}
      </div>
    </div>
  );
}
