import type { OAuthProviderId } from '@/lib/auth/oauth-errors'
import { friendlyOAuthInitError } from '@/lib/auth/oauth-errors'

function isAuthErrorLike(err: unknown): err is { message: string; name?: string; status?: number } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'message' in err &&
    typeof (err as { message: unknown }).message === 'string'
  )
}

/** Server-side only: logs Supabase auth errors (no secrets). */
export function logAuthError(context: string, err: unknown): void {
  if (!isAuthErrorLike(err)) {
    console.error(`[auth] ${context}:`, err)
    return
  }
  const status = 'status' in err && typeof err.status === 'number' ? err.status : undefined
  console.error(`[auth] ${context}:`, {
    message: err.message,
    name: err.name,
    status,
  })
}

export function userSafeAuthMessage(raw: string): string {
  const lower = raw.toLowerCase()
  if (
    (lower.includes('email address') && lower.includes('is invalid')) ||
    lower.includes('invalid email address')
  )
    return 'This email address is not accepted by Supabase Auth. Try a real email address.'
  if (lower.includes('invalid login credentials'))
    return 'Invalid email or password.'
  if (lower.includes('email not confirmed'))
    return 'Please confirm your email before signing in. Check your inbox for the verification link.'
  if (
    lower.includes('user already registered') ||
    lower.includes('already been registered') ||
    lower.includes('already registered')
  )
    return 'This email is already registered. Sign in instead.'
  if (lower.includes('rate') || lower.includes('too many'))
    return 'Too many attempts. Please wait a moment and try again.'
  if (lower.includes('weak password') || lower.includes('at least'))
    return 'Password is too weak. Use at least 12 characters with upper, lower, number, and symbol.'
  if (lower.includes('invalid email'))
    return 'Please enter a valid email address.'
  if (
    lower.includes('signup') &&
    (lower.includes('disabled') || lower.includes('not allowed'))
  )
    return 'Sign-ups are disabled for this project. Contact your administrator.'
  if (lower.includes('email provider is disabled') || lower.includes('email signups are disabled'))
    return 'Email sign-in is disabled for this project. Contact your administrator.'
  if (lower.includes('invalid api key') || lower.includes('jwt'))
    return 'Supabase configuration error. Check NEXT_PUBLIC_SUPABASE_URL and anon key in .env.local.'
  return 'Something went wrong. Please try again.'
}

const GENERIC_AUTH_USER_MESSAGE = 'Something went wrong. Please try again.'

/** Maps Supabase OAuth init errors: shared auth messages first, then provider-specific copy. */
export function userSafeOAuthInitMessage(raw: string, provider: OAuthProviderId): string {
  const fromAuth = userSafeAuthMessage(raw)
  if (fromAuth !== GENERIC_AUTH_USER_MESSAGE) return fromAuth
  return friendlyOAuthInitError(raw, provider)
}

export function userSafeNetworkAuthMessage(err: unknown, supabaseUrl: string): string {
  const message = err instanceof Error ? err.message : String(err ?? '')
  const lower = message.toLowerCase()
  const isLocalSupabase =
    supabaseUrl.includes('127.0.0.1:54321') || supabaseUrl.includes('localhost:54321')

  if (
    lower.includes('econnrefused') ||
    lower.includes('fetch failed') ||
    lower.includes('network') ||
    lower.includes('54321')
  ) {
    if (isLocalSupabase) {
      return 'Cannot reach local Supabase. Start Docker and run `npx supabase start`, or point NEXT_PUBLIC_SUPABASE_URL at your hosted project.'
    }
    return 'Cannot reach Supabase. Check your network and project URL.'
  }
  return 'Something went wrong. Please try again.'
}
