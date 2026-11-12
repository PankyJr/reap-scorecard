import { CARD_FRAME } from '@/components/ui/Card'
import { HeaderSkeleton, PageSkeleton, ScoreCardSkeleton, StepperSkeleton } from '@/components/ui/PageSkeletons'
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton'
import { cn } from '@/components/ui/cn'

/**
 * A full-scorecard page while it loads: the header and the five steps, the
 * grey area checklist on the left, the compact score card and the next-step
 * card on the right. The same frames as the page, at the same sizes.
 */
export default function GenericScorecardLoading() {
  return (
    <PageSkeleton label="Loading the scorecard…">
      <div className="space-y-6">
        <HeaderSkeleton crumbs meta={false} description descriptionLines={2} />
        <StepperSkeleton />
      </div>
      <div className="lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start lg:gap-8">
        <div className="mb-6 rounded-card border border-line bg-sunken p-2 lg:mb-0">
          <div className="px-2.5 pb-3 pt-2">
            <SkeletonText size="xs" width="w-full" className="h-[18px]" />
            <Skeleton className="mt-2 h-1 w-full rounded-full" />
          </div>
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="flex min-h-[52px] items-center gap-2.5 px-2.5 py-2">
              <Skeleton className="h-5 w-5 rounded-full" />
              <div className="flex-1">
                <SkeletonText size="sm" width="w-32" />
                {i > 1 ? <SkeletonText size="xs" width="w-20" /> : null}
              </div>
              <Skeleton className="h-[22px] w-16 rounded-full" />
            </div>
          ))}
        </div>
        <div className="min-w-0 space-y-6">
          <ScoreCardSkeleton />
          <div className={cn('space-y-3 p-5 sm:p-6', CARD_FRAME)}>
            <SkeletonText size="base" width="w-40" />
            <SkeletonText size="sm" width="w-72" />
            <Skeleton className="h-11 w-44 rounded-control sm:h-9" />
          </div>
        </div>
      </div>
    </PageSkeleton>
  )
}
