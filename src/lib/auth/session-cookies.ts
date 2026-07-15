type CookieLike = { name: string }

/** True when the request likely carries a Supabase session (skip remote auth when false). */
export function hasSupabaseAuthCookies(cookies: CookieLike[]): boolean {
  return cookies.some(
    (cookie) =>
      cookie.name.startsWith('sb-') &&
      (cookie.name.includes('auth-token') || cookie.name.includes('auth-token-code-verifier')),
  )
}
