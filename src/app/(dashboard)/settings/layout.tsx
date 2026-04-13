import type { ReactNode } from 'react'
import { SettingsNav } from '@/components/settings/SettingsNav'

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      <header className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-[radial-gradient(circle_at_top_right,rgba(6,59,63,0.12),transparent_35%),linear-gradient(180deg,#ffffff,#f8fafc)] px-6 py-6 shadow-[0_1px_3px_rgba(15,23,42,0.05),0_16px_40px_rgba(15,23,42,0.06)] sm:px-8 sm:py-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#063b3f]">Preferences</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.85rem]">Settings</h1>
        <p className="mt-1 text-sm text-slate-500 sm:text-[15px]">Manage your profile, account, and support resources.</p>
      </header>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
        <SettingsNav />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}
