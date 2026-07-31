# Gatepath Realtors — Migrations Index

Companion to `docs/DATABASE_SCHEMA.md`. One entry per file in `supabase/migrations/`, in order. All are written idempotent (`drop policy if exists` before `create policy`, `create table if not exists`, `add column if not exists`) — safe to re-run against a live database. **None of these apply themselves** — no Supabase CLI project link exists in this repo (`supabase/.temp/project-ref` absent), so every migration is run manually by the user via the Supabase Dashboard SQL editor. Applied-status below reflects what's been confirmed live as of this document, not what's merely committed.

| # | File | Applied live? |
|---|---|---|
| 0001 | `0001_admin_auth_and_rls.sql` | ✅ Yes (foundational — everything since depends on it) |
| 0002 | `0002_close_payment_insert.sql` | ✅ Yes |
| 0003 | `0003_portal_otp_lockdown.sql` | ✅ Yes |
| 0004 | `0004_plot_title_verification.sql` | ⚠️ Unconfirmed — flagged at the time as needing manual application; not re-verified since |
| 0005 | `0005_offers_and_kin_fields.sql` | ✅ Yes — confirmed live via a direct anon-key REST probe this session (`offers` table returns `200 []`, `inquiries.client_country`/`kin_kra_pin` return `null` on existing rows) |

---

## 0001 — `admin_auth_and_rls.sql`
**Fixes**: CRITIQUE P0-1 — `/admin` had zero real authentication (`sessionUser` was a hardcoded mock object; the role check was commented out; `loadAllData()` pulled `inquiries`, `payments`, `agreements`, `admin_users`, `affiliates` to any browser that loaded the page).

**What it does**: Defines `public.is_admin()`, a `SECURITY DEFINER` function checking the caller's JWT email against `admin_users`. Enables RLS on all 11 original tables and applies a consistent pattern: public tables (`phases`, `plot_sizes`, `blog_posts` published-only) get public select + admin-only writes; buyer-submitted tables (`inquiries`, `bookings`, `payments`, `agreements`, `affiliates`) get public **insert only** + admin-only select/update/delete; fully internal tables (`admin_users`) get admin-only everything, CEO-only insert.

**Deliberately left open at the time** (documented in its own header, not an oversight): `payments`/`agreements` INSERT stayed anon-writable via `_TEMP`-suffixed policies, because `thank-you.tsx` still wrote to them directly from the browser and closing it immediately would have broken every purchase mid-flight. Closed two migrations later once the replacement write path shipped — see 0002.

**Code this depends on**: `admin.tsx`'s real Supabase Auth session check (`resolveAdminForSession`), which reads `admin_users` post-login.

## 0002 — `close_payment_insert.sql`
**Fixes**: CRITIQUE P0-2 (forgeable payment records) and P1-1 (double-booking race).

**What it does**: Drops the `_TEMP` anon-insert policies on `payments` and `agreements` left open by 0001 — safe only because `src/lib/paymentActions.ts` had by this point replaced the old client-side write path with a server-verified one (Paystack verify API re-confirmation + service-role write, which bypasses RLS entirely and needs no policy). Also drops `plots_public_update_TEMP` and replaces it with an admin-gated update policy, closing the other half of the same forgery surface (`thank-you.tsx` used to flip `plots.status` directly from the browser).

**Explicit warning in the file itself**: not safe to run before confirming the new verified-payment flow is deployed — running it against the old client-insert code would silently break every purchase. (Moot now; both shipped together.)

**Code this depends on**: `paymentActions.ts`'s `recordVerifiedPayment` (service-role client, bypasses RLS, needs no insert policy).

