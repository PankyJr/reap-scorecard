# Rules for Stuart to confirm before launch

**For:** Stuart, B-BBEE verification expert, REAP Solutions.
**What this is:** every scoring rule the app uses, written out in plain words,
with the exact numbers, and where it sits in the code. Please mark each one.

B-BBEE means Broad-Based Black Economic Empowerment.

## How to read this

- Each rule says what the app **does today**, not what it should do. If the
  app is wrong, mark "needs change" and write the right rule next to it.
- "Where" gives the file and line numbers, so a developer can find the rule
  straight away. You do not need to open the files. Line numbers are as of
  6 October 2026 (commit `d130459`); if the code has moved since, search the
  file for the named rule.
- Percentages are written as people say them (25%). The code stores most of
  them as fractions (0.25). They are the same number.
- Where the code already flags a rule as doubtful, this document says so.
- Where something is unclear from the code, it says **uncertain** and why.

When you mark a rule, use the line under it:
`- [ ] Stuart: correct / needs change: ____`

---

## 1. Which codes the app uses

### 1.1 One rule set: the Generic Codes with the 2019 amendments

The app scores every full scorecard on one rule set, named "Amended Codes of
Good Practice: Generic scorecard (2019 amendments)", key
`generic-codes-2019-v1`, version 1.0.0, effective from 1 December 2019. The
code cites these sources: Statement 000, 300 and 400 from the 2019 gazette
(GN 304, 305 and 306 of 2019, Gazette 42496), and Statement 100, 200 and 500
from the 2013 Amended Codes (Gazette 36928).

A second rule set, "2026 draft", exists only as a reserved name. It copies the
2019 rules unchanged and can never produce a final level.

- Where: `src/lib/scorecard/rules/generic-2019/scorecard.ts` lines 1-45 and
  642-649; `src/lib/scorecard/rules/registry.ts` lines 4-21.
- Please confirm the effective date and the sources cited are right.

- [ ] Stuart: correct / needs change: ____

---

## 2. Company size and automatic levels

### 2.1 Size bands, and the exact edges

The app sorts a company by its annual turnover:

| Size | Turnover | Edge handling |
|---|---|---|
| EME (Exempted Micro-Enterprise) | R10 million or less | Exactly R10 000 000 is an EME |
| QSE (Qualifying Small Enterprise) | More than R10 million and less than R50 million | R10 000 001 is a QSE |
| Large (measured on the Generic scorecard) | R50 million or more | Exactly R50 000 000 is Large |

So the R10m test is "at or below" and the R50m test is "below".

- Where: `src/lib/scorecard/generic/applicability.ts` lines 96 (EME: at or
  below R10m), 102 (QSE: below R50m) and 108-111 (Large: everything else);
  the numbers are held in `src/lib/scorecard/rules/company-size.ts` lines
  37-74.

- [ ] Stuart: correct / needs change: ____

### 2.2 Start-ups are treated as EMEs

On the full scorecard's "Company size and sector" step, the user answers "Is
it a start-up?". If Yes, the company is treated as an EME whatever its
turnover. The app's explanation says "unless they tender for work above the
EME threshold", but the app does **not** check that exception. It only shows
the words.

The "Add a company" form does not ask about start-ups. Its size message
assumes the company is not a start-up.

- Where: `src/lib/scorecard/generic/applicability.ts` lines 86-92;
  `src/lib/company/size.ts` line 32 (company form assumes "not a start-up").

- [ ] Stuart: correct / needs change: ____

### 2.3 Automatic ("deemed") levels for EMEs and QSEs

The app checks these in order and uses the first that fits:

| Rule | Applies to | Black ownership needed | Level | Recognition |
|---|---|---|---|---|
| 1 | EME and QSE | 100% | Level 1 | 135% |
| 2 | EME and QSE | 51% or more | Level 2 | 125% |
| 3 | EME only | any | Level 4 | 100% |

So:

- An EME under 51% black owned is Level 4 at 100%.
- An EME or QSE that is 51% to 99.99% black owned is Level 2 at 125%.
- An EME or QSE that is 100% black owned is Level 1 at 135%.
- A QSE under 51% black owned gets no automatic level. The app says it "must
  be measured on the QSE scorecard, which this calculator does not
  implement", and shows recognition 0%.

Black women ownership is captured but not used by these rules. The app does
not ask for an affidavit or certificate to support an automatic level.

- Where: `src/lib/scorecard/rules/company-size.ts` lines 89-128 (the three
  rules and the "first match wins" check); `src/lib/scorecard/generic/applicability.ts`
  lines 114-131 (QSE under 51%).

- [ ] Stuart: correct / needs change: ____

### 2.4 An EME or QSE can choose the full Generic scorecard

