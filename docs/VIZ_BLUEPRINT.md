# Gatepath CRM — Visualization Blueprint

The visualization companion to `docs/CRM_GAP_ANALYSIS.md`. Twelve screen designs were generated in Figma Make (exported as full React source, not PNGs — see `design-refs/figma-make/`); they establish layout/structure/interaction patterns but are shallow on charts, graphs, and data visualization (confirmed: the export has no charting library at all — every "chart" in it is a hand-drawn `<div>` meter bar). Per the user: **the gap analysis and this blueprint are the authority for how data is shown — the Figma reference is layout/structure only.** The goal: every tab lets a user understand how things are performing at a glance, with real charts, live status, and clear visual hierarchy — never boring static tables alone.

Constraints that don't change: the existing workflow and business logic stay intact; security/auth/RLS/payment-write logic is untouched unless a risk is flagged. KES is the base currency; USD/GBP/EUR shown for diaspora. Next phase after this is n8n automation, so the data/event structure stays automation-ready.

**Note on the reference material**: the original brief assumed a Figma-MCP-read-cap-constrained PNG workflow (`/design-refs/*.png`, Appendix A below). What's actually in the repo is better than that — two full Figma Make React exports (confirmed identical, `design-refs/figma-make/` and `design-refs/Billion Dollar Project Strategy/`) with real component structure, not flat images. No Figma MCP calls were needed to read them; Appendix A's read-cap strategy is moot as a result, though its underlying instinct (be economical with MCP reads) still stands for any future live Figma file.

[ROLE] Act as a senior dashboard / data-visualization engineer who has shipped real-estate and financial operations consoles, fluent in React data-viz (Recharts, ECharts, visx), Supabase Realtime, and design systems. No bluffs: if a metric has no data source yet, say so and propose the schema — don't fake a chart.

## Phases, in order

**Phase 0 — Ingest (read-only, no code):** Read the gap analysis and this file. Read the Figma reference. For each tab, produce `/docs/VIZ_SPEC.md`: list every KPI and chart planned, its exact data source (table/column/query), and flag any metric with no backing data yet + the schema needed. This is the KPI dictionary. **Stop for approval.**

**Phase 1 — Visualization language + design system:** Implement the shared viz system: KPI stat card (with trend delta), chart wrappers, gauge, status pill, data grid, skeleton loaders, empty states, and a "last updated" freshness stamp. Install and configure the chart stack (Appendix B). Define color-encoding rules once so every chart is consistent.

**Phase 2 — Build tab by tab (one tab per slice, commit each):** For each tab, implement the per-tab blueprint (Appendix C): primary KPI row, core visualizations, drill-downs, real-time elements. Apply the hierarchy rules every time: most decision-critical number top-left and largest; 5–9 metrics per screen; detail on drill-down, not crammed in.

**Phase 3 — Make it live and interactive:** Wire Supabase Realtime so key numbers and the plot-map status update live. Add drill-downs (click a KPI → filtered detail view) with breadcrumbs, filters, date-range controls. Verify mobile responsiveness and WCAG AA contrast.

[FORMAT] Branch `redesign/ecosystem-v2` only. Plan Mode before each tab; show plan + diff. Commit per tab with a clear message; log changes in `/docs/CHANGELOG_REDESIGN.md`. Desktop-first but responsive down to mobile.

[TONE] Precise, technical, honest about data gaps. Preserve workflow. Flag any change that touches security or integrity.

---

## Appendix A — Figma read-cap strategy (as originally written; superseded, see note above)

Figma Starter plan allows only 6 MCP read tool calls per month, and the generated screens are shallow on viz — so don't spend reads pixel-pulling all 12.

1. Export each of the 12 frames as PNG into the repo at `/design-refs/` (e.g. `01-dashboard.png` … `12-settings.png`). Claude Code reads local images for free — no MCP cost.
2. Use one Figma MCP pass to extract the design tokens (exact colors, type, spacing) from a single representative frame, to lock the theme. That's it for MCP this month.
3. From then on, design from the PNG layout refs + the tokens + this blueprint. Figma = structure; blueprint = data-viz truth.

