# Full Scorecard Calculator — Architecture Audit

**Date:** 2026-07-30  
**Branch:** `feature/full-scorecard-calculator`  
**Scope:** Grounded inspection before modular calculator implementation

---

## 1. What “Legacy Scorecard” currently stores

Legacy path: `/scorecards/new?legacy=1` → `LegacyScorecardNewPage` → tables `scorecards`, `scorecard_inputs`, `scorecard_results`.

- Stores **manually entered category points** (capped category scores), not workbook row detail.
- Computes an overall level from summed category points.
- Sidebar label (pre-change): “New Legacy Scorecard”.
- Default `/scorecards/new` (without `?legacy=1`) previously redirected to procurement assessment creation.

**Conclusion:** Legacy = manual point entry. Records must remain readable; do not redirect them into the modular calculator.

---

## 2. Existing full-scorecard engine

Path: `/scorecards/full/new` and `/scorecards/full/[workbookId]`.

Pipeline:

1. Upload multi-sheet B-BBEE workbook  
2. Parse sheets → `scorecard_workbooks` / `scorecard_workbook_sheets`  
3. Extract metrics → `scorecard_metric_values`  
4. Run proportional engine (`full-v0-scaffold`) → `scorecard_engine_runs` / `scorecard_engine_results`

**What it calculates:** Indicator-level points via `calculateProportionalPoints(actual%, target%, availablePoints)` and pillar aggregates. It is a **workbook-metric importer + proportional scorer**, not a complete regulatory calculator for every Codes scenario.

---

## 3. Elements / metrics already present

| Element | Metric namespace | Engine indicator |
|---|---|---|
| Ownership | `ownership.*` | proportional |
| Management Control | `management_control.*` | proportional per demographic band |
| Skills Development | `skills_development.*` | proportional (**not** Supplier Development) |
| Preferential Procurement | `preferential_procurement.*` | proportional |
| Enterprise Development | `enterprise_development.*` | proportional |
| Supplier Development | `supplier_development.*` | proportional |
| Socio-Economic Development | `socio_economic_development.*` | `sed.annual_spend` (5 pts available in config) |

**Ambiguity note:** Repository already distinguishes `skills_development` vs `supplier_development`. Calculator must never use a bare internal key `sd`.

---

## 4. SED / ED / Supplier Development / MC formulas

### SED (verified)

- Engine: `proportional_points` on `socio_economic_development.annual_spend.{percentage,target,available_points}`.
- `indicator-config.ts`: `sed.annual_spend.availablePoints = 5`.
- Engine tests commonly use **target = 0.01** (1%).
- Extractor expects a compliance row (B–D) and optional amount / NPAT mirror.
- **Does not** derive `%` from recognised amount ÷ NPAT when only amount+NPAT exist (`sed-sheet.ts` documents this).

### Book1.xlsx (reference input — not committed)

- Sheet `SED`; headers row 2; beneficiary rows; Total row with `SUM(C3:C17)`.
- Sample: 3 × R140,000 → R420,000.
- This is a **beneficiary line-item** template, not the engine’s summary compliance row layout.

### ED / Supplier Development

- Same proportional pattern from `ED & SD` sheet metrics.
- No verified beneficiary-line NPAT scoring path without workbook %/target/points.

### Management Control

- Demographic triples: `black_people` / `black_women` × percentage / target / available_points per band (board, executive, senior/middle/junior, disabilities).
- **No EAP tables or EAP percentage storage anywhere in the repo.** Targets come from workbook cells today.

---

## 5. Database tables in use

| System | Tables |
|---|---|
| Legacy | `scorecards`, `scorecard_inputs`, `scorecard_results` |
| Full workbook | `scorecard_workbooks`, `scorecard_workbook_sheets`, `scorecard_metric_values`, `scorecard_validation_issues`, `scorecard_engine_runs`, `scorecard_engine_results` |
| Auth admin | `reap_internal_admins` |

RLS on full-scorecard tables: company `owner_id = auth.uid()`.

---

## 6. Production readiness of current full-scorecard pages

- Functional for multi-sheet template upload + scoring.
- **Not** the modular “calculate one element” product REAP requested.
- Hidden from primary “create” CTA (sidebar pushed users to legacy or procurement).
- Incomplete vs beneficiary workbooks, EAP versioning, and partial-scope honesty.

---

## 7. What to reuse vs rebuild

**Reuse**

- `calculateProportionalPoints` / `safe-math`
- SED/ED/Supplier Development/MC metric keys and indicator available points
- Internal admin gate (`requireReapInternalAdmin`)
- Company ownership auth patterns
- Printable report / PDF capability flags (do not claim Chromium PDF fixed)
- Full workbook routes remain for existing multi-sheet uploads

**Build new**

- Modular element adapters + selected-element assessments
- Book1-style SED beneficiary importer (header-based)
- Versioned EAP target sets + snapshots
- Calculator UI terminology (“Full Scorecard Calculator”)
- Additive assessment tables (do not duplicate workbook stack)

---

## 8. Legacy readability

Preserve `/scorecards/[id]` and `?legacy=1` create path. Expose discreetly as “Manual Scorecards” / “Legacy Manual Scorecards”. Do not merge incompatible data into the calculator.

---

## 9. Claimed column (Book1)

Sample values are blank. No verified data type in REAP materials. Treat as optional raw string; **do not use in scoring** until business confirms.

---

## 10. Implementation decision (post-audit)

Introduce additive tables for modular assessments; implement SED end-to-end from beneficiary rows; scaffold ED / Supplier Development / MC with mapping + validation; add EAP target admin with demographic keys matching MC engine; keep formulas limited to verified engine math + explicit contextual inputs (NPAT, target %).
