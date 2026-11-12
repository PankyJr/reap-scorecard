import { CARD_FRAME } from './Card'
import { LoadingRegion, Skeleton, SkeletonText } from './Skeleton'
import { cn } from './cn'

/**
 * Loading screens shaped like the pages they stand in for, built from the same
 * frames (design rule 1). Invisible for the first 300ms (rule 2).
 */

export function HeaderSkeleton({ crumbs = false, meta = true, description = false, descriptionLines = 1, action = false }: { crumbs?: boolean; meta?: boolean; description?: boolean; descriptionLines?: number; action?: boolean }) {
  // PageHeader: 24/32 title (with its 18px icon), a 14/20 grey line, actions + the help button.
  return (
    <div className="space-y-3">
      {crumbs ? <SkeletonText size="xs" width="w-40" className="h-[18px]" /> : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <SkeletonText size="title" width="w-64" className="h-8" />
          {meta ? <SkeletonText size="sm" width="w-48" /> : null}
          {description ? (
            <div>
              {Array.from({ length: descriptionLines }).map((_, i) => (
                <SkeletonText key={i} size="sm" width={i === descriptionLines - 1 ? 'w-72' : 'w-[32rem] max-w-full'} />
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex gap-2">
          {action ? <Skeleton className="h-11 w-36 rounded-control sm:h-9" /> : null}
          <Skeleton className="h-11 w-11 rounded-control sm:h-9 sm:w-9" />
        </div>
      </div>
    </div>
  )
}

/** ProgressSteps: `count` small dots on a thin line, labels under (one line and a bar on phones). */
export function StepperSkeleton({ count = 5, hairline = true }: { count?: number; hairline?: boolean }) {
  return (
    <div className={cn(hairline && 'border-t border-line pt-6')} aria-hidden>
      <div className="sm:hidden">
        <SkeletonText size="xs" width="w-56" className="h-[18px]" />
        <Skeleton className="mt-2 h-1 w-full rounded-full" />
      </div>
      <div className="hidden sm:flex">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className={cn('relative', i === count - 1 ? 'shrink-0' : 'flex-1')}>
            {i < count - 1 ? <span className="absolute left-6 right-0 top-3 h-px bg-control-line" /> : null}
            <Skeleton className="h-6 w-6 rounded-full" />
            <SkeletonText size="xs" width="w-20" className="mt-2 h-[18px]" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** The compact score card: 120px rings and the figures beside them (or above, `stacked`). */
export function ScoreCardSkeleton({ stacked = false }: { stacked?: boolean }) {
  return (
    <div className={cn('flex flex-col gap-6 p-5 sm:p-6', !stacked && 'sm:flex-row sm:items-center', CARD_FRAME)} aria-hidden>
      <div className="flex justify-center">
        <Skeleton className="h-[120px] w-[120px] rounded-full" />
      </div>
      <div className="flex-1 space-y-2">
        <SkeletonText size="xs" width="w-56" className="h-[18px]" />
        <SkeletonText size="lg" width="w-40" className="h-[34px]" />
        <Skeleton className="h-[22px] w-28 rounded-full" />
      </div>
    </div>
  )
}

/** The segmented control: grey track with `count` options. */
export function SegmentedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="inline-flex gap-1 rounded-control bg-segment p-0.5" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className={cn('h-11 w-24 rounded-[8px] sm:h-8', i === 0 && 'bg-surface shadow-pill')} />
      ))}
    </div>
  )
}

/** MetricStrip: label 18, figure 34, sub-line 16, hairlines between. */
export function MetricStripSkeleton({ count = 4, hairline = true }: { count?: number; hairline?: boolean }) {
  return (
    <div className={cn(hairline && 'border-t border-line pt-6')}>
      <div className="grid grid-cols-1 gap-y-5 sm:auto-cols-fr sm:grid-flow-col sm:divide-x sm:divide-line [&>*]:sm:px-6 [&>*:first-child]:sm:pl-0 [&>*:last-child]:sm:pr-0">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i}>
            <SkeletonText size="xs" width="w-20" className="h-[18px]" />
            <SkeletonText size="lg" width="w-24" className="mt-2 h-[34px]" />
            <SkeletonText size="xs" width="w-28" className="mt-1.5" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** A table straight in the panel: 40px header, `rows` rows of 52px with hairlines. */
export function TableSkeleton({ rows = 4, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div aria-hidden>
      <div className="flex h-10 items-center gap-6 border-b border-line">
        <SkeletonText size="xs" width="w-16" />
        {Array.from({ length: columns - 1 }).map((_, j) => (
          <SkeletonText key={j} size="xs" width="w-14" className={cn('hidden sm:block', j === columns - 2 && 'ml-auto')} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex h-[53px] items-center gap-6 border-b border-divider">
          <SkeletonText size="sm" width="w-48" />
          {Array.from({ length: columns - 1 }).map((__, j) => (
            <SkeletonText key={j} size="sm" width="w-20" className={cn('hidden sm:block', j === columns - 2 && 'ml-auto')} />
          ))}
        </div>
      ))}
    </div>
  )
}

/** KeyValueList: 200px label column, hairline rows. */
export function KeyValueSkeleton({ items = 6 }: { items?: number }) {
  return (
    <div className="divide-y divide-line border-y border-line" aria-hidden>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="grid gap-1 py-4 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-6">
          <SkeletonText size="sm" width="w-24" />
          <SkeletonText size="sm" width="w-48" />
        </div>
      ))}
    </div>
  )
}

/** A hairline section with a 16/24 title and `lines` of body. */
export function SectionSkeleton({ lines = 3, title = true, children }: { lines?: number; title?: boolean; children?: React.ReactNode }) {
  return (
    <div className="border-t border-line pt-6 sm:pt-8">
      {title ? <SkeletonText size="base" width="w-40" className="mb-4 h-9 py-1.5" /> : null}
      {children ?? (
        <div className="space-y-2">
          {Array.from({ length: lines }).map((_, i) => (
            <SkeletonText key={i} size="sm" width={i % 2 ? 'w-[60%]' : 'w-[85%]'} />
          ))}
        </div>
      )}
    </div>
  )
}

/** The card header exactly as Card draws it: label (and an optional description) with 24px above. */
function CardHeadSkeleton({ description = false }: { description?: boolean }) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-3 px-5 pt-5 sm:px-6">
      <div className="min-w-0 space-y-0.5">
        <SkeletonText size="base" width="w-32" />
        {description ? <SkeletonText size="xs" width="w-[28rem]" className="h-9" /> : null}
      </div>
    </div>
  )
}

