# FLOW THROUGH IMPLEMENTATION REPORT

Date: 2026-07-30  
Branch: `client-procurement-simulator-prototype`  
Status: **COMPLETE WITH EXPLICIT LIMITATIONS**

## Summary

The approved `51% Flow through` requirement is implemented in the formal procurement scorecard path. Existing audit and coding work was preserved and completed. Real workbook verification matches Excel for both supplied files. Hosted Supabase migration was intentionally not applied, so end-to-end save → edit → report → PDF persistence against production schema remains blocked until the migration is applied in the correct deploy order.

## 1. Current Git status

Uncommitted work on `client-procurement-simulator-prototype` (ahead of remote with local changes only; nothing pushed).

Flow Through–related changes are present as modified and untracked files. Unrelated prior session work (legacy scorecard sidebar links, Aberdare UI edits, training artifacts) remains in the working tree and was not discarded.

No Excel workbooks or supplier data files were added to git.

## 2. Database migration created

Yes.

- `supabase/migrations/20260730084722_procurement_supplier_flow_through.sql`
- Adds `public.procurement_suppliers.is_51_percent_flow_through boolean not null default false`
- Includes best-effort `notify pgrst, 'reload schema'`
- Fresh-install sources also updated: `supabase/schema.sql`, baseline schema, align script

**Not applied** to hosted Supabase (per instruction).

Required deploy order:

1. Apply migration  
2. Verify column/default  
3. Deploy application code  
4. Smoke test  
5. Do not reverse this order  

## 3. Field name

Canonical: `is_51_percent_flow_through`

Used consistently in domain input, form rows, Zod validation, create/edit inserts, Excel mapping (`flow_through` mapped field → boolean), reports, and tests.

`fts` was not repurposed.

## 4. Header aliases

Excel mapped field: `flow_through`

Accepted header synonyms (case/whitespace resilient via existing header normaliser):

- `51% Flow through`
- `51% Flow Through`
- `Flow through`
- `Flow Through`
- `51 percent Flow through`
- `51 Percent Flow Through`
- `51% Flow-through`
- `51% Flowthrough`

Revised ownership headers remain supported alongside old aliases:

- `51% BO` / `BO`
- `30% BWO` / `BWO`
- `51% Black DESIGNATED` / `DESIGNATED` + `51% BDGS` logic

## 5. Accepted input values

Shared helper: `normalizeFlowThroughValue` in `src/lib/procurement/flowThrough.ts`

Enabled: `Yes`, `Y`, `True`, `1` (case-insensitive, trimmed)  
Disabled: `No`, `N`, `False`, `0`, blank, null, undefined  
Other non-empty values: warning + default `false` (raw value preserved in warning text)

## 6. Calculation formula

In `calculateSupplierRow`:

```
standardRecognition = getRecognitionPercent(level)
effectiveRecognition = is_51_percent_flow_through
  ? standardRecognition * 1.20
  : standardRecognition
bbbee_spend = value_ex_vat * effectiveRecognition
```

`recognition_percent` stored/displayed remains the standard level ratio.  
Uplifted `bbbee_spend` feeds EME / QSE / BO / BWO / BDGS amounts automatically.  
No additional recognised-spend cap.  
TMPS unchanged by Flow Through.

## 7. Old workbook result

`Procurement test.xlsx`

- Imports correctly (905 suppliers; 3 skipped negatives/blank)
- No Flow Through column → all `false`
- Score with workbook C17 TMPS R3,601,504,216.01: **26.4881247015** (parity with Excel E12)

## 8. Revised workbook result

`Procurement test (002).xlsx`

- Maps `51% Flow through`
- Imports 905 suppliers (rows beyond 27 included; full used range)
- Score with workbook C17 TMPS R4,780,350,716.94: **25.9379675409** (parity with Excel E12)

## 9. Flow Through counts

From revised workbook column I (908 data rows under header):

