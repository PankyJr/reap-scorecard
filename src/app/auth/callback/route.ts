import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/utils/supabase/server'
import { friendlyOAuthCallbackError } from '@/lib/auth/oauth-errors'
import { getRequestOriginForRedirect } from '@/lib/auth/redirect-origin'

function safeNextPath(raw: string | null): string {
  if (!raw) return '/dashboard'
  const trimmed = raw.trim()
  if (!trimmed.startsWith('/')) return '/dashboard'
  if (trimmed.startsWith('//')) return '/dashboard'
  if (trimmed.includes('://')) return '/dashboard'
  return trimmed
}

/** Set `AUTH_OAUTH_DEBUG=1` in `.env.local` for callback traces (cookie names only; no secrets). */
function oauthDebugEnabled() {
  return process.env.AUTH_OAUTH_DEBUG === '1'
}

function oauthLog(message: string, data?: Record<string, unknown>) {
  if (!oauthDebugEnabled()) return
  if (data) console.log(`[auth/callback] ${message}`, data)
  else console.log(`[auth/callback] ${message}`)
}

function authRelatedCookieNames(request: NextRequest): string[] {
  return request.cookies
    .getAll()
    .map(c => c.name)
    .filter(n => n.startsWith('sb-') || n.toLowerCase().includes('auth'))
}

function responseCookieNames(res: NextResponse): string[] {
  try {
    return res.cookies.getAll().map(c => c.name)
  } catch {
    return []
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const base = getRequestOriginForRedirect(request)
  const code = searchParams.get('code')
  const next = safeNextPath(searchParams.get('next'))
  const errorParam = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  const incomingHints = authRelatedCookieNames(request)
  oauthLog('callback entry', {
    path: request.nextUrl.pathname,
    hasCode: Boolean(code),
    codePrefix: code ? `${code.slice(0, 8)}…` : null,
    hasOAuthErrorParam: Boolean(errorParam),
    nextSanitized: next,
    base,
    incomingSupabaseCookieCount: incomingHints.length,
    incomingSupabaseCookieHints: incomingHints,
  })

  if (errorParam) {
    const msg = errorDescription ?? errorParam
    oauthLog('OAuth error query from provider/Supabase', {
      errorParam,
      descriptionSnippet: errorDescription ? `${errorDescription.slice(0, 80)}…` : null,
    })
    const dest = `${base}/login?error=${encodeURIComponent(friendlyOAuthCallbackError(msg))}`
    oauthLog('final redirect', { destination: dest, reason: 'oauth-error-query-on-callback-url' })
    return NextResponse.redirect(dest)
  }

  if (code) {
    const successRedirect = NextResponse.redirect(`${base}${next}`)
    const supabase = createRouteHandlerClient(request, successRedirect)

    oauthLog('before exchangeCodeForSession', {
      incomingSupabaseCookieCount: incomingHints.length,
      incomingSupabaseCookieHints: incomingHints,
      verifierLikelyPresent: incomingHints.some(
        n =>
          n.includes('auth-token') ||
          n.includes('code-verifier') ||
          n.includes('pkce'),
      ),
    })

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const setNames = responseCookieNames(successRedirect)
      oauthLog('after exchangeCodeForSession', { outcome: 'success' })
      oauthLog('response Set-Cookie names on redirect', {
        count: setNames.length,
        names: setNames,
      })
      const dest = `${base}${next}`
      oauthLog('final redirect', { destination: dest, reason: 'session-established' })
      return successRedirect
    }

    oauthLog('after exchangeCodeForSession', { outcome: 'error' })
    oauthLog('exchangeCodeForSession failed', {
      message: error.message,
      name: error.name,
      status: 'status' in error ? (error as { status?: number }).status : undefined,
    })

    const dest = `${base}/login?error=${encodeURIComponent(friendlyOAuthCallbackError(error.message))}`
    oauthLog('final redirect', { destination: dest, reason: 'exchange-invalid-or-expired-code' })
    return NextResponse.redirect(dest)
  }

  oauthLog('no code and no oauth error — unexpected callback shape')
  const dest = `${base}/login?error=${encodeURIComponent('Something went wrong. Please try signing in again.')}`
  oauthLog('final redirect', { destination: dest, reason: 'missing-code' })
  return NextResponse.redirect(dest)
}