/** A card holding a table: label row, the header strip, `rows` rows of 56px. */
export function TableCardSkeleton({ rows = 4, columns = 4, label = true, description = false }: { rows?: number; columns?: number; label?: boolean; description?: boolean }) {
  return (
    <div className={CARD_FRAME}>
      {label ? <CardHeadSkeleton description={description} /> : null}
      <div className={cn('mx-5 h-10 border-b border-line sm:mx-6', label && 'mt-4')} />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="mx-5 flex h-[53px] items-center gap-6 border-b border-divider last:border-b-0 sm:mx-6">
          <SkeletonText size="sm" width="w-56" />
          {Array.from({ length: columns - 1 }).map((__, j) => (
            <SkeletonText key={j} size="sm" width="w-20" className={cn('hidden sm:block', j === columns - 2 && 'ml-auto')} />
          ))}
        </div>
      ))}
    </div>
  )
}

/** A card of label / value pairs, laid out exactly like FactList. */
export function FactCardSkeleton({ items = 6 }: { items?: number }) {
  return (
    <div className={CARD_FRAME}>
      <CardHeadSkeleton />
      <div className="grid gap-x-6 gap-y-3 px-6 pb-6 pt-4 sm:grid-cols-2">
        {Array.from({ length: items }).map((_, i) => (
          <div key={i}>
            <SkeletonText size="sm" width="w-24" />
            <SkeletonText size="base" width="w-40" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** The "More options" bar, closed. */
export function MoreOptionsSkeleton() {
  return <div className="h-[53px] border-t border-line" />
}

/** A plain card with a label and `lines` lines of text. */
export function CardSkeleton({ lines = 4, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn(CARD_FRAME, className)}>
      <CardHeadSkeleton />
      <div className="space-y-3 px-6 pb-6 pt-4">
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonText key={i} size="sm" width={i % 2 ? 'w-[60%]' : 'w-[85%]'} />
        ))}
      </div>
    </div>
  )
}

export function PageSkeleton({ label, children, gap = 'space-y-6' }: { label: string; children: React.ReactNode; gap?: string }) {
  return (
    <LoadingRegion label={label} className={cn('reap-delay-show', gap)}>
      {children}
    </LoadingRegion>
  )
}
