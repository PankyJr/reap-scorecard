# REAP Formal Procurement Scorecard — 51% Flow Through Change Audit

Audit date: 2026-07-30  
Audit status: **REQUIRES CHANGE**

## Executive finding

The revised workbook is structurally accepted by the current procurement importer, and the inserted column does **not** shift the mapped B-BBEE level, recognition, ownership, or spend fields. The importer maps those fields by normalised header label rather than by fixed Excel position.

The revised workbook is **not semantically supported**. `51% Flow through` has no mapped field, is discarded during import, is absent from the supplier domain model and database, and is never used by `calculateSupplierRow`. The upload therefore succeeds without an error but produces understated recognised spend and an understated procurement score for the 186 rows marked `Yes`.

Using the revised workbook's own TMPS value of R4,780,350,716.94:

- Excel score in `E12`: **25.9379675409**
- Current REAP calculation, with the same denominator but without flow-through uplift: **25.3462898382**
- Difference: **0.5916777027 points**

If the operator instead chooses the platform's “supplier spend as TMPS” method:

- Current REAP denominator: **R4,847,568,962.96**
- Current REAP score: **25.2305569898**
- Difference from revised Excel: **0.7074105511 points**

The second discrepancy includes a separate rule difference: the workbook's net spend total includes two negative rows totalling R67,218,246.02, while the platform rejects negative supplier spend rows and sums only accepted non-negative rows.

No implementation, database migration, production-data change, deployment, push, or merge was performed during this audit.

## 1. Current import architecture

### Entry point

The formal procurement upload UI is `src/app/(dashboard)/procurement/assessments/new/ProcurementExcelImport.tsx`.

1. The browser sends the selected `.xlsx` or `.xls` file to `procurementExcelParseAction` in `src/app/(dashboard)/procurement/assessments/new/excelParseAction.ts`.
2. The server action enforces file type and a 12 MB server-side limit, reads the file into a buffer, and calls `parseProcurementExcelBuffer`.
3. `parseProcurementExcelBuffer` in `src/lib/procurement/excel/parseProcurementWorkbook.ts` reads the workbook with SheetJS, selects a supplier sheet, detects the header row, creates a header map, serialises every non-empty data row up to the 8,000-row cap, and returns the rows to the client.
4. The client calls `buildSuppliersFromMappedSheet` in `src/lib/procurement/excel/buildSuppliers.ts`.
5. The normalised supplier rows are converted to `SupplierFormRow` objects by `toFormRows` in `ProcurementExcelImport.tsx` and inserted into the assessment form.

### Sheet and header detection

- Supplier-sheet names are prioritised using `PROCUREMENT_SUPPLIER_SHEET_NAME_HINTS` in `src/lib/procurement/excel/constants.ts`.
- Sheet titles are trimmed and normalised by `normalizeSheetTitle`; therefore the supplied tab named `Procurement ` (with trailing whitespace) is correctly selected.
- `findLikelyHeaderRowIndex` scans up to 120 rows and requires both a supplier-name and spend mapping.
- Both supplied files are detected at worksheet row 18.

### Header mapping versus column position

The Excel importer maps by header label, not by a hard-coded column letter:

- `buildProcurementColumnAutoMap` matches normalised header text against `PROCUREMENT_COLUMN_SYNONYMS`.
- `pickSpendColumn` deliberately prefers `ZAR` and excludes `% of Spend`.
- `buildSuppliersFromMappedSheet` resolves mapped header labels back to column indexes.

Consequently, inserting the new column at I does not shift:

- `B-BBEE Level` (old K, revised L)
- `B-BBEE Recognition %` (old L, revised M)
- supplier-type input
- BO/BWO inputs
- category-output columns

There is one design weakness: the revised sheet contains duplicate labels `51% BO` and `30% BWO` for both input and calculated-output columns. Mappings store a header string, not a stable column index, and `columnIndexForMapping` returns the first matching label. That happens to select the correct input columns F and G in the supplied workbook, but the UI cannot distinguish duplicate header labels reliably. The select options also use the label as their React key and value.

### Current aliases for renamed fields

Aliases in `PROCUREMENT_COLUMN_SYNONYMS` currently recognise:

