import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

/** VIZ_BLUEPRINT Appendix B: "explicit empty states (never a blank card)." */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-4">
      <div className="p-3 rounded-full bg-surface-container-low text-on-surface-variant mb-3">
        <Icon size={22} />
      </div>
      <p className="text-sm font-semibold text-on-surface">{title}</p>
      {description && (
        <p className="text-xs text-on-surface-variant mt-1 max-w-xs">{description}</p>
      )}
    </div>
  );
}
