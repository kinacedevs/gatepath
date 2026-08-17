# Gatepath Realtors — Enterprise Automation Strategy (Module 3 / n8n)

**Engagement type: discovery, analysis, and planning only. No n8n workflows, JSON, or automation code are produced anywhere in this document.** Every recommendation below either cites specific evidence from the live codebase (file path, function name, table name, migration number, or route) or is explicitly labeled **[ASSUMPTION — VERIFY]**. This supersedes the prior `docs/AUTOMATION_PLAN.md`/`docs/AUTOMATION_SECURITY_PLAN.md` pass — those documents' factual findings are still accurate and are folded in here where relevant, but this document follows the more rigorous five-phase structure requested and is the one to treat as current.

---

## Before Phase 1: what I could access, and one correction to the brief up front

I have full read access to the frontend routes (`src/routes/`, 53 files), the component/lib layer (`src/lib/`, 51 files), the Supabase schema via 31 tracked migrations (`supabase/migrations/0001` through `0031`) plus `docs/DATABASE_SCHEMA.md` (a reverse-engineered baseline for the 12 tables that predate migration tracking), the Cloudflare Worker entry (`src/server.ts`), and `package.json`. I do not have access to the live Supabase project's dashboard settings (Auth policy configuration, connection pooler settings) or any deployed environment — those are called out explicitly wherever a claim depends on them.

**Correction to the brief's own description, per your own instruction that the code wins on any disagreement**: your context describes the Supabase backend as including "Edge Functions." **`supabase/functions/` does not exist in this repository — confirmed via a direct directory search.** This project has **no Supabase Edge Functions at all.** Every piece of server-side logic (payment verification, staff invitation, notification sending, all ~50 admin write operations) runs as a TanStack Start `createServerFn` handler, bundled into a **Cloudflare Worker** (`src/server.ts` is the raw Worker `fetch` entry point). This distinction matters directly for Phase 4.4 and Phase 4.5 below — there is no separate Edge Function deployment/secrets surface to reason about; there is exactly one server runtime (the Worker), with two secret stores (`.dev.vars` locally, Wrangler-managed encrypted secrets in production).

---

# PHASE 1 — Complete Project Audit

## 1.1 Module Inventory

| Module | Location | Purpose | Scope |
|---|---|---|---|
| Homepage | `src/routes/index.tsx` + `src/components/sections/*` | Hero, Hot Picks, Featured Locations, trust bar, CEO section, testimonials | Public |
| Property catalog | `src/routes/properties.index.tsx`, `properties.$slug.tsx` | Browse phases, view interactive plot map, plot detail panel | Public |
| Locations | `src/routes/locations.tsx` | Location-grouped property browsing | Public |
| Diaspora hub | `src/routes/diaspora.tsx` | Multi-currency catalog, Nairobi-time clock, diaspora-specific trust content | Public |
| Blog | `src/routes/blog.index.tsx`, `blog.$slug.tsx` | Articles, incl. "Project Update" category | Public |
| Gallery / Downloads / FAQs | `src/routes/gallery.tsx`, `downloads.tsx`, `faqs.tsx` | Aggregated media, brochures/plot-maps, general+diaspora FAQs | Public |
| About / Contact / Privacy / Terms | `src/routes/about.tsx`, `contact.tsx`, `privacy.tsx`, `terms.tsx` | Static/semi-static content, contact form | Public |
| Partner program | `src/routes/partner.tsx` | Affiliate/referral program landing | Public |
| Inquiry intake | `src/routes/inquire.tsx` | The primary lead-capture form (3-step buyer journey) | Public |
| Site-visit booking | `src/routes/book-visit.tsx` | Physical/virtual tour scheduling, free or paid | Public |
| Payment | `src/routes/payment.tsx` | Paystack Inline checkout | Public |
| Thank-you | `src/routes/thank-you.tsx` | Read-only post-payment confirmation | Public (personalized) |
| Client portal | `src/routes/portal.tsx` | OTP-gated self-service: 13-stage conveyancing view, payment history, documents | Shared (public-reachable, client-authenticated) |
| Generated documents | `src/routes/document.offer.$id.tsx`, `document.agreement.$id.tsx`, `document.receipt.$id.tsx` | Live-rendered, print-to-PDF legal documents | Shared (linked from portal + admin) |
| Admin shell + auth | `src/routes/admin.tsx` | Supabase Auth session gate, login form, `AdminShell` layout | Admin |
| Dashboard | `src/routes/admin.index.tsx` | KPI/escalation/leaderboard overview | Admin |
| Leads (Kanban) | `src/routes/admin.leads.tsx` | Drag-and-drop pipeline, lead scoring, walk-in capture | Admin |
| Inquiries Queue | `src/routes/admin.inquiries.tsx` | Full record review, approve/reject, Offer/Agreement e-signature | Admin |
| Site Visits | `src/routes/admin.bookings.tsx` (`admin.meetings.tsx` is a dead redirect stub to it) | Calendar + agenda, confirm/reschedule/cancel | Admin |
| Land Inventory | `src/routes/admin.plots.tsx`, `admin.plots.$plotId.tsx` | Phase/plot CRUD, pricing tiers, Table/Grid-Map/Position-Plots views | Admin |
| Installment Tracker | `src/routes/admin.installments.tsx` | Real payment ledger, manual reminder send | Admin |
| Closed Deals | `src/routes/admin.deals.tsx` | Signed-agreement ledger | Admin |
| Client Directory | `src/routes/admin.contacts.tsx` | Aggregated client view, click-to-call logging | Admin |
| Agent Performance | `src/routes/admin.agents.tsx` | Revenue/conversion/call metrics per agent | Admin |
| Commissions | `src/routes/admin.commissions.tsx` | Per-agent, per-deal commission calc + payout marking | Admin |
| Goals | `src/routes/admin.goals.tsx` | Per-agent/phase targets vs. live-computed actuals | Admin |
| Property Matching | `src/routes/admin.property-matching.tsx` | Buyer watch-list, manual "Send Match Alert" | Admin |
| Referrals & Testimonials | `src/routes/admin.referrals-testimonials.tsx` | Manual outreach triggers post-handover | Admin |
| Tasks & Follow-ups | `src/routes/admin.tasks.tsx` | Dated tasks, calendar, manual reminder send | Admin |
| Notifications & Escalations | `src/routes/admin.notifications.tsx` | Aggregates 5 escalation categories, one-click actions | Admin |
| Field Mode | `src/routes/admin.field-mode.tsx` | Mobile-first single-column lead list, GPS visit logging | Admin |
| Call Log (Telephony) | `src/routes/admin.telephony.tsx` | Click-to-call outcome logging | Admin |
| Data Governance | `src/routes/admin.data-governance.tsx` | Duplicate report, completeness, retention review, audit log viewer | Admin |
| Document Vault | `src/routes/admin.documents.tsx` | Staff-side signed-URL document storage | Admin |
| Reports & Analytics | `src/routes/admin.reports.tsx` | Executive digest, lead-source ROI, cohort analysis | Admin |
| Campaigns & Content | `src/routes/admin.campaigns.tsx` (`admin.blog.tsx` is a dead redirect stub) | Media Manager, Blog CRUD, Hot Picks, Newsletter list, Affiliates | Admin |
| Site Content | `src/routes/admin.site-content.tsx` | Branding, contact info, testimonials, team, FAQs, section hero media | Admin |
| Staff Accounts | `src/routes/admin.staff.tsx` | Staff invite (CEO-only), role list | Admin |
| Settings | `src/routes/admin.settings.tsx` | Profile, pipeline labels, message templates, FX rates, data export | Admin |
| Integrations & API | `src/routes/admin.integrations.tsx` | Provider connection status, `api_keys` management | Admin |

