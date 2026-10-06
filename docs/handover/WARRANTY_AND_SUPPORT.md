# Warranty and support

**For:** REAP Solutions.
**What this is:** what is fixed free after handover, what is charged, and how
to ask for either.

B-BBEE means Broad-Based Black Economic Empowerment. QSE means Qualifying
Small Enterprise. EAP means Economically Active Population (the workforce
shares that management and skills targets are measured against). Items marked **to agree** are for REAP and Panky to settle
and write in before signing.

## The short version

- For **30 days from the handover date**, bugs are fixed at no charge.
- A **bug** is the app not doing what was agreed and documented.
- A **change** is anything new or different. Changes are charged.
- After 30 days, support is either **paid per fix** or a **monthly
  retainer**.

Handover date: **____________ (to agree)**. The 30 days end on:
**____________**.

---

## 1. Bug or change?

### A bug (covered by the 30-day warranty)

The app does not do what was agreed and documented. The documents that set
what was agreed are:

- `docs/FOR_STUART.md`: the scoring rules, as confirmed or corrected by
  REAP's verification expert;
- `docs/USER_GUIDE.md`: what each screen does;
- `docs/handover/RELEASE_NOTES.md`: what is included;
- `docs/handover/KNOWN_LIMITATIONS.md`: what is **not** included.

Examples of bugs:

- A wrong calculation against the agreed rules. For example, a level band,
  target or cap in `docs/FOR_STUART.md` is marked "correct" by Stuart, and the
  app gives a different number.
- A crash, or an error page, when doing something the app is meant to do.
- A broken page, button or link.
- A sign-in, sign-up or password-reset e-mail link that does not work,
  where the hosting settings in `docs/handover/TRANSFER_CHECKLIST.md` were
  followed.
- One client seeing another client's data.
- A PDF report that will not download or shows wrong figures.

### A change (charged)

Anything new, or different from what was agreed:

- **New features**: for example the QSE scorecard, sector codes, contribution
  types and benefit factors, evidence file uploads, new screens.
- **Different rules**: for example a rule Stuart marked "correct" that REAP
  later wants done another way. A rule Stuart marked "needs change" before
  handover is part of the agreed work, not a charged change (**to agree**:
  whether those corrections are done before handover or inside the 30 days).
- **Design changes**: layout, colours, wording, new branding.
- **New reports or exports**, or changes to the existing ones.
- **Changes after the codes change**: new gazetted codes, amended targets,
  new EAP rules, or a new sector code.
- **Third-party outages or changes**: Supabase, Netlify, GitHub, the e-mail
  provider or a browser being down or changing how it works.
- **Anything in `docs/handover/KNOWN_LIMITATIONS.md`.**
- Problems caused by changes someone else made to the code, the database or
  the hosting settings after handover.
- Data entry: typing in or fixing a client's figures, uploading workbooks,
  or setting the yearly workforce targets.

If it is not clear which side something falls on, Panky says which and why
in writing before doing any work. Nothing is charged without REAP agreeing
first.

---

## 2. How to report a bug

Send one message per problem to: **____________ (to agree: e-mail address
or channel)**.

Include:

1. **What you did**: the steps, in order. "Opened Golden Sample's full
   scorecard, went to Skills development, typed 500 000 in …"
2. **What you expected**, and where that is written (for example "FOR_STUART
   rule 4.1 says the minimum is 8 points").
3. **What happened instead**: the exact words of any error.
4. **Where**: the page address from the browser's address bar.
5. **When**: date and time, so the logs can be checked.
6. **Who**: which account was signed in (the e-mail address; **never** the
   password).
7. **Device**: computer or phone, and the browser (Chrome, Safari, Edge…).
8. **A screenshot**, if possible.

Do not send passwords, keys or a client's confidential documents. If a
client's data is needed to show the problem, say so and agree how to share it
safely first.

**Urgent** means: the site is down for everyone, nobody can sign in, or one
client can see another client's data. Mark the message **URGENT** in the
subject.

---

## 3. What happens after a report

In plain words:

- Panky confirms the report has been received and whether it is a bug or a
  change.
- For a bug, Panky fixes it, tests it, and tells REAP what was wrong, what
  changed and how it was checked.
- A fix reaches the live site when it is merged into `main` (Netlify then
  publishes it automatically). REAP is told before that happens.
- Panky says plainly if something cannot be fixed, or only partly, and why.

Response times: **to agree**. Suggested points to settle:

| | Urgent | Normal |
|---|---|---|
| First reply | to agree | to agree |
| Fix or workaround | to agree | to agree |
| Working hours covered | to agree | to agree |

---

## 4. Support after the 30 days

Two options. REAP can choose either, and switch later (**to agree**: notice
period).

### Option A: pay per fix

- REAP reports a problem or asks for a change.
- Panky replies with what it involves and an estimate.
- Work starts only when REAP agrees the estimate.
- Charged per piece of work, at a rate **to agree**.
- Best if REAP expects few requests.

### Option B: monthly retainer

- A fixed monthly fee for an agreed amount of time each month (**to agree**:
  how much time, and whether unused time carries over).
- Covers bug fixes, small changes, keeping software libraries up to date,
  and answering questions, within that time.
- Larger pieces of work (for example the QSE scorecard or sector codes) are
  quoted separately.
- Faster response times can be part of the retainer (**to agree**).
- Best if REAP expects steady requests, or wants someone watching the app.

No prices are set in this document.

---

## 5. Not covered by the warranty or by support

- **Hosting costs**: Supabase, Netlify, GitHub, domain name and DNS. REAP
  pays these directly to each provider.
- **Third-party service fees**: the e-mail sender (for example Resend), and
  any other paid service REAP adds.
- **Outages of those services.** Panky can help diagnose, but cannot fix
  another company's outage.
- **Restoring a paused database.** A free Supabase project pauses after
  about a week with no traffic. Restoring it is a button in the Supabase
  dashboard (`scripts/ops/README.md` section 0); REAP can do this itself, or
  move to a plan that does not pause.
- **B-BBEE advice.** The app calculates; it does not verify. A result is a
  draft, not a B-BBEE certificate. Questions about what the codes require go
  to a verification expert.
- **Training** beyond the handover walkthrough (**to agree** if wanted).
- **Data loss caused outside the app**, for example someone deleting rows
  directly in the database. Backups are REAP's responsibility once hosting
  moves; see `scripts/ops/backup-production.sh`.

---

Signed for REAP Solutions: ____________________ Date: ____________

Signed by Panky Mbhalati: ____________________ Date: ____________
