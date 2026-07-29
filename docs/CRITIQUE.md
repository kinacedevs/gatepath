# Gatepath Realtors — Devil's Advocate Critique

Adversarial review of the platform as built. Every claim is anchored to a file and line. Priorities: **P0** ship-blocking · **P1** must fix before scale · **P2** quality/conversion · **P3** cleanup.

The blunt summary: **the marketing site is decent and the CRM is ambitious, but the trust layer underneath them does not exist.** For a business that moves large sums and holds national ID and KRA PIN data through to title-deed issuance, the current architecture treats the browser as trusted. It cannot go live as-is.

---

## P0 — Ship-blocking

### P0-1 · `/admin` is completely unauthenticated
[admin.tsx:97](../src/routes/admin.tsx#L97), [:169](../src/routes/admin.tsx#L169), [:221-223](../src/routes/admin.tsx#L221-L223)

The CEO/staff console hardcodes a mock session, the role check is commented `(Bypassed)`, and `handleLogin` is an empty function. `loadAllData()` fires on mount and pulls `inquiries`, `payments`, `agreements`, `admin_users` and `affiliates` into the browser.

**Impact:** anyone who navigates to `/admin` reads every client's full name, email, phone, national ID, KRA PIN, postal address, next-of-kin and payment history — and can approve inquiries, alter inventory, and add staff.

**The deeper problem:** those queries succeed with the *anon* key. That means RLS on these tables is permissive or off, so **the UI gate is irrelevant** — the data is readable straight from the public Supabase REST endpoint using the key that ships in the JS bundle. Adding a login screen alone fixes nothing.

**Fix:** Supabase Auth + `beforeLoad` route guard, *and* RLS policies keyed to `admin_users.role` that deny the anon role outright. Verify by querying the REST API directly with the anon key and confirming zero rows.

---

### P0-2 · Payment records are forgeable; a plot can be booked without paying
[payment.tsx:96](../src/routes/payment.tsx#L96), [:108-119](../src/routes/payment.tsx#L108-L119), [thank-you.tsx:123-160](../src/routes/thank-you.tsx#L123-L160)

The buy flow asserts payment success via **URL parameters** and then writes the financial record **from the browser**:

- `amount: deposit * 100` — the charged amount is chosen client-side with no server price authority
- `ref: GR-${plotNumber}-${Date.now()}` — the reference is client-generated and guessable
- the Paystack callback only navigates; it verifies nothing
- `/thank-you` then inserts into `payments`, `agreements`, `bookings` and sets the plot to `booked`

**Impact:** `GET /thank-you?ref=anything&plot=A12&amount=5000000` creates a paid record and books a plot without a shilling changing hands. Conversely a real payer who closes the tab before redirect gets **no record at all** — money in, nothing recorded.

**Fix:** a Paystack **webhook** as the only writer of payment truth — HMAC signature verified, re-confirmed against Paystack's verify endpoint, idempotent on `reference`, executed with the service role. Prices resolved server-side from `plots`/`plot_sizes`. Revoke public INSERT on `payments`, `agreements`, `bookings`. `/thank-you` becomes read-only.

---

### P0-3 · Client portal OTP is theatre
[portal.tsx:206](../src/routes/portal.tsx#L206), [:428](../src/routes/portal.tsx#L428), [:118](../src/routes/portal.tsx#L118)/[:248](../src/routes/portal.tsx#L248)

The OTP is generated in the browser with `Math.random()` and **rendered on the page**. The session is a single `sessionStorage` key holding an email address.

**Impact:** `sessionStorage.gatepath_portal_email = "victim@example.com"` → full access to that client's plot, payments, documents and conveyancing stage. `Math.random()` is not a CSPRNG, and the code displays the secret anyway, so even that is moot.

**Fix:** server-generated OTP, hashed at rest, short TTL, attempt-limited and rate-limited per email/IP, exchanged for a signed httpOnly cookie session.

---

### P0-4 · Personalised pages are in a shared edge cache — *latent, see status*
[server.ts](../src/server.ts)

Caching excludes `/admin`, `/document` and `/api` — but **not `/portal` or `/thank-you`**, both of which render client PII. Cloudflare's `caches.default` is shared, so one client's portal HTML would be served to the next visitor for up to 60s.

**Status — verified, and it is not what it appears:** `src/server.ts` **is not in the build output**. No string unique to that file (`[Gatepath Edge Cache]`, `brandedErrorResponse`, `isCacheable`) appears anywhere in `dist/`, while control strings from files that *are* built appear as expected. The custom Worker fetch handler never executes in the current build.

So the leak is **latent, not active** — but it is armed. It becomes a live PII leak the moment the Worker entry is correctly wired (see P1-8), which is exactly the kind of change someone makes for performance reasons without re-reading the cache predicate.

**Fixed on this branch:** the denylist is replaced with an explicit allowlist of public marketing routes, and personalised routes now emit `private, no-store, max-age=0, must-revalidate` plus `Vary: Cookie`. Denylists fail open — every new authenticated route added later would have inherited the bug.

**Caveat:** this fix cannot be verified at runtime until P1-8 is resolved. `vite dev` does not route through the Worker entry either, so no `Cache-Control` header is observable in dev today.

---

### P0-5 · The schema and RLS policies are unversioned
No `.sql` files, no `supabase/` directory.

The security posture *is* the RLS policy set, and it exists only as clicked-in state in a hosted dashboard. It cannot be reviewed, diffed, tested, rolled back, or recreated. Every other P0 fix here depends on policies nobody can currently see.

**Fix:** adopt Supabase CLI migrations, commit the schema and every policy, and treat policy changes as reviewable code.

---

## P1 — Must fix before scale

### P1-1 · Plot reservation has a race condition
Status is checked in the UI and then written with a plain `update`. Two diaspora buyers hitting the same plot concurrently can both succeed — the exact "double allocation" the diaspora page promises ([diaspora.tsx:180-183](../src/routes/diaspora.tsx#L180-L183)) never happens. Needs an atomic conditional transition (`UPDATE … WHERE status = 'available'`) plus a uniqueness constraint, inside a transaction.

### P1-2 · The 5-stage pipeline has no integrity controls
Stage changes are plain column updates with no role gate, no append-only history, and no audit log. Nobody can prove who advanced a buyer to "Title Deed Issued" or when. For a process that ends in a land title, this is the difference between a record and an assertion. Needs an append-only `conveyancing_events` table with actor, timestamp and reason.

### P1-3 · Money is handled as floating-point
`amount: deposit * 100` and `Math.ceil(bal / period)` operate on JS numbers. Installment schedules will drift by cents and fail to reconcile against Paystack settlements. Store and compute in integer minor units.

### P1-4 · Three contradictory exchange rates, and the buyer is charged in a currency they never saw
`0.0077` ([diaspora.tsx:26](../src/routes/diaspora.tsx#L26)), `129.5` (`main`), `/130` (`PhaseCard`) — all hardcoded, none fetched. [payment.tsx:97](../src/routes/payment.tsx#L97) always charges KES.

A diaspora buyer is shown "$2,462" and charged an unstated KES sum at Paystack's FX plus their card issuer's. That is a chargeback and complaint generator, and arguably a disclosure failure. Needs one server-fetched, cached, timestamped rate ("indicative — settled in KES at …") and the KES amount shown before checkout.

### P1-5 · Documents are likely enumerable
`document.agreement.$id` and `document.receipt.$id` are keyed by id. If those ids are sequential or guessable and RLS is permissive, agreements and receipts are enumerable. Needs signed, expiring URLs and owner-scoped policies.

### P1-6 · No rate limiting on public write paths
Inquiry, booking, reservation and OTP endpoints are unthrottled — open to spam, lead-table poisoning, and OTP enumeration.

### P1-8 · The Cloudflare Worker entry is not wired into the build
[vite.config.ts](../vite.config.ts), [wrangler.jsonc](../wrangler.jsonc), [server.ts](../src/server.ts)

`npm run build` emits `dist/server/server.js` — TanStack Start's own server entry. **`src/server.ts` is not in it.** Verified by grep: no string unique to that file appears in `dist/`, while control strings from built files do.

Three signals that the deployment pipeline is ambiguous:
- `vite.config.ts` registers the entry via `tanstackStart({ server: { entry: "./src/server.ts" } })`, yet its code is absent from the output.
- `wrangler.jsonc` sets `"main": "src/server.ts"` — a *different* pipeline, in which Wrangler bundles the TypeScript source directly. That file imports `@tanstack/react-start/server-entry`, which only resolves against the Vite build.
- `@cloudflare/vite-plugin` is a dependency but **is not registered in `vite.config.ts` plugins**.

**Impact:** everything in `src/server.ts` is currently dead code — the edge caching from commit `8ce52c4`, the h3 error normalisation, and the branded 500 page. The performance work in that commit has most likely never run in production. Nobody can say with confidence what actually executes on deploy.

**Fix:** decide on one pipeline (Vite build + `@cloudflare/vite-plugin`, or Wrangler bundling), wire it explicitly, and add a smoke check that asserts a known marker from the Worker entry is present in the deployed response. Until then, treat any claim about runtime behaviour at the edge — including caching and the P0-4 fix — as unverified.

### P1-7 · Secrets and config
[supabase.ts:13-16](../src/lib/supabase.ts#L13-L16) hardcodes the project URL and anon key as fallbacks, defeating environment configuration. The anon key is public by design, so this is not a leak — but the file's comment asserts *"RLS policies protect all sensitive data server-side,"* which is precisely the assumption P0-1 shows to be false. The comment is documenting an intention, not a control.

---

## P2 — Conversion and experience

### P2-1 · The diaspora tab lost its entire reason to exist
The current version has **no property listings** (208 lines vs 679 on `main`). A diaspora visitor gets reassurance and a currency widget, then must leave for the main catalog — losing currency context on the way. This is the highest-value page for the highest-value segment, and it is currently a brochure.

### P2-2 · The landing page is shallow
A visitor finishing the scroll has not seen the inventory breadth, the title-deed journey, the diaspora offering, or any urgency. In this market the decisive question is *"will I actually get my title?"* — and the 5-stage pipeline, the single strongest trust asset, is invisible until after purchase. It belongs on the landing page.

### P2-3 · No urgency or merchandising
No weekly hot picks, no scarcity signals, no "3 plots left in Phase 2", no price-change indicators. Competitors lean hard on active merchandising; the site reads as a passive catalog.

### P2-4 · Mobile is tolerated, not designed for
Most Kenyan and diaspora traffic is mobile. The layouts use responsive Tailwind classes but were composed desktop-first: the diaspora hero is `min-h-screen` with a 12-column grid collapsing to a tall stack, and the admin console is effectively desktop-only. Needs a 360px-first pass.

### P2-5 · The entire public site runs on 13 recycled stock photos
There is no `public/` image directory at all — every visual across the marketing site is a hotlinked `images.unsplash.com` URL. Verified count: **38 references, only 13 distinct photo IDs**, across every marketing surface (`Hero`, `CTABanner`, `FeaturedLocations`, `PropertyPreview`, `blog.index`, `blog.$slug`, `locations`, `properties.$slug`, `diaspora`).

The single most-used photo (`photo-1500382017468-9049fed747ef`) appears on **8 different pages**, including the landing page hero — the very first thing a visitor sees — and a second photo repeats across 6 more. A visitor who looks at the hero, a blog post, the locations page and a property detail page is statistically likely to see **the same stock photo twice or three times** in one session.

This directly undercuts the "billion-dollar investment project" ambition and the verification story the diaspora page is trying to tell (buyers are choosing specific, real land — generic recycled stock reads as exactly the opposite of "we verified this specific plot for you"). It also means image delivery depends on an unowned third-party CDN with no fallback if Unsplash rate-limits or the URLs rot.

**Fix:** commission or source real site/drone photography per phase/location (this is the highest-leverage, non-mechanical fix in this critique — no amount of code change substitutes for actual photos of actual land), store it in Cloudflare Images or R2, and never let the same photo appear on two different pages in one session.

### P2-6 · Trust claims are asserted, not evidenced
"100% verified titles", "Zero Double Allocation" appear as copy with nothing behind them — no registry search sample, no title numbers, no third-party verification, no named testimonials with plot references. Claims without evidence read as marketing to exactly the sceptical diaspora buyer being targeted.

---

## P3 — Cleanup

- **`admin.tsx` is ~3,000 lines** holding every tab, all fetching and all styling. Unreviewable and merge-hostile. Split per tab with shared hooks.
- **Type safety is disabled where it matters most.** ESLint `any` rules silenced (`4583ea8`) and `(supabase as any)` casts throughout — the generated `Database` types are bypassed precisely on the financial tables.
- **Design tokens are decorative.** Hex literals in components plus inline styles in `admin.tsx` mean CSS variables do not propagate. Any redesign before this is fixed becomes manual screen-by-screen editing.
- **Foreign design DNA.** The `Stitch CRM Design DNA` `@theme inline` block injects a Material-3 palette (`#0d1c32`, `#2b1701`) unrelated to the brand — the source of the dark navy drift.
- **Two lockfiles** (`bun.lock` + `package-lock.json`) make installs non-deterministic. Pick one.
- **No tests of any kind.** For payment and conveyancing logic this is the gap that turns every future refactor into a gamble.

---

## What should be rebuilt vs refactored

| Area | Verdict |
|---|---|
| Payment write path | **Rebuild.** Move all financial writes behind a verified webhook + service role. |
| Portal auth | **Rebuild.** Current design cannot be patched. |
| Admin auth + RLS | **Rebuild.** Must be built for the first time, then RLS-enforced. |
| `admin.tsx` structure | **Refactor.** Logic is sound; the file is not. Split and re-skin without touching data wiring. |
| Design tokens | **Refactor.** Restore the warm palette, delete the Stitch block, replace hex literals. |
| Diaspora hub | **Merge.** Restore the `main` catalog into the newer shell; add a global currency switcher. |
| Landing page | **Rebuild.** Depth, journey visibility, merchandising, mobile-first. |
| Marketing pages, blog, docs | **Keep.** Re-skin only. |

---

## Framework verdict

The stack choice is sound and worth keeping. TanStack Start on Cloudflare Workers gives genuinely fast global SSR — a real advantage for diaspora visitors in London, Toronto and Dubai — and Supabase provides Postgres, Realtime for live plot availability, and RLS. React 19 + Tailwind v4 + Radix is a sensible, maintainable UI stack.

The failure is not the technology. **It is that the server-side half of the architecture was never built.** TanStack Start supports server functions and the project already has CSRF middleware (`bcbcd9a`), yet all sensitive writes still happen in the browser. Supabase Edge Functions were assumed in planning but do not exist in the repo. The fix is to build that missing layer, not to change frameworks.
