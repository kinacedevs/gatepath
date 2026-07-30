# Gatepath Realtors — Security Hardening Log

Tracks what's been fixed, what's deliberately deferred, and the exact steps needed to activate each fix. Cross-references CRITIQUE.md's P0/P1 findings.

---

## Fixed: P0-1 — Admin authentication + RLS lockdown

**Code:** [src/routes/admin.tsx](../src/routes/admin.tsx) — real Supabase Auth session (`getSession` + `onAuthStateChange`), a login form, and `adminRole`/`adminName` resolved by matching the authenticated email against `admin_users`. Previously `sessionUser`/`adminRole` were hardcoded mock state (`{ id: "mock-user", email: "ceo@gatepathrealtors.com" }`, role always `"ceo"`), `handleLogin` was an empty function, and `handleLogout` just showed an alert.

**SQL:** [supabase/migrations/0001_admin_auth_and_rls.sql](../supabase/migrations/0001_admin_auth_and_rls.sql) — enables Row-Level Security on all 11 tables and restricts `inquiries`/`bookings`/`payments`/`agreements`/`admin_users` SELECT to recognised admins only. **This is the fix that actually matters** — gating the `/admin` route alone would have been cosmetic, since the anon key could read everything directly from the Supabase REST API regardless of what the UI does.

### Why matching is by email, not a linked user ID

`admin_users` has no column linking it to Supabase Auth's `auth.users`. Rather than add one and require copying UUIDs around, the RLS helper functions (`is_admin()`, `current_admin_role()`) match on `auth.jwt() ->> 'email'` against `admin_users.email`. To grant someone access: create their Supabase Auth login with **the same email** as their `admin_users` row. No UUID linkage needed.

### Setup runbook (do this once)

`admin_users` currently has **zero rows** — nobody has ever been added to it; the CEO name/email seen in the old UI was hardcoded display text, never a real database row. The CEO-only INSERT policy in the migration can't bootstrap itself on an empty table, so the very first row must be seeded by hand.

**`admin_users.id` has a foreign key to `auth.users(id)`** (this exists in the live schema already — not something this migration adds). That means the Supabase Auth login must be created **first**, and the `admin_users` row must reuse that exact same id — not a fresh `gen_random_uuid()`. Do the steps in this order:

1. **Run the migration.** Paste the full contents of `supabase/migrations/0001_admin_auth_and_rls.sql` into the Supabase SQL Editor and run it. Safe to re-run — every statement is idempotent.

