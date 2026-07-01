import { type ReactNode } from "react";
import { useScrollFade } from "@/hooks/use-scroll-fade";

export function Reveal({
  children,
  className = "",
  as: As = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "header" | "article";
}) {
  const ref = useScrollFade<HTMLDivElement>();
  return (
    <As ref={ref as never} className={className}>
      {children}
    </As>
  );
}
