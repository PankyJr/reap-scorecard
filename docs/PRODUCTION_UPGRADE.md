# Upgrading production

How to take the live site (`reap-scorecard.netlify.app`, Supabase project
`pmjuiynjelhjlpyohbvk`) from what runs on `main` today to this branch. It also
covers setting up a separate Netlify staging site.

This was written without access to production. Step 1 finds out what
production actually has, so nothing below depends on a guess.

## What changes

The app on `main` has procurement scorecards, the older full-workbook
calculator and the legacy manual scorecard. This branch adds:

- The full B-BBEE scorecard: seven elements, workbook import, a final level
  and a report.
- Workforce (EAP) targets.
- A simpler interface.
- Strict tenant isolation in the database.

The database needs eight migrations that `main` does not have:

| Order | Migration | What it adds | Touches existing data? |
|---|---|---|---|
| 1 | `20260730140000_full_scorecard_calculator.sql` | Tables `scorecard_assessments`, `scorecard_assessment_elements`, `scorecard_calculation_runs`, `eap_target_sets`, `eap_target_set_values`, `eap_target_set_audit`, with their RLS policies | No |
| 2 | `20260731020000_generic_scorecard_engine.sql` | Tables `scorecard_contribution_records`, `scorecard_assessment_overrides`, `scorecard_priority_results`, `scorecard_assessment_audit_log`, the recalculation trigger, and more columns on `scorecard_assessments` | No (only the new tables) |
| 3 | `20260731150000_generic_workbook_import.sql` | Workbook import columns on `scorecard_assessments` | No |
| 4 | `20260826100000_contribution_evidence_reference.sql` | `evidence_reference` column | No |
| 5 | `20260827120000_contribution_evidence_correction.sql` | Correction column and function | No |
| 6 | `20260930120000_strict_owner_rls.sql` | Replaces the "any signed-in user" policies on companies, legacy scorecards, procurement and the audit log with owner-only policies. Profiles become readable only by their owner | Changes who can see rows; changes no rows |
| 7 | `20261006120000_company_profile_fields.sql` | Three empty columns on `companies`: `financial_year_end_month`, `annual_turnover`, `black_ownership_percentage`, with range checks | No (new columns start empty) |
| 8 | `20261006130000_procurement_review_decisions.sql` | One empty column on `procurement_assessments`: `review_decisions` (the "Keep both" choices for possible duplicate suppliers) | No |

All eight are additive and safe to re-run: no table, column or row is
dropped. The only things removed are policies that number 6 replaces.
Numbers 7 and 8 are already applied on staging.

Migration 6 fixes a real security hole. A database built from the migrations
alone lets any signed-in user read, change and delete any other user's
companies and procurement data, and lets anyone read every profile's name and
e-mail address. Whether production has this hole depends on whether
`supabase/phase3_strict_rls.sql` was ever run there by hand. Step 1 checks.

## Step 0. Plan the window

- Pick a quiet time. The database steps take minutes; allow an hour in total,
  including checks.
- Tell users the site may be briefly unavailable.
- Have to hand: the production database password (Supabase > Project Settings
  > Database), Netlify access, and one test account that is a REAP internal
  admin.

## Step 1. Find out what production has (read-only)

In the Supabase SQL editor for `pmjuiynjelhjlpyohbvk`, run each query and keep
the output.

```sql
-- 1a. Migrations recorded by the CLI (this table may not exist if migrations
--     were pasted by hand; that is fine, 1b answers the same question).
select version, name from supabase_migrations.schema_migrations order by version;

-- 1b. Which tables exist.
select t, to_regclass('public.' || t) is not null as present
from unnest(array[
  'companies','procurement_assessments','procurement_suppliers','procurement_results',
  'scorecard_workbooks','reap_internal_admins',
  'scorecard_assessments','scorecard_assessment_elements','scorecard_calculation_runs',
  'eap_target_sets','eap_target_set_values','eap_target_set_audit',
  'scorecard_contribution_records','scorecard_assessment_overrides',
  'scorecard_priority_results','scorecard_assessment_audit_log'
]) as t;

-- 1c. Is the flow-through column there? (main's last migration)
select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'procurement_suppliers' and column_name like '%flow%';

-- 1d. Current policies on the shared tables. "auth.role() = 'authenticated'"
--     or "true" in qual means every signed-in user (or everyone) sees every row.
select tablename, policyname, cmd, qual
from pg_policies
where schemaname = 'public'
  and tablename in ('companies','procurement_assessments','procurement_suppliers',
                    'procurement_results','scorecards','audit_log','profiles')
order by tablename, policyname;

-- 1e. Companies with no owner. These become invisible once migration 6 runs.
select count(*) from public.companies where owner_id is null;
```

How to read the results:

- **1b shows the six new table groups as absent:** this is the expected
  state. Apply all eight migrations.
- **Some of the new tables already exist:** the matching migrations were
  applied by hand. Mark them as applied (step 3) and apply the rest.
