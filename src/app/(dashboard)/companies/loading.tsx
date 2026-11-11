import { HeaderSkeleton, PageSkeleton, TableCardSkeleton } from '@/components/ui/PageSkeletons'

/** /companies while it loads: header, then the table card (three rows, the usual count). */
export default function CompaniesLoading() {
  return (
    <PageSkeleton label="Loading your companies…">
      <HeaderSkeleton crumbs meta={false} description action />
      <TableCardSkeleton rows={3} columns={6} />
    </PageSkeleton>
  )
}
