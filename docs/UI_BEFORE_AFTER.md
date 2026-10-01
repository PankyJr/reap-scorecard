# Interface: before and after

Every screen, before and after the final pass, at desktop width (1440) and on
a phone (390). Each comes with a short note on what changed and why, and the
commit to revert if it ever needs undoing. Long pages are cut at the bottom.
The full-length screenshots are in the walkthrough output. Pictures are
compressed JPGs; the data is fictional.

To undo a change: `git revert <commit>`. Each commit is one change, and none
of them touches the scoring maths.

## The changes that apply to every screen

| Change | Why | Commit |
|---|---|---|
| One design-token file (`src/app/tokens.css`): colours, radii, Public Sans body text at 16px, Source Serif 4 titles | One consistent look. Text is larger and easier to read | `9b2ccdf`, `a56ce69` |
| Shared page header, panels, notices, progress steps, level ladder, and tap-to-explain for B-BBEE terms | The same patterns everywhere, so a user learns them once | `32a2661` |
| The same five places in the menu, one Start new button, and a menu button on phones | Before, there was no navigation on a phone | `072c310` |
| Plain error and not-found pages | Before, a failure showed the framework's error page | `d8c2d98` |
| Delete always asks once, says exactly what goes, and has a red final button | Consistent and safe | `1b2d6e6`, `232c819` |
| Accessibility: links keep their role; buttons are named by the words they show | Screen readers and voice control | `de3e7b4`, `740dee7`, `3f27a21` |

## Sign in

The sign-in page showed invented statistics. It now shows the three real steps and the level ladder. The button says "Sign in".

Revert: `git revert 4583d3e`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/sign-in-page-1440.jpg) | ![after](ui/after/sign-in-page-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/sign-in-page-390.jpg) | ![after](ui/after/sign-in-page-390.jpg) |

## Create account

Same restyle; the fields and checks are unchanged.

Revert: `git revert 4583d3e`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/sign-up-form-1440.jpg) | ![after](ui/after/sign-up-form-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/sign-up-form-390.jpg) | ![after](ui/after/sign-up-form-390.jpg) |

## Choose a new password

Same restyle.

Revert: `git revert 4583d3e`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/reset-password-1440.jpg) | ![after](ui/after/reset-password-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/reset-password-390.jpg) | ![after](ui/after/reset-password-390.jpg) |

## Home, first visit

Led with a setup checklist and empty charts. Now one dark box says the single next thing to do.

Revert: `git revert 8879edf`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/home-first-visit-1440.jpg) | ![after](ui/after/home-first-visit-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/home-first-visit-390.jpg) | ![after](ui/after/home-first-visit-390.jpg) |

## Home with work

Now: next thing to do, your companies with each assessment's status, then recent work. Level overview counts final levels only.

Revert: `git revert 8879edf`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/home-with-work-1440.jpg) | ![after](ui/after/home-with-work-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/home-with-work-390.jpg) | ![after](ui/after/home-with-work-390.jpg) |

## Start new

New. One starting point: full scorecard or procurement only, each explained in one sentence.

Revert: `git revert 5a90bfd`

| Desktop, before | Desktop, after |
|---|---|
| (new screen) | ![after](ui/after/start-new-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| (new screen) | ![after](ui/after/start-new-390.jpg) |

## Pick the company

New. Choose a company or add one; you carry straight on.

Revert: `git revert 5a90bfd`

| Desktop, before | Desktop, after |
|---|---|
| (new screen) | ![after](ui/after/start-full-pick-company-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| (new screen) | ![after](ui/after/start-full-pick-company-390.jpg) |

## Add a company

Only the name is required; everything else is marked optional. Returns you to where you started.

Revert: `git revert d465aaf`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/company-new-1440.jpg) | ![after](ui/after/company-new-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/company-new-390.jpg) | ![after](ui/after/company-new-390.jpg) |

## Companies

Each company shows its latest full-scorecard and procurement status.

Revert: `git revert 9786893`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/companies-1440.jpg) | ![after](ui/after/companies-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/companies-390.jpg) | ![after](ui/after/companies-390.jpg) |

