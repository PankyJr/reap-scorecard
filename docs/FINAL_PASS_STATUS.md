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
- [x] Disk: no Playwright videos or traces were recorded; screenshots are compressed JPGs (4 MB for 72); scratch files deleted at the end. 53 GB free.

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

Every screen was checked at 1440 and 390 in a real browser against the
production build (pictures and the commits to revert in
`docs/UI_BEFORE_AFTER.md`). Decisions where the build differs from the
letter of the spec are in `docs/DECISIONS.md` (39 onwards).

- [x] 4.1 One path, no dead ends, same words everywhere. Sign in → Home →
  Add company → "What do you need?" → full scorecard or procurement → areas
  with a live score → Review → Final result → Download report. Walked end to
  end by `scripts/staging-walkthrough.mjs` at both sizes: 30 links checked,
  0 broken, 0 console errors. "Area" everywhere on screen; procurement reads
  "X of 25 points, bonus Y of 2" on every screen, list, report and PDF.
- [x] 4.2 Home: next-step card with one button ("Add your first company"
  for a new user), companies with size, level or "In progress", "N of 7
  areas done", last updated and one button; two quick actions; recent
  reports; admins see every client with a "needs attention" filter. Size now
  falls back to the latest scorecard for companies added before the new
  fields (`6610393`).
- [x] 4.3 Add company: five details, the rest optional; size from the engine's
  rules shown as you type; "You may not need a full scorecard" with the reason
  and "confirm with your verification agency"; rules held as data
  (`src/lib/scorecard/rules/company-size.ts`); straight to "What do you
  need?". Turnover per scorecard year, pre-filled from last year.
- [x] 4.4 "What do you need?": two cards in the same layout, the "Not sure?"
  line, one click.
- [x] 4.5 Full scorecard entry: upload (marked Quick) or by hand; "We filled
  in 6 of the 6 areas a workbook covers" (see decision 39); checklist with
  status, points and bar; colour only for status; live score pinned on
  phones, naming the area that dropped the level; one "Next" button;
  autosave; "is that right?" checks; "Review my scorecard".
- [x] 4.6 An area: what it measures, points so far, the minimum for priority
  areas from the engine, 2 to 4 sections with what each is worth, a line and
  example per field, "More options", "From your workbook" tags, "Where you're
  losing points" in plain sentences (`d7d913e`), saves as you type, "Done,
  next area", full screen with a back link on phones.
  **Not built: evidence upload per section** (decision 40; in
  `docs/handover/KNOWN_LIMITATIONS.md` 3.1).
- [x] 4.7 Procurement only: Excel or CSV upload with templates, or by hand;
  columns matched automatically ("We found 8 000 suppliers"); Needs attention
  with one-click fixes (expired certificates first, missing level,
  duplicates, odd amounts); score marked Incomplete while problems remain;
  total spend explained and pre-filled from the list; download report;
  "Continue to full scorecard" carries it over as the procurement area,
  already done (proven in the walkthrough: "Procurement 25.00 / 25, Done").
- [x] 4.8 Procurement score: points of 25 with the bonus apart; one sentence
  on the biggest gap (and, at the 25 maximum, no longer claims every target
  is met: `49cee85`); notes on what reduces the score; one row per line with
  share, target, points and a coloured bar; open a row for its suppliers;
  "How is this calculated?"; targets from the engine (identical to the old
  figures, checked).
- [x] 4.9 Final result: level, points plus bonus, recognition, plain
  sentence, sub-minimum warning under it, bars per area, top 3 "where to gain
  points", Download report / Printable version / Edit data / Compare with
  last year, company, size, date and the draft label.
- [x] 4.10 Server PDFs with pdf-lib (no browser needed, so they run on
  Netlify): procurement and full scorecard, A4, page numbers, black-and-white
  safe. Proven from the production build on this Mac (HTTP 200,
  `application/pdf`); the procurement PDF holds all 8,000 suppliers (181
  pages). **Not yet proven on Netlify itself** (no deploy of this branch to
  the live site; previews are now stopped on purpose, see Part 5).
