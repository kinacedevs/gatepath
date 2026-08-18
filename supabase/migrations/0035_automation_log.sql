-- Module 3: automation execution log. Deliberately separate from audit_log
-- (migration 0013, human staff actions) — different actor model (a
-- workflow/webhook, not a person), different query pattern (ops
-- monitoring: "did this fire, did it succeed" vs. compliance: "who
-- changed what"). No PII by design, ever — not client name, phone,
-- email, or amount. entity_id is enough to join back into the real,
-- RLS-protected tables if a human needs the detail.
--
-- First real consumer: the new Paystack webhook (src/lib/paystackWebhook.ts)
-- logs every delivery here. Future n8n-triggered workflows use the same
-- table for idempotency (a unique constraint on the natural key below)
-- and dead-letter visibility, per docs/AUTOMATION_STRATEGY.md section 3.4.

create table if not exists public.automation_log (
  id uuid primary key default gen_random_uuid(),
  workflow_key text not null,
  event_type text not null,
  entity_type text not null,
  entity_id text,
  event_fingerprint text,
  outcome text not null check (outcome in ('success', 'failed', 'skipped_duplicate')),
  error_message text,
  n8n_execution_id text,
  triggered_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Natural-key idempotency: the same event, for the same workflow, with the
-- same fingerprint (e.g. a record's updated_at), is claimed at most once.
-- event_fingerprint is nullable (not every caller has one, e.g. a webhook
-- keyed purely by reference), so the constraint only applies when it's set.
create unique index if not exists automation_log_dedupe_idx
  on public.automation_log (workflow_key, entity_type, entity_id, event_fingerprint)
  where event_fingerprint is not null;

alter table public.automation_log enable row level security;
drop policy if exists "automation_log_admin_select" on public.automation_log;
create policy "automation_log_admin_select" on public.automation_log
  for select using (public.is_admin());
-- No insert/update/delete policy — service-role only, same as every other
-- internal-config/log table added this session.