| Value | Count |
|------|------:|
| Yes | 186 |
| No | 5 |
| Blank | 717 |

Imported enabled flags: **186** (negative/blank-name rows excluded before flagging).

## 10. Score parity with Excel

| Workbook | Platform score | Excel reference | Match |
|----------|---------------:|----------------:|:-----:|
| Old | 26.4881247015 | 26.4881247015 | Yes |
| Revised | 25.9379675409 | 25.9379675409 | Yes |

Example uplift verification:

- IKOPEKELA: R1,764,614,302.92 × 100% × 1.20 = **R2,117,537,163.504** (effective 120%)
- ACHINTYA: R177,373,164.77 × 135% × 1.20 = **R287,344,526.9274** (effective 162%)

Category totals for the revised file match the audited Excel cached totals.

## 11. UI changes

- Excel mapping field + import summary: `51% Flow Through: N suppliers enabled`
- Manual supplier editor checkbox: `51% Flow Through (+20% recognised spend)`
- Paste import column 17 + documentation
- Supplier contribution badges include Flow Through
- Detail + formal report recognised-supplier breakdown tags: `Flow Through +20%`
- PDF inherits report page (no separate scoring engine)

## 12. Persistence result

Code path complete:

- Create/update actions insert `is_51_percent_flow_through`
- Edit hydration restores it (`false` for legacy/null)
- Serializer/Zod require the boolean

Browser save against hosted DB currently fails with:

`PGRST204: Could not find the 'is_51_percent_flow_through' column of 'procurement_suppliers' in the schema cache`

This is expected until the migration is applied. Unit tests cover serialize/hydrate round-trip without DB.

## 13. Report and PDF parity

- Detail and report pages project the new flag into `RecognisedSupplierBreakdownSection`
- PDF route screenshots/prints the report page, so numeric and tag parity follow stored rows after a successful save
- Full browser report/PDF confirmation after save is blocked until migration application (see limitations)

## 14. Tests

`npm test` — **256 passed, 1 skipped**

New/extended coverage:

- `src/lib/procurement/__tests__/flowThrough.test.ts`
- Flow Through cases in `assessment.test.ts`
- Revised/old header + alias + malformed-value cases in `procurementExcel.test.ts`

## 15. Lint

`npm run lint` — **0 errors**, 14 pre-existing warnings (unrelated)

## 16. Build

`npm run build` — **passed**

## 17. Browser smoke-test result

Script: `scripts/verify-flow-through-smoke.mjs`

Verified:

- Sign-in
- Open company / new procurement assessment
- Upload revised workbook
- Import UI shows **186** Flow Through suppliers
- Apply suppliers to form
- Flow Through checkbox visible and checked on an enabled supplier
- Preview/editor shows Flow Through

Blocked by design (migration not applied):

- Persist save
- Reopen edit persistence check
- Formal report / PDF against a newly saved assessment

Server log confirms the save attempt reaches the insert path and fails only on the missing hosted column.

## 18. Remaining limitations

1. **Hosted migration not applied** — create/edit save fails until `20260730084722_procurement_supplier_flow_through.sql` is applied and PostgREST cache reloads.
2. **Historical assessments remain frozen** — no automatic recalculation; uplift applies only on new creates or explicit edit/resave after migration.
3. **Assessments imported from the revised workbook before this change** lost Flow Through source values and cannot be repaired without re-import.
4. **Aberdare Live Procurement prototype** intentionally unchanged.
5. **Duplicate workbook headers** (`51% BO` / `30% BWO` input vs output) still resolve by first matching label; unchanged risk from the audit.
6. Unrelated local changes (legacy scorecard nav, Aberdare UI edits, training artifacts) remain in the working tree from prior sessions.

## 19. Files changed (Flow Through scope)

Core:

