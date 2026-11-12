import { Skeleton, SkeletonText } from '@/components/ui/Skeleton'
import { HeaderSkeleton, PageSkeleton } from '@/components/ui/PageSkeletons'

/** Start while it loads: the centred 640px column — stepper, header, the company rows. */
export default function StartLoading() {
  return (
    <PageSkeleton label="Loading…">
      <div className="mx-auto max-w-[640px] space-y-8 pt-2">
        <div className="hidden h-[50px] items-start gap-3 sm:flex">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="mt-3 h-px flex-1" />
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
        <SkeletonText size="sm" width="w-48" className="sm:hidden" />
        <HeaderSkeleton meta={false} description />
        <div className="divide-y divide-divider border-y border-line">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex min-h-[60px] items-center gap-3 py-2">
              <Skeleton className="h-9 w-9 rounded-[10px]" />
              <div className="flex-1">
                <SkeletonText size="sm" width="w-56" />
                <SkeletonText size="xs" width="w-32" />
              </div>
              <Skeleton className="h-5 w-5 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </PageSkeleton>
  )
}