- Old BO: `BO`
- Revised BO: `51% BO`
- Old BWO: `BWO`
- Revised BWO: `30% BWO`
- Revised designated input: `51% Black DESIGNATED` via `51% black designated`
- Revised calculated designated output: `51% BDGS`

The old workbook receives special designated handling:

- Plain `DESIGNATED` is treated as an input flag.
- `51% BDGS` is detected separately.
- When both are present, `buildSuppliersFromMappedSheet` requires both to qualify the row.

The revised workbook maps `51% Black DESIGNATED` directly to `bdgs_51`. This correctly reads the revised input column H as the supplied workbook is currently structured.

### Fields not imported

The Excel mapped-field union currently contains only:

- supplier name
- spend amount
- B-BBEE level
- black ownership
- black women ownership
- 51% BDGS
- procurement recognition
- supplier type

`LOCAL`, `Comments`, and `51% Flow through` are not mapped. They are not shifted into the wrong fields; they are discarded. The separate free-text fields `bo_etc`, `fts`, `des`, `prop`, `expiry`, and `empower` are populated by manual/paste entry but not by this Excel importer.

### Paste import

`parseBulkSuppliers` in `src/app/(dashboard)/procurement/assessments/new/SuppliersTable.tsx` is position-based and supports 16 documented columns. It currently has no Flow Through column. Adding the new field to Excel import alone would therefore leave paste import and manual entry inconsistent.

### Row-range behaviour

The supplier parser does not use `C17`, the workbook's `SUM(...)` range, or any fixed supplier end row.

- `readSheetDenseAoAWithMerges` in `src/lib/procurement/excel/denseSheetAoA.ts` expands a stale `!ref` using actual worksheet cell addresses.
- `parseProcurementExcelBuffer` loops from the detected header to the end of the used worksheet range.
- Every non-empty row is serialised until `MAX_PROCUREMENT_EXCEL_DATA_ROWS` (8,000).

Both supplied workbooks expose `A1:R926` / `A1:S926`. The parser reads all 908 non-empty rows after row 18. The changed formula `SUM(C19:C1285)` does not alter supplier-row discovery.

## 2. Current scoring architecture

### Supplier calculation

The single canonical formal-procurement supplier calculation is `calculateSupplierRow` in `src/lib/procurement/rows.ts`:

1. `getRecognitionPercent(level)` reads the configured B-BBEE recognition ratio.
2. `bbbee_spend = value_ex_vat * recognition_percent`.
3. The same `bbbee_spend` is copied into the applicable EME, QSE, BO, BWO, and BDGS category amounts.

The imported workbook's `B-BBEE Recognition %` is mapped for display/transparency but is not used in calculation. The engine intentionally derives recognition from `B-BBEE Level`.

### Category aggregation and points

- `aggregateCategoryTotals` in `src/lib/procurement/assessment.ts` sums `bbbee_spend` and the category-specific calculated amounts.
- `calculateProcurementResults` divides each category numerator by TMPS, applies target/available-point formulas, and caps each category at its available points.
- `toProcurementResultsRows` converts the calculated result into database rows.

If the flow-through multiplier is applied once to `bbbee_spend` inside `calculateSupplierRow`, it will automatically propagate into:

- all B-BBEE suppliers
- QSE
- EME
- 51% Black Owned
- 30% Black Women Owned
- 51% Black Designated Groups

No change should be required in `aggregateCategoryTotals` for that propagation.

### Preview, create, and edit

All formal-procurement calculation paths call the same supplier function:

- import preview: `ProcurementExcelImport.tsx`
- assessment live preview and recognised-spend summary: `NewProcurementAssessmentForm.tsx`
- create: `src/app/(dashboard)/procurement/assessments/new/actions.ts`
- edit/recalculate: `src/app/(dashboard)/procurement/assessments/[id]/actions.ts`

There are multiple call sites but not multiple formal-procurement formula implementations. The multiplier belongs in the canonical row calculation, with every call site supplying the new input.

There are separate simulator/client modules that also call `calculateSupplierRow`. Changing the shared input type or default behaviour must preserve those callers. Flow Through should default to false when absent so unrelated modules do not change.

### TMPS

