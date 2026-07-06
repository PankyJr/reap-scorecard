# Afrihost cPanel Node Deployment (Passenger)

This project is a Next.js 16 App Router server application and must run as a Node app (not static-only hosting).

## Runtime Recommendation

- Node.js: **20.x LTS**
- App mode: **Production**
- Startup file: `app.js`

## Environment Variables

Set these in cPanel **before running build**.

### A) Public variables (embedded into client bundles)

- `NEXT_PUBLIC_SITE_URL=https://reap-solutions.co.za`
- `NEXT_PUBLIC_SUPABASE_URL=<your supabase project url>`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=<your supabase publishable key>`
- `NEXT_PUBLIC_DEV_BYPASS_AUTH=false`

### B) Private server variables

- `SUPABASE_SERVICE_ROLE_KEY=<server secret only>`

### C) Development/debug variables (keep disabled in production)

- `AUTH_OAUTH_DEBUG=0`
- `ALLOW_LOCAL_SUPABASE=false`

### Optional shared-hosting compatibility switch

- `NEXT_IMAGE_UNOPTIMIZED=true`

## Build and Start

From app root in cPanel terminal:

```bash
npm install
npm run build
```

Passenger launches `app.js`, which starts the built Next app.

## Supabase Auth Configuration

Supabase Dashboard → Authentication → URL Configuration:

- Site URL: `https://reap-solutions.co.za`
- Redirect URLs:
  - `https://reap-solutions.co.za/auth/callback`
  - `https://www.reap-solutions.co.za/auth/callback`
  - `http://localhost:3000/auth/callback` (dev only)

## Domain and HTTPS

`public/.htaccess` enforces:

- HTTPS
- `www` → non-`www`

Canonical metadata is set to `https://reap-solutions.co.za` fallback in `src/app/layout.tsx`.

## Post-Deploy Smoke Test

1. `/`
2. `/login`
3. OAuth callback flow (`/auth/callback`)
4. `/dashboard` after sign-in
5. `/procurement/assessments/new`
6. report/PDF endpoints
