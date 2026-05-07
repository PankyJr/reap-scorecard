'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'
import { mapPasswordUpdateError, validatePasswordForReset } from '@/lib/password-policy'
import type { OAuthProviderId } from '@/lib/auth/oauth-errors'
import {
  logAuthError,
  userSafeAuthMessage,
  userSafeNetworkAuthMessage,
  userSafeOAuthInitMessage,
} from '@/lib/auth/auth-errors'

/** Public site URL for OAuth/email callbacks and absolute redirects after server actions. */
async function getAppOrigin(): Promise<string> {
  const h = await headers()
  const forwardedHost = h.get('x-forwarded-host')?.split(',')[0]?.trim()
  const host = forwardedHost || h.get('host')?.trim()
  const forwardedProto = h.get('x-forwarded-proto')?.split(',')[0]?.trim()
  const proto =
    forwardedProto || (process.env.VERCEL ? 'https' : 'http')
  if (host) return `${proto}://${host}`

  const vercelUrl = process.env.VERCEL_URL?.replace(/^https?:\/\//, '')
  if (vercelUrl) return `https://${vercelUrl}`

  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '')
  if (fromEnv) return fromEnv

  return 'http://localhost:3000'
}

function safeNextPath(raw: string | null | undefined): string {
  if (!raw) return '/dashboard'
  const trimmed = raw.trim()
  if (!trimmed.startsWith('/')) return '/dashboard'
  if (trimmed.startsWith('//')) return '/dashboard'
  if (trimmed.includes('://')) return '/dashboard'
  return trimmed
}

/**
 * Base URL for OAuth and email confirmation links. Prefer NEXT_PUBLIC_SITE_URL in .env.local
 * so local dev matches Supabase redirect allow list exactly; otherwise use request host / Vercel.
 */
async function getOAuthRedirectBaseUrl(): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '')
  if (fromEnv) return fromEnv
  return getAppOrigin()
}

export async function login(formData: FormData) {
  const supabase = await createClient()
  const email = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string
  const next = safeNextPath(formData.get('next') as string)

  if (!email || !password) {
    redirect('/login?error=' + encodeURIComponent('Email and password are required.'))
  }

  let error: { message: string } | null = null
  try {
    const result = await supabase.auth.signInWithPassword({ email, password })
    error = result.error
  } catch (err) {
    logAuthError('signInWithPassword (network/throw)', err)
    redirect(
      `/login?error=${encodeURIComponent(
        userSafeNetworkAuthMessage(err, process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''),
      )}`,
    )
  }

  if (error) {
    logAuthError('signInWithPassword', error)
    const safeMessage = userSafeAuthMessage(error.message)
    if (safeMessage.toLowerCase().includes('confirm your email')) {
      redirect(
        `/login?mode=confirm&email=${encodeURIComponent(email)}&error=${encodeURIComponent(safeMessage)}`,
      )
    }
    redirect(`/login?error=${encodeURIComponent(safeMessage)}`)
  }

  revalidatePath('/', 'layout')
  // Absolute URL so the client router does not resolve against a stale canonicalUrl (e.g. localhost).
  redirect(`${await getAppOrigin()}${next}`)
}

export async function signup(formData: FormData) {
  const supabase = await createClient()
  const email = (formData.get('email') as string)?.trim()
  const password = (formData.get('password') as string) ?? ''
  const confirmPassword = (formData.get('confirm_password') as string) ?? ''
  const fullName = ((formData.get('full_name') as string) || '').trim()

  if (!email || !password) {
    redirect('/login?mode=signup&error=' + encodeURIComponent('Email and password are required.'))
  }

  if (!fullName) {
    redirect('/login?mode=signup&error=' + encodeURIComponent('Please enter your full name.'))
  }

  const policy = validatePasswordForReset(password)
  if (!policy.ok) {
    redirect('/login?mode=signup&error=' + encodeURIComponent(policy.message))
  }

  if (password !== confirmPassword) {
    redirect('/login?mode=signup&error=' + encodeURIComponent('Passwords do not match.'))
  }

  let data:
    | {
        user: {
          identities?: Array<unknown> | null
        } | null
        session: unknown | null
      }
    | null = null
  let error: { message: string } | null = null
  try {
    const result = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${await getOAuthRedirectBaseUrl()}/auth/callback`,
      },
    })
    data = result.data
    error = result.error
  } catch (err) {
    logAuthError('signUp (network/throw)', err)
    redirect(
      `/login?mode=signup&error=${encodeURIComponent(
        userSafeNetworkAuthMessage(err, process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''),
      )}`,
    )
  }

  if (error) {
    logAuthError('signUp', error)
    redirect(
      `/login?mode=signup&error=${encodeURIComponent(userSafeAuthMessage(error.message))}`,
    )
  }

  if (data?.user?.identities?.length === 0) {
    redirect(`/login?error=${encodeURIComponent('This email is already registered. Sign in instead.')}`)
  }

  if (data?.user && !data?.session) {
    redirect(
      `/login?mode=signup&email=${encodeURIComponent(email)}&success=${encodeURIComponent(
        'We sent a verification email. Open the link in that message to confirm your account—you will be signed in automatically with the name and password you entered.',
      )}`,
    )
  }

  revalidatePath('/', 'layout')
  redirect(`${await getAppOrigin()}/dashboard`)
}

export async function forgotPassword(formData: FormData) {
  const supabase = await createClient()
  const email = (formData.get('email') as string)?.trim()

  if (!email) {
    redirect('/login?mode=forgot&error=' + encodeURIComponent('Please enter your email address.'))
  }

  let error: { message: string } | null = null
  try {
    const result = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${await getOAuthRedirectBaseUrl()}/auth/callback?next=/reset-password`,
    })
    error = result.error
  } catch (err) {
    logAuthError('resetPasswordForEmail (network/throw)', err)
    redirect(
      `/login?mode=forgot&error=${encodeURIComponent(
        userSafeNetworkAuthMessage(err, process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''),
      )}`,
    )
  }

  if (error) {
    logAuthError('resetPasswordForEmail', error)
    redirect(
      `/login?mode=forgot&error=${encodeURIComponent(userSafeAuthMessage(error.message))}`,
    )
  }

  redirect(
    `/login?mode=forgot&success=${encodeURIComponent(
      'If an account exists for that address, we sent a password reset link. Check your inbox and spam folder, then open the link to set a new password.',
    )}`,
  )
}