`computeProcurementScoringDenominator` in `src/lib/procurement/tmpsDenominator.ts` chooses:

- calculated TMPS from inclusion/exclusion inputs, or
- imported supplier total from accepted `value_ex_vat` rows.

Flow-through changes recognised-spend numerators, not TMPS.

`sumSupplierValueExVat` ignores negative values. Excel import rejects negative supplier rows earlier. The revised workbook's C17 total includes two negative values; this explains the R67,218,246.02 difference between workbook net spend and the platform's positive accepted-row total.

## 3. Exact files and functions affected

### Required core changes

- `src/lib/procurement/rows.ts`
  - `ProcurementSupplierInput`
  - `calculateSupplierRow`
- `src/lib/procurement/excel/types.ts`
  - `ProcurementExcelMappedField`
  - `PROCUREMENT_EXCEL_MAPPED_FIELDS`
  - `PROCUREMENT_EXCEL_FIELD_META`
- `src/lib/procurement/excel/constants.ts`
  - `PROCUREMENT_COLUMN_SYNONYMS`
- `src/lib/procurement/excel/buildSuppliers.ts`
  - flow-through value normalisation
  - `buildSuppliersFromMappedSheet`
  - diagnostics/mapped-index lists
- `src/app/(dashboard)/procurement/assessments/new/ProcurementExcelImport.tsx`
  - `toFormRows`
  - mapping UI and imported-result summary
- `src/lib/procurement/supplierFormRow.ts`
  - `serializeSupplierRowsForAssessment`
  - `supplierFromDatabaseRow`
- `src/lib/procurement/assessmentServerPayload.ts`
  - `supplierSchema`
- `src/app/(dashboard)/procurement/assessments/new/SuppliersTable.tsx`
  - empty/manual row defaults
  - paste column contract and parser
  - supplier editor control
- `src/app/(dashboard)/procurement/assessments/new/NewProcurementAssessmentForm.tsx`
  - supplier objects passed to `calculateSupplierRow`
- `src/app/(dashboard)/procurement/assessments/new/actions.ts`
  - supplier insert mapping
- `src/app/(dashboard)/procurement/assessments/[id]/actions.ts`
  - supplier replacement insert mapping
- `src/app/(dashboard)/procurement/assessments/[id]/edit/page.tsx`
  - database-to-form hydration and empty-row default

### Persistence and schema

- a new Supabase migration, created only after approval
- `supabase/schema.sql`
- `supabase/migrations/20260401000000_baseline_schema.sql` or the repository's chosen fresh-install schema source

The standalone `supabase/align_procurement_suppliers_app_columns.sql` should be evaluated for consistency if it remains an operational schema-alignment aid, but it should not replace a versioned migration.

### Report/detail changes if the field must be visible

- `src/app/(dashboard)/procurement/assessments/[id]/page.tsx`
- `src/app/procurement/assessments/[id]/report/page.tsx`
- `src/app/(dashboard)/procurement/assessments/[id]/RecognisedSupplierBreakdownSection.tsx`

The PDF endpoint `src/app/api/procurement/assessments/[id]/render-pdf/route.ts` renders the report page; it has no independent score calculation. Updating the report page automatically updates PDF output.

### Tests

- `src/lib/procurement/excel/__tests__/procurementExcel.test.ts`
- `src/lib/procurement/__tests__/assessment.test.ts`
- `src/lib/procurement/__tests__/tmpsDenominator.test.ts` for the separate negative-row/TMPS decision
- new action/persistence tests if the repository adds server-action test coverage
- report/detail component tests for disclosure of the field, if required

## 4. Result of testing both supplied workbooks

Tests used the repository's current `parseProcurementExcelBuffer`, `buildSuppliersFromMappedSheet`, `calculateSupplierRow`, `aggregateCategoryTotals`, and `calculateProcurementResults` functions directly. No workbook data was written to the database.

### Previous workbook: `Procurement test.xlsx`

- Worksheet used: `Procurement `
- Used range: `A1:R926`
- Header row: 18
- Non-empty rows after header: 908
- Imported supplier rows: 905
- Skipped rows: 3
  - `DEPARTMENT OF WATER AFFAIRS`, spend `-13.23`
  - `FIHRST - PAY AWAYS - MONTH END`, spend `-67,218,232.79`
  - final row with no supplier name
