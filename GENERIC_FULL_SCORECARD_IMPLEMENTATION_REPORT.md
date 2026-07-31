# Generic Full Scorecard Implementation Report

**Status:** COMPLETE WITH EXPLICIT LIMITATIONS  
**Branch:** `feature/generic-scorecard-engine`  
**Base:** `feature/full-scorecard-calculator` @ `32c1929` (Management Control importer)  
**Workbook SHA-256:** `93494e2916e21ad88072a074edadc75d351db6f28c10222463df8de641168fc0`

This product is an **internal scorecard calculator and readiness tool**. It does **not** issue a legally verified B-BBEE certificate. Final results remain subject to evidence review and authorised verification.

---

## 1. Branch

`feature/generic-scorecard-engine` — created from the latest pushed `feature/full-scorecard-calculator`. Not merged to `main`.

## 2. Workbook checksum

`93494e2916e21ad88072a074edadc75d351db6f28c10222463df8de641168fc0`  
Local copy (Git-ignored): `tmp/full-scorecard-reference/Generic-Scorecard Calculator.xlsx`

## 3. Worksheets audited

22 worksheets (see `GENERIC_SCORECARD_WORKBOOK_AUDIT.md`).

## 4. Formula count

633 formulas · 205 cached error cells · 0 macros · 0 hidden sheets · 0 external links.

## 5. Workbook defects identified

Documented in the audit and parity reports, including broken NPAT / ESD totals, hardcoded EAP, static levels, missing discounting, orphan ESD row, and demonstration data.

## 6. Rule version

- **Active:** `generic-codes-2019-v1` (operative)
- **Reserved:** `generic-codes-2026-draft` (non-production modelling only; never produces a final level)
- Registry: `src/lib/scorecard/rules/registry.ts`
- Indicators, sub-minimums, level bands and conflicts: `src/lib/scorecard/rules/generic-2019/scorecard.ts`

## 7. Applicability gate

`src/lib/scorecard/generic/applicability.ts` + UI step `/generic/applicability`

- EME / QSE / Generic classification from revenue and start-up status
- Sector-code block
- Deemed EME/QSE status
- Authorised full-scorecard election with reason and evidence

## 8. Financial inputs

`src/lib/scorecard/generic/financial.ts` + UI step `/generic/financial`

- Revenue, actual NPAT, NPBT, tax, leviable amount, payroll, employees
- Industry norm source / period / margin
- Deemed NPAT = revenue × industry margin × 25%
- Applicable NPAT = greater of actual and deemed (or authorised override)
- Unresolved denominators require authorised confirmation
- ED / SD / SED contribution targets shown from the selected denominator

## 9. Ownership status

**Scoring-ready** for captured verified results.

- Voting rights (exact votes preferred; 25.1% approximation documented)
- Economic interest, designated groups, new entrants
- Net Value captured (transaction engine not modelled)
- Priority sub-minimum: 40% of 8 Net Value points

## 10. Management Control status

**Scoring-ready when denominators + EAP target set are present.**

- Reuses privacy-safe Book2 register import
- Direct representation + EAP-disaggregated occupational bands + disability
- Sensitive fields never appear in the generic workspace

## 11. Skills Development status

**Scoring-ready when eligibility gates, leviable amount, EAP and headcounts are present.**

- 20 base + 5 absorption bonus
- SETA WSP/ATR, Pivotal, priority programme, trainee register gates
- Category F&G and administration caps at 15%
- Priority sub-minimum: 40% of 20 base (bonus excluded)

## 12. Procurement integration

**Frozen snapshot of an existing Formal Procurement Assessment.**

- No rebuilt supplier importer
- Criterion-level spend ratios scored by the generic rule set
- 27 available base / 2 bonus; sub-minimum on 40% of 25
- 51% Flow Through preserved from the source assessment
- Explicit confirmation required to replace a snapshot

## 13. Enterprise Development status

**Scoring-ready** with contribution records + applicable NPAT.

- Annexe 400(B) benefit factors
- Manual correction audit trail
- Job-creation bonus (1 pt) when confirmed and evidenced

## 14. Supplier Development status

