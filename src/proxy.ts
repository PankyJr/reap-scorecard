import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

// `api/health` is excluded so the container liveness probe never runs the auth
// middleware: an unauthenticated probe would otherwise be redirected to /login
// (307) and every health check would fail.
export const config = {
  matcher: [
    '/((?!api/health|login|auth|reset-password|privacy|terms|robots\\.txt|sitemap\\.xml|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|mp4|webm|mov)$).*)',
  ],
}
