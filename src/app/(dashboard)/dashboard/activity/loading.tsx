import { HeaderSkeleton, PageSkeleton } from '@/components/ui/PageSkeletons'
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton'

/** Activity while it loads: header, then a day label and timeline entries (32px icon, two lines, time on the right). */
export default function ActivityLoading() {
  return (
    <PageSkeleton label="Loading activity…">
      <HeaderSkeleton meta={false} description />
      <div className="border-t border-line pt-6">
        <div className="max-w-[760px]">
          <SkeletonText size="xs" width="w-16" className="mb-3 h-[18px]" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-3 pb-5">
              <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
              <div className="flex-1 pt-1.5">
                <SkeletonText size="sm" width="w-64" />
                <SkeletonText size="xs" width="w-40" />
              </div>
              <SkeletonText size="xs" width="w-16" className="mt-1.5" />
            </div>
          ))}
        </div>
      </div>
    </PageSkeleton>
  )
}