Under "More options" on the "Company size and sector" step, an EME or QSE can
choose to be measured on the full Generic scorecard instead of its automatic
level. The app accepts the choice only if the user types both a reason and
the evidence. Then the automatic level is not applied, and the full scorecard
can produce a Generic level.

This is also the only way a QSE under 51% black owned gets any level in the
app.

- Where: `src/lib/scorecard/generic/applicability.ts` lines 186-235;
  `src/app/(dashboard)/scorecards/calculator/[assessmentId]/generic/applicability/page.tsx`
  lines 145-163.
- Please confirm this choice is allowed, and whether the app should limit who
  may make it.

- [ ] Stuart: correct / needs change: ____

### 2.5 If a sector code applies, there is no Generic level

On the "Company size and sector" step the user answers "Does a sector code
apply to the company?". If Yes, the app does not produce a level at all. It
says the company must be measured under its sector code.

- Where: `src/lib/scorecard/generic/applicability.ts` lines 151-167.

- [ ] Stuart: correct / needs change: ____

### 2.6 Industries flagged as possibly having their own sector code

When a company is added, the user picks an industry. For the industries marked
"Yes" below, the app shows: "Some industries are measured on their own sector
code instead of the Generic codes this app uses. Confirm with your
verification agency which scorecard applies." It does not stop the user.

| Industry | Flagged? |
|---|---|
| Agriculture | Yes |
| Forestry | Yes |
| Mining and quarrying | No |
| Manufacturing | No |
| Electricity, gas and water | No |
| Construction | Yes |
| Property | Yes |
| Wholesale and retail | No |
| Transport and logistics | Yes |
| Tourism and hospitality | Yes |
| Information and communication technology (ICT) | Yes |
| Financial services and insurance | Yes |
| Accounting and auditing | Yes |
| Marketing, advertising and communication | Yes |
| Defence | Yes |
| Professional and business services | No |
| Health and social care | No |
| Education and training | No |
| Security services | No |
| Cleaning and facilities management | No |
| Other | No |

- Where: `src/lib/company/industries.ts` lines 13-35.
- Please confirm the list, and say which flags should change.

- [ ] Stuart: correct / needs change: ____

---

## 3. Points, levels and recognition

### 3.1 How many points each area carries

| Area (the codes say "element") | Base points | Bonus points |
|---|---|---|
| Ownership | 25 | 0 |
| Management control | 19 | 0 |
| Skills development | 20 | 5 |
| Preferential procurement | 25 | 2 |
| Supplier development | 10 | 1 |
| Enterprise development | 5 | 1 |
| Socio-economic development | 5 | 0 |
| **Total** | **109** | **9** |

- Where: `src/lib/scorecard/rules/generic-2019/scorecard.ts` lines 650-658.
  The 109 + 9 total is explained in the same file, lines 579-589.

- [ ] Stuart: correct / needs change: ____

### 3.2 Level bands and recognition

The level comes from the total points, **including bonus points**. Each band
includes its lower number and stops just below the next one.

| Level | Total points | Recognition |
|---|---|---|
| Level 1 | 100 or more | 135% |
| Level 2 | 95 to under 100 | 125% |
| Level 3 | 90 to under 95 | 110% |
| Level 4 | 80 to under 90 | 100% |
| Level 5 | 75 to under 80 | 80% |
| Level 6 | 70 to under 75 | 60% |
| Level 7 | 55 to under 70 | 50% |
| Level 8 | 40 to under 55 | 10% |
| Non-compliant | under 40 | 0% |

- Where: `src/lib/scorecard/rules/generic-2019/scorecard.ts` lines 47-57
  (`GENERIC_2019_LEVEL_BANDS`); `src/lib/scorecard/generic/aggregate.ts`
  lines 14-27 (how a total is placed in a band) and 131-137 (base plus bonus).

- [ ] Stuart: correct / needs change: ____

### 3.3 Supplier recognition in the procurement module, and whether it agrees

The procurement module turns a supplier's level into a recognition
percentage with its own table. **It agrees with the bands in 3.2**: Level 1
135%, Level 2 125%, Level 3 110%, Level 4 100%, Level 5 80%, Level 6 60%,
Level 7 50%, Level 8 10%, Non-compliant 0%.

A supplier level the app cannot read (blank, or anything other than 1-8 or
"Non-compliant") scores as **Non-compliant, 0%**. When a supplier list is
uploaded on the procurement screens, such a supplier is kept with a blank
level and listed under "Needs attention" as "No B-BBEE level", so a person
can choose the level. Until they do, it scores 0% and the score is marked
"Incomplete".

- Where: `src/lib/procurement/config.ts` lines 4-14 (`RECOGNITION_BY_LEVEL`);
  `src/lib/procurement/rows.ts` lines 39-42 (unknown level scores 0%);
  `src/lib/procurement/excel/buildSuppliers.ts` lines 99-116 (upload keeps
  it blank for review) and 38-51 (older upload path: becomes Non-compliant);
  `src/lib/procurement/needsAttention.ts` lines 85-88 and 205-207.

