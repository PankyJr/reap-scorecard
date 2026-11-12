import { FormCardSkeleton, HeaderSkeleton, PageSkeleton } from '@/components/ui/PageSkeletons'

/** The company form while it loads: header, then the form card (label and field pairs, two columns). */
export default function CompanyFormLoading() {
  return (
    <PageSkeleton label="Loading the form…">
      <HeaderSkeleton crumbs meta={false} description />
      <FormCardSkeleton fields={6} />
    </PageSkeleton>
  )
}
