-- READ-ONLY usage forensics for the production project. Ids, counts and dates
-- only: no names or email addresses are selected. Run in the Supabase SQL
-- editor, or: psql "<session pooler connection string>" -f scripts/ops/production-forensics.sql

-- U1. Accounts: ownership by domain only (never the address itself)
select id, created_at, last_sign_in_at,
       case when split_part(email, '@', 2) in ('supamanpro.com') then 'mine'
            when split_part(email, '@', 2) in ('gmail.com','outlook.com','hotmail.com','yahoo.com','icloud.com') then 'webmail'
            else 'client/other' end as owner
from auth.users order by last_sign_in_at desc nulls last;

-- U2. Last activity per table
select 'procurement_assessments' t, max(created_at) max_created, max(updated_at) max_updated from procurement_assessments
union all select 'procurement_suppliers', max(created_at), null from procurement_suppliers
union all select 'procurement_results',   max(created_at), null from procurement_results
union all select 'companies',             max(created_at), max(updated_at) from companies
union all select 'scorecards',            max(created_at), max(updated_at) from scorecards
union all select 'audit_log',             max(created_at), null from audit_log;

-- U3. Audit events, most recent 50 (no payloads)
select created_at, action, entity_type, actor_id from audit_log order by created_at desc limit 50;

-- U4. Assessments with supplier counts (no names)
select a.id, a.created_at, a.updated_at, a.status, a.assessment_year, a.tmps_denominator_source,
       a.total_measured_procurement_spend, a.total_score,
       (select count(*) from procurement_suppliers s where s.assessment_id = a.id) as suppliers
from procurement_assessments a order by a.created_at;

-- U5. Assessments created per month
select to_char(date_trunc('month', created_at), 'YYYY-MM') as month, count(*)
from procurement_assessments where created_at >= '2026-03-01' group by 1 order by 1;

-- Q1. Denominator source split
select coalesce(tmps_denominator_source, '(null = calculated)') source, count(*) from procurement_assessments group by 1;

-- Q3. Denominator as the old code computed it vs the corrected Codes definition
with a as (
  select id, total_measured_procurement_spend, total_score,
    coalesce(tmps_opening_inventory,0) oi, coalesce(tmps_closing_inventory,0) ci,
    coalesce(tmps_cost_of_sales,0) cos, coalesce(tmps_other_operating_expenses,0) opex,
    coalesce(tmps_finance_costs,0) fin, coalesce(tmps_capital_expenditure,0) capex,
    coalesce(tmps_employee_costs,0) emp, coalesce(tmps_depreciation,0) dep,
    coalesce(tmps_utilities,0) util, coalesce(tmps_service_fees,0) fees,
    coalesce(tmps_recharge_for_services,0) rech, coalesce(tmps_purchase_of_goods,0) goods,
    coalesce(tmps_purchase_of_services,0) services,
    coalesce((select sum((x->>'amount')::numeric) from jsonb_array_elements(coalesce(tmps_custom_inclusions,'[]'::jsonb)) x),0) cinc,
    coalesce((select sum((x->>'amount')::numeric) from jsonb_array_elements(coalesce(tmps_custom_exclusions,'[]'::jsonb)) x),0) cexc
  from procurement_assessments
  where tmps_denominator_source = 'calculated' or tmps_denominator_source is null
)
select id, total_score,
  (oi+ci+cos+opex+fin+capex+cinc) - (emp+dep+util+fees+rech+goods+services+cexc) as denominator_old_code,
  (cos+ci+goods+services+opex+util+fees+rech+fin+capex+cinc) - (oi+emp+dep+cexc) as denominator_corrected,
  total_measured_procurement_spend as denominator_stored
from a order by id;

-- Q6. Legacy scorecards ever saved
select count(*) as legacy_scorecards from scorecards;
