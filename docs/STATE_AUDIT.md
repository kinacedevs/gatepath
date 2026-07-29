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

## 5. Payment path as currently built

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

**There is no server-side verification anywhere in this chain.** No Paystack webhook, no HMAC signature check, no call to Paystack's verify endpoint, no idempotency key, no service-role boundary. The database is mutated directly by the public client using the anon key.

---

## 6. Authentication as currently built

| Surface | Mechanism | State |
|---|---|---|
| `/admin` | none | `sessionUser` hardcoded to a mock CEO ([admin.tsx:97](../src/routes/admin.tsx#L97)); session check commented `(Bypassed)` ([:169](../src/routes/admin.tsx#L169)); `handleLogin` is an empty function ([:221-223](../src/routes/admin.tsx#L221-L223)); `handleLogout` alerts *"Login system is currently disabled for redesign."* |
| `/portal` | client-side OTP | OTP generated in the browser via `Math.random()` ([portal.tsx:206](../src/routes/portal.tsx#L206)) and **rendered on screen** ([:428](../src/routes/portal.tsx#L428)); session is `sessionStorage["gatepath_portal_email"]` |
| Public pages | n/a | — |

Supabase Auth is initialised in [lib/supabase.ts](../src/lib/supabase.ts) (`persistSession`, `autoRefreshToken`) but **is not used to gate anything**.

---

## 7. Design system

Tokens are declared as CSS custom properties in [styles.css](../src/styles.css) — brand colours, the four font families, and shadow presets.

**They are not the operative source of truth.** Two things defeat them:

1. **Hex literals throughout components.** `#0B7FC7`, `#074B7D` and `#E8A020` appear as hardcoded values across the section components and route files rather than as `var(--primary)` / token classes.
2. **`admin.tsx` is inline-`style` driven.** Nearly every element carries `style={{ fontFamily: "Inter, sans-serif", color: "#6B7280", … }}`, with local `NAVY` / `GOLD` constants.

Consequence: **changing a CSS variable does not change the site.** This is the single biggest structural blocker to any redesign.

A `Stitch CRM Design DNA` `@theme inline` block was appended to `styles.css`, importing a Material-3 palette (`--color-primary-container: #0d1c32`, `--color-tertiary-container: #2b1701`, etc.) that is unrelated to — and darker than — the Gatepath brand.

### Palette divergence between the two eras

| Token | Sonnet-era (`main`) | Gemini-era (working tree) |
|---|---|---|
| `--accent` | `#E8A020` warm gold | `#D4AF37` metallic gold |
| `--accent-dark` | `#C8861A` | `#AA8C2C` |
| `--background` | `#F8F4EE` warm ivory | `#FAF7F2` |
| `--nav` | `#074B7D` deep navy | `#0B7FC7` cerulean |

Typography is consistent across both: Cormorant Garamond (headings), Playfair Display (display), Inter (body), Montserrat (numerals).

---

## 8. Diaspora hub — regression

| | `main` (Sonnet-era) | Working tree (Gemini-era) |
|---|---|---|
| Lines | 679 | 208 |
| Property catalog | **Yes** — `PhaseCard` grid in-tab | **None** |
| Currencies | 6 (USD/GBP/EUR/CAD/AUD/AED) | 4 (KES/USD/GBP/EUR) |
| Timezone selector | Yes | No |
| Budget filters | Yes | No |
| Nairobi clock widget | No | Yes |
| 4-fear trust framework | No | Yes |

The newer version is visually cleaner but **removed the ability to browse property from the diaspora tab entirely** — the core purpose of the page.

### Three conflicting FX rates coexist

| Location | Rate | Implied KES/USD |
|---|---|---|
| [diaspora.tsx:26](../src/routes/diaspora.tsx#L26) | `0.0077` | ≈129.87 |
| `main` diaspora `CURRENCY_RATES` | `129.5` | 129.5 |
| `PhaseCard` / `properties.$slug` | `/ 130` | 130 |

All are hardcoded in the frontend. None is fetched. Meanwhile [payment.tsx:97](../src/routes/payment.tsx#L97) always charges `currency: "KES"`, so a diaspora buyer sees a USD price and is charged an unstated KES amount.

The currency switcher exists only on `/diaspora`; `PhaseCard` and `PlotPanel` already accept a `currency` prop, so the plumbing for a global switcher is partly in place.

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
