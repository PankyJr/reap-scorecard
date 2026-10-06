# Taking over hosting: checklist for REAP Solutions

**For:** Tshepo and the REAP Solutions team.
**What this is:** the steps to move the REAP Scorecard app onto accounts that
REAP owns and pays for. Work top to bottom. Tick each box as you go.

## The four services, in one paragraph

The app lives in four places. **GitHub** holds the code. **Supabase** holds
the database and handles sign-in. **Netlify** builds the code and serves the
website. An **e-mail sender** (for example Resend) sends the sign-up and
password-reset e-mails. Move them in this order: GitHub first, because
Netlify reads the code from it; then Supabase; then the e-mail sender; then
Netlify.

## Before you start

- [ ] A REAP-owned GitHub account or organisation.
- [ ] A REAP-owned Supabase account and organisation.
- [ ] A REAP-owned Netlify account and team.
- [ ] The domain name the app should live on, and access to its DNS
  settings (DNS is the internet's address book: it says which server a name
  points to).
- [ ] Panky available for the hour of the switch, to hand over access.
- [ ] A decision on Supabase's plan. A free project **pauses after about a
  week with no traffic**, which takes the app offline until someone restores
  it (`scripts/ops/README.md` section 0). A paid plan does not pause. The
  price is between REAP and Supabase.
- [ ] Never paste a password, key or token into an e-mail, chat or document.
  Refer to it by name. Use each service's own settings screens or a password
  manager to pass values on.

---

## 1. GitHub: the code

The code is in the repository `PankyJr/reap-scorecard`.

**Option A, transfer the repository (recommended).** In the repository's
settings, GitHub has a "Transfer ownership" option. Panky transfers it to the
REAP organisation. Issues, history and settings move with it, and GitHub
redirects the old address.

**Option B, add REAP as an owner.** Panky adds REAP people as administrators.
The code stays under Panky's account. This is quicker but leaves REAP
depending on Panky's account.

- [ ] Repository transferred, or REAP added as administrator.
- [ ] REAP can see the Actions tab and Settings.

### Repository secrets (names only)

Set these under Settings > Secrets and variables > Actions. The values come
from Supabase (step 2), on the project's API settings page (API is the
connection the app uses to talk to the database).

| Secret | Used by | What it holds |
|---|---|---|
| `KEEPALIVE_PROD_SUPABASE_URL` | Keep Supabase awake | Production project URL |
| `KEEPALIVE_PROD_SUPABASE_ANON_KEY` | Keep Supabase awake | Production anon (public) key |
| `KEEPALIVE_STAGING_SUPABASE_URL` | Keep Supabase awake | Staging project URL, if REAP keeps a staging project |
| `KEEPALIVE_STAGING_SUPABASE_ANON_KEY` | Keep Supabase awake | Staging anon key |

The "Keep Supabase awake" job (`.github/workflows/keep-supabase-awake.yml`)
reads one row a day from each project so a free project does not pause. If a
secret is missing, that project is skipped, not failed. After setting them:

- [ ] Open Actions > "Keep Supabase awake" > Run workflow. It must go green
  and say each project "responded 2xx" (a 200-type answer).

The other workflow, `ci.yml`, checks every pull request (types, lint, tests,
build). It also deploys a **public demo** to Amazon Web Services, but only
from the branch `infra/docker-aws-ci`. That needs secrets
`DEMO_SUPABASE_URL`, `DEMO_SUPABASE_ANON_KEY`, `DEMO_USER_PASSWORD` and
variables `AWS_ROLE_ARN`, `AWS_REGION`, `ECR_REPOSITORY`, `DEMO_SITE_URL`,
`LIGHTSAIL_SERVICE`.

- [ ] Decide whether REAP wants the public demo. If not, leave those unset
  and do not push to `infra/docker-aws-ci`.

---

## 2. Supabase: the database and sign-in

There are two ways. **Transferring the existing project is simpler**,
because the data, users, keys, e-mail settings and project address all stay
the same, so nothing else has to change. Start a new project only if REAP
wants a clean start or cannot take over the existing one.

### Option A: transfer the existing production project (simpler)

Supabase lets a project be moved to another organisation (in the project's
settings). The person moving it must be allowed to manage both
organisations, so Panky is added to REAP's organisation first. Check
Supabase's current help page for the exact conditions before starting.

- [ ] Panky added to REAP's Supabase organisation.
- [ ] Production project moved to REAP's organisation.
- [ ] Panky removed from the organisation afterwards, if REAP wants.
- [ ] Database password reset by REAP (Project Settings > Database), and kept
  only in REAP's password manager.
- [ ] If the project is not yet on this version of the app, follow
  `docs/PRODUCTION_UPGRADE.md` (it checks what the database has, backs it up,
  then adds what is missing). Its table lists all eight migrations, the
  last two of which (`20261006120000_company_profile_fields.sql` and
  `20261006130000_procurement_review_decisions.sql`) only add columns.
- Skip to step 2.2.

### Option B: a new, empty project

