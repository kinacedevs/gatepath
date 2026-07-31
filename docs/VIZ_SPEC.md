# Gatepath CRM — Visualization Spec (KPI Dictionary)

Phase 0 deliverable per `docs/VIZ_BLUEPRINT.md`. Read-only research — no code changes. For every KPI/chart named in the blueprint's Appendix C, this document states the exact real data source and marks it **✅ Ready** (buildable today against the live schema), **🟡 Partial** (buildable as a real but coarser/approximate version today), or **🔴 Needs schema** (no backing data exists — schema proposed). No fabricated charts: anything 🔴 gets a proposed column/table, not a fake number.

Cross-checked against `docs/CRM_STATE_AUDIT.md` (the ground-truth schema/route audit) and the Figma Make reference (`design-refs/figma-make/`, read in full — see finding below).

## Headline finding: the reference design's hardest workflow is already real

`design-refs/figma-make/src/pages/InquiriesQueue.tsx` independently arrived at a two-document, payment-gated `DocGate` pattern — an "Offer Letter" that unlocks on deposit and a "Sale Agreement" that unlocks only on full payment, each with locked/unlocked/signed visual states (including a `.doc-ready` gold-pulse CSS animation in `index.css` for "ready to sign"). **This is exactly the `offers`/`agreements` two-table, payment-gated schema already shipped this session (Phase 7)** — `offers.ceo_signed`, `agreements.ceo_signed`, created respectively on first deposit and on full payment (`src/lib/paymentActions.ts`). The reference design and the real implementation agree on the single most legally-sensitive workflow in the system without having been told to. Section 7 below is accordingly marked mostly ✅ Ready — this is a genuine head start, not a gap.

**Also worth noting**: the reference design's numbers are illustrative placeholders, not real formulas — e.g. Dashboard's "Revenue This Month" is a hardcoded `8_750_000` constant, Deals' "This month" card is a hardcoded `"2"` / `"KES 3.9M"`, and Dashboard's inventory value assumes a flat `1,950,000` per plot regardless of each plot's real `plot_sizes.cash_price`. None of that carries over — every formula below is derived from the real schema.

---

## 1. Dashboard (Home)