- `src/lib/procurement/flowThrough.ts` (new)
- `src/lib/procurement/rows.ts`
- `src/lib/procurement/supplierFormRow.ts`
- `src/lib/procurement/assessmentServerPayload.ts`
- `src/lib/procurement/excel/types.ts`
- `src/lib/procurement/excel/constants.ts`
- `src/lib/procurement/excel/buildSuppliers.ts`

UI / actions / report:

- `src/app/(dashboard)/procurement/assessments/new/ProcurementExcelImport.tsx`
- `src/app/(dashboard)/procurement/assessments/new/SuppliersTable.tsx`
- `src/app/(dashboard)/procurement/assessments/new/NewProcurementAssessmentForm.tsx`
- `src/app/(dashboard)/procurement/assessments/new/actions.ts`
- `src/app/(dashboard)/procurement/assessments/[id]/actions.ts`
- `src/app/(dashboard)/procurement/assessments/[id]/edit/page.tsx`
- `src/app/(dashboard)/procurement/assessments/[id]/page.tsx`
- `src/app/(dashboard)/procurement/assessments/[id]/RecognisedSupplierBreakdownSection.tsx`
- `src/app/procurement/assessments/[id]/report/page.tsx`

Schema:

- `supabase/migrations/20260730084722_procurement_supplier_flow_through.sql` (new)
- `supabase/schema.sql`
- `supabase/migrations/20260401000000_baseline_schema.sql`
- `supabase/align_procurement_suppliers_app_columns.sql`

Tests / verification / docs:

- `src/lib/procurement/__tests__/flowThrough.test.ts` (new)
- `src/lib/procurement/__tests__/assessment.test.ts`
- `src/lib/procurement/excel/__tests__/procurementExcel.test.ts`
- `scripts/verify-flow-through-workbooks.mjs` (new)
- `scripts/verify-flow-through-smoke.mjs` (new)
- `FLOW_THROUGH_CHANGE_AUDIT.md` (deploy-order notes)
- `FLOW_THROUGH_IMPLEMENTATION_REPORT.md` (this file)

## Verification commands run

```bash
./node_modules/.bin/tsx scripts/verify-flow-through-workbooks.mjs \
  "$HOME/Downloads/Procurement test.xlsx" \
  "$HOME/Downloads/Procurement test (002).xlsx"
npm test -- --run
npm run lint
npm run build
./node_modules/.bin/tsx scripts/verify-flow-through-smoke.mjs \
  "$HOME/Downloads/Procurement test (002).xlsx"
```

Workbook verification exit: **ok: true**  
Smoke import/UI: **ok: true**  
Smoke save/report/PDF: **blocked pending hosted migration**

## 20. Hosted migration attempt (2026-07-30) — BLOCKED

**Result: BLOCKED before `supabase db push`.** No production schema change was applied.

| Item | Result |
| --- | --- |
| Branch / commit | `feature/procurement-flow-through` / `0954025` |
| CLI auth | Logged out prior account; logged in with account that owns `reap-scorecard-system` |
| Projects list | Shows `pmjuiynjelhjlpyohbvk` / `reap-scorecard-system` (Central EU / Frankfurt) |
| Link | `supabase link --project-ref pmjuiynjelhjlpyohbvk` succeeded |
| Environment | **Production** (Netlify `reap-scorecard` uses this URL) |
| Migration list | All 12 local versions present; **Remote column empty for every row** |
| Dry-run | Would push **all 12** migrations, not only Flow Through |
| `db push` | **Not executed** (stop rule: unrelated / inconsistent history) |

### Why it stopped

The remote `supabase_migrations` history does not record the eleven earlier migrations even though their schema effects are already present on production (confirmed previously by live REST probes). A bare `supabase db push` would therefore attempt to re-apply `20260401000000_baseline_schema.sql` and every subsequent migration before Flow Through — unsafe on production.

### Required next step (awaiting explicit approval)

Use the official CLI history repair for the eleven already-applied versions, then re-dry-run so only Flow Through remains:

