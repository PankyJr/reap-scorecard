# Before and after

Two rounds of changes are recorded here: the final pass (October 2026) first, then the
earlier redesign it builds on.

# The final pass (October 2026)

**For:** whoever reviews or undoes a change from the final pass (October 2026).

Each screen below has a picture from before the pass and one from after, at
laptop size (1440 × 900) and phone size (390 px wide). Long pages are cut at
the bottom. The pictures are compressed JPGs:

- before: `docs/ui/pass2-before/`, taken at `d8c2eec`
- after: `docs/ui/pass2-after/`

They show the staging review login's two sample companies: **Golden Sample
Manufacturing** (finished, Level 4) and **Halfway Logistics** (workbook
imported, still in progress). To take them again:

```bash
PLAYWRIGHT_DIR=<folder with node_modules/playwright> \
VERIFY_BASE_URL=http://localhost:3005 \
  node scripts/capture-ui-screens.mjs docs/ui/<folder>
```

**Undoing a change.** Each screen lists the commits that changed it, oldest
first. To undo one, run `git revert <commit>` on a branch. If a later commit
built on it, revert the later one first (newest first). The scoring maths was
not changed by any of these commits, and the golden benchmark (54.69; ED 3.63,
SD 7.25, SED 3.00) passes after each of them.

---

## Home

| Before | After |
|---|---|
| ![Home before, laptop](ui/pass2-before/home-1440.jpg) | ![Home after, laptop](ui/pass2-after/home-1440.jpg) |
| ![Home before, phone](ui/pass2-before/home-390.jpg) | ![Home after, phone](ui/pass2-after/home-390.jpg) |

One "Next step" card with one button ("Add your first company" for a new
user). A list of companies with each one's size, standing ("Level 4" or "In
progress, 5 of 7 areas done"), last update and one button. Two quick actions,
and recent reports to download again. REAP admins see every client with a
"Needs attention" filter.

- `e6450b6` the new Home
- `79bc1a8` procurement shown as points of 25 with the bonus apart
- `6610393` a company's size comes from its latest scorecard when its details have none

## Companies list and a company's page

| Before | After |
|---|---|
| ![Companies before](ui/pass2-before/companies-1440.jpg) | ![Companies after](ui/pass2-after/companies-1440.jpg) |
| ![Company before](ui/pass2-before/company-golden-1440.jpg) | ![Company after](ui/pass2-after/company-golden-1440.jpg) |

- `d27a3bc` procurement as "25.00 of 25 points", not "/ 29"
- `79bc1a8` the company's scorecards list in the same words

## Add a company

| Before | After |
|---|---|
| ![Add a company before, laptop](ui/pass2-before/company-new-1440.jpg) | ![Add a company after, laptop](ui/pass2-after/company-new-1440.jpg) |
| ![Add a company before, phone](ui/pass2-before/company-new-390.jpg) | ![Add a company after, phone](ui/pass2-after/company-new-390.jpg) |

Five details: name, industry (a plain list), financial year end, turnover and
black ownership; contact details are optional. The size appears as you type
("You're a QSE …"), worked out by the engine's rules. When the codes give an
automatic level it says "You may not need a full scorecard" and to confirm
with the verification agency. Saving goes straight to "What do you need?".

- `76d2964` the three new company columns (database migration, additive)
- `1402169` size from the engine, the industry list
- `5a959d3` the new form
- `1726f01` the form checker the add and edit pages use
- `4be9da8` no example figures inside the boxes

## What do you need?

| Before | After |
|---|---|
| ![Start before](ui/pass2-before/start-1440.jpg) | ![Start after](ui/pass2-after/start-1440.jpg) |
| ![Start for a company before, phone](ui/pass2-before/start-full-390.jpg) | ![Start for a company after, phone](ui/pass2-after/start-full-390.jpg) |

It asks for the company first, then shows two cards in the same layout (Full
B-BBEE scorecard; Procurement only) with "Not sure? Start with procurement."
underneath. The second picture is the new-scorecard page that the full
scorecard card leads to.

