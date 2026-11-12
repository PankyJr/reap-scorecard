import { Skeleton, SkeletonText, LoadingRegion } from '@/components/ui/Skeleton'

/** An auth page while it loads: the same centred 400px column as AuthShell — mark, title, line, two fields, the button. */
export function AuthSkeleton({ fields = 2 }: { fields?: number }) {
  return (
    <LoadingRegion label="Loading…" className="reap-delay-show flex min-h-screen w-full flex-col bg-surface px-4">
      <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-12">
        <div className="mb-8 flex justify-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <SkeletonText size="base" width="w-14" />
        </div>
        <div className="flex flex-col items-center">
          <SkeletonText size="title" width="w-32" className="h-8" />
          <SkeletonText size="sm" width="w-72" />
        </div>
        <div className="mt-6 space-y-4">
          {Array.from({ length: fields }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <SkeletonText size="sm" width="w-28" />
              <Skeleton className="h-11 w-full rounded-control sm:h-10" />
            </div>
          ))}
          <Skeleton className="h-11 w-full rounded-control sm:h-10" />
        </div>
      </div>
    </LoadingRegion>
  )
}

/** A legal page while it loads: top bar, the title column on the left, hairline sections on the right. */
export function LegalSkeleton() {
  return (
    <LoadingRegion label="Loading…" className="reap-delay-show min-h-screen bg-surface">
      <div className="border-b border-line">
        <div className="mx-auto flex h-[61px] max-w-6xl items-center justify-between px-6 sm:px-10">
          <SkeletonText size="base" width="w-20" />
          <Skeleton className="h-11 w-20 rounded-control sm:h-8" />
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-6 py-10 sm:px-10 sm:py-14 lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-16">
        <div className="mb-10 space-y-2">
          <Skeleton className="h-[22px] w-14 rounded-full" />
          <SkeletonText size="title" width="w-48" className="h-8" />
          <SkeletonText size="sm" width="w-56" />
        </div>
        <div className="divide-y divide-line border-y border-line">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2 py-6">
              <SkeletonText size="base" width="w-40" />
              <SkeletonText size="sm" width="w-[90%]" />
              <SkeletonText size="sm" width="w-[70%]" />
            </div>
          ))}
        </div>
      </div>
    </LoadingRegion>
  )
}
