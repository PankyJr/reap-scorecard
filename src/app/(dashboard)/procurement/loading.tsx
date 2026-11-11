import { HeaderSkeleton, PageSkeleton, TableCardSkeleton } from '@/components/ui/PageSkeletons'

/** /procurement while it loads: header (three-line description), the table card. */
export default function ProcurementLoading() {
  return (
    <PageSkeleton label="Loading your procurement scorecards…">
      <HeaderSkeleton crumbs meta={false} description descriptionLines={3} action />
      <TableCardSkeleton rows={1} columns={6} />
    </PageSkeleton>
  )
}
