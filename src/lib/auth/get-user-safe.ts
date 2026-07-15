import type { SupabaseClient, User } from '@supabase/supabase-js'

const DEFAULT_AUTH_TIMEOUT_MS = 4_000

export type SafeGetUserResult = {
  user: User | null
  timedOut: boolean
}

/** Resolves quickly when Supabase is unreachable instead of hanging the page. */
export async function getUserSafe(
  supabase: SupabaseClient,
  timeoutMs = DEFAULT_AUTH_TIMEOUT_MS,
): Promise<SafeGetUserResult> {
  try {
    const { data } = await Promise.race([
      supabase.auth.getUser(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AUTH_TIMEOUT')), timeoutMs),
      ),
    ])
    return { user: data.user ?? null, timedOut: false }
  } catch {
    return { user: null, timedOut: true }
  }
}
