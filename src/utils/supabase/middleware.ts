import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isAuthDevBypassEnabled } from '@/lib/auth/dev-bypass'
import { getUserSafe } from '@/lib/auth/get-user-safe'
import { hasSupabaseAuthCookies } from '@/lib/auth/session-cookies'
import {
  getSupabaseAnonKey,
  getSupabaseProjectUrl,
  isSupabasePublicConfigComplete,
} from '@/lib/supabase/public-env'

const PUBLIC_MARKETING_PATHS = new Set([
  '/',
  '/about',
  '/solutions',
  '/training',
  '/contact',
  '/scorecard',
])

/** Anonymous marketing contact submissions only — not a blanket /api bypass. */
const PUBLIC_MARKETING_API_PATHS = new Set(['/api/marketing/contact'])

function isPublicMarketingRoute(pathname: string): boolean {
  return (
    PUBLIC_MARKETING_PATHS.has(pathname) ||
    pathname === '/services' ||
    pathname.startsWith('/services/')
  )
}

function isPublicMarketingApiRoute(pathname: string): boolean {
  return PUBLIC_MARKETING_API_PATHS.has(pathname)
}

function isEapAdminRoute(pathname: string): boolean {
  return (
    pathname === '/settings/eap-targets' ||
    pathname.startsWith('/settings/eap-targets/')
  )
}

async function isInternalAdminAtRequestBoundary(userId: string): Promise<boolean> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!serviceKey) return false

  try {
    const url = new URL('/rest/v1/reap_internal_admins', getSupabaseProjectUrl())
    url.searchParams.set('user_id', `eq.${userId}`)
    url.searchParams.set('select', 'user_id')
    url.searchParams.set('limit', '1')

    const result = await fetch(url, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    })
    if (!result.ok) return false
    const rows = (await result.json()) as Array<{ user_id?: string }>
    return rows.some((row) => row.user_id === userId)
  } catch {
    return false
  }
}

function eapAccessDeniedResponse(): NextResponse {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex,nofollow">
    <title>Access denied | REAP Solutions</title>
    <style>
      *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:#f8fafc;color:#0f172a;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      main{width:min(100%,520px);padding:32px;border:1px solid #e2e8f0;border-radius:16px;background:#fff;box-shadow:0 8px 30px rgba(15,23,42,.06)}
      .status{margin:0;color:#64748b;font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase}h1{margin:8px 0 0;font-size:30px}p{color:#475569;line-height:1.6}a{display:inline-block;margin-top:12px;padding:10px 16px;border-radius:12px;background:#063b3f;color:white;font-size:14px;font-weight:700;text-decoration:none}
    </style>
  </head>
  <body>
    <main>
      <p class="status">HTTP 403</p>
      <h1>Access denied</h1>
      <p>You are signed in, but this account is not authorised to administer EAP targets.</p>
      <a href="/dashboard">Back to dashboard</a>
    </main>
  </body>
</html>`

  return new NextResponse(html, {
    status: 403,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  })
}

/**
 * Auth middleware: protects private routes only.
 * Does NOT run for /login or /auth (see proxy.ts matcher).
 * That guarantees the login page is never touched by middleware — no session
 * refresh, no redirects, no cookie writes — so it cannot contribute to a loop.
 */
export async function updateSession(request: NextRequest) {
  if (isAuthDevBypassEnabled()) {
    return NextResponse.next({ request })
  }

  if (!isSupabasePublicConfigComplete()) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    return NextResponse.redirect(url)
  }

  const pathname = request.nextUrl.pathname
  const isPublicRoute =
    isPublicMarketingRoute(pathname) || isPublicMarketingApiRoute(pathname)
  const requestCookies = request.cookies.getAll()

  if (isPublicRoute && !hasSupabaseAuthCookies(requestCookies)) {
    return NextResponse.next({ request })
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    getSupabaseProjectUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { user, timedOut } = await getUserSafe(supabase)

  if (!user) {
    if (isPublicRoute) {
      return response
    }
    if (timedOut) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.search = '?error=' + encodeURIComponent('Authentication service is temporarily unavailable. Please try again.')
      const redirectResponse = NextResponse.redirect(url)
      response.cookies.getAll().forEach((cookie) =>
        redirectResponse.cookies.set(cookie),
      )
      return redirectResponse
    }
    const url = request.nextUrl.clone()
    const intendedPath = request.nextUrl.pathname + request.nextUrl.search
    url.pathname = '/login'
    url.search = intendedPath !== '/' ? `?next=${encodeURIComponent(intendedPath)}` : ''
    const redirectResponse = NextResponse.redirect(url)
    response.cookies.getAll().forEach((cookie) =>
      redirectResponse.cookies.set(cookie),
    )
    return redirectResponse
  }

  // Run this authorization check before the App Router starts streaming. A
  // forbidden() thrown from the page correctly renders Access Denied, but a
  // parent layout may already have committed HTTP 200 headers on Netlify.
  // Enforcing the same allowlist here guarantees genuine HTTP 403 semantics.
  if (isEapAdminRoute(pathname)) {
    const isAdmin = await isInternalAdminAtRequestBoundary(user.id)
    if (!isAdmin) {
      const denied = eapAccessDeniedResponse()
      response.cookies.getAll().forEach((cookie) => denied.cookies.set(cookie))
      return denied
    }
  }

  return response
}
