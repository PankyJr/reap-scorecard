-- Strict ownership-based row level security.
--
-- WHY THIS IS A MIGRATION NOW
-- The baseline schema gives every signed-in user full access to every company,
-- legacy scorecard and procurement row ("auth.role() = 'authenticated'"), lets
-- any signed-in user read the whole audit log, and lets ANYONE, signed in or
-- not, read every profile (names and e-mail addresses). The owner-scoped
-- policies that fix this lived in supabase/phase3_strict_rls.sql, a loose file
-- that was applied by hand on some projects and is not in the migration chain.
-- A database built from the migrations alone therefore had no tenant
-- isolation: in the 2026-09-30 end-to-end audit a second, unrelated account
-- read another user's company, suppliers and procurement results through the
-- REST API, renamed the company and deleted the assessment.
--
-- WHAT IT DOES
--   companies                          owner_id = auth.uid()
--   scorecards, scorecard_inputs,
--   scorecard_results                  via the owning company
--   procurement_assessments,
--   procurement_suppliers,
--   procurement_results                via the owning company
--   audit_log                          actor_id = auth.uid()
--   profiles                           a user reads only their own row
--
-- Internal admin screens are unaffected: they use the service-role key, which
-- bypasses row level security, after the reap_internal_admins check.
--
-- SAFE TO RE-RUN. Every policy is dropped before it is created, so applying
-- this on a project where phase3_strict_rls.sql was already run by hand is a
-- no-op in effect. It changes no rows and drops no tables or columns.
--
-- BEFORE APPLYING TO A PROJECT WITH REAL DATA
-- A company whose owner_id is NULL becomes invisible to every user (the app
-- already refuses to edit such rows). The notice below reports how many there
-- are; assign owners first (see supabase/phase2_backfill_companies_owner_id.sql).

do $$
declare
  orphaned integer;
begin
  select count(*) into orphaned from public.companies where owner_id is null;
  if orphaned > 0 then
    raise notice 'strict RLS: % companies have no owner_id and will not be visible to any user until one is assigned', orphaned;
  end if;
end $$;

-- =============================================================================
-- COMPANIES
-- =============================================================================
drop policy if exists "Authenticated users can manage companies" on public.companies;

drop policy if exists "Users can select own companies" on public.companies;
create policy "Users can select own companies"
  on public.companies for select
  using (owner_id = auth.uid());

drop policy if exists "Users can insert companies they own" on public.companies;
create policy "Users can insert companies they own"
  on public.companies for insert
  with check (owner_id = auth.uid());

drop policy if exists "Users can update own companies" on public.companies;
create policy "Users can update own companies"
  on public.companies for update
  using (owner_id = auth.uid());

drop policy if exists "Users can delete own companies" on public.companies;
create policy "Users can delete own companies"
  on public.companies for delete
  using (owner_id = auth.uid());

-- =============================================================================
-- SCORECARDS (access via company ownership)
-- =============================================================================
drop policy if exists "Authenticated users can manage scorecards" on public.scorecards;

drop policy if exists "Users can select scorecards of owned companies" on public.scorecards;
create policy "Users can select scorecards of owned companies"
  on public.scorecards for select
  using (
    exists (
      select 1 from public.companies c
      where c.id = scorecards.company_id and c.owner_id = auth.uid()
    )
  );

drop policy if exists "Users can insert scorecards for owned companies" on public.scorecards;
create policy "Users can insert scorecards for owned companies"
  on public.scorecards for insert
  with check (
    exists (
      select 1 from public.companies c
      where c.id = scorecards.company_id and c.owner_id = auth.uid()
    )
  );

drop policy if exists "Users can update scorecards of owned companies" on public.scorecards;
create policy "Users can update scorecards of owned companies"
  on public.scorecards for update
  using (
    exists (
      select 1 from public.companies c
      where c.id = scorecards.company_id and c.owner_id = auth.uid()
    )
  );

drop policy if exists "Users can delete scorecards of owned companies" on public.scorecards;
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

drop policy if exists "Users can select scorecard_inputs of owned companies" on public.scorecard_inputs;
create policy "Users can select scorecard_inputs of owned companies"
  on public.scorecard_inputs for select
  using (
    exists (
      select 1 from public.scorecards s
      join public.companies c on c.id = s.company_id and c.owner_id = auth.uid()
      where s.id = scorecard_inputs.scorecard_id
    )
  );

drop policy if exists "Users can insert scorecard_inputs for owned companies" on public.scorecard_inputs;
create policy "Users can insert scorecard_inputs for owned companies"
  on public.scorecard_inputs for insert
  with check (
    exists (
      select 1 from public.scorecards s
      join public.companies c on c.id = s.company_id and c.owner_id = auth.uid()
      where s.id = scorecard_inputs.scorecard_id
    )
  );

drop policy if exists "Users can update scorecard_inputs of owned companies" on public.scorecard_inputs;
create policy "Users can update scorecard_inputs of owned companies"
  on public.scorecard_inputs for update
  using (
    exists (
      select 1 from public.scorecards s
      join public.companies c on c.id = s.company_id and c.owner_id = auth.uid()
      where s.id = scorecard_inputs.scorecard_id
    )
  );

drop policy if exists "Users can delete scorecard_inputs of owned companies" on public.scorecard_inputs;
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

drop policy if exists "Users can select scorecard_results of owned companies" on public.scorecard_results;
create policy "Users can select scorecard_results of owned companies"
  on public.scorecard_results for select
  using (
    exists (
      select 1 from public.scorecards s
      join public.companies c on c.id = s.company_id and c.owner_id = auth.uid()
      where s.id = scorecard_results.scorecard_id
    )
  );

