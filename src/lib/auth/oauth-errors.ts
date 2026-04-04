/**
 * User-facing copy for Supabase OAuth / PKCE flows.
 * Provider credentials and enablement live in the Supabase dashboard — errors often reflect misconfiguration.
 */

export type OAuthProviderId = 'google' | 'azure'

const providerLabel: Record<OAuthProviderId, string> = {
  google: 'Google',
  azure: 'Microsoft',
}

/** Errors returned when starting `signInWithOAuth` (server action before redirect to IdP). */
export function friendlyOAuthInitError(raw: string, provider: OAuthProviderId): string {
  const lower = raw.toLowerCase()
  const label = providerLabel[provider]

  if (lower.includes('not enabled') || lower.includes('provider') && lower.includes('disabled'))
    return `${label} sign-in is not enabled for this project yet. An administrator must enable it in Supabase Auth settings.`

  if (lower.includes('redirect') && (lower.includes('uri') || lower.includes('url')))
    return `Sign-in redirect URL is not allowed. Add your app URL to Supabase Auth redirect URLs and match your IdP callback settings (see project docs: docs/auth-oauth-google-microsoft.md).`

  if (lower.includes('invalid_client') || lower.includes('client_id') || lower.includes('unauthorized_client'))
    return `${label} sign-in credentials are invalid or expired. Check the provider configuration in Supabase and in ${label === 'Microsoft' ? 'Azure Entra' : 'Google Cloud'}.`

  if (lower.includes('secret') || lower.includes('credential'))
    return `${label} client secret may be missing or incorrect in Supabase Auth provider settings.`

  if (lower.includes('rate') || lower.includes('too many'))
    return 'Too many sign-in attempts. Please wait a moment and try again.'

  return `Could not start ${label} sign-in. Please try again or use another sign-in method.`
}

/** Errors in URL query after returning from IdP / Supabase (`error`, `error_description`). */
export function friendlyOAuthCallbackError(raw: string): string {
  const lower = raw.toLowerCase()

  if (lower.includes('access_denied') || lower.includes('user_cancel'))
    return 'Sign-in was cancelled. Try again when you’re ready.'

  if (lower.includes('otp_expired') || lower.includes('expired'))
    return 'Your sign-in link has expired. Please try signing in again.'

  if (lower.includes('invalid_grant') || lower.includes('code'))
    return 'This sign-in link is no longer valid. Please try again.'

  if (lower.includes('redirect') && (lower.includes('uri') || lower.includes('url')))
    return 'Sign-in could not complete: redirect URL mismatch. Your administrator should verify Supabase redirect URLs and the identity provider callback settings.'

  if (lower.includes('invalid_client') || lower.includes('unauthorized_client'))
    return 'Sign-in could not complete: provider configuration error. Check Supabase Auth provider credentials.'

  if (lower.includes('server_error') || lower.includes('temporarily_unavailable'))
    return 'The sign-in service is temporarily unavailable. Please try again in a few minutes.'

  if (lower.includes('invalid'))
    return 'This link is no longer valid. Please request a new sign-in.'

  return 'Something went wrong during sign-in. Please try again.'
}
