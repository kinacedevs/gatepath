# Gatepath Realtors — Devil's Advocate Critique

Adversarial review of the platform as built. Every claim is anchored to a file and line. Priorities: **P0** ship-blocking · **P1** must fix before scale · **P2** quality/conversion · **P3** cleanup.

The blunt summary: **the marketing site is decent and the CRM is ambitious, but the trust layer underneath them does not exist.** For a business that moves large sums and holds national ID and KRA PIN data through to title-deed issuance, the current architecture treats the browser as trusted. It cannot go live as-is.

---

## P0 — Ship-blocking

### P0-1 · `/admin` is completely unauthenticated — fixed on this branch
[admin.tsx:97](../src/routes/admin.tsx#L97), [:169](../src/routes/admin.tsx#L169), [:221-223](../src/routes/admin.tsx#L221-L223) *(pre-fix line numbers)*

The CEO/staff console hardcoded a mock session, the role check was commented `(Bypassed)`, and `handleLogin` was an empty function. `loadAllData()` fired on mount and pulled `inquiries`, `payments`, `agreements`, `admin_users` and `affiliates` into the browser — for anyone, unauthenticated.

**The deeper problem was confirmed, not assumed:** a live read-only query against the production Supabase project using only the public anon key successfully read live data. RLS was effectively permissive, so the UI gate alone would have been cosmetic.

**Fixed:** real Supabase Auth session in `admin.tsx` (login form, `onAuthStateChange`, role resolved from `admin_users`) plus RLS policies on all 11 tables restricting `inquiries`/`bookings`/`payments`/`agreements`/`admin_users` SELECT to recognised admins. Full detail, the exact SQL, and the one-time setup runbook (admin_users currently has **zero rows** — nobody has ever been added) are in [SECURITY_HARDENING.md](SECURITY_HARDENING.md).

**Still open on purpose, not yet fixed:** `payments`/`agreements`/`bookings`/`inquiries` INSERT and `plots` UPDATE remain accessible to anon — closing them now, before P0-2's webhook verification exists, would break every purchase and reservation on the site. See SECURITY_HARDENING.md's "deferred on purpose" section.

---

### P0-2 · Payment records are forgeable — fixed (client-verify path); webhook still open
*(pre-fix line numbers)* [payment.tsx:96](../src/routes/payment.tsx#L96), [:108-119](../src/routes/payment.tsx#L108-L119), [thank-you.tsx:123-160](../src/routes/thank-you.tsx#L123-L160)

The buy flow used to assert payment success via **URL parameters** and write the financial record **from the browser**: client-chosen amount, a client-generated reference, a Paystack callback that only navigated without verifying anything, and `/thank-you` inserting `payments`/`agreements`/`bookings` and setting the plot to `booked` directly.

**Fixed:** `payment.tsx`'s callback now calls a server function that re-verifies the transaction against Paystack's own API before anything is written — see [SECURITY_HARDENING.md](SECURITY_HARDENING.md) for the full flow change, including a live bug this surfaced (the old plot-status update filtered on a column, `plots.phase_name`, that doesn't exist on that table — it was silently failing for real payments, independent of the security issue).

**Honestly still open:** only the client-triggered verify path is built. A true signature-verified Paystack **webhook** (covering the case where a buyer closes the tab before the verify call completes) is not built — flagged, not silently dropped. See SECURITY_HARDENING.md.

**Impact:** `GET /thank-you?ref=anything&plot=A12&amount=5000000` creates a paid record and books a plot without a shilling changing hands. Conversely a real payer who closes the tab before redirect gets **no record at all** — money in, nothing recorded.

**Fix:** a Paystack **webhook** as the only writer of payment truth — HMAC signature verified, re-confirmed against Paystack's verify endpoint, idempotent on `reference`, executed with the service role. Prices resolved server-side from `plots`/`plot_sizes`. Revoke public INSERT on `payments`, `agreements`, `bookings`. `/thank-you` becomes read-only.

---

### P0-3 · Client portal OTP was theatre — fixed
*(pre-fix line numbers)* [portal.tsx:206](../src/routes/portal.tsx#L206), [:428](../src/routes/portal.tsx#L428), [:118](../src/routes/portal.tsx#L118)/[:248](../src/routes/portal.tsx#L248)

The OTP used to be generated in the browser with `Math.random()` and **rendered on the page** in a "WhatsApp OTP Code" box. The session was a single `sessionStorage` key holding an email address — `sessionStorage.gatepath_portal_email = "victim@example.com"` gave full access to that client's plot, payments, documents and conveyancing stage.

**Fixed:** [src/lib/portalActions.ts](../src/lib/portalActions.ts) — OTP generated server-side with a real CSPRNG (`crypto.getRandomValues`), hashed (salted SHA-256) before storage, never returned to the client. 5-minute TTL, 5-attempt limit. Verification issues an opaque server-side session token (`portal_sessions` table) — the client only ever holds that token, never the email-as-credential. `client_otps` and `portal_sessions` are both fully RLS-locked (service-role only, no anon/authenticated policy at all — see migration [0003](../supabase/migrations/0003_portal_otp_lockdown.sql)).

**A second forgery hole in the same file, found and fixed alongside this:** the in-portal installment payment inserted a "success" `payments` row directly from the browser — and if the Paystack SDK simply hadn't loaded, did so **without ever opening a payment popup at all**. Now reuses the same `verifyPaymentFn` from the P0-2 fix, gated by a fresh ownership check (`assertPortalOwnsInquiryFn`) proving the session actually owns the inquiry being paid against.

**Accepted trade-off, same as admin auth:** session token lives in `sessionStorage`, not an httpOnly cookie — consistent with the rest of the app's session handling, not a server-cookie architecture.

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

### P1-1 · Plot reservation race condition — fixed for the payment path
Was: status checked in the UI, then written with a plain `update` — two diaspora buyers hitting the same plot concurrently could both succeed. **Fixed** as part of the P0-2 work: `recordVerifiedPayment` now does `UPDATE plots SET status='booked' WHERE … AND status='available'` and checks rows-affected, so only one verified payment can ever flip a given plot. The loser gets flagged for manual reconciliation rather than silently overwriting. See SECURITY_HARDENING.md.

### P1-2 · The 5-stage pipeline has no integrity controls
Stage changes are plain column updates with no role gate, no append-only history, and no audit log. Nobody can prove who advanced a buyer to "Title Deed Issued" or when. For a process that ends in a land title, this is the difference between a record and an assertion. Needs an append-only `conveyancing_events` table with actor, timestamp and reason.

### P1-3 · Money is handled as floating-point
`amount: deposit * 100` and `Math.ceil(bal / period)` operate on JS numbers. Installment schedules will drift by cents and fail to reconcile against Paystack settlements. Store and compute in integer minor units.

### P1-4 · Five contradictory exchange rates (not three) — fixed on this branch
Widening the count on further sweep: `0.0077` (Gemini-era `diaspora.tsx`), `129.5` (`main`'s `CURRENCY_RATES`), `/130` (`PhaseCard`, `properties.$slug`), `/130` again (`PlotPanel.priceUsd`), and a fifth — `PlotPanel`'s reserve-hold button hardcoded `"$77 USD"` for a `Ksh 10,000` hold, implying yet another rate (≈129.87). All hardcoded, none fetched. [payment.tsx:97](../src/routes/payment.tsx#L97) still always charges KES.

**Fixed:** [src/lib/currency.ts](../src/lib/currency.ts) is now the single source of truth — `PhaseCard`, `PlotPanel`, `properties.$slug.tsx`, and `diaspora.tsx` all consume it. **Not fixed:** the rates are still hand-maintained estimates, not server-fetched, and nobody has recorded when they were last checked against real FX. A diaspora buyer is still shown a converted price and charged an unstated KES sum at Paystack's FX plus their card issuer's — that remains a chargeback/complaint risk. Needs a real server-fetched, cached, timestamped rate and the KES amount shown before checkout (payment.tsx still doesn't do this — tracked separately, not yet fixed).

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

### P1-9 · Two client-facing "features" were fully decorative — no data behind them
Found while restoring the diaspora page:
- [properties.$slug.tsx](../src/routes/properties.$slug.tsx) had a "Download Phase Brochure" `<button>` with **no `href`, no `onClick`, no connection to `phase.brochure_url` at all** — purely decorative. **Fixed:** now a real link, hidden entirely when the phase has no brochure/plot-map uploaded (confirmed via a live read-only query: currently true for every phase).
- `site_banners` (the table backing `Hero.tsx`'s homepage carousel, `FeaturedLocations.tsx`'s per-location overrides, and the document pages' company-logo branding) has **no admin UI that writes to it at all**. Whoever manages homepage banners or the company logo today must do it by hand in the Supabase dashboard. A "Site Banners" admin tab is a concrete Phase 5 addition — see STATE_AUDIT §8.

---

## P2 — Conversion and experience

### P2-1 · The diaspora tab lost its entire reason to exist — fixed on this branch
The Gemini-era version had **no property listings** (208 lines vs 679 on `main`). A diaspora visitor got reassurance and a currency widget, then had to leave for the main catalog — losing currency context on the way. **Fixed:** full catalog restored in-tab, driven by a global 7-currency selector that now propagates through to the property detail page too (previously hardcoded to a KES/USD binary regardless of the visitor's actual selection). See STATE_AUDIT §8 for the full list of what was merged and fixed.

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
- **Foreign design DNA.** The `Stitch CRM Design DNA` `@theme inline` block injects a Material-3 palette (`#0d1c32`, `#2b1701`) unrelated to the brand — the source of the dark navy drift. Fixed in the Phase 2 token pass.
- **A sixth rogue navy.** [admin.tsx:72](../src/routes/admin.tsx#L72) defines a local `NAVY = "#0C1A30"` constant, distinct from every other navy found across the codebase (`#074B7D` brand, `#0d1c32` Stitch, `#0A192F` FeaturedLocations, `#0A3D62` email templates). Left as-is deliberately — it's used throughout admin.tsx's still-inline-style-driven layout, and replacing it piecemeal ahead of the Phase 5 restructure would just be more inline-style churn to redo later. Fix as part of that restructure, not before.
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
