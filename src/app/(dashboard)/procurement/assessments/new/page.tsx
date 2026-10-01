import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { NewProcurementAssessmentForm } from './NewProcurementAssessmentForm'
import { createProcurementAssessment } from './actions'
import { PageHeader } from '@/components/ui/PageHeader'
import { Notice } from '@/components/ui/Notice'
import { Term } from '@/components/ui/Term'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { safeReturnPath } from '@/lib/flows'

export const metadata = { title: 'New procurement scorecard' }

type PageProps = {
  searchParams: Promise<{ companyId?: string; error?: string; returnTo?: string }>
}

export default async function NewProcurementAssessmentPage({ searchParams }: PageProps) {
  const { companyId, error, returnTo: rawReturn } = await searchParams
  if (!companyId) {
    // Both journeys start on the same page, which asks for the company.
    redirect('/start?type=procurement')
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: company } = await supabase.from('companies').select('id, owner_id, name').eq('id', companyId).single()

  if (!company || company.owner_id !== user.id) {
    return (
      <div className="space-y-6">
        <PageHeader crumbs={[{ label: 'Start new', href: '/start' }, { label: 'Company not found' }]} title="Company not found" />
        <Notice
          tone="bad"
          title="That company is not in your account"
          action={
            <Link href="/start?type=procurement" className={buttonStyles({ variant: 'secondary' })}>
              Choose a company
            </Link>
          }
        >
          It may have been deleted, or the link is wrong.
        </Notice>
      </div>
    )
  }

  const returnTo = safeReturnPath(rawReturn)

  return (
    <div className="space-y-6" data-tour="scorecard-workspace">
      <PageHeader
        crumbs={[
          { label: 'Companies', href: '/companies' },
          { label: company.name, href: `/companies/${company.id}` },
          { label: 'New procurement scorecard' },
        ]}
        title="New procurement scorecard"
        description={
          <>
            For {company.name}. Scores how much of the company’s buying goes to <Term k="bbbee">B-BBEE</Term> suppliers, out
            of 29 points.
          </>
        }
      />
      {returnTo ? (
        <Notice tone="info">When you save, you go straight back to the full scorecard to attach this procurement scorecard.</Notice>
      ) : null}
      <form id="new-procurement-assessment-form" action={createProcurementAssessment}>
        <input type="hidden" name="company_id" value={company.id} />
        {returnTo ? <input type="hidden" name="return_to" value={returnTo} /> : null}
        <NewProcurementAssessmentForm formId="new-procurement-assessment-form" initialError={error} />
      </form>
    </div>
  )
}
