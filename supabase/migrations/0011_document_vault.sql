-- Gatepath Realtors — Documents & E-signature Vault (Part 2, Module 7)
-- ============================================================================
-- First real file-storage capability in this codebase — every existing
-- "media" field (Site Content branding, phase hero images) is a paste-a-URL
-- text input, never an actual upload. Provisions a private Storage bucket
-- and its metadata table.
--
-- The `documents` bucket has NO RLS policy on storage.objects at all,
-- deliberately — every upload/download/delete is mediated by a
-- server-verified signed URL (src/lib/documentVaultActions.ts, service
-- role), so no direct client-side storage permission is ever granted. This
-- is the most locked-down shape available, matching this session's
-- "browser never trusted with the sensitive mechanism directly" rule.
--
-- document_records is metadata only (RLS admin-only select, same shape as
-- tasks/interaction_log/buyer_preferences) — the actual file bytes live in
-- the bucket, never in this table.
--
-- SAFE TO RE-RUN: idempotent throughout.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create table if not exists public.document_records (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid references public.inquiries(id) on delete set null,
  document_type text not null check (
    document_type in ('agreement', 'offer', 'receipt', 'title_deed', 'id_copy', 'poa', 'other')
  ),
  storage_path text not null,
  file_name text not null,
  file_size_bytes bigint,
  notes text,
  uploaded_by_email text,
  uploaded_by_name text,
  created_at timestamptz not null default now()
);

create index if not exists document_records_inquiry_idx on public.document_records (inquiry_id);
create index if not exists document_records_type_idx on public.document_records (document_type);

alter table public.document_records enable row level security;

drop policy if exists "document_records_admin_select" on public.document_records;
create policy "document_records_admin_select" on public.document_records
  for select to authenticated using (public.is_admin());