## Company

Leads with the company's scorecards and one Start button. Contact details are secondary.

Revert: `git revert 4506506`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/company-1440.jpg) | ![after](ui/after/company-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/company-390.jpg) | ![after](ui/after/company-390.jpg) |

## Edit company

Same form as Add, with a saved message.

Revert: `git revert d465aaf`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/company-edit-1440.jpg) | ![after](ui/after/company-edit-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/company-edit-390.jpg) | ![after](ui/after/company-edit-390.jpg) |

## Full scorecards list

New list of every full scorecard. Older tools sit under More.

Revert: `git revert 072c310`

| Desktop, before | Desktop, after |
|---|---|
| (new screen) | ![after](ui/after/full-scorecards-list-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| (new screen) | ![after](ui/after/full-scorecards-list-390.jpg) |

## Procurement list

New list of every procurement scorecard.

Revert: `git revert 072c310`

| Desktop, before | Desktop, after |
|---|---|
| (new screen) | ![after](ui/after/procurement-list-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| (new screen) | ![after](ui/after/procurement-list-390.jpg) |

## New full scorecard

Two fields and the progress steps. Other calculator modes moved under More.

Revert: `git revert e589398`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/scorecard-new-1440.jpg) | ![after](ui/after/scorecard-new-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/scorecard-new-390.jpg) | ![after](ui/after/scorecard-new-390.jpg) |

## Upload workbook

The overview now leads with the progress steps and one upload box.

Revert: `git revert 9ce6f10`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/scorecard-upload-1440.jpg) | ![after](ui/after/scorecard-upload-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/scorecard-upload-390.jpg) | ![after](ui/after/scorecard-upload-390.jpg) |

## File refused

Before: a text file was accepted and shown as "1 of 22 sheets". Now refused with one plain sentence.

Revert: `git revert 653059d`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/scorecard-upload-refused-1440.jpg) | ![after](ui/after/scorecard-upload-refused-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| (new screen) | ![after](ui/after/scorecard-upload-refused-390.jpg) |

## Check imported data

One summary and one row per workbook section, instead of long tables. Full detail under More.

Revert: `git revert 18a3ce0`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/workbook-check-1440.jpg) | ![after](ui/after/workbook-check-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/workbook-check-390.jpg) | ![after](ui/after/workbook-check-390.jpg) |

## Overview after import

Level so far, the next step, and one blocking item per element.

Revert: `git revert 9ce6f10`

| Desktop, before | Desktop, after |
|---|---|
| (new screen) | ![after](ui/after/workbook-imported-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| (new screen) | ![after](ui/after/workbook-imported-390.jpg) |

## Company size and sector

Plain title; turnover bands explained beside the field.

Revert: `git revert 124029b`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/element-size-and-sector-1440.jpg) | ![after](ui/after/element-size-and-sector-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/element-size-and-sector-390.jpg) | ![after](ui/after/element-size-and-sector-390.jpg) |

## Financial figures

Points and what is still needed first; overrides under More.

Revert: `git revert 124029b`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/financial-figures-1440.jpg) | ![after](ui/after/financial-figures-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/financial-figures-390.jpg) | ![after](ui/after/financial-figures-390.jpg) |

## Ownership

Same pattern on every element page.

Revert: `git revert 124029b`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/element-ownership-1440.jpg) | ![after](ui/after/element-ownership-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/element-ownership-390.jpg) | ![after](ui/after/element-ownership-390.jpg) |

## Management control

Same pattern; EAP explained in place.

Revert: `git revert 124029b`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/element-management-control-1440.jpg) | ![after](ui/after/element-management-control-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/element-management-control-390.jpg) | ![after](ui/after/element-management-control-390.jpg) |

## Skills development

The four gates are plain yes/no questions at the top.

Revert: `git revert 124029b`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/element-skills-development-1440.jpg) | ![after](ui/after/element-skills-development-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/element-skills-development-390.jpg) | ![after](ui/after/element-skills-development-390.jpg) |

## Procurement element

