import { useEffect, useRef, useState } from "react";

const stats = [
  { value: 500, suffix: "+", label: "Plots Sold" },
  { value: 12, suffix: "+", label: "Prime Locations" },
  { value: 100, suffix: "%", label: "Title Deed Verified" },
  { value: 5, suffix: "★", label: "Client Satisfaction" },
  { value: 2018, suffix: "", label: "Trusted Since", prefix: "Since " },
];

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

function Stat({ s, visible }: { s: (typeof stats)[number]; visible: boolean }) {
  const isYear = s.value === 2018;
  const n = useCountUp(s.value, visible, isYear ? 1200 : 1600);
  return (
    <div className="text-center px-6">
      <div className="font-numbers font-bold text-[28px] md:text-[32px] text-accent">
        {s.prefix ?? ""}
        {n}
        {s.suffix}
      </div>
      <div className="mt-2 font-sans text-[12px] md:text-[13px] tracking-[0.1em] uppercase text-white/85">
        {s.label}
      </div>
    </div>
  );
}

export function TrustBar() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
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
