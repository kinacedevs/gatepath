# Gatepath Realtors — CRM/Admin State Audit (Phase 0)

Read-only audit, no code changes. Written in response to the "dark brand console" redesign brief. Every claim below is sourced to an exact file:line — this is the factual baseline the Phase 1–3 redesign plan must reconcile against, not a proposal.

---

## 1. Redesign history (`git log --oneline --graph --all`)

Linear history, no merges — everything lives on one line per era:

- **`main`** — frozen Lovable-era baseline, last real commit `308b665` ("Phase 4 — Supabase integration"). Do not commit here (per `CLAUDE.md`).
- **`wip/antigravity-gemini`** — a single preserved snapshot commit (`5fc735f`) of an uncommitted Antigravity/Gemini working tree found at the start of this rebuild. Salvage source only, not active.
- **`redesign/ecosystem-v2`** (current branch, 19 commits ahead of `origin/redesign/ecosystem-v2`) — every commit since `5fc735f`: security P0 fixes (Supabase Auth on `/admin`, verified Paystack payments, portal OTP lockdown, RLS lockdown on all 11 original tables), the token/palette fix (`3d2ba7b` — **removed** a Stitch-imported Material-3 dark palette, restored the warm light brand), diaspora hub restore, landing-page rebuild, and the Phase 5A/5B/5C CRM rebuild (`76f129c`, `7a9d362`, `863ec4d`) plus this session's Phase 7 offer/agreement business-logic correction (uncommitted as of this audit).

**The one commit most relevant to this new brief is `3d2ba7b`**: *"design: restore warm brand palette, remove Stitch Material-3 tokens, tokenize hex literals"*. That commit's target was a dark, near-black `#0d1c32`/bright-gold `#fed65b` palette that had been imported from a Stitch export — removed because it drifted off-brand and was never reconciled with the CEO's actual brand spec. This is flagged in detail in §7 below, since the new brief's dark console again proposes a dark app background for admin.

Working tree currently has this session's uncommitted Phase 7 work (offer/agreement business-logic fix) — `git status` shows modified `InquiryContext.tsx`, `paymentActions.ts`, `types.ts`, `routeTree.gen.ts`, `admin.inquiries.tsx`, `document.agreement.$id.tsx`, `inquire.tsx`, plus untracked `document.offer.$id.tsx` and `supabase/migrations/0005_offers_and_kin_fields.sql`. Not committed yet — flagging so it isn't lost or conflated with new redesign commits.

---

## 2. Admin route inventory — 16 routes + shell

| Route | Data (tables) | Writes | Visual style |
|---|---|---|---|
| `admin.tsx` (shell) | `admin_users` (role lookup) | none (pure auth) | Third idiom: inline `style` using `var(--...)` CSS vars, confined to login/loading screens |
| `AdminShell.tsx` (nav chrome) | — | — | **Redesigned** — token Tailwind classes |
| `admin.index.tsx` (dashboard) | `payments`, `bookings`, `phases`, `inquiries` | none, read-only | **Redesigned** |
| `admin.leads.tsx` (Kanban) | `inquiries`, `bookings` | `updateInquiryStatusFn` server fn | **Redesigned**, real `@dnd-kit` drag-drop |
| `admin.plots.tsx` | `phases` (+ media URLs), `plots`, `plot_sizes` | media-URL `.update()` direct client, no role gate (`admin.plots.tsx:108,149`) | **Redesigned**, real `@tanstack/react-table` |
| `admin.plots.$plotId.tsx` | `plots`, `plot_sizes`, `plot_title_verifications`, `inquiries` | `logPlotTitleVerificationFn` server fn | **Redesigned** |
| `admin.installments.tsx` | `inquiries`, `payments` | `sendPaymentReminderFn` server fn | **Redesigned** |
| `admin.contacts.tsx` | `inquiries`, `payments`, `plots`, `plot_title_verifications` | none, read-only | **Redesigned** |
| `admin.inquiries.tsx` | `inquiries`, `agreements`, `offers`, `payments` | direct client `.update()` for approve/reject/sign (`:90-180`) | **Legacy** — `NAVY = "#0C1A30"` (`:35`) |
| `admin.deals.tsx` | `agreements`, `inquiries` | none, read-only | **Legacy** — `NAVY` hex |
| `admin.bookings.tsx` | `bookings` | direct client `.update()` status (`:54-57`) | **Legacy** — `NAVY = "#0C1A30"` (`:24`) |
| `admin.staff.tsx` | `admin_users` | `inviteStaffFn` server fn, add-only (no edit/revoke) | **Legacy** — `NAVY` (`:23`) |
| `admin.blog.tsx` | `blog_posts` | direct client insert/update/delete (`:82-119`), gated only by client-side `adminRole==="agent"` block | **Legacy** — `NAVY` (`:20`); **unreachable from the nav** (see §7) |
| `admin.agents.tsx` | `admin_users`, `inquiries`, `agreements` | none, read-only | **Legacy** — `NAVY` (`:19`) |
| `admin.meetings.tsx` | `bookings`, `inquiries` | **none — Reschedule/Complete buttons have no `onClick` handler at all** (`:95-96`, explicitly documented as inherited-nonfunctional) | **Legacy** — `NAVY` (`:22`) |
| `admin.campaigns.tsx` | `phases`, `affiliates` | direct client `.update()` on `phases` media fields, **zero role gate** (`:61-85`) | **Legacy** — `NAVY` (`:20`) |
| `admin.settings.tsx` | none — fully static placeholder | none — "Update Profile" button is `disabled`, toggles are fake `<div>`s | **Legacy** — `NAVY` (`:16`) |