## 1.2 Backend & API Map

**Supabase Edge Functions: none.** (See correction above.)

### External API integrations

| Provider | Call site | Data in / out | Auth method |
|---|---|---|---|
| Paystack (verify) | `src/lib/paymentActions.ts:35` — `GET https://api.paystack.co/transaction/verify/${reference}` | In: transaction reference. Out: amount, status, currency, raw response (stored in `payments.paystack_response` jsonb) | `Authorization: Bearer ${PAYSTACK_SECRET_KEY}` (server env var, never sent to client) |
| Paystack (checkout) | `src/routes/payment.tsx:27` — loads `https://js.paystack.co/v1/inline.js` client-side | Client-side popup; server never trusts its "success" callback alone — always re-verifies via the above | `VITE_PAYSTACK_PUBLIC_KEY` (public by design) |
| Resend (email) | `src/lib/notifications.ts:100` — `POST https://api.resend.com/emails` | Out: to, subject, HTML body | `Authorization: Bearer ${RESEND_API_KEY}` |
| Africa's Talking (SMS) | `src/lib/notifications.ts:45-48` — `POST` to `api.africastalking.com` (or `api.sandbox.africastalking.com` if `AFRICAS_TALKING_USERNAME === "sandbox"`) | Out: to, message, optional sender ID | `apiKey` header (`AFRICAS_TALKING_API_KEY`) |

