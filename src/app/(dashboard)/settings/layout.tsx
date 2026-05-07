import type { ReactNode } from 'react'
import { SettingsNav } from '@/components/settings/SettingsNav'

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-12">
      <header className="relative overflow-hidden rounded-[32px] border border-slate-200/90 bg-[radial-gradient(circle_at_top_right,rgba(11,82,89,0.16),transparent_34%),radial-gradient(circle_at_20%_0%,rgba(11,22,61,0.10),transparent_35%),linear-gradient(180deg,#ffffff,#f8fafc)] px-6 py-6 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_24px_60px_rgba(15,23,42,0.10)] sm:px-8 sm:py-8">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
        <p className="inline-flex items-center rounded-full border border-[#0b5259]/20 bg-[#0b5259]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0b5259]">
          Preferences
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[2rem]">
          Settings
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-[15px]">
          Manage profile identity, account controls, and support resources with a
          single workspace settings system.
        </p>
      </header>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-8">
        <SettingsNav />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}
