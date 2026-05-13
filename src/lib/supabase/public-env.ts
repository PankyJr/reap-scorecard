/**
 * Browser-safe Supabase public configuration (URL + anon/publishable key only).
 * Never import service role or other secrets here.
 */

let devUrlLogged = false

/** True when both public URL and anon (or publishable) key are set — safe to build Supabase clients. */
export function isSupabasePublicConfigComplete(): boolean {
  const env = process.env as Record<string, string | undefined>
  const url = env['NEXT_PUBLIC_SUPABASE_URL']?.trim()
  const key =
    env['NEXT_PUBLIC_SUPABASE_ANON_KEY']?.trim() ||
    env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']?.trim()
  return Boolean(url && key)
}

/** Supabase project URL (hosted: https://xxx.supabase.co, or local CLI: http://127.0.0.1:54321). */
export function getSupabaseProjectUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  if (!url) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL. Set it in .env.local — see .env.local.example.',
    )
  }
  return url.replace(/\/$/, '')
}

/**
 * Anon / publishable key. Supabase dashboard labels vary; we accept either env name.
 */
export function getSupabaseAnonKey(): string {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  if (!key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY). See .env.local.example.',
    )
  }
  return key
}

/** Logs the configured Supabase URL once per process in development (never logs keys). */
export function logSupabaseUrlOnceInDev(): void {
  if (process.env.NODE_ENV !== 'development' || devUrlLogged) return
  devUrlLogged = true
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '(unset)'
  console.log('[supabase] Supabase URL:', url)

  const isLocal =
    url.includes('127.0.0.1:54321') || url.includes('localhost:54321')
  if (isLocal && process.env.ALLOW_LOCAL_SUPABASE !== 'true') {
    console.warn(
      '[supabase] URL points at local Supabase (:54321). If Docker/local stack is not running, auth will fail. Use a hosted URL or run `npx supabase start`, or set ALLOW_LOCAL_SUPABASE=true to silence this warning.',
    )
  }
}
