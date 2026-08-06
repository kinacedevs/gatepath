# Gatepath Realtors — Automation Layer Security Plan

**Status: Phase 0 — planning only.** Companion to [AUTOMATION_PLAN.md](AUTOMATION_PLAN.md). Covers login, session, logout, input-hardening, and data-privacy requirements — both the baseline this app already has (verified against the live code this pass, not assumed from older docs) and what the automation layer specifically adds to the picture.

Every finding below was checked directly against the current code (`grep`, direct file reads), not carried over from `SECURITY_HARDENING.md`, which predates most of this session's build-out and is stale in places — noted where it disagrees with current reality.

---

## 1. Sources cited, and exactly what was applied

- **[OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)** — password length thresholds (§3.1), account-enumeration-safe error messages (§3.2, already correct here), lockout/backoff shape (§3.3), MFA framing (§3.4), and layered bot defense — CAPTCHA *after* a small number of failures, not from attempt one (§3.5).
- **[OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)** — idle timeout (2–5 min high-value / 15–30 min low-risk) and absolute timeout (4–8 hours for typical office use) ranges (§4), server-side logout invalidation (§5, already correct here), and reauthentication-on-high-risk-event guidance (§6).
- **[OWASP Top 10:2025](https://owasp.org/Top10/2025/)** — every finding below is tagged with its category. Two categories new for 2025 are directly load-bearing: **A03 Software Supply Chain Failures** (n8n and its nodes are now inside Gatepath's trust boundary) and **A09 Security Logging and Alerting Failures** (the reason `automation_log` exists at all, per AUTOMATION_PLAN.md §3.4).
- **[Paystack Webhooks](https://paystack.com/docs/payments/webhooks/)** — exact header name, algorithm, raw-body requirement, and retry timing, applied in §7.

---

## 2. Baseline finding, flagged first because it's urgent and unrelated to Module 3

**[privacy.tsx:443](../src/routes/privacy.tsx#L443) states to the public: *"Admin access requires multi-factor authentication (MFA)."* This is false.** Grepped the entire codebase for any MFA/TOTP/2FA implementation — none exists. Admin login ([admin.tsx](../src/routes/admin.tsx)) is a single-factor email+password `supabase.auth.signInWithPassword()` call.

This is a live, public-facing misrepresentation of a security control on the site's own privacy policy — a compliance and trust issue independent of whether Module 3 ever gets built. **Recommendation: fix this now, as its own tiny, separate commit, regardless of what happens with the rest of this plan** — either (a) reword the privacy page to state the truth, or (b) actually add MFA (Supabase Auth supports TOTP MFA natively — `supabase.auth.mfa.enroll()`/`challenge()`/`verify()`, no new dependency). Given the scope of this automation plan, (a) is the fast fix and (b) can be scoped as real security work on its own timeline, not smuggled into an automation-layer review. **OWASP mapping: A07:2025 Authentication Failures** (MFA absence) compounded by **A09:2025 Security Logging and Alerting Failures**-adjacent (a false claim is worse than a silent gap — it actively misleads anyone who reads it, including a security-conscious client or auditor).

---

## 3. Login policies

### 3.1 Password policy
Handled entirely by Supabase Auth's own project-level settings (not app code) — this repo has no password-composition logic to audit. **Action needed, not a code change**: confirm in the Supabase Dashboard (Authentication → Policies) that minimum length is set to **at least 8 characters if MFA is enforced, or 15 if not** (per the cheat sheet — and per §2, MFA is *not* currently enforced, so the 15-character floor applies today), and that a breached-password check (HaveIBeenPwned integration, which Supabase Auth supports natively as a toggle) is enabled. Cannot verify this from the codebase — flagged as an action item, not assumed either way.

### 3.2 Account enumeration
**Already correct.** [admin.tsx:111](../src/routes/admin.tsx#L111) returns the generic `"Invalid email or password."` regardless of whether the email exists — matches the cheat sheet's explicit guidance exactly. No change needed.

### 3.3 Rate limiting / lockout — real gap
**Confirmed absent** (grepped for `rateLimit`/`rate-limit` across `src/` — zero matches anywhere). Two distinct surfaces:
- **Admin login** (`supabase.auth.signInWithPassword`): no app-level lockout on top of whatever Supabase Auth's own project settings provide (which this repo can't see or control from code — another Dashboard-level check needed, same as §3.1).
- **Portal OTP** ([portalActions.ts](../src/lib/portalActions.ts)): **partially already good** — `MAX_OTP_ATTEMPTS = 5` and `OTP_TTL_MS = 5 * 60 * 1000` (5-minute expiry) are real, already-shipped controls (Phase 8). What's missing is **request-side** throttling: nothing stops someone from calling `requestPortalOtpFn` repeatedly for the same email/phone, which is an OTP-spam / cost-amplification vector against Resend/Africa's Talking, not a guessing vector — SECURITY_HARDENING.md already flagged this exact gap and it's still open.
- **`/api/v1/*`** ([apiRoutes.ts](../src/lib/apiRoutes.ts), Phase 24): its own commit notes explicitly flag "no rate-limiting... a real, separate hardening item needing a KV/Durable-Object-backed limiter." Still open, and now more relevant since n8n will be a real, recurring caller of these endpoints (AUTOMATION_PLAN.md §3.2).

**Recommendation**: Cloudflare Workers has a native `Rate Limiting` binding (no new infra needed, matches this app's existing hosting) — apply it to `requestPortalOtpFn`, admin login (via a thin wrapper, since Supabase Auth itself is called directly and can't be rate-limited from outside except at this app's own edge), and `/api/v1/*`. **OWASP mapping: A07:2025 Authentication Failures.**

### 3.4 MFA
Absent, per §2. Recommendation there stands: fix the false claim immediately; treat actual MFA enrollment as a separately-scoped piece of work, not bundled into Module 3.

### 3.5 Bot protection
No CAPTCHA/Turnstile anywhere (grepped, zero matches). Given rate limiting is also absent (§3.3), this is a compounding gap on the portal OTP request endpoint specifically — it's the one public, unauthenticated endpoint that triggers a real-money-costing side effect (an SMS/email send) with no protection at all today. **Recommendation**: Cloudflare Turnstile (free, same-vendor as hosting, no new relationship needed) on the OTP request form, added *after* a small number of failures per the cheat sheet's own layering guidance — not on the first attempt, to avoid friction for the common case.

---

## 4. Session policies

### 4.1 Token expiration
- **Portal**: `SESSION_TTL_MS = 2 * 60 * 60 * 1000` — a flat 2-hour absolute timeout, no separate idle tracking. This already sits inside (in fact tighter than) the cheat sheet's 4–8-hour absolute-timeout range for typical use — **no change needed**, though a shorter idle timeout (e.g., 15–30 minutes of no activity, per the "low-risk" band — a viewed-title-deed status page is not a high-value target the way a payment form is) could be added as a refinement, not a gap.
- **Admin**: default Supabase Auth behavior (`autoRefreshToken: true, persistSession: true` in [supabase.ts:34-35](../src/lib/supabase.ts#L34-L35)) — access-token TTL and refresh-token lifetime are governed by the Supabase project's own Auth settings, not this app's code. **This app enforces no idle timeout and no absolute timeout of its own on top of that** — a session can, in principle, silently refresh indefinitely as long as the browser tab/localStorage persists. This is the one item the cheat sheet is most emphatic about: *"never trust client-side timers... enforced server-side."* **Real gap. OWASP mapping: A07:2025 Authentication Failures.**
- **Recommendation**: add explicit idle (15–30 min, matching the CRM's actual risk profile — it's staff tooling handling client PII and payment records, closer to "high value" than "low risk") and absolute (4–8 hours) timeout enforcement at the API layer — i.e., every `createServerFn` handler that already re-verifies the caller via `getAnonClient().auth.getUser()` (which is *all* of them, per this session's established pattern) additionally checks a last-activity timestamp and rejects if stale, rather than trusting the JWT's own expiry alone.

### 4.2 Refresh token rotation
Governed by Supabase Auth defaults; this app doesn't override it. Action item: confirm the Supabase project has refresh-token rotation and reuse-detection enabled (Dashboard setting, not code) — cannot verify from this repo.

### 4.3 Reauthentication on high-risk events
**Not implemented anywhere.** No code path re-prompts for credentials on password/email change, a new device/IP, or a sensitive action (advancing a conveyancing stage, editing a payment, changing a staff member's role). Given this CRM's own protected-write list (`payments`/`agreements`/`bookings`/`plots.status`) already gets special server-side handling, adding a reauthentication check specifically for those same operations is a natural, scoped extension — not a rebuild. **Flagged as a real gap, not built in this pass** (it's a meaningful scope addition on its own, deserving its own reviewed slice per this session's "commit security changes separately" rule — not something to fold silently into a Module 3 workflow). **OWASP mapping: A01:2025 Broken Access Control.**

### 4.4 Concurrent sessions
No limit on either portal or admin sessions today. Given `admin_users` roles are CEO/manager/agent (small, known staff count), this is lower urgency than the items above — flagged, not prioritized for immediate action unless you want it.

---

## 5. Logout policies

**Already correct.** [admin.tsx:55](../src/routes/admin.tsx#L55) calls `supabase.auth.signOut()`, which by Supabase's default scope (`global`) revokes the refresh token server-side — a replayed token is rejected, not just a client-side token clear. No change needed here. Portal logout should be double-checked to confirm it clears `sessionStorage["gatepath_portal_session"]` **and** invalidates the corresponding `portal_sessions` row server-side (not verified in this pass — flagged as a quick confirmation, not assumed either way).

---

## 6. Input & endpoint hardening

**Real, notable finding**: `zod` is a declared dependency (`package.json`) but is **imported nowhere in `src/`** — confirmed via grep, zero hits. Every `createServerFn().validator(...)` across this entire codebase (~45+ server functions) uses the pattern `(d: { field: string }) => d` — a TypeScript type annotation with **no runtime enforcement**. TypeScript types are erased at build time; a malformed or malicious payload hitting any of these handlers today is only as safe as whatever hand-written `if` checks happen to exist inside that specific handler, which varies function to function and was never systematically audited for this. **OWASP mapping: A05:2025 Injection / A06:2025 Insecure Design.**

**Recommendation**: wire `zod` into `.validator()` for real runtime schema validation, starting with every server function `automation_log`/n8n-facing endpoints will call (§3.2's outbound scoped API surface) — those are the functions about to gain a new, less-trusted caller, so they're the right place to start rather than a blanket rewrite of 45 files in one pass.

**File uploads**: `MediaDropzone.tsx`'s size/type checks are client-side only (confirmed — no server-side or Storage-bucket-level enforcement beyond what Phase 38's migration configured on the `site-assets` bucket itself, which *is* real server-side enforcement at the Storage layer). Document Vault's uploads go through signed URLs with no independent server-side re-check of file type before issuing the URL. Not a new gap for this plan to fix, but relevant if any automation workflow ever accepts a file (none currently proposed do).

**Parameterized queries**: inherent via `supabase-js`'s query builder everywhere in this codebase — no raw SQL string concatenation found. No action needed.

---

## 7. Webhook-specific security (the automation layer's actual new attack surface)

### 7.1 Paystack → Gatepath (`POST /webhooks/paystack`, new, per AUTOMATION_PLAN.md §2)
Per [Paystack's own docs](https://paystack.com/docs/payments/webhooks/):
- Verify header **`x-paystack-signature`** against `HMAC-SHA512(rawBody, PAYSTACK_SECRET_KEY)`.
- **Critical correction to Paystack's own example code**: their sample computes the signature over `JSON.stringify(req.body)` — i.e., a *re-serialized* copy of the already-parsed body. In a Cloudflare Workers `fetch` handler, the request body is a stream that can only be consumed once, and re-stringifying a parsed object is not guaranteed byte-identical to what Paystack actually sent (key order, whitespace, number formatting can all differ) — a real risk of **false-negative signature mismatches** if implemented literally as shown. **Read `request.text()` first, compute the HMAC over that exact raw string, and only `JSON.parse()` it after the signature passes.**
- Use a constant-time comparison for the signature check (timing-attack resistance) — `crypto.subtle` doesn't have a built-in constant-time string compare, so this needs an explicit constant-time byte comparison, not `===`.
- Return `200` immediately after the DB write succeeds; do notification/orchestration work (the n8n handoff) *after* responding, not before — Paystack's own guidance on avoiding its retry-on-timeout behavior.
- Paystack's 3 static IPs (52.31.139.75, 52.49.173.169, 52.214.14.220) are available as an *additional* defense-in-depth check, never a substitute for signature verification.
- **`PAYSTACK_SECRET_KEY` stays exactly where it is today** (this app's server env) — never given to n8n, per AUTOMATION_PLAN.md §2/§3.2.

### 7.2 Supabase Database Webhooks → n8n
- Static shared-secret header (`X-Gatepath-Automation-Secret`), verified by n8n's Header Auth credential on the Webhook trigger node, before any workflow logic executes. n8n webhook URLs should be treated as sensitive (not published, not logged in plaintext anywhere) even with the secret in place — defense in depth, not "the secret makes the URL itself safe to leak."
- **Never an open, unauthenticated public URL** — matches the brief's own explicit requirement. This is the weaker of the two schemes in this plan (a static secret, not a computed signature) — flagged in AUTOMATION_PLAN.md §3.1/§6 as an accepted trade-off pending your call on whether to invest in a stronger HMAC wrapper.

### 7.3 n8n → Gatepath `/api/v1/*`
- Existing `api_keys` bearer-token auth (Phase 24) — hashed at rest, scoped, revocable. New scopes added per-workflow, per AUTOMATION_PLAN.md §3.2.
- **Rate-limit this surface** (§3.3) now that it has a real, recurring, non-human caller — a runaway or misconfigured n8n workflow calling this in a loop is a realistic failure mode this endpoint currently has no protection against.

---

## 8. Data privacy — automation-specific

- RLS already gates every table server-side; this plan adds no new client-readable surface — n8n never talks to Supabase directly (§3.2), so no new RLS policy is needed *for n8n's sake*. Any new columns (`automation_log`) still get an admin-only `select` policy matching every other internal table added this session, service-role-only writes.
- `automation_log` carries zero PII by design (§3.4 of the automation plan) — this is itself a privacy control, not just a logging-quality one: if n8n's own execution history or logs are ever exposed (misconfigured n8n instance, shared workspace), the worst it leaks is "workflow X ran on entity ID Y at time Z," not a client's name, phone, or payment amount.
- Every new outbound `/api/v1/*` read used by an automation workflow should default to the same **redacted field set** Phase 24 already established (no `client_id_passport`/`client_kra_pin`/kin data over an API key) — this doesn't change for automation just because the caller is "internal" rather than a third-party integrator; n8n is still, per §3.2, treated as an external system.

---

## 9. Summary table — OWASP Top 10:2025 mapping of every finding above

| Finding | Status | OWASP 2025 category |
|---|---|---|
| Public MFA claim is false | **Open, urgent, unrelated to Module 3** | A07 Authentication Failures |
| No rate limiting anywhere (login, OTP request, `/api/v1/*`) | Open | A07 Authentication Failures |
| No CAPTCHA/bot protection | Open | A07 Authentication Failures |
| No app-level idle/absolute session timeout (admin) | Open | A07 Authentication Failures |
| No reauthentication on high-risk actions | Open | A01 Broken Access Control |
| `zod` installed but never used — no runtime input validation | Open | A05 Injection / A06 Insecure Design |
| No real Paystack webhook (client-verify only) | Open, closes as part of AUTOMATION_PLAN.md §2 | A08 Software/Data Integrity Failures |
| n8n/community nodes as a new supply-chain surface | Addressed by design (§3.2 — no Supabase credential in n8n) | A03 Software Supply Chain Failures |
| Automation events with no audit trail | Addressed by design (`automation_log`, §3.4 of automation plan) | A09 Security Logging and Alerting Failures |
| Account enumeration on login | **Already correct** — no action | — |
| Logout server-side invalidation | **Already correct** — no action | — |
| Portal OTP TTL/attempt lockout | **Already correct** — no action | — |
| Parameterized queries | **Already correct** — no action | — |

---

## 10. Explicitly not decided here

Per §2, §3.3, §4.1, §4.3, and §6 above — these are real, flagged gaps with a stated recommendation each, but none are being fixed as part of writing this plan. Which ones (if any) you want folded into Module 3's build sequence vs. handled as their own separate security-hardening pass is your call, consistent with this whole session's rule of never bundling security fixes into feature work without saying so explicitly.
