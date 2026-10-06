# 30-minute live demo: script for REAP staff

**For:** whoever demonstrates the REAP Scorecard to REAP staff.
**Where:** the app running against **staging**, with its sample data.
Staging is a practice copy of the app with its own database, so nothing here
touches real clients. At the time of writing, staging is reached through
Panky's laptop (the addresses are at the top of `docs/FINAL_PASS_STATUS.md`);
use a staging website instead once one is set up.

B-BBEE means Broad-Based Black Economic Empowerment. EME means Exempted
Micro-Enterprise (turnover up to R10 million); QSE means Qualifying Small
Enterprise (R10 million to R50 million).

Each block says what to **click**, what to **say**, and what the audience
should **notice**. Words in **bold** are the words on the screen. Where the
exact wording depends on the data, the script says so.

## Before the demo (15 minutes, the day before)

- [ ] Staging is awake. Staging runs on Supabase's free plan, which pauses
  after about a week with no use. Sign in once the day before; if it fails,
  restore the project in the Supabase dashboard (`scripts/ops/README.md`
  section 0).
- [ ] The review login works: `panky.review@reap-staging.example`. Its
  password is in `tmp/staging-secrets/review-login.json` on Panky's laptop.
  Never show or read it out on screen.
- [ ] Two sample companies are there (re-create them with
  `scripts/staging-seed-review-login.mjs` if not):
  - **Golden Sample Manufacturing (Pty) Ltd**: finished. Level 4, 81.69
    points, with a procurement scorecard attached.
  - **Halfway Logistics (Pty) Ltd**: workbook uploaded and size set, nothing
    else. Turnover R30 million, 30% black owned.
- [ ] The golden test workbook is on the laptop:
  `test-fixtures/golden/golden-populated-workbook.xlsx`. All its data is made
  up.
- [ ] A small, made-up supplier list (10 to 15 rows) saved as Excel. Start
  from the app's **Excel template** (on the procurement upload step). Delete
  the example row. Include on purpose:
  - one supplier whose **Certificate expiry date** is last year;
  - one supplier with the **B-BBEE level** left blank;
  - the same supplier twice (same name or same VAT number).
  Use invented names only. Never use a real client's list.
- [ ] Browser zoom at 100%, other tabs closed, notifications off.
- [ ] Decide a name for the demo company, for example "Demo Traders (Pty)
  Ltd". Delete it after the demo.

---

## 00:00 to 02:00. Opening and sign in

**Click:** open the app (staging). Sign in with the review login.

**Say:** "This is the REAP Scorecard. It does two things: a full B-BBEE
scorecard, which gives a company its level, and a procurement-only score,
which looks at supplier spend. Everything is saved per company. It works on a
phone too."

**Notice:** the sign-in page explains the steps in plain words. No made-up
statistics.

---

## 02:00 to 04:00. Home

**Click:** nothing yet. Point at each part of the page.

**Say:**

- "The dark box at the top is the **Next step**. The app always says the
  one thing to do next, with one button."
- "Below it, two quick actions: **Add a company** and **Upload a
  workbook**."
- "Then **Your companies**. Golden Sample shows its level and **View
  result**. Halfway Logistics shows **In progress**, how many of the seven
  areas are done, and **Continue**."
- "At the bottom, **Recent reports**, with **Download PDF** next to each."

**Notice:** each company shows its size, when it was last updated, and one
button. If a company needs attention (for example evidence waiting to be
confirmed), a short line in amber says why.

---

## 04:00 to 08:00. Add a company

**Click:** **Start new** (top of the menu). On **Which company is it for?**,
click the link to add a company.

**Say:** "A company needs five details: name, industry, financial year end,
turnover and black ownership."

**Click:** type the demo name. Pick an industry such as **Wholesale and
retail**. Pick a year-end month. Type turnover **8 000 000** and black
ownership **30**.

**Notice:** the size appears straight away: **You're an EME (Exempted
Micro-Enterprise): R10 million or less turnover.** A green box: **You may
not need a full scorecard**, saying a company this size is automatically a
Level 4 contributor and clients can claim 100% of what they spend with it,
"Confirm with your verification agency."

