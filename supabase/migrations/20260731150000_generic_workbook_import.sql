-- Generic full-workbook import: pending review preview + imported snapshot metadata.
-- Additive only. Staging (jzvqyryblsfxlinvoiuf) only. Do NOT apply to production.

alter table public.scorecard_assessments
  add column if not exists workbook_import_status text not null default 'no_workbook_uploaded',
  add column if not exists workbook_filename text,
  add column if not exists workbook_checksum_sha256 text,
  add column if not exists workbook_file_size integer,
  add column if not exists workbook_import_preview jsonb,
  add column if not exists workbook_import_snapshot jsonb,
  add column if not exists workbook_imported_at timestamptz,
  add column if not exists workbook_imported_by uuid references auth.users (id) on delete set null;

comment on column public.scorecard_assessments.workbook_import_preview is
  'Pending Generic workbook analysis shown on the review screen. No element data is written until the user confirms import.';
comment on column public.scorecard_assessments.workbook_import_snapshot is
  'Confirmed import decisions, checksum, filename and element import provenance. Historical calculation runs are never mutated.';
comment on column public.scorecard_assessments.workbook_import_status is
  'no_workbook_uploaded | workbook_uploaded | analysing_workbook | review_required | ready_to_import | imported | imported_with_warnings | manually_corrected | needs_recalculation | calculated | complete | error';
