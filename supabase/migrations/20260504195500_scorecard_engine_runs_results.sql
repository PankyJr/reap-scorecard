create table if not exists public.scorecard_engine_runs (
  id uuid default gen_random_uuid() primary key,
  workbook_id uuid not null references public.scorecard_workbooks(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  engine_version text not null,
  status text not null,
  started_at timestamptz not null default timezone('utc'::text, now()),
  completed_at timestamptz,
  warnings_count integer not null default 0,
  errors_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists scorecard_engine_runs_workbook_id_idx
  on public.scorecard_engine_runs(workbook_id);

create index if not exists scorecard_engine_runs_company_id_idx
  on public.scorecard_engine_runs(company_id);

create index if not exists scorecard_engine_runs_engine_version_idx
  on public.scorecard_engine_runs(engine_version);

create table if not exists public.scorecard_engine_results (
  id uuid default gen_random_uuid() primary key,
  engine_run_id uuid not null references public.scorecard_engine_runs(id) on delete cascade,
  workbook_id uuid not null references public.scorecard_workbooks(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  engine_version text not null,
  total_available_points numeric,
  total_score numeric,
  bbbee_level text,
  recognition_percentage numeric,
  discounting_applicable boolean,
  result_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists scorecard_engine_results_workbook_id_idx
  on public.scorecard_engine_results(workbook_id);

create index if not exists scorecard_engine_results_company_id_idx
  on public.scorecard_engine_results(company_id);

create index if not exists scorecard_engine_results_engine_run_id_idx
  on public.scorecard_engine_results(engine_run_id);

create index if not exists scorecard_engine_results_engine_version_idx
  on public.scorecard_engine_results(engine_version);

alter table public.scorecard_engine_runs enable row level security;
alter table public.scorecard_engine_results enable row level security;

drop policy if exists "Users can select engine runs of owned companies" on public.scorecard_engine_runs;
drop policy if exists "Users can insert engine runs for owned companies" on public.scorecard_engine_runs;
drop policy if exists "Users can update engine runs of owned companies" on public.scorecard_engine_runs;
drop policy if exists "Users can delete engine runs of owned companies" on public.scorecard_engine_runs;

create policy "Users can select engine runs of owned companies"
  on public.scorecard_engine_runs for select
  using (
    exists (
      select 1 from public.companies c
      where c.id = scorecard_engine_runs.company_id
        and c.owner_id = auth.uid()
    )
  );

create policy "Users can insert engine runs for owned companies"
  on public.scorecard_engine_runs for insert
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.companies c
      where c.id = scorecard_engine_runs.company_id
        and c.owner_id = auth.uid()
    )
  );

create policy "Users can update engine runs of owned companies"
  on public.scorecard_engine_runs for update
  using (
    exists (
      select 1 from public.companies c
      where c.id = scorecard_engine_runs.company_id
        and c.owner_id = auth.uid()
    )
  );

create policy "Users can delete engine runs of owned companies"
  on public.scorecard_engine_runs for delete
  using (
    exists (
      select 1 from public.companies c
      where c.id = scorecard_engine_runs.company_id
        and c.owner_id = auth.uid()
    )
  );

drop policy if exists "Users can select engine results of owned companies" on public.scorecard_engine_results;
drop policy if exists "Users can insert engine results for owned companies" on public.scorecard_engine_results;
drop policy if exists "Users can update engine results of owned companies" on public.scorecard_engine_results;
drop policy if exists "Users can delete engine results of owned companies" on public.scorecard_engine_results;

create policy "Users can select engine results of owned companies"
  on public.scorecard_engine_results for select
  using (
    exists (
      select 1 from public.companies c
      where c.id = scorecard_engine_results.company_id
        and c.owner_id = auth.uid()
    )
  );

create policy "Users can insert engine results for owned companies"
  on public.scorecard_engine_results for insert
  with check (
    exists (
      select 1 from public.companies c
      where c.id = scorecard_engine_results.company_id
        and c.owner_id = auth.uid()
    )
  );

create policy "Users can update engine results of owned companies"
  on public.scorecard_engine_results for update
  using (
    exists (
      select 1 from public.companies c
      where c.id = scorecard_engine_results.company_id
        and c.owner_id = auth.uid()
    )
  );

create policy "Users can delete engine results of owned companies"
  on public.scorecard_engine_results for delete
  using (
    exists (
      select 1 from public.companies c
      where c.id = scorecard_engine_results.company_id
        and c.owner_id = auth.uid()
    )
  );
