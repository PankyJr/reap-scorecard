import Link from 'next/link'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel, MoreOptions } from '@/components/ui/Panel'
import { Notice } from '@/components/ui/Notice'
import { ProgressSteps } from '@/components/ui/ProgressSteps'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { stepsFor } from '@/lib/flows'
import { createClient } from '@/utils/supabase/server'
import { suggestedScorecardYear } from '@/lib/company/prefill'
import { FullScorecardCalculatorNewForm } from './FullScorecardCalculatorNewForm'
import { ModularScorecardCalculatorNewForm } from './ModularScorecardCalculatorNewForm'

type PageProps = {
  searchParams: Promise<{ companyId?: string; error?: string; legacy?: string; mode?: string }>
}

export default async function NewScorecardCalculationPage({ searchParams }: PageProps) {
  const params = await searchParams

  if (params.legacy === '1') {
    const { default: LegacyPage } = await import('./LegacyScorecardNewPage')
    return <LegacyPage searchParams={Promise.resolve(params)} />
  }

  const { companyId, error } = params
  const modular = params.mode === 'modular'
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  if (!companyId) {
    // A company is chosen on the shared start page, so both journeys begin the
    // same way. Keep the selected-elements mode reachable for those who use it.
    redirect(modular ? '/start?type=full&mode=modular' : '/start?type=full')
  }

  const { data: company } = await supabase
    .from('companies')
    .select('id, name, owner_id, financial_year_end_month, annual_turnover')
    .eq('id', companyId)
    .maybeSingle()

  if (!company || company.owner_id !== user.id) {
    return (
      <div className="space-y-6">
        <PageHeader crumbs={[{ label: 'Start new', href: '/start' }, { label: 'Company not found' }]} title="Company not found" />
        <Notice tone="bad" title="That company is not in your account" action={<Link href="/start?type=full" className={buttonStyles({ variant: 'secondary' })}>Choose a company</Link>}>
          It may have been deleted, or the link is wrong.
        </Notice>
      </div>
    )
  }

  const year = suggestedScorecardYear(company.financial_year_end_month)
  const { data: previous } = await supabase
    .from('scorecard_assessments')
    .select('measurement_year')
    .eq('company_id', company.id)
    .order('measurement_year', { ascending: false })
    .limit(1)
    .maybeSingle()
  const prefillNote = previous
    ? `The company’s size and ownership are filled in from its ${previous.measurement_year} scorecard. You check them on the first step.`
    : company.annual_turnover != null
      ? 'The company’s turnover and ownership are filled in from its details. You check them on the first step.'
      : null

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[
          { label: 'Companies', href: '/companies' },
          { label: company.name, href: `/companies/${company.id}` },
          { label: modular ? 'Selected elements' : 'New full scorecard' },
        ]}
        title={modular ? 'Score selected elements' : 'New full B-BBEE scorecard'}
        description={
          modular
            ? 'Upload a separate register for one or more elements and calculate their points. This does not give a B-BBEE level.'
            : `For ${company.name}. It works out the B-BBEE level from all seven elements.`
        }
      />
      {!modular ? <ProgressSteps steps={stepsFor('full', 0)} label="Full scorecard steps" /> : null}

      {error ? (
        <Notice tone="bad" title="The scorecard was not created">
          {error}
        </Notice>
      ) : null}

      <Panel>
        {modular ? (
          <ModularScorecardCalculatorNewForm companyId={company.id} companyName={company.name} defaultYear={year} />
        ) : (
          <FullScorecardCalculatorNewForm companyId={company.id} companyName={company.name} defaultYear={year} prefillNote={prefillNote} />
        )}
      </Panel>

      <MoreOptions label="Other ways to score">
        <ul className="space-y-3 text-[15px]">
          {modular ? (
            <li>
              <Link href={`/scorecards/new?companyId=${company.id}`} className="font-semibold text-brand hover:underline">
                Full scorecard from the workbook
              </Link>
              <span className="block text-muted">The normal way: one workbook, all seven elements, a B-BBEE level.</span>
            </li>
          ) : (
            <li>
              <Link href={`/scorecards/new?companyId=${company.id}&mode=modular`} className="font-semibold text-brand hover:underline">
                Score selected elements only
              </Link>
              <span className="block text-muted">Upload separate registers for one or a few elements. No B-BBEE level.</span>
            </li>
          )}
          <li>
            <Link href="/scorecards/new?legacy=1" className="font-semibold text-brand hover:underline">
              Type in element points by hand (Legacy Manual Scorecards)
            </Link>
            <span className="block text-muted">For points already worked out elsewhere.</span>
          </li>
        </ul>
      </MoreOptions>
    </div>
  )
}
