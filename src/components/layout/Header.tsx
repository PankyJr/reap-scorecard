import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Image from 'next/image'
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
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="flex flex-1 md:hidden">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="Reap Solutions" width={28} height={28} className="h-7 w-7" />
          <span className="font-semibold text-slate-900">Reap Solutions</span>
        </div>
      </div>
      <div className="hidden flex-1 md:block" />

      <div className="flex items-center justify-end">
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
