import { RefreshCw } from "lucide-react";

/** VIZ_BLUEPRINT Appendix B: "a visible 'Updated HH:MM' stamp on each dashboard." */
export function FreshnessStamp({ updatedAt }: { updatedAt: Date | null }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-on-surface-variant">
      <RefreshCw size={11} />
      {updatedAt
        ? `Updated ${updatedAt.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}`
        : "Loading…"}
    </span>
  );
}
