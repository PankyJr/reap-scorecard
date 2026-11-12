import { HeaderSkeleton, MetricStripSkeleton, PageSkeleton, StepperSkeleton } from '@/components/ui/PageSkeletons'
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton'

/** The procurement score while it loads: header, the five steps, the metrics strip, the indicator rows. */
export default function ProcurementAssessmentLoading() {
  return (
    <PageSkeleton label="Loading the procurement score…">
      <HeaderSkeleton crumbs meta={false} description action />
      <StepperSkeleton />
      <div className="space-y-4">
        <MetricStripSkeleton count={3} />
        <SkeletonText size="sm" width="w-[60%]" />
      </div>
      <div className="border-t border-line pt-6">
        <SkeletonText size="base" width="w-56" />
        <SkeletonText size="xs" width="w-80" />
        <div className="mt-4 divide-y divide-divider border-y border-line">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2 py-4">
              <div className="flex justify-between">
                <SkeletonText size="sm" width="w-56" />
                <SkeletonText size="sm" width="w-16" />
              </div>
              <SkeletonText size="xs" width="w-40" />
              <Skeleton className="mt-1 h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </PageSkeleton>
  )
}
