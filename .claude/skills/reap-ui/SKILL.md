---
name: reap-ui
description: REAP Scorecard UI design system and restructure rules — load for any UI, screen, component, or copy work in this repo.
---

# REAP Scorecard — UI design system

Load this before touching any screen, component, layout or user-facing string
in this repo.

## Hard constraint

**The scoring engine, the extractors and the rule set are NEVER modified in UI
work.** That means no changes to:

- `src/lib/scorecard/generic/**` (except `ux/` copy)
- `src/lib/scorecard/full/extractors/**`, `metric-definitions.ts`
- `src/lib/scorecard/calculator/elements/**/import.ts`
- `src/lib/scorecard/rules/**`
- `aggregate.ts`, `scoring.ts`, any migration

**The golden tests must pass after every phase.** `npm test` — the golden
workbook suite pins exact points, levels and sub-minimum outcomes. If a UI
change moves a number, the change is wrong. Run the suite before reporting
done, every time.

## Terminology — one concept, one name

The product used five words for the same thing. Fixed in phase 2; keep it
fixed.

| Use | Never use | Notes |
|---|---|---|
| **Assessment** | workspace, calculation, calculator (as a noun) | The thing a consultant builds. The noun everywhere. |
| **Workbook** | spreadsheet, file, import | Only the thing you upload. |
| **Calculate** | compute, run, generate | Only the verb on the button. |
| **Element** | pillar, section, category | The seven scored areas. |
| **Indicator** | line, criterion, row | A scored line inside an element. |
| **Priority sub-minimum** | priority-element outcome, sub-min | One name, on every screen. |
| **Contribution** | beneficiary (for the record) | The record is a contribution; `Beneficiary name` is a field on it. Lists say "Contributions". |

Routes, DB columns, TypeScript types and function names keep their existing
names — renaming those is not a copy change and is out of scope for UI work.

## Structure — the 3-layer model

1. **Assessment Hub** — one screen answering "where am I, what is my level,
   what is blocking it". Element cards, level, readiness.
2. **Element detail** — one element, its indicators, its inputs.
3. **In-context blocking items** — whatever is stopping *this* element,
   resolved without leaving it.

Rules:

- An element card shows **status + points + exactly ONE blocking item**. Not a
  list of everything wrong.
- **The level/outcome is never below the fold on the Hub.**
- **No screen taller than ~2 viewport heights** without a summary-first
  collapse. Measured at 1440×900. The Result page was 6,199 px (~7 screens)
  and 12,712 px on mobile — that is the failure mode to design away from.
- **The sidebar is 5 items**: Dashboard, Companies, Assessments, Procurement,
  Settings.

## The legs rule

**Every "X required" message links directly to where X is entered, in
context.** Never make the user go and find it.

Reference implementation: the inline NPAT prompt on the ED/SD/SED element
screens (walkthrough step C02 → C03). The element says NPAT is required,
offers the field right there, saves it without disturbing the other financial
inputs, and the tiles update in place.

Known offenders still to fix: EAP targets (element → `/settings/eap-targets`),
skills gates (blocking 20 points, unlinked from readiness), procurement
attachment (a different top-level nav item).

## No silent redirects

A route that redirects must say why on arrival. A retired route gets a small
page explaining what it was and linking to where the work moved. Fixed in
phase 2 for `/scorecard/upload` and `/scorecards/full/new`; hold the line.

## Two states, always

Every screen that renders a result must handle **not yet calculated** as a
first-class state, not an exception. The `/report` page crashed for months
because it assumed a calculated result and called an adapter registry that
throws on five of the seven element keys.

Every page needs a way out. `/report` had zero links.

## Phase plan

| Phase | Scope | Status |
|---|---|---|
| 1 | `/report` crash, route hygiene | done |
| 2 | Terminology unification | done |
| 3 | **Assessment Hub** — collapse the 5-stage stepper + element list into one hub | next |
| 4 | Element declutter — one blocking item per card, cut competing elements (MC 64, Skills 61) | |
| 5 | Nav + dashboard — 5-item sidebar, dashboard that leads somewhere | |
| 6 | Legs — every blocking message gets an in-context resolution | |
| 7 | Result summary + mobile — summary-first Result, mobile passes | |

## Reference material

- `artifacts/walkthrough-capture/reap-ux-walkthrough.pdf` — 53 screens, every
  journey, with competing-element counts and the friction list. This is the
  redesign brief; read it before phase 3.
- `artifacts/walkthrough-capture/capture.json` — the same data structured, per
  screen: URL, actions, clicks-from-login, element counts, scroll height.

## Measurements worth keeping honest

Captured at commit `96ab893`, 1440×900:

- Core journey login → level visible: **20 clicks** (11 of them visiting
  element screens one at a time).
- **42 of 48** desktop screens require scrolling.
- Highest competing-element counts: Management Control **64**, Skills
  Development **61**, Result **49**.

Re-measure after each phase rather than assuming an improvement.
