/**
 * Gatepath Realtors — Meetings & Calls (retired, Phase 2 Slice 1)
 * Merged into admin.bookings.tsx ("Site Visits") — both screens rendered
 * the same `bookings` table in two shapes, and this one's Reschedule/
 * Complete buttons had no onClick handler at all. Kept as a redirect stub
 * so any bookmarked or typed /admin/meetings link still lands somewhere
 * real instead of 404ing.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/meetings")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/bookings" });
  },
});
