import { CARD_FRAME } from '@/components/ui/Card'
import { CardSkeleton, HeaderSkeleton, PageSkeleton } from '@/components/ui/PageSkeletons'
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton'
import { cn } from '@/components/ui/cn'

/** Review while it loads: header (two-line description), the steps, then the main column and the level panel. */
export default function ReviewLoading() {
  return (
    <PageSkeleton label="Loading the review…" gap="space-y-6">
      <div className="space-y-4">
        <div className="space-y-3">
          <SkeletonText size="sm" width="w-72" />
          <div className="space-y-1">
            <SkeletonText size="title" width="w-80" className="md:h-10" />
            <div>
              <SkeletonText size="base" width="w-[40rem]" />
              <SkeletonText size="base" width="w-96" />
            </div>
          </div>
        </div>
        <div className={cn('h-[58px]', CARD_FRAME)} />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-6">
          <div className={cn('space-y-4 p-6', CARD_FRAME)}>
            <SkeletonText size="base" width="w-[90%]" />
            <Skeleton className="h-10 w-48 rounded-control" />
          </div>
          <CardSkeleton lines={8} />
        </div>
        <CardSkeleton lines={4} />
      </div>
    </PageSkeleton>
  )
}
