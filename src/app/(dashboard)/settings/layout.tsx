import type { ReactNode } from 'react'
import { SettingsNav } from '@/components/settings/SettingsNav'

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl space-y-10 pb-10">
      <header className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#063b3f]">Preferences</p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.65rem]">Settings</h1>
        <p className="text-sm text-slate-500">Manage your profile and preferences.</p>
      </header>

      <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-14">
        <SettingsNav />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}
