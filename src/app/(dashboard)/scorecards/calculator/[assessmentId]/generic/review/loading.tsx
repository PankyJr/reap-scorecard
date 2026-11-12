import { HeaderSkeleton, PageSkeleton, ScoreCardSkeleton, StepperSkeleton } from '@/components/ui/PageSkeletons'
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton'

/** Review while it loads: header, the steps, progress and Calculate, the still-needed rows; the score card and level scale beside. */
export default function ReviewLoading() {
  return (
    <PageSkeleton label="Loading the review…">
      <div className="space-y-6">
        <HeaderSkeleton crumbs meta={false} description descriptionLines={2} />
        <StepperSkeleton />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <div className="space-y-4">
            <SkeletonText size="xs" width="w-full" className="h-[18px]" />
            <Skeleton className="h-1.5 w-full rounded-full" />
            <SkeletonText size="sm" width="w-[80%]" />
            <Skeleton className="h-11 w-44 rounded-control sm:h-9" />
          </div>
          <div className="border-t border-line pt-6">
            <SkeletonText size="base" width="w-56" />
            <div className="mt-4 divide-y divide-divider border-y border-line">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex min-h-[60px] items-center gap-3 py-2.5">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <div className="flex-1">
                    <SkeletonText size="sm" width="w-64" />
                    <SkeletonText size="xs" width="w-40" />
                  </div>
                  <Skeleton className="h-8 w-20 rounded-control" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <ScoreCardSkeleton stacked />
          <Skeleton className="h-8 w-full rounded-control" />
        </div>
      </div>
    </PageSkeleton>
  )
}
