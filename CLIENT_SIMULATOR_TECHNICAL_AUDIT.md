# Client Procurement Simulator — Technical Audit

**Date:** 10 July 2026  
**Branch:** `client-procurement-simulator-prototype`  
**Scope:** Phase 1 repository and calculation audit for the Mbeki Industrial Holdings scenario-planning workflow.

---

## Executive summary

The REAP Solutions repository already contains a **standalone procurement scoring engine** suitable for live recalculation when supplier attributes change. It does **not** currently provide a persistent “actual vs scenario” workflow, SAP-specific import mapping, or Code 400 summary export matching the client’s monthly report format.

The prototype reuses the existing pure-function pipeline and adds an isolated calculation boundary (`calculateProcurementPosition`) that preserves baseline data while applying scenario overrides.

---

## Existing procurement calculation functions

| Module | Path | Reuse for simulator |
|--------|------|---------------------|
| Supplier row calculation | `src/lib/procurement/rows.ts` — `calculateSupplierRow`, `getRecognitionPercent` | **Yes — primary source of truth** |
| Category aggregation | `src/lib/procurement/assessment.ts` — `aggregateCategoryTotals` | **Yes** |
| Points calculation | `src/lib/procurement/assessment.ts` — `calculateProcurementResults` | **Yes** |
| TMPS denominator | `src/lib/procurement/tmpsDenominator.ts` — `computeProcurementScoringDenominator`, `sumSupplierValueExVat` | **Partial** — prototype uses `import_supplier_total` (sum of supplier lines) |
| TMPS pad | `src/lib/procurement/tmps.ts` | **Not used in prototype** — client workflow assumes SAP supplier extract as baseline |
| Insights / mix | `src/lib/procurement/insights.ts` — `summarizeSupplierMix`, `isProcurementSupplierCompliant` | **Yes for reporting metrics** |
| Comparison | `src/lib/procurement/compareAssessments.ts` | **Reference only** — compares saved assessments, not live scenarios |
| Excel parse | `src/lib/procurement/excel/*` | **Future** — requires client column map; not wired in prototype |

### Scoring formula (unchanged)

```
bbbee_spend = value_ex_vat × recognition_percent
achievedPercent = category_numerator / TMPS_denominator
rawPoints = (achievedPercent / targetPercent) × availablePoints
pointsAchieved = min(rawPoints, availablePoints)
totalScore = sum(pointsAchieved)
```

Maximum procurement points: **29** (`PROCUREMENT_MAX_POINTS`).

---

## Recognition percentage mappings

From `src/lib/procurement/config.ts`:

| Level | Recognition multiplier |
|-------|------------------------|
| 1 | 1.35 |
| 2 | 1.25 |
| 3 | 1.10 |
| 4 | 1.00 |
| 5 | 0.80 |
| 6 | 0.60 |
| 7 | 0.50 |
| 8 | 0.10 |
| Non-Compliant | 0.00 |

Unknown levels default to Non-Compliant (0).

---

## Supplier data structures

### Existing (`ProcurementSupplierInput`)

Fields: `supplier_name`, `supplier_code`, `supplier_type` (EME/QSE/Generic), `level`, `value_ex_vat`, ownership flags (`is_51_black_owned`, `is_30_black_women_owned`, `is_51_bdgs`), optional certificate metadata.

### Prototype extensions (`SimulatorSupplier`)

Additional prototype-only fields:

- `id` — stable key for scenario overrides
- `is_imported` — local vs imported classification (reporting only in current engine)
- `compliance_status` — compliant / non-compliant / unknown / expired

These extensions are **not persisted to Supabase** in Phase 1.

---

## Excel upload and parsing

| Component | Path |
|-----------|------|
| Workbook parser | `src/lib/procurement/excel/parseProcurementWorkbook.ts` |
| Column detection | `src/lib/procurement/excel/detect.ts` |
| Row builder | `src/lib/procurement/excel/buildSuppliers.ts` |
| UI | `src/app/(dashboard)/procurement/assessments/new/ProcurementExcelImport.tsx` |

