-- Phase 2: Backfill companies.owner_id for legacy rows (owner_id IS NULL)
--
-- Ownership inference signals used (conservative):
-- - public.scorecards.created_by (if exactly one distinct non-null creator exists for a company)
-- - public.procurement_assessments.created_by (if scorecards provide no usable signal, and exactly one distinct non-null creator exists)
--
-- Backfill rule (conservative; does not guess when conflicting evidence exists):
-- 1) Let SC = distinct non-null created_by values from scorecards for the company.
--    - If |SC| = 1, define sc_owner as that single value.
--    - If |SC| != 1, sc_owner is NULL (ambiguous or no signal).
-- 2) Let PA = distinct non-null created_by values from procurement_assessments for the company.
--    - If |PA| = 1, define pa_owner as that single value.
--    - If |PA| != 1, pa_owner is NULL (ambiguous or no signal).
-- 3) Choose owner_id to set:
--    - If sc_owner is not null:
--        - set owner_id = sc_owner only if pa_owner is null OR pa_owner = sc_owner.
--        - if pa_owner is a different single creator, leave NULL (conflict).
--    - Else (sc_owner is null):
--        - set owner_id = pa_owner only if pa_owner is not null (exactly one creator in procurement, and none usable in scorecards).
--        - otherwise leave NULL.
--
-- Safety:
-- - Updates only companies where owner_id IS NULL.
-- - Does not overwrite existing owner_id.
-- - Leaves ambiguous/conflicting companies as NULL.

begin;

-- Inspect what will happen before updating.
with
to_fill as (
  select c.id
  from public.companies c
  where c.owner_id is null
),
sc as (
  select
    s.company_id as company_id,
    case when count(distinct s.created_by) = 1
      then (array_agg(distinct s.created_by))[1]
      else null
    end as sc_owner,
    count(distinct s.created_by) as sc_distinct_creators
  from public.scorecards s
  join to_fill tf on tf.id = s.company_id
  where s.created_by is not null
  group by s.company_id
),
pa as (
  select
    a.company_id as company_id,
    case when count(distinct a.created_by) = 1
      then (array_agg(distinct a.created_by))[1]
      else null
    end as pa_owner,
    count(distinct a.created_by) as pa_distinct_creators
  from public.procurement_assessments a
  join to_fill tf on tf.id = a.company_id
  where a.created_by is not null
  group by a.company_id
),
decision as (
  select
    tf.id as company_id,
    sc.sc_owner,
    pa.pa_owner,
    sc.sc_distinct_creators,
    pa.pa_distinct_creators,
    case
      when sc.sc_owner is not null then
        case
          when pa.pa_owner is null then sc.sc_owner
          when pa.pa_owner = sc.sc_owner then sc.sc_owner
          else null -- conflict: both sources indicate different single owners
        end
      else
        pa.pa_owner -- fall back to procurement only if scorecards provide no usable signal
    end as chosen_owner_id
  from to_fill tf
  left join sc on sc.company_id = tf.id
  left join pa on pa.company_id = tf.id
)
select
  count(*) as legacy_companies_total,
  count(*) filter (where chosen_owner_id is not null) as legacy_companies_backfillable,
  count(*) filter (where chosen_owner_id is null and sc_owner is not null and pa_owner is not null and pa_owner <> sc_owner) as legacy_companies_conflicting,
  count(*) filter (where chosen_owner_id is null and sc_owner is null and pa_owner is null and (sc_distinct_creators is null or sc_distinct_creators <= 1) and (pa_distinct_creators is null or pa_distinct_creators <= 1)) as legacy_companies_no_evidence,
  count(*) filter (where chosen_owner_id is null and sc_owner is null and pa_owner is null and pa_distinct_creators > 1) as legacy_companies_procurement_ambiguous,
  count(*) filter (where chosen_owner_id is null and sc_owner is null and sc_distinct_creators > 1) as legacy_companies_scorecard_ambiguous
from decision;

-- Apply backfill only for the companies with a safe chosen owner.
with
to_fill as (
  select c.id
  from public.companies c
  where c.owner_id is null
),
sc as (
  select
    s.company_id as company_id,
    case when count(distinct s.created_by) = 1
      then (array_agg(distinct s.created_by))[1]
      else null
    end as sc_owner
  from public.scorecards s
  join to_fill tf on tf.id = s.company_id
  where s.created_by is not null
  group by s.company_id
),
pa as (
  select
    a.company_id as company_id,
    case when count(distinct a.created_by) = 1
      then (array_agg(distinct a.created_by))[1]
      else null
    end as pa_owner
  from public.procurement_assessments a
  join to_fill tf on tf.id = a.company_id
  where a.created_by is not null
  group by a.company_id
),
decision as (
  select
    tf.id as company_id,
    sc.sc_owner,
    pa.pa_owner,
    case
      when sc.sc_owner is not null then
        case
          when pa.pa_owner is null then sc.sc_owner
          when pa.pa_owner = sc.sc_owner then sc.sc_owner
          else null
        end
      else
        pa.pa_owner
    end as chosen_owner_id
  from to_fill tf
  left join sc on sc.company_id = tf.id
  left join pa on pa.company_id = tf.id
)
update public.companies c
set owner_id = d.chosen_owner_id
from decision d
where c.id = d.company_id
  and c.owner_id is null
  and d.chosen_owner_id is not null;

-- Final verification.
select
  count(*) as companies_total,
  count(*) filter (where owner_id is null) as companies_still_null
from public.companies;

commit;

