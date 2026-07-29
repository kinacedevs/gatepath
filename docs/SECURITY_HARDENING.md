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

1. **Run the migration.** Paste the full contents of `supabase/migrations/0001_admin_auth_and_rls.sql` into the Supabase SQL Editor and run it. Safe to re-run — every statement is idempotent.

2. **Seed your own CEO row** (edit the email/name, then run in the SQL Editor):
   ```sql
   insert into public.admin_users (id, email, full_name, role)
   values (gen_random_uuid(), 'your-real-email@example.com', 'Your Name', 'ceo');
   ```

3. **Create the matching Supabase Auth login:** Dashboard → Authentication → Users → Add User. Use **the exact same email** as step 2, set a password. (Or "Invite" if you'd rather set the password via emailed link.)

4. **Test it:** go to `/admin`, sign in with that email/password. You should land on the dashboard as CEO. Adding further staff (managers/agents) works from the CEO's **Staff** tab as before — just also create their Supabase Auth login the same way (step 3) with a matching email.

### Accepted trade-off
The session is stored via Supabase's default `persistSession` (browser `localStorage`), not an httpOnly server cookie. Standard for a Supabase Auth SPA setup and consistent with how this app already handles sessions elsewhere; a server-side cookie session would need the TanStack Start server-function layer, which isn't built yet.

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
