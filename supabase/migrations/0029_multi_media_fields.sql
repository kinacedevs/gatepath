-- Gatepath Realtors — Multi-file + Video Media Fields (Phase 38)
-- ============================================================================
-- Widens every currently-single-value media field to an array, so each one
-- can hold any number of photos/videos (mirroring the multi-image fields
-- Phase 36 already shipped: phases.hero_image_urls, plots.photo_urls).
--
-- No backfill UPDATE — existing single-value data (phases.image_url,
-- team_profiles.photo_url, blog_posts.featured_image) is left exactly where
-- it is. Every reader uses a fallback chain (new_array?.[0] ?? old_value ??
-- stock-fallback), and every admin save now writes only the new array
-- column — so old data keeps rendering, nothing is lost, and there's
-- nothing destructive to re-run here. site_banners' diaspora_hero/
-- location_images fields need no migration at all — that table's `data`
-- column is already schemaless jsonb, so their shape change (a plain string
-- becoming a string[]) is purely an application-level convention.
--
-- Also closes a real gap Phase 37's audit flagged: the site-assets bucket's
-- upload size cap was enforced client-side only. Now that video files make
-- a real cap more important, this sets it for real at the Storage layer
-- (file_size_limit/allowed_mime_types are enforced by Supabase Storage
-- itself on the actual upload, independent of anything the browser does).
--
-- SAFE TO RE-RUN: idempotent throughout.
-- ============================================================================

alter table public.phases add column if not exists image_urls text[];
alter table public.team_profiles add column if not exists photo_urls text[];
alter table public.blog_posts add column if not exists featured_images text[];

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-assets', 'site-assets', true, 104857600, array['image/*', 'video/*', 'application/pdf'])
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
