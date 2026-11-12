import { CARD_FRAME } from '@/components/ui/Card'
import { PageSkeleton } from '@/components/ui/PageSkeletons'
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton'
import { cn } from '@/components/ui/cn'

/** Live procurement while it loads: the Aberdare header, the three-step card, the upload panel. */
export default function AberdareLiveLoading() {
  return (
    <PageSkeleton label="Loading live procurement…">
      <div className="flex items-start gap-4">
        <Skeleton className="h-10 w-[88px] rounded-control" />
        <div className="space-y-1">
          <SkeletonText size="title" width="w-80" className="h-8" />
          <SkeletonText size="sm" width="w-64" />
        </div>
      </div>
      <div className="space-y-5 border-t border-line pt-6">
        <div className={cn('space-y-3 p-5 sm:p-6', CARD_FRAME)}>
          <SkeletonText size="sm" width="w-80" />
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-11 w-28 rounded-control" />
            ))}
          </div>
        </div>
        <div className={cn('space-y-4 p-6 sm:p-8', CARD_FRAME)}>
          <SkeletonText size="base" width="w-64" />
          <SkeletonText size="sm" width="w-[80%]" />
          <Skeleton className="h-48 w-full rounded-control" />
        </div>
      </div>
    </PageSkeleton>
  )
}
