# Gatepath CRM — Feature Gap Analysis & Master Build List

Benchmarked against Zoho, HubSpot, Salesforce, and real-estate CRMs (Follow Up Boss, BoldTrail/kvCORE, Lofty, Real Geeks, Wise Agent). Supplied by the user as the coverage-checklist reference for the ongoing admin/CRM redesign — saved verbatim here so it's a durable, citable reference alongside `docs/CRM_STATE_AUDIT.md` (which documents what's *actually* implemented today; this file documents the *aspiration*).

Reading key: For each of your current tabs — what mature CRMs do → what you likely have → what to add → automations to wire (n8n phase). Then: modules you don't have at all, the website live-update map, and a consolidated feature checklist.

## PART 1 — TAB-BY-TAB GAP ANALYSIS

### 1. LEADS
**Modern CRMs do:** Omnichannel capture (web forms, WhatsApp, Meta/IG lead ads, TikTok, chat, calls, referrals, walk-ins) with source + UTM attribution; instant round-robin / priority / territory routing; speed-to-lead timers; lead scoring; duplicate detection; lead → contact → deal lifecycle.
**You likely have:** A leads list with manual assignment.
**Add:** Source/channel/campaign/UTM tagging on every lead; SLA "speed-to-lead" timer (flag if not contacted within X hours); lead score field; duplicate detection; a "New / Assigned / Working / Qualified / Converted / Lost" lifecycle; bulk assign.
**Automations:** Auto-create lead from any channel → notify assigned agent (SMS/WhatsApp) → start follow-up sequence → escalate if untouched past SLA.

### 2. AGENT PERFORMANCE
**Modern CRMs do:** Team accountability dashboards, activity tracking, conversion funnels, leaderboards, goal/quota tracking, call/activity volume, response-time metrics.
**You likely have:** A ranking table with sales volume + conversion.
**Add:** Composite agent score (response time, contact rate, visit conversion, close rate, revenue, activity volume, pipeline hygiene); SLA compliance %; goals/targets vs actual; "stalled work" surfacing; audit-backed activity feed per agent.
**Automations:** Nightly score recompute; auto-flag idle agents; auto-route hot leads to top scorers (future); weekly performance digest to CEO.

### 3. CONTACTS
**Modern CRMs do:** Unified contact/company records, full interaction timeline, custom fields, tags/segments, relationship mapping, enrichment, consent flags, merge.
**You likely have:** A contact directory.
**Add:** Full interaction timeline (every call/WhatsApp/email/visit); tags & segments (diaspora, cash buyer, installment, phase interest); consent/marketing-opt-in flags; buyer preferences (budget, location, currency) to power matching; merge duplicates.
**Automations:** Auto-log interactions; segment membership updates; birthday/anniversary/festive touches; re-engagement of cold contacts.

### 4. CLOSED DEALS
**Modern CRMs do:** Deal pipeline with weighted stages, win/loss reasons, revenue + forecast, transaction management (pre-list → under contract → closed), commission tracking.
**You likely have:** A closed-deals record.
**Add:** Full 13-stage land-to-title pipeline (not just closed); win/loss reason capture; expected vs actual close date; commission/payout per agent per deal; post-close handoff to title pipeline.
**Automations:** Stage-change triggers (e.g., agreement signed → SMS + PDF); commission calc on close; forecast roll-up; referral request after handover.

### 5. INSTALLMENTS
**Modern CRMs do:** Payment schedules, invoicing, payment links, recurring billing, multi-currency, dunning/overdue reminders, collection dashboards.
**You likely have:** Installment tracker with M-Pesa.
**Add:** Multi-currency ledger (KES base + USD/GBP/EUR original + FX snapshot) for diaspora; automated overdue detection + grace-period countdowns; collection-rate KPIs; receipt generation; reconciliation view (M-Pesa vs bank/wire).
**Automations:** Payment-due reminders (SMS/WhatsApp/email); overdue escalation; auto-mark paid on verified webhook; monthly statement to buyer; CEO alert on large/late payments.

### 6. INQUIRIES QUEUE
**Modern CRMs do:** Shared team inbox, SLA-based queues, auto-assignment, canned responses, sentiment tagging, conversation-to-lead conversion.
**You likely have:** An inquiries list.
**Add:** SLA timers per inquiry; auto-assign rules; canned reply templates; convert-to-lead in one click; channel tagging (which form/page/campaign it came from); status (new/answered/closed).
**Automations:** Auto-acknowledge inquiry instantly; route by topic/phase; escalate unanswered inquiries; convert qualified inquiry → lead + agent notify.

