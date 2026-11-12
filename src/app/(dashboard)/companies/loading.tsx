import { HeaderSkeleton, PageSkeleton, SegmentedSkeleton, TableSkeleton } from '@/components/ui/PageSkeletons'

/** /companies while it loads: header, the filter, then the table (three rows, the usual count). */
export default function CompaniesLoading() {
  return (
    <PageSkeleton label="Loading your companies…">
      <HeaderSkeleton meta={false} description action />
      <div className="space-y-4 border-t border-line pt-6">
        <SegmentedSkeleton count={4} />
        <TableSkeleton rows={3} columns={6} />
      </div>
    </PageSkeleton>
  )
}
