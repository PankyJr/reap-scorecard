# Release notes: REAP Scorecard, handover version

**For:** everyone at REAP Solutions who will use or sell the app.

B-BBEE means Broad-Based Black Economic Empowerment. EME means Exempted
Micro-Enterprise (turnover up to R10 million), QSE means Qualifying Small
Enterprise (R10 million to R50 million).

## What you are getting

### The full B-BBEE scorecard

- Works out a company's **B-BBEE level** from all **seven areas**: ownership,
  management control, skills development, preferential procurement,
  supplier development, enterprise development and socio-economic
  development.
- **Upload the REAP scorecard workbook**, or **type the figures in** by hand.
  After an upload, the app shows what it read and how many areas it filled
  in, and nothing is saved until you confirm.
- A **live score** at the bottom of the screen updates as you type, and says
  plainly when a priority area has dropped the level by one.
- **Saves as you type.** There is no Save button to forget.
- **Plain explanations.** Every area opens with its points, its minimum, and
  "Where you're losing points". Any B-BBEE word with a small **?** explains
  itself.
- **Evidence first.** Enterprise, supplier and socio-economic development
  contributions count only after someone confirms the evidence and records a
  reference.
- **Final result**: the level in large type, one sentence on what it means
  for the company's clients, a bar per area, and the three lines with the
  most points still to win.
- **PDF report**, drawn on the server without needing a browser there, plus
  a printable page.
- Every result is marked "Draft, not a verified B-BBEE certificate".

### Procurement-only scorecards

- Score just the supplier spend, without a full scorecard.
- Upload the supplier list as **Excel or CSV** (a plain-text spreadsheet
  format), or start from the app's template. Lists of **8,000 suppliers** pass the automatic tests.
- **Needs attention** finds expired certificates, missing levels, suppliers
  listed twice and odd amounts, each with a **one-click fix**. Until they are
  fixed, the score is marked **Incomplete**.
- The score is shown the way the full scorecard counts it: **out of 25, with
  bonus points apart**, plus the biggest gap in one sentence and the
  suppliers behind each line.
- **Continue to full scorecard** carries it straight into a full scorecard.
- PDF report.

### Companies, with size and automatic-level guidance

- Add a company with five details: name, industry, financial year end,
  turnover and black ownership.
- The app says at once whether it is an **EME, QSE or large company**, and
  when the codes give it an **automatic level** (for example "You may not
  need a full scorecard").
- It warns when an industry may have **its own sector code**, and when a QSE
  needs the QSE scorecard, which this version does not include.
- A new scorecard starts with last year's size and ownership filled in.

### Home

- One **Next step** box, always telling you the one thing to do next.
- Your companies, each with its standing and one button.
- Quick actions: Add a company, Upload a workbook.
- **Recent reports**, ready to download again.

### For REAP staff

- **Admin console**: read-only views of every client's companies, procurement
  scorecards and full scorecards, for support.
- **Workforce targets**: where REAP enters the official yearly population
  shares (EAP, Economically Active Population) that management and skills
  targets are measured against.
- On Home, staff see all companies and a "Needs attention" filter.

### Works on phones

- A menu on phones, and screens laid out for phones as well as computers.

### Sign-in that works

- Signing in works even when the button is tapped before the page has
  finished loading (common on phones).
- Sign-up and password-reset links work when opened from a phone's mail app,
  WhatsApp or another browser, once the new e-mail templates are in place
  (see the transfer checklist).
- Clear messages: a refused sign-up keeps what was typed, and the e-mail
  limit is explained in plain words.

### Security

- **Each client sees only their own data.** On the practice (staging) copy,
  74 out of 74 attempts to reach another client's data were blocked.
- Standard browser security protections on every page.
- No passwords or secret keys are shipped to the browser or in the built app.

---

## What changed since the version that is live now

The live site today has procurement scorecards, an older full-workbook
calculator and an older manual scorecard. This version adds or changes:

- **New:** the full B-BBEE scorecard, workforce targets, company size and
  automatic-level guidance, the **Start new** / "What do you need?" starting
  point, and the new Home.
- **Redone:** the procurement-only journey: supplier list first, then Needs
  attention with one-click fixes, then total spend; CSV upload and a
  template; large supplier lists.
- **Fixed, and it changes some numbers:** total measured procurement spend
  (TMPS) worked out from the financial statements had some items on the
  wrong side. It is now corrected. Older procurement scorecards keep their old
  score until someone opens and saves them again.
- **Fixed:** a full scorecard now gives its final level on the first
  calculation, not the second.
- **Fixed:** workforce targets are saved in the shape the scorecard needs.
- **Fixed:** PDF downloads that failed on the live hosting. Procurement, the
  full scorecard and the older manual scorecard now draw their PDFs without a
  browser on the server, which is what failed before. This is expected to
  work on the live hosting and is checked on the first live deploy. The older
  full-workbook calculator offers "Print or save as PDF" instead.
- **Fixed:** uploads refuse files that are not usable Excel workbooks, in one
  plain sentence, instead of failing later.
- **Fixed:** a percentage is always typed as a whole number (30 means 30%).
- **Simpler screens throughout:** one design, plain words, plain error pages,
  and a help page that explains every B-BBEE word.
- **Security and testing:** owner-only access to data, security headers, and
  automatic tests, including a hand-worked "golden" scorecard every change is
  checked against.

## Before you rely on it

- The scoring rules are being confirmed by REAP's verification expert
  (`docs/FOR_STUART.md`).
- What this version does not do is listed in
  `docs/handover/KNOWN_LIMITATIONS.md`.