**Tally: 2 of 16 screens (`admin.index`, `admin.leads`) plus `AdminShell` are on the token-driven design system from Phase 5A. 7 screens are the untouched `NAVY = "#0C1A30"` inline-style legacy from before this session's rebuild. The remaining screens (plots ×2, installments, contacts, inquiries, deals) are functionally rebuilt but each hand-rolled — no shared component kit (no shared KPI card variant reused everywhere, no shared data-table wrapper).** This confirms the brief's premise: the console is functional but visually inconsistent, and a real component kit (Phase 1) is warranted.

---

## 3. Data model

Full type definitions: `src/lib/types.ts`. Core tables: `phases`, `plot_sizes`, `plots`, `inquiries`, `bookings`, `payments`, `agreements`, `offers` (added this session, Phase 7), `admin_users`, `blog_posts`, `affiliates`, `site_banners`. Supporting tables from migrations: `plot_title_verifications` (0004), `client_otps` + `portal_sessions` (0003).

**No tracked baseline DDL exists** for the original 9 tables — they were created directly in the Supabase Dashboard before migration tracking started. Migrations 0001–0005 only add RLS policies and net-new tables/columns. Any schema change in Phase 3 needs a fresh migration with no baseline `CREATE TABLE` to build on for existing tables — every `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` must be written blind against the Dashboard-managed schema, not derived from a migration history.

---

## 4. Current pipeline/stage logic — vs. the requested 13 stages

**Three separate, uncoordinated status concepts exist today, none of which is the 13-stage model:**

1. **`inquiries.status`** (`"pending" | "reviewed" | "approved" | "rejected"`, `types.ts:105`) — the pre-sale lead funnel, driving `admin.leads.tsx`'s Kanban. Roughly covers Appendix B stages 1–3 (Lead Captured/Contacted/Qualified) but conflates them into one enum with no timestamp-per-transition, no actor stamp, and no audit log — just the row's own `updated_at`.
2. **`offers`/`agreements` tables** (added this session, Phase 7) — `offers.ceo_signed`/`ceo_signed_at` and `agreements.ceo_signed`/`ceo_signed_at` cover Appendix B stage 7 (Sale Agreement Issued & Signed) and implicitly stages 6/8 (deposit received → Offer; full payment → Agreement), via `paymentActions.ts`'s `recordVerifiedPayment`. No `actor_id` is stamped on creation (server-inserted, not staff-attributed) and there's no append-only audit trail — each table holds current state only, not a history of transitions.
3. **`src/lib/conveyancing.ts`'s `CONVEYANCING_STAGES`** — a **hardcoded 5-stage array** (Payment Verification → Cadastral Survey → Sales Agreement → Stamp Duty & Search → Title Deed Issued), shared between the public landing page and the client portal. Critically: **there is no stored `current_stage` column anywhere** — `portal.tsx` derives "which stage am I on" client-side from `paidPct` (sum of successful payments ÷ `inquiries.price`), which conflates stages 2–4 (a client at 40% paid looks identical to a client at 95% paid, both "mid-pipeline," with no way to distinguish cadastral survey from stamp-duty filing).

**Gap against Appendix B's 13 stages, stage by stage:**