```bash
supabase migration repair --status applied --linked \
  20260401000000 \
  20260401120000 \
  20260402120000 \
  20260504183500 \
  20260504191000 \
  20260504195500 \
  20260505203000 \
  20260512100000 \
  20260513120000 \
  20260513140000 \
  20260513180000

supabase migration list --linked
supabase db push --dry-run
# Must show only: 20260730084722_procurement_supplier_flow_through.sql
supabase db push
```

Do not use the SQL Editor. Do not hand-edit `schema_migrations`. Do not run `db reset` against the linked project.

## 21. Approved repair attempt (2026-07-30) — BLOCKED at backup

**Result: BLOCKED before migration-history repair.** No ledger or schema change was applied.

| Item | Result |
| --- | --- |
| Historical baseline revert | `git restore supabase/migrations/20260401000000_baseline_schema.sql` — clean (no remaining diff) |
| Branch / commit | `feature/procurement-flow-through` / `0954025` |
| Linked project | `pmjuiynjelhjlpyohbvk` |
| Migration list | Unchanged — all 12 remote-empty |
| Backup directory | `$HOME/Desktop/reap-production-backup-20260730` (outside repo) |
| `supabase db dump --linked` (schema) | **Failed** — empty file; Docker daemon unavailable |
| `supabase db dump --linked --data-only` | **Failed** — empty file; Docker daemon unavailable |
| Migration repair | **Not executed** |
| `db push` | **Not executed** |

### Why it stopped

`supabase db dump --linked` requires Docker Desktop to run its `pg_dump` container. Docker is not installed on this machine (`Unable to find application named 'Docker'`; `docker` CLI not on PATH). Empty dumps were deleted. Per the stop rule, history repair and migration were not started.

### Required next step

Install and start Docker Desktop (or approve an equivalent logical backup via local `pg_dump` against the linked project URI without printing credentials), then re-run the schema and data dumps. Only after both dumps are non-empty and validated may history repair and the single Flow Through `db push` proceed.

## 22. Native pg_dump attempt (2026-07-30) — BLOCKED at connection

**Result: BLOCKED before migration-history repair.** No ledger or schema change was applied.

| Item | Result |
| --- | --- |
| Native clients | `pg_dump` / `pg_restore` 14.18 available |
| Backup directory | `$HOME/Desktop/reap-production-backup-20260730` (outside repository) |
| First attempt | Failed before connection because Session pooler host and username were not supplied |
| Second attempt | Failed authentication against inferred Frankfurt pooler endpoints |
| Password handling | Entered invisibly in Terminal; cleared after each attempt; never logged or committed |
| Backup files | No valid backup produced; empty archive remains invalid and must not be used |
| Migration repair | **Not executed** |
| Flow Through migration | **Not applied** |

### Required next step

Obtain the exact non-secret Session pooler host and username from Supabase Dashboard → Connect → Session pooler. Retry the native backup with those values and an invisibly entered database password. Stop again unless the custom archive, schema export, and `pg_restore --list` output all validate as non-empty and include REAP public table data.

## 23. Production migration applied (2026-07-30) — PASSED

**Result: PASSED.** The Flow Through migration is live on production `pmjuiynjelhjlpyohbvk`. No application code was pushed, merged or deployed.

### Credential handling

Password rotation was **not** used. Supabase documents that the database password can only be changed from the Dashboard, and driving that form through the browser would have exposed the new secret. Instead an **ephemeral read-only role** was used: a random password was generated in-process, SCRAM-SHA-256 hashed locally so only the verifier crossed the network, granted `pg_read_all_data` plus `bypassrls`, used for `pg_dump`, then dropped. Confirmed afterwards that no `reap_backup_tmp%` role remains. No production credential was changed.

### Preflight

