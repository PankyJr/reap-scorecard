import { HeaderSkeleton, PageSkeleton, TableSkeleton } from '@/components/ui/PageSkeletons'

/** /procurement while it loads: header (two-line description), the table. */
export default function ProcurementLoading() {
  return (
    <PageSkeleton label="Loading your procurement scorecards…">
      <HeaderSkeleton meta={false} description descriptionLines={2} action />
      <div className="border-t border-line pt-6">
        <TableSkeleton rows={1} columns={6} />
      </div>
    </PageSkeleton>
  )
}
