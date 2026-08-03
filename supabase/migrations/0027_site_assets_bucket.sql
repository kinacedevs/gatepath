-- Gatepath Realtors — Site Assets Storage Bucket (Phase 36, Media Upload)
-- ============================================================================
-- Formalizes a bucket that already exists live in production (provisioned
-- manually, outside this repo's tracked migration history — confirmed via
-- the user's own screenshot of working
-- https://<project>.supabase.co/storage/v1/object/public/site-assets/...
-- URLs). This migration is mostly a no-op confirmation on an already-live
-- database; `on conflict do nothing` makes it safe to run regardless.
--
-- Public, unlike the `documents` bucket (private, Phase 15) — site-assets
-- holds branding/marketing images meant to render on public pages, so a
-- public read policy is correct here. No RLS policy on storage.objects is
-- needed for that: a public bucket serves reads via Storage's own
-- public-URL mechanism with no policy required. Every upload still goes
-- through a server-issued signed URL (src/lib/mediaUploadActions.ts,
-- service role), matching the `documents` bucket's zero-write-policy
-- precedent — no direct client-side upload permission is ever granted.
--
-- SAFE TO RE-RUN: idempotent throughout.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('site-assets', 'site-assets', true)
on conflict (id) do nothing;
