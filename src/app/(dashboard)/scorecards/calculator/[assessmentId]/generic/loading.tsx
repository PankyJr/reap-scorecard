import { CARD_FRAME } from '@/components/ui/Card'
import { HeaderSkeleton, PageSkeleton } from '@/components/ui/PageSkeletons'
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton'
import { cn } from '@/components/ui/cn'

/**
 * A full-scorecard page while it loads: the header and the five steps, the
 * area checklist on the left, the compact score hero and the area card on
 * the right. The same frames as the page, at the same sizes.
 */
export default function GenericScorecardLoading() {
  return (
    <PageSkeleton label="Loading the scorecard…" gap="space-y-6">
        <div className="space-y-4">
          <HeaderSkeleton crumbs meta={false} description />
          <div className={cn('h-[58px]', CARD_FRAME)} />
        </div>
        <div className="lg:grid lg:grid-cols-[19rem_minmax(0,1fr)] lg:items-start lg:gap-6">
          <div className={cn('hidden space-y-4 p-5 lg:block', CARD_FRAME)}>
            {Array.from({ length: 9 }).map((_, i) => (
              <SkeletonText key={i} size="sm" width={i % 3 === 0 ? 'w-40' : 'w-56'} />
            ))}
          </div>
          <div className="min-w-0 space-y-6">
            <Skeleton className="h-[200px] rounded-card bg-brand" />
            <div className={cn('space-y-4 p-6', CARD_FRAME)}>
              <SkeletonText size="title" width="w-64" />
              <Skeleton className="h-12 w-full rounded-control" />
              <SkeletonText size="sm" width="w-48" />
              <SkeletonText size="sm" width="w-80" />
            </div>
          </div>
        </div>
    </PageSkeleton>
  )
}
