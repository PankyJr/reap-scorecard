import type { ReactNode } from 'react'

type SettingsPanelProps = {
  title: string
  description?: string
  children: ReactNode
}

export function SettingsPanel({ title, description, children }: SettingsPanelProps) {
  return (
    <div className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05),0_22px_55px_rgba(15,23,42,0.09)]">
      <div className="h-1 w-full bg-gradient-to-r from-[#02181b] via-[#063b3f] to-[#0b5259]" />
      <div className="border-b border-slate-200/80 bg-gradient-to-br from-white via-white to-slate-50/70 px-6 py-5 sm:px-8 sm:py-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Settings Section
        </p>
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{description}</p>
        ) : null}
      </div>
      <div className="px-6 py-6 sm:px-8 sm:py-8">{children}</div>
    </div>
  )
}

type SettingsSectionProps = {
  title: string
  children: ReactNode
  className?: string
}

export function SettingsSection({ title, children, className = '' }: SettingsSectionProps) {
  return (
    <section
      className={`rounded-3xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/50 p-6 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_14px_36px_rgba(15,23,42,0.06)] sm:p-8 ${className}`}
    >
      <h3 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  )
}
