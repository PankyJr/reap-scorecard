'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { headers } from 'next/headers'

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
    return 'Password is too weak. Use at least 6 characters.'
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
  const password = formData.get('password') as string
  const fullName = ((formData.get('full_name') as string) || '').trim()

  if (!email || !password) {
    redirect('/login?mode=signup&error=' + encodeURIComponent('Email and password are required.'))
  }

  if (!fullName) {
    redirect('/login?mode=signup&error=' + encodeURIComponent('Please enter your full name.'))
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
    redirect(`/login?mode=signup&success=${encodeURIComponent('Account created! Check your email to verify your account.')}`)
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

  redirect(`/login?mode=forgot&success=${encodeURIComponent('Password reset link sent. Check your email.')}`)
}

export async function resetPassword(formData: FormData) {
  const supabase = await createClient()
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirm_password') as string

  if (!password || password.length < 6) {
    redirect('/reset-password?error=' + encodeURIComponent('Password must be at least 6 characters.'))
  }

  if (password !== confirmPassword) {
    redirect('/reset-password?error=' + encodeURIComponent('Passwords do not match.'))
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    redirect(`/reset-password?error=${encodeURIComponent(friendlyError(error.message))}`)
  }

  redirect('/login?success=' + encodeURIComponent('Password updated successfully. Sign in with your new password.'))
}

export async function signInWithGoogle(formData?: FormData) {
  const supabase = await createClient()
  const next = safeNextPath(formData?.get('next') as string)
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${await getAppOrigin()}/auth/callback?next=${encodeURIComponent(next)}`,
      queryParams: { prompt: 'select_account' },
    },
  })

  if (error || !data.url) {
    redirect('/login?error=' + encodeURIComponent('Could not connect to Google. Please try again.'))
  }

  redirect(data.url)
}

