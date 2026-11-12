'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { Settings } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Segmented } from '@/components/ui/Segmented'

const TABS = [
  { value: '/settings/profile', label: 'Profile' },
  { value: '/settings/account', label: 'Account' },
  { value: '/settings/help', label: 'Help' },
  { value: '/settings/legal', label: 'Legal' },
]

/**
 * Settings (Untitled UI general settings): the page header, then the four
 * sections as a segmented control instead of a side menu. The workforce-
 * targets screens sit under /settings for historical reasons but are a REAP
 * staff tool with their own header, so the chrome steps aside there.
 */
export function SettingsChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? ''
  if (pathname.startsWith('/settings/eap-targets')) return <>{children}</>
  const current = TABS.find((tab) => pathname === tab.value || pathname.startsWith(`${tab.value}/`))?.value ?? ''
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" icon={Settings} description="Your profile and password, help, and the legal terms." />
      <div data-help="settings-nav" className="w-fit max-w-full">
        <Segmented label="Settings sections" value={current} options={TABS.map((tab) => ({ ...tab, href: tab.value }))} />
      </div>
      <div className="min-w-0" data-help="settings-content">
        {children}
      </div>
    </div>
  )
}
