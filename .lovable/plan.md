## Global Brand Refresh — Gatepath Realtors (Blue + Gold + Real Logo + CEO)

A pure visual/asset refresh. No layouts, copy, routes, validation, or business logic change.

---

### 1. Upload brand assets via Lovable Assets

Upload the three user files to CDN and reference them via `.asset.json` pointers (project convention — not `/public/assets/`):

- `user-uploads://gatepath_logo_and_slogan.jpeg` → `src/assets/logo-full.png.asset.json`
- `user-uploads://Gatepath_logo.jpeg` → `src/assets/logo-icon.png.asset.json`
- `user-uploads://CEO_Joe_Muchiri.jpeg` → `src/assets/ceo-joe-muchiri.jpg.asset.json`

Import these pointers in components and use `asset.url` as `src`. (The spec's `/assets/...` paths don't work in this stack; pointer JSON is the correct equivalent and yields the same end result.)

### 2. Color tokens (`src/styles.css`)

Replace the existing oklch tokens with hex-accurate equivalents of the new palette:

- `--primary` → `#0B7FC7` (Gatepath blue) + new `--primary-dark #0960A0`, `--primary-deep #074B7D`, `--nav #074B7D`, `--footer-deep #063A61`
- `--accent` → `#E8A020` + `--accent-dark #C8861A`
- `--stone` → `#F0F4F8` (blue-tinted card alt)
- `--ivory`, `--foreground`, `--muted-foreground`, status colors (`--available/booked/sold`) unchanged
- Recompute `--shadow-card/hover/soft` from new primary
- Update `--ring` to gold (unchanged behavior)

Because most components use semantic Tailwind classes (`bg-primary`, `text-accent`, `border-accent`), this single token swap recolors the bulk of the app automatically.

### 3. Hard-coded color sweep

Search and replace every literal across `src/`:

- `#1A3C2B` → `#0B7FC7`
- `#2D5C42` → `#0960A0`
- `#111C16` → `#063A61` (footer)
- `#0a1f12` → `#042D4D`
- `#C8952A` → `#E8A020`
- `#A87820` → `#C8861A`
- `rgba(26,60,43,…)` and spaced variant → `rgba(11,127,199,…)`
- `rgba(200,149,42,…)` → `rgba(232,160,32,…)`
- `oklch(0.34 0.05[2] 152 / …)` shadow color refs → recompute against blue
- Hero overlay gradient in `Hero.tsx` → new blue→gold gradient from spec
- Phase card image overlay, plot map selected stroke, stepper active circle → `#0B7FC7`

Affected files (sweep, not rewrite): `Hero.tsx`, `Navbar.tsx`, `Footer.tsx`, `CeoSection.tsx`, `TrustBar.tsx`, `WhyGatepath.tsx`, `HowItWorks.tsx`, `FeaturedLocations.tsx`, `LocationsMarquee.tsx`, `PropertyPreview.tsx`, `Testimonials.tsx`, `CTABanner.tsx`, `properties/PhaseCard.tsx`, `properties/PlotMap.tsx`, `properties/PlotPanel.tsx`, `InquiryStepper.tsx`, `inquiry/PlotSummaryCard.tsx`, route files `inquire/book-visit/payment/thank-you/properties.*`.

### 4. Logo swap (replace text wordmark with image)

In `Navbar.tsx`, `Footer.tsx`, and any other place rendering the `GATEPATH / REALTORS` text stack:

- Navbar desktop: `<img src={logoFull.url} … height 52–56px />`
- Navbar mobile (<lg): `<img src={logoIcon.url} … height 40px />`
- Footer: `<img src={logoFull.url} … height 68–72px />` with the gold drop-shadow filter
- Keep the existing `<Link to="/">` wrapper and surrounding flex layout — only swap inner contents

### 5. Favicon + title

Edit `src/routes/__root.tsx` (the head config — this template's equivalent of `index.html`):

- Add `links: [{ rel: "icon", type: "image/png", href: logoIcon.url }, …]`
- Title meta → `Gatepath Realtors — Your Interest is Our Priority`

### 6. CEO section (`src/components/sections/CeoSection.tsx`)

In-place content edits only (keep grid, Reveal wrappers, social row):

- Replace Unsplash `src` with `ceoJoe.url`, add `object-position: center top`, border color `#E8A020`
- Replace bottom-left chip with the dark blue glass badge containing "Joe Muchiri" + "CEO & Managing Director"
- Heading → `Built on Trust.` / `Led by Joe Muchiri.`
- Body paragraphs → updated copy from spec
- Quote → `"Your Interest is Our Priority."`
- Name block → `Joe Muchiri` / `CEO & Managing Director — Gatepath Realtors`

### 7. Slogan capitalisation

Sweep for `Your interest is our priority` and replace with `Your Interest is Our Priority.` (Footer + Hero subhead + anywhere else it appears).

### 8. Out of scope (will NOT touch)

Layouts, grids, copy beyond what's listed, button labels, WhatsApp button, status colors, form validation, Paystack code, InquiryContext, routes, route tree.

---

### Verification

After build: open `/`, `/properties`, `/properties/:slug`, `/inquire`, `/book-visit`, `/payment`, `/thank-you`. Confirm: image logo in nav/footer, blue primary everywhere previously green, gold `#E8A020` accents, CEO photo + name visible, favicon updated, slogan capitalised.
