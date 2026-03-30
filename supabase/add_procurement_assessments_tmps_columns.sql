-- procurement_assessments: add TMPS denominator input columns
--
-- Canonical column list: supabase/schema.sql (procurement_assessments, tmps_* lines).
-- Prerequisite: public.procurement_assessments already exists.
--
-- Use when the live database was created before these columns existed.
-- Safe to run multiple times (IF NOT EXISTS). No data loss; nullable numeric columns.

alter table public.procurement_assessments
  add column if not exists tmps_opening_inventory numeric,
  add column if not exists tmps_closing_inventory numeric,
  add column if not exists tmps_cost_of_sales numeric,
  add column if not exists tmps_other_operating_expenses numeric,
  add column if not exists tmps_finance_costs numeric,
  add column if not exists tmps_capital_expenditure numeric,
  add column if not exists tmps_employee_costs numeric,
  add column if not exists tmps_depreciation numeric,
  add column if not exists tmps_utilities numeric,
  add column if not exists tmps_service_fees numeric,
  add column if not exists tmps_recharge_for_services numeric,
  add column if not exists tmps_purchase_of_goods numeric,
  add column if not exists tmps_purchase_of_services numeric;

-- Best-effort PostgREST schema reload (Supabase Data API). Wrapped so a notify
-- failure never rolls back the DDL above.
do $$
begin
  execute 'notify pgrst, ''reload schema''';
exception
  when others then null;
end;
$$;