- Auto-mapping:
  - Vendor → supplier name
  - ZAR → spend
  - Generic/EME/QSE → supplier type
  - BO → 51% BO flag
  - BWO → 30% BWO flag
  - B-BBEE Level → level
  - B-BBEE Recognition % → transparency-only recognition mapping
  - 51% BDGS plus DESIGNATED → BDGS logic
- Accepted positive supplier spend: R4,847,568,962.96
- Workbook C17: R3,601,504,216.01 from the fixed formula `SUM(C19:C27)`
- Current platform category totals match the old workbook's cached category totals.
- With the same old workbook C17 denominator, the platform result is **26.4881247015**, exactly matching Excel E12.
- If “supplier spend as TMPS” is selected, the platform instead scores **25.2305569898**, because it uses all accepted positive rows rather than the old fixed C19:C27 formula.

### Revised workbook: `Procurement test (002).xlsx`

- Worksheet used: `Procurement `
- Used range: `A1:S926`
- Header row: 18
- Non-empty rows after header: 908
- Imported supplier rows: 905
- Skipped rows: the same two negative rows and one blank-name row
- New field values confirmed:
  - `Yes`: 186
  - `No`: 5
  - blank: 717
- The inserted I column does not shift mapped fields.
- The upload is accepted.
- `51% Flow through` is ignored.
- Current platform recognised/category totals remain identical to the previous-workbook totals.

Observed examples:

- IKOPEKELA
  - Current REAP: R1,764,614,302.92 × 100% = R1,764,614,302.92
  - Revised Excel: R1,764,614,302.92 × 100% × 1.2 = R2,117,537,163.504
- ACHINTYA
  - Current REAP: R177,373,164.77 × 135% = R239,453,772.4395
  - Revised Excel: R177,373,164.77 × 135% × 1.2 = R287,344,526.9274

Revised Excel cached totals:

- all B-BBEE suppliers: R4,335,944,566.006805
- QSE: R310,167,718.63760006
- EME: R473,306,684.4228002
- 51% Black Owned: R3,316,493,177.2883
- 30% Black Women Owned: R3,233,216,676.430202
- 51% Black Designated Groups: R425,305,218.8802001
- score: 25.937967540885822

Current REAP totals for that revised file:

- all B-BBEE suppliers: R3,797,470,812.353998
- QSE: R269,754,408.9874999
- EME: R403,834,194.54900014
- 51% Black Owned: R2,778,019,423.6355
- 30% Black Women Owned: R2,736,450,098.6275015
- 51% Black Designated Groups: R354,421,015.7335001

## 5. Current behaviour with the revised workbook

The revised workbook currently:

- is not rejected;
- does not cause positional shifting;
- maps B-BBEE level to revised column L;
- maps B-BBEE recognition to revised column M, but does not use that workbook percentage in scoring;
- maps the first revised `51% BO` and `30% BWO` headers to input flags;
- maps `51% Black DESIGNATED` to the designated-group flag;
- ignores `51% Flow through`;
- ignores `LOCAL` and `Comments`;
- produces silent incorrect recognised-spend and category values relative to revised Excel;
- displays no warning that a scoring-relevant column was discarded.

This is a silent-calculation risk, not a file-format compatibility failure.

## 6. Data-model impact

There is no confirmed equivalent field in the current domain model.

`fts?: string` exists on `ProcurementSupplierInput` and as a nullable text column on `procurement_suppliers`, but:

- it is an untyped free-text field;
- Excel import never maps `51% Flow through` into it;
- it is not validated as a boolean;
- it is not used in scoring;
- its meaning is not documented in code.

It must not be repurposed without a business/data-definition confirmation.

Recommended model, subject to the outstanding business rules:

- domain property: `is_51_flow_through: boolean`
- database column: `is_51_flow_through boolean not null default false`

This belongs on each `procurement_suppliers` row, not in assessment-level metadata, because:

- the value varies by supplier;
- edits replace all supplier rows;
- score recalculation reconstructs input from supplier rows;
- report transparency requires joining the value to the supplier;
- metadata keyed by supplier name or transient form ID would be fragile and ambiguous.

