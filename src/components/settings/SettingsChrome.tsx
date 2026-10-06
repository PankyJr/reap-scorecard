'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { SettingsNav } from './SettingsNav'
import { PageHeader } from '@/components/ui/PageHeader'

/**
 * Settings header and menu. The workforce-targets screens sit under /settings
 * for historical reasons but are a REAP staff tool with their own header, so
 * the Settings chrome steps aside there.
 */
export function SettingsChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? ''
  if (pathname.startsWith('/settings/eap-targets')) return <>{children}</>
  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Settings' }]}
        title="Settings"
        description="Your profile and password, help, and the legal terms."
      />
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <SettingsNav />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}
