import { createCompany } from './actions'
import { NewCompanyForm } from './NewCompanyForm'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { safeReturnPath } from '@/lib/flows'
import { PageHelpData } from '@/components/help/PageHelpData'

export const metadata = { title: 'Add a company' }

export default async function NewCompanyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>
}) {
  const { error, next } = await searchParams
  const returnTo = safeReturnPath(next)

  return (
    <div className="space-y-6">
      <PageHelpData page="company-new" data={{ error: error ?? null, returning: Boolean(returnTo) }} />
      <PageHeader
        crumbs={[{ label: 'Companies', href: '/companies' }, { label: 'Add a company' }]}
        title="Add a company"
        description="Five details that decide how the company is measured. Contact details are optional."
      />
      <Card>
        <form id="new-company-form" action={createCompany} data-help="company-form">
          {returnTo ? <input type="hidden" name="next" value={returnTo} /> : null}
          <NewCompanyForm initialError={error} cancelHref={returnTo ?? '/companies'} />
        </form>
      </Card>
    </div>
  )
}
