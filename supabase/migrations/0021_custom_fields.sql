-- Gatepath Realtors — Custom Fields for Inquiries/Leads (Settings Expansion, Phase 27)
-- ============================================================================
-- custom_field_definitions: what fields exist, defined by CEO/manager.
-- Needs a PUBLIC read policy (where is_active) — unlike every other new
-- admin table this session — because inquire.tsx is the public,
-- unauthenticated form and has to render these fields dynamically. Same
-- two-policy shape as testimonials/faqs from migration 0006.
--
-- inquiries.custom_fields: a flat key->value jsonb map, not a normalized
-- entity-attribute-value table — matches this codebase's existing config-
-- storage style (site_banners.data, api_keys.field_mapping), no EAV
-- precedent exists anywhere here. Nullable, purely additive.
--
-- Deactivating a field (is_active = false) is the only removal path — a
-- hard delete would orphan the label for any inquiry that already holds a
-- value under that key.
--
-- SAFE TO RE-RUN: idempotent throughout.
-- ============================================================================

create table if not exists public.custom_field_definitions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  field_type text not null check (field_type in ('text', 'number', 'select', 'checkbox', 'date')),
  options text[],
  is_required boolean not null default false,
  display_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.custom_field_definitions enable row level security;

-- Same public-reads-active / admin-manages-all shape as testimonials/faqs
-- (migration 0006) — public read is required here since inquire.tsx is an
-- unauthenticated public form that renders these fields dynamically.
drop policy if exists "custom_field_definitions_public_select" on public.custom_field_definitions;
create policy "custom_field_definitions_public_select" on public.custom_field_definitions
  for select to anon, authenticated using (is_active = true or public.is_admin());

drop policy if exists "custom_field_definitions_admin_insert" on public.custom_field_definitions;
create policy "custom_field_definitions_admin_insert" on public.custom_field_definitions
  for insert to authenticated with check (public.is_admin());

drop policy if exists "custom_field_definitions_admin_update" on public.custom_field_definitions;
create policy "custom_field_definitions_admin_update" on public.custom_field_definitions
  for update to authenticated using (public.is_admin());

drop policy if exists "custom_field_definitions_admin_delete" on public.custom_field_definitions;
create policy "custom_field_definitions_admin_delete" on public.custom_field_definitions
  for delete to authenticated using (public.is_admin());

alter table public.inquiries
  add column if not exists custom_fields jsonb;