**Gap:** `procurement_recognition` Excel column is auto-detected but **not applied** in scoring — level always drives recognition.

**Gap:** No SAP-specific column synonyms until client provides real spreadsheet.

---

## Assessment tables (Supabase)

| Table | Purpose |
|-------|---------|
| `procurement_assessments` | Assessment header, TMPS inputs, denominator source, total score |
| `procurement_suppliers` | Persisted supplier rows with precomputed buckets |
| `procurement_results` | Per-category achieved %, points, numerators |

The simulator prototype **does not write** to these tables.

---

## Report generation

| Output | Path |
|--------|------|
| HTML report | `src/app/procurement/assessments/[id]/report/page.tsx` |
| PDF API | `src/app/api/procurement/assessments/[id]/render-pdf/route.ts` |
| Download button | `src/components/procurement/ProcurementPdfDownloadButton.tsx` |

**Gap:** No Code 400 layout export. PDF reflects REAP assessment report, not client SAP summary format.

---

## Category calculations

Six categories from `PROCUREMENT_CATEGORIES`:

| Category | Target | Max points |
|----------|--------|------------|
| All B-BBEE Suppliers | 80% | 5 |
| All QSEs | 15% | 3 |
| All EMEs | 15% | 4 |
| 51% Black Owned | 50% | 11 |
| 30% Black Women Owned | 12% | 4 |
| 51% Black Designated Groups | 2% | 2 |

---

## Non-compliant supplier handling

- `level === 'Non-Compliant'` → `recognition_percent = 0` → zero category contribution
- Supplier spend still counts toward TMPS when using `import_supplier_total`
- `isProcurementSupplierCompliant()` used for mix summaries

---

## Imported spend handling

**Critical distinction:** The existing engine’s “import” terminology refers to **Excel import of supplier lines**, not **imported goods/services from abroad**.

The prototype tracks `is_imported` per supplier for client-facing reporting. **This flag does not change procurement points** in the current engine. Code 400 imported-spend rules require client documentation.

---

## TMPS logic

Full TMPS pad (inclusions − exclusions + custom lines) exists but is **deprecated in the new-assessment UI** in favour of `import_supplier_total` when suppliers are loaded from Excel.

For monthly SAP extracts where supplier lines represent measured procurement, `sumSupplierValueExVat` is the appropriate denominator — matching current platform behaviour for imported workbooks.

---

## UI components reusable

| Component | Path | Simulator use |
|-----------|------|---------------|
| SuppliersTable | `assessments/new/SuppliersTable.tsx` | Pattern reference (pagination, bulk paste) — not reused directly |
| ProcurementScorecardTable | `components/procurement/ProcurementScorecardTable.tsx` | Could display category breakdown in Phase 2 |
| formatCurrencyZar | `lib/procurement/format.ts` | **Used** |
| buttonStyles | `components/ui/buttonStyles.ts` | **Used** |

New prototype UI: `src/components/procurement-simulator/*` — larger text, calmer layout, no sidebar entry.

---

## State management

Existing assessments: React local state + server actions + Supabase persistence.

Prototype: React local state only; scenario saves via `localStorage` (`scenarioStorage.ts`).

---

## Testing framework

- **Vitest 4** — `npm test`
- Existing procurement tests: `src/lib/procurement/__tests__/assessment.test.ts`, `excel/__tests__/procurementExcel.test.ts`, `tmpsDenominator.test.ts`
- New simulator tests: `src/lib/procurement/simulator/__tests__/simulator.test.ts`

---

## What can safely be reused

