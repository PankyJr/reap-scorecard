import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { DashboardProviders } from '@/components/providers/DashboardProviders'
import { ReactNode } from 'react'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const meta = user?.user_metadata ?? {}
  const displayName = meta.full_name || meta.name || user?.email?.split('@')[0] || 'User'
  const email = user?.email ?? ''
  const avatarUrl: string | undefined = meta.avatar_url || meta.picture || undefined

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
        />
        <div className="flex min-h-screen flex-1 flex-col">
          <Header />
          <main className="mx-auto w-full max-w-7xl flex-1 p-6 md:p-8">{children}</main>
        </div>
      </div>
    </DashboardProviders>
  )
}
