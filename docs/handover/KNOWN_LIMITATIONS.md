# Known limitations

**For:** REAP Solutions, and anyone supporting the app.
**What this is:** an honest list of what this version does not do, why, and
what to do instead. Anything here is outside the 30-day bug-fix warranty
(`docs/handover/WARRANTY_AND_SUPPORT.md`); adding it is a change.

B-BBEE means Broad-Based Black Economic Empowerment. EME means Exempted
Micro-Enterprise, QSE Qualifying Small Enterprise.

---

## 1. Scoring: what the app does not measure

### 1.1 No QSE scorecard

**What:** the app has the Generic scorecard only. A QSE (turnover above
R10 million and below R50 million) that is less than 51% black owned has no
automatic level and must be measured on the QSE scorecard, which the app
does not have. The app says so.
**Why:** out of scope for this version.
**Workaround:** measure the QSE outside the app. An EME or QSE may choose
the full Generic scorecard under "More options" on the size step, with a
reason and evidence; whether that is acceptable for a given client is a
question for the verification agency.
**Source:** `src/lib/scorecard/generic/applicability.ts` lines 114-131.

### 1.2 No sector codes

**What:** the app measures on the Generic Codes only. If a sector code
applies, the full scorecard gives no level. Some industries are flagged when a
company is added, but the app does not know every sector code's rules.
**Why:** out of scope for this version.
**Workaround:** measure those companies outside the app.
**Source:** `src/lib/scorecard/generic/applicability.ts` lines 151-167;
`src/lib/company/industries.ts`.

### 1.3 No QSE procurement targets

**What:** procurement is always scored against the Generic targets, even for
an EME or QSE. The procurement result says so and calls the score "a guide
only" for those companies.
**Workaround:** treat the score as a guide; measure QSE procurement outside
the app.
**Source:** `src/components/procurement/ProcurementTargetsNotice.tsx`.

### 1.4 Every development contribution counts as a grant, at 100%

**What:** every enterprise development, supplier development and
socio-economic development contribution is recorded as a grant and counts at
100% of its value. There is no choice of type (loan, guarantee, discount,
professional services…), so the codes' benefit factors (for example 70% for
an interest-free loan) are not applied. Loans and other types are therefore
over-counted.
**Why:** the type selector was taken out of the form in an earlier phase of
the project ("phase 1" in the code, August 2026); the code does not record
why. The benefit-factor table is kept in the code for later, and every
defaulted record is marked so it can be found and re-typed.
**Workaround:** only enter contributions that really are grants or direct
costs, or agree with the verifier how to enter other types.
**Source:** `src/app/(dashboard)/scorecards/calculator/[assessmentId]/generic/actions.ts`
lines 50-59 and 785-814.

### 1.5 Net value and flow-through are not calculated

**What:** ownership net value must be typed in as a verified percentage. The
app does not model the transaction, debt or the time-based graduation
factor. Flow-through, modified flow-through and exclusion principles are only
ticked; they change no number.
**Workaround:** use the verifier's net value figure.
**Source:** `src/lib/scorecard/generic/elements/ownership.ts` lines 163-192.

### 1.6 Expired supplier certificates must be marked by a person

**What:** the score itself does not read certificate expiry dates. The
procurement screens list expired certificates under "Needs attention" and
offer **Mark non-compliant**; until a person presses it, an expired supplier
still counts at its old level and the score is marked **Incomplete**.
**Workaround:** clear "Needs attention" before using a procurement score.
**Source:** `src/lib/procurement/needsAttention.ts`; `src/lib/procurement/rows.ts`
lines 44-75.

### 1.7 Supplier ownership is yes/no, not a percentage

**What:** each supplier carries three ticks: at least 51% black owned, at
least 30% black women owned, at least 51% black designated groups. The
actual percentages are not kept. An uploaded percentage is turned into a
tick (51% or more, 30% or more).
**Why:** the procurement lines only need to know whether a supplier passes
each threshold.
**Workaround:** keep the percentages in the source spreadsheet.
**Source:** `src/lib/procurement/rows.ts` lines 17-19;
`src/lib/procurement/excel/buildSuppliers.ts` lines 411-423.

