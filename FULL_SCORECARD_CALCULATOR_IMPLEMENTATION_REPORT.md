# Full Scorecard Calculator — Implementation Report

**Date:** 2026-07-30  
**Branch:** `feature/full-scorecard-calculator`  
**Status:** COMPLETE WITH EXPLICIT LIMITATIONS  
**Production DB / push / deploy:** not performed  
**Staging:** `REAP Scorecard Staging` (`jzvqyryblsfxlinvoiuf`, eu-central-1) — migrations applied; SED persistence E2E passed; Netlify site `reap-scorecard-staging`

---

## 1. Existing architecture discovered

See `FULL_SCORECARD_CALCULATOR_AUDIT.md`.

Two systems:

1. **Legacy manual scorecards** — category points in `scorecards` / `scorecard_inputs` / `scorecard_results`
2. **Full workbook engine** — multi-sheet import + proportional scoring (`full-v0-scaffold`)

Book1.xlsx is a **beneficiary line-item SED** template, distinct from the engine’s summary compliance-row layout.

---

## 2. Reused components and engine modules

- `calculateProportionalPoints` / `safe-math`
- SED available points `5` from `indicator-config.ts` (`sed.annual_spend`)
- Target suggestion `0.01` from existing SED engine test fixtures
- Company ownership RLS pattern
- `requireReapInternalAdmin` for EAP admin
- Printable HTML report pattern (browser Print / Save as PDF)
- Existing `/scorecards/full/*` left intact
- Flow Through procurement code untouched

---

## 3. Legacy-scorecard handling

- Primary create path is now **Full Scorecard Calculator** at `/scorecards/new`
- Legacy manual entry remains at `/scorecards/new?legacy=1`, labelled **Legacy Manual Scorecards** / **Manual Scorecards**
- Legacy detail routes `/scorecards/[id]` unchanged
- No redirect of historical legacy records into the calculator

---

## 4. New calculator architecture

Modular adapters under `src/lib/scorecard/calculator/`:

| Key | Name | Scoring |
|---|---|---|
| `socio_economic_development` | SED | Ready (`sed-beneficiary-v1`) |
| `enterprise_development` | ED | Scaffold |
| `supplier_development` | Supplier Development | Scaffold (not Skills) |
| `management_control` | MC | Scaffold + EAP binding |

UI routes:

- `/scorecards/new` — create Scorecard Assessment
- `/scorecards/calculator/[assessmentId]` — workspace
- `/scorecards/calculator/[assessmentId]/elements/[elementKey]` — element upload/calculate
- `/scorecards/calculator/[assessmentId]/report` — printable report
- `/settings/eap-targets` — admin EAP sets

---

## 5. Selected-element workflow

Scope modes: `full` | `single` | `selected`.

Users may create SED-only, MC-only, ED-only, Supplier-Development-only, or multi-element assessments.

Honesty messaging: never shows a complete B-BBEE level for modular calculator scopes (even “full available” excludes Ownership / Skills / Preferential Procurement).

---

## 6. SED importer

Header-based import (`importSedBeneficiaryWorkbook`):

- Detects `SED` sheet / socio-economic title
- Maps aliases for beneficiary / claimed / recognised / notes
- Ignores title row, blanks, Total row
- Recalculates platform total from valid rows
- Preserves source row numbers and notes
- Claimed preserved as optional raw; **not used in scoring**

---

## 7. SED calculation

Rule `sed-beneficiary-v1`:

1. `totalRecognised = Σ valid recognised amounts`
2. `percentage = totalRecognised / NPAT` (contextual input)
3. `points = min(percentage/target, 1) × availablePoints` via existing engine math
4. Defaults: availablePoints=5; suggested target=0.01 (confirm per entity)

Without NPAT/target: amount imported, points not scored (warnings shown).

---

## 8–10. ED / Supplier Development / Management Control

Architecture, upload scaffolding, header detection, and validation messaging are in place.

**Not claimed complete for production scoring** — require verified REAP element templates. Existing full-scorecard workbook engine remains the verified path for ED/Supplier Development/MC metric scoring.

MC demographic bands for EAP match verified engine keys (`black_people` / `black_women`; disabilities = `black_people` only).

---

## 11. EAP target management

- Tables: `eap_target_sets`, `eap_target_set_values`, `eap_target_set_audit`
- Admin UI: create draft, edit matrix, activate, duplicate year, audit trail
- Writes via service role after `requireReapInternalAdmin`
- Authenticated users: select-only RLS (no insert/update policies)
- Assessment can store `eap_target_snapshot` so later target edits do not silently change history
- Annual EAP % never hardcoded in scoring source

---

## 12–13. Data model & migrations

