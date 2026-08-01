# Gatepath CRM — Expansion Gap Analysis (Part 2 + Part 3)

Read-only audit, same discipline as `docs/VIZ_SPEC.md`: every item below is checked against the real schema (`docs/DATABASE_SCHEMA.md`, `supabase/migrations/`) and the real code, not assumed. **✅ Ready** = exists and works today. **🟡 Partial** = a real piece exists but doesn't cover the full ask. **🔴 Needs build** = no schema/code exists at all.

This is the Phase 0 for the two specs just supplied ("Part 2 — modules you don't have" and "Part 3 — website live-update map"), mirroring how the Phase 2 screen redesign started with a read-only audit before any code was written.

---

## Part 2 — New modules

| # | Module | Status | Reality check |
|---|---|---|---|
| 1 | Communications Hub (omnichannel inbox) | 🔴 Needs build | No `interaction_log`/messages table anywhere. Already flagged in `docs/VIZ_SPEC.md` as **the single highest-leverage table to build next** — it also unlocks #4, #9, #11, and half of Agent Performance/Contacts/Inquiries' remaining 🔴 metrics. |
| 2 | Tasks & Activities + Calendar | 🔴 Needs build | No `tasks` table. `admin.bookings.tsx`'s calendar (built Phase 8) only covers site visits — not a general follow-up/reminder/SLA system. |
| 3 | Automation / n8n bridge | 🔴 Needs build | Confirmed in `docs/CRM_STATE_AUDIT.md`: no real webhook exists anywhere in this codebase today, not even for Paystack (payment confirmation is a client-triggered verify call). Event emitters + secured webhooks are a from-scratch build. |
| 4 | Lead Scoring engine | 🔴 Needs build | No `score` column, no rules engine. Directly depends on #1 for the "engagement/response" inputs the brief names. |
| 5 | Property-Matching engine | 🔴 Needs build | No buyer-preference storage (budget/location/currency wishlist) anywhere; `inquiries` only captures what a lead already asked about, not a standing preference to match future plots against. |
| 6 | Reporting & Analytics | 🟡 Partial | Individual screens now have real KPIs/charts (all 11 admin routes, just shipped). No cross-tab report builder, no lead-source ROI (needs #3's campaign/UTM columns), no cohort analysis, no scheduled delivery mechanism. |
| 7 | Documents & E-signature Vault | 🟡 Partial | `offers`/`agreements` are a real, working payment-gated two-document signing flow (Phase 7). No general document store — no ID/POA/title-deed uploads, no signed/expiring URLs, no per-record access log. |
| 8 | Buyer / Client Portal | 🟡 Partial | `portal.tsx` is real and working, but derives conveyancing stage client-side from payment % — no stored `current_stage`. No document center, no virtual tours. |
| 9 | Notifications & Escalations Center | 🟡 Partial | `EscalationCard` (built Phase 1) is live on the Dashboard for 2 real conditions (overdue installments, stale bookings). Not a general center — every other "urgent task" type in the brief needs #1's interaction log to detect. |
| 10 | Data Governance | 🔴 Needs build | No dedup/merge, no consent flags, no retention rules, no general audit log. **Flagging this one prominently**: Kenya Data Protection Act compliance is a real legal exposure for a business handling KRA PINs/national IDs, not just a feature gap. |
| 11 | Telephony / Call Logging | 🔴 Needs build | Nothing exists. Depends on #1's schema and a real telephony provider choice (Africa's Talking Voice, or a click-to-call service) — a vendor decision, not just a table. |
| 12 | Commission & Payout Tracking | 🔴 Needs build | `affiliates.commission_rate` is confirmed a distinct concept (referral partners, not staff). No `agent_commissions`/payout table. |
| 13 | Goals & Quotas | 🔴 Needs build | No table. Already named as a proposal in `docs/VIZ_SPEC.md` §3 (`agent_goals`). |
| 14 | Referral & Testimonial Capture | 🔴 Needs build | Testimonials are **100% hardcoded** in `src/components/sections/Testimonials.tsx` — a fixed array of 3 quotes, no table, no admin UI, no approval queue. No post-handover request flow exists. |
| 15 | Mobile / Field Mode | 🔴 Needs build | No GPS check-in fields on `bookings` (already named in `docs/VIZ_SPEC.md` §8). Admin is a responsive web app only — no field-optimized flow or offline handling. |
| 16 | Integrations & API layer | 🟡 Partial | Paystack (checkout only, no webhook), Resend + Africa's Talking SMS (`src/lib/notifications.ts`) are real. WhatsApp is a hardcoded `wa.me` click-to-chat link (`WhatsAppButton.tsx`), not the Business API. Meta lead ads and n8n: not integrated. No clean internal API beyond TanStack server functions (which is a reasonable internal API already, just not documented as one). |
| 17 | Knowledge Base / SOPs | 🔴 Needs build | Nothing exists. |

**Pattern**: 11 of 17 are full 🔴 builds; the 6 🟡 items all share the same missing piece — **an interaction/activity log (#1)**. Building that one table first is disproportionately high-leverage, exactly as `docs/VIZ_SPEC.md`'s closing section already concluded for the Part 1 visualization gaps.

---

## Part 3 — Website live-update map (CRM as the site's control panel)

| Area | Status | Reality check |
|---|---|---|
| Plot & land listings (add/edit/remove, specs, pricing, payment plans) | ✅ Ready | `admin.plots.tsx` (redesigned Phase 2 Slice 5) — real CRUD against `phases`/`plot_sizes`/`plots`. |
| Availability status (Available/Booked/Sold → live map) | ✅ Ready | `plots.status` + Supabase Realtime, already wired to the public masterplan SVG (`PlotMap.tsx`) and now also to `admin.plots.tsx`'s Grid Map. |
| Pricing & offers (multi-currency, promo flags) | 🟡 Partial | Real prices via `plot_sizes`; currency display exists (`PhaseCard`/`PlotPanel` `currency` prop) but the FX rate is hardcoded, not admin-editable or server-refreshed. No promo/discount flag column exists on any table. |
| Media (plot photos, phase videos, virtual tours, masterplan SVGs) | 🟡 Partial | Phase-level hero/diaspora/thumbnail/brochure/plot-map URLs are editable today via `admin.campaigns.tsx`'s Media Manager (just redesigned); `phases.youtube_video_url` editable via `admin.plots.tsx`. **No per-plot photos, no virtual-tour fields/tables at all.** |
| Weekly Hot Picks (banners, ordering, featured flags, expiry) | 🔴 Needs build | Confirmed in `docs/VIZ_SPEC.md` §10: Hot Picks is a pure client-side scarcity algorithm (`PropertyPreview.tsx`), not a stored/curated list — nothing for a CEO to edit today. |
| Blog & marketing content (posts, SEO meta, landing copy) | 🟡 Partial | Blog CRUD is real (`admin.campaigns.tsx`, just consolidated). SEO meta fields on `blog_posts`: not confirmed present — needs a schema check before promising. Landing-page copy itself is hardcoded JSX, not CRM-editable. |
| Testimonials / reviews | 🔴 Needs build | 100% hardcoded, no table, no admin UI, no approval workflow (same finding as Part 2 #14). |
| Team / agent profiles (photos, roles, contact, assigned phases) | 🔴 Needs build | `about.tsx`'s team section is a hardcoded array with a hotlinked Unsplash stock photo — the same stock-photo debt `CRITIQUE.md` P2-5 already flagged elsewhere on the site. No table, no admin UI. |
| Diaspora hub (content, currency set, FX rates, POA download, Nairobi-clock config) | 🟡 Partial | Hero/banner images editable via Media Manager; FX rates and currency list are hardcoded constants, not admin-configurable. |
| Contact info (office locations, phones, WhatsApp number, hours) | 🔴 Needs build, but the easy kind | Hardcoded across `Footer`/contact routes/`WhatsAppButton.tsx`. **`site_banners` (a generic jsonb key/value table) already exists, has correct RLS, and is exactly the right shape for this — it just has zero admin UI writing to it today** (confirmed gap, `docs/DATABASE_SCHEMA.md`/`docs/CRM_STATE_AUDIT.md`). This is a schema-free win: build the admin UI, not a new table. |
| FAQs & legal (FAQs, terms, privacy/consent notices) | 🔴 Needs build | No FAQ table. `privacy.tsx`/terms are static routes — fine as static legal text, but not CRM-editable, and there's no consent-notice mechanism at all. |
| Public forms → CRM lead with source tagging | 🟡 Partial | Inquire/reserve/book-visit already create real `inquiries`/`bookings` rows with `heard_from` source tagging. No newsletter-signup flow found anywhere in the codebase — if that's a real ask, it needs building from scratch, including the table. |
| Site-visit availability (bookable slots reflecting real calendar) | 🟡 Partial | `bookings` are real and `admin.bookings.tsx` has a real calendar (Phase 8). The **public** `book-visit.tsx` has no slot-capacity check — a visitor can pick any date/time with no limit reflecting staff availability. |

**Pattern**: much better news than Part 2 — most of the underlying plumbing (`phases`, `plot_sizes`, `blog_posts`, `site_banners`) already exists and several screens are already wired. The real gaps are (a) content that's hardcoded in JSX and needs a table + admin UI (testimonials, team profiles, Hot Picks, FAQs), and (b) `site_banners`, which needs zero new schema, just an admin screen — the single cheapest, highest-visible-ROI item on this whole list.

---

## Recommended sequencing (not yet started — awaiting direction)

1. **Interaction/activity log** (Part 2 #1) first — it's the one build that unlocks the most other 🟡/🔴 items across both parts and across the already-shipped Part 1 screens (Agent Performance, Contacts, Inquiries SLA, Dashboard escalations all cited it by name in `docs/VIZ_SPEC.md`).
2. **`site_banners` admin UI** (Part 3) as a fast, cheap parallel win — no schema needed, closes a confirmed-idle table, and covers contact info/hours in one screen.
3. **Testimonials + Team Profiles + FAQs** as one grouped "Content" build — same shape (new small table + admin CRUD + public-page swap from hardcoded JSX to a Supabase read), reasonable to batch since they're structurally identical asks.
4. Everything else in Part 2 (Tasks/Calendar, Automation/n8n, Lead Scoring, Telephony, Commission, Goals, Data Governance, Mobile/Field Mode, Knowledge Base) sequenced after, since most of them either depend on #1 or are standalone multi-week builds in their own right (e.g. Data Governance's Kenya DPA compliance work, or a real telephony vendor integration) — not something to batch into a single slice.

Not built yet — this document is the read-only audit only.
