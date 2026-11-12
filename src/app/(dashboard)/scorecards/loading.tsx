import { HeaderSkeleton, MoreOptionsSkeleton, PageSkeleton, SegmentedSkeleton, TableSkeleton } from '@/components/ui/PageSkeletons'

/** /scorecards while it loads: header, the filter, the table, the "Older and specialist tools" row. */
export default function ScorecardsLoading() {
  return (
    <PageSkeleton label="Loading your scorecards…">
      <HeaderSkeleton meta={false} description action />
      <div className="space-y-4 border-t border-line pt-6">
        <SegmentedSkeleton count={4} />
        <TableSkeleton rows={2} columns={6} />
      </div>
      <MoreOptionsSkeleton />
    </PageSkeleton>
  )
}
