-- Phase 3: Strict ownership-based RLS
-- Run after Phase 1 (owner_id column) and Phase 2 (backfill).
--
-- Model:
-- - companies: access only when owner_id = auth.uid()
-- - scorecards / scorecard_inputs / scorecard_results: via parent company ownership
-- - procurement_assessments / procurement_suppliers / procurement_results: via company ownership
-- - audit_log: select/insert by actor_id = auth.uid()
--
-- Companies with owner_id IS NULL are not visible to any user (no policy grants access).

-- =============================================================================
-- COMPANIES
-- =============================================================================
drop policy if exists "Authenticated users can manage companies" on public.companies;

create policy "Users can select own companies"
  on public.companies for select
  using (owner_id = auth.uid());

create policy "Users can insert companies they own"
  on public.companies for insert
  with check (owner_id = auth.uid());

create policy "Users can update own companies"
  on public.companies for update
  using (owner_id = auth.uid());

create policy "Users can delete own companies"
  on public.companies for delete
  using (owner_id = auth.uid());

-- =============================================================================
-- SCORECARDS (access via company ownership)
-- =============================================================================
drop policy if exists "Authenticated users can manage scorecards" on public.scorecards;

create policy "Users can select scorecards of owned companies"
  on public.scorecards for select
  using (
    exists (
      select 1 from public.companies c
      where c.id = scorecards.company_id and c.owner_id = auth.uid()
    )
  );

create policy "Users can insert scorecards for owned companies"
  on public.scorecards for insert
  with check (
    exists (
      select 1 from public.companies c
      where c.id = scorecards.company_id and c.owner_id = auth.uid()
    )
  );

create policy "Users can update scorecards of owned companies"
  on public.scorecards for update
  using (
    exists (
      select 1 from public.companies c
      where c.id = scorecards.company_id and c.owner_id = auth.uid()
    )
  );

create policy "Users can delete scorecards of owned companies"
  on public.scorecards for delete
  using (
    exists (
      select 1 from public.companies c
      where c.id = scorecards.company_id and c.owner_id = auth.uid()
    )
  );

-- =============================================================================
-- SCORECARD_INPUTS (via scorecard -> company)
-- =============================================================================
drop policy if exists "Authenticated users can manage scorecard inputs" on public.scorecard_inputs;

create policy "Users can select scorecard_inputs of owned companies"
  on public.scorecard_inputs for select
  using (
    exists (
      select 1 from public.scorecards s
      join public.companies c on c.id = s.company_id and c.owner_id = auth.uid()
      where s.id = scorecard_inputs.scorecard_id
    )
  );

create policy "Users can insert scorecard_inputs for owned companies"
  on public.scorecard_inputs for insert
  with check (
    exists (
      select 1 from public.scorecards s
      join public.companies c on c.id = s.company_id and c.owner_id = auth.uid()
      where s.id = scorecard_inputs.scorecard_id
    )
  );

create policy "Users can update scorecard_inputs of owned companies"
  on public.scorecard_inputs for update
  using (
    exists (
      select 1 from public.scorecards s
      join public.companies c on c.id = s.company_id and c.owner_id = auth.uid()
      where s.id = scorecard_inputs.scorecard_id
    )
  );

create policy "Users can delete scorecard_inputs of owned companies"
  on public.scorecard_inputs for delete
  using (
    exists (
      select 1 from public.scorecards s
      join public.companies c on c.id = s.company_id and c.owner_id = auth.uid()
      where s.id = scorecard_inputs.scorecard_id
    )
  );

-- =============================================================================
-- SCORECARD_RESULTS (via scorecard -> company)
-- =============================================================================
drop policy if exists "Authenticated users can manage scorecard results" on public.scorecard_results;

create policy "Users can select scorecard_results of owned companies"
  on public.scorecard_results for select
  using (
    exists (
      select 1 from public.scorecards s
      join public.companies c on c.id = s.company_id and c.owner_id = auth.uid()
      where s.id = scorecard_results.scorecard_id
    )
  );

create policy "Users can insert scorecard_results for owned companies"
  on public.scorecard_results for insert
  with check (
    exists (
      select 1 from public.scorecards s
      join public.companies c on c.id = s.company_id and c.owner_id = auth.uid()
      where s.id = scorecard_results.scorecard_id
    )
  );

create policy "Users can update scorecard_results of owned companies"
  on public.scorecard_results for update
  using (
    exists (
      select 1 from public.scorecards s
      join public.companies c on c.id = s.company_id and c.owner_id = auth.uid()
      where s.id = scorecard_results.scorecard_id
    )
  );

