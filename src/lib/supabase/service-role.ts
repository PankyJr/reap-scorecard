import 'server-only'

import { createClient } from '@supabase/supabase-js'

import { getSupabaseProjectUrl } from '@/lib/supabase/public-env'

/**
 * Supabase client with the service role key. Bypasses RLS — use only on the server
 * after `requireReapInternalAdmin()` (or equivalent) has succeeded.
 */
export function createServiceRoleSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!key) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY. Set it in the host environment (e.g. Netlify) for internal admin routes.',
    )
  }
  return createClient(getSupabaseProjectUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