- `901bdc7` the two cards
- `92a1f98` a new scorecard starts with last year's size and ownership, and the right year

## The full scorecard: overview

| Before | After |
|---|---|
| ![Halfway scorecard before, laptop](ui/pass2-before/scorecard-halfway-1440.jpg) | ![Halfway scorecard after, laptop](ui/pass2-after/scorecard-halfway-1440.jpg) |
| ![Halfway scorecard before, phone](ui/pass2-before/scorecard-halfway-390.jpg) | ![Halfway scorecard after, phone](ui/pass2-after/scorecard-halfway-390.jpg) |
| ![Golden scorecard before](ui/pass2-before/scorecard-golden-1440.jpg) | ![Golden scorecard after](ui/pass2-after/scorecard-golden-1440.jpg) |

"Upload your workbook" (marked Quick) or "Or fill it in by hand". After an
upload: "We filled in 6 of the 6 areas a workbook covers." A checklist of the
seven areas (a sidebar on a laptop, on top on a phone), each with its status,
points and a thin bar. The live score bar stays in view (pinned to the bottom
on a phone) and names any priority area that dropped the level. One button to
the next unfinished area.

- `9ae7749` checklist, live score and lost points from the engine
- `878bb77` the workspace: checklist, live score, saves as you type
- `0b1dc66` the score bar never covers the checklist
- `76d3a7a` a new scorecard still offers "Upload your workbook"
- `6a4a151` the upload states the real size limit and checks it at once
- `436f9a0` a damaged workbook gets a plain message

## An area

| Before | After |
|---|---|
| ![Ownership before, laptop](ui/pass2-before/area-ownership-1440.jpg) | ![Ownership after, laptop](ui/pass2-after/area-ownership-1440.jpg) |
| ![Ownership before, phone](ui/pass2-before/area-ownership-390.jpg) | ![Ownership after, phone](ui/pass2-after/area-ownership-390.jpg) |
| ![Management control before](ui/pass2-before/area-management-control-1440.jpg) | ![Management control after](ui/pass2-after/area-management-control-1440.jpg) |
| ![Skills before](ui/pass2-before/area-skills-1440.jpg) | ![Skills after](ui/pass2-after/area-skills-1440.jpg) |
| ![Enterprise development before](ui/pass2-before/area-enterprise-development-1440.jpg) | ![Enterprise development after](ui/pass2-after/area-enterprise-development-1440.jpg) |

Each area: what it measures in one sentence, points so far, the minimum for a
priority area ("You need at least 3.20 points here or you drop a level"),
"Where you're losing points", then 2 to 4 short sections, each showing what
it is worth. Every field has a one-line explanation and an example; values
from the workbook are tagged; "Is that right?" checks sit next to fields.
Saves as you type, with "Done, next area" at the end. On a phone the area is
full screen with a back link.

- `878bb77` the workspace and area pages
- `49c8584` a percentage is always typed as a whole number (30 means 30%)
- `c9a8dd2` "is that right?" checks
- `1b45528` "area" on screen for what the codes call an element
- `a1d7065` the socio-economic development note says how much of a contribution counts
- `d7d913e` plain sentences instead of formulas in "Where you're losing points"

## Review

| Before | After |
|---|---|
| ![Review before](ui/pass2-before/scorecard-review-1440.jpg) | ![Review after](ui/pass2-after/scorecard-review-1440.jpg) |

Titled "Review my scorecard".

- `878bb77`

## Final result

| Before | After |
|---|---|
| ![Result before, laptop](ui/pass2-before/result-golden-1440.jpg) | ![Result after, laptop](ui/pass2-after/result-golden-1440.jpg) |
| ![Result before, phone](ui/pass2-before/result-golden-390.jpg) | ![Result after, phone](ui/pass2-after/result-golden-390.jpg) |

