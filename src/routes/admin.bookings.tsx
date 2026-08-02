/**
 * Gatepath Realtors — Site Visits (Phase 2, Slice 1)
 * Merges the old "Site Visit Bookings" (flat table, NAVY legacy style) and
 * "Meetings & Calls" (card grid with non-functional Reschedule/Complete
 * buttons — see admin.meetings.tsx, now retired to a redirect) into one
 * real calendar + agenda screen. Both previously rendered the same
 * `bookings` table in two different shapes.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  CheckCircle,
  X,
  MapPin,
  Activity,
  Calendar as CalendarIcon,
  Users as UsersIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { updateBookingFn } from "@/lib/bookingActions";
import { useAdminSession } from "@/context/AdminSessionContext";
import { KpiCard } from "@/components/admin/KpiCard";
import { SectionCard } from "@/components/admin/SectionCard";
import { EscalationCard } from "@/components/admin/EscalationCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Booking, Inquiry } from "@/lib/types";

export const Route = createFileRoute("/admin/bookings")({
  component: SiteVisits,
});

const BOOKING_STATUS_TONE = {
  pending: "neutral",
  confirmed: "info",
  completed: "success",
  cancelled: "error",
} as const;

/** Local (not UTC) YYYY-MM-DD — Date#toISOString() would roll back a day for
 * any EAT (UTC+3) local-midnight date, showing the wrong day's bookings. */
function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type BookingPatch = {
  status?: Booking["status"];
  visitDate?: string;
  visitTime?: "morning" | "afternoon";
};

