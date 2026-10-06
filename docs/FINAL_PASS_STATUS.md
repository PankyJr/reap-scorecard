# Final pass: live status

Updated as the work goes. A ticked box means done and checked; anything
partial says so.

## See it yourself

| | |
|---|---|
| Laptop | http://localhost:3005 |
| Phone (same Wi-Fi as the laptop) | http://192.168.1.97:3005 |
| Login | `panky.review@reap-staging.example` |
| Password | in `tmp/staging-secrets/review-login.json` on the laptop (git-ignored, never committed) |

- The app runs from a production build against **staging** (`jzvqyryblsfxlinvoiuf`).
- **Golden Sample Manufacturing (Pty) Ltd** is finished: golden workbook,
  everything confirmed, a procurement scorecard attached. Level 4, 81.69 points.
  That is the golden 54.69 plus 27 procurement points. Its enterprise
  development is 3.63, supplier development 7.25 and socio-economic
  development 3.00.
- **Halfway Logistics (Pty) Ltd** has its workbook imported and its size set,
  nothing else, so the in-progress screens show.
- Port 3000 was taken by another project on this Mac, so the app uses 3005.
- Sign-in was tested on both addresses (the phone one emulating an iPhone 13):
  it lands on Home with both companies and no errors. Plain http works,
  because the sign-in cookie is not marked secure, so no tunnel was needed.
- If the laptop's Wi-Fi address changes, the phone link changes with it.
- To recreate the login and companies: `scripts/staging-seed-review-login.mjs`.

## First

- [x] Merge main into `fix/final-pass` to fix the README clash (`d8c2eec`). PR #3 is mergeable again.
- [x] PR #2 is fully inside PR #3 (`git merge-base --is-ancestor`). Closed with a note; branch kept.
- [x] The temporary phone-preview lines in `next.config.ts` stay uncommitted.
- [ ] Disk: Playwright video and trace off, screenshots compressed, scratch files deleted at the end.

## Part 1: on the laptop and phone

- [x] `.env.local` points at staging (contains `jzvqyryblsfxlinvoiuf`, not production).
- [x] Confirmed staging login via the admin API, with two sample companies.
- [x] App reachable on the Wi-Fi; sign-in tested on both addresses.
- [x] Links and login at the top of this file.

## Part 2: mobile sign-in on the live site

- [x] Found the causes from code and config:
  1. The sign-in form only worked through JavaScript. A tap that lands
     before the page loads (common on phones, often right after autofill)
     did nothing. On `main` it also put the password in the address bar.
  2. Confirmation and reset links needed a cookie from the browser that
     asked for the e-mail, so they failed when opened from a phone's mail app.
  3. `main` has no menu on phones (already fixed on this branch).
  4. Settings: Site URL, `NEXT_PUBLIC_SITE_URL`, e-mail templates.
- [x] Reproduced on staging with an emulated iPhone 13, tap before
  JavaScript: lands back on `/login`, not signed in.
- [x] Fixed in code:
  - `e074f3d`: the form posts straight to the server action. Same test now
    lands on Home, signed in. The new unit test fails on the old form.
  - `6b4d3f0`: `/auth/confirm` works in any browser. A real staging reset
    token opened in a fresh phone browser shows the new-password form.
- [x] Settings written into `docs/PRODUCTION_UPGRADE.md`, step 4.5. Staging's
  e-mail templates need the same paste (needs dashboard access).

## Part 3: the Gantt chart

- [x] Searched every branch, the stash, all 167 commits, `package.json`
  history, the docs and sibling projects on this Mac. **It never existed in
  this repo.** Nothing was invented. Details in `docs/DECISIONS.md`.

## Part 4: match the agreed design

- [ ] 4.1 One path, no dead ends, same words everywhere
- [ ] 4.2 Home
- [ ] 4.3 Add company
- [ ] 4.4 "What do you need?"
- [ ] 4.5 Full scorecard entry
- [ ] 4.6 An area's page
- [ ] 4.7 Procurement only
- [ ] 4.8 Procurement score
- [ ] 4.9 Final result
- [ ] 4.10 Server PDFs (procurement and full scorecard), working on Netlify
- [ ] 4.11 First-time user test
- [ ] Before and after screenshots in `docs/UI_BEFORE_AFTER.md`

