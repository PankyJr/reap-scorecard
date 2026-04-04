import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch (err) {
            // Server Components cannot set cookies; Server Actions should succeed.
            // Swallowing here silently breaks OAuth PKCE if cookie writes actually fail.
            if (process.env.NODE_ENV !== 'production') {
              console.warn('[supabase] createClient cookies.setAll failed — OAuth PKCE/session may break:', err)
            }
          }
        },
      },
    },
  )
}

/**
 * Supabase client for Route Handlers where session cookies must be applied to a concrete
 * `NextResponse` (e.g. OAuth callback). Using `cookies()` from `next/headers` with
 * `NextResponse.redirect()` can omit Set-Cookie on the outgoing redirect in some cases;
 * binding setAll to the redirect response avoids dropping tokens after `exchangeCodeForSession`.
 */
export function createRouteHandlerClient(request: NextRequest, response: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )
}