function SiteVisits() {
  const { adminRole } = useAdminSession();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [reschedulingBooking, setReschedulingBooking] = useState<Booking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState<"morning" | "afternoon">("morning");
  const [actionState, setActionState] = useState<Record<string, boolean>>({});

  // ── Daily Visit Capacity (Part 3, Slice E) ──
  const [dailyCapacity, setDailyCapacity] = useState("8");
  const [capacitySaving, setCapacitySaving] = useState(false);
  const [capacityMsg, setCapacityMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [bookingsRes, inquiriesRes, capacityRes] = await Promise.all([
      supabase.from("bookings").select("*").order("visit_date", { ascending: true }),
      supabase.from("inquiries").select("*"),
      (supabase as any)
        .from("site_banners")
        .select("data")
        .eq("id", "booking_capacity")
        .maybeSingle(),
    ]);
    setBookings((bookingsRes.data as Booking[]) ?? []);
    setInquiries((inquiriesRes.data as Inquiry[]) ?? []);
    const maxPerDay = capacityRes.data?.data?.max_per_day;
    if (maxPerDay) setDailyCapacity(String(maxPerDay));
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveCapacity = async () => {
    if (adminRole === "agent") {
      alert("Access Denied: Agents cannot change visit capacity.");
      return;
    }
    setCapacitySaving(true);
    setCapacityMsg(null);

    const { error } = await (supabase as any).from("site_banners").upsert(
      {
        id: "booking_capacity",
        data: { max_per_day: Number(dailyCapacity) || 8 },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    setCapacitySaving(false);
    setCapacityMsg(error ? "Error saving: " + error.message : "Saved.");
  };

  const bookedDateObjs = useMemo(() => {
    const keys = new Set<string>();
    bookings.forEach((b) => {
      if (b.visit_date) keys.add(b.visit_date);
    });
    return Array.from(keys).map((d) => new Date(`${d}T00:00:00`));
  }, [bookings]);

  const todayKey = localDateKey(new Date());
  const monthKey = todayKey.slice(0, 7);
  const selectedDateKey = localDateKey(selectedDate);
  const dayBookings = bookings.filter((b) => b.visit_date === selectedDateKey);

  const upcoming = bookings.filter(
    (b) => b.visit_date && b.visit_date >= todayKey && b.status !== "cancelled",
  ).length;
  const confirmed = bookings.filter((b) => b.status === "confirmed").length;
  const completedThisMonth = bookings.filter(
    (b) => b.status === "completed" && b.visit_date?.startsWith(monthKey),
  ).length;
  const cancelled = bookings.filter((b) => b.status === "cancelled").length;

  const overdueBookings = bookings.filter(
    (b) => b.status === "pending" && b.visit_date && b.visit_date < todayKey,
  );

  const runAction = async (bookingId: string, patch: BookingPatch) => {
    setActionState((s) => ({ ...s, [bookingId]: true }));
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      setActionState((s) => ({ ...s, [bookingId]: false }));
      return;
    }
    await updateBookingFn({ data: { ...patch, callerAccessToken: accessToken, bookingId } });
    await loadData();
    setActionState((s) => ({ ...s, [bookingId]: false }));
  };

  const openReschedule = (booking: Booking) => {
    setReschedulingBooking(booking);
    setRescheduleDate(booking.visit_date ?? "");
    setRescheduleTime(booking.visit_time ?? "morning");
  };

  const submitReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reschedulingBooking) return;
    await runAction(reschedulingBooking.id, {
      visitDate: rescheduleDate,
      visitTime: rescheduleTime,
      status: "confirmed",
    });
    setReschedulingBooking(null);
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div>
        <h1 className="font-headline-lg text-headline-lg text-primary font-bold">Site Visits</h1>
        <p className="text-body-md text-on-surface-variant">
          Calendar and agenda for scheduled physical and virtual visits.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard label="Upcoming" value={loading ? "…" : String(upcoming)} icon={CalendarIcon} />
        <KpiCard
          label="Confirmed"
          value={loading ? "…" : String(confirmed)}
          icon={Check}
          tone="success"
        />
        <KpiCard
          label="Completed This Month"
          value={loading ? "…" : String(completedThisMonth)}
          icon={CheckCircle}
          tone="success"
        />
        <KpiCard
          label="Cancelled"
          value={loading ? "…" : String(cancelled)}
          icon={X}
          tone="warning"
        />
      </div>

      <SectionCard title="Daily Visit Capacity">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">
              Max Visits Per Day (Company-Wide)
            </label>
            <input
              type="number"
              min={1}
              value={dailyCapacity}
              onChange={(e) => setDailyCapacity(e.target.value)}
              className="w-28 bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-md py-2 px-3 outline-none"
            />
          </div>
          {adminRole !== "agent" && (
            <button
              onClick={handleSaveCapacity}
              disabled={capacitySaving}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-60"
            >
              {capacitySaving ? "Saving..." : "Save"}
            </button>
          )}
          {capacityMsg && (
            <span
              className={`text-xs font-semibold ${capacityMsg.includes("Error") ? "text-error" : "text-on-success-container"}`}
            >
              {capacityMsg}
            </span>
          )}
        </div>
        <p className="mt-2 text-xs text-on-surface-variant">
          The public site-visit booking form enforces this cap in real time — a day at or over
          capacity is rejected with a "fully booked" message.
        </p>
      </SectionCard>

      {!loading && overdueBookings.length > 0 && (
        <div className="flex flex-col gap-2">
          {overdueBookings.slice(0, 3).map((b) => {
            const inquiry = inquiries.find((i) => i.id === b.inquiry_id);
            return (
              <EscalationCard
                key={b.id}
                title={`Visit never confirmed — ${b.visit_date}`}
                description={`${inquiry?.client_full_name ?? "Unknown client"}'s ${b.visit_type} visit is past its date and still pending.`}
                urgency="error"
                actionLabel="Jump to date"
                onAction={() => setSelectedDate(new Date(`${b.visit_date ?? todayKey}T00:00:00`))}
              />
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6 items-start">
        <SectionCard title="Calendar" className="w-fit">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(d) => d && setSelectedDate(d)}
            modifiers={{ hasBooking: bookedDateObjs }}
            modifiersClassNames={{
              hasBooking:
                "relative after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-accent",
            }}
          />
        </SectionCard>

        <SectionCard
          title={selectedDate.toLocaleDateString("en-KE", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        >
          {dayBookings.length === 0 ? (
            <p className="text-sm text-on-surface-variant text-center py-8">
              No visits scheduled for this day.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {dayBookings.map((booking) => {
                const inquiry = inquiries.find((i) => i.id === booking.inquiry_id);
                const busy = actionState[booking.id];
                return (
                  <div
                    key={booking.id}
                    className="rounded-xl border border-outline-variant/30 p-4 relative overflow-hidden bg-surface-container-lowest"
                  >
                    <div
                      className={`absolute top-0 left-0 bottom-0 w-1 ${booking.visit_type === "virtual" ? "bg-purple-500" : "bg-accent"}`}
                    />
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          {booking.visit_type === "virtual" ? (
                            <Activity size={13} className="text-purple-500" />
                          ) : (
                            <MapPin size={13} className="text-accent" />
                          )}
                          <span className="font-label-md text-[11px] uppercase text-on-surface-variant">
                            {booking.visit_type} Visit
                          </span>
                        </div>
                        <p className="font-semibold text-sm text-primary-container">
                          {inquiry?.client_full_name ?? "Unknown Client"}
                        </p>
                      </div>
                      <StatusBadge tone={BOOKING_STATUS_TONE[booking.status]}>
                        {booking.status}
                      </StatusBadge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-on-surface-variant mb-1">
                      <UsersIcon size={12} /> {booking.attendees} attendee(s) · {booking.visit_time}
                    </div>
                    {booking.pickup_location && (
                      <div className="flex items-start gap-2 text-xs text-on-surface-variant mb-3">
                        <MapPin size={12} className="mt-0.5" /> Pickup: {booking.pickup_location}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {booking.status === "pending" && (
                        <button
                          disabled={busy}
                          onClick={() => runAction(booking.id, { status: "confirmed" })}
                          className="px-2.5 py-1.5 rounded-lg bg-info-container/15 text-on-info-container text-[11px] font-bold disabled:opacity-50"
                        >
                          Confirm
                        </button>
                      )}
                      {booking.status !== "completed" && booking.status !== "cancelled" && (
                        <>
                          <button
                            disabled={busy}
                            onClick={() => runAction(booking.id, { status: "completed" })}
                            className="px-2.5 py-1.5 rounded-lg bg-success-container/15 text-on-success-container text-[11px] font-bold disabled:opacity-50"
                          >
                            Complete
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => openReschedule(booking)}
                            className="px-2.5 py-1.5 rounded-lg bg-surface-container-high text-on-surface text-[11px] font-bold disabled:opacity-50"
                          >
                            Reschedule
                          </button>
                          <button
                            disabled={busy}
                            onClick={() => runAction(booking.id, { status: "cancelled" })}
                            className="px-2.5 py-1.5 rounded-lg bg-error/10 text-error text-[11px] font-bold disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>

      <Dialog
        open={!!reschedulingBooking}
        onOpenChange={(open) => !open && setReschedulingBooking(null)}
      >
        <DialogContent className="sm:max-w-[360px]">
          <DialogHeader>
            <DialogTitle>Reschedule Visit</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitReschedule} className="flex flex-col gap-4">
            <div>
              <label className="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">
                New Date
              </label>
              <input
                type="date"
                required
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-md py-2.5 px-3 outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-on-surface-variant uppercase mb-1">
                Time
              </label>
              <select
                value={rescheduleTime}
                onChange={(e) => setRescheduleTime(e.target.value as "morning" | "afternoon")}
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg text-body-md py-2.5 px-3 outline-none"
              >
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
              </select>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <button
                type="button"
                onClick={() => setReschedulingBooking(null)}
                className="px-4 py-2 rounded-lg border border-outline-variant/40 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold"
              >
                Confirm New Date
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
