import { CARD_FRAME } from '@/components/ui/Card'
import { LoadingRegion, Skeleton, SkeletonText } from '@/components/ui/Skeleton'
import { HeaderSkeleton, MetricStripSkeleton, TableSkeleton } from '@/components/ui/PageSkeletons'
import { cn } from '@/components/ui/cn'
import { isClientWorkspaceEnabled } from '@/lib/demo/clientWorkspaceFlag'

/**
 * Home while it loads, in the same frames as the page: the header; the white
 * score card (180px rings, the figures, the button) beside "Needs you"; the
 * five area tiles; the metrics strip; the companies table; then workspaces
 * and recent reports. Invisible for the first 300ms.
 */
export default function DashboardLoading() {
  return (
    <LoadingRegion label="Loading your home page…" className="reap-delay-show space-y-8">
      <HeaderSkeleton action />

      <div className="grid gap-4 lg:grid-cols-12">
        <div className={cn('flex flex-col gap-6 p-5 sm:flex-row sm:items-center sm:p-6 lg:col-span-8', CARD_FRAME)}>
          <div className="flex justify-center sm:block">
            <Skeleton className="h-[180px] w-[180px] rounded-full" />
          </div>
          <div className="flex-1 space-y-3">
            <SkeletonText size="xs" width="w-64" className="h-[18px]" />
            <SkeletonText size="hero" width="w-48" />
            <div className="flex gap-1.5">
              <Skeleton className="h-[22px] w-20 rounded-full" />
              <Skeleton className="h-[22px] w-24 rounded-full" />
            </div>
            <SkeletonText size="sm" width="w-80" />
            <Skeleton className="h-11 w-48 rounded-control sm:h-9" />
          </div>
        </div>
        <div className={cn('lg:col-span-4', CARD_FRAME)}>
          <div className="px-5 pt-5 sm:px-6">
            <SkeletonText size="base" width="w-28" className="h-9 py-1.5" />
          </div>
          <div className="mt-2 px-2 pb-2 sm:px-3 sm:pb-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex min-h-[60px] items-center gap-3 px-3 py-2.5">
                <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
                <div className="flex-1">
                  <SkeletonText size="sm" width="w-48" />
                  <SkeletonText size="xs" width="w-32" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={cn('flex h-[166px] flex-col p-5', CARD_FRAME, i === 4 && 'min-[360px]:col-span-2 lg:col-span-1')}>
            <div className="flex justify-between">
              <Skeleton className="h-10 w-10 rounded-full" />
              <SkeletonText size="xs" width="w-8" />
            </div>
            <SkeletonText size="sm" width="w-20" className="mt-4" />
            <SkeletonText size="base" width="w-24" className="mt-1" />
            <span className="flex-1" />
            <SkeletonText size="xs" width="w-28" />
          </div>
        ))}
      </div>

      <MetricStripSkeleton count={3} />

      <div className="border-t border-line pt-6 sm:pt-8">
        <div className="mb-4 flex min-h-9 items-center justify-between">
          <SkeletonText size="base" width="w-36" />
          <Skeleton className="h-11 w-32 rounded-control sm:h-9" />
        </div>
        <TableSkeleton rows={3} columns={6} />
      </div>

      <div className="grid grid-cols-1 gap-x-10 gap-y-8 border-t border-line pt-6 sm:pt-8 lg:grid-cols-2">
        {[isClientWorkspaceEnabled() ? 2 : 0, 3].map((rows, col) =>
          rows ? (
            <div key={col}>
              <SkeletonText size="base" width="w-32" className="mb-2 h-9 py-1.5" />
              {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex min-h-[60px] items-center gap-3 border-b border-divider py-2 last:border-b-0">
                  <Skeleton className="h-10 w-[88px] shrink-0 rounded-control" />
                  <div className="flex-1">
                    <SkeletonText size="sm" width="w-40" />
                    <SkeletonText size="xs" width="w-56" />
                  </div>
                </div>
              ))}
            </div>
          ) : null,
        )}
      </div>
    </LoadingRegion>
  )
}