export async function resendSignupConfirmation(formData: FormData) {
  const supabase = await createClient()
  const email = (formData.get('email') as string)?.trim()

  if (!email) {
    redirect(
      '/login?mode=confirm&error=' + encodeURIComponent('Please enter your email address.'),
    )
  }

  let error: { message: string } | null = null
  try {
    const result = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${await getOAuthRedirectBaseUrl()}/auth/callback` },
    })
    error = result.error
  } catch (err) {
    logAuthError('auth.resend(signup) (network/throw)', err)
    redirect(
      `/login?mode=confirm&email=${encodeURIComponent(email)}&error=${encodeURIComponent(
        userSafeNetworkAuthMessage(err, process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''),
      )}`,
    )
  }

  if (error) {
    logAuthError('auth.resend(signup)', error)
    redirect(
      `/login?mode=confirm&email=${encodeURIComponent(email)}&error=${encodeURIComponent(
        userSafeAuthMessage(error.message),
      )}`,
    )
  }

  redirect(
    `/login?mode=confirm&email=${encodeURIComponent(email)}&success=${encodeURIComponent(
      'Verification email sent. Check your inbox and spam folder, then open the link to continue.',
    )}`,
  )
}

export type ResetPasswordResult =
  | { ok: true }
  | { ok: false; error: string }

/**
 * Updates password for the current recovery session. Returns a result object (no redirect)
 * so the client can show inline success/error states.
 */
export async function resetPassword(formData: FormData): Promise<ResetPasswordResult> {
  const password = (formData.get('password') as string) ?? ''
  const confirmPassword = (formData.get('confirm_password') as string) ?? ''

  const policy = validatePasswordForReset(password)
  if (!policy.ok) {
    return { ok: false, error: policy.message }
  }

  if (password !== confirmPassword) {
    return { ok: false, error: 'Passwords do not match.' }
  }

  const supabase = await createClient()
  let error: { message: string } | null = null
  try {
    const result = await supabase.auth.updateUser({ password })
    error = result.error
  } catch (err) {
    logAuthError('updateUser (password reset)', err)
    return {
      ok: false,
      error: userSafeNetworkAuthMessage(err, process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''),
    }
  }

  if (error) {
    logAuthError('updateUser (password reset)', error)
    return { ok: false, error: mapPasswordUpdateError(error.message) }
  }

  revalidatePath('/', 'layout')
  return { ok: true }
}

type OAuthProvider = OAuthProviderId

/**
 * OAuth must not use redirect() to external IdP URLs from a Server Action: the client receives the
 * result over fetch(), and Safari may mis-handle that as a file download (e.g. blank "authorize").
 * The client performs `window.location.assign(url)` for a normal top-level navigation instead.
 */
export type OAuthInitResult = { ok: true; url: string } | { ok: false; error: string }

async function getOAuthSignInUrl(
  provider: OAuthProvider,
  formData: FormData | undefined,
  params: {
    extraOptions?: { queryParams?: Record<string, string>; scopes?: string }
    userMessage: string
    logLabel?: string
  },
): Promise<OAuthInitResult> {
  const supabase = await createClient()
  const next = safeNextPath(formData?.get('next') as string)
  const base = await getOAuthRedirectBaseUrl()
  let data: { url: string | null } | null = null
  let error: { message: string; name?: string; status?: number } | null = null

  try {
    const result = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${base}/auth/callback?next=${encodeURIComponent(next)}`,
        ...params.extraOptions,
      },
    })
    data = result.data
    error = result.error
  } catch (err) {
    logAuthError(`signInWithOAuth:${provider}`, err)
    return {
      ok: false,
      error: userSafeNetworkAuthMessage(err, process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''),
    }
  }

  if (error || !data?.url) {
    if (error) {
      logAuthError(`signInWithOAuth:${provider}`, error)
    } else {
      console.error(`[auth] OAuth (${provider}): no redirect URL returned`)
    }
    const msg = error?.message
      ? userSafeOAuthInitMessage(error.message, provider)
      : 'OAuth redirect failed. Please try again.'
    return { ok: false, error: msg }
  }

  return { ok: true, url: data.url }
}

export async function signInWithGoogle(formData?: FormData): Promise<OAuthInitResult> {
  return getOAuthSignInUrl('google', formData, {
    extraOptions: { queryParams: { prompt: 'select_account' } },
    userMessage: 'Could not connect to Google. Please try again.',
  })
}

export async function signInWithMicrosoft(formData?: FormData): Promise<OAuthInitResult> {
  // Supabase requires the `email` scope so Azure returns a verifiable email (see Supabase Azure guide).
  return getOAuthSignInUrl('azure', formData, {
    extraOptions: { scopes: 'email' },
    userMessage:
      'Could not connect to Microsoft. Please try again, or ask an admin to enable Microsoft sign-in.',
    logLabel: 'azure',
  })
}