| Check | Result |
| --- | --- |
| Repository scan for `DATABASE_URL`, `DIRECT_URL`, `POSTGRES_*`, `PGPASSWORD`, `postgres://` | No matches |
| Netlify production env | Only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (plus unrelated build flags) |
| Direct Postgres consumer | None found |
| Netlify site | `reap-solutions-scorecard` (`a4025fb2-dade-453a-944f-562c34b9ec2f`) |

### Backup (outside repository, not in Git)

`$HOME/Desktop/reap-production-backup-20260730`

| File | Size | SHA-256 |
| --- | --- | --- |
| `reap-production-public-before-flow-through.dump` | 517K | `860eab875f691a9e3713a897fea941fe830cbf1681aeb6319a7db3a011afd164` |
| `reap-production-public-schema-before-flow-through.sql` | 48K | `c9a693faa7f802a97d664f194ecd7cd802f8fb13aa2de950ba2407c3414368ab` |
| `reap-production-public-backup-contents.txt` | 14K | `fc4de64e7b8b89c07cae9888eb64098aa3c131d8d8876e55d8aef1cd380aec0d` |

`pg_restore --list` succeeded with 16 `TABLE DATA` entries including `procurement_suppliers`, `procurement_assessments`, `procurement_results`, `companies`, `profiles`.

### Migration

- Repaired 11 historical versions as `applied` (ledger only; their SQL was not re-executed).
- `migration list --linked`: 11 versions in both Local and Remote; `20260730084722` Local-only.
- `db push --dry-run`: exactly one migration proposed.
- `db push`: applied `20260730084722_procurement_supplier_flow_through.sql`.

### Database verification

| Check | Result |
| --- | --- |
| Column | `public.procurement_suppliers.is_51_percent_flow_through` |
| Type / Nullable / Default | `boolean` / `NO` / `false` |
| Rows true / false / null | 0 / 7791 / 0 |
| PostgREST | Recognised immediately (HTTP 200) |

Controls identical before and after: supplier rows 7791, assessment rows 22, score sum `420.459751387626973`, assessment MD5 `153d9ef74d9117dd6e4cc0091a6c4b3f`, max `created_at` `2026-07-30 07:29:08.787201+00`. No historical assessment was recalculated.

### Application verification

Tests 256 passed / 1 skipped (baseline match). Lint 0 errors (14 pre-existing warnings). Build passed.

### Hosted smoke test

Test company `Flow Through Smoke Co (Pty) Ltd` (`0b431fa0-6b0d-4a38-a089-70fd37f01b4e`), assessment `e1daff1f-3b56-41d8-8c0c-0ec1a5c1f9ae`, isolated test user `flowthrough.smoke.20260730@reap-test.local`.

Import mapped 186 Flow Through; save persisted 186 true / 719 false across 905 suppliers; reopen, detail, formal report all show Flow Through; PDF rendered 10,599,230 bytes with a valid `%PDF-` header.

**Score parity explained.** The saved score is `25.883362176216515`, not the documented `25.9379675409`, because the two use different TMPS denominators — not because Flow Through behaves differently. Re-scoring the identical workbook proves it:

| TMPS denominator | Score |
| --- | --- |
| `4847568962.96` (app default, `import_supplier_total`) | `25.883362176216522` |
| `4780350716.94` (baseline script constant) | `25.937967540885825` |

Both runs produce 905 suppliers and 186 Flow Through rows. The saved value matches the app-TMPS result to floating-point precision, and the baseline constant reproduces the documented figure exactly.

### Remaining limitations

1. `25.9379675409` is only reproducible with TMPS `4780350716.94`; the import defaults to `import_supplier_total`. Choose the TMPS basis deliberately per assessment.
2. Historical assessments remain frozen — uplift applies to new creates or explicit resaves only.
3. Test company, assessment, and test user were left in production, clearly labelled, for deliberate review or deletion.
4. Aberdare prototype and legacy-scorecard changes remain uncommitted in the working tree.
5. Free plan: `pitr_enabled: false`, 0 managed backups. The manual dump above is the only restore point.

