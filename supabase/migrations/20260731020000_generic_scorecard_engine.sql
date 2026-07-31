-- Generic Scorecard Engine: applicability, shared financial inputs, rule-set
-- snapshots, procurement attachment, contribution records, priority outcomes,
-- overrides and an audit log.
--
-- Additive only. Every statement is idempotent. Apply to REAP staging
-- (jzvqyryblsfxlinvoiuf) only. Do NOT apply to production in this task.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Assessment-level snapshots
-- ---------------------------------------------------------------------------
alter table public.scorecard_assessments
  add column if not exists rule_set_key text not null default 'generic-codes-2019-v1',
  add column if not exists rule_set_version text,
  add column if not exists rule_set_snapshot jsonb,
  add column if not exists applicability_snapshot jsonb,
  add column if not exists financial_inputs jsonb,
  add column if not exists financial_snapshot jsonb,
  add column if not exists ownership_inputs jsonb,
  add column if not exists procurement_assessment_id uuid,
  add column if not exists procurement_snapshot jsonb,
  add column if not exists overall_result_snapshot jsonb,
  add column if not exists preliminary_level text,
  add column if not exists final_level text,
  add column if not exists recognition_percentage numeric,
  add column if not exists discount_applied boolean not null default false,
  add column if not exists readiness_complete boolean not null default false,
  add column if not exists readiness_reasons jsonb not null default '[]'::jsonb,
  add column if not exists measurement_period_start date,
  add column if not exists measurement_period_end date;

comment on column public.scorecard_assessments.rule_set_key is
  'Versioned B-BBEE rule set used for this assessment, e.g. generic-codes-2019-v1.';
comment on column public.scorecard_assessments.procurement_snapshot is
  'Frozen snapshot of a completed Formal Procurement Assessment. Replacing it requires an explicit user action and a recalculation.';

-- ---------------------------------------------------------------------------
-- Priority sub-minimum outcomes, stored per calculation so history is preserved
-- ---------------------------------------------------------------------------
create table if not exists public.scorecard_priority_results (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.scorecard_assessments (id) on delete cascade,
  calculation_run_id uuid references public.scorecard_calculation_runs (id) on delete set null,
  priority_key text not null,
  element_key text not null,
  label text not null,
  basis_points numeric not null,
  threshold_points numeric not null,
  achieved_points numeric,
  passed boolean,
  evaluated boolean not null default false,
  explanation text,
  created_at timestamptz not null default now()
);

create index if not exists scorecard_priority_results_assessment_idx
  on public.scorecard_priority_results (assessment_id);