Attach in one step, or create a procurement scorecard and come back. Explains why 29 becomes at most 27.

Revert: `git revert 1fdcf79`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/procurement-attached-1440.jpg) | ![after](ui/after/procurement-attached-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/procurement-attached-390.jpg) | ![after](ui/after/procurement-attached-390.jpg) |

## Enterprise development

Each record shows its evidence state; confirming is one field and one tick.

Revert: `git revert 124029b`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/element-enterprise-development-confirmed-1440.jpg) | ![after](ui/after/element-enterprise-development-confirmed-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/element-enterprise-development-confirmed-390.jpg) | ![after](ui/after/element-enterprise-development-confirmed-390.jpg) |

## Supplier development

As above.

Revert: `git revert 124029b`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/element-supplier-development-confirmed-1440.jpg) | ![after](ui/after/element-supplier-development-confirmed-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/element-supplier-development-confirmed-390.jpg) | ![after](ui/after/element-supplier-development-confirmed-390.jpg) |

## Socio-economic development

As above.

Revert: `git revert 124029b`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/element-socio-economic-development-confirmed-1440.jpg) | ![after](ui/after/element-socio-economic-development-confirmed-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/element-socio-economic-development-confirmed-390.jpg) | ![after](ui/after/element-socio-economic-development-confirmed-390.jpg) |

## Calculate

Leads with the Calculate button; every missing item links to where it is fixed.

Revert: `git revert 6a88727`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/calculate-before-1440.jpg) | ![after](ui/after/calculate-before-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/calculate-before-390.jpg) | ![after](ui/after/calculate-before-390.jpg) |

## Result

Leads with the level on a 1 to 8 ladder, then points by element; workings folded away. One calculation gives the final level (de6c85c).

Revert: `git revert aa6ea9c`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/result-final-level-1440.jpg) | ![after](ui/after/result-final-level-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/result-final-level-390.jpg) | ![after](ui/after/result-final-level-390.jpg) |

## Scorecard report

Leads with the level, a points table in scorecard order and the sub-minimums.

Revert: `git revert 2b51ff2`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/scorecard-report-1440.jpg) | ![after](ui/after/scorecard-report-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/scorecard-report-390.jpg) | ![after](ui/after/scorecard-report-390.jpg) |

## New procurement, total spend

One long form became two guided steps: Total spend, then Suppliers.

Revert: `git revert 82d8f18`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/procurement-only-total-spend-1440.jpg) | ![after](ui/after/procurement-only-total-spend-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/procurement-only-total-spend-390.jpg) | ![after](ui/after/procurement-only-total-spend-390.jpg) |

## New procurement, suppliers

Step two: paste, import or add suppliers; the score updates as you go.

Revert: `git revert 82d8f18`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/procurement-only-suppliers-1440.jpg) | ![after](ui/after/procurement-only-suppliers-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/procurement-only-suppliers-390.jpg) | ![after](ui/after/procurement-only-suppliers-390.jpg) |

## Procurement result

Score and categories first; full breakdown under More. "Procurement rating (not the B-BBEE level)".

Revert: `git revert 35c9c4b`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/procurement-result-1440.jpg) | ![after](ui/after/procurement-result-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/procurement-result-390.jpg) | ![after](ui/after/procurement-result-390.jpg) |

## Edit procurement

Same two steps as creating.

Revert: `git revert 82d8f18`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/procurement-edit-1440.jpg) | ![after](ui/after/procurement-edit-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/procurement-edit-390.jpg) | ![after](ui/after/procurement-edit-390.jpg) |

## Procurement report

Design tokens only; the report layout is unchanged.

Revert: `git revert a56ce69`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/procurement-report-1440.jpg) | ![after](ui/after/procurement-report-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/procurement-report-390.jpg) | ![after](ui/after/procurement-report-390.jpg) |

## Delete confirmation

One confirmation everywhere that says exactly what goes and that it is final.

Revert: `git revert 1b2d6e6`

