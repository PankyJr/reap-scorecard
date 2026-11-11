import type { ReactNode } from 'react'
import { cn } from './cn'
import { RelativeTime } from './RelativeTime'

/**
 * Keel card label: 12px, uppercase, 0.06em tracking, grey. "TOTAL BALANCE".
 * Use it for the name of a data card; use `title` for a section heading.
 */
export function CardLabel({ children, className, as: Tag = 'p', id }: { children: ReactNode; className?: string; as?: 'p' | 'h2' | 'h3' | 'span'; id?: string }) {
  return (
    <Tag id={id} className={cn('text-xs font-semibold uppercase tracking-label text-label', className)}>
      {children}
    </Tag>
  )
}

/**
 * The one card. White on the off-white page, 1px hairline, 14px radius, 24px
 * padding, one very soft shadow in light and none in dark.
 *
 *   label    Keel uppercase label ("NEEDS YOU · 3 ITEMS")
 *   title    a section heading instead of (or under) the label
 *   updated  ISO time: "Updated 2 min ago" under the label (design rule 22)
 *   actions  top-right: a quiet button or filter
 *   flush    the body runs edge to edge (tables, lists)
 */
export function Card(args: {
  label?: ReactNode
  title?: ReactNode
  description?: ReactNode
  updated?: string | null
  actions?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  id?: string
  className?: string
  bodyClassName?: string
  flush?: boolean
  as?: 'section' | 'div' | 'article'
  'aria-labelledby'?: string
  'data-tour'?: string
}) {
  const Tag = args.as ?? 'section'
  const hasHead = Boolean(args.label || args.title || args.actions || args.updated)
  return (
    <Tag
      id={args.id}
      aria-labelledby={args['aria-labelledby']}
      data-tour={args['data-tour']}
      className={cn('min-w-0 rounded-card border border-line bg-surface shadow-card', args.className)}
    >
      {hasHead ? (
        <div className="flex items-start justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
          <div className="min-w-0 space-y-1">
            {args.label ? <CardLabel>{args.label}</CardLabel> : null}
            {args.title ? <h2 className="text-lg font-semibold text-ink">{args.title}</h2> : null}
            {args.description ? <p className="max-w-[70ch] text-sm text-label">{args.description}</p> : null}
            {args.updated ? <RelativeTime value={args.updated} className="block text-xs text-subtle" /> : null}
          </div>
          {args.actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{args.actions}</div> : null}
        </div>
      ) : null}
      {args.children ? (
        <div
          className={cn(
            'min-w-0',
            args.flush ? (hasHead ? 'mt-4' : '') : cn('px-5 pb-5 sm:px-6 sm:pb-6', hasHead ? 'pt-4' : 'pt-5 sm:pt-6'),
            args.bodyClassName,
          )}
        >
          {args.children}
        </div>
      ) : null}
      {args.footer ? <div className="border-t border-line px-5 py-4 sm:px-6">{args.footer}</div> : null}
    </Tag>
  )
}

/** Label / value pairs, two columns from tablet width up. Grey label, dark value. */
export function FactList({ items }: { items: Array<{ label: ReactNode; value: ReactNode }> }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map((item, index) => (
        <div key={index} className="min-w-0">
          <dt className="text-sm text-label">{item.label}</dt>
          <dd className="break-words text-base font-medium text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Hides advanced or rarely needed content behind one clear link. */
export function MoreOptions(args: { label?: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="group rounded-control border border-line bg-sunken" open={args.defaultOpen}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-control px-4 py-3 text-sm font-semibold text-brand marker:hidden focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand/30">
        <span>{args.label ?? 'More options'}</span>
        <span aria-hidden className="text-subtle transition-transform duration-150 group-open:rotate-90">›</span>
      </summary>
      <div className="space-y-4 border-t border-line px-4 py-4">{args.children}</div>
    </details>
  )
}