## Part 5: beyond the brief

- [x] Scale: 8,000 suppliers through the real screens on staging, with a
  throwaway login deleted afterwards (0 scorecards left behind each time).
  Synthetic list: 8,000 suppliers, 160 with no level, about 80 expired
  certificates, 20 listed twice. Production build on this Mac, staging
  database in Frankfurt. Final run:

  | Step | Time |
  |---|---|
  | Upload, read and match columns ("We found 8 000 suppliers") | 0.8 s |
  | Supplier list shown (50 a page, 160 pages) | 0.6 s |
  | Needs attention worked out ("261 things need your attention") | 0.05 s |
  | Save all 8,000 and open the score page | 8.4 s |
  | Score page (25.00 of 25, bonus 2.00 of 2, marked Incomplete) | 5.0 s |
  | PDF: 181 pages, 1.79 MB, every supplier | 4.4 s |
  | Edit page loads all 8,000 back | 4.0 s |

  It found and fixed three problems:
  - **The PDF held only the first 1,000 suppliers** (27 pages): the
    database returns at most 1,000 rows per read (`bfd78a5`).
  - Reading 8,000 rows one page after another took 5.1 s; four pages at a
    time, 1.0 s (`6efa616`). Score page 7.4 → 5.0 s, PDF 7.8 → 4.4 s,
    report 10.3 → 6.6 s, edit 7.5 → 4.0 s.
  - The score page's three reads now run together (`92a8998`).

  Still heavy at this size, not fixed: the score page sends 3.1 MB of
  HTML (all suppliers for the paged breakdown and the one-click fixes), the
  printable report 13 MB (it prints every supplier; the PDF is the lighter
  download), the edit page 3.7 MB. Hosting compresses these several times
  over. 8,000 suppliers in one scorecard is the extreme case: production
  holds about 7,800 supplier rows across all its scorecards.
- [ ] Accessibility: axe on every screen at both sizes; keyboard-only main journey
  - axe (WCAG 2.1 A and AA) on 27 screens at 1440 and 390 (`scripts/a11y-audit.mjs`):
    19 serious problem groups at first, **4 left, all on the procurement
    report page** (being fixed with the procurement wording work).
    - The faint grey text was 3.9 to 4.3:1 against its backgrounds (4.5:1
      needed). One token change fixed every case (`5f4a4aa`); a test measures
      it against every background and fails on the old colour.
    - The hidden profile-photo field had no name (`5f4a4aa`).
  - Dark mode: the app stays light on purpose; axe with the device in dark
    mode found nothing serious on 6 main screens at both sizes.
  - Keyboard only (`scripts/keyboard-journey.mjs`, a throwaway login deleted
    afterwards): sign in, Home's next step, add a company (dropdowns by
    typing), "What do you need?", create the scorecard, "Start with …", type
    a figure, "Done, next area", and the result step. **Completed at 1440
    and 390**, every focused element showed a focus ring, 0 console errors.
    It found two real problems, both fixed and tested:
    - A new scorecard hid "Upload your workbook" because company size is
      pre-filled (`76d3a7a`).
    - "Skip to content" was the 9th Tab stop and missing on phones (`d80eb43`).
- [x] Performance: Lighthouse mobile (simulated mid-range phone, throttled
  network) against the production build on staging data, all signed in:
  sign in 98, Home 93, What do you need? 95, scorecard overview 85, Ownership
  93, final result 94, procurement score 92. Accessibility 100 and best
  practices 100 on all seven. Nothing below 80, so nothing to fix. Server
  response was 0.7 to 0.9 s, mostly the trips from this Mac to the staging
  database in Frankfurt.
