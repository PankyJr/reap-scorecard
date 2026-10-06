# Management Control Book2 Import Report

**Date:** 2026-07-31  
**Branch:** `feature/full-scorecard-calculator`  
**Scope:** Privacy-safe Board / Executive Committee register import only. No Management Control points are calculated.

---

## 1. Original workbook location

`/Users/pankymbhalati/Downloads/Book2.xlsx`

Local ignored copy used for verification:

`tmp/full-scorecard-reference/Book2.xlsx`

The original Downloads file was not moved or deleted. The workbook was not committed.

## 2. Workbook checksum

SHA-256:

`d4cc17fc6fd24f7e2bd65cc5e86fc4c10e28583a4a18855623cef5c47acb525a`

## 3. Sheets detected

| Workbook sheet name (raw) | Canonical match |
|---|---|
| `3 Board Members ` (trailing space) | `3 Board Members` |
| `4 Executive Committe ` (trailing space + misspelling) | `4 Executive Committe` |

Combined import sheet label:

`3 Board Members + 4 Executive Committe`

## 4. Header mappings

### Board Members

| Logical field | Source header |
|---|---|
| Role category | Executive/ Non Executive/ Independent Non Executive |
| Gender | Gender |
| Race | Race |
| Nationality | Nationality |
| Position provided (boolean only) | Position |
| Resignation recorded (boolean only) | Resignation Date |

Name and identity-number columns are detected for presence validation only and are **not** persisted in `detectedHeaders` or row values.

### Executive Committee

| Logical field | Source header |
|---|---|
| Role category | Executive Director / Executive Manager |
| Gender | Gender |
| Race | Race |
| Nationality | Nationality |
| Position provided (boolean only) | Position/ Designation |

## 5. Board row count

**7** valid board register rows.

## 6. Executive Committee row count

**8** valid executive committee register rows.

## 7. Total imported rows

**15** total / **15** valid / **0** warnings / **0** rejected.

Blank rows are ignored. Optional blank position and resignation fields are accepted as absence flags (`positionProvided`, `resignationRecorded`).

## 8. Normalisation behaviour

Persisted demographic and role values are canonicalised:

| Field | Behaviour |
|---|---|
| Role | `Non executive` → `Non Executive`; `Executive Director`; `Executive Manager`; `Independent Non Executive` |
| Gender | `Male` / `Female` |
| Race | `African` / `Coloured` / `Indian` / `White` |
| Nationality | `South african` / `South Africa` / `RSA` → `South African` |

Whitespace and slash spacing are cleaned before matching.

## 9. Validation behaviour

A row is **rejected** when name presence, role category, gender, race or nationality is missing.

A row is **warning** when gender or race falls outside the known closed sets.

A row is **valid** when required fields are present and demographic values are recognised.

No points, targets or weightings are derived from these rows.

## 10. Sensitive-data handling

Not persisted in the import snapshot, UI preview, notes or verification output:

- Person names
- Identity numbers
- Exact position / designation text
- Resignation dates

Only presence flags are stored for position and resignation.

Synthetic fixtures in tests use neutral labels (`Person 001`, `REDACTED`) and assert that those values never appear in persisted rows.

## 11. Preview whitelist

Management Control preview columns:

- Source sheet
- Source row
- Status
- Register
- Role category
- Gender
- Race
- Nationality
- Position provided
- Resignation recorded
- Messages

Raw `JSON.stringify(row.values)` is not used for Management Control.

## 12. Import-version persistence

Importer version:

`management-control-register-import-v1`

Stored on the preview as `importVersion` and recorded in import notes.

## 13. Save and reopen result

Verified via JSONB-style snapshot roundtrip (no Supabase writes):

- Save succeeds conceptually by serialising `import_snapshot`
- Reopen restores sheet label, row counts, source metadata and import version
- Local verification artefact: `tmp/full-scorecard-reference/book2-import-verification.json` (ignored)

Live browser create/upload against production or staging databases was not executed, because local env points at production and this task forbids modifying production or staging Supabase.

## 14. Element status

Unscored Management Control uploads with rows remain:

`needs_review`

They are never marked `ready_to_calculate` while `scoringReady = false`.

## 15. Calculation-run prevention

- UI replaces Calculate with: **Import review only — scoring unavailable**
- Server action `calculateElement` redirects when `!adapter.scoringReady`
- No calculation run is created for Book2 register imports

## 16. Tests

`npm test`

- **289 passed**
- **1 skipped**

Includes dedicated Book2 register importer coverage for:

- both sheets / trailing spaces / misspelling
- identifier exclusion
- incomplete rows
- blank rows and warning demographics
- value normalisation
- unscored upload / calculate guards

## 17. Lint

`npm run lint`

- **0 errors**
- 14 pre-existing warnings unrelated to this change

## 18. Build

`npm run build`

- Passed

## 19. Remaining Management Control inputs required

Verified calculation rules are still required before points can be produced. Still outstanding:

- Confirmed target / weighting / available-points mapping for modular calculator MC scoring
- Employment Equity band registers beyond Board and Executive Committee, if required for modular MC
- Explicit EAP target binding workflow for modular MC scoring
- Any REAP-approved formula beyond the existing full-scorecard engine path

Until those are confirmed, Management Control remains import/validation only.

## 20. Files changed

- `src/lib/scorecard/calculator/elements/management-control/import.ts`
- `src/lib/scorecard/calculator/elements/management-control/adapter.ts`
- `src/lib/scorecard/calculator/types.ts`
- `src/app/(dashboard)/scorecards/calculator/actions.ts`
- `src/app/(dashboard)/scorecards/calculator/[assessmentId]/elements/[elementKey]/page.tsx`
- `src/lib/scorecard/calculator/__tests__/management-control-register-import.test.ts`
- `scripts/verify-book2-management-control-import.mjs`
- `MANAGEMENT_CONTROL_BOOK2_IMPORT_REPORT.md`
