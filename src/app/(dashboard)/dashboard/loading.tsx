import { LoadingRegion, Skeleton, SkeletonText } from '@/components/ui/Skeleton'

/**
 * Home while it loads: the same cards at the same sizes as the page, so
 * nothing moves when the data arrives (design rule 1). Invisible for the first
 * 300ms (rule 2).
 */
function CardFrame({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-card border border-line bg-surface p-5 shadow-card sm:p-6 ${className ?? ''}`}>{children}</div>
}

export default function DashboardLoading() {
  return (
    <LoadingRegion label="Loading your home page…" className="reap-delay-show space-y-6">
      {/* Title + "Updated X ago" */}
      <div className="space-y-1.5">
        <SkeletonText size="title" width="w-72" />
        <SkeletonText size="sm" width="w-36" />
      </div>

      {/* Row 1: score hero (2/3) + needs you (1/3) */}
      <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
        <CardFrame className="lg:col-span-2">
          <SkeletonText size="xs" width="w-64" />
          <SkeletonText size="title" width="w-[85%]" className="mt-4" />
          <SkeletonText size="base" width="w-[60%]" className="mt-2" />
          <div className="mt-6 flex items-end gap-3">
            <SkeletonText size="hero" width="w-48" />
            <Skeleton className="mb-1.5 h-5 w-20 rounded-full" />
          </div>
          <div className="mt-3 h-6" />
          <div className="flex items-center justify-between pt-5">
            <SkeletonText size="xs" width="w-28" />
            <Skeleton className="h-8 w-28 rounded-control" />
          </div>
        </CardFrame>
        <CardFrame>
          <SkeletonText size="xs" width="w-36" />
          <div className="mt-4 space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 rounded-control border border-line p-4">
                <div className="flex-1 space-y-1">
                  <SkeletonText size="sm" width="w-[80%]" />
                  <SkeletonText size="xs" width="w-[55%]" />
                </div>
                <Skeleton className="h-8 w-16 rounded-control" />
              </div>
            ))}
          </div>
          <Skeleton className="mt-4 h-11 w-full rounded-control" />
        </CardFrame>
      </div>

      {/* Row 2: points by area */}
      <CardFrame>
        <SkeletonText size="xs" width="w-48" />
        <SkeletonText size="title" width="w-56" className="mt-4" />
        <Skeleton className="mt-4 h-2.5 w-full rounded-full" />
        <div className="mt-5 space-y-0.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex min-h-11 items-center gap-3 sm:min-h-9">
              <Skeleton className="h-2 w-2 rounded-full" />
              <SkeletonText size="sm" width="w-48" className="flex-1" />
              <SkeletonText size="sm" width="w-20" />
            </div>
          ))}
        </div>
      </CardFrame>

      {/* Row 3: companies table */}
      <div className="rounded-card border border-line bg-surface shadow-card">
        <div className="flex items-center justify-between px-5 pt-5 sm:px-6 sm:pt-6">
          <SkeletonText size="xs" width="w-32" />
          <Skeleton className="h-8 w-32 rounded-control" />
        </div>
        <div className="mt-4 h-10 border-y border-line bg-sunken" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex h-14 items-center gap-6 border-b border-dashed border-line px-5 last:border-b-0 sm:px-6">
            <SkeletonText size="sm" width="w-48" />
            <SkeletonText size="sm" width="w-12" className="hidden sm:block" />
            <Skeleton className="hidden h-5 w-32 rounded-full sm:block" />
            <SkeletonText size="sm" width="w-24" className="ml-auto" />
          </div>
        ))}
      </div>

      {/* Row 4: recent reports */}
      <div className="rounded-card border border-line bg-surface shadow-card">
        <div className="px-5 pt-5 sm:px-6 sm:pt-6">
          <SkeletonText size="xs" width="w-32" />
        </div>
        <div className="mt-4 border-t border-line">
          {[0, 1].map((i) => (
            <div key={i} className="flex min-h-14 items-center gap-3 border-b border-dashed border-line px-5 sm:px-6">
              <div className="flex-1 space-y-1">
                <SkeletonText size="sm" width="w-44" />
                <SkeletonText size="xs" width="w-64" />
              </div>
              <Skeleton className="h-8 w-28 rounded-control" />
            </div>
          ))}
        </div>
      </div>
    </LoadingRegion>
  )
}
