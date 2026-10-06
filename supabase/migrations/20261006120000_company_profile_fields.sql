-- Company profile fields asked when a company is added.
--
-- Additive only: three nullable columns with range checks. Existing rows keep
-- NULL ("not known yet"); nothing is dropped, renamed or rewritten. The owner-only
-- row policies on public.companies already cover the new columns.
--
-- Turnover is also stored per scorecard year in
-- scorecard_assessments.applicability_snapshot; the company's value is the
-- latest known figure, used to pre-fill a new scorecard when there is no
-- previous year to copy from.

alter table public.companies
  add column if not exists financial_year_end_month smallint,
  add column if not exists annual_turnover numeric,
  add column if not exists black_ownership_percentage numeric;

do $$
begin
  alter table public.companies
    add constraint companies_financial_year_end_month_range
    check (financial_year_end_month is null or financial_year_end_month between 1 and 12);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.companies
    add constraint companies_annual_turnover_not_negative
    check (annual_turnover is null or annual_turnover >= 0);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.companies
    add constraint companies_black_ownership_percentage_range
    check (black_ownership_percentage is null or black_ownership_percentage between 0 and 100);
exception when duplicate_object then null;
end $$;

comment on column public.companies.financial_year_end_month is
  'Month the financial year ends, 1 (January) to 12 (December). Null: not given.';
comment on column public.companies.annual_turnover is
  'Latest known annual turnover in rand, used to pre-fill a new scorecard. Each scorecard keeps its own year''s figure.';
comment on column public.companies.black_ownership_percentage is
  'Latest known black ownership, 0 to 100. Each scorecard keeps its own year''s figure.';
