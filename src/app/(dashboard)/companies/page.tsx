import Link from 'next/link'
import { Building2, Plus } from 'lucide-react'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { DeletedBanner } from './DeletedBanner'
import { PageHeader } from '@/components/ui/PageHeader'
import { Notice } from '@/components/ui/Notice'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { fullScorecardStatus } from '@/lib/status/assessment-status'
import { PROCUREMENT_LIST_COLUMNS, type StoredProcurement } from '@/lib/assessments/rows'
import { procurementScoreText } from '@/lib/procurement/scoreSummary'

export const metadata = { title: 'Companies' }

/**
 * Routes that need a company before they can render send the user here.
 * Landing silently made it look like the link was broken, so say why.
 */
const NOTICES: Record<string, string> = {
  'select-company-full-workbook': 'Choose a company first: the older workbook calculator opens from a company page, under More options.',
  'select-company-procurement': 'Choose a company first: a procurement scorecard always belongs to a company.',
}

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string; audit_failed?: string; notice?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { deleted, audit_failed, notice } = await searchParams

  const [{ data: companies, error }, { data: scorecards }, { data: procurement }] = await Promise.all([
    supabase.from('companies').select('id, name, industry, created_at').eq('owner_id', user.id).order('name'),
    supabase
      .from('scorecard_assessments')
      .select('id, company_id, updated_at, scope_mode, workbook_import_status, overall_result_snapshot, needs_recalculation, readiness_complete, final_level, companies!inner(owner_id)')
      .eq('companies.owner_id', user.id)
      .order('updated_at', { ascending: false }),
    supabase
      .from('procurement_assessments')
      .select(`${PROCUREMENT_LIST_COLUMNS}, companies!inner(owner_id)`)
      .eq('companies.owner_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  const list = companies ?? []
  const latestFull = new Map<string, Parameters<typeof fullScorecardStatus>[0]>()
  const counts = new Map<string, number>()
  for (const row of (scorecards ?? []) as Array<Parameters<typeof fullScorecardStatus>[0] & { company_id: string }>) {
    if (!latestFull.has(row.company_id)) latestFull.set(row.company_id, row)
    counts.set(row.company_id, (counts.get(row.company_id) ?? 0) + 1)
  }
  const latestProcurement = new Map<string, StoredProcurement>()
  for (const row of (procurement ?? []) as unknown as StoredProcurement[]) {
    if (!latestProcurement.has(row.company_id)) latestProcurement.set(row.company_id, row)
    counts.set(row.company_id, (counts.get(row.company_id) ?? 0) + 1)
  }

  return (
    <div className="space-y-6">
      {deleted === '1' ? <DeletedBanner auditFailed={audit_failed === '1'} /> : null}
      {notice && NOTICES[notice] ? <Notice tone="warn">{NOTICES[notice]}</Notice> : null}

      <PageHeader
        crumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Companies' }]}
        title="Companies"
        description="The clients you score. Open one to see all its scorecards."
        actions={
          <Link href="/companies/new" data-tour="companies-new" className={buttonStyles({ variant: 'primary' })}>
            <Plus className="h-4 w-4" aria-hidden /> Add a company
          </Link>
        }
      />

      {error ? (
        <Notice tone="bad" title="Your companies could not be loaded">
          Refresh the page to try again.
        </Notice>
      ) : list.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-6 w-6" aria-hidden />}
          title="No companies yet"
          action={
            <Link href="/companies/new" className={buttonStyles({ variant: 'primary' })}>
              Add a company
            </Link>
          }
        >
          Add the first client you want to score. Only its name is needed.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line rounded-card border border-line bg-surface" data-tour="scorecards companies-header">
          {list.map((company) => {
            const full = latestFull.get(company.id)
            const proc = latestProcurement.get(company.id)
            const count = counts.get(company.id) ?? 0
            return (
              <li key={company.id}>
                <Link
                  href={`/companies/${company.id}`}
                  className="flex flex-col gap-2 px-4 py-4 hover:bg-brand-soft sm:flex-row sm:items-center sm:justify-between sm:px-5"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <Building2 className="h-5 w-5 shrink-0 text-faint" aria-hidden />
                    <span className="min-w-0">
                      <span className="block truncate text-base font-semibold text-ink">{company.name}</span>
                      <span className="block text-sm text-muted">
                        {company.industry ? `${company.industry} · ` : ''}
                        {count === 0 ? 'No scorecards yet' : `${count} scorecard${count === 1 ? '' : 's'}`}
                      </span>
                    </span>
                  </span>
                  <span className="flex flex-wrap gap-2 pl-8 sm:pl-0">
                    {full ? (() => {
                      const s = fullScorecardStatus(full)
                      return <StatusBadge tone={s.tone}>Full: {s.label}</StatusBadge>
                    })() : null}
                    {proc !== undefined ? (
                      <StatusBadge tone="neutral">
                        Procurement:{' '}
                        {procurementScoreText({ results: proc.procurement_results, storedTotal: proc.total_score }, { bonus: false })}
                      </StatusBadge>
                    ) : null}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
