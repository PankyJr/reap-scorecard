import 'server-only'

import { forbidden, redirect } from 'next/navigation'

import { decideInternalAdminAccess } from '@/lib/admin/internal-admin-gate'
import { createServiceRoleSupabase } from '@/lib/supabase/service-role'
import { createClient } from '@/utils/supabase/server'

export async function isReapInternalAdmin(userId: string): Promise<boolean> {
  try {
    const admin = createServiceRoleSupabase()
    const { data, error } = await admin
      .from('reap_internal_admins')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) return false
    return Boolean(data)
  } catch {
    return false
  }
}

export type RequireReapInternalAdminOptions = {
  /** Path returned to after login. Defaults to `/admin`. */
  loginNext?: string
}

/**
 * Requires a logged-in user who appears in `reap_internal_admins`.
 *
 * - Unauthenticated → login redirect
 * - Authenticated non-admin → HTTP 403 via `forbidden()` (Access Denied UI)
 * - Authorised admin → returns the user
 *
 * Database RLS on EAP tables remains unchanged and is still the write-path backstop.
 */
export async function requireReapInternalAdmin(options?: RequireReapInternalAdminOptions) {
  const loginNext = options?.loginNext ?? '/admin'
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const decision = decideInternalAdminAccess({
    authenticated: Boolean(user),
    isAdmin: user ? await isReapInternalAdmin(user.id) : false,
    nextPath: loginNext,
  })

  if (decision.outcome === 'login') {
    redirect('/login?next=' + encodeURIComponent(decision.nextPath))
  }
  if (decision.outcome === 'forbidden') {
    forbidden()
  }

  // decision.outcome === 'allow'
  return user!
}
