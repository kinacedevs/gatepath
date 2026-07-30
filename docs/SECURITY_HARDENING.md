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

## Deferred on purpose — do not close these without reading why

These stayed **open** in the migration so it wouldn't break the app the moment it's run. Each is marked `TEMP` in the SQL with the same reasoning inline.

### P0-2 — `payments` / `agreements` / `bookings` / `inquiries` INSERT still open to anon
`thank-you.tsx`, the booking forms, and the diaspora form all write to these tables directly from the browser today. Locking INSERT down now, before a verified Paystack webhook exists, would break every purchase and booking immediately. **Do not remove the `_TEMP` insert policies until the webhook verification path (P0-2) is built.**

### P1-1 — `plots` UPDATE still open to anon
The reservation flow updates plot status from the browser. Closing this without replacing it with a verified server-side atomic transition would break plot reservation entirely, and doesn't fix the underlying double-booking race either (that needs a real `WHERE status = 'available'` conditional update in a transaction, not just an RLS policy). Tracked as its own fix.

### P0-3 — Client portal OTP is untouched
`client_otps` isn't in the generated `Database` type and isn't part of this migration. The whole mechanism (client-side `Math.random()` OTP, rendered on screen, `sessionStorage`-only session) needs a proper rebuild, not an RLS patch on top of a fundamentally client-side-only scheme. This is the next logical piece of security work after payment verification.

---

## Not yet started
- P0-2 — Paystack webhook signature verification + idempotent server-side payment writes
- P0-3 — Server-verified portal OTP + real session
- P1-1 — Atomic plot reservation transaction
- P1-5 — Signed/expiring URLs for generated documents
- P1-6 — Rate limiting on public write endpoints
- P1-8 — Cloudflare Worker entry not wired into the build (blocks verifying the edge-cache fix from Phase 2 at runtime)
