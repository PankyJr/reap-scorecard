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

- [ ] Scale: 8,000 suppliers on staging (upload, matching, scoring, table, PDF), then clean up
- [ ] Accessibility: axe on every screen at both sizes; keyboard-only main journey
- [ ] Performance: Lighthouse mobile on the main screens
- [ ] Security: tenant isolation, security headers, no secrets in the client bundle, plain rate-limit messages
- [x] Security: the build no longer copies `tmp/` (staging passwords, client data), docs or source into its output (`d5c2167`; found in Part 1). PDF route trace 1,990 → 718 files; standalone 197 → 110 MB.
- [ ] Loading, empty and error states on every screen; no raw technical errors
- [ ] Keep-awake job checked; exact GitHub secrets listed
- [ ] Separate staging site: `netlify.toml` and docs
- [ ] `docs/FOR_STUART.md`

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
