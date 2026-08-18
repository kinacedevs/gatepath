# Gatepath Realtors — Database Schema Reference

The baseline schema documentation that `docs/CRM_STATE_AUDIT.md` §3 and every phase note since has flagged as missing: **9 of the 15 real tables have no tracked `CREATE TABLE` anywhere in `supabase/migrations/`** — they were created directly in the Supabase Dashboard before migration tracking started on this project. This document is the closest thing to a baseline: every table's real shape, reverse-engineered from `src/lib/types.ts` (which the codebase's own header comment states "Matches the Supabase schema v3 exactly") cross-checked against every query that touches it. **Treat this as the source of truth for "what the database actually looks like today."** `docs/MIGRATIONS.md` is the companion doc — what each tracked migration file does and why.

Legend: **Origin** = `dashboard` (no tracked DDL, exists only because it was created by hand and reverse-engineered here) or the migration file that created it. **RLS** summarizes `supabase/migrations/0001_admin_auth_and_rls.sql` unless noted.

---

## Resolved: money-storage discrepancy

**`CLAUDE.md` used to state "Money is stored and computed in integer minor units, never floats"** — an architecture rule the actual implementation never followed. `src/lib/paymentActions.ts:86` does `const amountKes = paystackData.amount / 100;` (converting Paystack's minor-unit kobo/cents to whole KES) and stores that `amountKes` value directly — money is stored in **major units (whole KES, numeric/decimal)** everywhere in this codebase (`payments.amount`, `inquiries.price/deposit/balance/monthly_payment`, `plot_sizes.cash_price/installment_price`). **Decision (Module 3 audit follow-up): `CLAUDE.md` now states this correctly** — converting live financial columns to integer minor units would be high-risk churn on working, correct payment logic for no functional gain, so the documentation was fixed to match reality rather than the schema being changed to match a rule nothing followed.

---

## Core sales-flow tables

### `phases` — *origin: dashboard*
One row per land project/phase (e.g. "Ruiru Meadows Phase 2").
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| slug | text, unique | URL slug, public routes key off this |
| phase_number | integer, nullable | |
| name | text | |
| location | text | |
| region | text | |
| county | text, nullable | |
| status | text | `active` \| `coming_soon` \| `sold_out` |
| description | text, nullable | |
| features | text[] | |
| image_url | text, nullable | Editable via `admin.campaigns.tsx` |
| youtube_video_url | text, nullable | Editable via `admin.plots.tsx` |
| brochure_url | text, nullable | PDF, editable via `admin.campaigns.tsx` |
| plot_map_url | text, nullable | PDF, editable via `admin.campaigns.tsx` |
| hero_image_urls | text[], nullable | JSON-encoded array per the TS comment; editable via `admin.campaigns.tsx` |
| diaspora_image_url | text, nullable | Editable via `admin.campaigns.tsx` |
| total_plots | integer | |
| available_count | integer | Rolling count, source for Dashboard/Plot Inventory KPIs |
| booked_count | integer | |
| sold_count | integer | |
| created_at, updated_at | timestamptz | |

**RLS**: public select; admin insert/update/delete.

### `plot_sizes` — *origin: dashboard*
Pricing tiers within a phase (a phase can offer multiple plot sizes at different prices).
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| phase_id | uuid, FK → phases | |
| label | text | |
| size_description | text, nullable | |
| area_ha | numeric, nullable | |
| cash_price | numeric | Major-unit KES (see discrepancy note above) |
| installment_price | numeric, nullable | |
| installment_months | integer, nullable | |
| plot_type | text | `residential` \| `commercial` \| `agricultural` \| `mixed` |
| is_default | boolean | |
| created_at | timestamptz | |

**RLS**: public select; admin insert/update/delete.

### `plots` — *origin: dashboard*
Individual plots, one row per physical plot on the masterplan grid.
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| phase_id | uuid, FK → phases | |
| size_id | uuid, FK → plot_sizes, nullable | |
| plot_number | integer | |
| row_num, col_num | integer | Masterplan SVG grid position |
| status | text | `available` \| `booked` \| `sold` |
| notes | text, nullable | |
| created_at, updated_at | timestamptz | |

**RLS**: public select; admin update only (migration 0002 closed the anon-update hole that allowed client-side double-booking); admin insert/delete. Status flips to `booked` happen atomically and conditionally (`WHERE status='available'`) from `paymentActions.ts`'s service-role client — the one legitimate write path outside manual admin edits.

### `inquiries` — *origin: dashboard, extended by migration 0005*
The central lead/buyer record — doubles as both "lead" and "buyer profile" in this schema (see `docs/VIZ_SPEC.md` §7's note: there's no separate lead-vs-inquiry distinction here).
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| phase_id, plot_id | uuid, nullable | **Confirmed unpopulated by the real inquiry flow** (Phase 5B correction) — only `phase_slug`/`plot_number_ref` are actually written |
| project_name | text, nullable | |
| plot_number_ref | integer, nullable | The real FK-by-value used everywhere |
| booking_date | date, nullable | |
| cro_name, cro_phone | text, nullable | Free-text agent assignment — **no FK**, see `docs/VIZ_SPEC.md`'s recommended `assigned_agent_id` fix |
| terms_of_payment | text, nullable | `cash` \| `installment` |
| price, discount, deposit, balance | numeric, nullable | Major-unit KES |
| payment_period_months | integer, nullable | |
| monthly_payment | numeric, nullable | |
| client_full_name | text | |
| client_dob | date, nullable | |
| client_phone | text | |
| client_postal_address | text, nullable | |
| client_email | text | |
| client_kra_pin | text, nullable | |
| client_id_passport | text | |
| client_occupation | text, nullable | |
| client_country, client_county, client_city | text, nullable | **Added migration 0005** — for the real Offer Letter template's field requirements |
| kin_full_name, kin_phone, kin_dob, kin_relationship, kin_id_passport | text/date, nullable | |
| kin_occupation, kin_country_of_residence, kin_county, kin_city, kin_kra_pin | text, nullable | **Added migration 0005** |
| phase_name, phase_slug, plot_size, plot_price, plot_location | text/numeric, nullable | Denormalized snapshot at inquiry time |
| payment_preference, location_preference, questions, heard_from, referred_by | text, nullable | |
| status | text | `pending` \| `reviewed` \| `approved` \| `rejected` — the pre-sale funnel |
| created_at, updated_at | timestamptz | |

**RLS**: public insert only; admin select/update/delete.

### `bookings` — *origin: dashboard*
Site visit / virtual tour requests.
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| inquiry_id | uuid, FK → inquiries, nullable | |
| visit_date | date, nullable | |
| visit_time | text | `morning` \| `afternoon` |
| attendees | integer | |
| visit_notes | text, nullable | **Client's own pre-visit note** — not staff post-visit feedback (see `docs/VIZ_SPEC.md` §8 gap) |
| visit_type | text | `physical` \| `virtual` |
| pickup_location | text, nullable | |
| status | text | `pending` \| `confirmed` \| `completed` \| `cancelled` — no `no_show` value exists |
| created_at, updated_at | timestamptz | |

**RLS**: public insert only; admin select/update/delete.

### `payments` — *origin: dashboard*
Every verified Paystack transaction. Only ever written by the service-role client in `paymentActions.ts` — no anon insert since migration 0002.
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| inquiry_id | uuid, FK → inquiries, nullable | |
| plot_id | uuid, nullable | |
| paystack_reference | text, nullable, **unique** (upsert `onConflict`) | Idempotency key |
| amount | numeric | **Major-unit KES** (see discrepancy note) |
| deposit_amount | numeric, nullable | |
| loan_period_months | integer, nullable | |
| payment_method | text, nullable | |
| currency | text | Always effectively `"KES"` in practice today — see `docs/VIZ_SPEC.md` §6's multi-currency gap |
| status | text | `pending` \| `success` \| `failed` \| `abandoned` |
| paystack_response | jsonb, nullable | Full raw verify-API response, kept for audit |
| created_at, updated_at | timestamptz | |

**RLS**: no anon insert (closed migration 0002); admin select/update/delete.

### `offers` — *origin: migration 0005 (new, this session)*
Issued on the first (deposit/reservation) payment against an inquiry.
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| inquiry_id | uuid, FK → inquiries, **not null**, `on delete cascade` | |
| payment_id | uuid, FK → payments, nullable | The deposit payment that triggered it |
| ceo_signed | boolean, default false | |
| ceo_signed_at | timestamptz, nullable | |
| created_at, updated_at | timestamptz | |

**RLS**: no anon access at all (nothing in the browser ever creates one — service role only); admin select + update.

### `agreements` — *origin: dashboard*
Only becomes valid once cumulative successful payments on an inquiry reach `inquiries.price` in full (Phase 7 business-logic fix, this session).
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| payment_id | uuid, FK → payments, nullable | The completing payment |
| inquiry_id | uuid, FK → inquiries, nullable | |
| ceo_signed | boolean | |
| ceo_signed_at | timestamptz, nullable | |
| pdf_receipt_url | text, nullable | **Never populated by any code path today** |
| pdf_agreement_url | text, nullable | **Never populated by any code path today** — `admin.deals.tsx`'s "View PDF" link is dead |
| email_sent, sms_sent | boolean | |
| created_at, updated_at | timestamptz | |

**RLS**: no anon insert (closed migration 0002); admin select/update/delete.

---

## Staff / admin tables

### `admin_users` — *origin: dashboard*
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK — matches the corresponding `auth.users` row | |
| email | text | Looked up case-insensitively at login |
| full_name | text, nullable | |
| role | text | `ceo` \| `manager` \| `agent` — flat, 3 roles, no permission matrix (see `docs/VIZ_SPEC.md` §11 gap) |
| created_at | timestamptz | |

**RLS**: admin select; CEO-only insert.

### `client_otps` — *origin: dashboard, locked down by migration 0003*
Pre-dates RLS being formalized on this project; not in the generated `Database` type (server-only table, never queried from a typed client call).
| Column | Type | Notes |
|---|---|---|
| (pre-existing columns) | — | Not enumerated in `types.ts` — server-only |
| attempts | integer, default 0, not null | **Added migration 0003** |

**RLS**: enabled with zero policies — service role only, by design (never readable/writable from the browser).

### `portal_sessions` — *origin: migration 0003 (new)*
Opaque server-issued session tokens for the client portal, replacing the old `sessionStorage["gatepath_portal_email"]` pattern.
| Column | Type | Notes |
|---|---|---|
| token | uuid, PK, default `gen_random_uuid()` | |
| email | text | Indexed |
| expires_at | timestamptz | |
| created_at | timestamptz | |

**RLS**: enabled, zero policies — service role only.

### `plot_title_verifications` — *origin: migration 0004 (new)*
Manual Ardhisasa-style title check log (no public Ardhisasa API exists, per `docs/CRM_CAPABILITIES.md` §5 — this is a logged manual staff action, not an automated lookup).
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| plot_id | uuid, FK → plots, `on delete cascade` | |
| checked_by | uuid, FK → admin_users | |
| checked_at | timestamptz, default now() | |
| outcome | text, check constraint | `verified_clean` \| `discrepancy_found` \| `inconclusive` |
| reference | text, nullable | e.g. the Ardhisasa search reference used |
| notes | text, nullable | |
| created_at | timestamptz | |

**RLS**: admin select only; all writes via `logPlotTitleVerificationFn` (service role) — no direct-client insert/update policy at all.

---

## Content / marketing tables

### `blog_posts` — *origin: dashboard*
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| title | text | |
| slug | text | |
| summary | text | |
| content | text | |
| featured_image | text, nullable | |
| category | text | `Investment` \| `Legal` \| `Buying Guide` \| `Company News` |
| author_name | text | |
| tags | text[] | |
| status | text | `draft` \| `published` — **no ordering field, no "featured" boolean** (`docs/VIZ_SPEC.md` §10 gap) |
| created_at, updated_at | timestamptz | |

**RLS**: public select where `status='published'` (or admin, any status); admin insert/update/delete.

### `affiliates` — *origin: dashboard*
Referral partners — a distinct concept from staff agent commissions (see `docs/VIZ_SPEC.md` §5's commission-model gap).
| Column | Type | Notes |
|---|---|---|
| id | uuid, PK | |
| partner_name | text | |
| phone, email | text | |
| referral_code | text | |
| commission_rate | numeric | |
| created_at | timestamptz | |

**RLS**: public insert (signup); admin select/update/delete.

### `site_banners` — *origin: dashboard*
Generic key/value content blob — the mechanism generated documents (offer/agreement/receipt) read for company branding, and the public Hero/FeaturedLocations sections read for banner content.
| Column | Type | Notes |
|---|---|---|
| id | text, PK | e.g. `"homepage_hero"`, `"diaspora_hero"`, `"custom_branding"` |
| data | jsonb | Arbitrary shape per id |
| updated_at | timestamptz | |

**RLS**: public select; admin insert/update/delete. **RLS is ready and correct — no admin UI writes to this table at all today** (confirmed gap, `docs/CRM_STATE_AUDIT.md` §7/§10).

---

## Tables named in `docs/VIZ_SPEC.md` but **not yet built** (proposed, not created)

Listed here for traceability only — these are proposals from the Phase 0 visualization spec, not live schema. Do not assume they exist:

- `interaction_log` / activity log (calls, WhatsApp, emails, visits, follow-ups)
- `installment_schedules` (future due dates, not just past actual payments)
- `plot_status_history` / general `audit_log`
- `agent_goals` (quotas/targets)
- `agent_commissions` (distinct from `affiliates`)
- `role_permissions` (granular RBAC matrix)
- `campaigns` + content-analytics columns on `blog_posts`
- `staff_invites` / `admin_users.invite_status`
- `login_events`
- `integration_health`
- `pipeline_stages`, `message_templates` (DB-editable config, currently hardcoded in `conveyancing.ts`/`notifications.ts`)

See `docs/VIZ_SPEC.md`'s "Cross-cutting schema gaps" section for which tabs each one unlocks, ranked by leverage.

---

## Orphan tables found live, unused by any code path

`public.activity_logs` and `public.shift_logs` exist in the live database (origin: dashboard, like the other 9 hand-created tables above) but are **not referenced anywhere in this codebase** — confirmed via a repo-wide search. They predate this session's work and were never wired into the app. Supabase's Advisor flagged both as CRITICAL: each had RLS *policies* defined but RLS itself was never *enabled* on the table, leaving those policies inert and the tables fully exposed via the public anon-key API. One of the existing policies on each table followed an `allow_all_*` naming pattern, suggesting a permissive blanket-access policy alongside an admin-only one.

**Fixed in migration `0007_lock_down_orphan_tables.sql`**: RLS enabled on both tables, the `allow_all_*` policies dropped. The pre-existing `*_admin_all` policies are left as-is (their exact command scope wasn't inspected since this migration doesn't need to guess at it to close the exposure). Full column-level schema for these two tables is not documented here — since nothing in the app reads or writes them, there was no query to reverse-engineer their shape from. If they're ever wired into a real feature (e.g. the proposed `interaction_log`/general audit log above), document them properly at that point.
