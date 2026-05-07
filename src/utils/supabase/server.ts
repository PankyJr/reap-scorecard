import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import {
  getSupabaseAnonKey,
  getSupabaseProjectUrl,
  logSupabaseUrlOnceInDev,
} from '@/lib/supabase/public-env'

export async function createClient() {
  logSupabaseUrlOnceInDev()
  const cookieStore = await cookies()

  return createServerClient(
    getSupabaseProjectUrl(),
    getSupabaseAnonKey(),
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
  logSupabaseUrlOnceInDev()
  return createServerClient(
    getSupabaseProjectUrl(),
    getSupabaseAnonKey(),
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
