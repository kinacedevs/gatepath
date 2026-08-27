-- Gatepath Realtors — Tighten site_banners' public-read policy to an allowlist
-- ============================================================================
-- site_banners started (migration 0001) as "Hero, FeaturedLocations,
-- documents, diaspora hero" — a handful of homepage banner rows — and its
-- anon-select policy was written as a blanket `using (true)`, correct for
-- that original scope. Since then it's grown into a generic key-value
-- config store (fx_rates, pipeline_labels, booking_capacity, and more),
-- and nobody re-reviewed the anon-read grant when its scope broadened —
-- every new row dropped into this table is public by default, whether or
-- not it should be. Nothing in it is a secret today (confirmed), so the
-- real-world risk is low, but this is exactly the kind of "an attacker can
-- read something they were never meant to" gap the production audit
-- (Phase 45) flagged on principle: the set of what's public should be a
-- deliberate design output, not an accident of a table's growth.
--
-- Mapped every real public (unauthenticated) consumer of this table first
-- (grepped every route/component, not guessed) — this allowlist is exactly
-- that set. Anything not on it (pipeline_labels, booking_capacity, and any
-- future internal config row) is no longer anon-readable, but stays fully
-- readable by an authenticated admin via is_admin() — no admin screen is
-- affected, and any row written only via a server function (which already
-- bypasses RLS with the service role) is unaffected either way.
--
-- SAFE TO RE-RUN: DROP POLICY IF EXISTS before CREATE POLICY.
-- ============================================================================

drop policy if exists "site_banners_public_select" on public.site_banners;
create policy "site_banners_public_select" on public.site_banners
  for select to anon, authenticated
  using (
    id in (
      'homepage_hero', 'diaspora_hero', 'contact_info', 'custom_branding',
      'fx_rates', 'ceo_section', 'location_images', 'trust_bar_stats',
      'blog_hero', 'downloads_hero', 'gallery_hero', 'faqs_hero',
      'locations_hero', 'properties_hero'
    )
    or public.is_admin()
  );
