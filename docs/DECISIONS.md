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

## Elite pass (6 October)

23. **Review login password stays out of git.** The brief asks for the login
    at the top of `docs/FINAL_PASS_STATUS.md`. That file is committed, and
    passwords are never committed, so the file names the e-mail address and
    where the password lives: `tmp/staging-secrets/review-login.json`, which is
    git-ignored. The address uses a reserved test domain, so staging never
    mails it.
24. **Port 3005, plain http, no tunnel.** Another project's dev server holds
    port 3000 on this Mac. Sign-in works over plain http on the Wi-Fi address,
    because the sign-in cookie is not marked secure, so no tunnel (and no
    extra tool) was needed.
25. **The golden sample company is finished, not stopped at 54.69.** To show
    a real final level it also has a procurement scorecard attached: 81.69
    points, Level 4, which is the golden 54.69 plus 27 procurement points. Its
    enterprise development (3.63), supplier development (7.25) and
    socio-economic development (3.00) are the golden figures exactly. The
    first seeding run stopped one evidence confirmation early and showed SED
    2.63; the script now reloads the page before each confirmation, and
    re-running it repairs a half-confirmed company.
26. **No Gantt chart.** Searched every branch, remote and stash, all 167
    commits (`git log --all -S/-G gantt`), `package.json` history and the
    sibling REAP folders on this Mac: no Gantt, timeline, schedule or phases
    chart was ever in this repo. The only timeline-style visual is the
    decorative company-history timeline on the marketing About page
    (`src/components/marketing/MarketingTimelineSection.tsx`), which is still
    there. None was invented.
27. **PR #2 closed.** Every commit on `infra/docker-aws-ci` is already in
    `fix/final-pass`, so it reaches `main` through PR #3. The branch was kept.
28. **"Area" on screen.** The codes say "element"; a first-time user does not.
    Every screen now says "area" (`1b45528`) and the UI rules in
    `.claude/skills/reap-ui/SKILL.md` say so. Code, routes and database names
    keep "element".
29. **A percentage is always typed as a whole number.** Some fields read "30"
    as 30% and others as 3,000%. One parser now divides by 100 everywhere
    (`49c8584`); its test fails on the old code.
30. **Result bars.** Red only when the area drags the level down (a priority
    area below its minimum, as the engine reports it); amber when it has less
    than half its points; green otherwise. "Half" is a display choice, not a
    B-BBEE rule, and is written next to the bars.
31. **Server PDFs.** Built with pdf-lib, which needs no browser and so runs on
    Netlify. REAP's name is set as text, because the repo has no logo file
    licensed for print. A scorecard that has not been worked out yet still
    downloads, and says so on the cover rather than showing zeros. Problem
    lists stop at 200 rows and say how many more there are.
32. **Enterprise, supplier and socio-economic development targets come from
    the engine** (`preview.contributionTargets`), not typed-in figures.
33. **Older report screens.** The older manual scorecard's Download PDF now
    uses the pdf-lib route, which also serves REAP admins as the old one did
    (`e12b09d`). The full-workbook report has no server PDF that runs on
    Netlify, so there it offers "Print or save as PDF" (`2a079aa`) rather than
    a button that fails.
34. **8,000-supplier PDF test budget: 10 seconds.** Measured alone it takes
    about 1.5 s (197 pages, 1.87 MB). The budget leaves room for a busy
    machine so the test does not fail at random.
35. **Design skill.** The brief names a "frontend-design" skill; it is not
    installed on this Mac. The project's own `reap-ui` skill and the single
    token file `src/app/tokens.css` were used instead.
36. **"Create the scorecard"** is the button that creates a scorecard. The
    review page keeps "Calculate scorecard", because the UI rules keep the
    verb "Calculate" for the one button that works the result out.
37. **Workbook upload errors.** Our own messages (they start with the file's
    name) are shown; anything from the spreadsheet library is replaced with
    "We could not read this workbook. Open it in Excel, save it again as
    .xlsx, and upload that copy." (`436f9a0`).
38. **Procurement-only journey** (built by a helper, reviewed and taken in as
    24 commits ending `d130459`):
    - Procurement targets and points are read from the engine's rule set.
      Checked: all six lines are identical to the old typed-in figures.
    - Shown as base points out of 25 with the bonus apart (out of 2), using
      the engine's own cap. The uncapped total of all six lines (out of 29) is
      only shown under "How is this calculated?".
    - **Expired certificate:** expired before 31 December of the measurement
      year (or before today, if that date has not come yet). The one-click fix
      marks the supplier non-compliant, which scores nothing. Listed for
      Stuart to confirm.
    - **Missing level** is saved blank and scores as non-compliant, as before,
      but is shown as missing rather than as a level.
    - Zero and negative amounts must be fixed before saving. Other problems
      can be saved, and the score is marked "Incomplete" until they are fixed.
    - **Possible duplicates:** same name (ignoring case, punctuation and
      Pty/Ltd/CC), same VAT number or same registration number. "Merge" adds
      the spend and keeps the first row's level and ownership; "Keep both" is
      remembered (new nullable column `review_decisions`, applied to staging).
    - Line colours: green at or above target, amber from half the target,
      red below half.
    - EMEs and QSEs are told plainly that the QSE procurement scorecard is not
      in the app yet; no QSE targets were invented.
    - Uploads up to 3.9 MB (server actions allow 4 MB, under Netlify's 6 MB
      request limit). Suppliers are saved 1,000 at a time and read page by
      page, because the database returns at most 1,000 rows per read: before
      this, an assessment with more suppliers showed, reported and attached
      only the first 1,000.
