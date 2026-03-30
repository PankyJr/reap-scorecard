import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

function safeNextPath(raw: string | null): string {
  if (!raw) return '/dashboard'
  const trimmed = raw.trim()
  if (!trimmed.startsWith('/')) return '/dashboard'
  if (trimmed.startsWith('//')) return '/dashboard'
  if (trimmed.includes('://')) return '/dashboard'
  return trimmed
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = safeNextPath(searchParams.get('next'))
  const errorParam = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  if (errorParam) {
    const msg = errorDescription ?? errorParam
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(friendlyCallbackError(msg))}`
    )
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(friendlyCallbackError(error.message))}`
    )
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent('Something went wrong. Please try signing in again.')}`
  )
}

function friendlyCallbackError(raw: string): string {
  const lower = raw.toLowerCase()
  if (lower.includes('otp_expired') || lower.includes('expired'))
    return 'Your sign-in link has expired. Please request a new one.'
  if (lower.includes('access_denied'))
    return 'Access was denied. Please try again.'
  if (lower.includes('invalid'))
    return 'This link is no longer valid. Please request a new one.'
  return 'Something went wrong during sign-in. Please try again.'
}
