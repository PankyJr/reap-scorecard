import Link from 'next/link'
import { Building2, Plus } from 'lucide-react'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { DeletedBanner } from './DeletedBanner'
import { PageHeader } from '@/components/ui/PageHeader'
import { Notice } from '@/components/ui/Notice'
import { EmptyState } from '@/components/ui/EmptyState'
import { Segmented } from '@/components/ui/Segmented'
import { CompaniesTable, type CompanyTableRow } from '@/components/dashboard/CompaniesTable'
import { fullStatusChip, NOT_STARTED_CHIP, procurementCell } from '@/components/status/status-copy'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { fullScorecardStatus } from '@/lib/status/assessment-status'
import { PROCUREMENT_LIST_COLUMNS, type StoredProcurement } from '@/lib/assessments/rows'
import { liveScore, loadLivePreviews } from '@/lib/assessments/live-preview'
import { homeCompanyRow } from '@/lib/assessments/home'

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
  searchParams: Promise<{ deleted?: string; audit_failed?: string; notice?: string; status?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { deleted, audit_failed, notice, status: statusParam } = await searchParams

  const [{ data: companies, error }, { data: scorecards }, { data: procurement }] = await Promise.all([
    supabase.from('companies').select('id, name, industry, created_at, annual_turnover, black_ownership_percentage').eq('owner_id', user.id).order('name'),
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
  type Full = Parameters<typeof fullScorecardStatus>[0] & { id: string; company_id: string; updated_at?: string | null; overall_result_snapshot?: unknown }
  const latestFull = new Map<string, Full>()
  for (const row of (scorecards ?? []) as Full[]) if (!latestFull.has(row.company_id)) latestFull.set(row.company_id, row)
  const latestProcurement = new Map<string, StoredProcurement>()
  for (const row of (procurement ?? []) as unknown as StoredProcurement[]) if (!latestProcurement.has(row.company_id)) latestProcurement.set(row.company_id, row)
  // The live score, read exactly as Home reads it (approved exception).
  const previews = await loadLivePreviews(supabase, [...latestFull.values()].map((row) => row.id))

  // Display only: the same status function and wording as Home (status-copy.ts).
  const all = list.map((company) => {
    const full = latestFull.get(company.id)
    const proc = latestProcurement.get(company.id)
    const status = full ? fullScorecardStatus(full) : null
    const preview = full ? previews.get(full.id) ?? null : null
    const size = homeCompanyRow({
      company,
      full: full ? { id: full.id, updated_at: full.updated_at ?? null, needs_recalculation: full.needs_recalculation ?? null, overall_result_snapshot: full.overall_result_snapshot, preview } : null,
      procurement: null,
    }).size
    const row: CompanyTableRow = {
      id: company.id,
      name: company.name,
      href: `/companies/${company.id}`,
      sub: company.industry ?? null,
      size,
      status: status ? fullStatusChip(status) : NOT_STARTED_CHIP,
      score: full ? liveScore(preview, full.overall_result_snapshot) : null,
      procurement: proc ? procurementCell({ results: proc.procurement_results, storedTotal: proc.total_score }) : null,
      updatedAt: [full?.updated_at ?? null, proc?.created_at ?? null, company.created_at].filter(Boolean).sort().at(-1) ?? null,
      attention: null,
    }
    const bucket: Bucket = !status ? 'none' : status.finished ? 'finished' : full?.overall_result_snapshot != null ? 'not-final' : 'in-progress'
    return { row, bucket }
  })
  const filter: Bucket | 'all' = FILTERS.some((f) => f.value === statusParam) ? (statusParam as Bucket) : 'all'
  const shown = filter === 'all' ? all : all.filter((item) => item.bucket === filter)
  const countOf = (value: string) => (value === 'all' ? all.length : all.filter((item) => item.bucket === value).length)

  return (
    <div className="space-y-6">
      {deleted === '1' ? <DeletedBanner auditFailed={audit_failed === '1'} /> : null}
      {notice && NOTICES[notice] ? <Notice tone="warn">{NOTICES[notice]}</Notice> : null}

      <PageHeader
        title="Companies"
        icon={Building2}
        description="The clients you score. Open one to see all its scorecards."
        actions={
          <Link href="/companies/new" data-tour="companies-new" className={buttonStyles({ variant: 'primary' })}>
            <Plus aria-hidden /> Add company
          </Link>
        }
      />

      {error ? (
        <Notice tone="bad" title="Your companies could not be loaded">
          Refresh the page to try again. If it keeps happening, check your connection.
        </Notice>
      ) : list.length === 0 ? (
        <div className="border-t border-line">
          <EmptyState
            icon={<Building2 aria-hidden />}
            title="No companies yet"
            action={
              <Link href="/companies/new" className={buttonStyles({ variant: 'primary' })}>
                <Plus aria-hidden /> Add company
              </Link>
            }
          >
            Add the first client you want to score. Only its name is needed.
          </EmptyState>
        </div>
      ) : (
        <section className="space-y-4 border-t border-line pt-6" data-tour="scorecards companies-header" aria-label="Your companies">
          <Segmented
            label="Show companies"
            value={filter}
            options={FILTERS.map((f) => ({ value: f.value, label: f.label, count: countOf(f.value), href: f.value === 'all' ? '/companies' : `/companies?status=${f.value}` }))}
          />
          {shown.length === 0 ? (
            <EmptyState icon={<Building2 aria-hidden />} title="No companies here">
              None of your companies match this filter.
            </EmptyState>
          ) : (
            <CompaniesTable rows={shown.map((item) => item.row)} columns={{ size: true, count: false }} rememberAs="companies" />
          )}
        </section>
      )}
    </div>
  )
}

type Bucket = 'in-progress' | 'not-final' | 'finished' | 'none'
const FILTERS: Array<{ value: Bucket | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'not-final', label: 'Not final' },
  { value: 'finished', label: 'Finished' },
]