| Metric | Formula / Source | Status |
|---|---|---|
| Sales this month (KES) | `SUM(payments.amount) WHERE status='success' AND created_at` in current month | ✅ Ready — already built in `admin.index.tsx` |
| Collection rate % | `SUM(successful payments) / SUM(inquiries.price)` for installment-terms inquiries | ✅ Ready |
| Plots available/booked/sold | `phases.available_count / booked_count / sold_count` | ✅ Ready |
| Overdue installments | Heuristic: `monthly_payment × months elapsed` vs actual paid | ✅ Ready (already flagged as an approximation, not a stored due-date ledger — see `admin.index.tsx`'s own comment) |
| Active leads | `COUNT(inquiries.status IN ('pending','reviewed'))` | ✅ Ready |
| Site visits today | `COUNT(bookings WHERE visit_date = today)` | ✅ Ready |
| Revenue forecast vs collected (area chart) | Needs a real cash-flow projection | 🟡 Partial — a first-pass forecast is derivable from `monthly_payment × payment_period_months` schedules already on `inquiries` (no new table needed for a v1), but a trustworthy forecast needs the installment-schedule table proposed in §6 |
| Plot-map status grid (SVG, live) | `plots.status` colored on the existing masterplan SVG | ✅ Ready — reuse the existing SVG + the Realtime plot-status channel already wired for the public site |
| Lead funnel snapshot | `COUNT(inquiries) GROUP BY status` | 🟡 Partial — only 4 coarse stages exist (`pending/reviewed/approved/rejected`); a true multi-stage funnel needs the pipeline schema from `docs/CRM_STATE_AUDIT.md` §4 |
| Agent leaderboard mini | Needs per-agent activity/response data | 🔴 Needs schema — see §3 |
| Urgent Task Escalations feed | Overdue installments + unconfirmed-past-due bookings | ✅ Ready for a first pass (both already have real data); a fuller "stalled lead" escalation needs the interaction log (§10 below) |
| Recent inquiries | `inquiries ORDER BY created_at DESC LIMIT n` | ✅ Ready |

## 2. Leads

| Metric | Formula / Source | Status |
|---|---|---|
| New today | `COUNT(inquiries WHERE created_at::date = today)` | ✅ Ready |
| Unassigned | `COUNT(inquiries WHERE cro_name IS NULL)` | ✅ Ready (though `cro_name` is free text with no FK — see §10) |
| Avg speed-to-lead | Time from lead creation to first contact | 🔴 Needs schema — no first-contact timestamp anywhere; needs the interaction log (§10) |
| Conversion % | `COUNT(status='approved') / COUNT(*)`, or `COUNT(agreements.ceo_signed) / COUNT(*)` for a stricter "closed-won" definition | ✅ Ready |
| Hot leads (score) | No scoring field exists | 🔴 Needs schema — add `inquiries.score int`, computed by a rules engine (source + engagement + response) |
| Lead funnel by stage | `inquiries.status` | 🟡 Partial (same 4-stage limitation as Dashboard) |
| Leads by source (bar) | `inquiries.heard_from` | 🟡 Partial — free-text dropdown exists, but no real channel/campaign/UTM columns |
| Speed-to-lead vs SLA (gauge) | Same as avg speed-to-lead | 🔴 Needs schema |
| Leads over time (line) | `COUNT(inquiries) GROUP BY created_at::date` | ✅ Ready |
| Score distribution (histogram) | Same as hot leads | 🔴 Needs schema |

## 3. Agent Performance

| Metric | Formula / Source | Status |
|---|---|---|
| Team conversion % | `inquiries` matched to `admin_users` via `cro_name` text match | 🟡 Partial — works today (this is `admin.agents.tsx`'s existing pattern) but the match is a fragile string comparison, not a real foreign key |
| Avg response time | No interaction log | 🔴 Needs schema (§10) |
| Total activities | No interaction log | 🔴 Needs schema (§10) |
| Revenue contribution | `SUM(payments.amount)` for inquiries matched to that agent | ✅ Ready (same fragile-match caveat as conversion %) |
| Leaderboard with sparklines | Ranking ✅ Ready (fragile match); sparkline needs a per-agent weekly time series of `payments.created_at`, computable as a query, no new schema | 🟡 Partial |
| Composite score (radar/ring) | Response time + activity + hygiene need the interaction log; conversion + revenue are ready | 🔴 Needs schema (mixed) |
| Activity heatmap by day | No interaction log | 🔴 Needs schema (§10) |
| Goal vs actual | No goals/quotas table | 🔴 Needs schema — new `agent_goals` table (agent_id, period, target_amount, target_deals) |
| Response-time distribution | Same as avg response time | 🔴 Needs schema |

**Recommended schema improvement (not optional if this tab is to be trustworthy): `inquiries.assigned_agent_id uuid references admin_users(id)`**, replacing the free-text `cro_name` match everywhere it's used (this tab, Leads, Site Visits' "agent visit load").

## 4. Contacts

| Metric | Formula / Source | Status |
|---|---|---|
| Total contacts | `COUNT(DISTINCT inquiries.client_email)` | ✅ Ready (existing `admin.contacts.tsx` pattern) |
| Active segments | No tags/segments field | 🔴 Needs schema — new `client_tags` table or a `tags text[]` column |
| Engaged (30d) | No interaction log; approximable via `inquiries.updated_at`/`payments.created_at` within 30 days | 🟡 Partial |
| Opt-in % | No consent/marketing-opt-in flag | 🔴 Needs schema — `inquiries.marketing_opt_in boolean` |
| Segment split (donut) | Depends on segments | 🔴 Needs schema |
| Lifecycle funnel | `inquiries.status` + payment/agreement existence | 🟡 Partial (same coarse-stage limitation) |
| Engagement heatmap | No interaction log | 🔴 Needs schema (§10) |
| Interaction timeline per contact | No interaction log | 🔴 Needs schema (§10) — **the single biggest gap on this tab** |

## 5. Closed Deals

| Metric | Formula / Source | Status |
|---|---|---|
| Deals closed | `COUNT(agreements WHERE ceo_signed=true)` | ✅ Ready |
| Total value | `SUM(inquiries.price)` for those | ✅ Ready |
| Avg time-to-close | `agreements.created_at - inquiries.created_at` | 🟡 Partial — real and computable today, but only measures "inquiry-to-signed," not "first-contact-to-signed" (needs §10 for the stricter CRM-standard definition) |
| Win rate | `COUNT(signed agreements) / COUNT(inquiries)` | 🟡 Partial — coarse; there's no explicit "lost reason," only `status='rejected'`, and an inquiry sitting un-actioned isn't cleanly "lost" |
| Pipeline value by stage | `inquiries.status`/`price` | 🟡 Partial (coarse-stage limitation) |
| Win/loss (donut) | approved+signed vs rejected | 🟡 Partial |
| Revenue by phase/location | `SUM(price) GROUP BY phase_name` | ✅ Ready |
| Deals over time (line) | `agreements.ceo_signed_at GROUP BY month` | ✅ Ready |
| Commission summary | No agent-commission model (the existing `affiliates.commission_rate` is for referral *partners*, a different concept from staff agent payout) | 🔴 Needs schema — new `agent_commissions` table or a rate on `admin_users` |

## 6. Installments

| Metric | Formula / Source | Status |
|---|---|---|
| Total outstanding | `SUM(inquiries.price) - SUM(successful payments)` | ✅ Ready (already built in `admin.installments.tsx`) |
| Due this month | No stored future due-date schedule — only past actual payments exist | 🔴 Needs schema — new `installment_schedules` table (inquiry_id, due_date, due_amount), generated at inquiry-approval time from `payment_period_months`/`monthly_payment` |
| Collection rate % | Ready, already built | ✅ Ready |
| Overdue count | Approximation already built | ✅ Ready |
| Collection-rate gauge | Same source as collection rate % | ✅ Ready |
| Outstanding vs collected (stacked bar) | Same sources as above | ✅ Ready |
| Aging buckets 0–30/30–60/60–90/90+ | Needs real due-dates for accuracy | 🟡 Partial — a coarse version works off the existing "months elapsed" heuristic; a trustworthy version needs the schedule table above |
| Multi-currency split KES/USD/GBP/EUR | `payments.currency` column exists but every write is effectively KES (Paystack settlement currency); no `amount_original`/`fx_rate_at_time`/`amount_kes` split | 🔴 Needs schema — extend `payments` with those three columns (already flagged in `docs/CRM_STATE_AUDIT.md` §8) |
| Cashflow forecast (line) | Same as Dashboard's forecast | 🟡 Partial → 🔴 for real accuracy (needs §6's schedule table) |
| Payment ledger table | `payments` | ✅ Ready |