*(In practice the repo has the full Figma Make React export instead of PNGs, which was read directly — no MCP reads spent.)*

## Appendix B — Visualization language (design rules, applied everywhere)

**Hierarchy (decision-first):** outcomes at top, drivers in the middle, diagnostic detail at the bottom. The single most decision-critical number goes where the eye lands first (top-left), largest, with a gold accent. Limit each screen to 5–9 headline metrics; push the rest to drill-down (Stripe/Linear pattern: calm KPI row on top, detail on demand).

**Match chart to question:**
- Comparison across categories → bar (Recharts)
- Trend over time → line / area (Recharts)
- Single value vs target → gauge / progress ring (ECharts)
- Part-to-whole → donut, used sparingly (Recharts)
- Status across many items → grid / heatmap (custom SVG or ECharts) — e.g. the plot map
- Dense tabular data → data grid with sort/filter/paginate (TanStack Table)
- Distribution → histogram (Recharts/ECharts)

**Consistency & clarity:** same chart style when drilling from summary → detail; breadcrumb navigation to show depth; trend deltas as ▲/▼ with color (green up / red down, never color-only — pair with icon/label for accessibility); restrained color — brand palette only, gold reserved for the priority number.

**Trust & liveness:** Supabase Realtime on operational numbers; a visible "Updated HH:MM" stamp on each dashboard; skeleton loaders while data loads; explicit empty states (never a blank card).

**Feel:** Framer Motion micro-interactions on card hover, number count-up, and transitions. Never sacrifice readability for animation.

**Library stack:** Recharts v3 (workhorse), Apache ECharts (gauges, heatmaps, big-data/showpiece), custom SVG (plot-map status grid, reuse existing masterplan SVG), TanStack Table (grids), dnd-kit (drag-drop), Framer Motion (motion), shadcn/ui (shell). Avoid Tremor (fights brand colors).

**Data discipline:** every metric needs a documented formula + source in the KPI dictionary before it gets a chart. No source → no chart; propose the schema instead.

## Appendix C — Per-tab visualization blueprint

Format per tab: KPI row → core visuals (type · library) → drill-down → live.

**Dashboard (Home)** — KPIs: Sales this month (KES), Collection rate %, Plots available (x booked · y sold), Overdue installments, Active leads, Site visits today. Visuals: Revenue forecast vs collected (area · Recharts); Plot-map status grid available/booked/sold (SVG); Lead funnel snapshot (funnel · ECharts); Agent leaderboard mini (table · TanStack); Urgent Task Escalations feed (cards); Recent inquiries. Drill-down: click any KPI → its full tab, pre-filtered. Live: sales, availability, escalations via Realtime; "Updated" stamp.

**Leads** — KPIs: New today, Unassigned, Avg speed-to-lead, Conversion %, Hot leads. Visuals: Lead funnel by stage (funnel · ECharts); Leads by source (bar · Recharts); Speed-to-lead vs SLA (gauge · ECharts); Leads over time (line · Recharts); Score distribution (histogram). Drill-down: source → lead list; funnel stage → those leads. Live: new-lead ticks + SLA-breach flags.

**Agent Performance** — KPIs: Team conversion %, Avg response time, Total activities, Revenue contribution. Visuals: Leaderboard with sparklines (TanStack + Recharts); Composite score per agent (radar or progress ring · ECharts); Activity heatmap calls/visits by day (heatmap · ECharts); Goal vs actual (progress rings); Response-time distribution. Drill-down: agent → their leads, visits, deals, activity log. Live: activity counters; idle-agent flags.

**Contacts** — KPIs: Total contacts, Active segments, Engaged (30d), Opt-in %. Visuals: Segment split (donut); Lifecycle funnel; Engagement heatmap; Interaction timeline (per contact). Drill-down: segment → contact list; contact → full timeline. Live: last-interaction updates.

