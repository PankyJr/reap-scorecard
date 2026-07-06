import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { DashboardProviders } from '@/components/providers/DashboardProviders'
import { ReactNode } from 'react'
import type { Metadata } from 'next'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { isReapInternalAdmin } from '@/lib/admin/internal-admin'
import { userDisplayNameFromMetadata } from '@/lib/auth/user-display-name'
import { PRIVATE_APP_ROBOTS } from '@/lib/seo/metadata'

export const metadata: Metadata = {
  robots: PRIVATE_APP_ROBOTS,
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>
  const displayName = userDisplayNameFromMetadata(meta, user?.email)
  const email = user?.email ?? ''
  const avatarRaw = meta.avatar_url ?? meta.picture
  const avatarUrl =
    typeof avatarRaw === 'string' && avatarRaw.trim().length > 0 ? avatarRaw : undefined

  const showInternalAdminLink = user ? await isReapInternalAdmin(user.id) : false

  async function signOut() {
    'use server'
    const supabaseServer = await createClient()
    await supabaseServer.auth.signOut()
    redirect('/login')
  }

  return (
    <DashboardProviders>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar
          user={{ name: displayName, email, avatarUrl }}
          signOutAction={signOut}
          showInternalAdminLink={showInternalAdminLink}
        />
        <div className="flex min-h-screen flex-1 flex-col">
          <Header />
          <main className="w-full max-w-none flex-1 px-6 py-6 md:px-8 md:py-8">{children}</main>
        </div>
      </div>
    </DashboardProviders>
  )
}
