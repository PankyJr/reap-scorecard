/**
 * Which OAuth providers this Supabase project actually has enabled.
 *
 * The login page used to render Google and Microsoft buttons unconditionally.
 * `supabase.auth.signInWithOAuth()` builds its authorize URL locally without
 * asking the server whether the provider exists, so a disabled provider was
 * only discovered *after* a top-level navigation — leaving the user stranded on
 * a raw GoTrue JSON error page, outside the app, with no way back.
 *
 * GoTrue publishes the answer at `/auth/v1/settings`, so we read it rather than
 * hardcoding a list or trusting a build-time flag to be kept in step with the
 * dashboard.
 *
 * Everything here fails CLOSED: any missing config, network fault, timeout or
 * unexpected payload yields an empty list, which hides the buttons. A hidden
 * button on a working project is a cosmetic bug; a visible button on a broken
 * one throws the user out of the application.
 */

import type { OAuthProviderId } from './oauth-errors'

/** Providers the app has UI and copy for. Others stay hidden even if enabled. */
export const SUPPORTED_OAUTH_PROVIDERS: readonly OAuthProviderId[] = ['google', 'azure']

/** Give up quickly: the login page must not hang on this lookup. */
const SETTINGS_TIMEOUT_MS = 2500

/** Cache window for the provider list, in seconds. Enabling a provider in the
 *  Supabase dashboard shows up within this long, without a redeploy. */
const SETTINGS_REVALIDATE_SECONDS = 300

type GoTrueSettings = { external?: Record<string, unknown> }

let warned = false
function warnOnce(reason: string) {
  if (warned) return
  warned = true
  console.warn(`[auth] OAuth provider list unavailable (${reason}); hiding provider buttons.`)
}

export async function getEnabledOAuthProviders(): Promise<OAuthProviderId[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    warnOnce('Supabase URL or anon key not configured')
    return []
  }

  let payload: GoTrueSettings
  try {
    const response = await fetch(`${url.replace(/\/$/, '')}/auth/v1/settings`, {
      headers: { apikey: anonKey },
      signal: AbortSignal.timeout(SETTINGS_TIMEOUT_MS),
      next: { revalidate: SETTINGS_REVALIDATE_SECONDS },
    })
    if (!response.ok) {
      warnOnce(`settings responded ${response.status}`)
      return []
    }
    payload = (await response.json()) as GoTrueSettings
  } catch (err) {
    warnOnce(err instanceof Error ? err.message : 'request failed')
    return []
  }

  const external = payload?.external
  if (!external || typeof external !== 'object') {
    warnOnce('settings payload had no external block')
    return []
  }

  // `=== true` deliberately: a missing key, a string, or null is not "enabled".
  return SUPPORTED_OAUTH_PROVIDERS.filter((provider) => external[provider] === true)
}

/** Server-side guard used before handing the browser an authorize URL. */
export async function isOAuthProviderEnabled(provider: OAuthProviderId): Promise<boolean> {
  return (await getEnabledOAuthProviders()).includes(provider)
}
