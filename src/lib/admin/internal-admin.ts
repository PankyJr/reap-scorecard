import 'server-only'

import { notFound, redirect } from 'next/navigation'

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

/**
 * Requires a logged-in user who appears in `reap_internal_admins`.
 * Non-admins get 404 (no existence leak). Unauthenticated users go to login.
 */
export async function requireReapInternalAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login?next=' + encodeURIComponent('/admin'))
  }
  const ok = await isReapInternalAdmin(user.id)
  if (!ok) {
    notFound()
  }
  return user
}