If the uplift percentage may vary by supplier, assessment year, or future rule version, a boolean alone may be insufficient. In that case the approved model should store either an applied multiplier or a calculation-rule version in addition to the boolean.

## 7. UI impact

Required UI coverage:

- Excel column-mapping row for `51% Flow through`
- imported-row normalisation and warnings
- manual supplier editor checkbox/select
- paste-import column and documentation
- saved-assessment edit hydration
- live recognised-spend summary and score preview

Recommended control:

- a clearly labelled per-supplier boolean control such as `51% Flow Through`
- default off when an old workbook has no such column
- a visible badge or note beside recognised spend when uplift is applied

The UI must not show only the base recognition percentage while silently applying an additional multiplier. Either show a Flow Through indicator or an effective-recognition explanation.

## 8. Calculation impact

The canonical place for the uplift is `calculateSupplierRow` in `src/lib/procurement/rows.ts`.

Conceptually, after business approval:

`bbbee_spend = value_ex_vat × recognition_percent × flow_through_multiplier`

The existing category calculations already copy `bbbee_spend` into every qualifying category. Applying the multiplier in a category aggregator or report would duplicate logic and risk inconsistent previews, saves, and exports.

`recognition_percent` currently means the level-based ratio (for example 1.00 or 1.35). It should not automatically be overwritten with 1.20 or 1.62 because that would blur the distinction between B-BBEE level recognition and the Flow Through uplift. The report may need a separate effective factor.

## 9. Report/export impact

Saved assessment pages and reports do not recalculate from workbook formulas. They read:

- stored supplier `bbbee_spend` and category amounts;
- stored `procurement_results`;
- stored assessment TMPS and total score.

Once create/edit persistence stores the new field and `calculateSupplierRow` applies the approved rule, numeric report totals will follow automatically.

The field itself is absent from:

- recognised supplier breakdown on the assessment detail page;
- report recognised supplier breakdown;
- generated PDF.

Business confirmation is required on whether to expose:

- a Flow Through badge/column;
- the base level recognition percentage;
- an effective recognition factor;
- a separate uplift amount.

There is no independent formal-procurement Excel export in this workflow. The PDF is a browser rendering of the report page.

The full-scorecard upload path is separate. `src/lib/scorecard-upload/parsers/procurement.ts` reuses the supplier-register parser for preview, while `src/lib/scorecard/full/extractors/procurement-sheet.ts` extracts workbook summary metrics rather than recalculating supplier rows. Scope for Flow Through in the full-scorecard product must be confirmed separately; it should not be changed implicitly as part of this formal-procurement requirement.

## 10. Backward-compatibility plan

Older workbooks can remain compatible:

1. Add the new mapping as optional.
2. When the header is absent, create supplier inputs with Flow Through off.
3. Give the database column a false default.
4. Hydrate missing/legacy values as false.
5. Keep B-BBEE level recognition unchanged when Flow Through is false.
6. Do not infer Flow Through from recognised-spend output columns, `fts`, comments, supplier names, or previously calculated values.
7. Preserve old saved `bbbee_spend`, category results, and total score until a user explicitly edits/recalculates, unless the business approves a controlled historical recalculation.

Previously saved assessments should remain numerically unchanged by the migration itself. The proposed default false supports that. Assessments created from the revised workbook before this change have already lost the source Flow Through value; they cannot be corrected reliably without re-importing the workbook or an approved, auditable data-repair process.

## 11. Migration recommendation

**Recommendation: a database migration is required for a durable implementation.**

Proposed migration shape, not created during this audit:

- add `public.procurement_suppliers.is_51_flow_through boolean not null default false`;
- retain existing calculated `bbbee_spend` and category amount columns;
- do not backfill true values automatically;
- do not recalculate historical assessments in the schema migration;
- update the fresh-install schema source consistently.

Assessment-level JSON/metadata is not recommended for a supplier-level scoring input.

Before migration design is finalised, confirm whether a boolean plus code-defined 1.2 multiplier is sufficient or whether the applied multiplier/calculation version must also be persisted.

**Required deployment order:**

1. Apply the database migration.
2. Verify `is_51_percent_flow_through` exists, is `not null`, and defaults to `false`.
3. Deploy the application code.
4. Run a create/edit/import/report smoke test.
5. Do not reverse this order.