-- ---------------------------------------------------------------------------
-- ED / Supplier Development / SED contribution records
-- ---------------------------------------------------------------------------
create table if not exists public.scorecard_contribution_records (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.scorecard_assessments (id) on delete cascade,
  element_key text not null check (
    element_key in ('enterprise_development', 'supplier_development', 'socio_economic_development')
  ),
  source_row_number integer,
  source_sheet text,
  beneficiary_name text,
  beneficiary_classification text,
  beneficiary_black_ownership_percentage numeric,
  was_eme_or_qse_at_first_assistance boolean,
  years_since_first_assistance numeric,
  contribution_type text,
  actual_value numeric,
  supplied_benefit_factor numeric,
  resolved_benefit_factor numeric,
  recognised_value numeric,
  contribution_date date,
  evidence_provided boolean not null default false,
  black_beneficiary_percentage numeric,
  eligible boolean,
  eligibility_reason text,
  notes text,
  -- Preserved verbatim from the workbook. Meaning unconfirmed, never scored.
  claimed_raw text,
  warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists scorecard_contribution_records_assessment_idx
  on public.scorecard_contribution_records (assessment_id, element_key);

comment on column public.scorecard_contribution_records.claimed_raw is
  'Raw "Claimed" column from the reference workbook. Its meaning is unconfirmed, so it is preserved as an optional input and never used in scoring.';

-- ---------------------------------------------------------------------------
-- User overrides and audit log
-- ---------------------------------------------------------------------------
create table if not exists public.scorecard_assessment_overrides (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.scorecard_assessments (id) on delete cascade,
  scope text not null,
  target_key text not null,
  previous_value jsonb,
  new_value jsonb,
  reason text not null,
  overridden_by uuid references auth.users (id) on delete set null,
  overridden_at timestamptz not null default now()
);

create index if not exists scorecard_assessment_overrides_assessment_idx
  on public.scorecard_assessment_overrides (assessment_id);

create table if not exists public.scorecard_assessment_audit_log (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.scorecard_assessments (id) on delete cascade,
  action text not null,
  element_key text,
  actor uuid references auth.users (id) on delete set null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists scorecard_assessment_audit_log_assessment_idx
  on public.scorecard_assessment_audit_log (assessment_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Calculation runs: record the rule set and the outcome alongside the snapshots
-- ---------------------------------------------------------------------------
alter table public.scorecard_calculation_runs
  add column if not exists rule_set_key text,
  add column if not exists rule_set_version text,
  add column if not exists rule_source jsonb,
  add column if not exists eap_target_set_version text,
  add column if not exists base_points numeric,
  add column if not exists bonus_points numeric,
  add column if not exists raw_total_points numeric,
  add column if not exists preliminary_level text,
  add column if not exists final_level text,
  add column if not exists recognition_percentage numeric,
  add column if not exists discount_applied boolean not null default false,
  add column if not exists subminimum_snapshot jsonb,
  add column if not exists formula_breakdown jsonb;

-- ---------------------------------------------------------------------------
-- Element rows: rule provenance so a stored element result explains itself
-- ---------------------------------------------------------------------------
alter table public.scorecard_assessment_elements
  add column if not exists rule_set_key text,
  add column if not exists rule_set_version text,
  add column if not exists base_points_achieved numeric,
  add column if not exists bonus_points_achieved numeric,
  add column if not exists base_points_available numeric,
  add column if not exists bonus_points_available numeric,
  add column if not exists missing_inputs jsonb not null default '[]'::jsonb,
  add column if not exists evidence_status text;

-- ---------------------------------------------------------------------------
-- RLS: identical owner-scoped pattern as the existing calculator tables
-- ---------------------------------------------------------------------------
alter table public.scorecard_priority_results enable row level security;
alter table public.scorecard_contribution_records enable row level security;
alter table public.scorecard_assessment_overrides enable row level security;
alter table public.scorecard_assessment_audit_log enable row level security;

do $$
declare
  target text;
begin
  foreach target in array array[
    'scorecard_priority_results',
    'scorecard_contribution_records',
    'scorecard_assessment_overrides',
    'scorecard_assessment_audit_log'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', target || '_owner_all', target);
    execute format($policy$
      create policy %I on public.%I
        for all to authenticated
        using (
          exists (
            select 1
            from public.scorecard_assessments a
            join public.companies c on c.id = a.company_id
            where a.id = %I.assessment_id
              and c.owner_id = auth.uid()
          )
        )
        with check (
          exists (
            select 1
            from public.scorecard_assessments a
            join public.companies c on c.id = a.company_id
            where a.id = %I.assessment_id
              and c.owner_id = auth.uid()
          )
        )
    $policy$, target || '_owner_all', target, target, target);
  end loop;
end
$$;

grant select, insert, update, delete on public.scorecard_priority_results to authenticated;
grant select, insert, update, delete on public.scorecard_contribution_records to authenticated;
grant select, insert on public.scorecard_assessment_overrides to authenticated;
grant select, insert on public.scorecard_assessment_audit_log to authenticated;

-- ---------------------------------------------------------------------------
-- Any change to inputs, snapshots or the rule set forces an explicit recalculation.
-- Historical calculation runs are never mutated.
-- ---------------------------------------------------------------------------
create or replace function public.scorecard_assessment_mark_recalculation()
returns trigger
language plpgsql
as $$
begin
  if (new.financial_inputs is distinct from old.financial_inputs)
     or (new.applicability_snapshot is distinct from old.applicability_snapshot)
     or (new.ownership_inputs is distinct from old.ownership_inputs)
     or (new.procurement_snapshot is distinct from old.procurement_snapshot)
     or (new.eap_target_set_id is distinct from old.eap_target_set_id)
     or (new.rule_set_key is distinct from old.rule_set_key) then
    new.needs_recalculation := true;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists scorecard_assessment_mark_recalculation_trg on public.scorecard_assessments;
create trigger scorecard_assessment_mark_recalculation_trg
  before update on public.scorecard_assessments
  for each row
  execute function public.scorecard_assessment_mark_recalculation();
