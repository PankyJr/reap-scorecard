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

  return response
}
