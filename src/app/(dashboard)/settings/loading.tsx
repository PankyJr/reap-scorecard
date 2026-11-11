import { CardSkeleton } from '@/components/ui/PageSkeletons'
import { LoadingRegion } from '@/components/ui/Skeleton'

/** A settings page while it loads. The header and the settings menu stay on screen (the layout); only the panel waits. */
export default function SettingsLoading() {
  return (
    <LoadingRegion label="Loading…" className="reap-delay-show space-y-6">
      <CardSkeleton lines={6} />
    </LoadingRegion>
  )
}
