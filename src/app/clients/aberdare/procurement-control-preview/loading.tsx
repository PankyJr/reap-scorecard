import { CARD_FRAME } from '@/components/ui/Card'
import { PageSkeleton } from '@/components/ui/PageSkeletons'
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton'
import { cn } from '@/components/ui/cn'

/** The Aberdare workspace while it loads: logo and title, then the two option cards and the three steps. */
export default function AberdareLoading() {
  return (
    <PageSkeleton label="Loading the Aberdare workspace…">
      <div className="flex items-start gap-4">
        <Skeleton className="h-10 w-[88px] rounded-control" />
        <div className="space-y-1">
          <SkeletonText size="title" width="w-80" className="h-8" />
          <SkeletonText size="sm" width="w-32" />
        </div>
      </div>
      <div className="border-t border-line pt-6">
        <SkeletonText size="base" width="w-72" />
        <SkeletonText size="xs" width="w-96" />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className={cn('space-y-3 p-5 sm:p-6', CARD_FRAME)}>
              <Skeleton className="h-10 w-10 rounded-control" />
              <SkeletonText size="base" width="w-48" />
              <SkeletonText size="sm" width="w-[90%]" />
              <SkeletonText size="xs" width="w-56" />
              <SkeletonText size="xs" width="w-56" />
              <Skeleton className="h-11 w-48 rounded-control sm:h-9" />
            </div>
          ))}
        </div>
      </div>
    </PageSkeleton>
  )
}