- [ ] Create the project in REAP's Supabase organisation. Note its
  "project ref" (the short code in its address).
- [ ] From a copy of the code, with the Supabase command-line tool:
  `supabase link --project-ref <the new ref>`, then `supabase db push`.
  This runs every file in `supabase/migrations/` in filename order (20 files
  at the time of writing). They create every table, the permission rules,
  the profile-photo storage bucket (`avatars`) and the sign-up trigger.
- [ ] Do **not** run the loose `.sql` files directly inside `supabase/`
  (outside `migrations/`). They are old history; everything in them is
  already in the migrations (`docs/DEPLOYMENT.md` section 2).
- [ ] Existing users and data do not come across on their own. If they must,
  plan that separately with a backup (`scripts/ops/backup-production.sh`).

### 2.2 Sign-in settings (needed for both options)

These are not in the migrations; set them in the Supabase dashboard
(`docs/DEPLOYMENT.md` section 3, `docs/PRODUCTION_UPGRADE.md` step 4).

Authentication > URL Configuration:
- [ ] **Site URL:** the app's public address, for example
  `https://<REAP's chosen address>`. E-mail links are built from it.
- [ ] **Redirect URLs:** `<site address>/auth/callback` and
  `<site address>/**`.

Authentication > Providers > Email:
- [ ] "Confirm email" stays on.

Authentication > Email Templates:
- [ ] "Confirm signup": replace the message body with the contents of
  `supabase/email-templates/confirm-signup.html`.
- [ ] "Reset password": replace it with
  `supabase/email-templates/reset-password.html`.

Both templates link to `{{ .SiteURL }}/auth/confirm`. That page works in
whichever browser opens the e-mail, which is what makes the links work from a
phone's mail app. The Supabase default template does not.

Google or Microsoft sign-in (optional):
- [ ] Only if REAP wants it. Follow `docs/auth-oauth-google-microsoft.md`.
  The app shows those buttons only for providers switched on in Supabase.

Storage:
- [ ] Check Storage shows a bucket named `avatars` (profile photos). The
  migrations create it; it is the only bucket.

### 2.3 Make REAP staff administrators

There is no screen for this. In Supabase, open the SQL editor and run, once
per person, after they have signed up in the app:

```sql
insert into public.reap_internal_admins (user_id)
select id from auth.users where email = '<their e-mail>';
```

