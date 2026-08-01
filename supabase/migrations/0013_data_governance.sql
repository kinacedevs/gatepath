-- Gatepath Realtors — Data Governance foundation (Part 2, Module 10)
-- ============================================================================
-- marketing_opt_in: nullable, no default — a default of false would falsely
-- imply "asked and declined" for historical rows that were simply never
-- asked, same reasoning already applied to inquiries.client_country
-- (migration 0005). Collected going forward via inquire.tsx's new consent
-- checkbox.
--
-- audit_log: general-purpose event log, admin-only select, no insert/
-- update/delete policy — written only via src/lib/auditLog.ts's
-- logAuditEvent() helper, called from inside already-verified server
-- function handlers using the service role. Wired into this session's own
-- newly-built server functions only (Document Vault, Buyer Preferences,
-- Tasks, Escalations) — NOT into the older protected write paths
-- (paymentActions.ts/inquiryActions.ts/bookingActions.ts/plotActions.ts),
-- which stay exactly as CLAUDE.md protects them; that remains separate,
-- dedicated, separately-reviewed work.
--
-- SAFE TO RE-RUN: idempotent throughout.
-- ============================================================================

alter table public.inquiries
  add column if not exists marketing_opt_in boolean;

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_email text,
  actor_name text,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_created_at_idx on public.audit_log (created_at desc);
create index if not exists audit_log_entity_idx on public.audit_log (entity_type, entity_id);

alter table public.audit_log enable row level security;

drop policy if exists "audit_log_admin_select" on public.audit_log;
create policy "audit_log_admin_select" on public.audit_log
  for select to authenticated using (public.is_admin());