### 7. SITE VISITS
**Modern CRMs do:** Scheduling, calendar sync, reminders, route planning, mobile field check-in (GPS), post-visit feedback capture, no-show tracking.
**You likely have:** A site-visit calendar.
**Add:** GPS-verified check-in; mandatory post-visit feedback (with SLA — flag "no feedback after 48h"); no-show / reschedule tracking; buyer + agent reminders; visit → next-stage nudge; group/transport visit coordination.
**Automations:** Confirmation + reminder to buyer (SMS/WhatsApp); agent prep brief; auto-request feedback after slot; escalate missing feedback; nudge to reserve after a completed visit.

### 8. PLOT INVENTORY
**Modern CRMs do:** Listing management, availability status, media per listing, pricing, property matching to buyers, MLS/portal sync.
**You likely have:** Plot inventory with map + status.
**Add:** Live status (Available/Booked/Sold) synced to the public map via Realtime; per-plot media (photos, videos, virtual tour, masterplan); pricing + payment-plan options; property-matching engine (match buyer preferences → plots); phase-level rollups (X of Y sold); reservation locking (atomic).
**Automations:** Status change → update public site instantly; "matching plot available" alert to interested buyers; low-availability urgency triggers for hot picks; sold-out phase → suggest next phase.

### 9. CAMPAIGNS & CONTENT (currently under-scoped — should control the whole public site)
**Modern CRMs do:** Email/SMS campaigns, drip nurture, behavior-based sequences, landing pages, A/B testing, campaign ROI, plus (real-estate) property alerts and newsletters.
**You likely have:** Some campaign + content management.
**Add:** Full public-site CMS (see Part 3) — listings, prices, videos, photos, tours, hot picks, banners/stickers, blog, testimonials, team, diaspora content, all editable here; drip/nurture sequence builder; property-alert campaigns; campaign source → lead → close ROI attribution; A/B on landing content.
**Automations:** Behavior-triggered nurture (viewed diaspora tab → send diaspora guide); weekly hot-picks auto-publish; newsletter to segments; abandoned-inquiry re-engagement.