## 7. Inquiries Queue

| Metric | Formula / Source | Status |
|---|---|---|
| Open | `COUNT(status='pending')` | ✅ Ready |
| Avg response time | No interaction log | 🔴 Needs schema (§10) |
| SLA compliance % | Same | 🔴 Needs schema |
| "Converted-to-lead %" | **Conceptual mismatch, not a gap**: in Gatepath's real schema, an inquiry *is* the lead object — there is no separate inquiry-inbox-to-lead-pipeline conversion step the way the gap analysis assumes for a generic CRM. Reinterpret this metric as `inquiries.status` progression, already covered above | ℹ️ N/A as worded |
| Volume by channel (bar) | `inquiries.heard_from` | 🟡 Partial (same as Leads §2) |
| SLA compliance gauge / response-time trend | Interaction log | 🔴 Needs schema |
| Open vs closed (donut) | `status NOT IN ('pending')` | ✅ Ready |
| **Offer Letter gate** (locked / unlocked-unsigned / signed) | `offers` table: row exists once deposit paid (`offers.ceo_signed`) | ✅ **Ready — already shipped** (Phase 7, `src/lib/paymentActions.ts`, `src/routes/admin.inquiries.tsx`) |
| **Agreement gate** (locked until fully paid / unlocked-unsigned / signed) | `agreements` table: row only created once cumulative payments reach `inquiries.price` (`agreements.ceo_signed`) | ✅ **Ready — already shipped** (Phase 7) |

