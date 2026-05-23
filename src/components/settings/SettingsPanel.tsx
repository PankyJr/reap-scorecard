import type { ReactNode } from 'react'
import { cn } from '@/components/marketing/cn'

type SettingsPanelProps = {
  title: string
  description?: string
  children: ReactNode
  className?: string
}

/** Primary content card for settings sub-pages — matches dashboard list/detail cards. */
export function SettingsPanel({ title, description, children, className }: SettingsPanelProps) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-sm',
        className,
      )}
    >
      <div className="border-b border-slate-200 px-6 py-4 sm:px-6 sm:py-5">
        <h2 className="text-base font-semibold text-slate-900 sm:text-lg">{title}</h2>
        {description ? (
          <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">{description}</p>
        ) : null}
      </div>
      <div className="px-6 py-6 sm:px-6 sm:py-7">{children}</div>
    </div>
  )
}

type SettingsSectionProps = {
  title: string
  description?: string
  children: ReactNode
  className?: string
}

/** Nested section inside a settings page (e.g. Help Center topics). */
export function SettingsSection({ title, description, children, className }: SettingsSectionProps) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/50',
        className,
      )}
    >
      <div className="border-b border-slate-200/80 px-5 py-4 sm:px-6">
        <h3 className="text-sm font-semibold text-slate-900 sm:text-base">{title}</h3>
        {description ? (
          <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">{description}</p>
        ) : null}
      </div>
      <div className="px-5 py-5 sm:px-6 sm:py-6">{children}</div>
    </section>
  )
}

type SettingsInfoCardProps = {
  eyebrow: string
  title: string
  description: string
  icon?: ReactNode
}

export function SettingsInfoCard({ eyebrow, title, description, icon }: SettingsInfoCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-white to-slate-50/80 p-5 shadow-sm">
      <div className="flex items-start gap-3">
        {icon ? (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#063b3f] shadow-sm">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            {eyebrow}
          </p>
          <p className="mt-1.5 text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{description}</p>
        </div>
      </div>
    </div>
  )
}
