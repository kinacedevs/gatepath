# Gatepath Realtors — Admin Design System

Companion to `CLAUDE.md`'s brand law, scoped to `/admin`. **Law, not a suggestion**: a token change here must propagate to every admin screen without touching component code, exactly like the public-site brand tokens.

## The one decision this document exists to record

A benchmark brief proposed a dark, near-black admin console (`#041A2E`/`#05233B` background, Deep Navy as elevated surface). That was evaluated and **explicitly rejected** — see `docs/CRM_STATE_AUDIT.md` §7 and §10.1. It directly reversed `CLAUDE.md`'s written brand law (Deep Navy is depth/accents only, never the dominant surface; Ivory is the page background) — the same rule that exists *because* a prior session found and removed an off-brand dark Stitch palette for causing exactly this drift.

**Decision: admin stays on the same light, warm palette as the public site.** Later benchmark mockups (dark CRM dashboards, agent-tracker UIs, etc.) are mined for structural ideas — information density, card layouts, escalation patterns — never for their color scheme. If a future session is asked to "make admin dark" again, that is the same question, already answered: no, unless a human explicitly overrides this document and `CLAUDE.md` together in the same change.

## Tokens

Admin uses the exact same CSS custom properties as the public site (`src/styles.css:56-114`), plus one additional semantic layer (`src/styles.css:225-307`) that maps Material-3-style names to those same brand variables — this is what lets `admin.tsx`/`AdminShell`/redesigned screens use classes like `bg-primary-container` and `text-on-surface-variant` while still resolving to real brand hex, not a second palette:

| Semantic class | Resolves to | Role |
|---|---|---|
| `bg-surface` / `text-on-surface` | Ivory `#F8F4EE` / Charcoal | Page background / body text |
| `bg-primary-container` | Deep Navy `#074B7D` | High-emphasis surfaces (KPI value text, sidebar) |
| `bg-secondary-container` | Warm Gold `#E8A020` | Accent surfaces, active nav state |
| `bg-success-container` / `on-success-container` | `#22c55e` (`--available`) | Paid, active, verified |
| `bg-warning-container` / `on-warning-container` | `#f59e0b` (`--booked`) | Overdue, pending, escalation (warning tier) |
| `bg-error` | `#ef4444` (`--destructive`) | Rejected, failed, escalation (critical tier) |
| `bg-info-container` | Cerulean `#0B7FC7` | Informational, links, in-progress |

**Never write a hex literal in a new admin component.** If a needed shade doesn't exist as a token, add it to `styles.css`'s existing `@theme inline` block, derived from an existing brand variable — the same rule `CLAUDE.md` already states for the public site.

Typography is unchanged: Cormorant Garamond / Playfair Display (headings), Inter (body/UI), Montserrat (stats/prices) — already wired via `--font-serif`/`--font-display`/`--font-sans`/`--font-numbers`.

## Component kit (`src/components/admin/`)

Reuse these. Do not hand-roll a card, table, or badge in a new screen — that's exactly the inconsistency `docs/CRM_STATE_AUDIT.md` §2 documented (7 of 16 screens still on pre-rebuild inline-style legacy).

| Component | Use for | Notes |
|---|---|---|
| `KpiCard` | Any stat block with a value + optional trend delta | Already built, Phase 5A |
| `StatusBadge` | Any status pill | `cva` tone variants (`success/warning/error/info/neutral`); add new tone-map constants per table (like `INQUIRY_STATUS_TONE`) rather than new component variants |
| `AdminShell` | The nav chrome | Already built, Phase 5A — do not rebuild the sidebar per screen |
| `SectionCard` | Any bordered panel with an optional header + action | Formalizes the repeated `luxury-card` div pattern |
| `EscalationCard` | Urgent/stalled-work call-to-action | **Presentational only** — wire real staleness queries only once the underlying data exists (interaction log, stage timestamps); don't fabricate numbers to fill the card |
| `Gauge` | Single-metric radial progress (e.g. collection rate) | Wraps Apache ECharts, themed from CSS custom properties at render time — never hardcode gauge colors |
| `AdminDataTable` | Any sortable/paginatable grid | Wraps `@tanstack/react-table`; pass `columns`/`data`, don't reimplement `useReactTable` per screen |
| `charts/TrendChart` | Trend over time (line/area) | Wraps Recharts `AreaChart` |
| `charts/CategoryBarChart` | Comparison across categories | Wraps Recharts `BarChart`; `horizontal` prop for ranked lists |
| `charts/SplitDonutChart` | Part-to-whole, used sparingly | Wraps Recharts `PieChart` |
| `EmptyState` | Any zero-data card body | Never leave a card blank — VIZ_BLUEPRINT rule |
| `FreshnessStamp` | "Updated HH:MM" on any live/Realtime-backed panel | |
| `ui/skeleton` (shadcn, already installed) | Loading state for any of the above | Don't build a new loader — `<Skeleton className="h-24 rounded-xl" />` etc. |

## Chart color encoding (VIZ_BLUEPRINT Appendix B, defined once here)

All three chart wrappers read from `src/lib/chartTheme.ts`'s `getChartTheme()`/`getChartPalette()` — never pass a hardcoded hex into a chart. Rule: **gold (`--accent`) is reserved for the single priority series/value on a screen** (the one number decision-makers care about most); every other series/category cycles the rest of the palette in this fixed order: cerulean → gold → success green → deep navy → warning amber → error red. Match chart type to the question being asked (comparison → bar, trend → line/area, single value vs. target → `Gauge`, part-to-whole → donut used sparingly, status-across-many → the plot-map SVG grid, dense tabular → `AdminDataTable`) — don't reach for a donut or bar chart interchangeably just for visual variety.

## New dependencies this phase

- `framer-motion` — micro-interactions (hover lift, escalation pulse). Nothing here should ship as the *only* way to perceive a state change — motion is decoration, not signal.
- `echarts` + `echarts-for-react` — the showpiece visualizations (gauges, future density/heatmap views) that `recharts` (already installed, already used for nothing — see audit §9) isn't the right tool for. `recharts` stays the answer for simple trend/area charts; `echarts` is for the richer, custom-themed pieces.

## What this phase did not do

No screen was redesigned (that's the next phase, one screen at a time with its own plan). No schema changed. No `CLAUDE.md` edit — the palette question above resolved as "no change," so the existing brand law stands untouched.
