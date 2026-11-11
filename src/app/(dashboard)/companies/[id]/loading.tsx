import { FactCardSkeleton, HeaderSkeleton, MoreOptionsSkeleton, PageSkeleton, TableCardSkeleton } from '@/components/ui/PageSkeletons'

export default function CompanyDetailLoading() {
  return (
    <PageSkeleton label="Loading the company…">
      <HeaderSkeleton crumbs action />
      <TableCardSkeleton rows={2} columns={5} description />
      <FactCardSkeleton items={6} />
      <MoreOptionsSkeleton />
    </PageSkeleton>
  )
}
