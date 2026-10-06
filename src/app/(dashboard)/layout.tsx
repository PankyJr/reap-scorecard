import { MobileNav, Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { DashboardProviders } from '@/components/providers/DashboardProviders'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
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
    <DashboardProviders userId={user?.id ?? null}>
      <div className="flex min-h-screen bg-canvas">
        {/* First thing a keyboard reaches on every page, on phones too. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-control focus:bg-brand focus:px-3 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <Sidebar
          user={{ name: displayName, email, avatarUrl }}
          signOutAction={signOut}
          showInternalAdminLink={showInternalAdminLink}
        />
        {/* min-w-0: without it this flex child grows to its widest table, so every
            page with a results table laid out ~500px wide on a 390px phone. */}
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <MobileNav
            user={{ name: displayName, email, avatarUrl }}
            signOutAction={signOut}
            showInternalAdminLink={showInternalAdminLink}
          />
          <Header />
          <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1180px] flex-1 px-4 py-6 focus:outline-none sm:px-6 md:px-8 md:py-8">
            {children}
          </main>
        </div>
      </div>
    </DashboardProviders>
  )
}