**Closed Deals** — KPIs: Deals closed, Total value, Avg time-to-close, Win rate. Visuals: Pipeline value by stage (bar/funnel); Win/loss (donut); Revenue by phase/location (bar, optional map); Deals over time (line); Commission summary (table). Drill-down: stage/phase → deal list; deal → 13-stage timeline. Live: stage-change updates.

**Installments** — KPIs: Total outstanding (KES), Due this month, Collection rate %, Overdue count. Visuals: Collection-rate gauge (ECharts); Outstanding vs collected (stacked bar); Aging buckets 0–30/30–60/60–90/90+ (bar); Multi-currency split KES/USD/GBP/EUR (donut); Cashflow forecast (line); Payment ledger with status pills (TanStack). Drill-down: aging bucket → those clients; client → payment history. Live: payment-confirmed updates; grace-period countdowns.

**Inquiries Queue** — KPIs: Open, Avg response time, SLA compliance %, Converted-to-lead %. Visuals: Volume by channel (bar); SLA compliance (gauge); Response-time trend (line); Open vs closed (donut). Drill-down: channel → inquiries; inquiry → conversation. Live: new-inquiry ticks; SLA timers.

**Site Visits** — KPIs: Scheduled today, Completed, No-shows, Post-visit conversion %. Visuals: Calendar with density; Status split scheduled/completed/no-show (donut); Visit locations (map · GPS pins); Agent visit load (bar); Feedback-pending alerts (cards). Drill-down: day/agent → visit list; visit → feedback + linked lead. Live: GPS check-ins; in-progress status.

**Plot Inventory** — KPIs: Total plots, Available, Booked, Sold, Absorption rate. Visuals: Plot-map status grid per phase (SVG — the hero viz); Inventory funnel x-of-y sold per phase (bar); Sales velocity/absorption over time (line); Price distribution (histogram); Demand by location (heatmap/map); Days-on-market. Drill-down: plot → detail page; phase → its plots. Live: status changes push to grid and the public site map.

**Campaigns & Content** — KPIs: Active campaigns, Leads generated, Cost-per-lead, Content published. Visuals: Campaign ROI source→lead→close attribution (funnel/bar); Content performance views/leads per post (bar); Hot-picks performance; A/B results; Publish calendar. Plus CMS controls: manage all public-site content (gap analysis Part 3). Drill-down: campaign → attributed leads/deals; post → its leads. Live: publish status; new attributed leads.

**Staff Accounts** — KPIs: Active staff, Roles, Recent logins, Pending invites. Visuals: Role distribution (donut); Login/activity audit timeline; Permission matrix (grid). Drill-down: user → their audit trail + owned records. Live: login events; access-change alerts.

**Settings** — Mostly config, minimal charting. Include: integration status indicators (Paystack, Africa's Talking, Resend, n8n, WhatsApp, Meta — green/red health dots); audit-log viewer (TanStack); scheduled-backup + FX-refresh status; pipeline/stage and template editors.

## Appendix D — Guardrails (do not violate)

Payments only via server-side verified paths with the service role; HMAC-verified, idempotent webhooks (see `docs/CRM_STATE_AUDIT.md` §5 — no true webhook exists yet, this is a real build item); atomic plot reservation; server-authoritative, audit-logged pipeline stages; RLS-scoped PII; signed/expiring PDF URLs; rate-limited public endpoints; RBAC-ready roles; design commits separate from logic commits.

## Phasing / credit discipline

Phase 0 (read-only, cheap) → approve → Phase 1 (design system) → Phase 2 one tab per slice, commit each → Phase 3 realtime + drill-downs. Plan Mode before each tab. Use the dev-server + live-fetch verification loop already established this session as the review mechanism.

## Next phase (not now)

After all tabs are wired and live, move to n8n automation.
