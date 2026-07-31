import type { LucideIcon } from "lucide-react";
import { AlertTriangle, AlertOctagon } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * The "anti-laziness" urgent-task card (e.g. "Lead stagnant 52h — Reassign").
 * Presentational only — no real staleness-detection query wires into this
 * yet, since that needs an interaction-log table that doesn't exist until
 * the pipeline/omnichannel schema work lands. Screens that mount this today
 * should derive `title`/`description` from data the schema already has
 * (e.g. bookings with no status change in 48h), not invent numbers.
 */
export function EscalationCard({
  title,
  description,
  urgency = "warning",
  actionLabel,
  onAction,
  icon: Icon,
}: {
  title: string;
  description: string;
  urgency?: "warning" | "error";
  actionLabel: string;
  onAction: () => void;
  icon?: LucideIcon;
}) {
  const ToneIcon = Icon ?? (urgency === "error" ? AlertOctagon : AlertTriangle);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex items-start gap-3 rounded-lg border p-4",
        urgency === "error"
          ? "bg-error/5 border-error/30"
          : "bg-warning-container/10 border-warning-container/40",
      )}
    >
      <div
        className={cn(
          "shrink-0 p-2 rounded-lg",
          urgency === "error"
            ? "bg-error/15 text-error"
            : "bg-warning-container/20 text-on-warning-container",
        )}
      >
        <ToneIcon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-label-md text-[13px] font-bold text-on-surface">{title}</p>
        <p className="text-xs text-on-surface-variant mt-0.5">{description}</p>
      </div>
      <button
        onClick={onAction}
        className={cn(
          "shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-bold whitespace-nowrap transition-colors",
          urgency === "error"
            ? "bg-error text-white hover:opacity-90"
            : "bg-warning-container text-on-warning-container hover:opacity-90",
        )}
      >
        {actionLabel}
      </button>
    </motion.div>
  );
}
