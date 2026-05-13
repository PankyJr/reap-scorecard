import 'server-only'

import type { SupabaseClient, User } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'

import { createServiceRoleSupabase } from '@/lib/supabase/service-role'
import { createClient } from '@/utils/supabase/server'

import { isReapInternalAdmin } from './internal-admin'

/**
 * Returns the Supabase client to use for tenant data reads.
 * REAP internal admins use the service role client so RLS does not block cross-tenant reads.
 * Must only be used in server components after session is established.
 */
export async function resolveTenantReadContext(): Promise<{
  user: User
  db: SupabaseClient
  isReapInternalAdmin: boolean
}> {
  const auth = await createClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) redirect('/login')
  const admin = await isReapInternalAdmin(user.id)
  return {
    user,
    db: admin ? createServiceRoleSupabase() : auth,
    isReapInternalAdmin: admin,
  }
}