- **1d shows owner-scoped policies** (`owner_id = auth.uid()`) **on
  `companies`:** `phase3_strict_rls.sql` was run by hand. Migration 6 still
  runs, and is a no-op in effect.
- **1e is above zero:** give those companies an owner before step 4. Use
  `supabase/phase2_backfill_companies_owner_id.sql` as the template.
  Otherwise their owners lose sight of them.

## Step 2. Back up

Take both backups. Do not continue until the dump file exists and is not
empty.

1. In Supabase, go to Database > Backups and note the latest daily backup.
   If the project has point-in-time recovery, note the current time.
2. Take a full dump from a machine with `pg_dump` 17:

   ```bash
   echo 'PGPASSWORD=<production database password>' > .env.prod-dump.local   # git-ignored
   ./scripts/ops/backup-production.sh
   ls -lh backups/        # expect a file of several MB
   grep -c "COPY public.companies" backups/reap-prod-*.sql   # expect 1
   ```

Keep the dump off the repository. `backups/` is git-ignored.

## Step 3. Apply the migrations

Use the Supabase CLI from a checkout of this branch:

```bash
supabase link --project-ref pmjuiynjelhjlpyohbvk
supabase migration list            # compare Local vs Remote
```

If `Remote` is empty for migrations that step 1 showed are already in the
database, record them as applied without running them. Repeat for each
version that is present:

```bash
supabase migration repair --status applied 20260730084722
```

Then preview and apply:

```bash
supabase db push --dry-run         # must list only the migrations you expect
supabase db push
```

Without the CLI, paste each file from `supabase/migrations/` into the SQL
editor in the order of the table above, one at a time. Run the check after
each one before moving on.

### Check after each migration

| After | Run | Expect |
|---|---|---|
| 1 | `select count(*) from public.scorecard_assessments;` | `0`, no error |
| 2 | `select count(*) from public.scorecard_contribution_records;` | `0`, no error |
| 3 | `select workbook_import_status from public.scorecard_assessments limit 1;` | no error |
| 4 | `select evidence_reference from public.scorecard_contribution_records limit 1;` | no error |
| 5 | `select proname from pg_proc where proname = 'correct_contribution_evidence_reference';` | one row |
| 6 | query 1d again | every policy on `companies` mentions `owner_id = auth.uid()`; `profiles` select mentions `auth.uid() = id` |
| 7 | `select count(annual_turnover) from public.companies;` | `0`, no error |
| 8 | `select count(review_decisions) from public.procurement_assessments;` | `0`, no error |

After migration 6, open the current live site, which still runs `main`. Sign
in as a normal user and open Companies and a procurement scorecard. They must
still show that user's own data. This proves the old code works with the new
policies before any code changes.

## Step 4. Deploy the code

1. Merge the pull request into `main`. Netlify builds and publishes it.
2. Check the Netlify production environment has every variable in
   `docs/DEPLOYMENT.md` section 4, in particular `SUPABASE_SERVICE_ROLE_KEY`
   (the admin console and workforce targets need it) and
   `NEXT_PUBLIC_SITE_URL=https://reap-scorecard.netlify.app`.
3. In Supabase, under Authentication > URL Configuration, the Site URL must be
   the live URL. The redirect URLs must include
   `https://reap-scorecard.netlify.app/auth/callback`.
4. In Supabase, set up your own SMTP under Authentication > SMTP. The built-in
   sender allows two auth e-mails an hour, which stalls sign-up and password
   reset.
5. **Phone sign-in settings.** Set all three of these, or sign-in from a phone
   can still fail after the code fix:
   - **Supabase > Authentication > URL Configuration > Site URL:**
     `https://reap-scorecard.netlify.app`. The e-mail links are built from it.
   - **Supabase > Authentication > Email Templates:**
     - In "Confirm signup", replace the message body with the contents of
       `supabase/email-templates/confirm-signup.html`.
     - In "Reset password", replace it with
       `supabase/email-templates/reset-password.html`.

     Their links go to `/auth/confirm`, which works in whichever browser opens
     the e-mail. The old `{{ .ConfirmationURL }}` links only work in the
     browser that asked for the e-mail. On a phone, Gmail, Outlook and WhatsApp
     open links in their own built-in browser, so those links failed with
     "This sign-in link is no longer valid".
   - **Netlify > Site configuration > Environment variables:**
     `NEXT_PUBLIC_SITE_URL=https://reap-scorecard.netlify.app`, then redeploy.
     The value is fixed at build time. If it holds `localhost` or an old
     domain, the Google, Microsoft and e-mail links send people there.

   Two causes are fixed in the code on this branch and need no setting: the
   sign-in form now works when it is tapped before the page has finished
   loading, and the signed-in app has a menu on phones (`main` had none).

   Google sign-in refuses to run inside another app's built-in browser. If
   someone taps the link in WhatsApp or Instagram, they should open it in
   Safari or Chrome, or use their e-mail and password.

