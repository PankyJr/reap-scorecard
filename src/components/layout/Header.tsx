import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import { HeaderUserMenu } from '@/components/layout/HeaderUserMenu'

export async function Header() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const meta = user?.user_metadata ?? {}
  const displayName = meta.full_name || meta.name || user?.email?.split('@')[0] || 'User'
  const avatarUrl: string | undefined = meta.avatar_url || meta.picture || undefined
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
