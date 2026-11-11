import { CARD_FRAME } from './Card'
import { LoadingRegion, Skeleton, SkeletonText } from './Skeleton'
import { cn } from './cn'

/**
 * Loading screens shaped like the pages they stand in for, built from the same
 * frames (design rule 1). Invisible for the first 300ms (rule 2).
 */

export function HeaderSkeleton({ crumbs = false, meta = true, description = false, action = false }: { crumbs?: boolean; meta?: boolean; description?: boolean; action?: boolean }) {
  return (
    <div className="space-y-3">
      {crumbs ? <SkeletonText size="sm" width="w-48" /> : null}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <SkeletonText size="title" width="w-72" className="md:h-10" />
          {meta ? <SkeletonText size="xs" width="w-48" className="h-[18px]" /> : null}
          {description ? <SkeletonText size="base" width="w-96" /> : null}
        </div>
        {action ? <Skeleton className="h-10 w-40 rounded-control" /> : null}
      </div>
    </div>
  )
}

/** The card header exactly as Card draws it: label (and an optional description) with 24px above. */
function CardHeadSkeleton({ description = false }: { description?: boolean }) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-3 px-6 pt-6">
      <div className="min-w-0 space-y-0.5">
        <SkeletonText size="xs" width="w-32" />
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
      <div className={cn('h-10 border-y border-line bg-sunken', label && 'mt-4')} />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex h-[57px] items-center gap-6 border-b border-line px-6 last:h-14 last:border-b-0">
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
  return <div className="h-[46px] rounded-control border border-line bg-sunken" />
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

export function PageSkeleton({ label, children, gap = 'space-y-8' }: { label: string; children: React.ReactNode; gap?: string }) {
  return (
    <LoadingRegion label={label} className={cn('reap-delay-show', gap)}>
      {children}
    </LoadingRegion>
  )
}
