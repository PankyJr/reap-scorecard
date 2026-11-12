import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from './cn'
import { RelativeTime } from './RelativeTime'

/**
 * A small grey label (Halal Lab "Revenue growth"): 13px medium, sentence
 * case. No capitals anywhere in the product.
 */
export function CardLabel({ children, className, as: Tag = 'p', id }: { children: ReactNode; className?: string; as?: 'p' | 'h2' | 'h3' | 'span'; id?: string }) {
  return (
    <Tag id={id} className={cn('text-meta font-medium text-label', className)}>
      {children}
    </Tag>
  )
}

/** A section title inside the panel: 16/24 semibold. */
export function SectionTitle({ children, className, as: Tag = 'h2', id }: { children: ReactNode; className?: string; as?: 'h2' | 'h3' | 'p'; id?: string }) {
  return (
    <Tag id={id} className={cn('text-section font-semibold text-ink', className)}>
      {children}
    </Tag>
  )
}

/** Card frame (Halal Lab): white, 1px #EBEBEF, radius 16, no shadow. */
export const CARD_FRAME = 'rounded-card border border-line bg-surface'

/** Clickable card: border to #DADADF and a 1px lift, 200ms. */
export const CARD_INTERACTIVE =
  'transition-[border-color,transform] duration-200 ease-out hover:-translate-y-px hover:border-line-strong active:translate-y-0 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-teal/25'

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
        <div className="flex min-h-9 items-center justify-between gap-3 px-5 pt-5 sm:px-6">
          <div className="min-w-0 space-y-0.5">
            {args.label ? <SectionTitle>{args.label}</SectionTitle> : null}
            {args.title ? <SectionTitle>{args.title}</SectionTitle> : null}
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
  // A quiet disclosure row: a hairline above, the label, a chevron that turns.
  return (
    <details className="group border-t border-line" open={args.defaultOpen}>
      <summary className="-mx-2 flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-3 rounded-sm px-2 text-body font-medium text-ink transition-colors duration-200 marker:hidden hover:bg-sunken focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-teal/25">
        <span>{args.label ?? 'More options'}</span>
        <ChevronRight aria-hidden className="h-4 w-4 text-icon transition-transform duration-200 group-open:rotate-90" />
      </summary>
      <div className="space-y-4 pb-5 pt-1">{args.children}</div>
    </details>
  )
}

/**
 * Label / value rows (Untitled UI): label column 200px on the left, the value
 * on the right, hairlines between. One column on phones.
 */
export function KeyValueList({ items }: { items: Array<{ label: ReactNode; value: ReactNode }> }) {
  return (
    <dl className="divide-y divide-line border-y border-line">
      {items.map((item, index) => (
        <div key={index} className="grid gap-1 py-4 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-6">
          <dt className="text-body font-medium text-label">{item.label}</dt>
          <dd className="min-w-0 break-words text-body text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