| # | Appendix B stage | Current coverage |
|---|---|---|
| 1 | Lead Captured (source/campaign/UTM) | **Missing.** `inquiries` has no `source`, `channel`, `campaign`, or `utm_*` columns. Only `heard_from` (free-text dropdown) and `referred_by`/`referral_code_used` exist. |
| 2 | Lead Assigned | **Partial.** `inquiries.cro_name`/`cro_phone` (free text, no FK to `admin_users`, no `assigned_by`, no `assigned_at`) is the only assignment signal. |
| 3 | Contacted & Qualified | **Missing.** No interaction log table exists at all (see Appendix C gap below) — `inquiries.status="reviewed"` is the closest proxy, a single enum flip with no budget/cash-vs-installment/needs capture beyond what's already in the inquiry form. |
| 4 | Site Visit Scheduled | **Covered** — `bookings` table, `visit_date`/`visit_time`/`status`. |
| 5 | Site Visit Completed (GPS-verified, feedback) | **Partial.** `bookings.status` can reach `"completed"`, but there is no GPS field and no feedback field on the table — confirmed via `types.ts:110-122`. |
| 6 | Plot Reserved (booking fee/deposit) | **Covered** — first successful `payments` row + `offers` row (Phase 7). |
| 7 | Sale Agreement Issued & Signed | **Covered**, but PDF delivery is print-to-PDF only (§6) — no automated email/WhatsApp dispatch of the signed document exists; `sendAgreementSignedNotificationFn` sends a notification, not the PDF itself. |
| 8 | Deposit Confirmed / Payment Plan Active | **Covered** — `offers` row + `inquiries.terms_of_payment`. |
| 9 | Installments In Progress (multi-currency) | **Partial.** Tracked in KES only — `payments.currency` column exists (`types.ts:133`) but every write in `paymentActions.ts` hardcodes `amount` as the raw Paystack-verified KES figure with no `fx_rate_at_time`/`amount_kes` split (Appendix E gap, see §8). |
| 10 | Full Payment Cleared | **Covered** — `agreements` row creation gate (Phase 7, this session). |
| 11 | Completion Documents (LCB consent, valuation, stamp duty) | **Missing entirely.** No table, no fields, no UI. |
| 12 | Transfer & Registration | **Missing entirely.** |
| 13 | Title Deed Issued & Handover | **Partial** — `plot_title_verifications` (migration 0004) logs a manual Ardhisasa-style title check, but that's a *pre-sale* verification the company runs on its own inventory, not a *post-sale* handover-confirmation record for a specific buyer. No signed-handover-confirmation table exists. |

**Bottom line: the current system has real coverage for roughly stages 4, 6, 7, 8, 10, and partial coverage for 2, 5, 9, 13. Stages 1, 3, 11, 12 have no schema at all.** This is the honest gap Phase 3's pipeline expansion has to close — it is a genuinely large schema undertaking, not a relabeling exercise.

---

## 5. Payment path — important terminology correction vs. the brief

The brief's Appendix H assumes **"Supabase Edge Functions"** and **"Verify Paystack webhooks by HMAC signature."** Neither exists in this codebase today, and the actual architecture is meaningfully different:

- **No `supabase/functions/` directory exists** (confirmed). There are no Supabase Edge Functions anywhere in this project.
- **Payment confirmation is a client-triggered verify call, not a Paystack-initiated webhook.** The flow is: Paystack's browser popup fires a success callback → the client calls the TanStack Start server function `verifyPaymentFn` (`src/lib/paymentActions.ts:192-204`) → that function re-confirms the transaction against Paystack's own `/transaction/verify/:reference` REST endpoint server-side (`:26-47`) using `PAYSTACK_SECRET_KEY`, then writes via `getServiceClient()` (service role, bypasses RLS). This is genuinely secure against a forged client-side amount (the exact CRITIQUE P0-2 fix), **but it is not equivalent to a real Paystack webhook**: if the buyer closes the tab or loses connectivity between Paystack's popup closing and the verify call completing, the payment can be confirmed on Paystack's side with no corresponding write on Gatepath's side, and nothing will ever retry it. A true webhook (Paystack POSTs to a public endpoint the moment it settles, independent of the buyer's browser session) is the correct architecture reference and does not exist yet.
- **`grep -ril "webhook" src` returns exactly one hit** — a comment in `paymentActions.ts` describing what it fixed, not an implementation.

