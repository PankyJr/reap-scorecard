# Full scorecard workflow — demo QA checklist

Use this checklist before a client demo of the **generic B-BBEE workbook** flow (`/scorecards/full/...`). It does not cover legacy `/scorecards/new` or procurement assessments.

## Prerequisites

- Local or hosted app with Supabase configured (see root `README.md` for environment variables).
- A test user account with at least one **owned** company.
- A representative **`.xlsx`** generic B-BBEE workbook (template-aligned) for upload tests. If your team uses a shared fixture path or env var for demo workbooks, document it in your own runbook; the app does not require a specific env var for uploads.

## Database

- Apply Supabase migrations so these exist (names may vary by migration timestamp):
  - `scorecard_workbooks`, `scorecard_workbook_sheets`, `scorecard_metric_values`
  - `scorecard_validation_issues`, `scorecard_engine_runs`, `scorecard_engine_results`
- Confirm RLS allows the signed-in owner to read/write workbook rows for their company.

### Troubleshooting: “Could not save workbook metadata”

From the import page error string (or server logs), read the Supabase `code` / `message`:

| Symptom | Likely cause | What to do |
|--------|----------------|------------|
| `42P01` / relation does not exist | Migrations not applied | `supabase db reset` or `supabase migration up` (see commands below) |
| `42501` / permission denied for table | Role lacked DML on new tables | Apply migration `20260505203000_scorecard_workbooks_grants_and_insert_rls.sql` (grants `authenticated`) |
| `42501` / row-level security | RLS rejected insert (wrong `owner_id`, or `auth.uid()` null) | Ensure `companies.owner_id` equals the logged-in user’s `auth.users.id` |
| `PGRST116` / 0 rows | Rare: insert returned no visible row | Check RLS SELECT on `scorecard_workbooks` for same conditions as INSERT |

**Assign owner in SQL** (run in Supabase SQL editor with a known user id, or use service role):

```sql
update public.companies
set owner_id = '<paste-auth-user-uuid>'
where id = '<company-uuid>'
  and owner_id is null;
```

## Demo steps (happy path)

1. **Company** — Open the company detail page. In **Full scorecard**, confirm the empty state or latest workbook summary, then click **Import full scorecard** (or use the hero shortcut).
2. **Import** — Upload `.xlsx` via **Upload and extract**. Confirm redirect with `workbookId` in the URL, human-readable **workbook status** (e.g. Extracted / Extracted with warnings), and **Next step** guidance.
3. **Validation** — Expand grouped / debug sections only if needed; confirm no unexpected blocking errors for your demo file.
4. **Engine** — Click **Run scoring engine**. Confirm run status becomes **Completed** (or **Completed with warnings**).
5. **Scorecard view** — Open **Open scorecard view** / company links. Confirm pillar table, reconciliation copy (Excel reference = comparison-only), and **Next step** when score is complete vs partial.
6. **Exports** — With a saved engine result, confirm **Download PDF** and **Export Excel** respond with files. Without a result, exports should not be offered on the detail page.
7. **Debug** — Append `?debug=1` on the scorecard detail URL and confirm raw JSON / metadata panels appear.

## Expected outputs

- **PDF**: Printable report for the same workbook (Puppeteer route); content reflects engine `result_json`.
- **Excel**: New workbook (not the original upload); sheets include Summary, Full Scorecard, Reconciliation, Validation Issues, Source Metrics; calculated values are from the engine.

## Known limitations (call out in demos)

- **Supplier line import** — Preferential procurement supplier-line detail is not implemented in v1; summary-style extraction applies where documented in code.
- **Discounting / subminimum** — Not applied as score adjustments in the engine; flags and copy may appear as informational warnings only.
- **Workbook formulas** — Some Excel errors surface as **warnings** on extracted metrics; they do not silently become scores.
- **Excel “Full Scorecard” tab** — Reference cells are **comparison-only** for reconciliation; the engine does not treat them as authoritative inputs.

## Safety / rollback

- **Legacy scorecards** (`/scorecards/new`, `scorecards` table) and **procurement** flows are unchanged by the full-scorecard feature set.
- Upload stores a **copy** of parsed data in the app database; the original file is not mutated by PDF/Excel export (exports are **new** files built from engine output and metrics).

## Smoke commands (developer)

From repo root:

```bash
npx tsc --noEmit
npx vitest run
```

Apply / repair local DB (from repo root, with Supabase CLI linked):

```bash
supabase migration up
# or full reset (destructive):
# supabase db reset
```

If the project defines a lint script and it is fast enough for touched files, run it after UI changes.