drop policy if exists "Users can insert scorecard_results for owned companies" on public.scorecard_results;
create policy "Users can insert scorecard_results for owned companies"
  on public.scorecard_results for insert
  with check (
    exists (
      select 1 from public.scorecards s
      join public.companies c on c.id = s.company_id and c.owner_id = auth.uid()
      where s.id = scorecard_results.scorecard_id
    )
  );

drop policy if exists "Users can update scorecard_results of owned companies" on public.scorecard_results;
create policy "Users can update scorecard_results of owned companies"
  on public.scorecard_results for update
  using (
    exists (
      select 1 from public.scorecards s
      join public.companies c on c.id = s.company_id and c.owner_id = auth.uid()
      where s.id = scorecard_results.scorecard_id
    )
  );

drop policy if exists "Users can delete scorecard_results of owned companies" on public.scorecard_results;
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

drop policy if exists "Users can select procurement_assessments of owned companies" on public.procurement_assessments;
create policy "Users can select procurement_assessments of owned companies"
  on public.procurement_assessments for select
  using (
    exists (
      select 1 from public.companies c
      where c.id = procurement_assessments.company_id and c.owner_id = auth.uid()
    )
  );

drop policy if exists "Users can insert procurement_assessments for owned companies" on public.procurement_assessments;
create policy "Users can insert procurement_assessments for owned companies"
  on public.procurement_assessments for insert
  with check (
    exists (
      select 1 from public.companies c
      where c.id = procurement_assessments.company_id and c.owner_id = auth.uid()
    )
  );

drop policy if exists "Users can update procurement_assessments of owned companies" on public.procurement_assessments;
create policy "Users can update procurement_assessments of owned companies"
  on public.procurement_assessments for update
  using (
    exists (
      select 1 from public.companies c
      where c.id = procurement_assessments.company_id and c.owner_id = auth.uid()
    )
  );

drop policy if exists "Users can delete procurement_assessments of owned companies" on public.procurement_assessments;
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

drop policy if exists "Users can select procurement_suppliers of owned companies" on public.procurement_suppliers;
create policy "Users can select procurement_suppliers of owned companies"
  on public.procurement_suppliers for select
  using (
    exists (
      select 1 from public.procurement_assessments a
      join public.companies c on c.id = a.company_id and c.owner_id = auth.uid()
      where a.id = procurement_suppliers.assessment_id
    )
  );

drop policy if exists "Users can insert procurement_suppliers for owned companies" on public.procurement_suppliers;
create policy "Users can insert procurement_suppliers for owned companies"
  on public.procurement_suppliers for insert
  with check (
    exists (
      select 1 from public.procurement_assessments a
      join public.companies c on c.id = a.company_id and c.owner_id = auth.uid()
      where a.id = procurement_suppliers.assessment_id
    )
  );

drop policy if exists "Users can update procurement_suppliers of owned companies" on public.procurement_suppliers;
create policy "Users can update procurement_suppliers of owned companies"
  on public.procurement_suppliers for update
  using (
    exists (
      select 1 from public.procurement_assessments a
      join public.companies c on c.id = a.company_id and c.owner_id = auth.uid()
      where a.id = procurement_suppliers.assessment_id
    )
  );

drop policy if exists "Users can delete procurement_suppliers of owned companies" on public.procurement_suppliers;
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

drop policy if exists "Users can select procurement_results of owned companies" on public.procurement_results;
create policy "Users can select procurement_results of owned companies"
  on public.procurement_results for select
  using (
    exists (
      select 1 from public.procurement_assessments a
      join public.companies c on c.id = a.company_id and c.owner_id = auth.uid()
      where a.id = procurement_results.assessment_id
    )
  );

drop policy if exists "Users can insert procurement_results for owned companies" on public.procurement_results;
create policy "Users can insert procurement_results for owned companies"
  on public.procurement_results for insert
  with check (
    exists (
      select 1 from public.procurement_assessments a
      join public.companies c on c.id = a.company_id and c.owner_id = auth.uid()
      where a.id = procurement_results.assessment_id
    )
  );

drop policy if exists "Users can update procurement_results of owned companies" on public.procurement_results;
create policy "Users can update procurement_results of owned companies"
  on public.procurement_results for update
  using (
    exists (
      select 1 from public.procurement_assessments a
      join public.companies c on c.id = a.company_id and c.owner_id = auth.uid()
      where a.id = procurement_results.assessment_id
    )
  );

drop policy if exists "Users can delete procurement_results of owned companies" on public.procurement_results;
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

drop policy if exists "Users can select own audit log" on public.audit_log;
create policy "Users can select own audit log"
  on public.audit_log for select
  using (actor_id = auth.uid());

drop policy if exists "Users can insert audit log as actor" on public.audit_log;
create policy "Users can insert audit log as actor"
  on public.audit_log for insert
  with check (actor_id = auth.uid());


-- =============================================================================
-- PROFILES (a user reads only their own row)
-- =============================================================================
-- The baseline policy "Public profiles are viewable by everyone." used
-- `using (true)`, which exposes every user's name and e-mail address to anyone
-- holding the public anon key. The app only ever reads the signed-in user's
-- own profile with the user-scoped client.
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
drop policy if exists "Users can view own profile." on public.profiles;
create policy "Users can view own profile."
  on public.profiles for select
  using (auth.uid() = id);
