import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { isAuthDevBypassEnabled } from '@/lib/auth/dev-bypass'

/**
 * Auth middleware: protects private routes only.
 * Does NOT run for /login or /auth (see middleware.ts matcher).
 * That guarantees the login page is never touched by middleware — no session
 * refresh, no redirects, no cookie writes — so it cannot contribute to a loop.
 */
export async function updateSession(request: NextRequest) {
  if (isAuthDevBypassEnabled()) {
    return NextResponse.next({ request })
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
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
