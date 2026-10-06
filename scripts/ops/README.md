# Operations: shipping and keeping the lights on

Written 2026-09-27. Everything below is the manual part of the ship; the code
changes are already in the working tree (see `git status`).

## 0. Why the apps look dead

All three REAP Supabase projects are on the free tier, which pauses a project
after seven days without API traffic. On 2026-09-27 production
(`pmjuiynjelhjlpyohbvk`), staging (`jzvqyryblsfxlinvoiuf`) and the demo
(`nwckbwhfgaozlfzhntdr`) all failed to resolve in DNS, which is what a paused
project looks like. The Netlify and Lightsail sites still serve their login
pages, but nobody can sign in until the project behind them is restored.

Restore: Supabase dashboard > project > "Restore project". Takes a few minutes.

## 1. Restore, then keep awake

1. Restore production and the demo (staging only if you still use it).
2. Add these repository secrets on GitHub (Settings > Secrets and variables >
   Actions). Values are the project URL and the anon key from each project's
   API settings; they are the same values the browser bundle already ships.
   - `KEEPALIVE_PROD_SUPABASE_URL`, `KEEPALIVE_PROD_SUPABASE_ANON_KEY`
   - `KEEPALIVE_STAGING_SUPABASE_URL`, `KEEPALIVE_STAGING_SUPABASE_ANON_KEY`
   The workflow `.github/workflows/keep-supabase-awake.yml` runs daily and
   skips any target whose secrets are missing. Run it once by hand from the
   Actions tab to prove it goes green.
3. The demo project needs the same treatment if it is to survive a quiet week;
   add a third matrix entry with its URL and anon key if you want that.

## 2. Back up production before anything else

```
# one line in a git-ignored file at the repo root
echo 'PGPASSWORD=<database password from Project Settings > Database>' > .env.prod-dump.local
scripts/ops/backup-production.sh
```

The script prints the byte size and, for procurement_assessments,
procurement_suppliers, procurement_results and companies, whether the
CREATE TABLE is present and how many rows the COPY block holds. `backups/`
is git-ignored.

## 3. Forensics (read-only)

Run `scripts/ops/production-forensics.sql` in the SQL editor of the production
project. It selects ids, counts and dates only; no names or addresses. The
"denominator_old_code vs denominator_corrected" query shows, per calculated
assessment, how far the old TMPS arithmetic was from the Codes definition.

## 4. Ship

1. Commit the working tree (named paths, never `git add -A`):
   `.gitignore`, `src/lib/procurement/tmps.ts`,
   `src/lib/procurement/__tests__/tmpsTotals.test.ts`,
   `src/app/(dashboard)/dashboard/page.tsx`, `scripts/seed-demo-data.ts`,
   `.github/workflows/keep-supabase-awake.yml`, `scripts/ops/`.
2. Push `infra/docker-aws-ci`. CI typechecks, lints, tests, builds the demo
   image and deploys it to Lightsail; the deploy job waits for ACTIVE.
3. Re-seed the demo so the dashboard has scores to show:
   `set -a; . ./.env.demo.local; set +a; npx tsx scripts/seed-demo-data.ts`
4. Production database: the branch adds tables production does not have
   (generic scorecard engine and full calculator). Apply
   `supabase/migrations/*.sql` that are not yet in
   `supabase_migrations.schema_migrations` on production, in filename order,
   AFTER the backup in step 2. Every `create table` is `if not exists`.
5. Merge PR #2 into `main`. The `reap-scorecard` Netlify site deploys `main`
   to production automatically.
6. Prove it: sign in on production, open a procurement assessment that used
   "calculated TMPS", check the TMPS card shows purchases under Inclusions,
   and open the dashboard to see Avg Level and Portfolio Insights populated.

## 5. Existing assessments scored with the old TMPS

Saved scores are not recomputed by deploying code. For each assessment the
forensics query flags, open it, press Save on the edit page; the save path
recalculates the denominator, total_score and procurement_results.
