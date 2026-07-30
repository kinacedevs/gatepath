# Gatepath Realtors — State Audit

**Branch:** `redesign/ecosystem-v2` · **Baseline commit:** `5fc735f`
**Audited:** 2026-07-29 · **Method:** direct source read of the working tree

---

## 1. Stack

| Layer | Technology |
|---|---|
| Framework | TanStack Start (SSR) + TanStack Router (file-based routes) |
| UI | React 19, TailwindCSS v4, Radix UI primitives, shadcn-style `components/ui` |
| Language | TypeScript 5.8 (strict-ish; `any` escape hatches widespread in `admin.tsx`) |
| Data | Supabase (`@supabase/supabase-js` v2) — Postgres, Realtime, Storage |
| Payments | Paystack (inline JS popup, `PaystackPop`) |
| Hosting | Cloudflare Workers via `@cloudflare/vite-plugin` + Wrangler |
| Notifications | Resend (email) + Africa's Talking (SMS), both raw HTTP — see [lib/notifications.ts](../src/lib/notifications.ts) |
| Charts | Recharts (admin dashboard) |
| Build | Vite 7, Bun lockfile present alongside `package-lock.json` |

**Baseline health:** `npx tsc --noEmit` passes; `npm run build` succeeds in ~11s. The tree is not broken — the problems are architectural, not compilation.

> **Note:** the git repository root is the *nested* `gatepathrealtors-main/gatepathrealtors-main`. The outer folder is not a repo. Two remotes: `origin` → `kinacedevs/gatepath`, `mirror` → `JM-DFIR/gatepathrealtors`. `origin/main` is 8 commits behind local `main`.

---

## 2. Routes

**Public marketing:** `index`, `about`, `contact`, `locations`, `partner`, `privacy`, `blog.index`, `blog.$slug`
**Inventory:** `properties.index`, `properties.$slug`
**Diaspora:** `diaspora`
**Buy flow (3 steps):** `inquire` → `payment` → `thank-you`, plus `book-visit`
**Client:** `portal`
**Staff/CEO:** `admin`
**Documents:** `document.agreement.$id`, `document.receipt.$id`

Six of these — `portal`, `about`, `contact`, `locations`, `partner`, `privacy` — plus `BarakaPlainsMap`, `ChooseYourPath`, `CookieConsent` and `LoanCalculator` existed **only as untracked files in the working tree** and were never committed to `main`. They are now preserved in `5fc735f`.

---

## 3. Data model

11 tables in the generated `Database` type ([lib/types.ts](../src/lib/types.ts)):

`phases` · `plot_sizes` · `plots` · `inquiries` · `bookings` · `payments` · `agreements` · `admin_users` · `blog_posts` · `affiliates` · `site_banners`

**No SQL migrations exist in the repo.** There are no `.sql` files and no `supabase/` directory, so the schema and — critically — the RLS policies live only in the hosted Supabase project. They are unversioned, unreviewable, and unreproducible.

---

## 4. The 5-stage title-deed pipeline

Defined in [portal.tsx](../src/routes/portal.tsx) as `CONVEYANCING_STAGES`:

1. Payment Verification & Receipt Issued
2. Cadastral Survey & Beaconing
3. Sales Agreement Executed (signed by CEO & buyer)
4. Ministry of Lands Stamp Duty & Search
5. Title Deed Issued & Dispatched

The buyer tracks progress in `/portal`; the CEO advances operations from `/admin`.

---

## 5. Payment path — fixed (client-verify path; webhook still pending)

Original, insecure chain (kept for the historical record):

```
inquire  →  InquiryContext (sessionStorage)
   ↓
payment.tsx  →  PaystackPop.setup({ amount: deposit * 100, currency: "KES" })
   ↓            amount and reference both chosen in the browser
Paystack popup
   ↓  callback(response)
navigate("/thank-you?ref=…&plot=…&amount=…")   ← success asserted via URL params
   ↓
thank-you.tsx  →  supabase.from("payments").insert(…)      ← browser, anon key
                  supabase.from("agreements").insert(…)
                  supabase.from("bookings").insert(…)
                  supabase.from("plots").update({ status: "booked" })
```

There was no server-side verification anywhere in that chain — no Paystack webhook, no call to Paystack's verify endpoint, no idempotency key, no service-role boundary.

**Current chain**, per [SECURITY_HARDENING.md](SECURITY_HARDENING.md):