- [x] 4.11 First-time user test: a brand-new account went from empty to a
  Level 4 full scorecard and a procurement-only scorecard using what the
  screens offer, at both sizes (`scripts/staging-walkthrough.mjs`), plus the
  keyboard-only run. Fixed on the way: a new scorecard hid the upload choice;
  the gap sentence; formula text in the plain notes; placeholder figures that
  looked filled in. **Limit:** this is a scripted run and my own review, not
  a session with a real person who does not know B-BBEE (decision 41).
- [x] Before and after screenshots in `docs/UI_BEFORE_AFTER.md`.

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
- [x] Accessibility: axe on every screen at both sizes; keyboard-only main journey
  - axe (WCAG 2.1 A and AA) on 27 screens at 1440 and 390 (`scripts/a11y-audit.mjs`):
    19 serious problem groups at first, **0 serious or critical now** (54
    checks). The last four, on the procurement report (tables that scroll
    sideways out of keyboard reach, faded green text), were fixed in
    `89f6b5c`.
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
- [x] Loading, empty and error states; no raw technical errors. Every signed-in area has a loading screen and the shared plain error and not-found pages; the walkthroughs saw no raw error text.
  - [x] A damaged workbook showed the library's own text ("Unsupported ZIP
    encryption"); now a plain instruction (`436f9a0`, test fails on the old code).
  - [x] PDF buttons that could not work on Netlify: the older scorecard report
    now uses the server PDF that runs there, for owners and REAP admins
    (`e12b09d`); full-workbook reports offer print-to-PDF instead of a dead
    button (`2a079aa`). Both tests fail on the old code.
  - [x] Procurement save errors no longer say "Apply pending Supabase
    migrations"; plain words, detail in the log (`68084e4`).
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
- [x] Separate staging site: `netlify.toml` and docs (`617f045`).
  **Found on the way, and important:** the live Netlify site gives
  `NEXT_PUBLIC_SUPABASE_URL` the **production** value for every context
  (read from the site's settings; only names and which project, no values
  printed). So every deploy preview of PR #2 and PR #3 has run branch code
  against the production database. `netlify.toml` now stops any preview or
  branch build pointed at production; the first preview after it failed, as
  intended. The last good preview, `deploy-preview-3--reap-scorecard.netlify.app`
  (commit `4355d63`), **is still online and still on production**. Fix: step A
  of "A separate Netlify staging site" in `docs/PRODUCTION_UPGRADE.md` (needs
  your Netlify login), then delete or lock old previews.
- [x] `docs/FOR_STUART.md`: 50 rules in 11 groups, each with its figures, where it is in the code and a line for Stuart to mark.

## Found on the way

- **PR #3 did not build from a clean checkout.** Two committed pages imported
  `src/lib/company/profile.ts`, which had never been committed. Fixed in
  `1726f01`; a clean checkout of the branch now type-checks (exit 0).

## Part 6: test everything

