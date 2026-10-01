# Deploying REAP Scorecard from scratch

This is the full path from an empty Supabase account and an empty host to a
working instance, using only this repository. It was written during the
end-to-end audit of 2026-09-30, in which every migration was applied to an
empty Postgres 17 database and the built app was walked from sign-up to a final
scorecard. What was and was not proven is listed at the end.

## 1. What you need

- Node.js 20 and npm (the lockfile is authoritative: use `npm ci`).
- A Supabase project (Postgres 17).
- A host for a Next.js 16 server app: Netlify (what production uses), the
  Docker image in this repo, or a Node host (see
  `docs/deployment-afrihost-cpanel-node.md`). It is not a static site.
- The Supabase CLI for applying migrations.

## 2. Database

```bash
supabase link --project-ref <your-project-ref>
supabase db push          # applies everything in supabase/migrations, in order
```

All 18 migrations apply cleanly to an empty database and are safe to re-run.
They create every table, the row level security policies, the `avatars`
storage bucket and the trigger that creates a profile row for each new user.

Do not run the loose files in `supabase/*.sql` (`schema.sql`,
`phase1_…`, `phase2_…`, `phase3_strict_rls.sql`, and so on). They are the
history of how the first project was built by hand. Everything they did is in
the migrations; `phase3_strict_rls.sql` became
`20260930120000_strict_owner_rls.sql`.

On a project that already holds data, read the header of
`20260930120000_strict_owner_rls.sql` first: a company with no `owner_id`
becomes invisible to every user once it is applied. The migration prints how
many such companies exist.

## 3. Supabase settings that are not in the migrations

Authentication > URL Configuration

- Site URL: the public origin of the app, identical to `NEXT_PUBLIC_SITE_URL`.
- Redirect URLs: `<origin>/auth/callback` and `<origin>/**`. Sign-up
  confirmation and password reset both return through `/auth/callback`.

Authentication > Providers > Email

- Keep "Confirm email" on. Sign-up shows "Check your email" and signs the user
  in when the link is opened.

Authentication > Email Templates

- Paste `supabase/email-templates/confirm-signup.html` into "Confirm signup"
  and `supabase/email-templates/reset-password.html` into "Reset password".

Authentication > SMTP

- Supabase's built-in mail sender is rate limited to a handful of messages an
  hour and is meant for testing. Configure your own SMTP before real users
  sign up, or sign-up and password reset will silently stall.

Google or Microsoft sign-in is optional: see
`docs/auth-oauth-google-microsoft.md`.

## 4. Environment variables

`NEXT_PUBLIC_*` values are compiled into the build. Changing one means
rebuilding, not just restarting. Everything else is read when the server runs.

Required

| Variable | What it is |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL, `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The anon / publishable key. Public by design. `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is accepted as an alternative name |
| `NEXT_PUBLIC_SITE_URL` | Public origin, no trailing slash. Used for e-mail and OAuth links |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only. Needed for the internal admin console (`/admin`) and the EAP targets screen. Never give it a `NEXT_PUBLIC_` name |