## 0003 — `portal_otp_lockdown.sql`
**Fixes**: CRITIQUE P0-3 — the client portal generated its OTP client-side with `Math.random()`, displayed it on screen, stored it in plaintext, and used `sessionStorage["gatepath_portal_email"]` as the entire "session" (settable to any value in devtools to view any client's data). `client_otps` had zero RLS.

**What it does**: Adds an `attempts int not null default 0` column to the pre-existing (untracked-origin) `client_otps` table, enables RLS on it with **zero policies** (service-role only, permanently — nothing in the browser should ever touch it directly), and creates `portal_sessions` (opaque `uuid` tokens + email + expiry), also service-role only.

**Code this depends on**: `src/lib/portalActions.ts` — server-issued OTP (CSPRNG, hashed at rest), real session tokens replacing the sessionStorage pattern.

## 0004 — `plot_title_verification.sql`
**Adds** (net-new capability, not a fix): `plot_title_verifications` — turns the previously unrecorded manual "did staff check this plot's title against Ardhisasa" step into a permanent, auditable log (who checked, when, outcome, reference). No public Ardhisasa API exists for automation (`docs/CRM_CAPABILITIES.md` §5), so this logs a real manual action rather than performing one.

**RLS pattern note — this is the template every migration since follows**: admin-only `select`, **no insert/update policy at all**. All writes go through `logPlotTitleVerificationFn` (service role, caller re-verified server-side). RLS fails closed for any direct-client write attempt by design.

**Code this depends on**: `src/lib/plotVerificationActions.ts`, `src/routes/admin.plots.$plotId.tsx`'s "Verification Documents" panel.

**⚠️ Action needed**: application status against the live database was last "unconfirmed" — `admin.plots.$plotId.tsx` is written to fail gracefully with a clear message if it hasn't been run, rather than crash, but this should be verified the same way 0005 was (a direct anon-key probe or a Dashboard check) rather than left open indefinitely.

## 0005 — `offers_and_kin_fields.sql`
**Fixes real business-logic bug** (Phase 7, this session): the codebase previously created an `agreements` row on every successful payment (including the very first deposit) and again independently on CEO approval — both wrong. Gatepath's real flow is deposit → Offer Letter (provisional) → ... → full payment → Agreement (binding, only then CEO-signable).

**What it does**: Creates `offers` (mirrors `agreements`' shape: `inquiry_id`, `payment_id`, `ceo_signed`, `ceo_signed_at`) with admin-only select **and update** (unlike 0004's pattern — offer-signing uses the same direct-client-update-with-RLS-gate pattern `agreements.ceo_signed` already used, not a server function, for consistency with the existing CEO-sign UI). No insert policy — offers are only ever created server-side via `paymentActions.ts`. Also adds 8 nullable columns to `inquiries` (`client_country/county/city`, `kin_occupation/country_of_residence/county/city/kra_pin`) required by the real Offer Letter template but not previously captured by `inquire.tsx`'s form.

**Code this depends on**: `paymentActions.ts`'s `recordVerifiedPayment` (offer created on first payment; agreement created only once cumulative payments reach `inquiries.price`), `document.offer.$id.tsx` (new route), `document.agreement.$id.tsx` (rewritten with the real template text), `admin.inquiries.tsx`'s split Offer/Agreement review UI, `inquire.tsx`'s extended form (Phase 7B, same session).

---

## What's *not* here yet (see `docs/DATABASE_SCHEMA.md` and `docs/VIZ_SPEC.md`)

Every table/column proposed in `docs/VIZ_SPEC.md`'s "Cross-cutting schema gaps" (interaction log, `assigned_agent_id`, installment schedules, multi-currency payment columns, `plot_status_history`/audit log, lead scoring, agent goals/commissions, RBAC permission matrix, campaigns, staff invites/login events, integration health, DB-editable pipeline/template config) is a **proposal, not a migration** — none of it exists in `supabase/migrations/` today. When any of it is greenlit, it gets its own numbered migration (`0006_...` onward) following the exact patterns established above: idempotent DDL, admin-only select, writes routed through a service-role server function unless there's a specific reason to keep the direct-client-update pattern (as `offers`/`agreements`' CEO-sign flow does).
