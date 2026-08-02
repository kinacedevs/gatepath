-- Gatepath Realtors — Property Inventory CRUD (Part 3 "Website Live-Update
-- Map", Slice A)
-- ============================================================================
-- Adds soft-delete (is_archived) to phases and plots — never a hard delete:
-- plot_title_verifications.plot_id is ON DELETE CASCADE, so deleting a plot
-- would silently wipe its legal title-check history, and inquiries/public
-- URLs reference phases by slug independent of any FK. Archived rows are
-- hidden from every public read path and from the admin's default view, but
-- stay in place — reversible, no data loss.
--
-- plot  _sizes gains is_active (deactivate a pricing tier without breaking
-- plots that already reference it) plus promo_active/promo_label/promo_price
-- — a pure display/marketing layer. paymentActions.ts never reads
-- plot_sizes at all (confirmed by reading it — price resolution is entirely
-- from inquiries.price, set at inquiry-creation time), so these columns have
-- zero interaction with what Paystack actually charges.
--
-- plots.photo_urls is a simple text[] of pasted URLs, matching this
-- codebase's established "paste a URL" media convention — no upload widget
-- exists anywhere for public images.
--
-- Two partial unique indexes give a real DB-level guarantee against
-- overlapping grid cells / duplicate plot numbers within a phase, while
-- still letting an archived plot's old position/number be reused.
--
-- SAFE TO RE-RUN: idempotent throughout.
-- ============================================================================

alter table public.phases
  add column if not exists is_archived boolean not null default false;

alter table public.plots
  add column if not exists is_archived boolean not null default false;

alter table public.plots
  add column if not exists photo_urls text[];

alter table public.plot_sizes
  add column if not exists is_active boolean not null default true;

alter table public.plot_sizes
  add column if not exists promo_active boolean not null default false;

alter table public.plot_sizes
  add column if not exists promo_label text;

alter table public.plot_sizes
  add column if not exists promo_price numeric;

create unique index if not exists plots_phase_position_uniq
  on public.plots (phase_id, row_num, col_num)
  where not is_archived;

create unique index if not exists plots_phase_number_uniq
  on public.plots (phase_id, plot_number)
  where not is_archived;