2. **Create the Supabase Auth login first:** Dashboard → Authentication → Users → Add User. Enter your real email + a password. (Or "Invite" if you'd rather set the password via emailed link.)

3. **Seed your `admin_users` row by pulling the id from `auth.users`** — edit the email (must match step 2 exactly) and name, then run in the SQL Editor:
   ```sql
   insert into public.admin_users (id, email, full_name, role)
   select id, 'your-real-email@example.com', 'Your Name', 'ceo'
   from auth.users
   where email = 'your-real-email@example.com';
   ```
   This inserts nothing (and errors nothing) if the email in the `where` clause doesn't match an existing `auth.users` row — double-check step 2 completed with that exact email if so.

4. **Test it:** go to `/admin`, sign in with that email/password. You should land on the dashboard as CEO. Adding further staff now works properly from the **Staff** tab — see below.

### Accepted trade-off
The session is stored via Supabase's default `persistSession` (browser `localStorage`), not an httpOnly server cookie. Standard for a Supabase Auth SPA setup and consistent with how this app already handles sessions elsewhere; a server-side cookie session would need a bigger server-function investment than this warrants right now.

---

## Fixed: staff invitation (the same FK problem, solved properly)

The CEO-bootstrap FK issue above would have hit again the moment anyone used the Staff tab to add a manager or agent — `handleAddStaff` inserted with a fresh `crypto.randomUUID()`, which can never satisfy `admin_users.id`'s foreign key to `auth.users(id)`. And the real fix — creating an `auth.users` row — requires the Supabase **Admin API**, which requires the **service-role key**. That key must never reach the browser.

**Fixed with a real server-side flow:** [src/lib/adminActions.ts](../src/lib/adminActions.ts) — a TanStack Start server function (`inviteStaffFn`), the same pattern already used for email/SMS notifications in `lib/notifications.ts`. The service-role client is constructed **only inside the handler body**, which TanStack strips from the client bundle. Verified directly against the compiled output, not just assumed: `grep`'d `dist/client/` for the key name, the service-client constructor, and the invite call — all absent. The one incidental hit (`inviteUserByEmail`) was confirmed to be inert `@supabase/auth-js` SDK boilerplate with no key attached, present in the bundle regardless of this change.

The server function re-verifies the caller server-side (`auth.getUser(accessToken)` against Supabase, then an `admin_users.role === 'ceo'` check via the service client) — it does **not** trust the `adminRole` the client claims to have.

### One-time setup: add the service-role key

Never prefix this with `VITE_` — that prefix ships a variable to every visitor's browser. Get the key from Supabase Dashboard → Settings → API → **service_role** (the long one below `anon`, marked secret).

- **Local dev:** add to `.dev.vars` (already gitignored): `SUPABASE_SERVICE_ROLE_KEY=your_key_here`
- **Production (Cloudflare):** Cloudflare Dashboard → your Worker/Pages project → Settings → Variables and Secrets → add `SUPABASE_SERVICE_ROLE_KEY` as an **encrypted secret** (not a plain variable)

Until this is set, `inviteStaffFn` fails with a clear "not configured" error rather than silently doing nothing.

---

## Fixed: P0-2 — verified payment recording, and P1-1 — atomic plot reservation

**Code:** [src/lib/paymentActions.ts](../src/lib/paymentActions.ts) — `recordVerifiedPayment` is now the *only* place that writes a `payments` row. It calls Paystack's `GET /transaction/verify/:reference` server-side (using `PAYSTACK_SECRET_KEY`, never sent to the browser) and writes only what Paystack itself confirms — amount, status, currency — never anything the client asserted. Idempotent on `paystack_reference` (safe to call twice for the same payment).

The plot-status update is now a single conditional query — `UPDATE plots SET status='booked' WHERE phase_id=… AND plot_number=… AND status='available'` — checking rows-affected. Two buyers racing for the same plot can no longer both "win": whoever's verified payment lands first flips it, the second gets `plotWarning` back for manual reconciliation instead of silently overwriting.

**Flow change:**
- `payment.tsx` — Paystack's client-side "success" callback no longer navigates directly. It calls the new `verifyPaymentFn` server function with the reference, shows "Confirming your payment…", and only proceeds to `/thank-you` once the server confirms. A failure shows an inline error with the reference number for manual follow-up rather than a fake success page.
- `thank-you.tsx` — rewritten to be **read-only**. The entire old `fetchTransactionDetails` block (which inserted payments/agreements/bookings and updated plot status directly from unverified URL params — the actual vulnerability) is deleted, not disabled. It now calls `getReceiptFn({ inquiryId })` to read back the already-verified record. This was also a **live bug fix**, independent of security: that old code matched inquiries by `plot_number_ref` + `phase_name` and updated `plots` by a `phase_name` column that doesn't exist on the `plots` table (it's `phase_id`) — the plot-status update in the old flow was silently failing (or erroring, uninspected) for every real payment.
- **Migration [0002](../supabase/migrations/0002_close_payment_insert.sql)** removes the `_TEMP` anon INSERT policies on `payments`/`agreements` and the anon UPDATE policy on `plots` — nothing legitimate writes to any of these from the browser anymore. Run this **after** confirming the new code is deployed, not before (running it against the old client-insert code breaks every purchase).

### One-time setup: add the Paystack secret key
Same rule as the Supabase service role — never `VITE_`-prefixed. Get it from Paystack Dashboard → Settings → API Keys → **Secret Key**.
- **Local dev:** `.dev.vars`: `PAYSTACK_SECRET_KEY=sk_test_...`
- **Production:** Cloudflare encrypted secret, same as `SUPABASE_SERVICE_ROLE_KEY`

### What's honestly still missing: the webhook
Only the **client-triggered** verify path is built — called the moment Paystack's popup reports success. This closes the actual forgery hole (nothing is trusted from the client; everything is re-checked against Paystack's API). It does **not** cover the edge case where a buyer's money leaves their account but they close the tab before the verify call completes — that needs a true Paystack webhook (signature-verified, hitting the same `recordVerifiedPayment` so it stays idempotent either way it arrives). Not built in this pass — flagged rather than silently skipped. Needs a live Paystack sandbox round-trip to build and verify properly, which wasn't available in this session.

### bookings / inquiries INSERT — still open, correctly
Unlike payments/agreements, these are still legitimately written from the browser: the booking forms and the diaspora inquiry form don't involve money and were never part of this vulnerability.

### P0-3 — Client portal OTP is untouched
`client_otps` isn't in the generated `Database` type and isn't part of any migration yet. The whole mechanism (client-side `Math.random()` OTP, rendered on screen, `sessionStorage`-only session) needs a proper rebuild, not an RLS patch on top of a fundamentally client-side-only scheme. Next.

---

## Not yet started
- P0-2 (partial) — the Paystack **webhook** specifically (client-verify path is done — see above)
- P0-3 — Server-verified portal OTP + real session
- P1-5 — Signed/expiring URLs for generated documents
- P1-6 — Rate limiting on public write endpoints
- P1-8 — Cloudflare Worker entry not wired into the build (blocks verifying the edge-cache fix from Phase 2 at runtime)
