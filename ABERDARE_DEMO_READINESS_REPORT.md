# Aberdare Demo Readiness Report

**Date:** 15 July 2026  
**Branch:** `client-procurement-simulator-prototype`  
**Client:** Aberdare Cables (Pty) Ltd  

## Final readiness status

**READY WITH EXPLICIT LIMITATIONS**

The Aberdare client workspace is ready for tomorrow’s discovery meeting. It demonstrates upload → review → scenario testing on the real spend report, using REAP’s existing procurement calculation service. Provisional import treatment and Code 400 formatting remain explicitly open for client confirmation.

## Route

| Surface | URL |
|---------|-----|
| Workspace landing | `/clients/aberdare/procurement-control-preview` |
| Live Procurement | `/clients/aberdare/procurement-control-preview/live` |
| Formal Assessment (existing) | `/procurement/assessments/new` |

- Direct-access only  
- Not linked from production Sidebar  
- `robots: noindex`  
- Outside `(dashboard)` shell  

## Workbook parsing result

Local verification against `client-inputs/aberdare/BBBEE Spend Report.xlsx`:

| Check | Result |
|-------|--------|
| Parse | Pass |
| Supplier rows | **940** |
| Aggregate row excluded | Pass |
| Source spend | **R5,377,124,451.21** |
| Import = Y rows | **33** |
| Import = Y spend | **R596,773,734.27** |
| Import Spend Exempt Value | **R499,962,148.65** |
| Local Spend Exempt Val | **R19,912,247.73** |
| Negative lines | **2 / ≈ -R67,218,246.02** |
| Level 6 remains valid | Pass (10 suppliers) |
| Reconciliation mismatches | None |

Command:

```bash
node scripts/verify-aberdare-workbook.mjs
```

## Supplier count

**940** (totals row not imported as a supplier)

## Source total

**R 5,377,124,451.21**

## Imported-row count and spend

**33** rows · **R 596,773,734.27**

## Import-exempt report total

**R 499,962,148.65**

Difference vs imported supplier spend: **≈ R96.8m** (shown in Review import details — requires Aberdare confirmation)

## Current provisional calculation result

Using shared REAP engine with provisional Import=Y exclusion:

| Metric | Value |
|--------|-------|
| Current procurement points (displayed) | **27.05 / 29.00** |
| Eligible provisional spend (TMPS) | **R 4,847,568,962.96** |
| Recognised B-BBEE spend | **R 3,797,470,812.35** |
| Imported spend (tracked / excluded) | **R 596,773,734.27** |

### Eligible TMPS reconciliation (numerical consistency pass)

| Step | Amount |
|------|--------|
| Source total | R5,377,124,451.21 |
| − Import = Y | R596,773,734.27 |
| = Source − import | R4,780,350,716.94 |
| Negative lines excluded from TMPS (absolute) | R67,218,246.02 |
| = Displayed provisional eligible TMPS | **R4,847,568,962.96** |

**Negative-line treatment:** Existing `sumSupplierValueExVat` excludes `value_ex_vat < 0`. Negative lines remain in source reconciliation. Treatment is **not** client-verified.

## Scenario test result

Example: Level 1 supplier **ACHINTYA ENTERPRISES (PTY) LTD** → Non-Compliant

| | Displayed points |
|--|--------|
| Current position | 27.05 / 29.00 |
| Projected scenario | 25.43 / 29.00 |
| Impact (from rounded scores) | **−1.62 points** |

Displayed impact is computed as rounded(projected) − rounded(current) so UI arithmetic reconciles. Internal scores remain full precision.

Baseline remained unchanged; overrides affected projected values only. Undo / Reset restore prior scenario / actual position.

## Formal-scorecard protection confirmation

- Formal routes and formulas unchanged  
- No Sidebar entry for Aberdare  
- Formal Assessment opens existing `/procurement/assessments/new`  
- Scenario results are **not** auto-transferred into formal assessments  

## Tests

```bash
npm test
```

Result: **205 passed** | 1 skipped (pre-existing)

Aberdare adapter coverage includes synthetic workbook structure, totals exclusion, Level 6 / nc / placeholder 6, multipliers, negatives, immutability, provisional import exclusion, reset/undo semantics, search, and 940-row calc performance.

## Lint

```bash
npm run lint
```

Result: **0 errors** (pre-existing warnings only; no new Aberdare errors)

## Build

```bash
npm run build
```

Result: **Pass** — routes include:

- `/clients/aberdare/procurement-control-preview`
- `/clients/aberdare/procurement-control-preview/live`
- `/procurement/assessments/new` (unchanged)

## Screenshots

Captured at **1366 × 768** under `artifacts/aberdare-demo/`:

1. `01-workspace-landing.png`
2. `02-file-upload-state.png`
3. `03-successful-940-import.png`
4. `04-current-procurement-summary.png`
5. `05-supplier-table.png`
6. `06-search-result.png`
7. `07-supplier-scenario-editor.png`
8. `08-level1-to-non-compliant.png`
9. `09-current-vs-projected.png`
10. `10-import-detail-reconciliation.png`
11. `11-procurement-scenario-summary.png`
12. `12-formal-assessment-option.png`
13. `13-reset-scenario-state.png`
14. `14-mobile-narrow.png`

Re-capture:

```bash
NEXT_PUBLIC_DEV_BYPASS_AUTH=true npm run dev
# other terminal:
node scripts/capture-aberdare-demo-screenshots.mjs
```

## Remaining risks / limitations

1. Provisional Import = Y exclusion is **not** client-verified.
2. Import spend ≠ Import Spend Exempt Value (~R96.8m) unresolved.
3. Code 400 report **not** implemented (Scenario Summary only).
4. Spend Exempt / Local Spend Exempt Val not applied pending rules confirmation.
5. Baseline held in browser memory; overrides in sessionStorage only.
6. Placeholder `6` normalisation is defensive; this workbook mainly uses blanks for categorical Import/Spend Exempt.
7. Module requires login (or local auth bypass) — not exposed in production nav.

## Exact local run instructions

1. Place workbook at `client-inputs/aberdare/BBBEE Spend Report.xlsx` (gitignored).
2. `npm install` (if needed)
3. `NEXT_PUBLIC_DEV_BYPASS_AUTH=true npm run dev`
4. Open `http://localhost:3000/clients/aberdare/procurement-control-preview`
5. Open Live Procurement → upload workbook
6. Follow `ABERDARE_MEETING_GUIDE.md`

Verification:

```bash
node scripts/verify-aberdare-workbook.mjs
npm test
npm run lint
npm run build
```

## Docs

- `ABERDARE_IMPLEMENTATION_NOTES.md`
- `ABERDARE_MEETING_GUIDE.md`
- This file

No existing REAP Formal Scorecard functionality was removed or altered. No changes were pushed, merged or deployed. The existing Netlify production version remains untouched.
