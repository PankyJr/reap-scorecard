-- Optional audit trail for Excel-sourced procurement assessments (nullable; safe for existing rows).
alter table public.procurement_assessments
  add column if not exists import_workbook_name text,
  add column if not exists import_sheet_name text;
