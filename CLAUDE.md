# Gatepath Realtors — Project Guide

Kenyan land-sales ecosystem: public marketing site, diaspora hub, 3-step buy flow, client portal tracking a 5-stage title-deed pipeline, and a CEO/staff CRM.

**Read [docs/CRITIQUE.md](docs/CRITIQUE.md) before proposing architectural changes.** It records verified defects with file:line anchors.

---

## Commands

```bash
npm run dev       # Vite dev server
npm run build     # production build (Cloudflare Workers target)
npm run lint      # eslint
npx tsc --noEmit  # typecheck
```

Repo root is the **nested** `gatepathrealtors-main/gatepathrealtors-main`. The outer folder is not a git repository.

---

## Stack

TanStack Start (SSR) + TanStack Router · React 19 · TailwindCSS v4 · Radix/shadcn UI · TypeScript
Supabase (Postgres + Realtime) · Paystack · Cloudflare Workers · Resend (email) + Africa's Talking (SMS)

---

## Brand — these values are law

| Token | Value | Role |
|---|---|---|
| Cerulean | `#0B7FC7` | **Dominant blue.** Primary surfaces, navbar, CTAs. |
| Deep Navy | `#074B7D` | Depth and accents **only** — never the dominant surface. |
| Warm Gold | `#E8A020` | Accent. |
| Gold Dark | `#C8861A` | Accent hover/pressed. |
| Ivory | `#F8F4EE` | Page background. |

**Fonts:** Cormorant Garamond (headings) · Playfair Display (display) · Inter (body) · Montserrat (numerals).

**Resolved conflicts — do not reintroduce:**
- Gold is `#E8A020`, **not** `#D4AF37`. The metallic gold came from a Stitch import and is off-brand.
- Background is `#F8F4EE`, **not** `#FAF7F2`.
- The `Stitch CRM Design DNA` `@theme inline` Material-3 block (`#0d1c32`, `#2b1701`, …) is **removed**. Never re-add it — it is the cause of the dark-navy drift away from the intended warm light blue that blends with gold.

**Token discipline:** never write a brand hex literal in a component. Use the CSS variable or Tailwind token. Never add inline `style={{}}` for colour or typography. A token change in `styles.css` must propagate site-wide, including `/admin` — that is the acceptance test.

---

## DO NOT TOUCH without explicit instruction

Redesign work is scoped to **presentation and component structure**. The following are security-critical and change only in dedicated, separately-reviewed commits:

- Authentication and session handling (`/admin` guards, portal OTP/session)
- Supabase RLS policies and any SQL migrations
- Payment verification: Paystack webhook handling, signature checks, idempotency
- Service-role credentials and any server-only environment variable
- Conveyancing stage transitions and audit logging

**Never** write to `payments`, `agreements`, `bookings`, or mutate `plots.status` from client-side code. All financial and status writes go through verified server-side paths using the service role. The browser is not trusted.

Commit security changes separately from design changes so they can be reviewed in isolation.

---

## Architecture rules

- **Money** is stored and computed in **integer minor units**, never floats.
- **Prices** are resolved server-side from the database. Never trust an amount sent from the client.
- **Plot reservation** must be an atomic conditional update (`WHERE status = 'available'`), not a UI check.
- **FX rates**: one server-fetched, cached, timestamped source. Never hardcode a rate in a component. Displayed foreign-currency prices are indicative; the KES settlement amount must be shown before checkout.
- **Edge caching** ([src/server.ts](src/server.ts)) uses an **allowlist** of public marketing routes. Personalised routes (`/portal`, `/thank-you`, `/admin`, `/document`) must send `private, no-store`. Never switch this to a denylist — it fails open.
- Prefer TanStack **server functions** over client-side Supabase calls for anything sensitive. CSRF middleware already exists.

---

## Conventions

- Reuse existing section components in [src/components/sections/](src/components/sections/) rather than creating parallels.
- `PhaseCard` and `PlotPanel` accept a `currency` prop — extend that pattern for currency-aware UI instead of building new plumbing.
- Avoid `(supabase as any)`. The generated `Database` types in [src/lib/types.ts](src/lib/types.ts) exist; use them, especially on financial tables.
- **Mobile-first.** Most traffic is mobile — design and verify at 360px before desktop. Reuse the `use-mobile` hook.
- Notifications go through [src/lib/notifications.ts](src/lib/notifications.ts) (Resend + Africa's Talking).

---

## Branches

- `main` — frozen Sonnet-era baseline. Do not commit here.
- `wip/antigravity-gemini` — preserved Antigravity/Gemini working tree (`5fc735f`).
- `redesign/ecosystem-v2` — active work. Branched from the preserved tree, because `main` lacks `portal.tsx` and the about/contact/locations/partner/privacy routes.
