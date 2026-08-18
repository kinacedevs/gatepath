-- Module 3 audit finding: agreements.pdf_agreement_url / pdf_receipt_url are
-- never populated by any code path — documents are live-rendered HTML,
-- print-to-PDF only (document.agreement.$id.tsx, document.receipt.$id.tsx),
-- no PDF file is ever generated or stored server-side. Confirmed via a
-- repo-wide search: the only remaining references were the TS type
-- declarations themselves and a code comment documenting the historical
-- dead-link bug already fixed elsewhere (admin.deals.tsx now links to the
-- live-rendered route instead). Safe, additive-in-reverse cleanup — both
-- columns are confirmed always-null in every code path that writes
-- `agreements`.

alter table public.agreements drop column if exists pdf_agreement_url;
alter table public.agreements drop column if exists pdf_receipt_url;
