# Aberdare Implementation Notes

## Client identity

- **Legal name:** Aberdare Cables (Pty) Ltd
- **Reporting entity in spend report:** ABFI
- **Workspace route (direct access only, noindex):** `/clients/aberdare/procurement-control-preview`
- **Live Procurement:** `/clients/aberdare/procurement-control-preview/live`
- **Formal Assessment link:** `/procurement/assessments/new` (existing REAP Formal Scorecard)

The workspace is hidden from the production sidebar and is not linked from dashboard navigation.

## Source workbook structure

File (local only, not committed):

- `client-inputs/aberdare/BBBEE Spend Report.xlsx`

Single sheet with 37 columns (Company through Payment Term Description). Known structure:

| Item | Expected |
|------|----------|
| Supplier rows | 940 |
| Aggregate totals row | 1 |
| Total rows after header | 941 |
| Total Amount Excl Vat | R5,377,124,451.21 |
| Import = Y rows | 33 |
| Import = Y spend | R596,773,734.27 |
| Import Spend Exempt Value | R499,962,148.65 |
| Local Spend Exempt Val | R19,912,247.73 |
| Negative spend rows | 2 |

## Parsed columns

All 37 workbook columns are parsed and retained on the Aberdare supplier detail model. The primary UI table shows only:

Vendor, Vendor code, Spend excl. VAT, B-BBEE level, Recognition, Import status, Recognised spend, Scenario status, Action.

## Normalisation rules

- **Accred level (1-8):** `1`–`8` remain levels; `nc` → Non-Compliant; whitespace/case safe. Value `6` in this column is Level 6.
- **Categorical placeholder `6`:** In non-level fields (e.S. Spend Exempt, Certificate, First Time Supplier) → preserved raw, normalised as unknown / not provided.
- **Import:** `Y` → imported; `N` → local; blank / `6` / other → not explicitly imported. Only `Y` sets `is_imported` for scoring.
- **Numeric fields:** Negatives preserved; malformed numbers are not silently coerced to zero for Amount Excl Vat.
- **Multiplier:** Percentages such as `135%` parsed and compared to `RECOGNITION_BY_LEVEL`.

## Provisional import rule

Configurable adapter rules in `ABERDARE_PROVISIONAL_IMPORT_RULES`:

- Only `Import = Y` is treated as imported.
- Explicit imports remain visible and filterable.
- Explicit imports are excluded from the provisional TMPS / procurement-point calculation.
- `Import Spend Exempt Value` is **not** also subtracted (avoids double counting).
- `Spend Exempt` / `Local Spend Exempt Val` are parsed and displayed, **not** applied to scoring.

Client-facing note:

> Imported spend is currently excluded using the report’s Import indicator. Final exemption treatment will be confirmed with Aberdare.

## Totals-row detection

The aggregate row is detected by empty/placeholder Company + Vendor Code + Vendor Name, with amount matching the preceding supplier sum (and a large-amount fallback). It is excluded from the supplier table and used only for reconciliation.

## Reconciliation results

Local verification script:

```bash
node scripts/verify-aberdare-workbook.mjs
```

Writes untracked output under `artifacts/aberdare-demo/verification-local.*`.

## Negative-line / eligible TMPS treatment (explicit)

**Finding:** The shared helper `sumSupplierValueExVat` sums only finite values where `value_ex_vat >= 0`. Negative credit/reversal lines are therefore **excluded from the provisional eligible TMPS denominator**. Absolute values are not used. Imported rows with negative amounts (none in this report’s Import=Y set) would likewise contribute 0 to TMPS.

This is existing REAP scoring-engine behaviour. Formal Scorecard formulas were not changed for Aberdare.

### Why displayed eligible TMPS ≠ source − imports

| Step | Amount |
|------|--------|
| Source report total | R5,377,124,451.21 |
| − Explicit Import = Y spend | R596,773,734.27 |
| = Source minus import | **R4,780,350,716.94** |
| + Absolute value of 2 credit/reversal lines (excluded from TMPS) | R67,218,246.02 |
| = Provisional eligible TMPS shown | **R4,847,568,962.96** |

UI wording (import details / “How was this calculated?”):

- Credit/reversal lines remain visible in source reconciliation.
- “The provisional calculation currently excludes negative credit or reversal lines pending confirmation.”
- Final treatment is an **unresolved client question** (not verified compliance treatment).

### Score display arithmetic

Internal scoring remains full precision. User-facing points are rounded to 2 decimals, and **displayed impact = rounded(projected) − rounded(current)** so visible arithmetic always reconciles (e.g. 25.43 − 27.05 = **−1.62**, not −1.63 from unrounded internals).

## Known data-quality issues

- 2 credit/reversal (negative) lines; included in source reconciliation; excluded from provisional TMPS pending confirmation.
- Import supplier spend ≠ Import Spend Exempt Value — requires Aberdare confirmation.
- Most rows have blank Import (not `N`) — only 33 are explicit `Y`.
- Code 400 formatting / exemption finalisation pending.

## Existing REAP functionality reused

- `calculateSupplierRow`, `getRecognitionPercent`, `RECOGNITION_BY_LEVEL`
- `aggregateCategoryTotals`, `calculateProcurementResults`
- `sumSupplierValueExVat`, `isProcurementSupplierCompliant`, `PROCUREMENT_MAX_POINTS`
- `calculateProcurementPosition` (extended with optional `excludeExplicitImportsFromScoring`)
- Formal assessment route `/procurement/assessments/new` unchanged

## Features intentionally deferred

- Permanent scenario storage for Aberdare baselines
- Automatic transfer of scenario results into a formal assessment
- Applying Spend Exempt / Local Spend Exempt Val to TMPS
- Verified Code 400 report generation
- Production sidebar exposure / multi-tenant access controls beyond login

## Code 400 limitation

No Code 400 example was supplied. The product provides a **Procurement Scenario Summary** only. Do not claim Code 400 reproduction.

## Production security requirements

- Do not commit raw Aberdare workbooks or derived supplier extracts.
- Keep `/client-inputs/` gitignored.
- Process uploads in-browser; do not upload the source workbook to external services.
- Keep baseline data in memory / clear with session end; store only minimal scenario overrides in `sessionStorage`.
- Keep the client module noindexed and out of production navigation until access control is agreed.
- Future: role-based access, approval workflow, and historical versioning once Aberdare confirms retention rules.
