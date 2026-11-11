import { CARD_FRAME } from '@/components/ui/Card'
import { LoadingRegion, Skeleton, SkeletonText } from '@/components/ui/Skeleton'
import { cn } from '@/components/ui/cn'
import { isClientWorkspaceEnabled } from '@/lib/demo/clientWorkspaceFlag'

/**
 * Home while it loads: the same blocks at the same sizes as the page, so
 * nothing moves when the data arrives. Invisible for the first 300ms.
 */
export default function DashboardLoading() {
  return (
    <LoadingRegion label="Loading your home page…" className="reap-delay-show space-y-8">
      {/* Title + "Updated {date}" */}
      <div className="space-y-1">
        <SkeletonText size="title" width="w-80" className="md:h-10" />
        <SkeletonText size="xs" width="w-40" className="h-[18px]" />
      </div>

      {/* Row 1: hero (8) + needs you (4) */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="flex flex-col rounded-card bg-brand p-6 lg:col-span-8">
          <Skeleton className="mt-3 h-3 w-72 rounded-full bg-on-teal-track reap-skeleton-on-teal" />
          <Skeleton className="mt-6 h-8 w-[80%] bg-on-teal-track reap-skeleton-on-teal" />
          <Skeleton className="mt-3 h-4 w-[55%] bg-on-teal-track reap-skeleton-on-teal" />
          <Skeleton className="mt-8 h-[72px] w-56 bg-on-teal-track reap-skeleton-on-teal" />
          <Skeleton className="mt-10 h-2 w-full rounded-full bg-on-teal-track reap-skeleton-on-teal" />
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-9 bg-on-teal-track reap-skeleton-on-teal" />
            ))}
          </div>
        </div>
        <div className={cn('p-6 lg:col-span-4', CARD_FRAME)}>
          <div className="flex h-9 items-center">
            <SkeletonText size="xs" width="w-32" />
          </div>
          <div className="-mx-6 mt-4 border-t border-line">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex h-[85px] items-center gap-3 border-b border-line px-6 py-3 last:h-[84px] last:border-b-0">
                <div className="flex-1 space-y-1.5">
                  <SkeletonText size="sm" width="w-[85%]" />
                  <SkeletonText size="xs" width="w-[50%]" />
                </div>
              </div>
            ))}
          </div>
          <Skeleton className="mt-4 h-10 w-full rounded-control" />
        </div>
      </div>

      {/* Row 2: five area tiles */}
      <div className="grid grid-cols-1 items-start gap-6 min-[360px]:grid-cols-2 lg:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className={cn('flex flex-col p-6', CARD_FRAME, i === 4 && 'min-[360px]:col-span-2 lg:col-span-1')}>
            <div className="min-h-9">
              <SkeletonText size="xs" width="w-28" />
            </div>
            <div className="mt-3 flex h-10 items-center">
              <Skeleton className="h-7 w-24" />
            </div>
            <Skeleton className="mt-4 h-1 w-full rounded-full" />
            {/* Most scorecards show an On track / Below minimum chip on at least one tile. */}
            {i === 0 ? <Skeleton className="mt-3 h-[22px] w-20 rounded-full" /> : null}
          </div>
        ))}
      </div>

      {/* Workspaces (demo only): one card, two 72px rows */}
      {isClientWorkspaceEnabled() ? (
        <div className={CARD_FRAME}>
          <div className="flex min-h-9 items-center px-6 pt-6">
            <SkeletonText size="xs" width="w-24" />
          </div>
          <div className="mt-4 border-t border-line">
            {[0, 1].map((i) => (
              <div key={i} className="flex h-[73px] items-center gap-4 border-b border-line px-6 last:h-[72px] last:border-b-0">
                <Skeleton className="h-10 w-[88px] rounded-control" />
                <div className="flex-1 space-y-1">
                  <SkeletonText size="sm" width="w-56" />
                  <SkeletonText size="xs" width="w-72" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Row 3: companies table */}
      <div className={CARD_FRAME}>
        <div className="flex min-h-9 items-center justify-between px-6 pt-6">
          <SkeletonText size="xs" width="w-32" />
          <Skeleton className="h-9 w-36 rounded-control" />
        </div>
        <div className="mt-4 h-10 border-y border-line bg-sunken" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex h-14 items-center gap-6 border-b border-line px-6 last:border-b-0">
            <SkeletonText size="sm" width="w-48" />
            <SkeletonText size="sm" width="w-12" className="hidden sm:block" />
            <Skeleton className="hidden h-[22px] w-32 rounded-full sm:block" />
            <SkeletonText size="sm" width="w-24" className="ml-auto" />
          </div>
        ))}
      </div>

      {/* Row 4: recent reports */}
      <div className={CARD_FRAME}>
        <div className="flex min-h-9 items-center justify-between px-6 pt-6">
          <SkeletonText size="xs" width="w-32" />
          <Skeleton className="h-9 w-32 rounded-control" />
        </div>
        <div className="mt-4 border-t border-line">
          {[0, 1].map((i) => (
            <div key={i} className="flex min-h-14 items-center gap-3 border-b border-line px-6 last:border-b-0">
              <div className="flex-1 space-y-1">
                <SkeletonText size="sm" width="w-44" />
                <SkeletonText size="xs" width="w-64" />
              </div>
              <Skeleton className="h-9 w-32 rounded-control" />
            </div>
          ))}
        </div>
      </div>
    </LoadingRegion>
  )
}
