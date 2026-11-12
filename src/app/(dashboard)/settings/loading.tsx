import { SkeletonText } from '@/components/ui/Skeleton'
import { LoadingRegion } from '@/components/ui/Skeleton'

/** A settings page while it loads. The header and the tabs stay on screen (the layout); the rows wait. */
export default function SettingsLoading() {
  return (
    <LoadingRegion label="Loading…" className="reap-delay-show border-t border-line pt-6">
      <SkeletonText size="base" width="w-24" />
      <SkeletonText size="xs" width="w-72" className="mb-5" />
      <div className="border-t border-line">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="grid gap-x-8 gap-y-3 border-b border-line py-5 md:grid-cols-[280px_minmax(0,1fr)]">
            <div>
              <SkeletonText size="sm" width="w-28" />
              <SkeletonText size="xs" width="w-48" />
            </div>
            <span className="reap-skeleton block h-11 max-w-[512px] rounded-control bg-track sm:h-10" aria-hidden />
          </div>
        ))}
      </div>
    </LoadingRegion>
  )
}