- [ ] Stuart: correct / needs change: ____

### 3.4 Points are rounded to two decimals

Every line's points, and the totals, are rounded to two decimal places.

- Where: `src/lib/scorecard/generic/scoring.ts` lines 44-47.

- [ ] Stuart: correct / needs change: ____

### 3.5 The basic scoring formula

Most lines score as: points = (achieved ÷ target), capped at 100%, × the
points available. Nobody earns more than a line's points by beating its
target.

- Where: `src/lib/scorecard/generic/scoring.ts` lines 56-74.

- [ ] Stuart: correct / needs change: ____

---

## 4. Priority sub-minimums

### 4.1 Five priority areas, each must reach 40%

| Priority area | Points the 40% is measured on | Minimum needed |
|---|---|---|
| Ownership: net value only | 8 | 3.2 |
| Skills development | 20 | 8 |
| Preferential procurement | 25 | 10 |
| Supplier development | 10 | 4 |
| Enterprise development | 5 | 2 |

Bonus points never count towards a minimum. Only base points do.

- Where: `src/lib/scorecard/rules/generic-2019/scorecard.ts` lines 668-714;
  `src/lib/scorecard/generic/aggregate.ts` lines 47-115 (the test; line 77
  keeps only base lines).

- [ ] Stuart: correct / needs change: ____

### 4.2 Missing one or more drops the level by exactly one

If any priority area is below its minimum, the level drops by **one** level.
It drops by one whether one, two or all five fail. The points are not
changed; only the level is. A Level 8 that is discounted becomes
Non-compliant.

- Where: `src/lib/scorecard/generic/aggregate.ts` lines 29-41 (one step only)
  and 137-141 (applied once).

- [ ] Stuart: correct / needs change: ____

### 4.3 An untested minimum blocks the final level

If a priority area has not been fully scored, its minimum cannot be tested.
The app then shows "not final yet" instead of a level.

- Where: `src/lib/scorecard/generic/aggregate.ts` lines 57-98 and 221-225.

- [ ] Stuart: correct / needs change: ____

---

## 5. Ownership

### 5.1 The seven ownership lines (25 points)

| Line | Target | Points |
|---|---|---|
| Voting rights of black people | 25% plus one vote | 4 |
| Voting rights of black women | 10% | 2 |
| Economic interest of black people | 25% | 4 |
| Economic interest of black women | 10% | 2 |
| Economic interest of black designated groups, ESOPs, co-operatives and BBOS | 3% | 3 |
| Economic interest of black new entrants | 2% | 2 |
| Net value | 25% | 8 |

ESOP means employee share ownership scheme. BBOS means broad-based ownership
scheme. The app gives ownership no bonus points.

- Where: `src/lib/scorecard/rules/generic-2019/scorecard.ts` lines 59-156.

- [ ] Stuart: correct / needs change: ____

### 5.2 "25% plus one vote"

If the user enters the total number of votes and the number held by black
people, the app works out the exact target: (25% of total votes + 1) ÷ total
votes. If the vote counts are missing, it uses **25.1%** instead and shows a
warning that it is an approximation.

- Where: `src/lib/scorecard/generic/scoring.ts` lines 76-101 (line 95 is the
  25.1%); `src/lib/scorecard/generic/elements/ownership.ts` lines 86-122.

- [ ] Stuart: correct / needs change: ____

### 5.3 Net value is entered as a verified figure

The app does not calculate net value. The user types in the net value
percentage from a verified calculation. The app then scores it as
(net value % ÷ 25%) × 8 points, capped at 8. It does not model the
transaction, acquisition debt or the time-based graduation factor
(Annexe 100(E)).

- Where: `src/lib/scorecard/rules/generic-2019/scorecard.ts` lines 141-155;
  `src/lib/scorecard/generic/elements/ownership.ts` lines 163-183.

- [ ] Stuart: correct / needs change: ____

### 5.4 Flow-through, modified flow-through and exclusions are not calculated

The user can tick that the modified flow-through principle or an exclusion
principle was applied. The app only shows a reminder. It does not change any
number.

- Where: `src/lib/scorecard/generic/elements/ownership.ts` lines 185-192.

- [ ] Stuart: correct / needs change: ____

---

## 6. Management control

### 6.1 The thirteen management control lines (19 points)

EAP means Economically Active Population: the share of the working-age
population in each race and gender group. "EAP-weighted" is explained in 6.2.