The level in large type, points plus bonus and the recognition percentage,
one plain sentence ("Your company is a Level 4 contributor. Clients can claim
100% of what they spend with you."), any sub-minimum warning directly under
it, a bar per area (red: dropped the level; amber: under half its points;
green: half or more), the top three places to gain points, and Download
report, Printable version, Edit data and (when there is one) Compare with
last year. Company, size, date and "Draft, not a verified B-BBEE
certificate".

- `e7f1b9c` the new result page
- `d7d913e` plain sentences instead of formulas in "Where to gain points"

## Reports and PDFs

| Before | After |
|---|---|
| ![Report before](ui/pass2-before/report-golden-1440.jpg) | ![Report after](ui/pass2-after/report-golden-1440.jpg) |
| ![Procurement report before](ui/pass2-before/procurement-report-1440.jpg) | ![Procurement report after](ui/pass2-after/procurement-report-1440.jpg) |

PDFs are now drawn on the server with pdf-lib, which runs on Netlify.

- `605e64c`, `8ac7bc3`, `aa6af77`, `914d93c` the PDF generators and routes
- `e1719ed` every Download PDF button uses them
- `e12b09d` the older manual scorecard's PDF works on Netlify
- `2a079aa` full-workbook reports offer print-to-PDF
- `bfd78a5` the procurement PDF lists every supplier, not only the first 1,000
- `c423056` the procurement PDF counts points of 25 with the bonus apart
- `51b82c4`, `d282587` the printable report: points of 25, no placeholder "rating"

## Procurement only

| Before | After |
|---|---|
| ![New procurement before, laptop](ui/pass2-before/procurement-new-1440.jpg) | ![New procurement after, laptop](ui/pass2-after/procurement-new-1440.jpg) |
| ![New procurement before, phone](ui/pass2-before/procurement-new-390.jpg) | ![New procurement after, phone](ui/pass2-after/procurement-new-390.jpg) |
| ![Procurement score before, laptop](ui/pass2-before/procurement-result-1440.jpg) | ![Procurement score after, laptop](ui/pass2-after/procurement-result-1440.jpg) |
| ![Procurement score before, phone](ui/pass2-before/procurement-result-390.jpg) | ![Procurement score after, phone](ui/pass2-after/procurement-result-390.jpg) |

Suppliers first (Excel or CSV, or by hand, with a template), then "Check
suppliers" (Needs attention with one-click fixes, expired certificates first),
then total spend, then the score: points of 25 with the bonus apart, the
biggest gap in one sentence, one row per indicator with its target and a
thin bar, and the suppliers behind each row.

- `c17887f` points of 25 with the bonus apart
- `148861a` Needs attention with one-click fixes
- `09d882b`, `2ae1df0`, `89b6726` CSV, more columns, the template
- `40e1855`, `ba3174f`, `adbfca9`, `ae46892`, `6efa616`, `92a8998` large lists (8,000 suppliers)
- `8ca855f` continue to a full scorecard with procurement attached
- `1bbe3ea` "Keep both" is remembered (database migration, additive)
- `c4c1150` the new step order
- `b4b909e` the plain QSE/EME notice
- `1582c7c` the score page
- `9f325bd` each fix says what it did
- `3d710f5`, `8e41c2e`, `2a9f531` the same points wording everywhere; year-on-year in points
- `68084e4` failed saves in plain words
- `89f6b5c` keyboard-reachable tables, no faded text
- `49cee85` at the 25-point maximum it no longer claims every target is met

## Across every screen

- `5f4a4aa` faint grey text is readable (4.6:1 or better)
- `d80eb43` "Skip to content" is the first Tab stop, on phones too
- `e074f3d`, `6b4d3f0` sign-in and e-mail links work on phones
- `4cf6f66` browser security headers

---

# The earlier redesign

Every screen, before and after the final pass, at desktop width (1440) and on
a phone (390). Each comes with a short note on what changed and why, and the
commit to revert if it ever needs undoing. Long pages are cut at the bottom.
The full-length screenshots are in the walkthrough output. Pictures are
compressed JPGs; the data is fictional.

To undo a change: `git revert <commit>`. Each commit is one change, and none
of them touches the scoring maths.

### The changes that apply to every screen

| Change | Why | Commit |
|---|---|---|
| One design-token file (`src/app/tokens.css`): colours, radii, Public Sans body text at 16px, Source Serif 4 titles | One consistent look. Text is larger and easier to read | `9b2ccdf`, `a56ce69` |
| Shared page header, panels, notices, progress steps, level ladder, and tap-to-explain for B-BBEE terms | The same patterns everywhere, so a user learns them once | `32a2661` |
| The same five places in the menu, one Start new button, and a menu button on phones | Before, there was no navigation on a phone | `072c310` |
| Plain error and not-found pages | Before, a failure showed the framework's error page | `d8c2d98` |
| Delete always asks once, says exactly what goes, and has a red final button | Consistent and safe | `1b2d6e6`, `232c819` |
| Accessibility: links keep their role; buttons are named by the words they show | Screen readers and voice control | `de3e7b4`, `740dee7`, `3f27a21` |

### Sign in

The sign-in page showed invented statistics. It now shows the three real steps and the level ladder. The button says "Sign in".

Revert: `git revert 4583d3e`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/sign-in-page-1440.jpg) | ![after](ui/after/sign-in-page-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/sign-in-page-390.jpg) | ![after](ui/after/sign-in-page-390.jpg) |

