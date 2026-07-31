/**
 * Gatepath Realtors — Admin chart color encoding (VIZ_BLUEPRINT Appendix B)
 *
 * "Restrained color — brand palette only, gold reserved for the priority
 * number." One place charts read colors from, so every chart in the admin
 * console stays visually consistent instead of each component picking its
 * own palette. Reads CSS custom properties at call time (same pattern as
 * Gauge.tsx) — never hardcode a hex value in a chart component.
 */

function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

export function getChartTheme() {
  return {
    primary: cssVar("--primary", "#0B7FC7"), // cerulean — the default series color
    primaryDeep: cssVar("--primary-deep", "#074B7D"),
    accent: cssVar("--accent", "#E8A020"), // gold — reserved for the single priority series/value
    success: cssVar("--available", "#22c55e"),
    warning: cssVar("--booked", "#f59e0b"),
    error: cssVar("--destructive", "#ef4444"),
    grid: cssVar("--border", "#DCE4EC"),
    text: cssVar("--muted-foreground", "#5A5A5A"),
  };
}

/** Ordered palette for multi-series/multi-slice charts (bar categories, donut
 * slices) — cycles through brand-derived colors before ever repeating. */
export function getChartPalette(): string[] {
  const t = getChartTheme();
  return [t.primary, t.accent, t.success, t.primaryDeep, t.warning, t.error];
}
