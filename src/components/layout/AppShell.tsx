import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { MobileNav, Sidebar } from '@/components/layout/Sidebar'
import { SIDEBAR_BOOT_SCRIPT } from '@/components/layout/sidebar-boot'
import { DashboardProviders } from '@/components/providers/DashboardProviders'
import { createClient } from '@/utils/supabase/server'
import { isReapInternalAdmin } from '@/lib/admin/internal-admin'
import { userDisplayNameFromMetadata } from '@/lib/auth/user-display-name'

/**
 * The app shell: the sidebar on the REAP teal frame (#063B3F), and ONE white
 * panel floating 8px in from the top, right and bottom, radius 16, no border,
 * a soft shadow. The page sits inside it at up to 1200px, padded 32px (16px
 * on phones). There is no top bar: each page header carries its own actions.
 *
 * Used by the signed-in app and the Aberdare workspace.
 */
export async function AppShell({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>
  const displayName = userDisplayNameFromMetadata(meta, user?.email)
  const email = user?.email ?? ''
  const avatarRaw = meta.avatar_url ?? meta.picture
  const avatarUrl = typeof avatarRaw === 'string' && avatarRaw.trim().length > 0 ? avatarRaw : undefined
  const showInternalAdminLink = user ? await isReapInternalAdmin(user.id) : false

  async function signOut() {
    'use server'
    const supabaseServer = await createClient()
    await supabaseServer.auth.signOut()
    redirect('/login')
  }

  const person = { name: displayName, email, avatarUrl }
  return (
    <DashboardProviders userId={user?.id ?? null}>
      <div className="flex min-h-screen bg-canvas">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-control focus:bg-brand focus:px-3 focus:py-2 focus:text-brand-ink"
        >
          Skip to content
        </a>
        {/* Before the sidebar paints: the remembered collapsed state, so nothing jumps. */}
        <script dangerouslySetInnerHTML={{ __html: SIDEBAR_BOOT_SCRIPT }} />
        <Sidebar user={person} signOutAction={signOut} showInternalAdminLink={showInternalAdminLink} />
        {/* min-w-0: without it this flex child grows to its widest table. */}
        <div className="flex min-h-screen min-w-0 flex-1 flex-col md:py-2 md:pr-2">
          <MobileNav user={person} signOutAction={signOut} showInternalAdminLink={showInternalAdminLink} />
          <main
            id="main"
            tabIndex={-1}
            className="mx-2 mb-2 min-w-0 flex-1 rounded-card bg-surface shadow-panel focus:outline-none md:mx-0 md:mb-0"
          >
            <div className="mx-auto w-full max-w-[1264px] px-4 py-6 md:px-8 md:py-8">{children}</div>
          </main>
        </div>
      </div>
    </DashboardProviders>
  )
}
