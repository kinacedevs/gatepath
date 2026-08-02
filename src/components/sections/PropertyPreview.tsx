import { ArrowRight, Flame, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { PhaseCard } from "@/components/properties/PhaseCard";
import { usePhases } from "@/lib/phases";

/**
 * Was entirely hardcoded fake data — 3 made-up properties with fabricated
 * availability counts and generic stock photos, never touching the real
 * phases table. On a site handling real money, showing a fake "12 plots
 * available" when the live count could be anything (including zero) is a
 * genuine trust problem, not just a content gap. Now pulls real data via
 * the same usePhases() hook every other property listing uses.
 *
 * Hot Picks selection (Part 3, Slice B): CEO/manager can manually feature
 * specific phases (order + optional expiry + custom badge) from Campaigns
 * & Content. If none are currently active, this falls back to the original
 * real-scarcity automatic selection — active phases with the lowest
 * available/total ratio, i.e. genuinely selling fastest right now — so the
 * section is never empty and never fabricated.
 */
export function PropertyPreview() {
  const { phases, loading } = usePhases();

  const now = new Date();
  const manualPicks = [...phases]
    .filter((p) => p.isHotPick && (!p.hotPickExpiresAt || new Date(p.hotPickExpiresAt) > now))
    .sort((a, b) => (a.hotPickOrder ?? 0) - (b.hotPickOrder ?? 0))
    .slice(0, 3);

  const isManualSelection = manualPicks.length > 0;
  const hotPicks = isManualSelection
    ? manualPicks
    : [...phases]
        .filter((p) => p.status === "ACTIVE" && p.totalPlots > 0)
        .sort((a, b) => a.available / a.totalPlots - b.available / b.totalPlots)
        .slice(0, 3);

  return (
    <section className="bg-ivory py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 space-y-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.25em] text-accent">
              <Flame size={14} /> Hot Picks This Week
            </span>
            <h2 className="font-serif font-bold text-4xl sm:text-5xl text-primary-deep">
              Selling fastest right now.
            </h2>
          </div>
          <Link
            to="/properties"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-deep transition-colors"
          >
            View all {phases.length || ""} projects <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
            <Loader2 className="animate-spin text-accent mb-3" size={36} />
            <p className="text-sm text-slate-500">Loading live availability...</p>
          </div>
        ) : hotPicks.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
            <p className="text-sm text-slate-500">No active phases available right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {hotPicks.map((phase, i) => (
              <div key={phase.slug} className="relative">
                {isManualSelection ? (
                  <span className="absolute -top-3 left-6 z-10 inline-flex items-center gap-1.5 bg-accent text-white text-[11px] font-bold px-3.5 py-1.5 rounded-full uppercase tracking-wider shadow-lg">
                    <Flame size={12} /> {phase.hotPickBadgeText || "Featured"}
                  </span>
                ) : (
                  i === 0 && (
                    <span className="absolute -top-3 left-6 z-10 inline-flex items-center gap-1.5 bg-accent text-white text-[11px] font-bold px-3.5 py-1.5 rounded-full uppercase tracking-wider shadow-lg">
                      <Flame size={12} /> Hottest Pick
                    </span>
                  )
                )}
                <PhaseCard phase={phase} />
                <p className="mt-3 text-center text-[12px] font-semibold text-destructive">
                  Only {phase.available} of {phase.totalPlots} plots left
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