1. `calculateSupplierRow` → per-supplier recognition and category buckets  
2. `aggregateCategoryTotals` → category numerators  
3. `calculateProcurementResults` → procurement points (not overall B-BBEE level)  
4. `sumSupplierValueExVat` → TMPS denominator from supplier extract  
5. `RECOGNITION_BY_LEVEL` / `PROCUREMENT_CATEGORIES` config  
6. `isProcurementSupplierCompliant`, `summarizeSupplierMix` for summary metrics  
7. Excel parser (after client column mapping confirmed)  
8. Currency/ points formatting helpers  

---

## What cannot currently support the client workflow

| Requirement | Status |
|-------------|--------|
| Actual vs scenario without new assessment | **Not in production** — prototype only |
| Code 400 summary report | **Not implemented** — layout unknown |
| SAP column auto-mapping | **Blocked** — need client spreadsheet |
| Imported goods spend rules in scoring | **Not in engine** — reporting flag only |
| Certificate expiry business rules | **Partial** — prototype maps expired/unknown to Non-Compliant; client rules may differ |
| Multi-user scenario collaboration | **Not supported** |
| Permanent scenario storage | **Not supported** — localStorage prototype only |
| Monthly upload versioning | **Not designed** — assessments are discrete records today |
| Overall company B-BBEE level from procurement alone | **Not supported** — procurement max 29 points only |

---

## Missing data requirements

See `CLIENT_DATA_REQUIREMENTS.md` for the full client document checklist.

---

## Missing scoring requirements

1. Code 400 category structure vs current six REAP categories — confirm equivalence  
2. Imported spend exclusion or cap rules  
3. Treatment of suppliers with expired/unknown certificates  
4. Whether TMPS should come from SAP total row vs sum of supplier lines  
5. Whether `procurement_recognition` column overrides level-based recognition  

---

## Recommended architecture

```
┌─────────────────────────────────────────────────────────┐
│  /procurement-simulator-preview (isolated route)        │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │ Baseline    │  │ Scenario     │  │ Summary +      │ │
│  │ (immutable) │→ │ overrides    │→ │ supplier table │ │
│  └─────────────┘  └──────────────┘  └────────────────┘ │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
              calculateProcurementPosition()
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
  calculateSupplierRow  aggregateCategoryTotals  calculateProcurementResults
```

**Phase 2+ (post site visit):**

- Wire SAP Excel upload through existing parser with client column map  
- Optional Supabase `procurement_baselines` + `procurement_scenarios` tables (non-destructive migration)  
- Code 400 PDF/Excel export template from client sample  

---

## Data-model risks

1. **Dual procurement engines** — full-scorecard engine (`src/lib/scorecard/full/engine`) uses different recognition representation; never mix without conversion  
2. **Denominator drift** — if client TMPS ≠ sum of supplier lines, points will disagree with Code 400  
3. **Override key stability** — SAP supplier numbers must be stable month-to-month for scenario continuity  
4. **localStorage limits** — ~900-supplier scenario saves may approach browser quota if many scenarios stored  

---

## Performance considerations (~900 suppliers)

| Operation | Measured (Vitest) |
|-----------|-------------------|
| Full position calculation (actual + scenario) | < 500 ms |
| UI rendering | Paginated 50 rows/page — no full DOM of 900 rows |
| Excel parse | Existing cap 8,000 rows |

Recommendation: keep pagination; consider `@tanstack/react-virtual` only if client requires scrolling all rows without pages.

---

## Features that must wait for client documents

1. Real SAP spreadsheet column mapping and upload  
2. Code 400 summary layout and export  
3. Imported spend scoring rules  
4. Certificate expiry / unknown supplier rules  
5. Exclusion categories (employee costs, etc.) if not in SAP extract  
6. Multi-user scenario sharing and approval workflow  
7. Production navigation integration (explicitly excluded from Phase 1)  

---

## Prototype deliverable

- **Route:** `/procurement-simulator-preview`  
- **Calculation boundary:** `src/lib/procurement/simulator/calculateProcurementPosition.ts`  
- **Sample data:** `generateMbekiSimulatorSuppliers(900)`  
- **Not in sidebar** — direct URL only  
