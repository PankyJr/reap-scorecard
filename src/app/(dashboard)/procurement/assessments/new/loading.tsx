import { CARD_FRAME } from '@/components/ui/Card'
import { CardSkeleton, HeaderSkeleton, PageSkeleton } from '@/components/ui/PageSkeletons'
import { cn } from '@/components/ui/cn'

/** A new procurement scorecard while it loads: header, the steps, the first form card. */
export default function NewProcurementLoading() {
  return (
    <PageSkeleton label="Loading…" gap="space-y-6">
      <HeaderSkeleton crumbs meta={false} description descriptionLines={3} />
      <div className={cn('h-[100px]', CARD_FRAME)} />
      <CardSkeleton lines={8} />
    </PageSkeleton>
  )
}
