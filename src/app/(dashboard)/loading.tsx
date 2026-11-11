import { LoadingRegion, Skeleton, SkeletonText } from '@/components/ui/Skeleton'

/**
 * Any signed-in page that has no loading screen of its own: the page title and
 * two cards, at their real sizes. Invisible for the first 300ms (rule 2), and
 * never a full-page spinner (rule 1).
 */
export default function Loading() {
  return (
    <LoadingRegion label="Loading…" className="reap-delay-show space-y-6">
      <div className="space-y-2">
        <SkeletonText size="title" width="w-72" />
        <SkeletonText size="sm" width="w-40" />
      </div>
      <Skeleton className="h-56 rounded-card" />
      <Skeleton className="h-72 rounded-card" />
    </LoadingRegion>
  )
}
