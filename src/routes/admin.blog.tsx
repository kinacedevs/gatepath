/**
 * Gatepath Realtors — Blog Manager (retired, Phase 2 Slice 9)
 * Folded into admin.campaigns.tsx's "Blog Posts" tab — this screen's CRUD
 * logic was real and working but unreachable, since AdminShell's nav has
 * pointed "Campaigns & Blog" at /admin/campaigns since Phase 5A. Kept as a
 * redirect stub so any bookmarked or typed /admin/blog link still lands
 * somewhere real instead of 404ing.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/blog")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/campaigns" });
  },
});