- [x] Tests, type check, ESLint green; coverage thresholds met. 1,273 tests pass (1 skipped: needs a client workbook that is not in git); type check clean; ESLint 0 errors and the 6 known warnings; engine coverage statements 81.7% (floor 76), branches 71.6% (66), functions 89.1% (82), lines 84.1% (78).
- [x] A test for everything added or fixed, each shown to fail without the fix (each commit message or this file says how; the helpers' reports list theirs).
- [x] Golden benchmark exact in tests (`golden-workbook.test.ts`) and in the browser: a new account importing the golden workbook through the screens gets total 54.69, ED 3.63, SD 7.25, SED 3.00 on the result page, at 1440 and at 390; with procurement attached, 81.69 and Level 4.
- [x] Production build succeeds on this Mac (rebuilt after every batch of changes today; the last one is what the preview serves).
- [ ] Playwright walkthrough on staging at both sizes, then a final run from scratch
  - [x] Both sizes: completed, 0 console errors, 0 failed requests, 0 HTTP errors, 0 broken links of 30.
- [x] Staging test data cleaned. Every script's throwaway logins delete themselves. Removed the old preview login `panky.preview@reap-staging.example` (made by an assistant session on 1 October) and its three companies. Staging now has three logins: yours (`panky.review@…`, with its two companies), `bbbee@infinicolon.co.za`, and the reviewer `bongani.review@…` with its sample and probe companies (kept, as decided in the earlier clean-up). The shared workforce-target set stays.

## Part 7: production

- [x] Access check, re-run 6 October at the end of the pass. **Blocked:**
  `supabase projects list` on this Mac shows no REAP project at all (the CLI
  is signed in to an account without access), and `.env.prod-dump.local`
  does not exist. **Nothing on production was touched.** These are the
  commands for you, in order. Run them from the repo folder on this Mac.

**1. Give the CLI access and the database password** (both stay on this Mac):

```bash
supabase login                       # sign in as the account that owns the REAP project
supabase projects list               # pmjuiynjelhjlpyohbvk must be listed
# Supabase dashboard > the REAP project > Project Settings > Database > Database password.
# Paste it after the = sign; the file is git-ignored.
printf 'PGPASSWORD=' > .env.prod-dump.local && pbpaste >> .env.prod-dump.local
```

If the project shows as paused, press Restore in the dashboard and wait until
it says Healthy.

**2. Back up production, outside the repo:**

```bash
bash scripts/ops/backup-production.sh          # prints the row counts it saw
mkdir -p ~/REAP-backups && mv backups/reap-prod-*.sql ~/REAP-backups/
ls -lh ~/REAP-backups/
```

**3. Prove the backup restores** into a throwaway local database (needs
Docker running; deletes nothing real):

```bash
docker run -d --name reap-restore-test -e POSTGRES_PASSWORD=throwaway -p 55432:5432 postgres:17
sleep 8
F=$(ls -t ~/REAP-backups/reap-prod-*.sql | head -1)
PGPASSWORD=throwaway psql -h localhost -p 55432 -U postgres -c 'create role authenticated; create role anon; create role service_role;' 2>/dev/null
PGPASSWORD=throwaway psql -h localhost -p 55432 -U postgres -q -f "$F" > /tmp/restore.log 2>&1
PGPASSWORD=throwaway psql -h localhost -p 55432 -U postgres -At -c "select 'companies', count(*) from public.companies union all select 'procurement_assessments', count(*) from public.procurement_assessments union all select 'procurement_suppliers', count(*) from public.procurement_suppliers union all select 'procurement_results', count(*) from public.procurement_results"
docker rm -f reap-restore-test
```

The four counts must match what step 2 printed. Errors in `/tmp/restore.log`
about Supabase's own roles and extensions are expected; missing rows are not.

**4. Check for the tenant-isolation gap** (read-only), following
`docs/PRODUCTION_UPGRADE.md` step 1 (query 1d lists every policy on
`companies`, `procurement_*` and `profiles`). If any policy says only
"authenticated" without `owner_id = auth.uid()`, production has the gap and
migration 6 closes it.

**5. Apply the eight migrations** exactly as `docs/PRODUCTION_UPGRADE.md`
step 3 says (`supabase link --project-ref pmjuiynjelhjlpyohbvk`,
`supabase migration list`, `supabase db push --dry-run`, then
`supabase db push`), running the check after each one.

**6. Read-only isolation check on production.** This only reads, as an
anonymous visitor, using the public anon key (Project Settings > API):

```bash
URL=https://pmjuiynjelhjlpyohbvk.supabase.co
ANON='<production anon key>'
for t in companies profiles procurement_assessments procurement_suppliers procurement_results scorecard_assessments; do
  printf '%s: ' "$t"
  curl -s "$URL/rest/v1/$t?select=id&limit=5" -H "apikey: $ANON" -H "Authorization: Bearer $ANON"; echo
done
```

Every line must be `[]`: an anonymous visitor sees no rows. That is only
proof if those tables have rows, which step 2's counts show. Then run
`docs/PRODUCTION_UPGRADE.md` step 1 query 1d again: every policy must name the
owner. (`scripts/staging-tenant-isolation-check.ts`, which passed 74 of 74 on
staging, creates and deletes two test accounts and refuses any database but
staging, so it is not for production.)

**7. Do not merge yet.** The live site keeps the old code until you merge
PR #3. Before merging, do step A of "A separate Netlify staging site" in
`docs/PRODUCTION_UPGRADE.md` (deploy previews currently use the production
database; see Part 5).

## Part 8: handover pack (`docs/handover/`)

- [x] `TRANSFER_CHECKLIST.md`
- [x] `WALKTHROUGH_SCRIPT.md`
- [x] `WARRANTY_AND_SUPPORT.md`
- [x] `RELEASE_NOTES.md`
- [x] `KNOWN_LIMITATIONS.md`