| Desktop, before | Desktop, after |
|---|---|
| (new screen) | ![after](ui/after/procurement-delete-confirm-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| (new screen) | ![after](ui/after/procurement-delete-confirm-390.jpg) |

## Activity

Design tokens only.

Revert: `git revert a56ce69`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/activity-1440.jpg) | ![after](ui/after/activity-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/activity-390.jpg) | ![after](ui/after/activity-390.jpg) |

## Settings, profile

Design tokens only.

Revert: `git revert a56ce69`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/settings-profile-1440.jpg) | ![after](ui/after/settings-profile-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/settings-profile-390.jpg) | ![after](ui/after/settings-profile-390.jpg) |

## Settings, account

Design tokens only.

Revert: `git revert a56ce69`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/settings-account-1440.jpg) | ![after](ui/after/settings-account-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/settings-account-390.jpg) | ![after](ui/after/settings-account-390.jpg) |

## Settings, help

Explains the journey start to finish and every B-BBEE word.

Revert: `git revert 56b2e9c`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/settings-help-1440.jpg) | ![after](ui/after/settings-help-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/settings-help-390.jpg) | ![after](ui/after/settings-help-390.jpg) |

## Settings, legal

Design tokens only.

Revert: `git revert a56ce69`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/settings-legal-1440.jpg) | ![after](ui/after/settings-legal-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/settings-legal-390.jpg) | ![after](ui/after/settings-legal-390.jpg) |

## Workforce targets (staff)

Plain words and In use / Draft / Replaced labels.

Revert: `git revert 2c3ee29`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/staff-workforce-targets-1440.jpg) | ![after](ui/after/staff-workforce-targets-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/staff-workforce-targets-390.jpg) | ![after](ui/after/staff-workforce-targets-390.jpg) |

## Workforce target set (staff)

Six population-share percentages, the shape the scorecard reads. Before, the screen saved a shape the scorecard rejected.

Revert: `git revert 0f3fbaf`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/staff-workforce-targets-active-1440.jpg) | ![after](ui/after/staff-workforce-targets-active-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/staff-workforce-targets-active-390.jpg) | ![after](ui/after/staff-workforce-targets-active-390.jpg) |

## Admin overview (staff)

No false "Live production" label; full scorecards counted.

Revert: `git revert 9162ed2`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/admin-overview-1440.jpg) | ![after](ui/after/admin-overview-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/admin-overview-390.jpg) | ![after](ui/after/admin-overview-390.jpg) |

## Admin companies (staff)

Fits a 390px phone with no sideways scroll.

Revert: `git revert a3444c5`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/admin-companies-1440.jpg) | ![after](ui/after/admin-companies-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/admin-companies-390.jpg) | ![after](ui/after/admin-companies-390.jpg) |

## Admin company (staff)

Lists the company's full scorecards too.

Revert: `git revert 9162ed2`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/admin-company-1440.jpg) | ![after](ui/after/admin-company-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/admin-company-390.jpg) | ![after](ui/after/admin-company-390.jpg) |

## Admin procurement (staff)

Fits a phone.

Revert: `git revert a3444c5`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/admin-procurement-1440.jpg) | ![after](ui/after/admin-procurement-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/admin-procurement-390.jpg) | ![after](ui/after/admin-procurement-390.jpg) |

## Older: modular calculator

Still works; reached from More.

Revert: `git revert e589398`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/older-modular-new-1440.jpg) | ![after](ui/after/older-modular-new-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/older-modular-new-390.jpg) | ![after](ui/after/older-modular-new-390.jpg) |

## Older: manual scorecard

Still works; reached from More.

Revert: `git revert e589398`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/older-legacy-new-1440.jpg) | ![after](ui/after/older-legacy-new-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/older-legacy-new-390.jpg) | ![after](ui/after/older-legacy-new-390.jpg) |

## Older: full-workbook calculator

Still works; its link to the new scorecard now uses the right company.

Revert: `git revert 2312592`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/older-full-workbook-new-1440.jpg) | ![after](ui/after/older-full-workbook-new-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/older-full-workbook-new-390.jpg) | ![after](ui/after/older-full-workbook-new-390.jpg) |
