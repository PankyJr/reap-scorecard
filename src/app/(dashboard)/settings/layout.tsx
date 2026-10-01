import type { ReactNode } from 'react'
import { SettingsNav } from '@/components/settings/SettingsNav'

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <div className="relative z-10 space-y-6">
        <div className="border-b border-line pb-5">
          <h1 className="text-2xl font-bold tracking-tight text-ink">Settings</h1>
          <p className="mt-1 text-sm text-muted">
            Manage your profile, account preferences, and workspace resources.
          </p>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
          <SettingsNav />
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
    </div>
  )
}
