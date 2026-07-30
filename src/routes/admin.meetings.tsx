/**
 * Gatepath Realtors — Meetings & Calls (Phase 5A mechanical split)
 * Relocated verbatim from the old "meetings" tab (admin.tsx, previously
 * ~2388-2435). Same JSX, same inline styles, same NAVY hex — copied as-is,
 * not redesigned. The one real change: this tab's own scoped fetch
 * (bookings + inquiries, cross-referenced) replaces the old shared 9-table
 * Promise.all.
 *
 * The Reschedule/Complete buttons have no onClick handlers in the original —
 * left exactly as non-functional, no handlers added.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, MapPin, Calendar } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Booking, Inquiry } from "@/lib/types";

export const Route = createFileRoute("/admin/meetings")({
  component: MeetingsAndCalls,
});

const NAVY = "#0C1A30";
const GOLD = "var(--accent)";
const GOLD_DARK = "var(--accent-dark)";
const CANVAS = "var(--stone)";
const CARD_BORDER = "#E5E0D8";

function MeetingsAndCalls() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  const loadData = async () => {
    setDataLoading(true);
    try {
      const [bookingsRes, inquiriesRes] = await Promise.all([
        supabase.from("bookings").select("*").order("created_at", { ascending: false }),
        supabase.from("inquiries").select("*"),
      ]);

      setBookings((bookingsRes.data as Booking[]) ?? []);
      setInquiries((inquiriesRes.data as Inquiry[]) ?? []);
    } catch (err) {
      console.error("Error loading meetings data:", err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  void dataLoading;

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 700, fontSize: 24, color: NAVY, margin: 0 }}>Meetings & Calls</h1>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280", marginTop: 4 }}>
          Upcoming physical site visits and virtual tour bookings.
        </p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
        {bookings.map(booking => {
          const inquiry = inquiries.find(i => i.id === booking.inquiry_id);
          return (
            <div key={booking.id} style={{ background: "#fff", borderRadius: 14, border: `1px solid ${CARD_BORDER}`, padding: 20, boxShadow: "0 2px 12px rgba(12,26,48,0.05)", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 4, background: booking.visit_type === "virtual" ? "#8B5CF6" : GOLD }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    {booking.visit_type === "virtual" ? <Activity size={14} color="#8B5CF6" /> : <MapPin size={14} color={GOLD} />}
                    <span style={{ fontFamily: "Montserrat, sans-serif", fontSize: 11, fontWeight: 700, color: booking.visit_type === "virtual" ? "#8B5CF6" : GOLD_DARK, textTransform: "uppercase" }}>
                      {booking.visit_type} Visit
                    </span>
                  </div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 16, color: NAVY }}>{inquiry?.client_full_name || "Unknown Client"}</div>
                </div>
                <div style={{ padding: "4px 10px", borderRadius: 6, background: booking.status === "confirmed" ? "#D1FAE5" : CANVAS, color: booking.status === "confirmed" ? "#059669" : "#6B7280", fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, textTransform: "capitalize" }}>
                  {booking.status}
                </div>
              </div>
              <div style={{ background: CANVAS, borderRadius: 8, padding: 12, marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontFamily: "Inter, sans-serif", fontSize: 13, color: NAVY }}>
                  <Calendar size={14} color="#6B7280" /> <span style={{ fontWeight: 600 }}>{new Date(booking.visit_date || "").toLocaleDateString()}</span> ({booking.visit_time})
                </div>
                {booking.visit_type === "physical" && booking.pickup_location && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontFamily: "Inter, sans-serif", fontSize: 13, color: "#6B7280" }}>
                    <MapPin size={14} color="#6B7280" style={{ marginTop: 2 }} /> <span>Pickup: {booking.pickup_location}</span>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ flex: 1, padding: "8px 0", border: `1px solid ${CARD_BORDER}`, borderRadius: 8, background: "#fff", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: NAVY }}>Reschedule</button>
                <button style={{ flex: 1, padding: "8px 0", border: "none", borderRadius: 8, background: NAVY, fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: "#fff" }}>Complete</button>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
