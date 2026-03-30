import { createClient } from '@/utils/supabase/server'
import { LogOut } from 'lucide-react'
import { redirect } from 'next/navigation'
import Image from 'next/image'

export async function Header() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const meta = user?.user_metadata ?? {}
  const displayName = meta.full_name || meta.name || user?.email?.split('@')[0] || 'User'
  const avatarUrl: string | undefined = meta.avatar_url || meta.picture || undefined

  async function signOut() {
    'use server'
    const supabaseServer = await createClient()
    await supabaseServer.auth.signOut()
    redirect('/login')
  }

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex-1 md:hidden">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="Reap Solutions" width={28} height={28} className="h-7 w-7" />
          <span className="font-semibold text-slate-900">Reap Solutions</span>
        </div>
      </div>
      <div className="flex-1 hidden md:block" />

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5 text-sm text-slate-600">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="h-7 w-7 rounded-full object-cover ring-1 ring-slate-200"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white ring-1 ring-slate-200">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="hidden sm:inline font-medium text-slate-700">{displayName}</span>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors px-2.5 py-1.5 rounded-md hover:bg-slate-100"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </form>
      </div>
    </header>
  )
}