### 1.8 Rules still waiting for the verification expert

Every rule is listed in `docs/FOR_STUART.md` for REAP's verification expert to
confirm. Until it is signed off, treat results as drafts. Open questions the
code itself raises include: the 1.2 multiplier for "51% flow-through"
suppliers; the "procurement rating" bands on some older screens; whether
socio-economic development counts in full at 75% black beneficiaries or
more; the 31 December date used to check certificates; the "11% more new
jobs" row left out of enterprise development.

---

## 2. Reports and older screens

### 2.1 The older full-workbook calculator has no server PDF on Netlify

**What:** the older full-workbook calculator's PDF needs a browser on the
server, which Netlify does not have. On Netlify the button opens the
printable report instead.
**Workaround:** on the printable report, use the browser's **Print**, then
**Save as PDF**. The new full scorecard and procurement PDFs do not have this
problem.
**Source:** `src/lib/scorecard/full/pdf-export-availability.ts`;
`docs/DECISIONS.md` item 33.

### 2.2 The older "selected areas" calculator's target box is ambiguous

**What:** under "Other ways to score", the selected-areas calculator has a
box labelled **Target (fraction or %)**. Any number above 1 is read as a
percentage (5 means 5%); 1 or below is read as a fraction (1 means 100%,
0.5 means 50%). So a target of 1% typed as "1" becomes 100%, and 0.5% typed
as "0.5" becomes 50%.
**Workaround:** type targets as fractions (0.01 for 1%), or use the full
scorecard, which does not have this box. This calculator gives no B-BBEE
level in any case.
**Source:** `src/app/(dashboard)/scorecards/calculator/actions.ts` line 441;
`src/app/(dashboard)/scorecards/calculator/[assessmentId]/elements/[elementKey]/page.tsx`
line 348.

### 2.3 Older screens not fully re-tested

**What:** the older manual scorecard and the older full-workbook calculator
load, but were not walked through end to end in the audits.
**Workaround:** use the full scorecard and procurement-only journeys.
**Source:** `docs/E2E_AUDIT_2026-09-30.md`, "Too big to fix now".

### 2.4 Procurement points: the PDF and the screen count differently