```
inquire.tsx  →  creates the real `inquiries` row, stores inquiryId in InquiryContext
   ↓
payment.tsx  →  PaystackPop.setup(...) — same UX
Paystack popup
   ↓  callback(response) — "success" here is only a UI signal, nothing is trusted yet
verifyPaymentFn({ reference, inquiryId })            ← server function, lib/paymentActions.ts
   ↓  server calls Paystack's verify API directly with PAYSTACK_SECRET_KEY
   ↓  writes payments/agreements + atomic conditional plots.status update,
   ↓  all via the service role — using only what Paystack itself confirmed
navigate("/thank-you?inquiryId=…")                    ← no amount/status trusted from the URL
   ↓
thank-you.tsx  →  getReceiptFn({ inquiryId })   ← read-only, server function
```

`payments`/`agreements` INSERT and `plots` UPDATE are no longer anon-writable at all (migration `0002_close_payment_insert.sql`) — nothing legitimate needs to write to them from the browser anymore.

**Still open:** a signature-verified Paystack webhook (covers a buyer closing the tab before the client-side verify call completes) is not built.

---

## 6. Authentication

| Surface | Mechanism | State |
|---|---|---|
| `/admin` | **Supabase Auth — fixed** | Real login form + `onAuthStateChange`, role resolved from `admin_users` by email match, gated by RLS (see [SECURITY_HARDENING.md](SECURITY_HARDENING.md)). Was: `sessionUser` hardcoded to a mock CEO, session check commented `(Bypassed)`, `handleLogin` an empty function. |
| `/portal` | **server-verified OTP — fixed** | Real CSPRNG OTP generated server-side, hashed before storage, never sent to the client (see [lib/portalActions.ts](../src/lib/portalActions.ts)). Session is an opaque server-issued token in a new `portal_sessions` table, not the client's own email. Was: `Math.random()` in the browser, **rendered on screen** in a "WhatsApp OTP Code" box, session = `sessionStorage["gatepath_portal_email"]`. |
| Public pages | n/a | — |

Supabase Auth (`persistSession`, `autoRefreshToken` in [lib/supabase.ts](../src/lib/supabase.ts)) is now actually used to gate `/admin`. `admin_users` had **zero rows** before this fix — see SECURITY_HARDENING.md's setup runbook for the one-time bootstrap.

The portal's in-portal installment payment had the same class of bug as P0-2 (direct browser insert, no verification) — plus a fallback path that recorded a "successful" payment without ever opening a Paystack popup if the SDK failed to load. Both fixed by reusing the P0-2 verification path — see SECURITY_HARDENING.md.

---

## 7. Design system — fixed on this branch (commit `3d2ba7b`)

This section originally documented the design system as broken. It has since been repaired; the findings are kept below for the historical record, followed by current status.

**Original problem — tokens were not the operative source of truth:**

1. **Hex literals throughout components.** `#0B7FC7`, `#074B7D` and `#E8A020` appeared as hardcoded values across section components and route files instead of `var(--primary)` / token classes.
2. **`admin.tsx` is inline-`style` driven.** Nearly every element carries `style={{ fontFamily: "Inter, sans-serif", color: "#6B7280", … }}`. This part is **still true** — inline styling was tokenized in place (hex → `var(--token)`), not converted to Tailwind classes; the full restructure is deferred to Phase 5 (CRITIQUE P3).

A `Stitch CRM Design DNA` `@theme inline` block was appended to `styles.css`, importing a Material-3 palette (`--color-primary-container: #0d1c32`, `--color-tertiary-container: #2b1701`, etc.) unrelated to — and darker than — the Gatepath brand. This was the source of the CRM's dark-navy drift.

### Palette divergence between the two eras (resolved)

| Token | Sonnet-era (`main`) | Gemini-era (working tree) | Resolved to |
|---|---|---|---|
| `--accent` | `#E8A020` warm gold | `#D4AF37` metallic gold | `#E8A020` |
| `--accent-dark` | `#C8861A` | `#AA8C2C` | `#C8861A` |
| `--background` | `#F8F4EE` warm ivory | `#FAF7F2` | `#F8F4EE` |
| `--nav` | `#074B7D` deep navy | `#0B7FC7` cerulean | `#0B7FC7` (already correct) |

Typography is consistent across both: Cormorant Garamond (headings), Playfair Display (display), Inter (body), Montserrat (numerals).

