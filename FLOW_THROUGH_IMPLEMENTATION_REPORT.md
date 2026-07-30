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
