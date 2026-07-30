/**
 * Gatepath Realtors — Site Visit Bookings (Phase 5A mechanical split)
 * Relocated verbatim from the old "bookings" tab (admin.tsx, previously
 * ~1253-1358). Same JSX, same inline styles, same NAVY hex — copied as-is,
 * not redesigned.
 *
 * NOTE: the plan assumed this tab needed `bookings` joined to `inquiries`
 * for client name/phase display, but the original table only ever rendered
 * booking fields (visit_date, visit_time, visit_type, attendees,
 * visit_notes, status) — no client name column. That join actually belongs
 * to the separate "Meetings & Calls" tab (admin.meetings.tsx), which does
 * cross-reference inquiries. So this tab's scoped fetch is `bookings` only.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, CheckCircle, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Booking } from "@/lib/types";

export const Route = createFileRoute("/admin/bookings")({
  component: SiteVisitBookings,
});

const NAVY = "#0C1A30";
const CARD_BORDER = "#E5E0D8";

function SiteVisitBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  const loadData = async () => {
    setDataLoading(true);
    try {
      const bookingsRes = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });
      setBookings((bookingsRes.data as Booking[]) ?? []);
    } catch (err) {
      console.error("Error loading bookings data:", err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateBookingStatus = async (
    bookingId: string,
    status: Booking["status"]
  ) => {
    const { error } = await ((supabase as any)
      .from("bookings")
      .update({ status })
      .eq("id", bookingId));

    if (error) {
      alert("Error updating booking: " + error.message);
      return;
    }
    loadData();
  };

  void dataLoading;

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 24, color: NAVY, margin: 0 }}>Site Visit Bookings</h1>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280", marginTop: 4 }}>Manage and confirm scheduled site visits and virtual tours.</p>
      </div>

      <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${CARD_BORDER}`, boxShadow: "0 2px 12px rgba(12,26,48,0.05)", overflow: "hidden" }}>
        <div style={{ padding: "18px 24px", borderBottom: `1px solid ${CARD_BORDER}` }}>
          <h3 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 600, fontSize: 16, color: NAVY, margin: 0 }}>Active Bookings Queue</h3>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F9FAFB", borderBottom: `1px solid ${CARD_BORDER}` }}>
                {["Scheduled Date", "Visit Type", "Attendees", "Notes", "Status", "Actions"].map((h) => (
                  <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.09em" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "48px 20px", textAlign: "center", color: "#9CA3AF", fontFamily: "Inter, sans-serif", fontSize: 13 }}>
                    No bookings scheduled.
                  </td>
                </tr>
              ) : (
                bookings.map((booking, idx) => {
                  const visitBadge = booking.visit_type === "virtual"
                    ? { bg: "#EDE9FE", color: "#7C3AED" }
                    : { bg: "#DBEAFE", color: "#2563EB" };
                  const statusMap: Record<string, { bg: string; color: string }> = {
                    pending: { bg: "#FEF3C7", color: "#D97706" },
                    confirmed: { bg: "#DBEAFE", color: "#2563EB" },
                    completed: { bg: "#D1FAE5", color: "#059669" },
                    cancelled: { bg: "#FEE2E2", color: "#DC2626" },
                  };
                  const sc = statusMap[booking.status] ?? { bg: "#F3F4F6", color: "#6B7280" };
                  return (
                    <tr
                      key={booking.id}
                      style={{ borderBottom: idx < bookings.length - 1 ? `1px solid ${CARD_BORDER}` : "none" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "#F9FAFB"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                    >
                      <td style={{ padding: "14px 20px", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: NAVY }}>
                        {booking.visit_date} <span style={{ fontWeight: 400, color: "#6B7280" }}>({booking.visit_time})</span>
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, textTransform: "capitalize", background: visitBadge.bg, color: visitBadge.color }}>
                          {booking.visit_type}
                        </span>
                      </td>
                      <td style={{ padding: "14px 20px", fontFamily: "Inter, sans-serif", fontSize: 13, color: "#374151" }}>{booking.attendees}</td>
                      <td style={{ padding: "14px 20px", fontFamily: "Inter, sans-serif", fontSize: 12, color: "#6B7280", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {booking.visit_notes || "—"}
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", padding: "4px 10px", borderRadius: 20, background: sc.bg, color: sc.color }}>
                          {booking.status}
                        </span>
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          {booking.status === "pending" && (
                            <button
                              onClick={() => handleUpdateBookingStatus(booking.id, "confirmed")}
                              title="Confirm Visit"
                              style={{ padding: "6px", background: "#DBEAFE", border: "none", borderRadius: 7, cursor: "pointer", color: "#2563EB" }}
                            >
                              <Check size={14} />
                            </button>
                          )}
                          {booking.status !== "completed" && booking.status !== "cancelled" && (
                            <>
                              <button
                                onClick={() => handleUpdateBookingStatus(booking.id, "completed")}
                                title="Mark Completed"
                                style={{ padding: "6px", background: "#D1FAE5", border: "none", borderRadius: 7, cursor: "pointer", color: "#059669" }}
                              >
                                <CheckCircle size={14} />
                              </button>
                              <button
                                onClick={() => handleUpdateBookingStatus(booking.id, "cancelled")}
                                title="Cancel"
                                style={{ padding: "6px", background: "#FEE2E2", border: "none", borderRadius: 7, cursor: "pointer", color: "#DC2626" }}
                              >
                                <X size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
