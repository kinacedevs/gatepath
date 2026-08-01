-- Gatepath Realtors — Interaction/Activity Log foundation (Part 2, Module 1)
-- ============================================================================
-- The single highest-leverage schema gap named in docs/EXPANSION_GAP_
-- ANALYSIS.md and docs/VIZ_SPEC.md's "Cross-cutting schema gaps" section:
-- 6+ metrics across Leads, Agent Performance, Contacts, Inquiries Queue, and
-- the whole Notifications/Communications module ambitions are blocked on
-- this one table not existing. Keyed to inquiry_id — the one real, stable,
-- FK-able "lead" identity in this schema (there is no separate clients/
-- contacts table; Contacts aggregates by inquiries.client_email with no
-- stable id), matching how payments/bookings/offers/agreements already key
-- off inquiry_id.
--
-- Internal CRM data only — no public read policy at all (unlike
-- testimonials/faqs). All writes go through logInteractionFn's service
-- role (src/lib/interactionLogActions.ts); no insert/update/delete policy
-- is defined here, matching offers' "creation happens exclusively
-- server-side" pattern. Admin-only reads via public.is_admin(), mirroring
-- plot_title_verifications.
--
-- SAFE TO RE-RUN: idempotent throughout.
-- ============================================================================

create table if not exists public.interaction_log (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references public.inquiries(id) on delete cascade,
  channel text not null check (channel in ('call', 'email', 'whatsapp', 'sms', 'site_visit', 'other')),
  direction text not null check (direction in ('outbound', 'inbound')),
  notes text,
  logged_by_name text,
  logged_by_email text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists interaction_log_inquiry_idx on public.interaction_log (inquiry_id);

alter table public.interaction_log enable row level security;

drop policy if exists "interaction_log_admin_select" on public.interaction_log;
create policy "interaction_log_admin_select" on public.interaction_log
  for select to authenticated using (public.is_admin());
