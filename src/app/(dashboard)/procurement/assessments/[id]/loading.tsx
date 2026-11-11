import { CARD_FRAME } from '@/components/ui/Card'
import { CardSkeleton, HeaderSkeleton, PageSkeleton } from '@/components/ui/PageSkeletons'
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton'
import { cn } from '@/components/ui/cn'

/** The procurement score while it loads: header, the five steps, the score card, the indicator card. */
export default function ProcurementAssessmentLoading() {
  return (
    <PageSkeleton label="Loading the procurement score…" gap="space-y-6">
      <HeaderSkeleton crumbs meta={false} description action />
      <div className={cn('h-[58px]', CARD_FRAME)} />
      <div className={cn('h-[206px] space-y-4 p-6', CARD_FRAME)}>
        <SkeletonText size="xs" width="w-40" />
        <Skeleton className="h-10 w-56" />
        <SkeletonText size="sm" width="w-[60%]" />
      </div>
      <CardSkeleton lines={10} />
    </PageSkeleton>
  )
}
