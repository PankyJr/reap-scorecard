import { HeaderSkeleton, MetricStripSkeleton, MoreOptionsSkeleton, PageSkeleton, SegmentedSkeleton, TableSkeleton } from '@/components/ui/PageSkeletons'

/** Company detail while it loads: header, the metrics strip, the tabs, the scorecards table. */
export default function CompanyDetailLoading() {
  return (
    <PageSkeleton label="Loading the company…">
      <HeaderSkeleton crumbs action />
      <MetricStripSkeleton count={4} />
      <div className="space-y-4 border-t border-line pt-6">
        <SegmentedSkeleton count={2} />
        <TableSkeleton rows={2} columns={5} />
      </div>
      <MoreOptionsSkeleton />
    </PageSkeleton>
  )
}
