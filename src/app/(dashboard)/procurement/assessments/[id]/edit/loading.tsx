import { CardSkeleton, HeaderSkeleton, PageSkeleton } from '@/components/ui/PageSkeletons'

/** Editing a procurement scorecard while it loads: header, then the form. */
export default function EditProcurementLoading() {
  return (
    <PageSkeleton label="Loading…" gap="space-y-6">
      <HeaderSkeleton crumbs meta={false} description descriptionLines={2} />
      <CardSkeleton lines={12} />
    </PageSkeleton>
  )
}