**What:** the procurement result screen shows base points out of 25 (the
full scorecard's cap) with the bonus apart. The procurement PDF's summary
adds up the five lines out of 27, without the cap. A company over 25 sees,
for example, 25 of 25 on screen and 26 of 27 in the PDF.
**Status:** **uncertain** whether this is intended; raised with the lead.
**Source:** `src/lib/procurement/scoreSummary.ts` lines 91-121;
`src/lib/reports/pdf/procurement.ts` lines 153-167 and 466-477.

### 2.5 Old procurement scores keep the old spend total until re-saved

**What:** the way total measured procurement spend is worked out from the
financial statements was corrected. Procurement scorecards saved before the
fix keep their old score until someone opens and saves them.
**Workaround:** open each older procurement scorecard that used the
financial statements, and save it again.
**Source:** `scripts/ops/README.md` section 5; `src/lib/procurement/tmps.ts`
lines 55-75.

### 2.6 No REAP logo in the PDFs

**What:** the PDFs show REAP's name as text.
**Why:** the code has no logo file licensed for print.
**Workaround:** supply a logo file and permission to use it.
**Source:** `docs/DECISIONS.md` item 31.

---

## 3. Features not in this version

### 3.1 No evidence file upload

**What:** evidence is a typed reference (an invoice number, agreement name or
document reference) and a confirmation tick. There is no place to upload the
evidence file itself, per area or per contribution. Not built in this pass.
**Workaround:** keep evidence files in REAP's own document store and type
their reference.

### 3.2 Light mode only

**What:** the app does not switch to a dark colour scheme when a phone or
computer is set to dark mode. This is deliberate: dark mode made form boxes
look disabled on white cards.
**Source:** `src/app/globals.css` lines 4-7 and 60-63.

### 3.3 Administrators are set up by hand

**What:** there is no screen to make someone a REAP administrator. It is one
database command per person.
**Workaround:** follow `docs/handover/TRANSFER_CHECKLIST.md` step 2.3.

### 3.4 Workforce targets must be entered every year

**What:** the app ships with no EAP (Economically Active Population) figures.
A REAP administrator enters each year's six shares from the published
figures. Without a set in use, no full scorecard can reach a final level.
**Workaround:** follow `docs/handover/TRANSFER_CHECKLIST.md` step 5 each
year.

### 3.5 Upload size

**What:** every spreadsheet upload (supplier lists and scorecard workbooks)
can be up to 3.9 MB. A bigger file is refused as soon as it is chosen, with a
plain message. The golden sample workbook is 0.2 MB, so real workbooks are
normally far below the limit.
**Why:** the hosting limits the size of one request (6 MB on Netlify), and
uploads are sent through the app's server actions, which allow 4 MB.
**Workaround:** remove unused sheets or images; save a supplier list as CSV
(a plain-text spreadsheet format), which is much smaller, or split it.
**Source:** `src/lib/uploads/limits.ts`; `src/lib/procurement/uploadLimits.ts`;
`docs/DECISIONS.md` item 38.

### 3.6 Start-ups

**What:** a start-up is always treated as an EME. The app does not check the
exception for a start-up tendering above the EME threshold.
**Source:** `src/lib/scorecard/generic/applicability.ts` lines 86-92.

### 3.7 No project timeline chart

A Gantt (timeline) chart was asked about during the final pass. It was never
part of this code, so none was built or invented.
**Source:** `docs/DECISIONS.md` item 26.

---

## 4. Hosting and e-mail

### 4.1 Free Supabase projects pause after a quiet week

**What:** on Supabase's free plan, a project with no traffic for about seven
days pauses, and the app stops working until someone restores it.
**Workaround:** the "Keep Supabase awake" GitHub job reads one row a day
once its secrets are set; or move to a paid plan, which does not pause.
Restoring is a button in the Supabase dashboard.
**Source:** `scripts/ops/README.md` sections 0-1;
`.github/workflows/keep-supabase-awake.yml`.

### 4.2 Staging's built-in e-mail sender

**What:** the staging project uses Supabase's built-in sender. It allowed
two sign-in e-mails an hour, and it refuses addresses at reserved test
domains. Sign-ups and password resets on staging stall after that.
**Workaround:** wait an hour, or give staging its own e-mail sender too.
Production must have its own sender before real users sign up.
**Source:** `docs/DECISIONS.md` item 21.

### 4.3 Not yet proven on the live hosting

**What:** the new version has not yet been deployed to Netlify. The server
PDFs, real e-mail delivery from REAP's sender, and Google or Microsoft
sign-in have not been tried on the live hosting. The production database was
not inspected in this pass (no access from the build machine).
**Workaround:** run the checks in `docs/handover/TRANSFER_CHECKLIST.md`
step 6 and `docs/PRODUCTION_UPGRADE.md` step 5 on the first deploy.
**Source:** `docs/DEPLOYMENT.md` section 10; `docs/FINAL_PASS_STATUS.md`
Part 7.

---

## 5. Checks still open when this was written

`docs/FINAL_PASS_STATUS.md` listed these as not yet done. Some may be done by
handover; the lead updates this list.

- The 8,000-supplier test on staging itself (upload, scoring, table, PDF).
  The automatic tests already cover 8,000 suppliers.
- An accessibility check of every screen at phone and computer size, and
  keyboard-only use of the main journey.
- A speed check (Lighthouse) of the main screens on a phone.
- Loading, empty and error states on every screen. One known: a failed
  procurement save can still show a technical message about "pending
  Supabase migrations".
- Confirming the "Keep Supabase awake" job runs, with its secrets set.
- A separate staging website on Netlify.
- A final full run of every test and the browser walkthrough on staging.

---

## 6. To be confirmed at handover

For the lead to fill in.

- ____________________________________________
- ____________________________________________
- ____________________________________________