- [x] Security, checked on the wire against the production build:
  - Tenant isolation on staging: `scripts/staging-tenant-isolation-check.ts`,
    **74 of 74 checks passed** (e.g. "B cannot read other users' profiles or
    e-mails (0 foreign rows)", "Anonymous visitor cannot read companies (0
    rows)", "A still reads own company" — the last one proves the empty
    results are not vacuous). Its two test accounts are deleted at the end.
  - Security headers (`4cf6f66`): all six present on a real response;
    `X-Powered-By` gone.
  - No secrets in the browser: the service-role key appears in 0 of 62
    browser JavaScript files.
  - Rate limits in plain words (`7184a2b`): "Too many e-mails have been sent
    from this site in the last hour. Wait up to an hour, then try again."
- [x] Security: the build no longer copies `tmp/` (staging passwords, client data), docs or source into its output (`d5c2167`; found in Part 1). PDF route trace 1,990 → 718 files; standalone 197 → 110 MB.
- [ ] Loading, empty and error states on every screen; no raw technical errors
  - [x] A damaged workbook showed the library's own text ("Unsupported ZIP
    encryption"); now a plain instruction (`436f9a0`, test fails on the old code).
  - [x] PDF buttons that could not work on Netlify: the older scorecard report
    now uses the server PDF that runs there, for owners and REAP admins
    (`e12b09d`); full-workbook reports offer print-to-PDF instead of a dead
    button (`2a079aa`). Both tests fail on the old code.
  - [ ] Procurement save errors still say "Apply pending Supabase migrations"
    (being fixed with the procurement wording work).
- [x] Keep-awake job checked (`.github/workflows/keep-supabase-awake.yml`):
  - The read it makes works: staging answered `200` with `[]` (the strict
    access rules hide every row from an anonymous visitor, which is fine: it
    is still a real database request).
  - **It has never run.** It is only on this branch, not on `main`, and
    GitHub only runs scheduled jobs from `main`. It starts after PR #3 is
    merged.
  - **None of its secrets are set.** GitHub → the repository → Settings →
    Secrets and variables → Actions → New repository secret, four times:
    - `KEEPALIVE_PROD_SUPABASE_URL` = production's Project URL
    - `KEEPALIVE_PROD_SUPABASE_ANON_KEY` = production's anon (public) key
    - `KEEPALIVE_STAGING_SUPABASE_URL` = staging's Project URL
    - `KEEPALIVE_STAGING_SUPABASE_ANON_KEY` = staging's anon (public) key
    (Supabase dashboard → the project → Project Settings → API.) Then run it
    once by hand: Actions → Keep Supabase awake → Run workflow.
  - GitHub pauses scheduled jobs in a repository with no activity for 60
    days; a paid Supabase plan does not pause at all.
- [ ] Separate staging site: `netlify.toml` and docs
- [ ] `docs/FOR_STUART.md`

## Found on the way

- **PR #3 did not build from a clean checkout.** Two committed pages imported
  `src/lib/company/profile.ts`, which had never been committed. Fixed in
  `1726f01`; a clean checkout of the branch now type-checks (exit 0).

## Part 6: test everything

- [ ] Tests, type check, ESLint green; coverage thresholds met
- [ ] A test for everything added or fixed, each shown to fail without the fix
- [ ] Golden benchmark exact in tests and in the browser
- [x] Production build succeeds on this Mac (start of the pass; re-checked at the end)
- [ ] Playwright walkthrough on staging at both sizes, then a final run from scratch
- [ ] Staging test data cleaned (except the review login, `bbbee@infinicolon.co.za` and the reviewer login)

## Part 7: production

- [ ] Access check. **Blocked:** the Supabase CLI on this Mac cannot see any
  REAP project, and `.env.prod-dump.local` does not exist, so nothing on
  production is touched. The exact commands for you are listed below.

## Part 8: handover pack (`docs/handover/`)

- [ ] `TRANSFER_CHECKLIST.md`
- [ ] `WALKTHROUGH_SCRIPT.md`
- [ ] `WARRANTY_AND_SUPPORT.md`
- [ ] `RELEASE_NOTES.md`
- [ ] `KNOWN_LIMITATIONS.md`
