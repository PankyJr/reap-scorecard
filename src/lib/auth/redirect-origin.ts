import type { NextRequest } from 'next/server'

/**
 * Public origin for redirects after OAuth PKCE exchange (and error redirects from `/auth/callback`).
 *
 * Prefer `x-forwarded-host` + `x-forwarded-proto` when present (Vercel, load balancers) so we never
 * redirect users to an internal hostname. Falls back to `NextRequest.nextUrl.origin` (correct for local dev).
 *
 * Must be used only behind a trusted proxy that sets forwarded headers; Vercel does this correctly.
 */
export function getRequestOriginForRedirect(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()

  if (forwardedHost) {
    const proto = forwardedProto || 'https'
    return `${proto}://${forwardedHost}`
  }

  return request.nextUrl.origin
}