### Create account

Same restyle; the fields and checks are unchanged.

Revert: `git revert 4583d3e`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/sign-up-form-1440.jpg) | ![after](ui/after/sign-up-form-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/sign-up-form-390.jpg) | ![after](ui/after/sign-up-form-390.jpg) |

### Choose a new password

Same restyle.

Revert: `git revert 4583d3e`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/reset-password-1440.jpg) | ![after](ui/after/reset-password-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/reset-password-390.jpg) | ![after](ui/after/reset-password-390.jpg) |

### Home, first visit

Led with a setup checklist and empty charts. Now one dark box says the single next thing to do.

Revert: `git revert 8879edf`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/home-first-visit-1440.jpg) | ![after](ui/after/home-first-visit-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/home-first-visit-390.jpg) | ![after](ui/after/home-first-visit-390.jpg) |

### Home with work

Now: next thing to do, your companies with each assessment's status, then recent work. Level overview counts final levels only.

Revert: `git revert 8879edf`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/home-with-work-1440.jpg) | ![after](ui/after/home-with-work-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/home-with-work-390.jpg) | ![after](ui/after/home-with-work-390.jpg) |

### Start new

New. One starting point: full scorecard or procurement only, each explained in one sentence.

Revert: `git revert 5a90bfd`

| Desktop, before | Desktop, after |
|---|---|
| (new screen) | ![after](ui/after/start-new-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| (new screen) | ![after](ui/after/start-new-390.jpg) |

### Pick the company

New. Choose a company or add one; you carry straight on.

Revert: `git revert 5a90bfd`

| Desktop, before | Desktop, after |
|---|---|
| (new screen) | ![after](ui/after/start-full-pick-company-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| (new screen) | ![after](ui/after/start-full-pick-company-390.jpg) |

### Add a company

Only the name is required; everything else is marked optional. Returns you to where you started.

Revert: `git revert d465aaf`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/company-new-1440.jpg) | ![after](ui/after/company-new-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/company-new-390.jpg) | ![after](ui/after/company-new-390.jpg) |

### Companies

Each company shows its latest full-scorecard and procurement status.

Revert: `git revert 9786893`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/companies-1440.jpg) | ![after](ui/after/companies-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/companies-390.jpg) | ![after](ui/after/companies-390.jpg) |

### Company

Leads with the company's scorecards and one Start button. Contact details are secondary.

Revert: `git revert 4506506`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/company-1440.jpg) | ![after](ui/after/company-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/company-390.jpg) | ![after](ui/after/company-390.jpg) |

### Edit company

Same form as Add, with a saved message.

