import type { ReactNode } from 'react'

type SettingsPanelProps = {
  title: string
  description?: string
  children: ReactNode
}

export function SettingsPanel({ title, description, children }: SettingsPanelProps) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05),0_18px_46px_rgba(15,23,42,0.06)]">
      <div className="h-1 w-full bg-gradient-to-r from-[#063b3f] via-[#0a4d52] to-[#6da5ab]" />
      <div className="border-b border-slate-100/90 bg-gradient-to-br from-slate-50 via-white to-white px-6 py-5 sm:px-8 sm:py-6">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm leading-relaxed text-slate-500">{description}</p>
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
      className={`rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.05),0_14px_36px_rgba(15,23,42,0.05)] sm:p-8 ${className}`}
    >
      <h3 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  )
}
