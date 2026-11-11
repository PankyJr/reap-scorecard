import Link from 'next/link'
import type { ReactNode } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from './cn'

/**
 * Untitled UI number tile: grey label (with an optional tiny chevron), a bold
 * number, and a small grey "of X" or delta right-aligned on the same line.
 * The number never stands alone (design rule 9): pass `aside`.
 */
export function StatTile(args: {
  label: ReactNode
  value: ReactNode
  aside?: ReactNode
  href?: string
  /** A logo or icon before the label. */
  leading?: ReactNode
  chevron?: boolean
  /** Let a text value wrap instead of truncating (for names, not numbers). */
  wrap?: boolean
  className?: string
  children?: ReactNode
}) {
  const body = (
    <>
      <span className="flex items-center gap-2 text-sm text-label">
        {args.leading}
        <span className="truncate">{args.label}</span>
        {args.chevron ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-subtle" aria-hidden /> : null}
      </span>
      <span className="mt-3 flex items-baseline justify-between gap-3">
        <span className={cn('min-w-0 text-title font-semibold tabular-nums text-ink', args.wrap ? 'text-pretty' : 'truncate')}>{args.value}</span>
        {args.aside ? <span className="shrink-0 text-sm tabular-nums text-label">{args.aside}</span> : null}
      </span>
      {args.children}
    </>
  )
  const frame = 'block min-w-0 rounded-card border border-line bg-surface p-5 shadow-card'
  if (args.href) {
    return (
      <Link
        href={args.href}
        className={cn(
          frame,
          'group relative transition-colors duration-150 hover:border-line-strong focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand/30',
          args.className,
        )}
      >
        {body}
        <ChevronRight className="absolute right-4 top-5 h-4 w-4 text-subtle transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden />
      </Link>
    )
  }
  return <div className={cn(frame, args.className)}>{body}</div>
}
