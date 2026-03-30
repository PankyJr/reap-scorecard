import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Run auth middleware only for protected routes.
     * Exclude: /login, /auth, static assets, images.
     * Excluding /login and /auth guarantees the login page is never touched
     * by middleware, so it cannot participate in a redirect/session loop.
     */
    '/((?!login|auth|reset-password|privacy|terms|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
