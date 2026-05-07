create table if not exists public.scorecard_metric_values (
  id uuid default gen_random_uuid() primary key,
  workbook_id uuid not null references public.scorecard_workbooks(id) on delete cascade,
  metric_key text not null,
  pillar text not null,
  section text,
  label text not null,
  value_type text not null,
  numeric_value numeric,
  text_value text,
  boolean_value boolean,
  date_value date,
  unit text,
  source_sheet text not null,
  source_cell text,
  source_range text,
  raw_value text,
  validation_state text not null default 'valid',
  validation_message text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.scorecard_validation_issues
  add column if not exists cell_ref text;

create index if not exists scorecard_metric_values_workbook_id_idx
  on public.scorecard_metric_values(workbook_id);

create index if not exists scorecard_metric_values_metric_key_idx
  on public.scorecard_metric_values(metric_key);

create index if not exists scorecard_metric_values_pillar_idx
  on public.scorecard_metric_values(pillar);

create index if not exists scorecard_metric_values_validation_state_idx
  on public.scorecard_metric_values(validation_state);

alter table public.scorecard_metric_values enable row level security;

drop policy if exists "Users can select scorecard metrics of owned companies" on public.scorecard_metric_values;
drop policy if exists "Users can insert scorecard metrics for owned companies" on public.scorecard_metric_values;
drop policy if exists "Users can update scorecard metrics of owned companies" on public.scorecard_metric_values;
drop policy if exists "Users can delete scorecard metrics of owned companies" on public.scorecard_metric_values;

create policy "Users can select scorecard metrics of owned companies"
  on public.scorecard_metric_values for select
  using (
    exists (
      select 1
      from public.scorecard_workbooks w
      join public.companies c on c.id = w.company_id
      where w.id = scorecard_metric_values.workbook_id
        and c.owner_id = auth.uid()
    )
  );

create policy "Users can insert scorecard metrics for owned companies"
  on public.scorecard_metric_values for insert
  with check (
    exists (
      select 1
      from public.scorecard_workbooks w
      join public.companies c on c.id = w.company_id
      where w.id = scorecard_metric_values.workbook_id
        and c.owner_id = auth.uid()
    )
  );

create policy "Users can update scorecard metrics of owned companies"
  on public.scorecard_metric_values for update
  using (
    exists (
      select 1
      from public.scorecard_workbooks w
      join public.companies c on c.id = w.company_id
      where w.id = scorecard_metric_values.workbook_id
        and c.owner_id = auth.uid()
    )
  );

create policy "Users can delete scorecard metrics of owned companies"
  on public.scorecard_metric_values for delete
  using (
    exists (
      select 1
      from public.scorecard_workbooks w
      join public.companies c on c.id = w.company_id
      where w.id = scorecard_metric_values.workbook_id
        and c.owner_id = auth.uid()
    )
  );