## Step 5. Check the live site

Do these in order, with a throwaway account. Delete what you create at the end.

1. Open `/api/health`. It returns `{"status":"ok"}` and the new commit.
2. Sign up, open the e-mail, click the link, and land on Home.
   - **On a phone**: sign in with e-mail and password. Then use Forgot
     password, open the e-mail in the phone's mail app and tap the link. It
     must open the "choose a new password" page, not "no longer valid".
3. Sign in with the internal-admin account. Go to Workforce targets, create
   the set for the year with the six published percentages, save, then
   click "Put this set in use".
4. As the new account:
   1. Click Start new, choose Full B-BBEE scorecard, add a company, and
      upload the REAP workbook.
   2. Check what it read, and confirm.
   3. Set Company size and sector.
   4. Confirm the evidence on the enterprise development, supplier
      development and socio-economic development records.
   5. Attach the workforce targets, and calculate.
   6. Open the report.
5. Click Start new again, choose Procurement only, save one, then open its
   report and download the PDF.
6. Sign in as a second normal account. The first account's company must not
   be listed, and its scorecard URL must show "not found".
7. Open an existing customer's company as the internal admin in `/admin`. It
   must still be listed with its procurement scorecards.

Procurement PDF on Netlify: the 30 July production check recorded "Failed to
render procurement PDF" on Netlify. This branch does not change that path. If
it still fails, the report page's Print / Save as PDF works as a stop-gap.
Look at the Netlify function log for `render-pdf` to see why.

## Rollback

Work from the least to the most drastic.

1. **The code is at fault, and the data is fine.** In Netlify, open Deploys,
   select the last deploy built from the old `main`, and click "Publish
   deploy". The old code runs on the upgraded database: it does not use the
   new tables, and it worked with the new policies in step 3.
2. **Migration 6 blocks something a customer needs.** Re-assign owners as in
   step 1e first; that is almost always the cause. Re-opening the old "any
   signed-in user" policies would re-open the security hole, so only do it
   knowingly, as a temporary measure. The old policy definitions are in
   `supabase/migrations/20260401000000_baseline_schema.sql`.
3. **Migrations 1 to 5 cause trouble.** Leave them. They only add tables and
   columns that the old code never reads.
4. **Data is damaged.** Restore from the step 2 backup, either with the
   Supabase point-in-time restore or with
   `psql "<connection string>" -f backups/reap-prod-<stamp>.sql` into a fresh
   project. Anything written after the backup is lost, so this is the last
   resort.

## A separate Netlify staging site

The goal is to test every branch on a site that uses the staging database
(`jzvqyryblsfxlinvoiuf`) and can never touch production.

1. In Netlify, choose Add new site, then Import from Git, and pick
   `PankyJr/reap-scorecard` through Netlify's GitHub App. Call it, for
   example, `reap-scorecard-staging`.
2. Set the build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
   - Both are already in `netlify.toml`.
3. Under Site configuration > Build & deploy > Branches and deploy contexts:
   - Production branch: `staging` (create it from `main` and push branches
     into it to test them), or `main` if staging should track `main`.
   - Branch deploys: All, so every pushed branch gets its own URL.
   - Deploy previews: Any pull request.
4. Under Environment variables, set the staging values for all contexts:
   - `NEXT_PUBLIC_SUPABASE_URL=https://jzvqyryblsfxlinvoiuf.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=<staging anon key>`
   - `SUPABASE_SERVICE_ROLE_KEY=<staging service role key>`
   - `NEXT_PUBLIC_SITE_URL=https://reap-scorecard-staging.netlify.app`

   Sign-in links are built from `NEXT_PUBLIC_SITE_URL`, which is fixed at
   build time. Make each branch deploy and preview use its own address by
   adding this to `netlify.toml` on the staging site's branches:

   ```toml
   [context.branch-deploy]
     command = "NEXT_PUBLIC_SITE_URL=$DEPLOY_PRIME_URL npm run build"
   [context.deploy-preview]
     command = "NEXT_PUBLIC_SITE_URL=$DEPLOY_PRIME_URL npm run build"
   ```

   Then add their address pattern to the redirect URLs (next step).
5. In the staging Supabase project, under Authentication > URL Configuration:
   - Site URL: `https://reap-scorecard-staging.netlify.app`
   - Redirect URLs: `https://reap-scorecard-staging.netlify.app/**` and
     `https://*--reap-scorecard-staging.netlify.app/**`.
6. On the production site, turn off branch deploys and deploy previews, or
   give those contexts the staging variables. Netlify gives every context the
   production variables by default, so a preview of the production site
   would otherwise run against the production database.
7. Keep the staging Supabase project awake.
   `.github/workflows/keep-supabase-awake.yml` pings it daily once its
   secrets are set (see `scripts/ops/README.md`).

To prove the staging site is staging, sign in on it. Then check the Supabase
dashboard for the staging project: under Authentication > Users, the account
shows a fresh "last sign in". Production shows nothing new.
