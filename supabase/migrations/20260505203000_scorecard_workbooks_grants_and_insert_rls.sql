-- Fix common local/dev failures when inserting scorecard_workbooks:
-- 1) authenticated role missing table privileges (Postgres 42501 / permission denied)
-- 2) INSERT RLS requiring uploaded_by = auth.uid() — fails if uploaded_by is null or session
--    does not propagate auth.uid() the same way as the check expects

grant select, insert, update, delete on table public.scorecard_workbooks to authenticated;
grant select, insert, update, delete on table public.scorecard_workbook_sheets to authenticated;
grant select, insert, update, delete on table public.scorecard_validation_issues to authenticated;
grant select, insert, update, delete on table public.scorecard_metric_values to authenticated;
grant select, insert, update, delete on table public.scorecard_engine_runs to authenticated;
grant select, insert, update, delete on table public.scorecard_engine_results to authenticated;

drop policy if exists "Users can insert workbooks for owned companies" on public.scorecard_workbooks;

create policy "Users can insert workbooks for owned companies"
  on public.scorecard_workbooks for insert
  with check (
    exists (
      select 1 from public.companies c
      where c.id = scorecard_workbooks.company_id
        and c.owner_id = auth.uid()
    )
  );
