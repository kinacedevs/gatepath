-- Phase 40D — Property Content Studio
-- Replaces the hardcoded, identical-on-every-phase Location/Infrastructure/
-- Legal tab content on properties.$slug.tsx with real, staff-authored,
-- per-phase detail. Additive only — every column is nullable and every
-- public reader falls back to today's exact hardcoded output when unset,
-- so this is a  zero-regression change until an admin re-saves a phase
-- through the new editor.

alter table public.phases add column if not exists location_narrative text;
alter table public.phases add column if not exists legal_narrative text;
alter table public.phases add column if not exists infrastructure_items jsonb;
alter table public.phases add column if not exists neighborhood_items jsonb;

comment on column public.phases.location_narrative is
  'Staff-authored rich-text HTML (Tiptap editor) describing the phase''s location. Falls back to a generic sentence when null.';
comment on column public.phases.legal_narrative is
  'Staff-authored rich-text HTML (Tiptap editor) describing legal/title status. Falls back to a generic sentence when null.';
comment on column public.phases.infrastructure_items is
  'Array of {icon, label, done} — replaces the old hardcoded 8-item infrastructure checklist. Falls back to that checklist when null/empty.';
comment on column public.phases.neighborhood_items is
  'Array of {icon, label, value} — e.g. {icon:"hospital", label:"Nearest Hospital", value:"4 minutes - Mama Rehema Medical Clinic"}. No fallback; the section hides when empty rather than showing invented distances.';
