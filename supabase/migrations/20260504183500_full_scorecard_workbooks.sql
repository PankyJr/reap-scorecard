create table if not exists public.scorecard_workbooks (
  id uuid default gen_random_uuid() primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  uploaded_by uuid references auth.users(id) on delete set null,
  filename text not null,
  file_size bigint not null check (file_size >= 0),
  template_version text,
  status text not null default 'uploaded',
  engine_version text,
  uploaded_at timestamptz not null default timezone('utc'::text, now()),
  processed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists scorecard_workbooks_company_id_idx
  on public.scorecard_workbooks(company_id);

create index if not exists scorecard_workbooks_uploaded_by_idx
  on public.scorecard_workbooks(uploaded_by);

create table if not exists public.scorecard_workbook_sheets (
  id uuid default gen_random_uuid() primary key,
  workbook_id uuid not null references public.scorecard_workbooks(id) on delete cascade,
  sheet_key text not null,
  sheet_name text not null,
  row_count integer not null default 0 check (row_count >= 0),
  column_count integer not null default 0 check (column_count >= 0),
  raw_json jsonb not null default '[]'::jsonb,
  parse_warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists scorecard_workbook_sheets_workbook_id_idx
  on public.scorecard_workbook_sheets(workbook_id);

create unique index if not exists scorecard_workbook_sheets_workbook_sheet_name_idx
  on public.scorecard_workbook_sheets(workbook_id, sheet_name);

create table if not exists public.scorecard_validation_issues (
  id uuid default gen_random_uuid() primary key,
  workbook_id uuid not null references public.scorecard_workbooks(id) on delete cascade,
  issue_type text not null,
  severity text not null check (severity in ('warning', 'error')),
  sheet_name text,
  cell_ref text,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists scorecard_validation_issues_workbook_id_idx
  on public.scorecard_validation_issues(workbook_id);

alter table public.scorecard_workbooks enable row level security;
alter table public.scorecard_workbook_sheets enable row level security;
alter table public.scorecard_validation_issues enable row level security;

drop policy if exists "Users can select workbooks of owned companies" on public.scorecard_workbooks;
drop policy if exists "Users can insert workbooks for owned companies" on public.scorecard_workbooks;
drop policy if exists "Users can update workbooks of owned companies" on public.scorecard_workbooks;
drop policy if exists "Users can delete workbooks of owned companies" on public.scorecard_workbooks;

create policy "Users can select workbooks of owned companies"
  on public.scorecard_workbooks for select
  using (
    exists (
      select 1 from public.companies c
      where c.id = scorecard_workbooks.company_id
        and c.owner_id = auth.uid()
    )
  );

create policy "Users can insert workbooks for owned companies"
  on public.scorecard_workbooks for insert
  with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.companies c
      where c.id = scorecard_workbooks.company_id
        and c.owner_id = auth.uid()
    )
  );

create policy "Users can update workbooks of owned companies"
  on public.scorecard_workbooks for update
  using (
    exists (
      select 1 from public.companies c
      where c.id = scorecard_workbooks.company_id
        and c.owner_id = auth.uid()
    )
  );

create policy "Users can delete workbooks of owned companies"
  on public.scorecard_workbooks for delete
  using (
    exists (
      select 1 from public.companies c
      where c.id = scorecard_workbooks.company_id
        and c.owner_id = auth.uid()
    )
  );

drop policy if exists "Users can select workbook sheets of owned companies" on public.scorecard_workbook_sheets;
drop policy if exists "Users can insert workbook sheets for owned companies" on public.scorecard_workbook_sheets;
drop policy if exists "Users can update workbook sheets of owned companies" on public.scorecard_workbook_sheets;
drop policy if exists "Users can delete workbook sheets of owned companies" on public.scorecard_workbook_sheets;

create policy "Users can select workbook sheets of owned companies"
  on public.scorecard_workbook_sheets for select
  using (
    exists (
      select 1
      from public.scorecard_workbooks w
      join public.companies c on c.id = w.company_id
      where w.id = scorecard_workbook_sheets.workbook_id
        and c.owner_id = auth.uid()
    )
  );

create policy "Users can insert workbook sheets for owned companies"
  on public.scorecard_workbook_sheets for insert
  with check (
    exists (
      select 1
      from public.scorecard_workbooks w
      join public.companies c on c.id = w.company_id
      where w.id = scorecard_workbook_sheets.workbook_id
        and c.owner_id = auth.uid()
    )
  );

create policy "Users can update workbook sheets of owned companies"
  on public.scorecard_workbook_sheets for update
  using (
    exists (
      select 1
      from public.scorecard_workbooks w
      join public.companies c on c.id = w.company_id
      where w.id = scorecard_workbook_sheets.workbook_id
        and c.owner_id = auth.uid()
    )
  );

create policy "Users can delete workbook sheets of owned companies"
  on public.scorecard_workbook_sheets for delete
  using (
    exists (
      select 1
      from public.scorecard_workbooks w
      join public.companies c on c.id = w.company_id
      where w.id = scorecard_workbook_sheets.workbook_id
        and c.owner_id = auth.uid()
    )
  );

drop policy if exists "Users can select workbook validation issues of owned companies" on public.scorecard_validation_issues;
drop policy if exists "Users can insert workbook validation issues for owned companies" on public.scorecard_validation_issues;
drop policy if exists "Users can update workbook validation issues of owned companies" on public.scorecard_validation_issues;
drop policy if exists "Users can delete workbook validation issues of owned companies" on public.scorecard_validation_issues;

create policy "Users can select workbook validation issues of owned companies"
  on public.scorecard_validation_issues for select
  using (
    exists (
      select 1
      from public.scorecard_workbooks w
      join public.companies c on c.id = w.company_id
      where w.id = scorecard_validation_issues.workbook_id
        and c.owner_id = auth.uid()
    )
  );

create policy "Users can insert workbook validation issues for owned companies"
  on public.scorecard_validation_issues for insert
  with check (
    exists (
      select 1
      from public.scorecard_workbooks w
      join public.companies c on c.id = w.company_id
      where w.id = scorecard_validation_issues.workbook_id
        and c.owner_id = auth.uid()
    )
  );

create policy "Users can update workbook validation issues of owned companies"
  on public.scorecard_validation_issues for update
  using (
    exists (
      select 1
      from public.scorecard_workbooks w
      join public.companies c on c.id = w.company_id
      where w.id = scorecard_validation_issues.workbook_id
        and c.owner_id = auth.uid()
    )
  );

create policy "Users can delete workbook validation issues of owned companies"
  on public.scorecard_validation_issues for delete
  using (
    exists (
      select 1
      from public.scorecard_workbooks w
      join public.companies c on c.id = w.company_id
      where w.id = scorecard_validation_issues.workbook_id
        and c.owner_id = auth.uid()
    )
  );