Keep at these values in production

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_DEV_BYPASS_AUTH` | `false` |
| `AUTH_OAUTH_DEBUG` | `0` |
| `ALLOW_LOCAL_SUPABASE` | `false` |

Optional

| Variable | Effect |
|---|---|
| `NEXT_IMAGE_UNOPTIMIZED` | `true` on hosts that cannot run image optimisation |
| `PUPPETEER_EXECUTABLE_PATH` | Path to Chrome/Chromium for PDF export. Set automatically in the Docker image. Not needed on Netlify |
| `PROCUREMENT_PDF_USE_LOCAL_CHROME`, `PROCUREMENT_PDF_FORCE_SERVERLESS_CHROMIUM` | Force which browser the procurement PDF uses. Local development only |
| `NEXT_PUBLIC_FULL_WORKBOOK_PDF` | `true` shows the PDF export on the older full-workbook calculator |
| `NEXT_PUBLIC_ABERDARE_DEMO` | `true` shows the client workspace selector. Leave unset |
| `NEXT_PUBLIC_DEMO_MODE`, `NEXT_PUBLIC_DEMO_PASSWORD` | Public demo build only (see the Dockerfile and `.github/workflows/ci.yml`) |
| `GIT_COMMIT_SHA` | Shown by `/api/health`. Reports `unknown` when unset |
| `PROCUREMENT_EXCEL_DEBUG` | `1` logs Excel import diagnostics on the server |

`.env.example` is the template for local development: copy it to `.env.local`.

## 5. Hosting

Netlify

- Connect the repository through Netlify's GitHub App so pushes deploy.
- Build command `npm run build`, publish directory `.next`. `netlify.toml`
  already declares both and the Next.js plugin.
- Set the variables from section 4 for the production context.
- PDF export uses `@sparticuz/chromium` on Netlify; nothing to configure.

Docker

- `docker build` with `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_SITE_URL` as build args,
  then run with `SUPABASE_SERVICE_ROLE_KEY` in the container environment. The
  header of the `Dockerfile` has the exact command.

The build downloads the Public Sans, Source Serif 4, Inter and Geist fonts from Google Fonts. A build
machine with no access to `fonts.gstatic.com`, or a dropped connection during
the download, fails the build. Re-running it is the fix.

## 6. First-run setup inside the app

1. Sign up on the sign-in page ("Create account") and confirm the e-mail.
2. Make that account an internal admin. There is no screen for this; it is one
   SQL statement, run in the Supabase SQL editor:

   ```sql
   insert into public.reap_internal_admins (user_id)
   select id from auth.users where email = '<admin e-mail>';
   ```

3. Create the workforce (EAP) target set for the measurement year, in the
   app. Sign in as the admin and open **Workforce targets** in the menu, under
   REAP staff.
   - Give the set a name and the year, and click "Create and enter the
     shares".
   - Enter the six population shares as percentages: African, Coloured and
     Indian, men and women, from the Commission for Employment Equity's
     published figures. Click "Save shares".
   - Click "Put this set in use".

   Only one set is in use per year and area. Putting a new one in use
   replaces the old one, which stays readable. Scorecards pick up the set
   when the user clicks "Attach workforce targets" on the Calculate step.
   Without one, the occupational-band indicators in Management Control and
   Skills Development cannot be scored.

## 7. Keeping it alive and backed up

- A free-tier Supabase project pauses after seven days without traffic, which
  takes the app offline. `.github/workflows/keep-supabase-awake.yml` pings it
  daily once its repository secrets are set. See `scripts/ops/README.md`.
- `scripts/ops/backup-production.sh` takes a full `pg_dump`.

## 8. Smoke test after a deploy

`scripts/staging-final-walkthrough.mjs` does all of this in a browser, with a
screenshot of every step at desktop and phone width. It runs against a local
build pointed at staging; see its header. By hand:


1. `GET /api/health` returns `{"status":"ok"}`.
2. Sign up, confirm the e-mail, land on the dashboard.
3. Create a company, then a procurement assessment; open it and download the PDF.
4. Start new, then Full B-BBEE scorecard: upload the workbook, check what it
   read and confirm, set Company size and sector, confirm the evidence on the
   contribution records, attach a procurement scorecard and the workforce
   targets, calculate, and open the report.
5. Sign in as a second account and confirm the first account's company is not
   listed.

## 9. Upgrading an existing production database

Follow `docs/PRODUCTION_UPGRADE.md`: it finds out what the database already
has, backs it up, applies the missing migrations in order with a check after
each, and covers rollback and a separate Netlify staging site.

## 10. What the 2026-09-30 audit proved, and what it did not

Proven on a throwaway local Supabase stack built from this repo: every
migration applies to an empty database; sign-up, e-mail confirmation, sign-in,
sign-out and password reset; company create and edit; procurement assessment
create, edit, delete, report and PDF; the full seven-element generic scorecard
to a final level, matching the golden benchmark (54.69) exactly; the printable
report; tenant isolation through the raw API.

Not proven: a deploy to a real Netlify site or a hosted Supabase project.
Staging and production were both paused on the day. Netlify's PDF path
(`@sparticuz/chromium`), real e-mail delivery and OAuth sign-in were not
exercised.

The final pass of 2026-10-01 then proved the same journey on the hosted
staging project (`jzvqyryblsfxlinvoiuf`) with the built app. That covered
real sign-up and reset e-mail links, the golden benchmark in the browser,
tenant isolation across 74 raw-API attacks, and the admin roles. A Netlify
deploy and Netlify's PDF path remain unproven, because nothing was deployed.