**Click:** change black ownership to **60**.

**Notice:** the automatic level changes to Level 2, 125%.

**Click:** change turnover to **30 000 000** and ownership back to **30**.

**Notice:** "You're a QSE …", and an amber note: a QSE under 51% black
owned is measured on the QSE scorecard, which this app does not do.

**Click:** change the industry to **Construction**.

**Notice:** "**Construction may have its own B-BBEE rules**": some industries
have their own sector code; check with the verification agency.

**Click:** set industry back to **Wholesale and retail**, turnover to
**250 000 000** (a large company, so the full scorecard applies), ownership
**30**. Click **Save company**.

**Say:** "Every number here comes from the same rules the calculator uses,
so the company page and the scorecard can never disagree."

---

## 08:00 to 09:00. "What do you need?"

**Notice:** the page says the company is saved, and repeats its size.

**Say:** "Two choices, side by side. **Full B-BBEE scorecard** gives the
level, from all seven areas. **Procurement only** looks at one area: what
you buy from B-BBEE suppliers. You can always do the other one later."

**Click:** **Choose full scorecard**.

---

## 09:00 to 13:00. Upload the workbook

**Click:** keep the suggested name and year. Click **Create the scorecard**.

**Notice:** the steps bar: **Start**, **Add your figures**, **Check
imported data**, **Fill in the areas**, **See result**. Two panels: **Upload
your workbook** (marked Quick) and **Or fill it in by hand**.

**Click:** choose the golden workbook, then **Read the workbook**.

**Say:** "Nothing is saved yet. The app reads the file and shows what it
found." (If someone asks: a non-Excel file, an empty file or a
password-protected file is refused with one plain sentence.)

**Click:** **Check what it found**.

**Notice:** **Check the imported data**: one row per section, with what was
found. "Scores and levels typed in the workbook are ignored; the app works
them out itself."

**Click:** tick the confirmation box, then **Confirm and import**.

**Notice:** back on the scorecard, a line such as **We filled in 6 of the 6
areas a workbook covers.** (read out the number the screen shows; it depends
on the file), and: "Procurement is not in the workbook: it comes from a
procurement scorecard you attach."

---

## 13:00 to 17:00. The area checklist, the live score, and one area

**Point at** the checklist: **First** (Company size and sector, Financial
figures), then **The seven areas** with how many are done.

**Point at** the score bar at the bottom: **Score so far**, the points and a
level, marked **(not final yet)**, and a **Next:** button.

**Say:** "The score updates as you type. It says 'not final' until
everything a final level needs is in. If a priority area is below its
minimum, this bar says plainly that the level dropped by one, and which area
did it."

**Click:** **Skills development** in the checklist.

**Notice:**

- The top shows **points so far**, the bonus points apart, and the
  priority-area minimum ("you need at least … points").
- **Where you're losing points**: the lines with the most points still to
  win, each with the reason.
- The page is split into sections. A word with a small **?** explains itself
  when tapped (try **leviable amount**, or **EAP**: the Economically Active
  Population shares that targets are split by).
- Under the form: **Changes save as you type.** Change any figure and watch
  it say **Saving…** then **All changes saved**.

**Say:** "There is no Save button to forget. When an area is done, **Done,
next area** takes you on."

**Click:** **Done, next area**.

---

## 17:00 to 19:00. Confirming evidence

**Click:** **Enterprise development** in the checklist.

**Notice:** the checklist line says **Waiting for you to confirm the
evidence**. Each contribution shows its beneficiary and value, and "Not
recognised — scores zero" until confirmed.

**Click:** on one contribution, type an **Evidence reference** (for example
an invoice number), then **Confirm supporting evidence**.

**Say:** "Nothing counts until a person has checked the evidence. The
reference is kept, and a correction later needs a reason, which is kept in
the audit trail." (If asked: in this version every contribution counts as a
grant at 100%; loans and other types are listed in Known limitations.)

**Notice:** the area's points and the score bar go up.

---

## 19:00 to 21:00. Procurement in the full scorecard