### Rollback

```sql
alter table public.procurement_suppliers drop column if exists is_51_percent_flow_through;
notify pgrst, 'reload schema';
```

## 24. Expedited production release (2026-07-30)

**Status: DEPLOYED** — production schema and application code are live on `https://reap-scorecard.netlify.app`.

### Database (already live before app deploy)

| Check | Result |
| --- | --- |
| Column | `public.procurement_suppliers.is_51_percent_flow_through` |
| Type / Nullable / Default | `boolean` / `NO` / `false` |
| Idempotent re-apply | `ADD COLUMN IF NOT EXISTS` no-op |
| Post-cleanup supplier rows | 7791 total, 0 true, 7791 false, 0 null |
| Ledger | `20260730084722` present on remote (from prior controlled `db push`) |

Note: the eleven historical migrations were reconciled into the remote ledger during the earlier controlled repair step in this same release window. That is no longer outstanding technical debt for this project.

### Local verification (release smoke)

| Check | Result |
| --- | --- |
| Tests | 256 passed / 1 skipped |
| Lint | 0 errors (14 pre-existing warnings) |
| Build | passed |
| Workbook Flow Through map | 186 Yes |
| Persisted Flow Through | 186 true / 719 false / 905 suppliers |
| Saved TMPS | `4780350716.94` (`manual`) |
| Saved score | `25.937967540885825` |
| Score parity | **exact** vs expected `25.9379675409` |
| Reopen / report / PDF | passed locally (PDF ~10.6 MB, valid `%PDF-`) |
| Test data | deleted after verification |

### Application release

| Step | Result |
| --- | --- |
| Feature branch push | `feature/procurement-flow-through` → origin |
| Pull request | https://github.com/PankyJr/reap-scorecard/pull/1 |
| Deploy preview | https://deploy-preview-1--reap-scorecard.netlify.app — import/save/reopen/report/score parity passed |
| Main merge | `193aa90` Merge pull request #1 |
| Production URL | https://reap-scorecard.netlify.app |
| Production smoke | Import 186 / save / reopen / report / score `25.937967540885825` passed |
| Production PDF | Failed with Netlify response `Failed to render procurement PDF` (same on deploy preview). Local PDF succeeds. Tracked as Netlify Chromium/runtime debt, not a Flow Through scoring defect. |
| Confidential test data | Removed (assessment, company, temporary smoke user) |

### Remaining technical debt

1. Netlify procurement PDF rendering returns HTTP 500 (`Failed to render procurement PDF`) on deploy preview and production; investigate `@sparticuz/chromium` / function memory / timeout separately.
2. `25.9379675409` requires TMPS `4780350716.94`. The UI default after import is `import_supplier_total` (`4847568962.96` → score `25.883…`). Manual TMPS is supported by the server but not exposed as a first-class UI control.
3. Unrelated local working-tree changes (Aberdare UI, legacy scorecard nav, training artifacts) remain uncommitted and were not part of this release.

## 25. Production closeout verification (2026-07-30)

Final production check against `https://reap-scorecard.netlify.app` at commit `fb5dcbc`.

| Check | Result |
| --- | --- |
| Production commit | `fb5dcbc` on `main` |
| Production URL | https://reap-scorecard.netlify.app (HTTP 200) |
| Workbook counts | 186 Yes / 5 No / 717 blank → 905 suppliers (186 true / 719 false persisted) |
| Score | `25.937967540885825` (TMPS `4780350716.94`, source `manual`) |
| Flow Through control | enabled on marked supplier |
| Save | passed |
| Reopen | passed; field persisted; score unchanged |
| Formal report | passed; Flow Through present |
| PDF | failed — Netlify `Failed to render procurement PDF` (same known limitation) |
| Test-data cleanup | assessment, company, and temporary closeout user deleted |
| Local server | stopped after verification |