An administrator sees the **Admin console** (read-only views of every
client's companies and scorecards) and **Workforce targets** in the menu,
under "REAP staff". Other users cannot open either page. Only an
administrator can override which profit figure a scorecard uses.

- [ ] At least one REAP administrator set up.

Sources: `supabase/migrations/20260513120000_reap_internal_admins.sql`;
`src/lib/admin/internal-admin.ts`; `docs/DEPLOYMENT.md` section 6.

---

## 3. E-mail sender

Supabase's built-in sender is for testing. On staging it allowed **two
sign-in e-mails an hour** (`docs/DECISIONS.md` item 21), so sign-up and
password reset stall with real users. Set up REAP's own sender. Resend is one
option; any provider that offers SMTP works (SMTP is the standard way one
mail server hands mail to another).

With Resend, for example:

- [ ] Create a Resend account in REAP's name.
- [ ] Add the sending domain: REAP's own domain, or a sub-domain of it kept
  for app e-mail.
- [ ] Resend shows a few DNS records. Add them at whoever manages the
  domain's DNS. Wait until Resend shows the domain as verified.
- [ ] Create an API key in Resend. Store it in the password manager; it is
  the SMTP password.
- [ ] Resend's SMTP settings page shows the host, port and user name to use.
- [ ] In Supabase: Authentication > SMTP. Switch on custom SMTP and enter
  the host, port, user name and password from Resend, a sender address on
  the verified domain (for example `no-reply@<REAP's domain>`) and a sender
  name such as "REAP Scorecard".
- [ ] In Supabase, look at Authentication > Rate Limits and set the e-mail
  limit to suit REAP's expected sign-ups.
- [ ] Test: sign up with a real REAP address, and use "Forgot password". Both
  e-mails must arrive and their links must work, also from a phone.

---

## 4. Netlify: the website

Today the live site is `reap-scorecard.netlify.app`. Netlify builds and
publishes it **automatically every time code is merged into `main`**. So a
merge to `main` is a live release. (This is set in Netlify's dashboard, not
in `netlify.toml`.)

**Option A, move the existing site** to REAP's Netlify team. Netlify can
move a site between teams; check Netlify's help for the current steps. The
site keeps its history and address.

**Option B, create a new site** in REAP's team: Add new site > Import from
Git > pick the repository through Netlify's GitHub app. The build command
(`npm run build`) and publish folder (`.next`) are already in `netlify.toml`.

- [ ] Site is in REAP's Netlify team and connected to the GitHub repository.
- [ ] Production branch is `main`.

### 4.1 Environment variables (names only)

Set these under Site configuration > Environment variables. Values come from
Supabase (Project Settings > API) and from the site address. Variables
starting `NEXT_PUBLIC_` are fixed when the site is built, so after changing
one, **redeploy**. Source: `docs/DEPLOYMENT.md` section 4 and `.env.example`.

Required:

| Variable | What it is |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | The Supabase project address |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The anon (public) key. `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is accepted instead |
| `NEXT_PUBLIC_SITE_URL` | The public site address, no slash at the end. Must match Supabase's Site URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret. Server only. Needed for the Admin console and Workforce targets. Never give it a name starting `NEXT_PUBLIC_` |

Must be set to these values in production (they are switches, not secrets):

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_DEV_BYPASS_AUTH` | `false` |
| `AUTH_OAUTH_DEBUG` | `0` |
| `ALLOW_LOCAL_SUPABASE` | `false` |

Optional (leave unset unless there is a reason): `NEXT_IMAGE_UNOPTIMIZED`,
`PUPPETEER_EXECUTABLE_PATH`, `PROCUREMENT_PDF_USE_LOCAL_CHROME`,
`PROCUREMENT_PDF_FORCE_SERVERLESS_CHROMIUM`, `NEXT_PUBLIC_FULL_WORKBOOK_PDF`,
`NEXT_PUBLIC_ABERDARE_DEMO`, `NEXT_PUBLIC_DEMO_MODE`,
`NEXT_PUBLIC_DEMO_PASSWORD`, `GIT_COMMIT_SHA`, `PROCUREMENT_EXCEL_DEBUG`.
`PUPPETEER_SKIP_DOWNLOAD` is already set in `netlify.toml`.

- [ ] All required variables set for the **production** context.
- [ ] Site redeployed after setting them.

### 4.2 Which branch goes where

- `main` = **production** (the live site, the production Supabase project).
- Previews and other branches = **staging**. Netlify gives every context the
  production variables unless told otherwise, so a preview would otherwise
  run against the production database.
- [ ] Either switch off branch deploys and deploy previews on the production
  site, or give those contexts the **staging** Supabase variables.
- [ ] If REAP wants a separate staging site, follow "A separate Netlify
  staging site" in `docs/PRODUCTION_UPGRADE.md`.

### 4.3 Custom domain and HTTPS

- [ ] Netlify > Domain management > add REAP's domain.
- [ ] Add the DNS record Netlify asks for at the domain's DNS provider.
- [ ] Wait for Netlify to issue the HTTPS certificate (the padlock). It does
  this itself once DNS points at Netlify.
- [ ] Update `NEXT_PUBLIC_SITE_URL` to the new address and redeploy.
- [ ] Update Supabase's Site URL and Redirect URLs (step 2.2) to the same
  address.

---

## 5. Workforce targets (EAP) for production

EAP means Economically Active Population. Management control and skills
development are measured against it. The app ships with **no** EAP figures.
Without a set in use, six management control lines and most of skills
development cannot score, and no scorecard can reach a final level.

A REAP administrator creates the set in the app:

- [ ] Sign in as a REAP administrator. In the menu, under REAP staff, open
  **Workforce targets**.
- [ ] Give the set a name and the year, and click **Create and enter the
  shares**.
- [ ] Enter the six shares as percentages: African, Coloured and Indian, each
  male and female. Use the officially published EAP figures for that year:
  the Commission for Employment Equity annual report, or Stats SA's Quarterly
  Labour Force Survey (QLFS), as REAP's verification expert advises. **Never
  estimate or invent them.** The six add up to less than 100%, because the
  other groups make up the rest.
- [ ] Click **Save shares**, then **Put this set in use**.
- [ ] Record where the figures came from (report name and page) in the set's
  "Source" box.

Scorecards pick the set up when the user clicks **Attach workforce targets**
on the "Review my scorecard" step. Source: `docs/DEPLOYMENT.md` section 6;
`src/app/(dashboard)/settings/eap-targets/[id]/page.tsx`.

---

## 6. Check it works

Do these on the live site with a throwaway account, then delete what you
made. Fuller version: `docs/PRODUCTION_UPGRADE.md` step 5.

- [ ] `<site address>/api/health` shows `"status":"ok"`.
- [ ] The padlock shows (HTTPS) on the custom domain.
- [ ] Sign up with a real address. The e-mail arrives from REAP's sender. Its
  link signs you in and lands on Home.
- [ ] On a phone: sign in; then "Forgot password", open the e-mail in the
  phone's mail app, tap the link. It must open the "choose a new password"
  page.
- [ ] As a REAP administrator: Admin console and Workforce targets open, and
  a set is in use for the year.
- [ ] Add a company; start a full scorecard; upload a workbook; work through
  to **Calculate scorecard**; see the Final result; **Download report**.
- [ ] Start a procurement-only scorecard; add suppliers; see the score;
  **Download report**.
- [ ] Sign in as a second normal account. The first account's company must
  not be listed, and opening its scorecard address must show "not found".
- [ ] GitHub Actions > "Keep Supabase awake" ran green today.
- [ ] Panky's personal access removed from GitHub, Supabase and Netlify, if
  REAP wants.