Revert: `git revert d465aaf`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/company-edit-1440.jpg) | ![after](ui/after/company-edit-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/company-edit-390.jpg) | ![after](ui/after/company-edit-390.jpg) |

### Full scorecards list

New list of every full scorecard. Older tools sit under More.

Revert: `git revert 072c310`

| Desktop, before | Desktop, after |
|---|---|
| (new screen) | ![after](ui/after/full-scorecards-list-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| (new screen) | ![after](ui/after/full-scorecards-list-390.jpg) |

### Procurement list

New list of every procurement scorecard.

Revert: `git revert 072c310`

| Desktop, before | Desktop, after |
|---|---|
| (new screen) | ![after](ui/after/procurement-list-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| (new screen) | ![after](ui/after/procurement-list-390.jpg) |

### New full scorecard

Two fields and the progress steps. Other calculator modes moved under More.

Revert: `git revert e589398`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/scorecard-new-1440.jpg) | ![after](ui/after/scorecard-new-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/scorecard-new-390.jpg) | ![after](ui/after/scorecard-new-390.jpg) |

### Upload workbook

The overview now leads with the progress steps and one upload box.

Revert: `git revert 9ce6f10`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/scorecard-upload-1440.jpg) | ![after](ui/after/scorecard-upload-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/scorecard-upload-390.jpg) | ![after](ui/after/scorecard-upload-390.jpg) |

### File refused

Before: a text file was accepted and shown as "1 of 22 sheets". Now refused with one plain sentence.

Revert: `git revert 653059d`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/scorecard-upload-refused-1440.jpg) | ![after](ui/after/scorecard-upload-refused-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| (new screen) | ![after](ui/after/scorecard-upload-refused-390.jpg) |

### Check imported data

One summary and one row per workbook section, instead of long tables. Full detail under More.

Revert: `git revert 18a3ce0`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/workbook-check-1440.jpg) | ![after](ui/after/workbook-check-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/workbook-check-390.jpg) | ![after](ui/after/workbook-check-390.jpg) |

### Overview after import

Level so far, the next step, and one blocking item per element.

Revert: `git revert 9ce6f10`

| Desktop, before | Desktop, after |
|---|---|
| (new screen) | ![after](ui/after/workbook-imported-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| (new screen) | ![after](ui/after/workbook-imported-390.jpg) |

### Company size and sector

Plain title; turnover bands explained beside the field.

Revert: `git revert 124029b`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/element-size-and-sector-1440.jpg) | ![after](ui/after/element-size-and-sector-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/element-size-and-sector-390.jpg) | ![after](ui/after/element-size-and-sector-390.jpg) |

### Financial figures

Points and what is still needed first; overrides under More.

Revert: `git revert 124029b`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/financial-figures-1440.jpg) | ![after](ui/after/financial-figures-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/financial-figures-390.jpg) | ![after](ui/after/financial-figures-390.jpg) |

### Ownership

Same pattern on every element page.

Revert: `git revert 124029b`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/element-ownership-1440.jpg) | ![after](ui/after/element-ownership-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/element-ownership-390.jpg) | ![after](ui/after/element-ownership-390.jpg) |

### Management control

Same pattern; EAP explained in place.

Revert: `git revert 124029b`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/element-management-control-1440.jpg) | ![after](ui/after/element-management-control-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/element-management-control-390.jpg) | ![after](ui/after/element-management-control-390.jpg) |

### Skills development

The four gates are plain yes/no questions at the top.

Revert: `git revert 124029b`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/element-skills-development-1440.jpg) | ![after](ui/after/element-skills-development-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/element-skills-development-390.jpg) | ![after](ui/after/element-skills-development-390.jpg) |

### Procurement element

Attach in one step, or create a procurement scorecard and come back. Explains why 29 becomes at most 27.

Revert: `git revert 1fdcf79`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/procurement-attached-1440.jpg) | ![after](ui/after/procurement-attached-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/procurement-attached-390.jpg) | ![after](ui/after/procurement-attached-390.jpg) |

