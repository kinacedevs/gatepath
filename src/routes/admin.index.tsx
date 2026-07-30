/**
 * Gatepath Realtors — Admin Dashboard (Phase 5A rebuild)
 * Replaces the old "overview" tab (admin.tsx, previously ~962-1072). Each KPI
 * now runs its own small, real Supabase query instead of deriving from the
 * shell's old 9-table Promise.all — see docs/CRITIQUE.md P3 and the Phase 5A
 * plan for why that fetch was removed from the shell entirely.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DollarSign, Calendar, MapPin, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatFromKes } from "@/lib/currency";
import { KpiCard } from "@/components/admin/KpiCard";
import type { Inquiry } from "@/lib/types";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

interface PlotInventoryTotals {
  available: number;
  booked: number;
  sold: number;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [totalSalesThisMonth, setTotalSalesThisMonth] = useState(0);
  const [siteVisitsToday, setSiteVisitsToday] = useState(0);
  const [inventory, setInventory] = useState<PlotInventoryTotals>({
    available: 0,
    booked: 0,
    sold: 0,
  });
  const [overdueCount, setOverdueCount] = useState(0);
  const [recentInquiries, setRecentInquiries] = useState<Inquiry[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const today = now.toISOString().slice(0, 10);

      const [salesRes, visitsRes, phasesRes, inquiriesForOverdueRes, paymentsRes, recentRes] =
        await Promise.all([
          supabase.from("payments").select("amount").eq("status", "success").gte(
            "created_at",
            startOfMonth,
          ),
          supabase
            .from("bookings")
            .select("*", { count: "exact", head: true })
            .eq("visit_date", today),
          supabase.from("phases").select("available_count, booked_count, sold_count"),
          supabase
            .from("inquiries")
            .select("id, monthly_payment, booking_date")
            .eq("terms_of_payment", "installment"),
          supabase.from("payments").select("inquiry_id, amount").eq("status", "success"),
          supabase
            .from("inquiries")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(4),
        ]);

      if (cancelled) return;

      const salesRows = (salesRes.data ?? []) as { amount: number }[];
      setTotalSalesThisMonth(salesRows.reduce((sum, p) => sum + Number(p.amount), 0));
      setSiteVisitsToday(visitsRes.count ?? 0);

      const phaseRows = (phasesRes.data ?? []) as {
        available_count: number | null;
        booked_count: number | null;
        sold_count: number | null;
      }[];
      const totals = phaseRows.reduce(
        (acc, p) => ({
          available: acc.available + (p.available_count ?? 0),
          booked: acc.booked + (p.booked_count ?? 0),
          sold: acc.sold + (p.sold_count ?? 0),
        }),
        { available: 0, booked: 0, sold: 0 },
      );
      setInventory(totals);

      // Overdue: expected-paid-to-date (monthly_payment × months since booking)
      // vs. the real sum of that inquiry's successful payments — an honest
      // approximation, not a stored due-date ledger (that's Phase 5C). Flag
      // overdue only once the shortfall exceeds one month's payment, so a
      // buyer who's simply a few days into a new month isn't wrongly flagged.
      const paymentRows = (paymentsRes.data ?? []) as { inquiry_id: string | null; amount: number }[];
      const paidByInquiry = new Map<string, number>();
      for (const p of paymentRows) {
        if (!p.inquiry_id) continue;
        paidByInquiry.set(p.inquiry_id, (paidByInquiry.get(p.inquiry_id) ?? 0) + Number(p.amount));
      }
      const monthsSince = (isoDate: string) => {
        const then = new Date(isoDate);
        const months =
          (now.getFullYear() - then.getFullYear()) * 12 + (now.getMonth() - then.getMonth());
        return Math.max(0, months);
      };
      const installmentRows = (inquiriesForOverdueRes.data ?? []) as {
        id: string;
        monthly_payment: number | null;
        booking_date: string | null;
      }[];
      let overdue = 0;
      for (const inq of installmentRows) {
        if (!inq.monthly_payment || !inq.booking_date) continue;
        const expected = inq.monthly_payment * monthsSince(inq.booking_date);
        const actual = paidByInquiry.get(inq.id) ?? 0;
        if (expected - actual > inq.monthly_payment) overdue += 1;
      }
      setOverdueCount(overdue);

      setRecentInquiries((recentRes.data as Inquiry[]) ?? []);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div>
        <h1 className="font-headline-md text-headline-md text-primary font-bold">Dashboard</h1>
        <p className="text-body-md text-on-surface-variant">
          Real-time operations overview — Gatepath Realtors CRM
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Sales This Month"
          value={loading ? "…" : formatFromKes(totalSalesThisMonth, "KES")}
          icon={DollarSign}
          sublabel="Confirmed payments"
        />
        <KpiCard
          label="Site Visits Today"
          value={loading ? "…" : String(siteVisitsToday)}
          icon={Calendar}
        />
        <KpiCard
          label="Plots Available"
          value={loading ? "…" : String(inventory.available)}
          icon={MapPin}
          tone="success"
          sublabel={`${inventory.booked} booked · ${inventory.sold} sold`}
        />
        <KpiCard
          label="Overdue Installments"
          value={loading ? "…" : String(overdueCount)}
          icon={AlertTriangle}
          tone={overdueCount > 0 ? "warning" : "default"}
          sublabel="Approximate — see Installment Tracker"
        />
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-[65%] luxury-card rounded-xl flex flex-col">
          <div className="p-6 border-b border-outline-variant flex justify-between items-center">
            <h2 className="font-headline-md text-headline-md text-primary font-bold">
              Global Plot Inventory
            </h2>
            <Link
              to="/admin/plots"
              className="px-4 py-2 border border-secondary text-secondary font-label-md text-label-md rounded-lg hover:bg-secondary-fixed transition-colors"
            >
              Manage Inventory
            </Link>
          </div>
          <div className="p-6 grid grid-cols-3 gap-4">
            {[
              { label: "Available", count: inventory.available, tone: "success" as const },
              { label: "Booked", count: inventory.booked, tone: "warning" as const },
              { label: "Sold", count: inventory.sold, tone: "info" as const },
            ].map((row) => (
              <div
                key={row.label}
                className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-5 flex flex-col justify-between"
              >
                <span className="font-label-md text-[13px] text-on-surface-variant uppercase tracking-wider mb-2">
                  {row.label} Plots
                </span>
                <span className="font-stat-lg text-[32px] text-primary-container">
                  {row.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:w-[35%] luxury-card rounded-xl flex flex-col">
          <div className="p-6 border-b border-outline-variant flex justify-between items-center">
            <h2 className="font-headline-md text-headline-md text-primary font-bold">
              Recent Inquiries
            </h2>
            <Link to="/admin/inquiries" className="text-[12px] text-secondary font-label-md hover:underline">
              View All
            </Link>
          </div>
          <div className="flex-1 p-6 space-y-3">
            {recentInquiries.map((inq) => (
              <Link
                key={inq.id}
                to="/admin/inquiries"
                className="flex items-center gap-3 p-3 rounded-lg border border-outline-variant hover:bg-surface-container-low cursor-pointer transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary-deep font-bold text-sm shrink-0">
                  {getInitials(inq.client_full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-label-md text-[13px] text-primary truncate">
                    {inq.client_full_name}
                  </p>
                  <p className="text-[11px] text-on-surface-variant truncate">
                    {inq.phase_name || "Any Phase"}
                  </p>
                </div>
                <span
                  className={`text-[9px] font-bold uppercase px-2 py-1 rounded ${
                    inq.status === "pending"
                      ? "bg-warning-container/15 text-on-warning-container"
                      : "bg-success-container/15 text-on-success-container"
                  }`}
                >
                  {inq.status}
                </span>
              </Link>
            ))}
            {!loading && recentInquiries.length === 0 && (
              <div className="text-center text-on-surface-variant text-[13px] py-4">
                No recent inquiries
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
