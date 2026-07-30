# Staging deployment notes

## Current connection model

The Netlify site **`reap-scorecard-staging`** (`https://reap-scorecard-staging.netlify.app`) currently clones **`PankyJr/reap-scorecard`** using a **temporary read-only GitHub deploy key**.

| Item | Status |
|------|--------|
| Deploy key | Present and working (read-only) |
| Official Netlify GitHub App | **Not linked** (`installation_id` is null) |
| Automatic deploy on push | **Not available** while the GitHub App is unlinked |
| Manual remote build | **Required** — trigger a clear-cache build from the Netlify API/UI after pushing |

Keep the working staging deploy key in place until the official GitHub App integration is connected. Do not remove it yet.

## Required before production release

1. Link Netlify’s **official GitHub App** to `PankyJr/reap-scorecard` for the staging (and later production) site.
2. Confirm clones use the GitHub App (HTTPS), not a long-lived SSH deploy key, for day-to-day deploys.
3. Verify automatic branch deploys for the intended production branch.
4. Only then retire the temporary staging deploy key if it is no longer needed.

## Staging Supabase

Staging must continue to use project reference **`jzvqyryblsfxlinvoiuf`**. Do not point the staging Netlify site at production Supabase (`pmjuiynjelhjlpyohbvk`).

## Manual deploy reminder

Until the GitHub App is linked:

```bash
# After pushing feature/full-scorecard-calculator (or the configured deploy branch),
# trigger a remote Netlify build for reap-scorecard-staging (clear cache recommended).
```

Do not use a local Netlify CLI deploy as a substitute for the remote staging pipeline when verifying Full Scorecard Calculator releases.