## 8. Site Visits

| Metric | Formula / Source | Status |
|---|---|---|
| Scheduled today / Completed | `bookings.status`/`visit_date` | ✅ Ready (already built) |
| No-shows | No `no_show` status value exists on `bookings` (only `pending/confirmed/completed/cancelled`) | 🔴 Needs schema — add `no_show` to the status enum, or a `no_show boolean` + reason column |
| Post-visit conversion % | Whether that inquiry has a payment after the visit date | 🟡 Partial — computable as a query today, no new schema, just not yet built |
| Calendar with density | `bookings.visit_date` | ✅ Ready — already built this session |
| Status split (donut) | `bookings.status` | ✅ Ready |
| Visit locations (GPS pins) | No lat/lng or check-in field on `bookings` | 🔴 Needs schema — `bookings.checkin_lat/checkin_lng/checkin_at` |
| Agent visit load (bar) | No assigned-agent FK on `bookings` (only reachable via `inquiries.cro_name` join, same fragility as §3) | 🟡 Partial → 🔴 for a clean version (needs §3's `assigned_agent_id`) |
| Feedback-pending alerts | `bookings.visit_notes` is the client's own pre-visit note, not staff post-visit feedback — no such field exists | 🔴 Needs schema — `bookings.staff_feedback text`, `feedback_logged_at timestamptz` |

## 9. Plot Inventory

| Metric | Formula / Source | Status |
|---|---|---|
| Total/Available/Booked/Sold | `phases` rollups or `COUNT(plots.status)` | ✅ Ready |
| Absorption rate (current snapshot) | `sold / total` | ✅ Ready |
| Absorption rate (trend over time) | No status-change history — `plots.updated_at` only reflects the *last* change | 🔴 Needs schema — new `plot_status_history` table (plot_id, old_status, new_status, changed_at, changed_by) |
| Plot-map status grid (SVG, live) | Same as Dashboard | ✅ Ready |
| Inventory funnel x-of-y sold per phase | `phases` rollups | ✅ Ready |
| Sales velocity / absorption over time (line) | Same as absorption trend | 🔴 Needs schema |
| Price distribution (histogram) | `plot_sizes.cash_price`/`installment_price` | ✅ Ready |
| Demand by location (heatmap) | `COUNT(inquiries) GROUP BY phase_slug` | 🟡 Partial — a coarse version works today; a precise per-plot heatmap needs more inquiry volume than a small operation may have yet |
| Days-on-market | Same as absorption trend | 🔴 Needs schema |

## 10. Campaigns & Content

| Metric | Formula / Source | Status |
|---|---|---|
| Active campaigns / Leads generated / Cost-per-lead | No "campaign" entity exists at all — `referred_by`/`referral_code_used` on `inquiries` is tied to `affiliates` (referral partners), not marketing campaigns; no ad-spend data exists anywhere | 🔴 Needs schema — a `campaigns` table and a genuine attribution model; this is a substantial build, not a column add |
| Campaign ROI funnel | Same | 🔴 Needs schema |
| Content performance (views/leads per post) | `blog_posts` has no view-count or analytics field | 🔴 Needs schema — `blog_posts.view_count`, or proper pageview tracking |
| Hot-picks performance | Hot Picks is a pure client-side scarcity algorithm (`PropertyPreview.tsx`), not a stored/tracked entity — nothing to measure the performance *of* yet | 🔴 Needs schema — would need Hot Picks to become a real curated/logged list first |
| A/B results | No A/B infrastructure exists | 🔴 Needs schema — out of scope for a v1 |
| Publish calendar | `blog_posts.status`/`created_at` | ✅ Ready |
| CMS controls (media manager, blog manager) | Already exist (`admin.campaigns.tsx`, `admin.blog.tsx` per `docs/CRM_STATE_AUDIT.md` §2) | ✅ Ready — needs visual/UX upgrade + the nav-unreachable-blog-route fix already flagged in the audit, not new schema |

## 11. Staff Accounts

| Metric | Formula / Source | Status |
|---|---|---|
| Active staff / Roles | `admin_users` | ✅ Ready |
| Recent logins | Supabase Auth has internal logs not exposed to the app today | 🔴 Needs schema/build — either a custom `login_events` table populated on sign-in, or querying Supabase's auth admin API |
| Pending invites | `inviteStaffFn` creates the user directly — no pending/accepted invite state | 🔴 Needs schema — `admin_users.invite_status` or a separate `staff_invites` table |
| Role distribution (donut) | `admin_users.role` | ✅ Ready |
| Login/activity audit timeline | Same as recent logins | 🔴 Needs schema |
| Permission matrix (grid) | RBAC today is 3 flat roles + scattered ad-hoc `adminRole === "ceo"` checks per screen, not a real permission matrix | 🔴 Needs schema — a `role_permissions` table (role, module, can_read, can_write) |

## 12. Settings

| Metric | Formula / Source | Status |
|---|---|---|
| Integration status (Paystack/Africa's Talking/Resend/n8n/WhatsApp/Meta health dots) | No health-check/last-successful-call tracking exists for any integration | 🔴 Needs schema/build — a lightweight `integration_health` table or ping endpoint per service |
| Audit-log viewer | No general audit-log table exists (`plot_title_verifications` is domain-specific, not general-purpose) | 🔴 Needs schema — could double up with §9's `plot_status_history` as a more general `audit_log` table |
| Scheduled-backup + FX-refresh status | Supabase has its own platform-level backups (not tracked in-app); FX rates are hardcoded constants in `src/lib/currency.ts`, never fetched dynamically, so there's no "last refreshed" to show | 🔴 Needs schema/build |
| Pipeline/stage and template editors | Conveyancing stages are hardcoded in `src/lib/conveyancing.ts`; message templates are inline in `src/lib/notifications.ts` — neither is DB-editable | 🔴 Needs schema — a `pipeline_stages` config table and a `message_templates` table |

---

## Cross-cutting schema gaps (build once, unlock many tabs)

These recur across multiple tabs above — building each once is far more efficient than treating each 🔴 independently:

1. **Interaction/activity log** (calls, WhatsApp, emails, visits, follow-ups) — unlocks: Dashboard escalations, Leads (speed-to-lead, hot leads), Agent Performance (response time, activity, composite score), Contacts (timeline, engagement), Inquiries Queue (SLA). **The single highest-leverage table to build next.**
2. **Real agent assignment FK** — `inquiries.assigned_agent_id` (and ideally `bookings`) replacing the free-text `cro_name` match. Unlocks: Agent Performance, Leads, Site Visits.
3. **Lead source/channel/campaign/UTM attribution** — new columns on `inquiries` or a `lead_sources` reference. Unlocks: Leads, Campaigns.
4. **Multi-currency payment ledger** — extend `payments` with `amount_original`/`fx_rate_at_time`/`amount_kes`. Unlocks: Installments, Dashboard KES-base reporting.
5. **Installment schedule (future due dates, not just past actuals)** — new `installment_schedules` table. Unlocks: Installments (due this month, aging buckets), Dashboard/Installments forecasting.
6. **Status-change history / general audit log** — one table covering plot status changes, staff logins, permission changes, config edits. Unlocks: Plot Inventory (absorption trend, days-on-market), Staff Accounts, Settings.
7. **Lead scoring** — `inquiries.score` + a rules engine. Unlocks: Leads, feeds Agent Performance's composite score.
8. **GPS check-in + staff post-visit feedback** — new columns on `bookings`. Unlocks: Site Visits.
9. **Agent commission model** — distinct from the existing referral-partner `affiliates.commission_rate`. Unlocks: Closed Deals.
10. **RBAC permission matrix** — `role_permissions` table replacing scattered `adminRole === "ceo"` checks. Unlocks: Staff Accounts, and closes the real security-consistency gap already flagged in `docs/CRM_STATE_AUDIT.md` §10.3 (some writes today have no server-side role check at all).
11. **Campaign/marketing entity + content analytics** — the largest, most speculative build here; genuinely a later-phase ambition, not a quick add.

None of the above is implemented in this pass — this document is the read-only Phase 0 deliverable. Awaiting direction on priority order before Phase 1 (visualization language + design system) begins.
