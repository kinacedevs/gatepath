-- Gatepath Realtors — Make inquiries.client_id_passport nullable (audit fix)
-- ============================================================================
-- Real, currently-live bug found during a full-CRM audit pass: contact.tsx's
-- "Send Us a Message" form inserts into `inquiries` (the same table
-- inquire.tsx/diaspora.tsx/the admin walk-in form use) but never supplies
-- client_id_passport, a NOT NULL column — every single submission through
-- that page fails with a constraint violation, silently producing zero
-- leads from that channel while showing the visitor a generic "something
-- went wrong" message.
--
-- Requiring a national ID/passport number to send a general "I have a
-- question" message is also the wrong shape for that form in the first
-- place — the same reasoning that gave newsletter signups their own
-- minimal table (0025_newsletter_subscribers.sql) rather than forcing them
-- into this KYC-shaped table. A real property inquiry (inquire.tsx,
-- diaspora.tsx, admin walk-in capture) still always supplies a real value —
-- this migration only removes the constraint that was blocking a
-- categorically different, lighter-weight message form from working at all.
--
-- Checked every read site of client_id_passport (admin.contacts.tsx,
-- admin.inquiries.tsx, dataGovernance.ts's duplicate-detection grouping,
-- the 3 generated legal documents) — none call a string method on it
-- without already being null-safe, so this is a safe, additive relaxation.
--
-- SAFE TO RE-RUN: idempotent (guarded, since Postgres has no
-- "ALTER COLUMN ... DROP NOT NULL IF EXISTS").
-- ============================================================================

do $$
begin
  alter table public.inquiries alter column client_id_passport drop not null;
exception
  when others then null;
end $$;
