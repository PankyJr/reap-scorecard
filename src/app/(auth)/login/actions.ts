'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'
import { mapPasswordUpdateError, validatePasswordForReset } from '@/lib/password-policy'
import { friendlyOAuthInitError, type OAuthProviderId } from '@/lib/auth/oauth-errors'

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

function friendlyError(raw: string): string {
  const lower = raw.toLowerCase()
  if (lower.includes('invalid login credentials'))
    return 'Incorrect email or password. Please try again.'
  if (lower.includes('email not confirmed'))
    return 'Please check your email and confirm your account before signing in.'
  if (lower.includes('user already registered') || lower.includes('already been registered'))
    return 'This email is already registered. Sign in instead.'
  if (lower.includes('rate') || lower.includes('too many'))
    return 'Too many attempts. Please wait a moment and try again.'
  if (lower.includes('weak password') || lower.includes('at least'))
    return 'Password is too weak. Use at least 12 characters with upper, lower, number, and symbol.'
  if (lower.includes('invalid email'))
    return 'Please enter a valid email address.'
  return 'Something went wrong. Please try again.'
}

export async function login(formData: FormData) {
  const supabase = await createClient()
  const email = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string
  const next = safeNextPath(formData.get('next') as string)

  if (!email || !password) {
    redirect('/login?error=' + encodeURIComponent('Email and password are required.'))
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect(`/login?error=${encodeURIComponent(friendlyError(error.message))}`)
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

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${await getAppOrigin()}/auth/callback`,
    },
  })

  if (error) {
    redirect(`/login?mode=signup&error=${encodeURIComponent(friendlyError(error.message))}`)
  }

  if (data?.user?.identities?.length === 0) {
    redirect(`/login?error=${encodeURIComponent('This email is already registered. Sign in instead.')}`)
  }

  if (data?.user && !data?.session) {
    redirect(
      `/login?mode=signup&success=${encodeURIComponent(
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

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await getAppOrigin()}/auth/callback?next=/reset-password`,
  })

  if (error) {
    redirect(`/login?mode=forgot&error=${encodeURIComponent(friendlyError(error.message))}`)
  }

  redirect(
    `/login?mode=forgot&success=${encodeURIComponent(
      'If an account exists for that address, we sent a password reset link. Check your inbox and spam folder, then open the link to set a new password.',
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
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
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
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${await getAppOrigin()}/auth/callback?next=${encodeURIComponent(next)}`,
      ...params.extraOptions,
    },
  })

  if (error || !data.url) {
    if (params.logLabel) {
      console.error(
        `[auth] OAuth (${params.logLabel}) failed:`,
        error?.message ?? 'no redirect URL returned',
      )
    }
    const msg = error?.message
      ? friendlyOAuthInitError(error.message, provider)
      : params.userMessage
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