**Click:** Home > **Golden Sample Manufacturing** > its full scorecard >
**Procurement** in the checklist.

**Notice:** **Attached procurement scorecard**, with its total spend. On the
demo company the same page offers **Attach a procurement scorecard**, a
list to choose from, and a link to create one.

**Click:** open **Why 29 points there, and at most 27 here?**

**Say:** "Procurement's five lines add up to 27, plus 2 bonus. In the full
scorecard the codes count at most 25, plus the 2 bonus, so 27 at most. The
procurement minimum is 40% of the 25. Stuart is confirming these rules."

---

## 21:00 to 23:00. Review my scorecard and calculate

**Click:** back to the demo company's scorecard. Click **Review my
scorecard** (on the score bar, or in the overview).

**Notice:** **Still needed for a final level**: each item links straight to
where you fix it (for example the sector-code question, procurement not
attached). If workforce targets are missing, a box says **Workforce targets
are not attached**.

**Click:** **Attach workforce targets**.

**Say:** "Workforce targets are the official population shares that
management and skills targets are split by. REAP staff keep them up to date
once a year; clients attach them with one click." (If the button says no set
is in use on staging, show this step on Golden Sample instead.)

**Click:** **Calculate scorecard**.

**Notice:** the result opens. For the demo company it will say **Not final
yet** and list what is still needed. That is correct: the app never shows a
level it cannot stand behind.

---

## 23:00 to 25:30. The final result

**Click:** Home > **Golden Sample Manufacturing** > **View result**.

**Notice:**

- A label: **Draft, not a verified B-BBEE certificate**.
- The level, large: **Level 4**, the points, and a ladder showing where it
  sits.
- One plain sentence: **Your company is a Level 4 contributor. Clients can
  claim 100% of what they spend with you.**
- **Points by area**: one bar per area. Red means the area is below its
  minimum and dropped the level; amber means under half its points.
- **Where to gain points**: the three lines with the most points still to
  win, each linking to its area.
- Folded away: **Priority areas and their minimums** and **How each area was
  worked out**, for the verifier.

**Click:** **Download report**.

**Say:** "The server draws this PDF itself, without needing a browser, so it
is built to work on the live hosting. **Printable version** is there too, for
the browser's Print."

---

## 25:30 to 29:00. Procurement only

**Click:** **Start new** > the demo company > **Choose procurement only**.

**Notice:** the steps bar: **Start**, **Suppliers**, **Check suppliers**,
**Total spend**, **See result**.

**Click:** pick the year (certificates are checked against the end of that
year). Upload the prepared supplier list.

**Notice:** the app shows how many suppliers it read and the total spent,
then **Needs attention**: "Problems that would make the score wrong. Each one
has a fix you can apply with one click; nothing is changed until you press
it." Point at:

- **Expired certificates**, with **Mark non-compliant**.
- **No B-BBEE level**, with a level to choose.
- **Listed more than once?**, with merge or keep both.

**Click:** apply one fix of each kind.

**Say:** "Until these are fixed, the score is marked **Incomplete**, so
nobody relies on a number that is too high."

**Click:** set the total spend (the supplier list total is fine for the
demo), then **Save and see result**.

**Notice:** the score as the full scorecard counts it: points **of 25**,
plus the bonus apart, one sentence on the biggest gap, and **How each
indicator scored**, where each line opens to show the suppliers that count.
**Download report** gives the PDF. **Continue to full scorecard** starts a
full scorecard with this one already attached.

---

## 29:00 to 30:00. Close

**Say:**

- "Each client sees only their own companies. REAP staff have a read-only
  admin console for support."
- "The rules are written out for Stuart in `docs/FOR_STUART.md`. Anything they
  change, we change in one place."
- "What is not in this version is listed in
  `docs/handover/KNOWN_LIMITATIONS.md`."

Questions.

## After the demo

- [ ] Delete the demo company: open it, click **Delete company**, and
  confirm. Its scorecards go with it.
- [ ] Do not delete Golden Sample or Halfway Logistics; the next demo needs
  them.
