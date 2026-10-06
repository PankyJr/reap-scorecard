# Generic Scorecard Workbook Audit

**Workbook:** `Generic-Scorecard Calculator.xlsx`  
**Local reference (Git-ignored):** `tmp/full-scorecard-reference/Generic-Scorecard Calculator.xlsx`  
**SHA-256:** `93494e2916e21ad88072a074edadc75d351db6f28c10222463df8de641168fc0`  
**Size:** 342,606 bytes  
**Branch:** `feature/generic-scorecard-engine`

This audit describes the reference workbook. Excel formulas are **not** executed at runtime. Approved logic is translated into pure TypeScript under `src/lib/scorecard/generic/` and versioned as `generic-codes-2019-v1`.

## Inventory

| Metric | Value |
| --- | --- |
| Worksheets | 22 |
| Formulas | 633 |
| Cached error cells (`#DIV/0!` and similar) | 205 |
| Hidden sheets | 0 |
| Macros / VBA | None |
| External workbook links | 0 |
| Broken defined names | 1 (`_xlnm._FilterDatabase` → `#REF!`) |

### Worksheets

1. `Summary `
2. `Ownership`
3. `Management Control`
4. `3 Board Members `
5. `4 Executive Committe `
6. `5 Staff List `
7. `Employment Equity`
8. `Skills Development`
9. `Category A`
10. `Category BCDE`
11. `Category BCD(Hcount)`
12. `Learner summary`
13. `Category F&G`
14. `13 EMP201`
15. `7 TMPS `
16. `Procurement Scorecard`
17. `Imports `
18. `ED & SD`
19. `SED`
20. `Full Scorecard`
21. `NPAT Calculation`
22. ` Yes Targets Calc`

Trailing spaces and the `Executive Committe` misspelling are preserved as recognised aliases by the importers.

## Structural findings

- Personal-data sheets (Board, Executive Committee, Staff List, Skills category sheets, Procurement supplier rows) contain identifiable records. The audit dump and the product preview expose **headers and counts only**.
- Many scoring sheets cache `#DIV/0!` because denominators are blank in the shipped workbook.
- The Summary level table is static; it is not driven by a dynamic score.
- Priority-element discounting is not implemented in the workbook.
- Demonstration / example ownership and procurement data are present and must not be imported as client data.

## Material workbook defects

| Defect | Location | Engine treatment |
| --- | --- | --- |
| Hard-coded 25.1% for “25% plus one vote” | Ownership | Exact vote counts preferred; 25.1% documented as approximation only |
| Blank denominators → `#DIV/0!` | Management Control, Skills, etc. | Missing-input results; never divide by zero |
| Hard-coded EAP percentages | Employment Equity | Versioned EAP target sets |
| Absorption = completed / headcount | Skills Development | Replaced with absorbed / completed |
| Broken NPAT result (`B27 = B23`) | NPAT Calculation | Greater of actual and deemed NPAT |
| Broken ESD available total (`C17`) | ED & SD | Uses rule-set weighting, not achieved procurement points |
| Orphan “11% more new jobs” 2-pt row | ED & SD | Excluded until REAP confirms |
| Static level table | Summary | Dynamic level bands in the engine |
| Missing priority discounting | Full Scorecard / Yes Targets Calc | One-level discount for any failed sub-minimum |
| Mixed base/bonus totals | Skills / Procurement | Base and bonus stored separately |
| SED `Claimed` column | SED | Preserved as raw optional input; never scored |
| Demo supplier / ownership rows | Procurement / Ownership | Excluded demonstration data |

## Official-rule conflicts recorded

See `GENERIC_CODES_2019_V1.ruleConflicts` and `src/lib/scorecard/rules/generic-2019/workbook-rule-inventory.ts`.

Notable resolutions:

- Preferential Procurement available base points = **27**; priority sub-minimum basis = **40% of 25**.
- Generic scorecard total base points = **111** (detailed statements), not the workbook’s hybrid 111-point display without explanation.
- Absorption measured as absorbed ÷ completed learners.
- NPAT denominator = greater of actual and deemed; never the broken `B27 = B23` formula.

## Machine-readable inventory

`src/lib/scorecard/rules/generic-2019/workbook-rule-inventory.ts` maps every scoring indicator to:

- workbook sheet and cells
- indicator key
- target / base / bonus points
- formula text
- official-rule status
- workbook-parity status
- known defect

## Privacy

Identity numbers, personal names, supplier records and beneficiary names from the original workbook are not committed, logged, or shown in the generic workspace. Management Control continues to use the privacy-safe Book2 importer (`management-control-register-import-v1`).