| Line | Target | Points | How scored |
|---|---|---|---|
| Black board members (voting rights) | 50% | 2 | Straight share |
| Black female board members | 25% | 1 | Straight share |
| Black executive directors | 50% | 2 | Straight share |
| Black female executive directors | 25% | 1 | Straight share |
| Black other executive management | 60% | 2 | Straight share |
| Black female other executive management | 30% | 1 | Straight share |
| Black senior management | 60% | 2 | EAP-weighted |
| Black female senior management | 30% | 1 | EAP-weighted |
| Black middle management | 75% | 2 | EAP-weighted |
| Black female middle management | 38% | 1 | EAP-weighted |
| Black junior management | 88% | 1 | EAP-weighted |
| Black female junior management | 44% | 1 | EAP-weighted |
| Black employees with disabilities (of all employees) | 2% | 2 | Straight share |

- Where: `src/lib/scorecard/rules/generic-2019/scorecard.ts` lines 158-328;
  `src/lib/scorecard/generic/elements/management-control.ts` lines 80-112
  (straight share) and 119-188.

- [ ] Stuart: correct / needs change: ____

### 6.2 How "EAP-weighted" works

The app needs six EAP shares: African, Coloured and Indian, each male and
female. For one line it:

1. Works out each group's share of the band: that group's count ÷ the band's
   total headcount.
2. Re-scales the six EAP shares so they add up to 100% across the six groups
   only (the share of white people is left out).
3. Splits the line's target across the groups by that re-scaled share.
4. Splits the line's points across the groups the same way.
5. Gives each group min(its share ÷ its split target, 100%) × its split
   points, and adds the groups up.

For the "black female" lines, only the three female groups are used, and
they are re-scaled over those three.

- Where: `src/lib/scorecard/generic/scoring.ts` lines 268-363 (female-only
  at lines 291 and 302).

- [ ] Stuart: correct / needs change: ____

### 6.3 Without a workforce-target (EAP) set, six lines cannot score

If no EAP set is attached, the six senior, middle and junior management lines
are blocked and score nothing, and the scorecard cannot give a final level.
The board, executive and disability lines still score.

- Where: `src/lib/scorecard/generic/elements/management-control.ts` lines
  114-160.

- [ ] Stuart: correct / needs change: ____

### 6.4 Who sets the EAP figures

A REAP administrator enters the six shares under Workforce targets, from the
published figures (the screen points to the Commission for Employment
Equity). Each must be 0-100%, and the six together may not exceed 100%. The
app never makes these figures up and ships with none.

- Where: `src/lib/scorecard/calculator/eap/population-shares.ts` lines 51-96;
  `src/app/(dashboard)/settings/eap-targets/[id]/page.tsx` lines 82-87.
- Please confirm which publication REAP should use each year.

- [ ] Stuart: correct / needs change: ____

---

## 7. Skills development

### 7.1 The five skills lines (20 points plus 5 bonus)

| Line | Target | Points | How scored |
|---|---|---|---|
| Spend on learning programmes for black people | 3.5% of the leviable amount | 6 | EAP-weighted |
| Spend on bursaries for black students at higher education institutions | 2.5% of the leviable amount | 4 | EAP-weighted |
| Spend on learning programmes for black employees with disabilities | 0.3% of the leviable amount | 4 | Straight share |
| Black people in learnerships, apprenticeships and internships | 5% of total employees | 6 | EAP-weighted |
| Bonus: black learners absorbed into permanent jobs | 100% of those who completed | 5 bonus | Straight share |

The leviable amount is the payroll the Skills Development Levy is charged on.

- Where: `src/lib/scorecard/rules/generic-2019/scorecard.ts` lines 330-398;
  `src/lib/scorecard/generic/elements/skills-development.ts` lines 262-325.

- [ ] Stuart: correct / needs change: ____

### 7.2 Three gates: no skills points until all three are Yes

Every skills point, bonus included, is withheld until the user confirms all
three:

1. A Workplace Skills Plan and Annual Training Report (WSP/ATR) approved by
   the SETA (Sector Education and Training Authority).
2. A submitted PIVOTAL report (Professional, Vocational, Technical and
   Academic Learning).
3. An implemented priority skills programme.

- Where: `src/lib/scorecard/generic/elements/skills-development.ts` lines
  173-186 and 263-334.

- [ ] Stuart: correct / needs change: ____

### 7.3 The absorption bonus needs a training register

The 5 bonus points need a confirmed, maintained trainee tracking register.

- Register "Yes": bonus = (black learners absorbed ÷ black learners who
  completed) × 5, capped at 5.
- Register "No": bonus is 0, and the scorecard can still be final.
- Not answered: the bonus is blocked, and the scorecard is not final.

The register never affects the 20 base points. The reference workbook divides
completed learners by total headcount; the app does not (see 10.5).

- Where: `src/lib/scorecard/generic/elements/skills-development.ts` lines
  188-209 and 327-366.

- [ ] Stuart: correct / needs change: ____

