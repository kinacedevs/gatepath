import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  icon: Icon,
  delta,
  tone = "default",
  sublabel,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  delta?: string;
  tone?: "default" | "warning" | "success";
  sublabel?: string;
}) {
  const isNegativeDelta = delta?.trim().startsWith("-");
  const DeltaIcon = isNegativeDelta ? TrendingDown : TrendingUp;

  return (
    <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-6 relative overflow-hidden">
      <div className="flex justify-between items-start mb-4">
        <div
          className={cn(
            "p-2.5 rounded-lg",
            tone === "warning" && "bg-warning-container/15 text-on-warning-container",
            tone === "success" && "bg-success-container/15 text-on-success-container",
            tone === "default" && "bg-primary-container/10 text-primary-container",
          )}
        >
          <Icon size={20} />
        </div>
        {delta && (
          <span
            className={cn(
              "flex items-center gap-1 text-[12px] font-bold px-2 py-0.5 rounded",
              isNegativeDelta
                ? "bg-error/10 text-error"
                : "bg-success-container/10 text-on-success-container",
            )}
          >
            <DeltaIcon size={14} /> {delta}
          </span>
        )}
      </div>
      <p className="font-label-md text-on-surface-variant uppercase tracking-wider mb-1">{label}</p>
      <h3 className="font-stat-lg text-stat-lg text-primary-container">{value}</h3>
      {sublabel && <p className="text-xs text-on-surface-variant mt-2 font-medium">{sublabel}</p>}
    </div>
  );
}
