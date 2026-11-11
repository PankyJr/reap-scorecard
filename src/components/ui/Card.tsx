import type { ReactNode } from 'react'
import { cn } from './cn'
import { RelativeTime } from './RelativeTime'

/**
 * Card label: 11px, uppercase, 0.08em tracking, 600, grey. The only place
 * capitals are used. "TOTAL BALANCE".
 */
export function CardLabel({ children, className, as: Tag = 'p', id }: { children: ReactNode; className?: string; as?: 'p' | 'h2' | 'h3' | 'span'; id?: string }) {
  return (
    <Tag id={id} className={cn('text-caps font-semibold uppercase tracking-label text-label', className)}>
      {children}
    </Tag>
  )
}

/** Card frame: white, 14px radius, teal 8% hairline, two-layer teal shadow with a white top highlight. */
export const CARD_FRAME = 'rounded-card border border-card bg-surface shadow-card'

/** Clickable card: the border goes to teal 16% and the card lifts 1px, 150ms ease-out. Nothing else. */
export const CARD_INTERACTIVE =
  'transition-[border-color,transform] duration-150 ease-out hover:-translate-y-px hover:border-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-canvas'

/**
 * The one card. 24px padding. Header: label on the left, an optional quiet
 * action on the right, then 16px to the body.
 *
 *   label    11px uppercase label ("NEEDS YOU · 3 ITEMS")
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
      className={cn('min-w-0', CARD_FRAME, args.className)}
    >
      {hasHead ? (
        <div className="flex min-h-9 items-center justify-between gap-3 px-6 pt-6">
          <div className="min-w-0 space-y-0.5">
            {args.label ? <CardLabel as="h2">{args.label}</CardLabel> : null}
            {args.title ? <h2 className="text-lg font-semibold text-ink">{args.title}</h2> : null}
            {args.description ? <p className="max-w-[70ch] text-meta text-label">{args.description}</p> : null}
            {args.updated ? <RelativeTime value={args.updated} className="block text-meta text-subtle" /> : null}
          </div>
          {args.actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{args.actions}</div> : null}
        </div>
      ) : null}
      {args.children ? (
        <div
          className={cn(
            'min-w-0',
            args.flush ? (hasHead ? 'mt-4' : '') : cn('px-6 pb-6', hasHead ? 'pt-4' : 'pt-6'),
            args.bodyClassName,
          )}
        >
          {args.children}
        </div>
      ) : null}
      {args.footer ? <div className="border-t border-line px-6 py-4">{args.footer}</div> : null}
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
