# Generic Scorecard Parity Report

**Workbook SHA-256:** `93494e2916e21ad88072a074edadc75d351db6f28c10222463df8de641168fc0`  
**Rule set:** `generic-codes-2019-v1`  
**Inventory:** `src/lib/scorecard/rules/generic-2019/workbook-rule-inventory.ts`

Every workbook scoring formula is classified into one of:

| Classification | Meaning |
| --- | --- |
| `exact_parity` | Workbook formula matches the gazetted rule and is reproduced |
| `corrected_workbook_defect` | Workbook is wrong or broken; engine corrects it |
| `replaced_with_official_rule` | Workbook conflicts with a gazette; gazette wins |
| `requires_reap_confirmation` | Logic exists but needs REAP sign-off before operative use |
| `excluded_demonstration_data` | Example/demo rows must never become client data |
| `unsupported_or_orphaned` | Formula is unused, broken, or orphaned |

## Documented defects (must remain explicit)

| Finding | Classification |
| --- | --- |
| 205 cached `#DIV/0!` cells | `corrected_workbook_defect` |
| Ownership demonstration data | `excluded_demonstration_data` |
| Procurement demonstration data | `excluded_demonstration_data` |
| Broken NPAT result formula (`NPAT Calculation!B27 = B23`) | `corrected_workbook_defect` |
| Broken ED & SD total formula (`ED & SD!C17`) | `corrected_workbook_defect` |
| Orphan 2-point “11% more new jobs” ESD row | `unsupported_or_orphaned` |
| Hardcoded EAP data (43.5% / 4.6% / 1.7% / 37.5% / 4.2% / 1.0%) | `replaced_with_official_rule` |
| Static level table on Summary | `corrected_workbook_defect` |
| Missing priority discounting | `replaced_with_official_rule` |
| Broken `#REF!` defined name | `unsupported_or_orphaned` |
| No external workbook references | confirmed |
| No hidden sheets | confirmed |
| No macros | confirmed |

## Indicator-level summary

| Element | Exact / corrected / replaced | Notes |
| --- | --- | --- |
| Ownership | Mix of exact and replaced | Plus-one-vote approximation documented; Net Value captured, not modelled |
| Management Control | Corrected | Blank denominators → missing inputs; EAP from target sets |
| Skills Development | Replaced / corrected | Absorption, F&G/admin caps, eligibility gates |
| Preferential Procurement | Exact targets; demo excluded | Frozen snapshot from Formal Procurement Assessment |
| Enterprise Development | Corrected | Benefit-factor matrix; orphan jobs row excluded |
| Supplier Development | Corrected | Separate from Skills; graduation bonus only |
| Socio-Economic Development | Corrected / confirmation | `Claimed` preserved unscored |
| Levels / discounting | Replaced | Dynamic bands; one-level discount |

## How to regenerate the inventory view

```bash
npx vitest run src/lib/scorecard/generic/__tests__/rule-set.test.ts
```

The rule-set tests assert that:

- every engine indicator appears in the workbook inventory
- every inventory `indicatorKey` resolves to a real rule
- demonstration data and the orphan ESD row remain excluded
- the workbook fingerprint (22 sheets, 633 formulas, 205 errors) is unchanged

## Product stance

Where the workbook and a gazetted source conflict, the gazetted source wins, the conflict is recorded on the rule set, and a regression test locks the resolution. The product is an internal calculator and readiness tool — not a B-BBEE certificate issuer.