### 7.4 The two 15% caps

- Informal and workplace learning (categories F and G) counts up to 15% of
  total skills spend.
- Training administration costs count up to 15% of total skills spend.

"Total skills spend" is the total the user enters. If they leave it blank,
the app adds up general training, bursaries and disability training. Any
amount over a cap is taken off the general training spend, spread evenly
across the six EAP groups.

- Where: `src/lib/scorecard/generic/elements/skills-development.ts` lines
  14-17 and 105-167.

- [ ] Stuart: correct / needs change: ____

---

## 8. Preferential procurement

### 8.1 The five lines and the bonus line

TMPS means Total Measured Procurement Spend: the total all these shares are
measured against.

| Line | Target (share of TMPS) | Points |
|---|---|---|
| Spend with all empowering suppliers (B-BBEE suppliers) | 80% | 5 |
| Spend with QSE suppliers | 15% | 3 |
| Spend with EME suppliers | 15% | 4 |
| Spend with suppliers at least 51% black owned | 50% | 11 |
| Spend with suppliers at least 30% black women owned | 12% | 4 |
| **Five lines together** | | **27** |
| Bonus: spend with suppliers at least 51% owned by black designated groups | 2% | 2 bonus |

- Where: `src/lib/scorecard/rules/generic-2019/scorecard.ts` lines 400-480.
  The procurement-only module reads these same targets and points from that
  rule set, so the two cannot disagree: `src/lib/procurement/config.ts`
  lines 31-80.

- [ ] Stuart: correct / needs change: ____

### 8.2 In the full scorecard: capped at 25 plus 2

The five lines can add up to 27. In the full scorecard, the app counts at
most **25** of them, and at most **2** bonus points on top. The bonus never
fills the 25. So 26 of 27 on the lines becomes 25. The procurement
sub-minimum (40%, so 10 points) is measured against the 25.

The code records this as a known conflict between Statement 000 (25 points)
and Statement 400 (lines adding to 27), and resolves it this way.

- Where: `src/lib/scorecard/generic/elements/procurement.ts` lines 6-16
  (`PROCUREMENT_BASE_CAP` = 25, `PROCUREMENT_BONUS_CAP` = 2), 62-81 and
  203-233; conflict notes in
  `src/lib/scorecard/rules/generic-2019/scorecard.ts` lines 557-578.

- [ ] Stuart: correct / needs change: ____

### 8.3 Procurement on its own: 25 plus bonus on screen, 29 underneath

A procurement-only scorecard scores each of the six lines, each capped at its
own points. Its result page then shows the points the way the full scorecard
counts them: **base points out of 25, with the bonus (out of 2) shown
apart**, using the same caps as 8.2. The saved total underneath still adds
all six lines with no cap (up to 27 + 2 = 29).

**Uncertain, for the lead:** the procurement PDF's summary shows "Points, not
counting bonus" as the five lines added up **out of 27**, without the 25 cap.
So the screen and the PDF can show different figures for the same
scorecard (for example 25 of 25 on screen, 26 of 27 in the PDF).

Some older screens still show a **"Procurement rating"**: the printable
report page, the year-on-year comparison on the result page, and the REAP
admin console. It takes the 29-point total as a percentage of 29 and uses
bands left over from an early version of the app, marked in the code as
"placeholder":

| Points as % of 29 | Rating shown |
|---|---|
| 85% or more | Level 1 |
| 75% or more | Level 2 |
| 65% or more | Level 3 |
| 55% or more | Level 4 |
| 45% or more | Level 5 |
| 35% or more | Level 6 |
| 25% or more | Level 7 |
| below 25% | Non-Compliant |

This rating is **not** a B-BBEE rule. It can be read as a level.

- Where: `src/lib/procurement/assessment.ts` lines 56-98 (the 29 total);
  `src/lib/procurement/scoreSummary.ts` lines 91-121 (25 + bonus on screen);
  `src/lib/reports/pdf/procurement.ts` lines 153-167 and 466-477 (PDF out of
  27); `src/lib/procurement/insights.ts` lines 5-18 and
  `src/lib/scorecard/legacyRuleMap.ts` lines 59-68 (the rating);
  `src/app/procurement/assessments/[id]/report/page.tsx` line 174 and
  `src/lib/admin/queries.ts` lines 284 and 436 (where the rating shows).
- Please say whether REAP wants to keep this rating, rename it, or remove it.

- [ ] Stuart: correct / needs change: ____

### 8.4 How one supplier's spend counts

For each supplier: recognised spend = spend (excluding VAT) × recognition %
for its level. That recognised spend then counts in every line the supplier
qualifies for:

- "All B-BBEE suppliers": every supplier with recognised spend above zero.
- "QSE" or "EME": only if the supplier type is QSE or EME. A supplier typed
  "Generic" (large) counts in neither.