### Enterprise development

Each record shows its evidence state; confirming is one field and one tick.

Revert: `git revert 124029b`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/element-enterprise-development-confirmed-1440.jpg) | ![after](ui/after/element-enterprise-development-confirmed-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/element-enterprise-development-confirmed-390.jpg) | ![after](ui/after/element-enterprise-development-confirmed-390.jpg) |

### Supplier development

As above.

Revert: `git revert 124029b`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/element-supplier-development-confirmed-1440.jpg) | ![after](ui/after/element-supplier-development-confirmed-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/element-supplier-development-confirmed-390.jpg) | ![after](ui/after/element-supplier-development-confirmed-390.jpg) |

### Socio-economic development

As above.

Revert: `git revert 124029b`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/element-socio-economic-development-confirmed-1440.jpg) | ![after](ui/after/element-socio-economic-development-confirmed-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/element-socio-economic-development-confirmed-390.jpg) | ![after](ui/after/element-socio-economic-development-confirmed-390.jpg) |

### Calculate

Leads with the Calculate button; every missing item links to where it is fixed.

Revert: `git revert 6a88727`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/calculate-before-1440.jpg) | ![after](ui/after/calculate-before-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/calculate-before-390.jpg) | ![after](ui/after/calculate-before-390.jpg) |

### Result

Leads with the level on a 1 to 8 ladder, then points by element; workings folded away. One calculation gives the final level (de6c85c).

Revert: `git revert aa6ea9c`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/result-final-level-1440.jpg) | ![after](ui/after/result-final-level-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/result-final-level-390.jpg) | ![after](ui/after/result-final-level-390.jpg) |

### Scorecard report

Leads with the level, a points table in scorecard order and the sub-minimums.

Revert: `git revert 2b51ff2`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/scorecard-report-1440.jpg) | ![after](ui/after/scorecard-report-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/scorecard-report-390.jpg) | ![after](ui/after/scorecard-report-390.jpg) |

### New procurement, total spend

One long form became two guided steps: Total spend, then Suppliers.

Revert: `git revert 82d8f18`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/procurement-only-total-spend-1440.jpg) | ![after](ui/after/procurement-only-total-spend-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/procurement-only-total-spend-390.jpg) | ![after](ui/after/procurement-only-total-spend-390.jpg) |

### New procurement, suppliers

Step two: paste, import or add suppliers; the score updates as you go.

Revert: `git revert 82d8f18`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/procurement-only-suppliers-1440.jpg) | ![after](ui/after/procurement-only-suppliers-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/procurement-only-suppliers-390.jpg) | ![after](ui/after/procurement-only-suppliers-390.jpg) |

### Procurement result

Score and categories first; full breakdown under More. "Procurement rating (not the B-BBEE level)".

Revert: `git revert 35c9c4b`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/procurement-result-1440.jpg) | ![after](ui/after/procurement-result-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/procurement-result-390.jpg) | ![after](ui/after/procurement-result-390.jpg) |

### Edit procurement

Same two steps as creating.

Revert: `git revert 82d8f18`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/procurement-edit-1440.jpg) | ![after](ui/after/procurement-edit-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/procurement-edit-390.jpg) | ![after](ui/after/procurement-edit-390.jpg) |

### Procurement report

Design tokens only; the report layout is unchanged.

Revert: `git revert a56ce69`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/procurement-report-1440.jpg) | ![after](ui/after/procurement-report-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/procurement-report-390.jpg) | ![after](ui/after/procurement-report-390.jpg) |

### Delete confirmation

One confirmation everywhere that says exactly what goes and that it is final.

Revert: `git revert 1b2d6e6`

| Desktop, before | Desktop, after |
|---|---|
| (new screen) | ![after](ui/after/procurement-delete-confirm-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| (new screen) | ![after](ui/after/procurement-delete-confirm-390.jpg) |

### Activity

Design tokens only.

Revert: `git revert a56ce69`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/activity-1440.jpg) | ![after](ui/after/activity-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/activity-390.jpg) | ![after](ui/after/activity-390.jpg) |

