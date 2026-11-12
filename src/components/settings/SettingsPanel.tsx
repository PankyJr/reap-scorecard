import type { ReactNode } from 'react'
import { cn } from '@/components/ui/cn'

/**
 * A settings page body (Untitled UI): a 16/24 title and a grey line, a
 * hairline, then the rows. No box around it.
 */
export function SettingsPanel({ title, description, children, className, actions }: { title: string; description?: string; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={cn('border-t border-line pt-6', className)}>
      <div className="flex flex-wrap items-start justify-between gap-4 pb-5">
        <div className="min-w-0">
          <h2 className="text-section font-semibold text-ink">{title}</h2>
          {description ? <p className="mt-0.5 text-meta text-label">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 gap-2">{actions}</div> : null}
      </div>
      <div className="border-t border-line">{children}</div>
    </section>
  )
}

/**
 * One row (Untitled UI): label and helper on the left (280px), the field or
 * content on the right (up to 512px), a hairline under it.
 */
export function SettingsRow({ label, helper, htmlFor, children, wide = false }: { label: ReactNode; helper?: ReactNode; htmlFor?: string; children: ReactNode; wide?: boolean }) {
  const Label = htmlFor ? 'label' : 'p'
  return (
    <div className="grid gap-x-8 gap-y-3 border-b border-line py-5 md:grid-cols-[280px_minmax(0,1fr)]">
      <div className="min-w-0">
        <Label {...(htmlFor ? { htmlFor } : {})} className="block text-body font-medium text-ink">
          {label}
        </Label>
        {helper ? <p className="mt-0.5 text-meta text-label">{helper}</p> : null}
      </div>
      <div className={cn('min-w-0', !wide && 'max-w-[512px]')}>{children}</div>
    </div>
  )
}

/** Nested section inside a settings page (e.g. Help topics): a row with a title on the left. */
export function SettingsSection({ title, description, children, className }: { title: string; description?: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <SettingsRow label={title} helper={description} wide>
        {children}
      </SettingsRow>
    </div>
  )
}

/** Information only (no field): the title on the left, the words on the right. */
export function SettingsInfoCard({ title, description, icon }: { eyebrow?: string; title: string; description: string; icon?: ReactNode }) {
  return (
    <SettingsRow
      label={
        <span className="flex items-center gap-2">
          {icon ? <span className="text-icon [&_svg]:h-4 [&_svg]:w-4">{icon}</span> : null}
          {title}
        </span>
      }
    >
      <p className="text-body text-label">{description}</p>
    </SettingsRow>
  )
}
