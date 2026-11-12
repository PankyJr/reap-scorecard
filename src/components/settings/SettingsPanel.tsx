import type { ReactNode } from 'react'
import { cn } from '@/components/ui/cn'
import { CARD_FRAME } from '@/components/ui/Card'

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
        'overflow-hidden rounded-card border border-line bg-surface/95 shadow-sm',
        className,
      )}
    >
      <div className="border-b border-line px-6 py-4 sm:px-6 sm:py-5">
        <h2 className="text-body font-semibold text-ink sm:text-section">{title}</h2>
        {description ? (
          <p className="mt-1 text-meta leading-relaxed text-muted sm:text-meta">{description}</p>
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
        CARD_FRAME,
        className,
      )}
    >
      <div className="border-b border-line/80 px-5 py-4 sm:px-6">
        <h3 className="text-body font-semibold text-ink sm:text-body">{title}</h3>
        {description ? (
          <p className="mt-1 text-meta leading-relaxed text-muted sm:text-meta">{description}</p>
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
    <div className={cn('p-6', CARD_FRAME)}>
      <div className="flex items-start gap-3">
        {icon ? (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control border border-line bg-surface text-teal shadow-sm">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-meta font-medium text-muted">
            {eyebrow}
          </p>
          <p className="mt-1.5 text-body font-semibold text-ink">{title}</p>
          <p className="mt-1 text-meta leading-relaxed text-muted">{description}</p>
        </div>
      </div>
    </div>
  )
}