The migration also requests a PostgREST schema reload. The create action already maps `PGRST204` / missing-column errors to a user-facing migration message; deploying insert literals before the column is available blocks all saves.

**Saved-assessment behaviour:** detail, report, and PDF views read stored `procurement_suppliers` and `procurement_results` via `buildProcurementResultFromRows` — they never re-invoke `calculateSupplierRow`. A new uplift therefore affects an existing assessment only when a user re-saves through the edit form (which destructively replaces suppliers and results). Consider an optional `scoring_version` (or equivalent) on `procurement_assessments` if portfolios must distinguish pre- and post-change scores.

**Plumbing blast radius:** beyond `calculateSupplierRow`, the new field must be threaded through eight duplicated supplier-object construction sites, paired create/update insert literals, Excel mapping metadata, form serialisation/hydration, and matching detail/report supplier projections — otherwise preview, save, and PDF can diverge silently.

## 12. Required tests

### Workbook parsing

- revised 19-column header maps every intended input correctly;
- `51% Flow through` maps to the new field;
- old 18-column header remains valid and defaults Flow Through off;
- inserted-column regression proves level, recognition, local, comments, BO, BWO, and designated values do not shift;
- duplicate `51% BO` / `30% BWO` headers select the intended input columns deterministically;
- all rows through at least row 1,285 are read when populated;
- stale worksheet `!ref` still expands to actual used cells;
- current 8,000-row truncation warning remains correct.

### Value normalisation

- approved positive tokens;
- approved negative tokens;
- blank value;
- surrounding whitespace and case;
- booleans/numeric cell values if supported;
- malformed value produces the approved warning/rejection behaviour rather than silent false.

### Supplier calculation

- no-flow row retains `spend × level recognition`;
- flow row applies the approved multiplier exactly once;
- IKOPEKELA example;
- ACHINTYA example;
- non-compliant supplier behaviour;
- category amounts receive the uplift only when their existing flags/type qualify;
- category point caps still apply.

### End-to-end calculation

- revised workbook category totals match the approved Excel reference;
- revised workbook score matches Excel when the same TMPS denominator is used;
- old workbook score remains unchanged under the same denominator;
- import preview, live preview, create action, edit/recalculate, detail page, report, and PDF all agree.

### Persistence

- create action stores the flag;
- edit page restores it;
- edit action preserves and recalculates it;
- legacy database rows without a true value hydrate as false;
- assessment edit does not accidentally clear the flag.

### TMPS/row policy

- test the approved treatment of negative supplier spend;
- test whether supplier-total TMPS is gross positive spend or net workbook spend;
- test that workbook formulas and cached total cells are not trusted as supplier-row boundaries.

Current targeted procurement regression result: **37 tests passed across 3 files**.  
Current full repository result: **225 tests passed, 1 skipped across 35 files**.  
None currently tests Flow Through.

## 13. Risks

### High

- Silent under-scoring: revised files upload successfully but the 20% uplift is ignored.
- Historical ambiguity: previously imported revised files have lost the Flow Through inputs.
- Duplicate headers: label-only mapping cannot reliably distinguish input and calculated-output columns.

### Medium

- Report transparency: recognised spend may exceed `actual × level recognition` without an explanatory field.
- Shared calculation function: simulator/client callers must retain false-by-default behaviour.
- Negative-row policy: platform supplier-total TMPS and workbook net total differ by R67,218,246.02.
- Recalculation: editing a historical assessment replaces suppliers/results and may apply new rules unless versioning/default behaviour is explicit.

### Low

- Row-boundary change: no fixed supplier-row boundary was found in the formal procurement parser; 926 rows are well under the 8,000-row cap.
- Column insertion: header-based mapping protects level/spend fields from the inserted column.

## 14. Business questions still requiring confirmation

