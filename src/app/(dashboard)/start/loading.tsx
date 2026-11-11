import { CardSkeleton, HeaderSkeleton, PageSkeleton } from '@/components/ui/PageSkeletons'

/** Start while it loads: header, then the choice (two cards side by side from tablet up). */
export default function StartLoading() {
  return (
    <PageSkeleton label="Loading…" gap="space-y-6">
      <HeaderSkeleton crumbs meta={false} description />
      <div className="grid gap-4 md:grid-cols-2">
        <CardSkeleton lines={5} />
        <CardSkeleton lines={5} />
      </div>
    </PageSkeleton>
  )
}