### Settings, profile

Design tokens only.

Revert: `git revert a56ce69`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/settings-profile-1440.jpg) | ![after](ui/after/settings-profile-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/settings-profile-390.jpg) | ![after](ui/after/settings-profile-390.jpg) |

### Settings, account

Design tokens only.

Revert: `git revert a56ce69`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/settings-account-1440.jpg) | ![after](ui/after/settings-account-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/settings-account-390.jpg) | ![after](ui/after/settings-account-390.jpg) |

### Settings, help

Explains the journey start to finish and every B-BBEE word.

Revert: `git revert 56b2e9c`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/settings-help-1440.jpg) | ![after](ui/after/settings-help-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/settings-help-390.jpg) | ![after](ui/after/settings-help-390.jpg) |

### Settings, legal

Design tokens only.

Revert: `git revert a56ce69`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/settings-legal-1440.jpg) | ![after](ui/after/settings-legal-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/settings-legal-390.jpg) | ![after](ui/after/settings-legal-390.jpg) |

### Workforce targets (staff)

Plain words and In use / Draft / Replaced labels.

Revert: `git revert 2c3ee29`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/staff-workforce-targets-1440.jpg) | ![after](ui/after/staff-workforce-targets-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/staff-workforce-targets-390.jpg) | ![after](ui/after/staff-workforce-targets-390.jpg) |

### Workforce target set (staff)

Six population-share percentages, the shape the scorecard reads. Before, the screen saved a shape the scorecard rejected.

Revert: `git revert 0f3fbaf`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/staff-workforce-targets-active-1440.jpg) | ![after](ui/after/staff-workforce-targets-active-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/staff-workforce-targets-active-390.jpg) | ![after](ui/after/staff-workforce-targets-active-390.jpg) |

### Admin overview (staff)

No false "Live production" label; full scorecards counted.

Revert: `git revert 9162ed2`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/admin-overview-1440.jpg) | ![after](ui/after/admin-overview-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/admin-overview-390.jpg) | ![after](ui/after/admin-overview-390.jpg) |

### Admin companies (staff)

Fits a 390px phone with no sideways scroll.

Revert: `git revert a3444c5`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/admin-companies-1440.jpg) | ![after](ui/after/admin-companies-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/admin-companies-390.jpg) | ![after](ui/after/admin-companies-390.jpg) |

### Admin company (staff)

Lists the company's full scorecards too.

Revert: `git revert 9162ed2`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/admin-company-1440.jpg) | ![after](ui/after/admin-company-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/admin-company-390.jpg) | ![after](ui/after/admin-company-390.jpg) |

### Admin procurement (staff)

Fits a phone.

Revert: `git revert a3444c5`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/admin-procurement-1440.jpg) | ![after](ui/after/admin-procurement-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/admin-procurement-390.jpg) | ![after](ui/after/admin-procurement-390.jpg) |

### Older: modular calculator

Still works; reached from More.

Revert: `git revert e589398`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/older-modular-new-1440.jpg) | ![after](ui/after/older-modular-new-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/older-modular-new-390.jpg) | ![after](ui/after/older-modular-new-390.jpg) |

### Older: manual scorecard

Still works; reached from More.

Revert: `git revert e589398`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/older-legacy-new-1440.jpg) | ![after](ui/after/older-legacy-new-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/older-legacy-new-390.jpg) | ![after](ui/after/older-legacy-new-390.jpg) |

### Older: full-workbook calculator

Still works; its link to the new scorecard now uses the right company.

Revert: `git revert 2312592`

| Desktop, before | Desktop, after |
|---|---|
| ![before](ui/before/older-full-workbook-new-1440.jpg) | ![after](ui/after/older-full-workbook-new-1440.jpg) |

| Phone, before | Phone, after |
|---|---|
| ![before](ui/before/older-full-workbook-new-390.jpg) | ![after](ui/after/older-full-workbook-new-390.jpg) |
