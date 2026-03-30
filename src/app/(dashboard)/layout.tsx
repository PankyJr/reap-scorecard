import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
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
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar
        user={{ name: displayName, email, avatarUrl }}
        signOutAction={signOut}
      />
      <div className="flex-1 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  )
}