### Current status

- `--primary-deep`, `--primary-dark`, `--nav`, `--footer-deep`, `--accent-dark` are now exposed to Tailwind via `@theme inline` — they existed in `:root` but were never wired in, which is the actual root cause of components falling back to hardcoded hex in the first place.
- The Stitch Material-3 block is removed. The ~15 token names `admin.tsx` references as Tailwind utility classes (`bg-primary-container`, `text-on-surface-variant`, `border-outline-variant`, `bg-surface-container-low/-high`, etc. — confirmed by exhaustive grep, ~140 call sites) are kept, with values re-derived from Gatepath tokens instead of Material-3 hex, so no `admin.tsx` edits were needed to fix its CRM chrome colors.
- 406 Tailwind bracket-hex classes and 201 inline-style hex strings across 34 files were converted to tokens. A fourth previously-undocumented rogue navy (`#0A192F`, `FeaturedLocations.tsx` only) was found and folded into `--primary-deep`, and a fifth (`#0A3D62`, hardcoded in the `notifications.ts` email templates) was corrected by hand — that file is excluded from `var()` tokenization since email clients don't support CSS custom properties.
- Verified against the actual compiled `dist/client` CSS, not just source: zero off-brand hex or decimal-rgba values remain anywhere in the shipped output.

---

## 8. Diaspora hub — restored (commit pending in this session)

**Original regression**, kept for the record:

| | `main` (Sonnet-era) | Working tree (Gemini-era) |
|---|---|---|
| Lines | 679 | 208 |
| Property catalog | **Yes** — `PhaseCard` grid in-tab | **None** |
| Currencies | 6 (USD/GBP/EUR/CAD/AUD/AED) | 4 (KES/USD/GBP/EUR) |
| Timezone selector | Yes | No |
| Budget filters | Yes | No |
| Nairobi clock widget | No | Yes |
| 4-fear trust framework | No | Yes |

The newer version was visually cleaner but had **removed the ability to browse property from the diaspora tab entirely** — the core purpose of the page.

### Five conflicting rates found (not three) — now unified

Widening the original 3-rate finding, a full sweep turned up two more:

| Location | Rate | Implied KES/USD |
|---|---|---|
| `diaspora.tsx` (Gemini-era) | `0.0077` | ≈129.87 |
| `main` diaspora `CURRENCY_RATES` | `129.5` | 129.5 |
| `PhaseCard` / `properties.$slug` | `/ 130` | 130 |
| `PlotPanel.tsx` `priceUsd` | `/ 130` | 130 |
| `PlotPanel.tsx` reserve-hold button copy | `"$77 USD"` for `Ksh 10,000` | ≈129.87 |

**Fixed:** [src/lib/currency.ts](../src/lib/currency.ts) is now the single source of truth (`CURRENCY_RATES`, `formatFromKes`, `fromKes`) for KES/USD/GBP/EUR/CAD/AUD/AED. `PhaseCard`, `PlotPanel`, `properties.$slug.tsx`, and `diaspora.tsx` all consume it. The rates themselves are still hand-maintained estimates (carried over from the pre-existing `main` values) — nobody has recorded when they were last checked against a real FX source; see the comment in `currency.ts`.

### Diaspora page rebuilt — merge of both eras plus real fixes

- Full property catalog restored (location/status/price/search filters + `PhaseCard` grid), now driven by a **global currency selector** (7 currencies, not 4) persisted in `localStorage`, instead of the old USD-only hardcode.
- Hero image: was a generic Unsplash "Kenya Coastal Landscape" stock photo. Now uses the **real branded asset** `src/assets/diaspora.jpg` (already in the repo, just orphaned since the Gemini-era rewrite dropped it), with an optional CEO-uploaded override via `site_banners` id `"diaspora_hero"` — same pattern as `Hero.tsx`'s `"homepage_hero"`.
- Selecting a currency and clicking into a property now **propagates the actual currency** to `properties/$slug` via the search param (previously hardcoded to a KES/USD binary regardless of what the diaspora visitor had selected).
- **New:** `PhaseCard` and the property detail page now surface `Download` buttons for `phase.brochure_url` / `phase.plot_map_url` when set. These fields existed in the schema and admin's Media tab, but **nothing on the client rendered them** — `properties.$slug.tsx` had a "Download Phase Brochure" `<button>` with no `href` or handler at all, purely decorative.
- Merged trust content: the newer version's 4-point quick-glance strip (Verified Titles, Zero Double Allocation, POA Guide, Global Card/Wire Rails) plus `main`'s detailed 6-step secure-purchase timeline and full virtual-tour booking form, rather than picking one and losing the other.