**Scoring-ready**, separate from Skills Development (`supplier_development`).

- 2% NPAT / 10 points
- Graduation bonus (1 pt)
- Priority sub-minimum: 40% of 10
- Orphan “11% more new jobs” row excluded

## 15. SED status

**Scoring-ready**, reusing modular SED foundations and the contribution engine.

- 1% NPAT / 5 points
- Benefit factors + black beneficiary pro-rata recognition
- Workbook `Claimed` column preserved as `claimed_raw`, never scored

## 16. Bonus calculations

| Bonus | Points | Status |
| --- | --- | --- |
| Skills absorption | 5 | Implemented (absorbed ÷ completed) |
| Procurement designated-group | 2 | From frozen snapshot |
| ED job creation | 1 | Confirmed + evidenced |
| SD graduation | 1 | Confirmed + evidenced |
| Orphan 11% new jobs | 2 | **Excluded** |

## 17. Priority sub-minimums

Ownership Net Value · Skills base · Procurement (basis 25) · Supplier Development · Enterprise Development.  
Any failure → preserve points → discount **exactly one** level.

## 18. Level calculation

Dynamic bands Level 1 (100+, 135%) through Non-compliant (&lt;40, 0%).

## 19. Discounting

One-level discount; multiple failures do not compound.

## 20. Save and reopen

Assessment columns, contribution records, priority results, calculation runs, overrides and audit log are additive on staging migration `20260731020000_generic_scorecard_engine.sql`. Input changes set `needs_recalculation`; historical runs are never mutated.

## 21. Reporting

Generic result dashboard + existing printable modular report link. Partial-scorecard honesty message when incomplete:

> Partial scorecard result. This is not a complete B-BBEE level.

## 22. Security

- Owner-scoped RLS on new tables
- Admin-only NPAT override
- Privacy-safe MC import retained
- Filenames sanitised; workbook size limit 8 MB
- Formulas treated as inert data

## 23. Migrations

Additive staging-only migration:

`supabase/migrations/20260731020000_generic_scorecard_engine.sql`

**Do not apply to production** (`pmjuiynjelhjlpyohbvk`). Apply only to staging (`jzvqyryblsfxlinvoiuf`) after local verification.

## 24. Tests

`src/lib/scorecard/generic/__tests__/` — 228 table-driven tests covering rules, ownership, MC, skills, procurement, contributions, financial/applicability, aggregation and persistence.

## 25–26. Lint / Build

Recorded at closeout after `npm test`, `npm run lint`, `npm run build`.

## 27. Staging deployment

Pending local verification. Push only `feature/generic-scorecard-engine`. Manual Netlify deploy to `reap-scorecard-staging`. No production deploy. No merge to `main`.

## 28. Staging smoke test

Pending after staging migration + deploy. Workflow covered by the engine tests and the guided workspace UI at:

`/scorecards/calculator/[assessmentId]/generic`

## 29. Remaining REAP confirmations

1. SED workbook `Claimed` column meaning  
2. Whether any 2026 draft gazette should diverge from 2019 rules  
3. Whether the orphan “11% more new jobs” ESD row should ever be enabled  
4. Official confirmation of any benefit-factor figure that cannot be re-verified from a primary PDF in this environment  
5. Industry profit-norm source catalogue for deemed NPAT

## 30. Production untouched

- Production Supabase project `pmjuiynjelhjlpyohbvk`: **not modified**
- Production Netlify site: **not modified**
- `main`: **not merged**

---

## Key paths

| Area | Path |
| --- | --- |
| Rule set | `src/lib/scorecard/rules/` |
| Engine | `src/lib/scorecard/generic/` |
| Persistence mapping | `src/lib/scorecard/generic/persistence.ts` |
| Guided UI | `src/app/(dashboard)/scorecards/calculator/[assessmentId]/generic/` |
| Staging migration | `supabase/migrations/20260731020000_generic_scorecard_engine.sql` |
| Audit | `GENERIC_SCORECARD_WORKBOOK_AUDIT.md` |
| Parity | `GENERIC_SCORECARD_PARITY_REPORT.md` |
