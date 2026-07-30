-- Modular Full Scorecard Calculator assessments + versioned EAP targets.
-- Additive only. Do NOT apply to production in this task (no supabase db push).
-- Controlled application procedure is documented in FULL_SCORECARD_CALCULATOR_IMPLEMENTATION_REPORT.md.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Scorecard assessments (modular calculator)
-- ---------------------------------------------------------------------------
create table if not exists public.scorecard_assessments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  name text not null,
  measurement_year integer not null,
  status text not null default 'draft' check (status in ('draft', 'final')),
  scope_mode text not null check (scope_mode in ('full', 'single', 'selected')),
  selected_elements text[] not null default '{}',
  rule_version text not null default 'calculator-v1',
  eap_target_set_id uuid,
  eap_target_snapshot jsonb,
  notes text,
  needs_recalculation boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists scorecard_assessments_company_id_idx
  on public.scorecard_assessments (company_id);
create index if not exists scorecard_assessments_year_idx
  on public.scorecard_assessments (company_id, measurement_year);

create table if not exists public.scorecard_assessment_elements (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.scorecard_assessments (id) on delete cascade,
  element_key text not null,
  status text not null default 'not_started'
    check (status in (
      'not_started',
      'file_uploaded',
      'needs_review',
      'ready_to_calculate',
      'calculated',
      'complete',
      'error'
    )),
  upload_filename text,
  sheet_name text,
  import_snapshot jsonb,
  corrections jsonb,
  contextual_inputs jsonb not null default '{}'::jsonb,
  result_snapshot jsonb,
  calculation_rule_version text,
  calculated_at timestamptz,
  calculated_by uuid references auth.users (id) on delete set null,
  needs_recalculation boolean not null default false,
  warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id, element_key)
);

create index if not exists scorecard_assessment_elements_assessment_id_idx
  on public.scorecard_assessment_elements (assessment_id);

create table if not exists public.scorecard_calculation_runs (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.scorecard_assessments (id) on delete cascade,
  element_key text,
  created_by uuid references auth.users (id) on delete set null,
  rule_version text not null,
  status text not null default 'completed' check (status in ('completed', 'failed')),
  input_snapshot jsonb not null default '{}'::jsonb,
  result_snapshot jsonb not null default '{}'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists scorecard_calculation_runs_assessment_id_idx
  on public.scorecard_calculation_runs (assessment_id);

-- ---------------------------------------------------------------------------
-- EAP target sets (admin-managed, versioned)
-- ---------------------------------------------------------------------------
create table if not exists public.eap_target_sets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  year integer not null,
  geography text,
  source_reference text,
  version integer not null default 1,
  status text not null default 'draft' check (status in ('draft', 'active', 'retired')),
  effective_date date,
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists eap_target_sets_active_year_geography_uidx
  on public.eap_target_sets (year, (coalesce(geography, '')))
  where status = 'active';

create table if not exists public.eap_target_set_values (
  id uuid primary key default gen_random_uuid(),
  target_set_id uuid not null references public.eap_target_sets (id) on delete cascade,
  band_key text not null,
  demographic_key text not null,
  target_value numeric not null,
  created_at timestamptz not null default now(),
  unique (target_set_id, band_key, demographic_key)
);

create table if not exists public.eap_target_set_audit (
  id uuid primary key default gen_random_uuid(),
  target_set_id uuid not null references public.eap_target_sets (id) on delete cascade,
  action text not null,
  changed_by uuid references auth.users (id) on delete set null,
  change_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.scorecard_assessments
  drop constraint if exists scorecard_assessments_eap_target_set_id_fkey;
alter table public.scorecard_assessments
  add constraint scorecard_assessments_eap_target_set_id_fkey
  foreign key (eap_target_set_id) references public.eap_target_sets (id) on delete set null;

-- ---------------------------------------------------------------------------
-- RLS — company ownership (same pattern as full scorecard workbooks)
-- ---------------------------------------------------------------------------
alter table public.scorecard_assessments enable row level security;
alter table public.scorecard_assessment_elements enable row level security;
alter table public.scorecard_calculation_runs enable row level security;
alter table public.eap_target_sets enable row level security;
alter table public.eap_target_set_values enable row level security;
alter table public.eap_target_set_audit enable row level security;

create policy scorecard_assessments_owner_all on public.scorecard_assessments
  for all to authenticated
  using (
    exists (
      select 1 from public.companies c
      where c.id = scorecard_assessments.company_id
        and c.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.companies c
      where c.id = scorecard_assessments.company_id
        and c.owner_id = auth.uid()
    )
  );

create policy scorecard_assessment_elements_owner_all on public.scorecard_assessment_elements
  for all to authenticated
  using (
    exists (
      select 1
      from public.scorecard_assessments a
      join public.companies c on c.id = a.company_id
      where a.id = scorecard_assessment_elements.assessment_id
        and c.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.scorecard_assessments a
      join public.companies c on c.id = a.company_id
      where a.id = scorecard_assessment_elements.assessment_id
        and c.owner_id = auth.uid()
    )
  );

create policy scorecard_calculation_runs_owner_all on public.scorecard_calculation_runs
  for all to authenticated
  using (
    exists (
      select 1
      from public.scorecard_assessments a
      join public.companies c on c.id = a.company_id
      where a.id = scorecard_calculation_runs.assessment_id
        and c.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.scorecard_assessments a
      join public.companies c on c.id = a.company_id
      where a.id = scorecard_calculation_runs.assessment_id
        and c.owner_id = auth.uid()
    )
  );

-- EAP tables: authenticated users may read active sets; writes denied via RLS
-- (admin mutations use service role after requireReapInternalAdmin).
create policy eap_target_sets_read_authenticated on public.eap_target_sets
  for select to authenticated
  using (status in ('active', 'retired') or created_by = auth.uid());

create policy eap_target_set_values_read_authenticated on public.eap_target_set_values
  for select to authenticated
  using (
    exists (
      select 1 from public.eap_target_sets s
      where s.id = eap_target_set_values.target_set_id
        and (s.status in ('active', 'retired') or s.created_by = auth.uid())
    )
  );

create policy eap_target_set_audit_read_authenticated on public.eap_target_set_audit
  for select to authenticated
  using (
    exists (
      select 1 from public.eap_target_sets s
      where s.id = eap_target_set_audit.target_set_id
        and (s.status in ('active', 'retired') or s.created_by = auth.uid())
    )
  );

grant select, insert, update, delete on public.scorecard_assessments to authenticated;
grant select, insert, update, delete on public.scorecard_assessment_elements to authenticated;
grant select, insert, update, delete on public.scorecard_calculation_runs to authenticated;
grant select on public.eap_target_sets to authenticated;
grant select on public.eap_target_set_values to authenticated;
grant select on public.eap_target_set_audit to authenticated;
