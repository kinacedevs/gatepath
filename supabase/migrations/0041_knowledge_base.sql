-- Gatepath Realtors — Knowledge Base / SOPs module
-- ============================================================================
-- Named in the original 17-module Part 2 roadmap, never started. Purely an
-- internal staff reference tool (sales scripts, procedures, policy
-- references) — unlike blog_posts/testimonials/faqs, there is no public
-- read policy at all here, since none of this content is meant for
-- customers.
--
-- SAFE TO RE-RUN: CREATE TABLE IF NOT EXISTS, DROP POLICY IF EXISTS before
-- CREATE POLICY.
-- ============================================================================

create table if not exists public.knowledge_base_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'General',
  content text not null default '',
  is_published boolean not null default true,
  display_order int not null default 0,
  created_by_email text,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.knowledge_base_articles enable row level security;

drop policy if exists "kb_articles_admin_select" on public.knowledge_base_articles;
create policy "kb_articles_admin_select" on public.knowledge_base_articles
  for select to authenticated using (public.is_admin());

drop policy if exists "kb_articles_admin_insert" on public.knowledge_base_articles;
create policy "kb_articles_admin_insert" on public.knowledge_base_articles
  for insert to authenticated with check (public.is_admin());

drop policy if exists "kb_articles_admin_update" on public.knowledge_base_articles;
create policy "kb_articles_admin_update" on public.knowledge_base_articles
  for update to authenticated using (public.is_admin());

drop policy if exists "kb_articles_admin_delete" on public.knowledge_base_articles;
create policy "kb_articles_admin_delete" on public.knowledge_base_articles
  for delete to authenticated using (public.is_admin());

create index if not exists knowledge_base_articles_category_idx on public.knowledge_base_articles (category);
