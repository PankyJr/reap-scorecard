-- Optional user-defined TMPS lines (label + amount) rolled into inclusion / exclusion totals.
alter table public.procurement_assessments
  add column if not exists tmps_custom_inclusions jsonb not null default '[]'::jsonb,
  add column if not exists tmps_custom_exclusions jsonb not null default '[]'::jsonb;