**This matters directly for the brief's n8n-readiness goal**: n8n workflows typically trigger off real webhooks (Paystack → n8n, or Gatepath → n8n). Today there is no webhook receiver anywhere in the stack for n8n to plug into on the payment side — this is a real Phase 3 build item, not already-existing plumbing that just needs a UI.

---

## 6. RLS policies — full inventory (migrations 0001–0005)

All policies use `public.is_admin()` (`0001_admin_auth_and_rls.sql:41`), a `SECURITY DEFINER` function checking the caller's JWT email against `admin_users`.

| Table | Public/anon access | Admin access | Notes |
|---|---|---|---|
| `phases`, `plot_sizes` | public select | admin insert/update/delete | |
| `plots` | public select; admin update only (anon update **closed** in 0002) | admin insert/delete | Prevents client-side double-booking; only `paymentActions.ts`'s atomic conditional update and manual admin edits can change status |
| `inquiries` | public **insert only** | admin select/update/delete | PII (KRA PIN, national ID) is fully RLS-protected from anon reads |
| `bookings` | public insert only | admin select/update/delete | |
| `payments` | **no anon insert** (closed in 0002 — `payments_public_insert_TEMP` dropped) | admin select/update/delete | Only the service-role client (`paymentActions.ts`) writes here now |
| `agreements` | **no anon insert** (closed in 0002) | admin select/update/delete | |
| `offers` (new, 0005) | **no anon access at all** — no insert policy, admin-only select + update | — | Stricter than `agreements`: nothing in the browser ever creates an offer, by design |
| `admin_users` | none | admin select; CEO-only insert | |
| `blog_posts` | public select **where `status='published'`**, or admin (any status) | admin insert/update/delete | |
| `affiliates` | public insert (signup) | admin select/update/delete | |
| `site_banners` | public select | admin insert/update/delete | **RLS is ready; no admin UI uses it** (§7) |
| `client_otps` | **none — service-role only**, RLS enabled with zero policies (0003) | — | |
| `portal_sessions` | **none — service-role only** (0003) | — | |
| `plot_title_verifications` (0004) | none | admin select only; **all writes via `logPlotTitleVerificationFn`**, no direct-client insert/update policy at all | |

**Known deliberate gaps** (documented in `docs/SECURITY_HARDENING.md`, not touched by this audit): none currently open beyond what's listed above — the `_TEMP` anon-insert policies on `payments`/`agreements` were the last ones, closed in migration 0002.

---

## 7. Design tokens — current state, and the palette conflict to resolve

`src/styles.css` (344 lines) defines the **light** brand theme as `:root` CSS variables, consumed via a Tailwind v4 `@theme inline` block:

```
--background: #F8F4EE   (warm ivory)
--primary: #0B7FC7      (cerulean — dominant blue)
--primary-deep: #074B7D (deep navy — "depth/accents only, never the dominant surface", styles.css:70)
--accent: #E8A020       (warm gold)
--accent-dark: #C8861A
```

A second `@theme inline` block (`styles.css:225-307`) maps Material-3-style semantic names (`--color-primary-container`, `--color-surface`, etc.) that `admin.tsx`/`AdminShell`/the redesigned screens reference as Tailwind utility classes (`bg-primary-container`, `text-on-surface-variant`) — **these already resolve to the light brand values above** (`--color-primary-container: var(--primary-deep)`, `--color-surface: var(--background)` i.e. ivory). There is no separate "admin dark mode" token set today; admin and the public site share one light palette.

**`CLAUDE.md` currently states, as brand law**: *"Deep Navy — Depth and accents only — never the dominant surface"* and *"Ivory — Page background"*, with an explicit **"Resolved conflicts — do not reintroduce"** section naming the exact dark palette (`#0d1c32`, `#2b1701`) that was removed in commit `3d2ba7b` for causing "dark-navy drift away from the intended warm light blue that blends with gold."

**The new brief's dark console palette is not that same off-brand palette** — it explicitly derives from the real brand tokens (`#074B7D` deep navy as elevated surface, `#0B7FC7` cerulean as data/links, `#E8A020` gold unchanged), not arbitrary Stitch hex values. That is a materially different, more defensible proposal than what was rejected. **But it still directly contradicts the currently-written CLAUDE.md rule** that Deep Navy is "never the dominant surface" and that Ivory is the page background — because the brief makes Deep Navy-derived near-black (`#041A2E`/`#05233B`) the dominant admin surface. This is a real, load-bearing documentation conflict, not a style nitpick: CLAUDE.md is read automatically every session as the brand contract. **Flagging per the brief's own instruction to "flag risks loudly" and to resolve the gold conflict before finalizing tokens** — the gold conflict is trivially resolved (one gold, `#E8A020`, already true), but the light-vs-dark admin-console question is the real decision this audit surfaces for explicit confirmation before Phase 1 writes any tokens or touches `CLAUDE.md`.

