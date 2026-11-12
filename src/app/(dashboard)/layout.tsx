import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { PRIVATE_APP_ROBOTS } from '@/lib/seo/metadata'

export const metadata: Metadata = {
  robots: PRIVATE_APP_ROBOTS,
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>
}