Additive migration only:

`supabase/migrations/20260730140000_full_scorecard_calculator.sql`

Tables: `scorecard_assessments`, `scorecard_assessment_elements`, `scorecard_calculation_runs`, EAP tables.

**Not applied to production.** No `supabase db push` run.

### Controlled application procedure (later)

1. Backup production
2. Review migration on staging / local Docker Supabase
3. Apply via approved change window (Management API or repaired CLI history)
4. Verify RLS with owner and non-owner accounts
5. Smoke create → upload SED → calculate → reopen → report

---

## 14. Security and RLS

- Assessment CRUD: company `owner_id = auth.uid()`
- EAP writes: internal admin + service role only
- Upload size cap 8 MB; filename sanitised
- Formula cells treated as data via SheetJS raw values (not executed)
- No service-role key in browser
- Original workbook bytes not logged

---

## 15. Reporting

Print-friendly HTML at `/scorecards/calculator/[assessmentId]/report` with Print / Save as PDF.

Server Chromium PDF **not** claimed fixed for this release.

---

## 16. Automated tests

`src/lib/scorecard/calculator/__tests__/*`

Covers SED import cases, aliases, totals, negatives, scope honesty, EAP validation, admin gate contracts.

`npm test`: **272 passed**, 1 skipped (includes Flow Through regression).

---

## 17. Real-workbook verification

`./node_modules/.bin/tsx scripts/verify-full-scorecard-book1.ts`

Against ignored `tmp/full-scorecard-reference/Book1.xlsx`:

| Check | Result |
|---|---|
| Detected sheet | SED |
| Valid rows | 3 |
| Platform total | R420,000 |
| Workbook total | R420,000 |
| Totals match | yes |

Beneficiary names not committed.

---

## 18–19. Lint & build

- `npm run lint`: 0 errors (pre-existing warnings only)
- `npm run build`: **passed** (calculator routes present)

---

## 20. Browser smoke test

Against local `next start` pointing at existing auth session:

| Step | Result |
|---|---|
| Sidebar “New Scorecard Calculation” | Pass |
| Company select | Pass |
| Scope cards + SED/ED/Supplier Dev/MC | Pass |
| Partial-score honesty copy | Pass |
| Legacy Manual Scorecards link | Pass |
| EAP targets as internal admin | UI loads |
| Persist upload/calculate/reopen | **Blocked** — migration not applied to remote DB; no local Docker Supabase |
| Create assessment against production tables | **Not attempted** (would fail / must not mutate prod schema) |

---

## 21. Remaining business-rule questions

1. Exact meaning/data type of SED **Claimed** column
2. Confirm SED target % per measured entity/sector (1% suggested from engine fixtures only)
3. Provide verified ED / Supplier Development / MC modular upload templates
4. Confirm when modular “full available” may show a B-BBEE level (after Ownership/Skills/Procurement adapters exist)

---

## 22. Remaining implementation limitations

- ED / Supplier Development / MC modular scoring not production-complete
- Persistence requires migration application (local first)
- No end-to-end DB smoke for save/reopen in this task
- Chromium PDF generation still a known Netlify limitation
- Aberdare / Flow Through intentionally untouched

---

## 23. Files changed (calculator scope)

**Docs**

- `FULL_SCORECARD_CALCULATOR_AUDIT.md`
- `FULL_SCORECARD_CALCULATOR_IMPLEMENTATION_REPORT.md`

**Core**

- `src/lib/scorecard/calculator/**`
- `src/app/(dashboard)/scorecards/calculator/**`
- `src/app/(dashboard)/scorecards/new/page.tsx`
- `src/app/(dashboard)/scorecards/new/FullScorecardCalculatorNewForm.tsx`
- `src/app/(dashboard)/settings/eap-targets/**`
- `src/components/layout/Sidebar.tsx`
- `src/components/scorecards/PrintReportButton.tsx`
- `src/app/(dashboard)/companies/[id]/page.tsx`
- `supabase/migrations/20260730140000_full_scorecard_calculator.sql`
- `scripts/verify-full-scorecard-book1.{mjs,ts}`
- `.gitignore` (`tmp/`)

Synthetic fixture: `src/lib/scorecard/calculator/fixtures/sed-beneficiaries-synthetic.xlsx`

---

## 24. Recommended deployment sequence

1. Review + merge branch after product sign-off on limitations  
2. Apply migration on staging / local Docker  
3. Run Book1 + UI save/reopen smoke on staging  
4. Apply migration to production under change control  
5. Deploy Netlify build  
6. Do **not** claim ED/MC/Supplier Development scoring complete until templates verified  
7. Separately track Chromium PDF fix