---

## 8. Appendix C/D/E/F gap check (omnichannel leads, agent rating, multi-currency, media CMS)

- **Omnichannel Lead Engine (Appendix C):** no unified `leads` table exists — `inquiries` is single-channel (the on-site form only). No `channel`/`utm_*`/`first_touch_at` fields, **no interaction-log table at all** (no calls/WhatsApp/SMS/follow-up history anywhere in the schema). This is a from-scratch build.
- **Agent-Rating Model (Appendix D):** `admin.agents.tsx` computes a conversion rate today (`inquiries` matched to agent by `cro_name`, closed = has a `ceo_signed` agreement) but nothing else in Appendix D's formula (response-time-vs-SLA, activity volume, pipeline hygiene) — no interaction log to compute response time from, no stalled-work detection, no escalation cards anywhere in the UI.
- **Multi-Currency Ledger (Appendix E):** `payments.currency` column exists but is unused for real FX tracking — every payment is recorded in raw KES with no `amount_original`/`fx_rate_at_time`/`amount_kes` split. `src/lib/currency.ts` has hardcoded display-only FX rates for the public site's diaspora currency switcher, entirely separate from the payments ledger.
- **Media/Content CMS (Appendix F):** see §2 table above — phase videos and phase photos ARE editable today (`admin.plots.tsx`, `admin.campaigns.tsx`), blog has full CRUD but **no ordering/featured-flag fields and the route is unreachable from the nav**, Hot Picks is a pure client-side scarcity algorithm with zero admin override, and `site_banners` (which RLS already protects correctly) has no admin UI at all despite being the mechanism generated documents already read for branding.

---

## 9. Component library — installed vs. the brief's Appendix G stack

| Library | State |
|---|---|
| shadcn/ui | Installed, 44 components in `src/components/ui/`, `new-york` style, slate base — ready to theme dark |
| `@dnd-kit/*` | Installed, used only in `admin.leads.tsx` |
| `recharts` | Installed (`^2.15.4`) but **the shadcn chart wrapper that imports it is never used anywhere** — zero charts currently render in admin |
| Apache ECharts | **Not installed** — new dependency needed for the gauge/heatmap Appendix G calls for |
| `@tanstack/react-table` | Installed, used only in `admin.plots.tsx` |
| Framer Motion | **Not installed** — current "micro-interactions" are `tw-animate-css` utility classes only |

---

## 10. Findings worth flagging before Phase 1 begins

1. **Palette decision (§7)** — needs explicit confirmation; it reverses currently-written brand law, even though it's a more defensible dark theme than the one removed earlier this session.
2. **`admin.blog.tsx` is a fully-functional, completely unreachable route** — no nav link exists anywhere (`AdminShell.tsx`'s `NAV_GROUPS` has no blog entry; only `/admin/campaigns` is linked, and that's a different file). Either link it or fold it into Campaigns for real, rather than leaving working CRUD nobody can reach.
3. **Three role-gate patterns coexist with no enforcement consistency**: some writes are server-function-verified (`leads`, `plots.$plotId`, `installments`, `staff`), some are direct-client with a role check (`inquiries`, `bookings`), and some are direct-client with **no role check at all** (`admin.campaigns.tsx`'s phase-media write, `admin.blog.tsx`'s create/update/delete which only alert()-blocks the UI, not the write). Phase 3's RBAC-ready goal should close this, not just add a role column.
4. **`admin.meetings.tsx`'s primary actions do nothing** — Reschedule/Complete have no handlers. Cosmetic redesign alone would ship a prettier dead button.
5. **No true payment webhook exists (§5)** — a real gap for n8n readiness on the money side, separate from and larger than any UI work.
6. **No tracked baseline schema (§3)** — every Phase 3 migration is written blind against the Dashboard-managed live schema for the 9 original tables.

Stopping here per phase gate — awaiting direction on §7's palette question and confirmation to proceed into Phase 1 (design system).
