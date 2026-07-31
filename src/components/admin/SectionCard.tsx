import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Formalizes the `luxury-card` pattern (styles.css:314) already repeated
 * ad hoc across admin.installments.tsx, admin.contacts.tsx, etc. — same
 * markup, now one component instead of a copy-pasted div.
 */
export function SectionCard({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("luxury-card rounded-xl bg-card overflow-hidden", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/30">
          {title && <h3 className="font-headline-md text-sm text-primary font-bold">{title}</h3>}
          {action}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}
