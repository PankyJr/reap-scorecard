# Google & Microsoft sign-in (Supabase OAuth)

## Current state (codebase)

- **Google** and **Microsoft** use the same server path: `signInWithOAuth` in `src/app/(auth)/login/actions.ts`, then **`/auth/callback`** (`src/app/auth/callback/route.ts`) with PKCE (`exchangeCodeForSession`).
- **No extra app env vars** are required for these providers beyond `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Client IDs and secrets are configured in the **Supabase Dashboard**, not in this repo.
- **Microsoft (`azure`)** requests the **`email` scope** (required by Supabase so Entra ID returns a usable email).

If a button “does nothing” or always errors, the usual cause is **dashboard / IdP configuration**, not missing React code.

---

## 1. Supabase Dashboard

**Authentication → URL configuration**

- **Site URL**: production site root, e.g. `https://yourdomain.com` (not localhost in prod).
- **Redirect URLs**: must include every URL Supabase may send users back to after OAuth, including:
  - Local: `http://localhost:3000/auth/callback` (adjust port if needed)
  - Production: `https://yourdomain.com/auth/callback`
  - Optional: preview URLs, e.g. `https://*.vercel.app/auth/callback` if you use wildcards (see [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls))

**Authentication → Providers**

- Enable **Google** and **Azure (Microsoft)** and paste the **Client ID** and **Client Secret** from each provider’s console.

**Important:** Identity providers must register Supabase’s callback, not your app’s domain, as the OAuth redirect target (see Microsoft section below).

---

## 2. Microsoft (Azure Entra ID)

### Redirect URI to register in Azure

Use Supabase’s callback (from [Supabase Azure guide](https://supabase.com/docs/guides/auth/social-login/auth-azure)):

```text
https://<PROJECT_REF>.supabase.co/auth/v1/callback
```

Replace `<PROJECT_REF>` with your Supabase project reference (Project Settings → API → Project URL).

### Azure Portal

1. **Microsoft Entra ID** → **App registrations** → **New registration**.
2. Set a **Redirect URI** (Web) to the URL above.
3. Create a **Client secret**; copy the **Value** (not only the Secret ID).
4. Copy **Application (client) ID** into Supabase **Azure** provider settings with the secret.

### Local development notes

- Azure does **not** allow `127.0.0.1` as a redirect hostname; use **`localhost`** if you register localhost URIs elsewhere.
- Hosted Supabase always redirects through `*.supabase.co`; your app’s `redirectTo` (`…/auth/callback`) must still be listed under Supabase **Redirect URLs** as in section 1.

### Optional (recommended by Supabase)

Configure optional claims (`xms_edov`, `email`) in the app manifest for verified email — see the [Supabase Azure documentation](https://supabase.com/docs/guides/auth/social-login/auth-azure).

### Tenant

- Default **common** tenant works for many apps; single-tenant or **consumers**-only apps need the matching **Azure Tenant URL** in Supabase (see same doc).

---

## 3. Exact callback URLs checklist

| Environment   | Must appear in Supabase **Redirect URLs**   |
|---------------|-----------------------------------------------|
| Local dev     | `http://localhost:<PORT>/auth/callback`      |
| Production    | `https://<your-domain>/auth/callback`        |

**Azure (Microsoft)** must register this redirect URI:

| `https://<PROJECT_REF>.supabase.co/auth/v1/callback` |

**Google Cloud** OAuth client: add the same Supabase callback URL to authorized redirect URIs as required by Supabase’s Google provider setup.

---

## 4. Environment variables (this repo)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |

Optional:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SITE_URL` | Fallback for server action origin detection when `Host` headers are missing |
| `AUTH_OAUTH_DEBUG` | Set to `1` for callback route debug logs (see `.env.local.example`) |

OAuth client secrets belong in the **Supabase Dashboard**, not in Next.js env for this integration.

---

## 5. Quick test plan

### Localhost

1. Add `http://localhost:3000/auth/callback` to Supabase Redirect URLs (adjust port).
2. Ensure Azure redirect URI includes the Supabase `…/auth/v1/callback` URL.
3. Sign in with Google and Microsoft; confirm redirect to `/dashboard` or the `next` query target.

### Production

1. Set Site URL and production `/auth/callback` redirect URL.
2. Repeat OAuth on the production domain; confirm no redirect to localhost.
