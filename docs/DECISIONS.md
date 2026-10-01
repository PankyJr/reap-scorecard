# Decisions taken in the final pass

Each entry says what was decided, why, and how to undo it. Commits are on
`fix/final-pass`, which starts from `chore/e2e-audit`.

## Scope and safety

1. **Branch.** Work started from `chore/e2e-audit` on a new branch,
   `fix/final-pass`. Nothing was pushed to `main`. The session's own working
   branch (`claude/tender-gates-893bgs`) holds the same commits, so either
   name can be used for review. The PR targets `main` and is not merged.
2. **Staging only.** All database work went to the staging project
   (`jzvqyryblsfxlinvoiuf`) through the Supabase Management API. Production
   (`pmjuiynjelhjlpyohbvk`) was not contacted. Nothing was deployed to
   Netlify; the app ran locally on `http://localhost:3000` against staging.
3. **Scoring maths unchanged.** No formula, weighting, cap or threshold was
   changed. The golden benchmark (total 54.69, ED 3.63, SD 7.25, SED 3.00) was
   checked in the test suite after every major change and again in the
   browser. The procurement 25 vs 27 cap was not touched.
4. **Spreadsheet library.** The proxy in this environment blocks
   `cdn.sheetjs.com`, which `package.json` uses for `xlsx`. The same version
   was installed locally from the npm mirror to run tests and builds;
   `package.json` and the lock file were left exactly as they were. A normal
   `npm ci` on Netlify uses the CDN as before.

## Bug fixes

5. **Final level on the first calculation** (`de6c85c`). The readiness check
   read the import status that the previous calculation had written, so the
   first calculation after closing the last gap still said "import awaiting
   review" and a second click was needed. The check now reads the current
   inputs only. This changes when a level is shown, not the points. Tests
   prove one calculation now gives what the old second click gave. Revert
   the commit to restore the old behaviour.
6. **Workforce (EAP) targets** (`0f3fbaf`, `2d88c60`). The admin screen saved
   "black people / black women per band", but the engine needs the six
   population shares (African, Coloured and Indian, men and women). The
   screen now asks for those six percentages and stores them under band key
   `all`. Older sets saved per band still read correctly, and the screen
   shows them with a notice. A set cannot be put in use until all six are
   saved and add up to no more than 100%. A snapshot the engine cannot read is
   never frozen onto an assessment; it is rebuilt from the attached set.
7. **Uploads** (`653059d`). Every upload (full scorecard workbook, modular
   element workbook, procurement supplier workbook, older full-workbook
   calculator) now checks the file itself, not only its name: an empty file,
   a text file renamed `.xlsx`, a password-protected file or a workbook with
   no scorecard sheets is refused with one plain sentence.
8. **Admin console at 390px** (`a3444c5`). The cause was screen-reader-only
   text escaping the table's scroll box; the scroll box is now its own
   positioning context.
9. **Admin labels** (`9162ed2`). The console said "Production" and "Live" on
   every environment, including staging. Those chips were removed, and full
   scorecards are now counted and listed per company (read-only).

## Interface

10. **Design tokens.** One file, `src/app/tokens.css`, holds every colour,
    radius and font for the signed-in app and the sign-in pages. Body text is
    Public Sans at 16px; page titles use Source Serif 4. The public marketing
    site keeps its own look (Inter) because it is a separate brand surface and
    was not part of the simplification brief.
11. **One starting point.** "Start new" (`/start`) offers Full B-BBEE
    scorecard or Procurement only, each explained in one sentence, then asks
    for the company. The older entry points still work and are reachable under
    "More" on the Full scorecards page, so no saved link breaks.
12. **Company needs only a name.** Industry, contact, e-mail, phone and notes
    are optional. Turnover and sector are asked per scorecard on the "Company
    size and sector" step, because they can change from year to year.
13. **Portfolio figures count final levels only.** Home's level overview
    leaves out scorecards that are not final yet, so a half-finished
    scorecard never shows as a level.
14. **"Procurement rating (not the B-BBEE level)".** The procurement module
    shows its own banding of the 29 points. It was labelled as a level, which
    read like a B-BBEE level. It is now named so it cannot be confused.
15. **Sign-in page.** The marketing panel showed invented statistics. It now
    shows the three real steps and the level ladder.
16. **Guided tours** (`2bcc809`) were rewritten to point at the new menu;
    three steps pointed at elements that no longer exist.
17. **Report.** The scorecard report leads with the level, a points table in
    scorecard order and the priority sub-minimums. The PDF is the browser's
    "Print / Save as PDF", as before; a server PDF for the full scorecard was
    not added (procurement already has one).

18. **Admin console look.** The staff console keeps its own layout, with a
    dark header and dashboard-style tiles. It uses the shared colour tokens,
    but was not rebuilt to match the customer screens. It is read-only and
    staff-only, so the effort went to the customer journey.
19. **Fixes found by the walkthrough**, each with a test:
    - The Start new choices were not announced as links (`de3e7b4`).
    - The procurement Save, "Need help?" and profile-photo buttons had
      spoken names that hid their visible words (`740dee7`, `3f27a21`).
    - The final Delete button was teal instead of red (`232c819`).
    - "Still needed" lines repeated their own label (`a15c034`).
    - The steps bar called the elements done while some were partial
      (`dd1d9e8`).
    - A refused sign-up cleared the form and named the service
      (`62871ef`).
    - The reset page carried a different header from sign-in (`06bdbfc`).

## Checks

20. **"Both linters"** is read as ESLint and the TypeScript checker, run on
    the app (`tsconfig.json`) and on the scripts (`tsconfig.scripts.json`).
    Both have 0 errors. Six ESLint warnings remain on purpose:
    - Three: React Compiler notes on react-hook-form's `watch()`. They are
      informational, and the forms behave correctly.
    - Two: plain `<img>` for user avatars, which can come from any URL and
      so do not suit `next/image`.
    - One: a public function parameter kept for its callers.
21. **Walkthrough e-mails.** Staging's built-in mailer sends to real
    addresses: the auth log shows `mail.send` (confirmation) to a real
    address on 1 October. It refuses addresses at reserved test domains
    (`email_address_invalid`), and allows two auth e-mails an hour
    (`over_email_send_rate_limit`). The walkthrough uses test-domain
    addresses on purpose, so it never mails a real person. It records what
    Supabase did with each request, checks the message the user sees, and
    then continues with an account created through the admin API. When an
    e-mail is accepted, it follows the real link instead, rebuilt from the
    database exactly as Supabase writes it into the e-mail. Use
    `WALK_SKIP_EMAIL=1` for repeat runs inside the hour.

## Staging data

22. **Clean-up scope.** `scripts/staging-cleanup-test-data.ts` removes every
    account at a reserved test domain (`reap-staging.example`, `example.com`,
    `example.org`, `example.net`) and everything it owns. That covers this
    pass's `e2e-final-*` and `walk-*` accounts and the older `staging.browser`
    test accounts. Three things were kept on purpose:
    - `bbbee@infinicolon.co.za`, a real address that someone was using on
      staging during this pass, and its data.
    - `bongani.review@reap-staging.example` and its companies. The older
      acceptance script uses it as a reviewer's sign-in, so deleting it could
      lock a person out. Its probe companies ("Attach Probe Co …", "Proc TMPS
      Verify Co") stay with it. Remove them with the same script and no
      `--keep` once nobody needs the login.
    - The seeded workforce-target set "EAP targets (client workbook)", which
      has no creator and which other staging scorecards use.
