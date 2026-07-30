import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
  {
    variants: {
      tone: {
        success: "bg-success-container/15 text-on-success-container",
        warning: "bg-warning-container/15 text-on-warning-container",
        error: "bg-error/15 text-error",
        info: "bg-info-container/15 text-on-info-container",
        neutral: "bg-surface-container-high text-on-surface-variant",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  },
);

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {}

export function StatusBadge({ tone, className, children, ...props }: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ tone }), className)} {...props}>
      {children}
    </span>
  );
}

/** Tone mapping for `inquiries.status` — the only table Phase 5A's Kanban touches. */
export const INQUIRY_STATUS_TONE = {
  pending: "neutral",
  reviewed: "info",
  approved: "success",
  rejected: "error",
} as const;
