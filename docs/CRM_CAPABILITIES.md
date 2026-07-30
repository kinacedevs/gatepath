# Gatepath Realtors — CRM/Admin Capability Research

**Status:** Research pass for the Phase 5 admin/CRM rebuild, done ahead of the actual redesign implementation. The redesign itself is blocked on one input: the user's Stitch project (8 screens, [stitch.withgoogle.com/projects/2081026699682181486](https://stitch.withgoogle.com/projects/2081026699682181486)) is a JS-rendered app behind Google auth with no available connector, so it can't be fetched directly — the user is exporting Stitch's code output to share instead. This document is what should inform that rebuild once the screens land: not what it should *look* like, but what it should *do*.

---

## 1. What Gatepath already has vs. what's missing

Gatepath's current admin.tsx and portal.tsx already cover more ground than a generic "CRM feature list" would suggest — this isn't a from-scratch build:

| Capability | Status |
|---|---|
| Lead capture (inquiry/booking forms) | Have it — `inquire.tsx`, `book-visit.tsx` |
| WhatsApp as primary conversion channel | Have it — floating button + CTAs throughout (confirmed category-correct, see COMPETITOR_BENCHMARK.md §7) |
| Pipeline stages (conceptually) | Have it — inquiry → booking → payment → 5-stage conveyancing, tracked in `portal.tsx` |
| Client self-service transparency | Have it — the portal tracking the 5-stage pipeline live is a real differentiator, currently under-marketed |
| Email + SMS infrastructure | Have it — `lib/notifications.ts` (Resend + Africa's Talking) |
| Lead scoring / routing | **Missing** |
| Automated follow-up sequences / drip campaigns | **Missing** |
| Behavioral re-engagement triggers | **Missing** |
| Staff-facing pipeline/kanban view | **Missing** — admin.tsx currently lists records, doesn't visualize a pipeline |
| Post-purchase cross-sell / "hot offers" in the portal | **Missing** |
| Automated title-deed legitimacy check | **Not achievable as "automated"** — no public Ardhisasa API found (see §5) |

---

## 2. Lead capture, scoring, and routing

Sourced from Follow Up Boss and kvCORE's actual feature sets — the two most-cited category leaders:

- **Lead routing rules**: round-robin, geographic assignment, lead-quality score, or agent availability. Follow Up Boss's core strength is ingesting leads from many sources and routing by configurable rule, not just dumping everything in one inbox.
- **Lead scoring**: AI-assisted scoring to prioritize which leads a staff member calls first, based on behavior (pages viewed, forms started vs. completed, WhatsApp responsiveness) rather than just recency.
- **Behavioral automation** (kvCORE): triggers a message when a lead revisits the site after a period of inactivity, or views the same property multiple times. This is a genuinely applicable pattern for Gatepath — e.g., a lead who views the same phase's plot map three times in a week is a stronger signal than a single inquiry form submission.

**For Gatepath specifically:** every inquiry already lands with a `phaseName`/`plotNumber`/`plotSize` context (per `inquire.tsx`'s form fields) — that's enough structure to build simple, honest lead scoring (e.g., "has a phone number + has viewed a specific plot + submitted an inquiry" scores higher than "WhatsApp click with no form"), without needing a black-box AI model to start.

Sources: [iHomefinder: Top Real Estate CRM Features 2026](https://www.ihomefinder.com/blog/agent-and-broker-resources/real-estate-crm-features-2026/) · [Privyr: kvCORE vs Follow Up Boss vs Privyr](https://www.privyr.com/blog/kvcore-vs-follow-up-boss-vs-privyr/) · [Kee Technology: Follow Up Boss vs kvCORE Speed-to-Lead](https://keetechnology.com/blog/follow-up-boss-vs-kvcore)

---

## 3. Pipeline automation and staff workflow

- **Drag-and-drop deal pipeline** with deal value, expected close date, conversion rate per stage — the standard visual for staff to see where every lead sits, at a glance. Gatepath's 5-stage conveyancing pipeline already has the *stage definitions* (`lib/conveyancing.ts`); what's missing is a staff-facing kanban/board view of it in admin.tsx (currently a list/table view per the P3 cleanup note in CRITIQUE.md).
- **Action plans**: automated sequences tied to lead stage, configurable without needing code changes each time (e.g., "3 days after inquiry with no response → auto-send a WhatsApp template + flag for a staff callback").
- **Omnichannel from one dashboard**: SMS campaigns, mass email, WhatsApp — Gatepath already has the email/SMS infrastructure (`notifications.ts`); the gap is a staff-facing UI to trigger/schedule these rather than only transactional one-off sends.

Source: [US Tech Automations: Real Estate CRM Automation 2026](https://ustechautomations.com/resources/blog/real-estate-crm-automation-2026)

---

## 4. After-sales and the "premium ecosystem" client portal

This is the part of the ask about giving the client portal its own marketing/engagement layer — making it feel like belonging to something, not just a status tracker.

- **Timing matters**: the single highest-converting moment for any upsell/cross-sell offer is immediately after a transaction is confirmed, on the "thank you"/confirmation page — while the buyer is still in a positive, engaged state. Gatepath's `thank-you.tsx` page already exists at exactly that moment; currently it's purely transactional (next steps, receipt, agreement) with no cross-sell content at all.
- **Expansion triggers**: real estate portals key repeat-purchase prompts off client milestones (e.g., "your title deed is registered" is a natural, non-pushy moment to suggest a second plot, since the buyer has just had their trust in the process validated by a real milestone, not a sales pitch).
- **Personalized recommendations, not generic ones**: the pattern that works is "based on what you already own/searched," not "here's everything we're selling." Gatepath's portal already knows the buyer's phase/location — a "buyers in [location] are also looking at [nearby phase]" or "you completed [phase] — here's this month's Hot Pick in a similar price range" recommendation is a natural, low-effort extension of the Hot Picks logic already shipped on the landing page (real scarcity-based selection, not fabricated).

**Concretely for Gatepath:** the same `usePhases()` hook and Hot Picks selection logic already built for the landing page (`PropertyPreview.tsx`) is directly reusable inside the portal — same real data, same "lowest availability ratio" scarcity signal, just surfaced to an already-converted client instead of a first-time visitor. This is small, honest, and reuses existing plumbing rather than inventing a new recommendation engine.

Sources: [Yotpo: Post-Purchase Upsell Best Practices](https://www.yotpo.com/blog/post-purchase-upsell/) · [HAR.com Client Portal](https://cms.har.com/clientportal/) · [Blustream: Upsell Retention](https://blustream.ai/blog/upsell-retention-how-additional-sales-boost-loyalty)

---

## 5. Title deed legitimacy checks against Ministry of Lands — honest scope

Searched specifically for public Ardhisasa developer/API access: **none found.** Ardhisasa (ardhisasa.go.ke) is a portal for session-based manual lookups — real-time ownership history, parcel number, and encumbrance data are accessible to a logged-in human user, not documented as available to third-party systems via API. As of early 2026 it's fully operational in Nairobi and Murang'a, actively rolling out to Kiambu, Isiolo, Mombasa, and Machakos, with a stated goal of all 47 counties.

**What "automation" honestly means here, until/unless a real API surfaces:**
- A guided workflow, not a live check: a staff member performs the actual Ardhisasa search manually, then logs the result (search date, parcel number referenced, staff member, outcome) against the phase/plot record in the CRM — turning a one-off manual check into a *tracked, auditable* verification event tied to that specific plot, which is itself a real trust upgrade over the status quo (verification presumably happens today with no permanent record of when/how).
- If Gatepath later obtains any kind of institutional/partner access to Ardhisasa (e.g., through a licensed conveyancing partner or a future government API), this same tracking structure is what an automated version would plug into — the schema shouldn't need to change, only the trigger (manual button click today, webhook/API call later).

Source: [DMK Law: Understanding Ardhisasa](https://www.dmklaw.co.ke/2026/01/19/understanding-ardhisasa-kenyas-digital-land-system/) · [African Real Estate: Land Digitization Advances](https://www.african-realestate.com/press/land-digitization-advances-as-ardhisasa-finds-its-footing/)

---

## 6. Security posture for the rebuild — zero trust, stated plainly

The user's ask ("total strictness and zero trust... if you are not authorized/recognized, by all means you can't") is already the intended architecture per CLAUDE.md, not a new requirement:

- RLS policies gate all Supabase data server-side; the browser is never trusted for financial or status writes (existing rule, already enforced for payments/agreements/bookings/plots.status).
- Admin and portal sessions are already the subject of dedicated auth work (P0-1, P0-3 in CRITIQUE.md — both already fixed on this branch).
- What's still open from CRITIQUE.md that bears directly on "zero trust": P1-5 (documents possibly enumerable by id — needs signed/expiring URLs) and P1-6 (no rate limiting on public write paths). The user has explicitly put these on hold for now, not in scope for this pass — noted here so the CRM rebuild doesn't accidentally assume they're already fixed.
- Any new CRM automation (lead routing, drip sequences, portal recommendations) must follow the same rule already in place: reads can be client-side against RLS-protected views, but anything that writes lead-stage transitions, sends communications, or logs a verification event goes through a server function with the service role — never a direct client write.

---

## 7. What this means for the rebuild, once the Stitch screens arrive

Priority order, reusing existing plumbing wherever possible rather than building parallel systems:

1. **Staff-facing pipeline board** (kanban view of the 5 conveyancing stages + pre-sale lead stages) — the single highest-value missing piece, and the natural home for the Stitch redesign's visual language.
2. **Simple, honest lead scoring + routing** — rule-based first (not a black-box model), using data already captured on every inquiry.
3. **Action-plan style follow-up automation** — tied to lead stage, reusing `notifications.ts`'s existing Resend/Africa's Talking infrastructure rather than adding a new messaging system.
4. **Manual-verification tracking for Ardhisasa checks** — a real, auditable record instead of an unrecorded manual step, honestly scoped as manual-triggered rather than a live API.
5. **Client portal cross-sell/"Hot Picks for you"** — reusing the exact `usePhases()` + scarcity-ranking logic already built for the landing page, surfaced post-purchase and at conveyancing milestones.
6. **admin.tsx split per tab** (already flagged in CRITIQUE.md's P3 cleanup) — doing this *as part of* the redesign rather than before it, since a full rebuild is the natural moment to also fix the "one 3,000-line file" structural problem, not a separate pass to redo later.