### 10. STAFF ACCOUNTS
**Modern CRMs do:** RBAC roles + granular permissions, territories, teams, seat management, activity/audit per user, SSO, 2FA.
**You likely have:** Staff account list.
**Add:** RBAC roles (CEO, Admin/Finance, Sales Lead, Agent, Viewer) with granular per-module permissions; 2FA; per-user audit trail; onboarding/offboarding (revoke access, reassign that user's leads); territory/phase ownership.
**Automations:** Access provisioning on role assign; auto-reassign leads on deactivation; suspicious-login alerts; permission-change audit entries.

### 11. SETTINGS
**Modern CRMs do:** Org config, pipeline/stage editor, custom fields, templates, integrations/API keys, data import/export, backup, consent/compliance config, notification prefs.
**You likely have:** Basic settings.
**Add:** Pipeline/stage editor; message-template manager (SMS/WhatsApp/email); FX-rate source config; integration/webhook keys (Paystack, Africa's Talking, Resend, n8n, Meta, WhatsApp); data import/export + backup; consent & data-retention (Kenya DPA) config; audit-log viewer.
**Automations:** Scheduled backups; FX-rate daily refresh; template versioning; config-change audit.

## PART 2 — MODULES YOU DON'T HAVE AT ALL (add these)

- **Communications Hub** (omnichannel inbox) — every email, WhatsApp, SMS, and call logged against the contact/lead; templates; canned replies; optional call recording/transcription. The backbone of follow-up tracking and agent accountability.
- **Tasks & Activities + Calendar** — every follow-up is a dated task with reminders and SLA; unified calendar of visits, calls, due payments, follow-ups.
- **Automation / Workflow layer (n8n bridge)** — event emitters + secured webhooks on every key action so n8n can trigger routing, reminders, escalations, publishing. Structure now, automate next phase.
- **Lead Scoring engine** — rules-based now (source, budget, engagement, response), AI later once you have historical conversions.
- **Property-Matching engine** — match buyer preferences (location, budget, currency, phase) to available plots; auto-alert on new matches.
- **Reporting & Analytics** — pipeline, forecast, collection, lead-source ROI, cohort, agent analytics, scheduled report delivery to CEO.
- **Documents & E-signature Vault** — expand CEO e-sign into a full doc store (agreements, title deeds, IDs, POAs) with signed/expiring URLs and per-record access.
- **Buyer / Client Portal** — self-service: progress through the 13 stages, payment history, documents, next actions, virtual tours.
- **Notifications & Escalations Center** — urgent-task cards (stalled lead, missing feedback, expiring grace period) with one-click actions.
- **Data Governance** — duplicate detection/merge, enrichment, consent flags, Kenya DPA compliance, retention rules, full audit log.
- **Telephony / Call Logging** — click-to-call, call outcomes logged, linked to agent scoring.
- **Commission & Payout Tracking** — per-agent, per-deal commission, statements, payout status.
- **Goals & Quotas** — monthly/quarterly targets per agent/phase, tracked vs actual.
- **Referral & Testimonial Capture** — request after handover; approved testimonials flow to the public site.
- **Mobile / Field Mode** — agents work leads, log visits (GPS), and update status from the field.
- **Integrations & API layer** — Paystack, Africa's Talking, Resend, WhatsApp Business API, Meta lead ads, n8n, plus a clean internal API.
- **Knowledge Base / SOPs** — internal playbooks so staff follow the right process (mirrors Zoho Blueprint's intent).

## PART 3 — WEBSITE LIVE-UPDATE MAP (CRM as the site's control panel)

Everything below on the public site must be editable from the CRM, writing to the same Supabase the site reads — zero code changes for content updates:

- Plot & land listings — add/edit/remove per phase; specs, dimensions, pricing, payment-plan options.
- Availability status — Available / Booked / Sold, pushed live to the interactive map via Realtime.
- Pricing & offers — per plot/phase; promo/discount flags; multi-currency display.
- Media — plot photos, phase videos, virtual tours, masterplan SVGs.
- Weekly Hot Picks — with banners/stickers, ordering, featured flags, expiry.
- Blog & marketing content — posts, marketing catches, landing copy, SEO meta.
- Testimonials / reviews — approved from CRM → published to site.
- Team / agent profiles — photos, roles, contact, assigned phases.
- Diaspora hub — content, currency toggle set, FX rates, POA download, Nairobi-time widget config.
- Contact info — office locations, phones, WhatsApp number, hours.
- FAQs & legal — FAQs, terms, privacy/consent notices, downloadable docs.
- Public forms — every form wired to create a CRM lead/inquiry with source tagging.
- Site-visit availability — bookable slots reflect real CRM/calendar availability.

## PART 4 — MASTER FEATURE CHECKLIST

| Feature | How it helps |
|---|---|
| Omnichannel lead capture + attribution | Nothing slips; you know which channel/campaign pays off |
| Speed-to-lead SLA + routing | Faster first contact = higher conversion; kills lead rot |
| Lead scoring | Agents work the hottest leads first |
| Property matching | Right plot to right buyer automatically; diaspora-aware |
| 13-stage land-to-title pipeline | Full journey tracked to title deed, per customer, audit-safe |
| Communications hub | Every interaction logged → accountability + continuity |
| Tasks/activities + calendar | Follow-ups never dropped; SLAs enforced |
| Agent scoring + goals | Measures work-rate; fuels fair hot-lead routing; ends laziness |
| Multi-currency installments | Diaspora USD/GBP/EUR tracked cleanly against KES base |
| Overdue/dunning automation | Improves collection rate without manual chasing |
| Reporting + lead-source ROI | CEO sees what actually drives revenue |
| Forecasting | Predict revenue and collections |
| Documents + e-sign vault | Legal docs secure, signed, access-controlled |
| Buyer portal | Self-service progress/payments; less staff load; more trust |
| Media/content CMS | Staff update the public site instantly, safely |
| Notifications & escalations | Stalled work surfaces and gets actioned |
| RBAC + 2FA + audit log | Security, integrity, and Kenya DPA compliance |
| Data dedup/merge/consent | Clean data; lawful marketing |
| Commission tracking | Transparent agent payouts |
| Referral/testimonial capture | Compounding lead source; social proof on site |
| Mobile field mode | Agents update from site visits in real time |
| n8n webhooks/event layer | Everything above can be automated next phase |
| Integrations/API | Paystack, Africa's Talking, Resend, WhatsApp, Meta, n8n |

## PART 5 — SUGGESTED PRIORITY ORDER

1. **Data spine first**: interaction log, tasks/activities, source attribution, RBAC + audit — everything else depends on these.
2. **Engagement layer**: communications hub, inquiries SLA, site-visit feedback loop, notifications/escalations.
3. **Intelligence layer**: agent scoring, lead scoring, property matching, reporting + lead-source ROI.
4. **Money layer**: multi-currency installments, dunning, commission tracking, forecasting.
5. **Content control**: full public-site CMS (Part 3).
6. **Automation phase**: wire n8n to the event/webhook layer built throughout.

Build custom (as planned). Use this list as the coverage checklist so the CRM matches a mature platform's capability while keeping land/title specificity, M-Pesa-native flows, diaspora currency handling, and a single source of truth — things generic CRMs can't give us.
