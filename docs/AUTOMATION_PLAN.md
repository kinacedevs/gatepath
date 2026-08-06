# Gatepath Realtors — Automation Layer Plan (Module 3 / n8n)

**Status: Phase 0 — planning only. No code, no schema execution, no workflows built yet.** This document is the deliverable of that phase. Nothing here ships until it's reviewed and approved; Phase 1 begins only after that.

Companion document: [AUTOMATION_SECURITY_PLAN.md](AUTOMATION_SECURITY_PLAN.md) covers login/session/logout/input-hardening requirements for the automation layer specifically. Read both before approving.

---

## 1. Sources consulted, and what was actually applied

- **[OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)** — applied in the security plan (login/MFA/lockout), not this document.
- **[OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)** — same, applied in the security plan.
- **[OWASP Top 10:2025](https://owasp.org/Top10/2025/)** — the category list (A01 Broken Access Control · A02 Security Misconfiguration · A03 Software Supply Chain Failures · A04 Cryptographic Failures · A05 Injection · A06 Insecure Design · A07 Authentication Failures · A08 Software/Data Integrity Failures · A09 Security Logging and Alerting Failures · A10 Mishandling of Exceptional Conditions) is used below in §3.2 to classify the credential/event-layer design, and in the security plan to classify findings. Two categories are new since the 2021 list and matter directly here: **A03 Software Supply Chain Failures** (n8n itself, and every node/community-package installed into it, is now part of Gatepath's trust boundary) and **A09 Security Logging and Alerting Failures** (this is exactly what `automation_log` in §3.4 exists to prevent).
- **[Paystack Webhooks](https://paystack.com/docs/payments/webhooks/)** — applied directly in §3.3: header is `x-paystack-signature`, algorithm is HMAC-SHA512 over the **raw, unparsed** request body (not a re-`JSON.stringify()`'d copy — see the correction in §3.3), must return `200` fast, live-mode retries every 3 minutes for 4 tries then hourly for 72 hours, and Paystack's 3 static IPs are available as a defense-in-depth check alongside signature verification, not a replacement for it.

---

## 2. Correcting one assumption before anything else: where does the Paystack webhook actually terminate?

Appendix B's own wording ("Payment reconciliation: Paystack webhook → verify HMAC-SHA512 against raw body → update installment ledger...") reads as one continuous chain, which would put webhook receipt, secret-key verification, and the ledger write all inside n8n. **That can't happen without breaking CLAUDE.md's core rule and this session's entire security model**, so this plan changes that shape. Reasoning:

- CLAUDE.md is explicit: *"Never write to `payments`, `agreements`, `bookings`, or mutate `plots.status` from client-side code. All financial and status writes go through verified server-side paths using the service role. The browser is not trusted."* n8n is not part of this codebase's reviewed server-function layer — from Gatepath's trust perspective it is an external system, architecturally in the same trust tier as "the browser." Handing it `PAYSTACK_SECRET_KEY` and direct Supabase write access to `payments`/`agreements`/`plots` would be exactly the violation this rule exists to prevent, just relocated to a different external system instead of the browser.
- `PAYSTACK_SECRET_KEY` already lives server-side in this app ([paymentActions.ts](../src/lib/paymentActions.ts)) and is used today for the client-triggered verify path (`verifyPaymentFn` → `recordVerifiedPayment`, idempotent on `paystack_reference`). [SECURITY_HARDENING.md](SECURITY_HARDENING.md) already flags the one real gap: **no true Paystack-initiated webhook exists yet** — only the popup-triggered client call. That gap needs closing regardless of n8n, and it's a security-hardening change, not an automation one.

**Corrected design:**

1. **New `POST /webhooks/paystack` route, inside this app's own Cloudflare Worker** ([src/server.ts](../src/server.ts)), dispatched the same way `/api/v1/*` already is (Phase 24 precedent — a private-prefix route handled before the SSR fallthrough). It reads the **raw body text first** (`await request.text()`, before any `JSON.parse`), computes `HMAC-SHA512(rawBody, PAYSTACK_SECRET_KEY)`, and compares it to the `x-paystack-signature` header using a constant-time comparison. Reject with `401` on mismatch, log the rejection (no payload) to `automation_log`.
2. On a verified `charge.success` event, it calls **the exact same `recordVerifiedPayment`** function the client-verify path already uses — same idempotency key (`paystack_reference`), same atomic plot-reservation logic, same code, two entry points. No new payment logic, no duplicated verification.
3. Responds `200` immediately after the DB write succeeds (before any notification/receipt work) — matches Paystack's own guidance to avoid its retry-on-timeout behavior.
4. **Only after that write succeeds** does anything reach n8n — via a Database Webhook on `payments` (§3.1), carrying only IDs, never card data or the Paystack secret. n8n's role becomes orchestration of what happens *after* a payment is already verified and recorded (receipt send, CEO alert on large/late, ledger-adjacent notifications) — never verification, never the write itself.

This closes the SECURITY_HARDENING.md gap as a byproduct of building this workflow, which is the right order — the missing webhook was already the single most-flagged open item in that document.

---

## 3. Shared architecture (built once, before any per-module workflow)

### 3.1 Event layer

Two channels, not one, because Gatepath's writes happen two different ways and a single mechanism can't honestly cover both:

- **Supabase Database Webhooks** (Postgres-native, `pg_net`-backed, configured via `supabase_functions.http_request` triggers) as the **canonical event source for every table**, regardless of whether the row was written by a server function or one of the few legitimate direct-client inserts (`inquiries`, `bookings`, `newsletter_subscribers` — all confirmed public-insert-by-design, none of them in CLAUDE.md's protected list). This is what Appendix A's first option ("Supabase database webhooks") already names, and it's the right primitive here specifically because it fires from Postgres itself — it can't be bypassed by a write path this plan didn't anticipate, and it requires **zero changes to the ~45 existing, already-reviewed server-function files**. Adding application-level event emission to every one of those instead would mean re-touching a large surface of already-shipped, security-reviewed code for no functional gain.
- Each webhook is scoped **per table, per event type** — not one blanket webhook on everything. A workflow that only cares about `inquiries.status` changing doesn't need a payload firing on every `plots` row edit.
- **Authentication**: Supabase Database Webhooks support a custom header on every call. Each one carries `X-Gatepath-Automation-Secret: <shared secret>`, verified by n8n's Webhook node (native "Header Auth" credential type) before any workflow logic runs. This is a static shared secret, not a computed HMAC — a deliberate, disclosed trade-off (see §3.2's OWASP mapping) since Supabase Database Webhooks don't sign payloads the way Paystack does. If you want true HMAC-signed database events later, that needs a small wrapping function between Postgres and n8n and is flagged here as a stronger option, not built by default.
- Reliability caveat, stated plainly: `pg_net`-backed webhooks are **best-effort**, not exactly-once — if n8n is down or the call fails, Postgres does not retry indefinitely. §3.4's idempotency design and a periodic reconciliation scan (per-workflow, e.g. "any `inquiries` older than 5 minutes with no matching `automation_log` row") are the backstop, not an assumption that delivery never fails.

### 3.2 Credential handling — stricter than the original ask, on purpose

Appendix A asked for "n8n uses scoped Supabase access; no service-role key beyond what a workflow needs." This plan goes further: **n8n never holds a Supabase credential of any kind — not service-role, not anon+JWT.** Reasoning, flagged per the brief's own "flag risks loudly" instruction rather than silently substituted:

- A scoped Supabase credential still means Postgres-level access sitting in a third-party system's credential store. If n8n is ever compromised (its own instance, a malicious/vulnerable community node — this is exactly **OWASP A03:2025 Software Supply Chain Failures**, a live category this year specifically because of workflow-automation and low-code platforms), the blast radius is "whatever tables that credential can touch," which is strictly worse than "whatever one scoped API endpoint allows."
- **Phase 24 of this session already built the right primitive for this and said so explicitly at the time**: [`admin.integrations.tsx`](../src/routes/admin.integrations.tsx)'s own copy states n8n is "Reserved... this module's API is the foundation that bridge will eventually call." `api_keys` (migration `0019`) already supports named, scoped (`leads:read`/`leads:write`/`plots:read`), revocable keys with a hashed-at-rest secret and a `field_mapping` remap layer, consumed by [`apiRoutes.ts`](../src/lib/apiRoutes.ts)'s `/api/v1/*` endpoints. That's the correct shape for **outbound-from-n8n** calls: a dedicated `api_keys` row scoped to exactly what one workflow needs (e.g. `leads:write` only, for a workflow that logs an escalation note — never a blanket key reused across workflows), reusing existing, already-reviewed validation instead of a new trust surface.
- `/api/v1/*` will need a few new scopes/endpoints as specific workflows are built (e.g. a `bookings:read` scope doesn't exist yet) — each addition ships with its own workflow slice, not speculatively up front.
- Provider sends (actual SMS/email leaving the building): n8n calls back into **this app's existing notification infrastructure** (a new, narrowly-scoped server function wrapping `sendResendEmail`/`sendAfricaTalkingSms` from [notifications.ts](../src/lib/notifications.ts)) rather than n8n holding its own separate Resend/Africa's Talking credentials. This keeps template rendering, the message-template fallback system (Phase 25), and any future opt-out/compliance logic in one reviewed place instead of forking it. **This is a recommendation, not a mandate** — the alternative (n8n with its own provider credentials, sent directly from n8n's HTTP/email nodes) is simpler to wire visually inside n8n and some teams prefer it; flagging the trade-off rather than deciding it silently, since it's a real judgment call.

### 3.3 Reliability: idempotency, retry, dead-letter

- **Idempotency key per workflow**: `(table, operation, record_id, record_updated_at)` from the Database Webhook payload. Before doing anything else, a workflow's first real action is an atomic "claim" against `automation_log` — an insert with a `unique(workflow_key, entity_type, entity_id, event_fingerprint)` constraint. If the insert succeeds, proceed; if it hits the unique violation, the event was already handled (or is being handled concurrently) — short-circuit cleanly. This gives real database-level dedup instead of trusting n8n's own execution history, which tracks *runs*, not *business events*.
- **Retry**: n8n's native per-node retry (exponential backoff) on the actual provider-send step (SMS/email/webhook-out), not on the whole workflow — a retried "read the lead" step is harmless; a retried "send SMS" step without care would double-send.
- **Dead-letter**: on final retry exhaustion, n8n's Error Trigger workflow writes an `outcome: 'failed'` row to `automation_log` with a sanitized error message (see next section) and, for anything revenue- or client-facing, separately notifies an ops/CEO channel. This *is* the dead-letter queue — a queryable, permanent record of what didn't go out, not a silent drop.

### 3.4 Auditability — a new table, deliberately separate from the existing one

Gatepath already has an `audit_log` table (migration `0013`, Phase 18) — but it's scoped to **human staff actions inside the CRM** (`actor_email`, `actor_name`, `action`, `entity_type/id`). Automation runs have a different actor model (a workflow, not a person) and a different query need (ops monitoring: "did this fire, did it succeed" vs. compliance: "who changed what"). Rather than force one shape to serve both, this plan adds a second table:

```
automation_log
  id                uuid primary key
  workflow_key      text        -- e.g. "speed-to-lead-v1"
  event_type        text        -- e.g. "inquiries.insert"
  entity_type       text        -- e.g. "inquiries"
  entity_id         uuid
  event_fingerprint text        -- record_updated_at or similar, for the dedup constraint
  outcome           text        -- 'success' | 'failed' | 'skipped_duplicate'
  error_message     text null   -- sanitized: no names, phones, emails, amounts
  n8n_execution_id  text null   -- cross-reference into n8n's own run history
  triggered_at      timestamptz
  created_at        timestamptz default now()
  unique(workflow_key, entity_type, entity_id, event_fingerprint)
```

**No PII in this table, ever** — not client name, not phone, not email, not amount. `entity_id` is enough to join back into the real (RLS-protected, admin-only) tables if a human needs the detail. This mirrors the same discipline already applied to `document_records`/`interaction_log`/`plot_title_verifications` elsewhere in this schema. (This is a schema description for review, per the Phase-0 "no schema execution" rule — the actual migration file ships with whichever workflow slice needs it first, most likely speed-to-lead in Phase 1.)

### 3.5 Naming convention

`workflow_key` format: `<domain>-<short-name>-v<n>` (e.g. `leads-speed-to-lead-v1`, `payments-reconciliation-v1`, `installments-dunning-v1`). The version suffix exists because a workflow's *logic* can change without its *identity* changing in `automation_log` — bumping the version on a meaningful behavior change keeps historical log rows honestly attributable to the version that produced them.

---

## 4. Per-module data / events / automation-opportunity inventory

Built from this session's actual shipped implementation (every table/function named below exists today, verified against the codebase — not the older, now-superseded research in `CRM_CAPABILITIES.md`/`EXPANSION_GAP_ANALYSIS.md`, which predate most of what's listed here).

| Module | Owns (tables) | Real events available today | Automation opportunity |
|---|---|---|---|
| **Leads / Inquiries** | `inquiries` | insert, `status` change, `cro_name` assignment, `pipeline_stage_id` change | SLA timer + escalate-if-untouched (Appendix B #1) |
| **Site Visits / Bookings** | `bookings` | insert (paid via `verifyPaymentFn`, free via `createFreeSiteVisitBookingFn`), `status` change, `staff_feedback` set | Confirmation + reminder + post-visit **client** feedback request (staff feedback already has its own escalation, Phase 17 — the client-facing survey doesn't exist yet, flagged below) |
| **Payments** | `payments` | insert via `recordVerifiedPayment` (client-verify path only today — see §2) | Reconciliation, receipt, CEO alert on large/late — blocked on building the real Paystack webhook first (§2) |
| **Installments** | derived from `payments` + `inquiries.monthly_payment` | none stored — overdue is computed live on page load | Scheduled scan + auto-reminder, replacing the existing **manual** `sendPaymentReminderFn` trigger |
| **Offers / Agreements** | `offers`, `agreements` | `ceo_signed` transition (`signOfferFn`/`signAgreementFn`) | Notify client on signing; feed conveyancing-stage transitions downstream |
| **Conveyancing pipeline** | computed live (`conveyancingStages.ts`), not stored | stage boundary crossings (no stored "entered stage N at time T") | Real automation needs a stored transition event first — see open decision in §6 |
| **Escalations** | reads `inquiries`/`bookings`/`interaction_log` live (`escalations.ts`) | none stored — Phase 17's screen is pull (staff opens it), not push | Push the same 5 categories via SMS/WhatsApp instead of requiring a staff visit to `/admin/notifications` |
| **Property Matching** | `buyer_preferences` | none stored — matches computed live, alert is a **manual** "Send Match Alert" button | Auto-alert when a new/changed plot matches an active watch request |
| **Commissions** | `commission_payouts`, `admin_users.commission_rate` | `commission_payouts` insert (manual "Mark Paid") | Auto-generate a payout candidate list when a deal closes; statement send already has a manual trigger (`sendCommissionStatementFn`) to build on |
| **Goals** | `goals` | none — progress computed live | Periodic goal-attainment digest to CEO/agent |
| **Referrals / Testimonials** | `testimonials`, `inquiries.testimonial_requested_at`/`referral_invite_sent_at` | manual triggers only (`sendTestimonialRequestFn`/`sendReferralInviteFn`) already exist | Auto-fire these two **existing** functions when a deal reaches "fully paid" (`agreements.ceo_signed`) — this is "wire an existing action to a trigger," not new send logic |
| **Document Vault** | `document_records` | insert/delete via `documentVaultActions.ts` | Low priority — mostly staff-internal, not asked for in Appendix B |
| **Data Governance** | `audit_log` (human actions, distinct from `automation_log` above) | insert per staff write already wired into 4 server-function files (Phase 18) | None needed — this module *is* the human-side audit trail already |
| **Telephony / Call Log** | `interaction_log.call_outcome` | insert via `logInteractionFn` | Feeds speed-to-lead/escalation logic as a signal, not itself a send-trigger |
| **Custom Fields** | `custom_field_definitions`, `inquiries.custom_fields` | none | None identified |
| **Hot Picks / Content publishing** | `phases.is_hot_pick` etc. | **already instant** — `PropertyPreview.tsx` reads live, no automation needed for the "→ public site" half of Appendix B #8 | The "→ newsletter" half has no base capability yet at all (see below) |
| **Newsletter** | `newsletter_subscribers` | insert (public signup) | **There is currently no way to actually send anything to subscribers — manual or automated.** Phase 32 shipped capture + a read-only admin list, explicitly not a send mechanism. This is a build-the-capability item, not "add automation to an existing send." |
| **Contact form** | `inquiries` (`heard_from: "Contact Page"`) | insert | Feeds the same lead pipeline as any other inquiry — no separate automation needed |
| **Integrations & API layer** | `api_keys` | n/a — this *is* the outbound trust boundary n8n uses (§3.2) | Foundation, not a workflow itself |
| **WhatsApp click / currency switch (public site interactions)** | **not tracked anywhere today** | none — these are pure UI events with no server round-trip currently | Appendix C's "interaction... feeds the CRM via a secured endpoint with source tagging" describes new instrumentation that doesn't exist yet, not wiring an existing event. Flagged, not assumed built. |
| **Meta/IG Lead Ads, WhatsApp Business API inbound capture** | n/a | n/a | **Vendor-blocked, same as Phase 24 found**: no Meta Business/WhatsApp Business account is provisioned. Appendix B #6's "omnichannel lead capture" can ship for web forms + blog CTAs (already real) but not Meta/IG/WhatsApp inbound without that account existing first — not something Module 3 can build around. |

---

## 5. Priority order — validated against real modules, with adjustments

Appendix B's order is sound in spirit. Two changes, both explained:

1. **Payment reconciliation (#2) is decomposed into 2a (build the missing Paystack webhook — a security-hardening change, reviewed and shipped like Phase 1's original P0 work) and 2b (n8n orchestration on top of it — receipt/alert sends).** 2a has no automation-layer dependency at all and could ship before or independently of Module 3 if you'd rather close that gap sooner; keeping it here keeps the two visibly paired so 2b is never built against an unverified payment event by accident.
2. **Speed-to-lead (#1) stays first.** It has zero prerequisites (schema already supports it fully), zero vendor blockers, and is the cleanest possible "prove the whole architecture end-to-end" slice — one Database Webhook, one n8n workflow, one `automation_log` row shape, reused by everything after it.

Everything else keeps its relative position, with the caveats already called out inline in §4 (site-visit's client-feedback survey is new-build not new-automation; newsletter's actual send capability doesn't exist yet; #6's Meta/IG/WhatsApp half is vendor-blocked; #9's referral/testimonial piece is "wire an existing manual action to a trigger," genuinely cheap).

Validated order for Phase 1+:

1. **Speed-to-lead** (Appendix B #1) — first slice, proves the architecture.
2. **Payment reconciliation, 2a then 2b** (#2) — 2a closes a pre-existing, already-flagged security gap; 2b is the first workflow that actually needs the credential model in §3.2 fully exercised (money-adjacent).
3. **Overdue / dunning** (#3) — reuses `sendPaymentReminderFn`'s existing logic, low new-build cost.
4. **Escalations, pushed** (#5 in your list, moved up) — the underlying detection (`escalations.ts`) is fully built; this is "add a push channel," genuinely small.
5. **Site-visit lifecycle** (#4) — confirmation/reminder reuse existing sends; the post-visit *client* survey is flagged as new build, not automation, and can be split into its own sub-slice if you'd rather ship the rest first.
6. **Referral & testimonial trigger** (#9, moved up) — wiring two already-built functions to a status trigger is cheap and low-risk; no reason to leave it last.
7. **Omnichannel lead capture** (#6) — web forms + blog CTAs only, until a Meta/WhatsApp Business account exists.
8. **Agent scoring, nightly** (#7) — **holds on your decision**, see §6 below; this reverses a deliberate Phase 12 design choice ("computed live, never stored") and shouldn't move forward silently.
9. **Content publishing → newsletter** (#8) — needs the send capability built first (flagged above), then automation on top.
10. **Post-sale / handover** — folded into #6 above (referral & testimonial), since that's the concrete mechanism Appendix B #9 actually describes.

---

## 6. Open decisions needing your call before Phase 1 starts

1. **Agent scoring — live-computed vs. nightly-stored.** Phase 12 deliberately chose to compute lead scores live, specifically because nothing existed to keep a stored score fresh. Module 3 removes that constraint. Storing a nightly snapshot is now viable, but it's a real reversal of a documented design decision, not a free addition — do you want it stored (enables historical trend charts, cheaper reads) or kept live (simpler, always current, matches how every other derived metric in this CRM already works)?
2. **Provider-send credentials — n8n's own Resend/Africa's Talking accounts vs. routing through Gatepath's existing notification functions.** §3.2 recommends routing through Gatepath (one place owns templates/compliance); flagging the trade-off rather than deciding it for you.
3. **Conveyancing stage transitions** currently have no stored "entered stage N at time T" event (deliberately deferred in Phase 16, "the timestamped audit trail... remains explicitly deferred"). Any automation keyed to a *specific* stage transition (vs. the coarser signals already available — a booking, an offer, an agreement) needs that table built first. Worth deciding whether that's in scope for this pass or a named follow-up.
4. **Database Webhook secret strength** — §3.1's shared static header secret vs. a stronger app-side HMAC wrapper. Recommending the simpler default; flag if you want the stronger version from day one.

---

## 7. Explicitly not built this phase

- Any actual workflow (Phase 0 is planning only).
- The `automation_log` migration itself (ships with the first workflow that needs it, per the DATABASE RULE — described here for review, not executed).
- Meta/IG Lead Ads and WhatsApp Business API inbound capture (vendor account doesn't exist — same honest gap Phase 24 already found).
- A newsletter send mechanism (doesn't exist at all yet, automated or manual).
- WhatsApp-click / currency-switch interaction tracking (no instrumentation exists to automate around yet).
