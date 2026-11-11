import { CardSkeleton, HeaderSkeleton, PageSkeleton } from '@/components/ui/PageSkeletons'

/**
 * Any signed-in page with no loading screen of its own (and any section while
 * its layout loads): the usual header (breadcrumbs, title, one line) and a
 * card. Never a full-page spinner; invisible for the first 300ms.
 */
export default function Loading() {
  return (
    <PageSkeleton label="Loading…" gap="space-y-6">
      <HeaderSkeleton crumbs meta={false} description />
      <CardSkeleton lines={6} />
    </PageSkeleton>
  )
}
