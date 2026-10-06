import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { HeaderTourAction } from '@/components/layout/HeaderTourAction'
import { HeaderUserMenu } from '@/components/layout/HeaderUserMenu'
import { userDisplayNameFromMetadata } from '@/lib/auth/user-display-name'

export async function Header() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>
  const displayName = userDisplayNameFromMetadata(meta, user?.email)
  const avatarRaw = meta.avatar_url ?? meta.picture
  const avatarUrl =
    typeof avatarRaw === 'string' && avatarRaw.trim().length > 0 ? avatarRaw : undefined
  const email = user?.email ?? ''

  async function signOut() {
    'use server'
    const supabaseServer = await createClient()
    await supabaseServer.auth.signOut()
    redirect('/login')
  }

  return (
    <header className="no-print sticky top-0 z-10 hidden h-16 items-center justify-between border-b border-line bg-surface px-8 md:flex">
      <div className="flex-1" />

      <div className="flex items-center justify-end gap-3">
        <HeaderTourAction />
        {user ? (
          <HeaderUserMenu
            displayName={displayName}
            email={email}
            avatarUrl={avatarUrl}
            signOutAction={signOut}
          />
        ) : null}
      </div>
    </header>
  )
}
