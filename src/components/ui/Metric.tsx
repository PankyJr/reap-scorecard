import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { cn } from './cn'

/**
 * Halal Lab metric: grey 13px label with a small arrow-up-right, a 28px
 * semibold figure, then a change line (green/red 12 semibold + grey words).
 */
export function Metric(args: { label: ReactNode; value: ReactNode; sub?: ReactNode; href?: string; className?: string }) {
  const label = (
    <span className="flex items-center gap-1 text-meta text-label">
      {args.label}
      {args.href ? <ArrowUpRight className="h-3.5 w-3.5 text-icon transition-transform duration-200 group-hover:-translate-y-px group-hover:translate-x-px" aria-hidden /> : null}
    </span>
  )
  const body = (
    <>
      {label}
      <span className="mt-2 flex h-[34px] items-center text-metric font-semibold text-ink tabular-nums [&_number-flow-react]:leading-[inherit]">{args.value}</span>
      {args.sub ? <span className="mt-1.5 block text-caps text-label">{args.sub}</span> : null}
    </>
  )
  return args.href ? (
    <Link href={args.href} className={cn('group block min-w-0 rounded-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-teal/25', args.className)}>
      {body}
    </Link>
  ) : (
    <div className={cn('min-w-0', args.className)}>{body}</div>
  )
}

/** A row of metrics with hairlines between them (stacked on phones). */
export function MetricStrip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('grid grid-cols-1 gap-y-5 sm:auto-cols-fr sm:grid-flow-col sm:divide-x sm:divide-line [&>*]:sm:px-6 [&>*:first-child]:sm:pl-0 [&>*:last-child]:sm:pr-0', className)}>
      {children}
    </div>
  )
}
