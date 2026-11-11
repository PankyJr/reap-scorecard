import { HeaderSkeleton, MoreOptionsSkeleton, PageSkeleton, TableCardSkeleton } from '@/components/ui/PageSkeletons'

/** /scorecards while it loads: header, the table card, the "Older and specialist tools" bar. */
export default function ScorecardsLoading() {
  return (
    <PageSkeleton label="Loading your scorecards…">
      <HeaderSkeleton crumbs meta={false} description action />
      <TableCardSkeleton rows={2} columns={6} />
      <MoreOptionsSkeleton />
    </PageSkeleton>
  )
}