create policy "Users can delete scorecard_results of owned companies"
  on public.scorecard_results for delete
  using (
    exists (
      select 1 from public.scorecards s
      join public.companies c on c.id = s.company_id and c.owner_id = auth.uid()
      where s.id = scorecard_results.scorecard_id
    )
  );

-- =============================================================================
-- PROCUREMENT_ASSESSMENTS (via company)
-- =============================================================================
drop policy if exists "Authenticated users can manage procurement assessments" on public.procurement_assessments;

create policy "Users can select procurement_assessments of owned companies"
  on public.procurement_assessments for select
  using (
    exists (
      select 1 from public.companies c
      where c.id = procurement_assessments.company_id and c.owner_id = auth.uid()
    )
  );

create policy "Users can insert procurement_assessments for owned companies"
  on public.procurement_assessments for insert
  with check (
    exists (
      select 1 from public.companies c
      where c.id = procurement_assessments.company_id and c.owner_id = auth.uid()
    )
  );

create policy "Users can update procurement_assessments of owned companies"
  on public.procurement_assessments for update
  using (
    exists (
      select 1 from public.companies c
      where c.id = procurement_assessments.company_id and c.owner_id = auth.uid()
    )
  );

create policy "Users can delete procurement_assessments of owned companies"
  on public.procurement_assessments for delete
  using (
    exists (
      select 1 from public.companies c
      where c.id = procurement_assessments.company_id and c.owner_id = auth.uid()
    )
  );

-- =============================================================================
-- PROCUREMENT_SUPPLIERS (via assessment -> company)
-- =============================================================================
drop policy if exists "Authenticated users can manage procurement suppliers" on public.procurement_suppliers;

create policy "Users can select procurement_suppliers of owned companies"
  on public.procurement_suppliers for select
  using (
    exists (
      select 1 from public.procurement_assessments a
      join public.companies c on c.id = a.company_id and c.owner_id = auth.uid()
      where a.id = procurement_suppliers.assessment_id
    )
  );

create policy "Users can insert procurement_suppliers for owned companies"
  on public.procurement_suppliers for insert
  with check (
    exists (
      select 1 from public.procurement_assessments a
      join public.companies c on c.id = a.company_id and c.owner_id = auth.uid()
      where a.id = procurement_suppliers.assessment_id
    )
  );

create policy "Users can update procurement_suppliers of owned companies"
  on public.procurement_suppliers for update
  using (
    exists (
      select 1 from public.procurement_assessments a
      join public.companies c on c.id = a.company_id and c.owner_id = auth.uid()
      where a.id = procurement_suppliers.assessment_id
    )
  );

create policy "Users can delete procurement_suppliers of owned companies"
  on public.procurement_suppliers for delete
  using (
    exists (
      select 1 from public.procurement_assessments a
      join public.companies c on c.id = a.company_id and c.owner_id = auth.uid()
      where a.id = procurement_suppliers.assessment_id
    )
  );

-- =============================================================================
-- PROCUREMENT_RESULTS (via assessment -> company)
-- =============================================================================
drop policy if exists "Authenticated users can manage procurement results" on public.procurement_results;

create policy "Users can select procurement_results of owned companies"
  on public.procurement_results for select
  using (
    exists (
      select 1 from public.procurement_assessments a
      join public.companies c on c.id = a.company_id and c.owner_id = auth.uid()
      where a.id = procurement_results.assessment_id
    )
  );

create policy "Users can insert procurement_results for owned companies"
  on public.procurement_results for insert
  with check (
    exists (
      select 1 from public.procurement_assessments a
      join public.companies c on c.id = a.company_id and c.owner_id = auth.uid()
      where a.id = procurement_results.assessment_id
    )
  );

create policy "Users can update procurement_results of owned companies"
  on public.procurement_results for update
  using (
    exists (
      select 1 from public.procurement_assessments a
      join public.companies c on c.id = a.company_id and c.owner_id = auth.uid()
      where a.id = procurement_results.assessment_id
    )
  );

create policy "Users can delete procurement_results of owned companies"
  on public.procurement_results for delete
  using (
    exists (
      select 1 from public.procurement_assessments a
      join public.companies c on c.id = a.company_id and c.owner_id = auth.uid()
      where a.id = procurement_results.assessment_id
    )
  );

-- =============================================================================
-- AUDIT_LOG (actor-based visibility)
-- =============================================================================
drop policy if exists "Authenticated users can view audit log" on public.audit_log;
drop policy if exists "Authenticated users can insert audit log" on public.audit_log;

create policy "Users can select own audit log"
  on public.audit_log for select
  using (actor_id = auth.uid());

create policy "Users can insert audit log as actor"
  on public.audit_log for insert
  with check (actor_id = auth.uid());