1. Which source values count as positive: only `Yes`, or also `Y`, `True`, `1`, `X`, booleans, or other client codes?
2. Which values count as explicit negative?
3. Does blank always mean no uplift?
4. Should malformed non-blank values reject the row/import, generate a warning and default off, or require manual mapping/correction?
5. Is the multiplier always exactly 1.2?
6. Is the uplift uncapped at recognised-spend level, with only category points capped, as the supplied workbook currently does?
7. Does Flow Through apply to non-compliant suppliers or only when base recognition is positive?
8. Does the uplift feed every qualifying category exactly as observed, including QSE, EME, BO, BWO, and BDGS?
9. Should `recognition_percent` remain the base level percentage, with a separate effective factor shown?
10. Must the field appear in the supplier editor, assessment detail, client report, and PDF?
11. Is the existing free-text `fts` field related to this rule, or does it have a different business meaning?
12. Should previously saved assessments remain frozen, including when viewed?
13. When a previously saved assessment is edited, should the new rule apply only if the user explicitly sets/reimports Flow Through?
14. May any historical records be re-imported or repaired, and under what approval/audit process?
15. Are the two negative supplier-spend rows valid adjustments that should reduce supplier-total TMPS, or should they continue to be rejected?
16. Is C17 the authoritative TMPS for these workbooks, or must users continue selecting/calculating TMPS independently in the platform?
17. Is the separate full-scorecard upload/report product in scope for this change?

## 15. Recommended implementation sequence

1. Confirm the business rules in section 14, especially accepted tokens, multiplier/capping, negative rows, reporting, and historical behaviour.
2. Lock a canonical supplier field and calculation semantics.
3. Add failing unit/regression fixtures for old and revised headers, examples, category totals, and score.
4. Decide whether label-only mapping should be upgraded to index-based mapping to resolve duplicate headers safely.
5. Create the approved Supabase migration and update fresh-install schema definitions.
6. Extend the domain type, validation, serializer, database hydration, and create/edit persistence.
7. Extend Excel and paste import with explicit normalisation and diagnostics.
8. Add the manual/edit UI control.
9. Apply the multiplier once in `calculateSupplierRow`.
10. Verify automatic propagation through preview, save, category totals, detail, report, and PDF.
11. Run old-workbook compatibility tests and confirm no historical rows are recalculated by migration.
12. Run full test, lint, build, and browser-based end-to-end verification before any deployment decision.

## Direct answers to the audit questions

1. **Header name or position?** Excel import maps by normalised header name. Paste import is positional.
2. **Will revised workbook import correctly?** Structurally yes; numerically no, because Flow Through is ignored.
3. **Which aliases recognise renamed ownership headings?** `51% BO`, `30% BWO`, and `51% black designated` are already recognised; old `BO` and `BWO` also remain recognised.
4. **Existing equivalent field?** No confirmed equivalent. `fts` is free text and unused in scoring.
5. **Where should it live?** On `ProcurementSupplierInput` / `SupplierFormRow` and each persisted supplier row.
6. **Database column or metadata?** A supplier-table column is recommended; assessment metadata is not robust.
7. **Which function applies 1.2?** `calculateSupplierRow`.
8. **Duplicated recognised-spend formulas?** The formal-procurement formula is centralised, but there are several callers and manual object constructions that must carry the field.
9. **Will category totals update automatically?** Yes, if uplift is applied to `bbbee_spend` before existing category allocation.
10. **Blank/No/malformed normalisation?** Not implemented; exact policy requires confirmation. Malformed values should not be silently treated as no without approval.
11. **Older spreadsheets?** Optional mapping plus false defaults preserves compatibility.
12. **Old saved assessments?** Recommended to remain unchanged; business approval is required.
13. **Every populated row?** The parser scans every non-empty used-range row up to 8,000, but rejects negative, zero, blank-name, aggregate, and category rows.
14. **Trust workbook totals?** Formal procurement does not use workbook formulas as row boundaries or scoring totals. It recalculates from accepted supplier rows and independently selected TMPS.
15. **Reports/exports?** Numeric detail/report/PDF values use stored results and will follow recalculation. Field visibility requires explicit UI/report work.
16. **UI controls?** Excel mapping, manual supplier editor, paste import, saved edit, and likely detail/report disclosure.
17. **Migration?** Yes, recommended for durable supplier-level persistence; none was created.
18. **Tests?** Parsing, aliases, duplicate headers, normalisation, calculation, propagation, persistence, compatibility, range, negative-row policy, report, and end-to-end tests listed above.
