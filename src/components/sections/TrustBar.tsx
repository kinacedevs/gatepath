import { useEffect, useMemo, useRef, useState } from "react";
import { usePhases } from "@/lib/phases";
import { supabase } from "@/lib/supabase";

type TrustStat =
  | {
      kind: "counted";
      value: number;
      suffix: string;
      label: string;
      prefix?: string;
      isYear?: boolean;
    }
  | { kind: "raw"; display: string; label: string };

const DEFAULT_TRUSTED_SINCE_YEAR = 2020;
const DEFAULT_CLIENT_SATISFACTION_LABEL = "5★";

function useCountUp(target: number, start: boolean, duration = 1600) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - t0) / duration, 1);
      setVal(Math.floor(p * target));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setVal(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [start, target, duration]);
  return val;
}

function Stat({ s, visible }: { s: TrustStat; visible: boolean }) {
  // Counted stats always call the hook (rules of hooks); raw stats just
  // ignore the result and render their display string directly.
  const n = useCountUp(
    s.kind === "counted" ? s.value : 0,
    visible,
    s.kind === "counted" && s.isYear ? 1200 : 1600,
  );
  return (
    <div className="text-center px-6">
      <div className="font-numbers font-bold text-[28px] md:text-[32px] text-accent">
        {s.kind === "counted" ? (
          <>
            {s.prefix ?? ""}
            {n}
            {s.suffix}
          </>
        ) : (
          s.display
        )}
      </div>
      <div className="mt-2 font-sans text-[12px] md:text-[13px] tracking-[0.1em] uppercase text-white/85">
        {s.label}
      </div>
    </div>
  );
}

/**
 * "Plots Sold" and "Prime Locations" were hardcoded constants that never
 * reflected real inventory — the same trust problem PropertyPreview.tsx's
 * own header comment already describes fixing for itself, but never fixed
 * here (Part 3, Slice C). Now real, live sums from usePhases(). "Trusted
 * Since" and "Client Satisfaction" aren't derivable from any table, so
 * they're admin-editable via the site_banners "trust_bar_stats" row
 * (Campaigns & Content → Homepage Content), falling back to today's
 * hardcoded values if unset. "Title Deed Verified" stays a static 100% —
 * a real company policy statement, not a variable count.
 */
export function TrustBar() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const { phases } = usePhases();
  const [trustedSinceYear, setTrustedSinceYear] = useState(DEFAULT_TRUSTED_SINCE_YEAR);
  const [clientSatisfactionLabel, setClientSatisfactionLabel] = useState(
    DEFAULT_CLIENT_SATISFACTION_LABEL,
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setVisible(true)),
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const fetchTrustBarStats = async () => {
      try {
        const { data } = await (supabase as any)
          .from("site_banners")
          .select("data")
          .eq("id", "trust_bar_stats")
          .maybeSingle();
        // Only override if a real CEO-set value exists — otherwise keep the
        // defaults already showing, no flash-to-nothing.
        if (data?.data?.trusted_since_year) {
          setTrustedSinceYear(Number(data.data.trusted_since_year));
        }
        if (typeof data?.data?.client_satisfaction_label === "string") {
          const label = data.data.client_satisfaction_label.trim();
          if (label) setClientSatisfactionLabel(label);
        }
      } catch {
        // Defaults are already showing — nothing to do.
      }
    };
    fetchTrustBarStats();
  }, []);

  const stats: TrustStat[] = useMemo(
    () => [
      {
        kind: "counted",
        value: phases.reduce((sum, p) => sum + p.sold, 0),
        suffix: "+",
        label: "Plots Sold",
      },
      { kind: "counted", value: phases.length, suffix: "+", label: "Prime Locations" },
      { kind: "counted", value: 100, suffix: "%", label: "Title Deed Verified" },
      { kind: "raw", display: clientSatisfactionLabel, label: "Client Satisfaction" },
      {
        kind: "counted",
        value: trustedSinceYear,
        suffix: "",
        label: "Trusted Since",
        prefix: "Since ",
        isYear: true,
      },
    ],
    [phases, clientSatisfactionLabel, trustedSinceYear],
  );

  return (
    <section id="trust" ref={ref} className="bg-primary">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 py-7">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-y-6 md:divide-x md:divide-accent/30">
          {stats.map((s) => (
            <Stat key={s.label} s={s} visible={visible} />
          ))}
        </div>
      </div>
    </section>
  );
}