- "51% black owned", "30% black women owned", "51% black designated groups":
  only if that tick is on.

A Non-compliant supplier has zero recognised spend, so it counts in no line,
but its spend stays in the total (TMPS) if TMPS is built from the supplier
list.

- Where: `src/lib/procurement/rows.ts` lines 44-75;
  `src/lib/procurement/assessment.ts` lines 32-54;
  `src/lib/procurement/tmpsDenominator.ts` lines 26-33 (supplier-list total
  includes every supplier).

- [ ] Stuart: correct / needs change: ____

### 8.5 "51% flow-through" multiplies recognition by 1.2

If a supplier is ticked as qualifying under the 51% flow-through rule, its
recognition percentage is multiplied by **1.2**. There is no cap: a Level 1
supplier ticked this way counts at 162% (135% × 1.2).

- Where: `src/lib/procurement/rows.ts` lines 49-51; the database note in
  `supabase/migrations/20260730084722_procurement_supplier_flow_through.sql`
  lines 6-7.
- **Uncertain:** the code does not say which clause of the codes this
  comes from. Please confirm the rule and the 1.2.

- [ ] Stuart: correct / needs change: ____

### 8.6 "Empowering supplier" status is not checked

The app has a field for a supplier's empowering-supplier status, but the
score does not read it. Any supplier with Level 1-8 counts in "All B-BBEE
suppliers".

- Where: `src/lib/procurement/rows.ts` line 23 (field held) and lines 44-75
  (not used).

- [ ] Stuart: correct / needs change: ____

### 8.7 Ownership is a yes/no tick per supplier

Each supplier carries three yes/no ticks, not percentages. When a
spreadsheet is uploaded with percentages, the app turns them into ticks:
51% or more black owned = Yes; 30% or more black women owned = Yes.

- Where: `src/lib/procurement/rows.ts` lines 17-19;
  `src/lib/procurement/excel/buildSuppliers.ts` lines 411-423.

- [ ] Stuart: correct / needs change: ____

### 8.8 Expired supplier certificates

**What the scoring itself does:** nothing automatic. The scoring never reads
the expiry date. A supplier whose certificate has expired still counts at
the level typed against it until a person changes it.

**What the procurement screens do:** while the supplier list is checked,
"Needs attention" lists every supplier whose certificate expired before a
check date, with a button "Mark non-compliant" (one supplier) or "Mark all
… as non-compliant". The screen says: "An expired certificate scores
nothing, so until a new one arrives these suppliers count as non-compliant."
Marking one sets its level to Non-compliant, so it then scores 0%.

- The check date is 31 December of the scorecard's year, or today if that
  date has not come yet.
- A date the app cannot read is not treated as expired.
- While any expired supplier is still unmarked, the score is labelled
  "Incomplete", and the result page says the score is too high until they
  are marked. Once marked, it says how many suppliers "aren't counting
  because their certificates expired".

**In the PDF:** the procurement PDF lists certificates that expired before
the report date, and dates it cannot read. This does not change the score.

**Elsewhere:** a prototype "scenario planner" page also treats expired as
Non-compliant. It is not in the menu.

- Where: `src/lib/procurement/rows.ts` lines 44-75 (score does not read
  expiry); `src/lib/procurement/needsAttention.ts` lines 70-83 (check date),
  202-210 (the check) and 252-260 (the fix);
  `src/components/procurement/NeedsAttentionPanel.tsx` lines 168-186;
  `src/app/(dashboard)/procurement/assessments/[id]/page.tsx` lines 286-345;
  `src/lib/reports/pdf/procurement.ts` lines 281-332 and 653 (PDF).
- Please confirm: should an expired certificate always count as
  non-compliant, and is 31 December of the scorecard year the right date to
  check against? Or should it be the end of the company's measurement
  period?

- [ ] Stuart: correct / needs change: ____

### 8.9 Other "Needs attention" checks on a supplier list

These are data checks, not B-BBEE rules, but they change what counts:

- **Listed more than once?** Suppliers with the same name (ignoring "Pty
  Ltd" and the like), VAT number or registration number. "Merge" adds their
  spend together and keeps the **first** row's level and ownership ticks.
  "Keep both" leaves them apart and is remembered.
- **Zero or negative amounts** must be fixed before the list can be saved.
- **More than the total spend:** a supplier whose spend is above TMPS is
  flagged, but can be saved.

- Where: `src/lib/procurement/needsAttention.ts` lines 90-185 (matching),
  211-221 (amounts) and 267-290 (merge).

- [ ] Stuart: correct / needs change: ____

### 8.10 What goes into TMPS

When TMPS is worked out from the financial statements:

- **Added:** cost of sales, closing inventory, purchase of goods, purchase of
  services, other operating expenses, utilities, service fees, recharge for
  services, finance costs, capital expenditure, and any lines the user adds.
- **Taken off:** opening inventory, employee costs (salaries, wages,
  emoluments), depreciation, and any lines the user adds.
- TMPS = added total − taken-off total.

The user can instead choose "Use the total of the supplier list".

The code notes that before September 2026 some of these items sat on the
wrong side. Scorecards saved before that keep their old score until someone
opens and saves them again.

- Where: `src/lib/procurement/tmps.ts` lines 26-49 and 55-118;
  `scripts/ops/README.md` section 5.

- [ ] Stuart: correct / needs change: ____

### 8.11 Generic targets only: no QSE procurement targets

The app has one set of procurement targets: the Generic ones above. It has
**no QSE procurement targets** and no QSE weightings. A QSE's or EME's
procurement-only scorecard is scored against the Generic targets.

If the company is known to be an EME or QSE (from its full scorecard's size
step, or from the turnover on its company details), the procurement result
shows: "The QSE procurement scorecard is not in the app yet … This score uses
the targets for large companies (the Generic scorecard), so use it as a
guide only." If the size is not known, it says these are the targets for
large companies.

- Where: `src/lib/procurement/config.ts` lines 66-80 (one list, no size);
  `src/lib/scorecard/rules/generic-2019/scorecard.ts` lines 400-480;
  `src/lib/procurement/companySize.ts` lines 7-35;
  `src/components/procurement/ProcurementTargetsNotice.tsx` lines 10-24.

- [ ] Stuart: correct / needs change: ____

---

## 9. Enterprise, supplier and socio-economic development

ED means enterprise development, SD supplier development, SED socio-economic
development. NPAT means net profit after tax.

### 9.1 Targets: 1%, 2% and 1% of NPAT

| Area | Target | Points | Bonus |
|---|---|---|---|
| Supplier development | 2% of NPAT | 10 | 1: an ED beneficiary graduated to SD |
| Enterprise development | 1% of NPAT | 5 | 1: jobs created from ED or SD |
| Socio-economic development | 1% of NPAT | 5 | none |

- Where: `src/lib/scorecard/rules/generic-2019/scorecard.ts` lines 482-554;
  `src/lib/scorecard/generic/financial.ts` lines 219-234.

- [ ] Stuart: correct / needs change: ____

### 9.2 Which NPAT is used

- Deemed NPAT = revenue × the industry's NPAT margin × 25%.
- If both actual and deemed NPAT are known, the app uses **the larger**.
  So deemed NPAT applies when actual NPAT is a loss, or its margin is below a
  quarter of the industry's.
- If only deemed NPAT is known, it is used, but needs a REAP administrator to
  confirm before the level is final.
- If no industry margin is entered, actual NPAT is used, but also needs
  confirmation before the level is final.
- If actual NPAT is zero or a loss and there is no industry margin, there is
  no NPAT and these three areas cannot score.
- Only a REAP administrator can override the choice, and must give a reason.
  The reason and old value are kept in the audit trail.

- Where: `src/lib/scorecard/generic/financial.ts` lines 56-84 (deemed NPAT)
  and 86-217 (the choice; "larger" at 193-216);
  `src/lib/scorecard/generic/aggregate.ts` lines 203-207 (confirmation blocks
  the final level);
  `src/app/(dashboard)/scorecards/calculator/[assessmentId]/generic/actions.ts`
  lines 279-280 (administrators only).

- [ ] Stuart: correct / needs change: ____

### 9.3 Every contribution counts as a grant, at 100%

In this version, every ED, SD and SED contribution is recorded as a "grant"
and counts at 100% of its value. Users cannot choose a contribution type
(loan, guarantee, discount, professional services and so on), so the benefit
factors in the codes (for example 70% for an interest-free loan) are not
applied. The full benefit-factor table is in the code, ready for later, but
is not used. Each defaulted record is marked so it can be found later.

- Where: `src/app/(dashboard)/scorecards/calculator/[assessmentId]/generic/actions.ts`
  lines 50-59 (`CONTRIBUTION_TYPE_DEFAULTED_MARKER`) and 785-814; workbook
  upload:
  `src/lib/scorecard/generic/workbook-import/analyse.ts` lines 76, 392 and
  435; the unused table: `src/lib/scorecard/generic/benefit-factors.ts` lines
  41-223.

- [ ] Stuart: correct / needs change: ____

### 9.4 Evidence must be confirmed before a contribution counts

A contribution counts only after a person confirms its supporting evidence
and enters a reference (an invoice number, agreement name or document
reference). Until then it counts as zero. The two yes/no bonuses (job
creation, graduation) also need evidence: a "Yes" without evidence earns
nothing.

- Where: `src/lib/scorecard/generic/elements/contributions.ts` lines 144-164;
  `src/lib/scorecard/generic/scoring.ts` lines 188-235.

- [ ] Stuart: correct / needs change: ____

### 9.5 Who can be an ED or SD beneficiary

A beneficiary counts only if it is at least 51% black owned and either:

- an EME or QSE; or
- a larger company that was an EME or QSE when it was first helped, and was
  first helped no more than 5 years ago.

- Where: `src/lib/scorecard/generic/elements/contributions.ts` lines 77-125.

- [ ] Stuart: correct / needs change: ____

### 9.6 SED counts in proportion to black beneficiaries

A socio-economic development contribution counts at its value × the share of
beneficiaries who are black. 80% black beneficiaries means 80% of the value
counts. If the share is not entered, or is zero, nothing counts.

**Please check:** the app applies the proportion at every share, including
75% or more. Our reading is that the codes may recognise the whole value once
at least 75% of beneficiaries are black; if so, the calculation needs to
change (and the golden test figures with it). Until this pass the screen's
explanation implied the full value counted at 75% or more; it now says what
the calculation does ("80% black beneficiaries, so 80% of the value
counts").

- Where: `src/lib/scorecard/generic/elements/contributions.ts`, the
  eligibility reason in `evaluateEligibility` and the arithmetic in
  `evaluateContribution` (`proRata`).

- [ ] Stuart: correct / needs change: ____

---

## 10. Conflicts the code has already decided

The code keeps a list of places where the REAP reference workbook, or a
commonly quoted figure, differs from the gazette. Each was resolved in favour
of the gazette, as the code reads it. All are in
`src/lib/scorecard/rules/generic-2019/scorecard.ts` lines 556-640.

### 10.1 Procurement points: 25 or 27 (lines 557-567)

Decided: lines keep 5 + 3 + 4 + 11 + 4 = 27; the full scorecard counts at most
25 + 2 bonus. See 8.2.

- [ ] Stuart: correct / needs change: ____

### 10.2 Procurement sub-minimum basis (lines 568-578)

Decided: 40% of 25 = 10 points, measured on capped base points, bonus left
out.

- [ ] Stuart: correct / needs change: ____

### 10.3 Total scorecard points (lines 579-589)

Decided: 109 base + 9 bonus, after the procurement cap.

- [ ] Stuart: correct / needs change: ____

### 10.4 NPAT choice (lines 590-600)

The reference workbook says "apply the greater of the two" but its formula
always uses actual NPAT. Decided: the app really uses the greater, and shows
why. See 9.2.

- [ ] Stuart: correct / needs change: ____

### 10.5 Absorption bonus measure (lines 601-610)

The reference workbook divides completed learners by total headcount.
Decided: absorbed learners ÷ learners who completed.

- [ ] Stuart: correct / needs change: ____

### 10.6 "25% plus one vote" (lines 611-620)

The reference workbook uses 25.1%. Decided: exact from vote counts, 25.1% only
as a labelled fallback. See 5.2.

- [ ] Stuart: correct / needs change: ____

### 10.7 Skills total mixing in the bonus (lines 621-629)

The reference workbook adds the 5 bonus points into a total of 20. Decided:
base and bonus are always shown apart.

- [ ] Stuart: correct / needs change: ____

### 10.8 The "11% more new jobs" row worth 2 points (lines 630-639)

The reference workbook has this row at 2 points but leaves it out of its own
total. Decided: the row is left out, and job creation is a single 1-point
bonus. The code says this is "pending REAP confirmation".

- [ ] Stuart: correct / needs change: ____

---

## 11. How to change a rule

- **Company size and automatic levels:** `src/lib/scorecard/rules/company-size.ts`.
  The company screens read the same numbers, so they change together.
- **Targets, points, sub-minimums, level bands:**
  `src/lib/scorecard/rules/generic-2019/scorecard.ts`.
- **Procurement-only module:** `src/lib/procurement/config.ts` (and
  `src/lib/procurement/rows.ts` for the 1.2 flow-through).
- **NPAT and the 1%, 2%, 1% targets:** `src/lib/scorecard/generic/financial.ts`.
- **Sector-code flags on industries:** `src/lib/company/industries.ts`.

Tests in `src/lib/scorecard/**/__tests__` (and
`src/lib/procurement/__tests__`) pin these numbers, including a hand-worked
"golden" scorecard. A rule change makes some tests fail on purpose. The
developer must update those tests deliberately, so no number changes by
accident.

Each saved result keeps a copy of the rules it was worked out with. Changing
a rule does not re-score old results; a scorecard picks up the new rule the
next time someone calculates it. The code's own guidance is that a correction
should be released as a new rule-set version
(`src/lib/scorecard/rules/types.ts` lines 1-8).

## Sign-off

Name: ____________________ Date: ____________

Rules needing change (numbers from this document): ______________________