### Live data check (read-only query against the production Supabase project)

`image_url` and `hero_image_urls` are genuinely populated for most phases (12 of 13 have a real `image_url`; several have 3-4 `hero_image_urls`) — confirming the user's real photography is in the database and rendering correctly through the existing `adaptPhase()` fallback chain. `zuri-court-phase-6` has no `image_url` set and falls through to a location-based stock default. **`brochure_url`, `plot_map_url`, and `diaspora_image_url` are empty on every phase** — the upload fields exist in admin, nothing has been uploaded to them yet.

### Known gap: no admin UI writes to `site_banners`

`Hero.tsx` (`"homepage_hero"`), `FeaturedLocations.tsx`, and the document pages (`"custom_branding"` — company logo/name on generated agreements/receipts) all **read** from `site_banners`. Nothing in `admin.tsx` **writes** to it. Whoever manages this today must do it by hand in the Supabase dashboard. A "Site Banners" admin tab (homepage hero images, per-location banners, the diaspora hero override, and the company branding logo/name) is a concrete, self-contained addition for Phase 5.

---

## 9. Edge caching — and a broken Worker entry

[server.ts](../src/server.ts) caches every `GET` in Cloudflare's **shared** cache for 60s, excluding only `/admin`, `/document` and `/api`. `/portal` and `/thank-you` would therefore be cached — both render personalised client data.

**But `src/server.ts` is not in the build output.** Verified by grep against `dist/`: no string unique to that file (`[Gatepath Edge Cache]`, `brandedErrorResponse`, `isCacheable`) appears anywhere, while control strings from files that *are* built appear as expected. `npm run build` emits TanStack Start's own server entry instead.

Consequences:
- The edge caching added in `8ce52c4` has most likely never executed in production.
- The PII cache leak is **latent rather than active** — armed, but not currently reachable.
- The deployment pipeline is ambiguous: `wrangler.jsonc` sets `"main": "src/server.ts"` (Wrangler bundling) while Vite emits `dist/server/server.js`, and `@cloudflare/vite-plugin` is installed but not registered in `vite.config.ts`.

`vite dev` also bypasses the Worker entry, so no `Cache-Control` header is observable locally. See CRITIQUE P1-8.

---

## 10. Maintainability

- `admin.tsx` is a single ~3,000-line file holding every CRM tab, all data fetching, and all presentation.
- ESLint was configured to silence TypeScript `any` checks (commit `4583ea8`), and `(supabase as any)` casts are pervasive, disabling type safety exactly where the generated `Database` types would be most valuable.
- Build/debug detritus (`admin_diff.txt`, `admin_diff_utf8.txt`, `temp_tabs.txt`, `debug_reconstruct.py`) sat in the repo root; now git-ignored.
- Both `bun.lock` and `package-lock.json` are committed, so install behaviour depends on which tool is run.

---

## 11. Redesign history

Reconstructed from `git log` (25 commits on `main`):

- `308b665` — Phase 4: Supabase integration, real booking form, Lovable branding removed
- `0edecc6` → `f95816d` — Supabase dynamic fetching, README
- `0a5548a` — Diaspora investment portal route introduced
- `b379020` — CEO & Staff Control Console at `/admin`
- `06dfca3` — Blog engine + admin CMS + dynamic Paystack keys
- `b6943e1` — Ksh 15,000 direct reservation hold, Africa's Talking SMS
- `4396233` — Build 4.6: Virtual Visits, Pickup Locations, USD Diaspora Hub
- `8ce52c4` — Cloudflare edge caching + SWR client cache
- `fd59b34` — Diaspora catalog overhauled to render natively in USD
- `bcbcd9a` — CSRF middleware added to server functions
- `4583ea8` — ESLint `any` rules silenced
- `5fc735f` — *(this branch)* Antigravity/Gemini-era working tree preserved

**Limitation:** only committed iterations are visible. Lovable and Antigravity exports arrive as large squashed commits, so the count understates the true number of design iterations. The authoritative picture of the current concept comes from the source read above, not from history.
