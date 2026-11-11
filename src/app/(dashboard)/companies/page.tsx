import Link from 'next/link'
import { Building2, Plus } from 'lucide-react'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { DeletedBanner } from './DeletedBanner'
import { PageHeader } from '@/components/ui/PageHeader'
import { Notice } from '@/components/ui/Notice'
import { EmptyState } from '@/components/ui/EmptyState'
import { Card } from '@/components/ui/Card'
import { CompaniesTable, type CompanyTableRow } from '@/components/dashboard/CompaniesTable'
import { fullStatusChip, NOT_STARTED_CHIP, procurementCell } from '@/components/status/status-copy'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { fullScorecardStatus } from '@/lib/status/assessment-status'
import { PROCUREMENT_LIST_COLUMNS, type StoredProcurement } from '@/lib/assessments/rows'

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

  // Display only: the same status function and wording as Home (status-copy.ts).
  const tableRows: CompanyTableRow[] = list.map((company) => {
    const full = latestFull.get(company.id) as (Parameters<typeof fullScorecardStatus>[0] & { updated_at?: string | null; overall_result_snapshot?: unknown }) | undefined
    const proc = latestProcurement.get(company.id)
    const snapshot = full?.overall_result_snapshot as { rawTotalPoints?: number; totalBasePointsAvailable?: number } | null | undefined
    return {
      id: company.id,
      name: company.name,
      href: `/companies/${company.id}`,
      sub: company.industry ?? null,
      count: counts.get(company.id) ?? 0,
      status: full ? fullStatusChip(fullScorecardStatus(full)) : NOT_STARTED_CHIP,
      score: typeof snapshot?.rawTotalPoints === 'number' && typeof snapshot.totalBasePointsAvailable === 'number' ? { total: snapshot.rawTotalPoints, available: snapshot.totalBasePointsAvailable } : null,
      procurement: proc ? procurementCell({ results: proc.procurement_results, storedTotal: proc.total_score }) : null,
      updatedAt: [full?.updated_at ?? null, proc?.created_at ?? null, company.created_at].filter(Boolean).sort().at(-1) ?? null,
      attention: null,
    }
  })

  return (
    <div className="space-y-8">
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
          Refresh the page to try again. If it keeps happening, check your connection.
        </Notice>
      ) : list.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-[18px] w-[18px]" aria-hidden />}
          title="No companies yet"
          action={
            <Link href="/companies/new" className={buttonStyles({ variant: 'secondary' })}>
              <Plus aria-hidden /> Add a company
            </Link>
          }
        >
          Add the first client you want to score. Only its name is needed.
        </EmptyState>
      ) : (
        <Card label={`${list.length} ${list.length === 1 ? 'company' : 'companies'}`} flush data-tour="scorecards companies-header">
          <CompaniesTable rows={tableRows} columns={{ size: false, count: true }} rememberAs="companies" />
        </Card>
      )}
    </div>
  )
}
