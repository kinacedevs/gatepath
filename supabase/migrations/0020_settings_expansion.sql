-- Gatepath Realtors — Settings Expansion (message templates + API key field mapping)
-- ============================================================================
-- message_templates: named, editable email templates. Each retrofitted
-- send-function (src/lib/messageTemplateActions.ts's getTemplateOrDefault)
-- tries a saved row by key first and falls back to its own existing
-- hardcoded subject/body on any miss — so shipping this table changes
-- nothing about current behavior until a CEO/manager actually edits one.
-- Admin-only select RLS; writes via a service-role server function, same
-- shape as every other new table this session.
--
-- api_keys.field_mapping: optional per-key remap so an external lead
-- source whose webhook payload uses different field names (e.g.
-- "full_name" instead of "client_full_name") still lands correctly in
-- POST /api/v1/leads, without bespoke code per vendor.
--
-- Pipeline label overrides and FX rates deliberately reuse the existing
-- site_banners generic key-value table (rows 'pipeline_labels' and
-- 'fx_rates') — no new schema needed for either.
--
-- SAFE TO RE-RUN: idempotent throughout.
-- ============================================================================

create table if not exists public.message_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  channel text not null default 'email',
  subject text,
  body text not null,
  updated_by_email text,
  updated_by_name text,
  updated_at timestamptz not null default now()
);

alter table public.message_templates enable row level security;

drop policy if exists "message_templates_admin_select" on public.message_templates;
create policy "message_templates_admin_select" on public.message_templates
  for select to authenticated using (public.is_admin());

alter table public.api_keys
  add column if not exists field_mapping jsonb;