**Webhook receivers: none exist today.** Grepped for `webhook` across `src/` — every hit is either a comment, an `admin.integrations.tsx` UI label, or forward-looking documentation. There is no `/webhooks/*` route in `src/server.ts`, and no inbound endpoint anywhere verifies a Paystack `x-paystack-signature`. Payment confirmation today is **entirely client-triggered**: `payment.tsx`'s Paystack popup reports success → calls `verifyPaymentFn` (`paymentActions.ts`) → that function independently re-verifies against Paystack's own API before writing anything. This closes the *forgery* hole (nothing client-asserted is trusted) but not the *abandoned-tab* case (money leaves the buyer's account, they close the tab before the verify call completes) — already flagged in `docs/SECURITY_HARDENING.md` line 79, still open.

### Server-side routes (TanStack server functions, the de facto "API layer")

~48 `createServerFn` handlers across the `src/lib/*Actions.ts` files (one file per domain: `paymentActions.ts`, `bookingActions.ts`, `leadsActions.ts`, `inventoryActions.ts`, `commissionActions.ts`, `goalActions.ts`, `taskActions.ts`, `escalationActions.ts`, `documentVaultActions.ts`, `apiKeyActions.ts`, `interactionLogActions.ts`, `testimonialActions.ts`, `buyerPreferenceActions.ts`, `customFieldActions.ts`, `pipelineLabelsActions.ts`, `fxRateActions.ts`, `messageTemplateActions.ts`, `dataExportActions.ts`, `mediaUploadActions.ts`, `inquiryActions.ts`, `plotActions.ts`, `plotVerificationActions.ts`, `adminActions.ts`, `portalActions.ts`). Every one follows the same pattern (verified directly, not assumed — this is the single most consistent convention in the codebase): accept a `callerAccessToken`, re-verify the caller server-side via `getAnonClient().auth.getUser(token)`, confirm their `admin_users` row via `getServiceClient()` (bypasses RLS, service-role only, constructed *inside* the handler body so TanStack strips it from the client bundle — `src/lib/supabaseAdmin.ts`), then perform the write.

**One real, standing internal REST API also exists**: `src/lib/apiRoutes.ts`, dispatched directly from `server.ts:137-139` for any `/api/v1/*` path, ahead of the SSR handler. Endpoints: `GET/POST /api/v1/leads`, `GET /api/v1/leads/:id`, `GET /api/v1/plots`. Auth: `Authorization: Bearer <key>` matched against `api_keys.key_hash` (SHA-256, migration `0019`), scoped (`leads:read`/`leads:write`/`plots:read`), revocable. **This is the correct, already-built ingress point for n8n's outbound calls** — see Phase 4.4.

## 1.3 Database Map

31 tracked migrations (`0001`–`0031`) plus 12 tables that predate migration tracking (created directly in the Supabase Dashboard, reverse-engineered in `docs/DATABASE_SCHEMA.md`) plus 2 confirmed-unused orphan tables. **`docs/DATABASE_SCHEMA.md` is itself now stale** — its own "not yet built" list (line 271-287) names `interaction_log`, `pipeline_stages`, `message_templates`, and `audit_log` as proposed-only; all four now exist as real, populated tables (migrations `0008`, `0026`, `0020`, `0013`). Treat that document as accurate for the 12 dashboard-origin base tables' column shapes only, not for "what exists" overall — this section supersedes it.

### Core sales-flow tables (dashboard-origin, extended by migrations)
`phases`, `plot_sizes`, `plots`, `inquiries` (extended `0005`, `0013`, `0020`, `0021`, `0026`), `bookings` (extended `0012`), `payments`, `agreements` — full column detail in `docs/DATABASE_SCHEMA.md`. Money is stored as **numeric major-unit KES** (`payments.amount`, `inquiries.price/deposit/balance`, `plot_sizes.cash_price`), **not** integer minor units — `docs/DATABASE_SCHEMA.md` line 11 already flags this as a live contradiction of `CLAUDE.md`'s own stated architecture rule. Relevant to automation: any workflow doing money math must treat these as decimal KES, not cents.

### New tables (created by tracked migrations, full inventory)

| Table | Migration | Purpose |
|---|---|---|
| `offers` | `0005` | Deposit-triggered offer letter, pre-Agreement |
| `plot_title_verifications` | `0004` | Manual Ardhisasa-style title-check log |
| `portal_sessions` | `0003` | Opaque client-portal session tokens |
| `interaction_log` | `0008`, extended `0018`, `0014` | Call/email/WhatsApp/SMS/site-visit touch log, incl. GPS + call outcome |
| `tasks` | `0009` | Dated staff follow-ups |
| `buyer_preferences` | `0010` | Watch-list (location/budget) for Property Matching |
| `document_records` | `0011` | Document Vault metadata (Storage path, signed-URL access) |
| `audit_log` | `0013` | Human staff-action audit trail |
| `commission_payouts` | `0015` | Per-agent, per-deal payout records |
| `goals` | `0016` | Agent/phase targets |
| `pipeline_stages` | `0026` | Custom Kanban sub-stages within the 4 fixed buckets |
| `api_keys` | `0019` | Scoped external API credentials |
| `message_templates` | `0020` | Editable outreach-email templates |
| `custom_field_definitions` | `0021` | Admin-defined inquiry form fields |
| `newsletter_subscribers` | `0025` | Email capture, **no send mechanism built yet** |
| `testimonials`, `team_profiles`, `faqs` | `0006` | Content CMS |

### FK relationships (the ones that matter for automation triggers)
- `inquiries.id` ← `bookings.inquiry_id`, `payments.inquiry_id`, `offers.inquiry_id` (not null, `on delete cascade`), `agreements.inquiry_id`, `interaction_log.inquiry_id`, `document_records.inquiry_id`, `tasks.related_inquiry_id`, `commission_payouts.inquiry_id`, `testimonials.submitted_by_inquiry_id`.
- **`inquiries.phase_id`/`plot_id` are confirmed unpopulated by the real intake flow** — the actual match key is `inquiries.phase_slug` + `plot_number_ref` (text/number, not FK-enforced). Any automation joining inquiries to phases/plots must use this pair, not the FK columns, or it will silently match nothing. This was independently re-confirmed twice in this codebase's own history (Phase 5B, Phase 13) as a real gotcha.
- `offers.payment_id` / `agreements.payment_id` → `payments.id` (nullable) — the specific transaction that triggered each document.
- `plots.phase_id` → `phases.id`; `plots.size_id` → `plot_sizes.id`.

### RLS
Helper functions confirmed in `supabase/migrations/0001_admin_auth_and_rls.sql`: `public.is_admin()` (line 41), `public.current_admin_role()` (line 54) — both match `auth.jwt() ->> 'email'` against `admin_users.email` (no linked user-ID column; admin identity is matched by email string). Every table added after `0001` follows the same shape: admin-only `select` via `is_admin()`, **no direct insert/update/delete policy at all** — writes exclusively through the service-role server functions in §1.2. Two exceptions with public-insert policies by design: `inquiries`, `bookings` (the actual intake forms), `testimonials`/`team_profiles`/`faqs` (public `select` where published, `0006`), `custom_field_definitions` (public `select` where active — the intake form reads these unauthenticated). `client_otps` and `portal_sessions`: RLS enabled with **zero** policies — service-role only, unreachable from any client key.

### Triggers, scheduled jobs, functions
**None found.** Grepped every migration for `create trigger` and `pg_cron`/`cron.schedule` — zero matches. All "rolling counter" fields (`phases.total_plots/available_count/booked_count/sold_count`) are maintained by **application code** (`recomputePhaseCounts` in `src/lib/plotActions.ts`, called after every plot mutation), not a database trigger. This is directly relevant to Module 3: **there is currently no server-side scheduled execution of any kind in this stack.** Anything described below as "nightly" or "scheduled scan" has no existing mechanism to run on — n8n's own cron trigger becomes the *first* scheduler this system has ever had.

### Realtime
**Exactly one subscription exists in the entire codebase**: `src/lib/phases.ts`'s `usePhase()` hook, `.channel('realtime-plots-${phase.slug}').on("postgres_changes", { event: "*", schema: "public", table: "plots" }, ...)`. Nothing else uses Supabase Realtime.

### Status enums / lifecycle fields and their transitions

| Field | Values | Transition mechanism |
|---|---|---|
| `inquiries.status` | `pending` → `reviewed`/`rejected` → `approved` | Kanban drag (`leadsActions.ts::updateInquiryStatusFn`) or Inquiries Queue approve/reject (`inquiryActions.ts`) |
| `inquiries.pipeline_stage_id` | nullable FK → `pipeline_stages` | Same function, optional param; custom sub-stage *within* a bucket, doesn't change `status` |
| `plots.status` | `available` → `booked` → `sold` | **Only** `plotActions.ts::updatePlotStatusFn` (server-verified) or the atomic conditional update inside `recordVerifiedPayment` (`WHERE status='available'`) — never a direct client write, enforced by `CLAUDE.md` and confirmed by grep |
| `bookings.status` | `pending` → `confirmed`/`cancelled`, → `completed` | `bookingActions.ts::updateBookingFn` |
| `payments.status` | `pending`/`success`/`failed`/`abandoned` | Written once, at verify time, never transitioned after |
| `offers.ceo_signed` / `agreements.ceo_signed` | boolean, false → true | `inquiryActions.ts::signOfferFn`/`signAgreementFn` |
| Conveyancing stage (13-stage) | **not a stored field** — computed live on every read by `src/lib/conveyancingStages.ts::resolveDealStage()`, checking real signals (`cro_name` set, an `interaction_log` row, a `bookings` row, an `offers` row, `offers.ceo_signed`, installment progress, an `agreements` row) | No transition event exists — deliberately deferred in this session's Phase 16 ("the timestamped audit trail... remains explicitly deferred") |

## 1.4 CRM / Admin Dashboard Map

Every admin screen's core reads/mutates are listed in the module table (§1.1) and expanded per-workflow in §1.6 and §2.1. **The e-signature flow in detail**, since it's explicitly requested and is the highest-legal-stakes flow in the system:

1. Buyer's first successful payment on an inquiry (`paymentActions.ts::recordVerifiedPayment`, called from `verifyPaymentFn`) → creates an `offers` row (`offers.payment_id` = that payment).
2. CEO/manager opens the Inquiries Queue review modal (`admin.inquiries.tsx`), sees the "Offer" section unlocked, clicks to sign → `inquiryActions.ts::signOfferFn` → server re-verifies caller has `role === 'ceo'` (not merely "is staff" — this is stricter than every other admin write in the codebase) → sets `offers.ceo_signed = true`, `ceo_signed_at = now()`.
3. Buyer continues paying (installments) via `payment.tsx` or the in-portal installment flow (`portal.tsx`, also routed through `verifyPaymentFn`). Each successful payment re-checks the running sum against `inquiries.price`.
4. Once cumulative successful payments reach `inquiries.price` in full, the **same** completing-payment call creates an `agreements` row (`agreements.payment_id` = the completing payment) — this is the one and only trigger; there is no separate "mark fully paid" staff action.
5. CEO signs the Agreement the same way (`signAgreementFn`, same `role === 'ceo'` gate).
6. Both documents are **live-rendered HTML, print-to-PDF** (`document.offer.$id.tsx`, `document.agreement.$id.tsx`) — no PDF file is ever generated or stored server-side. `agreements.pdf_agreement_url`/`pdf_receipt_url` columns exist but **are never populated by any code path** (`docs/DATABASE_SCHEMA.md` line 168-169) — any automation that assumes a downloadable PDF artifact exists will find nothing there.

## 1.5 Business Logic Map

### Buyer journey, as implemented (not as summarized)
`inquire.tsx` (3-step form, public insert into `inquiries`) → optional `book-visit.tsx` (site visit, public insert into `bookings`, free path server-validated via `bookingActions.ts::createFreeSiteVisitBookingFn` — Sunday-exclusion and 60-day-window checks re-run server-side, plus a real daily-capacity check against `site_banners` row `booking_capacity` (`max_per_day`, default 8 if unset)) → CEO/manager approval in Inquiries Queue → `payment.tsx` (Paystack) → `verifyPaymentFn` → Offer created/signed → installments (optional) → Agreement created/signed → `portal.tsx` (OTP-gated self-service tracking).

### Calculated logic
- **Pricing**: `src/lib/pricing.ts` — the single formula both `inquire.tsx`'s Step-1 estimate and `payment.tsx`'s checkout use (unified in this session's Phase 34, previously two disagreeing calculations). Flat-surcharge formula for installment terms.
- **Currency**: `src/lib/currency.ts` — `CURRENCY_RATES` seed table + a mutable `liveRates` object + `setLiveFxRates()`, populated from `site_banners` row `fx_rates` (admin-editable via `fxRateActions.ts::saveFxRatesFn`). KES is the base; USD/GBP/EUR/CAD/AUD/AED are supported display currencies. **No rate-refresh automation exists** — a rate is only ever as current as the last manual admin edit.
- **Lead scoring**: `src/lib/leadScoring.ts` — computed live (`useMemo` in `admin.leads.tsx`), 4 components (source approval-rate, budget percentile, engagement, response), explicitly **not stored**, by deliberate design (Phase 12: "score computed live... nothing existed to keep a stored score fresh").
- **Escalation detection**: `src/lib/escalations.ts` — 5 pure functions, all computed live on page load of `admin.notifications.tsx`, none stored:
  - `findOverdueInstallments`: `monthly_payment × months elapsed since booking_date` vs. real sum of successful payments.
  - `findStaleBookings`: `status='pending'` and `visit_date` already passed.
  - `findStalledLeads`: `status` in `pending`/`reviewed`, no activity (latest of `created_at`/any `interaction_log.occurred_at`) in 7+ days.
  - `findMissingFeedback`: `bookings.status='completed'` with no `staff_feedback` set.
  - `findExpiringGracePeriods`: an `offers` row with no matching `agreements` row, `14 - daysSince(offers.created_at)` — the "14 days" figure is a **hardcoded literal in the escalation function itself**, matched only informally against a 14-day mention in `notifications.ts`'s reservation-email copy. **No stored expiry date exists anywhere** — confirmed, this is a derived-on-read value, not a schedulable deadline field.

### Time-based logic already present (the closest thing to existing "automation")
- Portal OTP: 5-minute TTL, 5-attempt lockout (`portalActions.ts:17-19` — `OTP_TTL_MS`, `MAX_OTP_ATTEMPTS`).
- Portal session: flat 2-hour absolute TTL (`SESSION_TTL_MS`).
- Booking window: Sunday exclusion + 60-day advance limit, enforced **both** client-side (`book-visit.tsx`) and server-side (`createFreeSiteVisitBookingFn`) — the one genuinely server-enforced date-window rule in the app.
- Hot Picks expiry (`phases.hot_pick_expires_at`): **not a scheduled job** — it's a plain filter checked at render time in `PropertyPreview.tsx` ("not yet expired"); a pick past its date simply stops showing on the next page load, nothing runs to "expire" it proactively.
- All of the above are the full extent of "time" in this codebase's business logic today — there is no cron-equivalent, confirmed in §1.3.

## 1.6 Current Workflow & Notification Map

### Every notification send point (function, trigger, channel, automated vs. manual)

| Function (`src/lib/notifications.ts` unless noted) | Trigger | Channel(s) | Automated or manual? |
|---|---|---|---|
| `sendResendEmail`/`sendAfricaTalkingSms` (low-level, shared) | Called by every function below | Email / SMS | — |
| OTP send (`portalActions.ts::requestPortalOtpFn`) | Client requests portal access | Both, parallel (succeeds if either works) | Automatic (real-time, on request) |
| Payment/agreement-signed notifications (`paymentActions.ts`) | A payment verifies, an agreement is signed | Email + SMS | Automatic |
| `sendSiteVisitNotificationFn` | A booking is created (paid or free path) | — | Automatic |
| `sendPaymentReminderFn` | Staff clicks "Send Reminder" on Installment Tracker | Email/SMS | **Manual** |
| `sendTaskReminderFn` | Staff clicks "Send Reminder" on a task | Email/SMS to assignee | **Manual** |
| `sendMatchAlertFn` (`propertyMatching`-adjacent) | Staff clicks "Send Match Alert" | Email | **Manual** |
| `sendCommissionStatementFn` | Staff clicks "Send Statement" | Email | **Manual** |
| `sendExecutiveReportFn` | Staff clicks "Send Report to CEO" | Email | **Manual** |
| `sendTestimonialRequestFn` / `sendReferralInviteFn` | Staff clicks either button post-handover | Email | **Manual** |
| Newsletter | — | — | **Does not exist** — `newsletter_subscribers` captures emails; there is no send capability at all, manual or automated (confirmed, `admin.campaigns.tsx`'s Newsletter tab is read-only: count + list) |

**Every "automated" row above fires synchronously inside the same request that created the triggering row** — there is no delay, no retry-if-it-fails-quietly, and (confirmed in §1.3) no way to re-fire one later if it silently failed, other than a human noticing and re-doing the underlying action.

### Status-change-should-trigger-downstream points, and their current state
Directly enumerated in §2.1's Manual Process Catalogue below — every escalation category in §1.5 is exactly this ("X should have happened, and today a human must notice it hasn't").

---

# PHASE 2 — Manual Process & Automation Opportunity Analysis

## 2.1 Manual Process Catalogue

| Process | Who | Frequency | Trigger | Evidence | Risk if delayed/forgotten |
|---|---|---|---|---|---|
| Assign a new lead to an agent | CEO/manager | Per new inquiry | New `inquiries` row | `admin.leads.tsx`'s assignment `<select>` → `leadsActions.ts::assignLeadFn` | Lead sits unassigned; no SLA timer exists to notice |
| Notice a stalled lead | Any staff | Ongoing | 7+ days no activity | `escalations.ts::findStalledLeads`, surfaced only when a human opens `/admin/notifications` | Lead goes cold silently — the detection exists, the alert doesn't |
| Send installment reminder | Any staff | Per overdue account | `findOverdueInstallments` flags it | `admin.installments.tsx`'s "Send Reminder" button | Buyer's payment slips further behind before anyone reaches out |
| Log a staff callback / site-visit outcome | Any staff | Per call/visit | Ad hoc | `QuickCallLogger.tsx` → `interactionLogActions.ts::logInteractionFn` | No downstream effect if never logged — feeds nothing automatically today |
| Confirm/reschedule a booking | Any staff | Per booking | New `bookings` row | `admin.bookings.tsx` | No automatic confirmation email distinct from the initial notification |
| Post-visit staff feedback | Any staff | Per completed visit | `bookings.status='completed'` | `findMissingFeedback` escalation | No client-facing survey exists at all — this is staff's internal note, not a client ask |
| CEO signs Offer/Agreement | CEO only | Per deposit / per full payment | Payment event creates the row | `signOfferFn`/`signAgreementFn`, `role==='ceo'` gate | **Correctly** a hard stop today — see §2.3 |
| Send testimonial/referral request | Any staff | Per fully-paid deal | `agreements.ceo_signed=true` | `sendTestimonialRequestFn`/`sendReferralInviteFn`, buttons on `admin.referrals-testimonials.tsx` | Delayed ask = lower response rate (well-documented in the original research, `docs/CRM_CAPABILITIES.md` §4: "the single highest-converting moment... is immediately after") |
| Send property-match alert | Any staff | Per matching plot appearing | `propertyMatching.ts` computes matches live | `admin.property-matching.tsx`'s "Send Match Alert" | A buyer's exact-match plot could sell to someone else before they're told |
| Commission payout marking | CEO/manager | Per closed deal | `agreements.ceo_signed=true` | `admin.commissions.tsx`'s "Mark Paid" | No downstream effect besides bookkeeping — low urgency |
| Manually verify title (Ardhisasa) | Staff | Per booked/sold plot | Plot status change | `plot_title_verifications` log, `admin.plots.$plotId.tsx` | Untracked legal risk if genuinely skipped — but this is **correctly** manual per §2.3 |
| FX rate update | CEO/manager | Ad hoc (no cadence) | None — purely discretionary | `admin.settings.tsx`'s FX Rates tab | Displayed foreign-currency prices drift from real market rates the longer it's left |
| Newsletter send | — | — | — | **No mechanism exists to do this at all**, manual or automated | N/A — not a delay risk, a missing-capability gap |

## 2.2 Automation Opportunity Scoring

| Opportunity | Business value | Implementation risk | Effort | Dependencies |
|---|---|---|---|---|
| Speed-to-lead: notify agent on assignment, escalate if untouched | **High** | Low | Low | None — schema fully supports it today |
| Push the 5 existing escalation categories (SMS/WhatsApp) instead of requiring `/admin/notifications` be opened | **High** | Low | Low | None — detection logic (`escalations.ts`) already exists, only the channel is new |
| Overdue-installment auto-reminder | **High** | Medium (money-adjacent, but reuses an already-reviewed manual function) | Low | Reuses `sendPaymentReminderFn` |
| Auto-fire testimonial/referral request on handover | Medium | Low | Low | Reuses two already-built manual functions verbatim |
| Real Paystack webhook (close the abandoned-tab gap) | **High** (revenue integrity) | **High** — payment-adjacent by definition | Medium | New route in `server.ts`, HMAC verification, must reuse `recordVerifiedPayment` exactly |
| Property-match auto-alert | Medium | Low | Low | Reuses `sendMatchAlertFn`; needs a trigger on plot-status change |
| Booking confirmation/reminder sequence | Medium | Low | Low-Medium | New send logic (distinct from the existing single notification) |
| Nightly agent-score recompute + store | Low-Medium | Low | Medium | **Reverses a deliberate Phase 12 design decision** — needs your explicit sign-off, not just effort |
| Newsletter send capability + Hot-Pick-triggered send | Medium | Low | Medium (new capability, not just automation) | No existing send function to reuse — this is new build, not automation |
| Meta/IG Lead Ads, WhatsApp Business inbound capture | Medium-High (if it worked) | N/A — currently unbuildable | N/A | **Blocked**: no Meta Business / WhatsApp Business account provisioned anywhere in this project — confirmed absent, not a code gap |
| Client-facing post-visit feedback survey | Medium | Low | Medium (new capability) | No existing client-facing survey mechanism — new build |
| Post-visit client survey → auto-escalate no-response | Low-Medium | Low | Medium | Depends on the survey existing first |

## 2.3 Anti-Automation Flags

- **CEO e-signature on Offers/Agreements (`signOfferFn`/`signAgreementFn`) — never automate.** These are the only two server functions in the entire codebase that check `role === 'ceo'` specifically rather than "any staff" or "not agent" — a deliberate, singular elevation, and the point at which Gatepath is legally bound to a buyer. Evidence: `admin.inquiries.tsx`'s review modal renders these as a manual click with the caller's own identity re-verified server-side at the moment of signing; there is no code path anywhere that signs on the system's own authority.
- **The real Paystack webhook's *verification and DB write* must stay inside Gatepath's own server, never inside n8n.** Already argued in the prior planning pass (`AUTOMATION_PLAN.md` §2) and unchanged here: `PAYSTACK_SECRET_KEY` and direct write access to `payments`/`agreements`/`plots` must never leave this codebase's reviewed server-function layer — `CLAUDE.md`'s explicit rule ("Never write to `payments`, `agreements`, `bookings`, or mutate `plots.status` from client-side code... The browser is not trusted") treats any external system, n8n included, the same way it treats the browser.
- **Title-deed verification (`plot_title_verifications`) — do not automate the *check itself*.** Confirmed in `docs/CRM_CAPABILITIES.md` §5 (re-verified, not assumed stale): no public Ardhisasa API exists for third-party systems as of this research. Automating a *reminder to do the manual check* is fine (and scored above); fabricating an automated "verified" outcome is not.
- **Atomic plot reservation (`WHERE status='available'`) — never bypass with a workflow-side write.** This exact conditional-update pattern is what prevents two buyers racing for the same plot from both "winning." Any n8n workflow that needs to change a plot's status must call the existing `updatePlotStatusFn`/`recordVerifiedPayment` path via the API layer, never write the column directly.
- **FX rate updates — do not fully automate without a human check**, at least initially. Unlike the other money-adjacent items, there's no existing server function to "reuse" here (it's a bare admin form write) — a bad automated rate feed would silently mis-price every diaspora listing. If this is ever automated, it needs its own dedicated review, not folded into a general workflow.

---

# PHASE 3 — Architecture Evaluation

## Architecture A — Independent Automation Per Module

**Pros for Gatepath's actual structure**: matches the codebase's own existing convention of one file per domain (`leadsActions.ts`, `bookingActions.ts`, `commissionActions.ts`, ...) — a natural, low-coordination-overhead fit if each workflow only ever touches its own domain's tables.

**Cons, evidence-based**: the payment → signature → notification chain is **not isolated to one module** — it spans `payments` (Payments module), `offers`/`agreements` (Inquiries Queue module), and the notification layer (shared `notifications.ts`), with the CEO-signature gate sitting in between as a genuine human checkpoint the automation must respect, not route around. Under Architecture A, "payment verified" and "offer needs signing" would be two separately-triggered, uncoordinated workflows with no shared view of whether the CEO has acted yet — real risk of a duplicate reminder firing after the CEO has already signed, or a signed-Agreement notification firing before the payment-confirmation email has gone out. **Failure blast radius**: contained per-workflow (a broken commission-payout workflow can't touch the payment chain) — the one clear advantage — but at the cost of no single place to see "is the payment→signature→notify chain healthy today."

## Architecture B — Central Orchestration

**Pros**: one source of truth for the payment→signature→notify chain's state; the `automation_log` audit table (§4.3) becomes trivially complete since every event passes through the same place.

**Cons, evidence-based**: this project has **no existing central coordination layer to build on** — no message queue, no event bus, nothing beyond Postgres itself and 48 independent server functions (§1.2). Standing up true central orchestration means n8n becomes the single choke point for *every* downstream effect across a system that today has zero cross-module coordination at all — a much bigger first step than the system's current architecture, or its transaction volume, justifies. **Single-point-of-failure**: if the central orchestrator workflow has a bug, everything from a walk-in-lead SMS to a payment receipt stalls at once — for a single-CEO-approval, moderate-volume Kenyan land-sales business, this is disproportionate risk for the value gained on day one.

## Architecture C — Hybrid

**Pros, evidence-based**: matches how the codebase is *already* naturally split — Payments/Signatures/core notifications are already the one place in this app with cross-cutting, security-reviewed logic (`paymentActions.ts`, `inquiryActions.ts`'s CEO-gated functions) sitting apart from the ~15 independent, single-domain modules (Goals, Commissions, Tasks, Property Matching, etc., each already its own isolated `*Actions.ts` file with no cross-file dependency on another). The boundary between "central" and "independent" is therefore not a new design decision — it already exists in the codebase's own module boundaries.
- **Central orchestration** (one coordinated flow): payment verification → signature-gate check → post-signature notification chain, and CEO-facing alerts/escalations (since these need one place to know what's already been sent, to avoid duplicate CEO pings from 5 independently-firing escalation categories).
- **Independent workflows**: speed-to-lead, overdue-installment reminders, property-match alerts, referral/testimonial triggers, commission-payout candidate generation, goal digests — each already maps to exactly one existing, isolated server-function file, with no evidence anywhere of a real dependency on another module's write path.
- **Maps onto the existing architecture cleanly**: since there's no Edge Function layer and no message bus (§1.2/§1.3), "central" here means "these specific workflows share one `automation_log`-backed coordination table and are built/reviewed together," not a new piece of infrastructure — a distinction, not a new system.

## 3.1 Recommendation: **Architecture C — Hybrid**

Architecture A loses because the payment→signature→notify chain is real, evidenced, and already spans 3 files today (`paymentActions.ts`, `inquiryActions.ts`, `notifications.ts`) — treating it as "independent" would just recreate today's synchronous-and-uncoordinated pattern (§1.6's finding that every notification fires inline with no retry) inside n8n instead of fixing it. Architecture B loses because this system has zero existing coordination infrastructure to justify a system-wide single choke point on day one — the risk isn't worth it for a moderate-volume, single-CEO-approval business, and it would take longer to reach the first shipped workflow. Architecture C wins because the boundary it needs is a boundary the codebase already has (§1.2's module-per-domain server-function convention), so building it "hybrid" is the path of least new structure, not a compromise.

---

# PHASE 4 — Enterprise Automation Blueprint

## 4.1 Error Handling Standard

**Failure categories**, distinguished per Gatepath's own current code shape:
- **Transient** (network blip, provider rate-limit, momentary Supabase unavailability) — safe to retry automatically.
- **Permanent** (invalid phone number, revoked API key, a business-rule rejection like "that day is fully booked" from `createFreeSiteVisitBookingFn`) — retrying changes nothing; must go to manual review, not a retry loop.
- **Payment-class** (anything touching `payments`/`offers`/`agreements`) — even a "permanent" failure here must **never** silently drop; every one becomes a CEO-visible item, since §2.3 already establishes this is the one class of failure with real legal/revenue consequence.
- **Notification-class** (a reminder/alert send failing) — lower stakes; the underlying business fact (an overdue installment, a stalled lead) is unaffected by the notification itself failing, so these fail into `automation_log` and a periodic digest, not an immediate page.

**Dead-letter path**: every workflow's final retry exhaustion writes an `automation_log` row with `outcome='failed'` and a sanitized `error_message` (no PII — matches `automation_log`'s design in the prior planning pass). For payment-class failures specifically, this also triggers an immediate CEO notification via the existing `sendResendEmail`/`sendAfricaTalkingSms` functions — reusing infrastructure, not inventing a second alert channel.

**Surfacing to staff**: `/admin/notifications` (`admin.notifications.tsx`, §1.1) already exists as the one screen built to aggregate "things needing attention" — a 6th category ("Automation Failures," reading `automation_log` where `outcome='failed'`) is a natural, small extension of an already-built screen rather than a new admin surface.

## 4.2 Retry Policy

| Integration | Idempotency guard already in code | Retry approach |
|---|---|---|
| Paystack verify | `payments.paystack_reference` unique, upsert `onConflict` (`paymentActions.ts`) — **already idempotent**, confirmed | n8n retry not needed on the verify call itself; needed only on the *notification* that follows a verified payment |
| SMS send (Africa's Talking) | None built — `sendAfricaTalkingSms` has no dedupe of its own | n8n native exponential backoff, 3 attempts, on the send node only — never retry the whole workflow (§4.1's payment-vs-notification split) |
| Email send (Resend) | None built | Same as SMS |
| `/api/v1/*` calls from n8n | `api_keys.last_used_at` tracked, but no request-level dedupe | Idempotency achieved at the `automation_log` claim-row level (§3.4 of the prior plan), not per-HTTP-call |

Max attempts: 3 for provider sends (matches this session's own established "3 retries" convention nowhere explicit in code but consistent with how `MediaDropzone.tsx`'s upload retry-on-error UX was scoped in this session's prior work) — a number to confirm with you rather than treat as fixed.

## 4.3 Logging & Monitoring

**No `sms_logs`-equivalent table exists today** — confirmed via grep, this is one place your framing and the code disagree: there is no send-history table for either Resend or Africa's Talking sends. `admin.integrations.tsx`'s own connection-status panel already states this plainly ("send history isn't logged" — a real, disclosed gap from this session's Phase 24). **Recommendation**: `automation_log` (schema proposed in the prior planning pass, §3.4) becomes the first real send-history log this system has ever had, superseding the need for a separate `sms_logs` table rather than adding a second one.

**Audit trail**: `audit_log` (migration `0013`) already exists for **human** staff actions (4 server-function files wired in: Document Vault, Buyer Preferences, Tasks, Escalations). `automation_log` is a deliberately separate table for **workflow** executions — different actor model, different query pattern (ops health vs. compliance history). For money- and legal-touching flows (the Paystack webhook, e-signature-adjacent notifications), every workflow run writes to *both*: `automation_log` for the execution record, and — where the workflow itself causes a state change a human would care about — the existing `audit_log` via the same `logAuditEvent` helper (`src/lib/auditLog.ts`) already wired into 4 files, extended to a 5th once a workflow needs it.

**Alerting**: payment-class failures → CEO immediately (§4.1). Everything else → a daily digest (reusing `sendExecutiveReportFn`'s existing pattern of a manually-triggered summary email, now given a scheduled trigger for the first time — see §4.5's note on this being the system's first-ever scheduler).

**Health-check / heartbeat**: **[ASSUMPTION — VERIFY]** no health-check convention exists anywhere in this codebase to extend (no `/healthz`, no uptime-monitoring integration found). Recommend n8n's own workflow-execution history plus a lightweight daily "did the speed-to-lead workflow run today" check as the very first heartbeat, not a new monitoring platform — needs your confirmation this is sufficient for now.

## 4.4 Credential & Secret Management

**Every secret this system currently uses**, inventoried from actual code references (not assumed):

| Secret | Read at | Current store |
|---|---|---|
| `PAYSTACK_SECRET_KEY` | `paymentActions.ts:29` | `.dev.vars` (local) / Cloudflare Worker encrypted secret (production) |
| `SUPABASE_SERVICE_ROLE_KEY` | `supabaseAdmin.ts:21` | Same |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | `notifications.ts:88,91` | Same |
| `AFRICAS_TALKING_API_KEY`, `AFRICAS_TALKING_USERNAME`, `AFRICAS_TALKING_SENDER_ID` | `notifications.ts:21,25,29` | Same |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_PAYSTACK_PUBLIC_KEY` | Client-safe by design (`VITE_` prefix) | Same, but these are meant to be public |

**Explicit rule for the two most sensitive secrets, restated from the prior planning pass and unchanged**: `SUPABASE_SERVICE_ROLE_KEY` and `PAYSTACK_SECRET_KEY` **never leave this codebase's own server environment** — not into n8n's credential vault, not as an n8n environment variable, not even a scoped derivative of either. n8n's only credential for talking to Gatepath is a dedicated `api_keys` row (Phase 24 primitive, §1.2), scoped per workflow, revocable, hashed at rest — the exact mechanism already built and already flagged in this codebase's own comments as "the foundation that bridge will eventually call" (`admin.integrations.tsx`).

**Least privilege per workflow**: each n8n workflow gets its **own** `api_keys` row with the minimum scope it needs (e.g., a stalled-lead-escalation workflow gets `leads:read` + `leads:write`, never `plots:read` it doesn't use) — never one shared key across workflows, since a single compromised key's blast radius should be legible from its own scope list alone.

## 4.5 Deployment & Environment Strategy

**[ASSUMPTION — VERIFY]**: this codebase has exactly one deployed environment today (production, via `npm run deploy` → `vite build && wrangler deploy`, confirmed in `package.json`) — no staging environment, no CI pipeline (`.github/workflows/` does not exist, confirmed earlier this session), no automated tests. This is a real constraint on what "dev/staging/production separation for n8n" can mean in practice: **there is currently nowhere to stage against except production itself**, unless a second Cloudflare Worker + a second (or schema-isolated) Supabase environment is stood up specifically for this — a real infrastructure decision, not a code one, and outside what this planning pass can resolve on its own.

**Recommendation given that constraint**: n8n itself should run at least 2 workspaces/environments (test, production) even though the *application* it talks to only has one — test workflows against a small number of manually-created test records in the real database (clearly tagged, e.g. a test inquiry with a recognizable name), never against real client data, until a true staging environment exists. This is a deliberate trade-off, flagged rather than glossed over.

**Versioning/promotion/rollback**: n8n's own workflow version history (native) plus this plan's `workflow_key` naming convention (`<domain>-<name>-v<n>`, from the prior planning pass) — a version bump on any meaningful behavior change, so `automation_log` rows stay honestly attributable.

**Connection security**: Paystack → Gatepath via the new signed webhook (§7 of the prior security plan, unchanged — HMAC-SHA512 over the raw body). Supabase → n8n via Database Webhooks with a shared secret header. n8n → Gatepath via the scoped `api_keys` bearer token. No component in this chain requires a new network primitive beyond what Cloudflare Workers, Supabase, and n8n already natively support.

## 4.6 Phased Roadmap

Entry/exit criteria and risk-gating, building on the priority validation already done in the prior planning pass (`AUTOMATION_PLAN.md` §5), restated with entry/exit criteria per phase:

**Phase 1 — Speed-to-lead**
- Entry criteria: `automation_log` table exists (migration written and reviewed); one `api_keys` row minted for this workflow, scoped `leads:read`+`leads:write`.
- Automations: new-lead SMS/email to the assigned agent; SLA timer; escalate to `/admin/notifications` if untouched.
- Exit criteria: a real test inquiry, end to end, produces exactly one agent notification and one `automation_log` success row, with a second identical Database Webhook delivery producing a `skipped_duplicate` row, not a second SMS.
- Risk gate: none — no payment/signature adjacency.

**Phase 2a — Real Paystack webhook** (security work, not n8n orchestration — see §2.3)
- Entry criteria: reviewed separately from any n8n workflow, per `CLAUDE.md`'s "commit security changes separately" rule.
- Exit criteria: a real Paystack sandbox transaction, abandoned mid-tab-close, still results in a correctly recorded payment via the webhook path, with signature verification provably rejecting a tampered payload.
- **Risk gate: highest in this roadmap. Sequenced early specifically because §2.3 places it outside n8n's reach entirely — it is Gatepath's own code, reviewed the same way Phase 1 security work was reviewed earlier this session, and its correctness gates everything that reads `payments` downstream.**

**Phase 2b — Payment orchestration on top of 2a**
- Entry criteria: 2a shipped and verified live.
- Automations: receipt send, CEO alert on large/late payment — reusing 2a's already-correct write, never re-verifying or re-writing.
- Exit criteria: a real verified payment (via either the client-verify or new webhook path) produces exactly one receipt and, above a configurable threshold, exactly one CEO alert.

**Phase 3 — Overdue/dunning**, **Phase 4 — Escalation push**, **Phase 5 — Referral/testimonial trigger**: each reuses an already-built manual send function (§2.1/§2.2) — lowest-effort tier, sequenced next specifically because they're proven-safe, human-reviewed code paths being given a new trigger, not new logic.

**Phase 6 — Property-match auto-alert, booking lifecycle sends**: new trigger logic, still non-payment-adjacent — medium tier.

**Phase 7 — Agent scoring (nightly, if approved)**: gated entirely on your decision in the prior plan's §6.1 — **not started without it**, since it reverses a documented design choice.

**Phase 8 (last, explicitly)** — anything touching Meta/IG Lead Ads or WhatsApp Business inbound capture: **blocked on a vendor account that does not exist**, not a build-order choice — placed last because it cannot start regardless of sequencing.

The highest-risk item (2a, the real webhook) is placed early rather than last **on purpose** — it's the one item in this roadmap that is a pure correctness/security fix independent of n8n, and every subsequent payment-adjacent workflow (2b and anything downstream of a "payment verified" event) is only as trustworthy as that fix. "Highest-risk last" in your brief is honored for the *automation-layer* risk (CEO signature, title verification — never automated at all, §2.3) — it doesn't apply to a security fix that has to exist before its own downstream automations can safely be built.

---

# PHASE 5 — Executive Summary & Backlog

## 5.1 Executive Summary

**For Joe Muchiri — plain-language, no technical detail required to approve direction.**

**Where things stand today**: Gatepath's CRM already does a lot of real work — real lead tracking, real payment verification, real e-signatures, a real 13-stage client portal. What it doesn't have yet is anything that runs *on its own*. Every reminder, every alert, every "someone should follow up on this" moment today depends on a staff member noticing and clicking a button. The system already knows when a lead has gone quiet for a week, when an installment is overdue, when a buyer's dream plot just became available — it just doesn't tell anyone unless they go looking.

**The biggest real risk found while auditing** (not an automation gap — a live issue): if a buyer completes a Paystack payment but closes their browser tab before the confirmation finishes, that payment can be missed entirely. This has nothing to do with n8n — it needs a small, separate fix to Gatepath's own payment code, and it's the very first thing on the roadmap below because everything else depends on payments being trustworthy.

**Recommended approach**: a hybrid model — most automations run independently (a lead alert doesn't need to know about a commission payout), but anything touching money, signatures, or CEO alerts shares one coordinated, logged path so nothing duplicates or gets lost silently.

**The plan, at a glance**: fix the payment gap first (security, not automation). Then start with the cheapest, safest wins — notify an agent the moment a lead comes in, and push existing "someone needs to look at this" alerts to phone/WhatsApp instead of requiring someone to open the dashboard. Then layer in overdue-payment reminders, referral requests, and property-match alerts — all of which already exist as one-click staff actions today; automation just means they fire on their own. The riskiest things — your signature on a contract, and manually verifying a title deed — are **never** automated, by design, and stay exactly as manual as they are today.

**Expected impact**: faster response to every lead (today's average response time is untracked and unmanaged), fewer missed follow-ups, less of your own time spent on routine reminders and status-checking, and a real, auditable record of what the system did and when — something that doesn't exist at all today.

**Top 3 risks, and how this plan handles them**:
1. **A third-party automation tool (n8n) becomes a new way for something to go wrong.** Handled by never giving it your payment secret key or direct database write access — it only ever talks to Gatepath through a scoped, revocable key, the same kind of access you'd give a limited-permissions staff account.
2. **An automation fires twice, or not at all, and nobody notices.** Handled by a new log of every automated action taken (or attempted and failed) — something this system has never had before, for any of its notifications.
3. **Automation quietly takes over something that should require your explicit sign-off.** Handled by an explicit list (this document's §2.3) of things that are never automated — your signature, the title-deed check, and the plot-reservation logic that prevents double-selling a plot.

## 5.2 Future n8n Workflow Backlog

Each ticket is precise enough to build unambiguously later — none are built now.

---
**WF-01 — Speed-to-Lead**
- Trigger: Database Webhook on `inquiries` INSERT.
- Outcome: SMS/email to the newly-assigned agent (or a "needs assignment" alert if `cro_name` is null); if untouched (no `interaction_log` row, no status change) within an agreed SLA window, escalate.
- Systems touched: `inquiries`, `interaction_log`, `automation_log`, Resend/Africa's Talking (via Gatepath's own send functions, not n8n's own credentials).
- Value/Risk/Effort: High / Low / Low.
- Dependencies: `automation_log` table exists; one scoped `api_keys` row.
- Phase: 1.

**WF-02 — Real Paystack Webhook** *(security fix, ships as Gatepath code, not an n8n workflow — listed for roadmap completeness)*
- Trigger: Paystack `charge.success` event.
- Outcome: verified payment recorded via the existing `recordVerifiedPayment`, closing the abandoned-tab gap.
- Systems touched: new `server.ts` route, `paymentActions.ts` (reused, not modified).
- Value/Risk/Effort: High / High / Medium.
- Dependencies: none — this is the dependency for WF-03.
- Phase: 2a. **NOT to be built until reviewed and shipped as its own, separately-committed security change.**

**WF-03 — Payment Reconciliation Orchestration**
- Trigger: Database Webhook on `payments` INSERT (fires only after WF-02 or the existing client-verify path writes a row).
- Outcome: receipt send; CEO alert if amount exceeds a configurable threshold or payment lands outside business hours.
- Systems touched: `payments`, notification functions, `automation_log`.
- Value/Risk/Effort: High / Medium / Low.
- Dependencies: WF-02 shipped and verified live.
- Phase: 2b. **NOT to be built until WF-02 is live and confirmed correct.**

**WF-04 — Overdue Installment Auto-Reminder**
- Trigger: scheduled scan (n8n cron — this system's first scheduler).
- Outcome: calls the existing `sendPaymentReminderFn` for every account `findOverdueInstallments` flags.
- Systems touched: `payments`, `inquiries`, existing notification function.
- Value/Risk/Effort: High / Medium / Low.
- Dependencies: `automation_log`; a scoped `api_keys` row with whatever new read scope this needs (none of today's scopes cover installments — a new one is needed).
- Phase: 3.

**WF-05 — Escalation Push**
- Trigger: scheduled scan, re-running the exact 5 functions in `escalations.ts`.
- Outcome: SMS/WhatsApp to relevant staff instead of requiring a visit to `/admin/notifications`.
- Systems touched: `inquiries`, `bookings`, `interaction_log`, `offers`/`agreements`.
- Value/Risk/Effort: High / Low / Low.
- Dependencies: none new — detection logic already exists.
- Phase: 4.

**WF-06 — Referral & Testimonial Auto-Trigger**
- Trigger: Database Webhook on `agreements` UPDATE where `ceo_signed` transitions to true (i.e., a deal reaches "fully paid" per this schema's own definition, restated honestly — not the literal title-deed handover, which isn't tracked anywhere).
- Outcome: calls existing `sendTestimonialRequestFn`/`sendReferralInviteFn` verbatim.
- Systems touched: `agreements`, `inquiries.testimonial_requested_at`/`referral_invite_sent_at`.
- Value/Risk/Effort: Medium / Low / Low.
- Dependencies: none new.
- Phase: 5.

**WF-07 — Property-Match Auto-Alert**
- Trigger: Database Webhook on `plots` UPDATE where `status` changes to `available`, or `buyer_preferences` INSERT.
- Outcome: recomputes matches via the existing `propertyMatching.ts` logic, calls existing `sendMatchAlertFn`.
- Systems touched: `plots`, `buyer_preferences`.
- Value/Risk/Effort: Medium / Low / Low.
- Dependencies: none new.
- Phase: 6.

**WF-08 — Booking Lifecycle Sequence**
- Trigger: `bookings` INSERT (confirmation), scheduled scan (reminder 24-48h before `visit_date`).
- Outcome: confirmation send (new logic — today's single notification isn't a sequence); reminder send.
- Systems touched: `bookings`.
- Value/Risk/Effort: Medium / Low / Low-Medium.
- Dependencies: none new.
- Phase: 6.

**WF-09 — Nightly Agent Score Recompute**
- Trigger: scheduled (nightly).
- Outcome: stores a `lead_scores`-equivalent snapshot instead of computing live.
- Systems touched: `inquiries`, a new table not yet designed.
- Value/Risk/Effort: Low-Medium / Low / Medium.
- Dependencies: **explicit user sign-off** — reverses a deliberate existing design choice (Phase 12's "live, never stored").
- Phase: 7. **NOT to be built until you've confirmed you want scores stored, not just computed live.**

**WF-10 — Newsletter Send Capability + Trigger**
- Trigger: manual send initially; Hot-Pick-published event later.
- Outcome: an actual send mechanism to `newsletter_subscribers` — **does not exist in any form today**.
- Systems touched: `newsletter_subscribers`, a new template/send function.
- Value/Risk/Effort: Medium / Low / Medium.
- Dependencies: the base send capability must be built (new Gatepath code) before any automation trigger makes sense.
- Phase: 9.

**WF-11 — Client Post-Visit Feedback Survey**
- Trigger: `bookings.status='completed'`.
- Outcome: a client-facing survey send — **does not exist today** (distinct from staff-internal `staff_feedback`).
- Systems touched: `bookings`, a new response-capture mechanism.
- Value/Risk/Effort: Medium / Low / Medium.
- Dependencies: new capability, not just a trigger.
- Phase: 9.

**WF-12 — Omnichannel Lead Capture (Meta/IG/WhatsApp)**
- Trigger: N/A.
- Outcome: N/A.
- Systems touched: N/A.
- Value/Risk/Effort: Medium-High / N/A / N/A.
- Dependencies: **a Meta Business / WhatsApp Business account, which does not exist.**
- Phase: **Not phased. Explicitly blocked, not scheduled, until that account exists.**

---

## Findings While Auditing (outside automation scope, flagged per your instruction)

1. **`src/routes/privacy.tsx:443`** publicly states *"Admin access requires multi-factor authentication (MFA)."* Confirmed false — no MFA/TOTP implementation exists anywhere in this codebase. Live, public misrepresentation on the privacy policy page. (Carried forward from the prior planning pass — still unfixed.)
2. **`zod` is a declared dependency (`package.json`) but is imported in zero files under `src/`.** Every server function's `.validator()` is a TypeScript type annotation with no runtime enforcement — confirmed via grep, not assumed.
3. **No rate limiting exists anywhere** (admin login, portal OTP request, `/api/v1/*`) — confirmed via a repo-wide grep for `rateLimit`/`rate-limit`, zero matches.
4. **No app-level idle or absolute session timeout on admin sessions** beyond whatever the Supabase project's own (unverifiable from code) Auth settings provide — `src/lib/supabase.ts:34-35` shows default `autoRefreshToken: true, persistSession: true` with no additional enforcement layered on top.
5. **`docs/DATABASE_SCHEMA.md` line 11 already flags a live contradiction**: `CLAUDE.md` states money is stored in integer minor units; the actual implementation stores major-unit decimal KES everywhere. Unresolved, not something this pass changes, but directly relevant to any future automation doing money math.
6. **`agreements.pdf_agreement_url`/`pdf_receipt_url` are dead columns** — never populated by any code path (confirmed, `docs/DATABASE_SCHEMA.md` lines 168-169) — any future integration expecting a downloadable PDF artifact from this schema will find nothing there; documents are live-rendered HTML only.
7. **No scheduled job / cron / trigger mechanism exists anywhere in this stack today** (§1.3) — every "automated" send in the current system fires synchronously inline with the write that triggers it, with no retry if it silently fails. Module 3 is not just adding intelligence on top of an existing scheduler; it introduces the concept of a scheduler to this system for the first time.
