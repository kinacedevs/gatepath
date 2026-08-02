-- Gatepath Realtors — Blog SEO Meta Fields (Part 3, Slice C)
-- ============================================================================
-- Lets a post have SEO-tuned meta title/description independent of its
-- on-page title/summary. blog.$slug.tsx's head() falls back to
-- post.title/post.summary when these are unset — zero change in output for
-- any existing post.
--
-- SAFE TO RE-RUN: idempotent throughout.
-- ============================================================================

alter table public.blog_posts
  add column if not exists meta_title text;

alter table public.blog_posts
  add column if not exists meta_description text;
