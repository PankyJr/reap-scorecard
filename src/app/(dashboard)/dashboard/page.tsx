import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, Building2, Download, Plus, Upload } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { isAuthDevBypassEnabled } from '@/lib/auth/dev-bypass'
import { isClientWorkspaceEnabled } from '@/lib/demo/clientWorkspaceFlag'
import { isReapInternalAdmin } from '@/lib/admin/internal-admin'
import { createServiceRoleSupabase } from '@/lib/supabase/service-role'
import { DashboardWorkspaceSelector } from '@/components/dashboard/DashboardWorkspaceSelector'
import { DashboardDemoEnvironmentChip } from '@/components/dashboard/DashboardDemoEnvironmentChip'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel } from '@/components/ui/Panel'
import { Notice } from '@/components/ui/Notice'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { buttonStyles } from '@/components/ui/buttonStyles'
import {
  byRecent,
  FULL_SCORECARD_LIST_COLUMNS,
  fullScorecardToRow,
  PROCUREMENT_LIST_COLUMNS,
  procurementToRow,
  type AssessmentRow,
  type StoredFullScorecard,
  type StoredProcurement,
} from '@/lib/assessments/rows'
import { homeCompanyRow, type HomeCompanyRow } from '@/lib/assessments/home'
import { pickNextAction } from '@/lib/status/next-action'
import { userDisplayNameFromMetadata } from '@/lib/auth/user-display-name'
import { calculateGenericScorecard, type GenericScorecardCalculation } from '@/lib/scorecard/generic'
import { buildGenericInputs, type StoredAssessmentRow, type StoredContributionRow, type StoredElementRow } from '@/lib/scorecard/generic/persistence'

export const metadata = { title: 'Home' }

type PageProps = { searchParams: Promise<{ filter?: string }> }

function greeting(): string {
  const hour = Number(new Date().toLocaleString('en-ZA', { hour: 'numeric', hour12: false, timeZone: 'Africa/Johannesburg' }))
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

const shortDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

/**
 * Home: the one next step, the companies and where each stands, two quick
 * actions and the recent reports. Nothing else. A REAP administrator sees the
 * same layout across every client, with a "needs attention" filter.
 */
export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams
  const auth = await createClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  const isDevBypass = isAuthDevBypassEnabled()
  if (!user && !isDevBypass) redirect('/login')
  const ownerId = user?.id ?? '__dev_bypass__'
  const isAdmin = user ? await isReapInternalAdmin(user.id) : false
  // An administrator reads every client's companies; everyone else only their own (row policies apply).
  const db = isAdmin ? createServiceRoleSupabase() : auth
  const companiesQuery = db.from('companies').select('id, name, owner_id, annual_turnover, black_ownership_percentage, updated_at')
  const fullQuery = db.from('scorecard_assessments').select(`${FULL_SCORECARD_LIST_COLUMNS}, companies!inner(id, name, owner_id)`)
  const procurementQuery = db.from('procurement_assessments').select(`${PROCUREMENT_LIST_COLUMNS}, companies!inner(id, name, owner_id)`)
  const [companiesResult, fullResult, procurementResult] = await Promise.all([
    (isAdmin ? companiesQuery : companiesQuery.eq('owner_id', ownerId)).order('name'),
    (isAdmin ? fullQuery : fullQuery.eq('companies.owner_id', ownerId)).order('updated_at', { ascending: false }),
    (isAdmin ? procurementQuery : procurementQuery.eq('companies.owner_id', ownerId)).order('created_at', { ascending: false }),
  ])

  const loadFailed = Boolean(companiesResult.error || fullResult.error || procurementResult.error)
  const companies = (companiesResult.data ?? []) as Array<{
    id: string
    name: string
    owner_id: string | null
    annual_turnover: number | null
    black_ownership_percentage: number | null
    updated_at: string | null
  }>
  const fullStored = (fullResult.data ?? []) as unknown as StoredFullScorecard[]
  const procStored = (procurementResult.data ?? []) as unknown as Array<StoredProcurement & { company_id: string }>
  const allRows: AssessmentRow[] = [...fullStored.map((r) => fullScorecardToRow(r)), ...procStored.map((r) => procurementToRow(r))].sort(byRecent)
  const next = pickNextAction({ companies, rows: allRows })

  // The latest full scorecard per company, with the engine's preview, to count areas done.
  const latestFull = new Map<string, StoredFullScorecard>()
  for (const row of fullStored) if (!latestFull.has(row.company_id)) latestFull.set(row.company_id, row)
  const latestIds = [...latestFull.values()].map((row) => row.id)
  const previews = new Map<string, GenericScorecardCalculation>()
  if (latestIds.length > 0) {
    const [{ data: assessments }, { data: elements }, { data: contributions }] = await Promise.all([
      db.from('scorecard_assessments').select('*').in('id', latestIds),
      db.from('scorecard_assessment_elements').select('*').in('assessment_id', latestIds),
      db.from('scorecard_contribution_records').select('*').in('assessment_id', latestIds),
    ])
    for (const assessment of assessments ?? []) {
      try {
        const inputs = buildGenericInputs({
          assessment: assessment as unknown as StoredAssessmentRow,
          elements: ((elements ?? []) as unknown as Array<StoredElementRow & { assessment_id: string }>).filter((e) => e.assessment_id === assessment.id),
          contributions: ((contributions ?? []) as unknown as Array<StoredContributionRow & { assessment_id: string }>).filter((c) => c.assessment_id === assessment.id),
        })
        previews.set(assessment.id as string, calculateGenericScorecard(inputs))
      } catch {
        // A scorecard the engine cannot read yet simply shows no progress.
      }
    }
  }
  const latestProcurement = new Map<string, { id: string; created_at: string | null }>()
  for (const row of procStored) if (!latestProcurement.has(row.company_id)) latestProcurement.set(row.company_id, { id: row.id, created_at: row.created_at ?? null })

  const rows: HomeCompanyRow[] = companies.map((company) => {
    const full = latestFull.get(company.id)
    return homeCompanyRow({
      company,
      full: full
        ? {
            id: full.id,
            updated_at: full.updated_at,
            needs_recalculation: full.needs_recalculation ?? null,
            overall_result_snapshot: full.overall_result_snapshot,
            preview: previews.get(full.id) ?? null,
          }
        : null,
      procurement: latestProcurement.get(company.id) ?? null,
    })
  })
  const attentionCount = rows.filter((row) => row.needsAttention).length
  const showAttention = isAdmin && params.filter === 'attention'
  const visible = (showAttention ? rows.filter((row) => row.needsAttention) : rows).sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))

  // Recent reports: worked-out full scorecards and procurement scorecards, newest first.
  const reports = [
    ...fullStored
      .filter((row) => row.overall_result_snapshot)
      .map((row) => ({
        key: `f-${row.id}`,
        title: row.name,
        company: (Array.isArray(row.companies) ? row.companies[0] : row.companies)?.name ?? '',
        date: row.updated_at,
        pdf: `/api/scorecards/calculator/${row.id}/pdf`,
      })),
    ...procStored
      .filter((row) => row.total_score != null)
      .map((row) => ({
        key: `p-${row.id}`,
        title: `Procurement ${row.assessment_year ?? ''}`.trim(),
        company: (Array.isArray(row.companies) ? row.companies[0] : row.companies)?.name ?? '',
        date: row.created_at ?? null,
        pdf: `/api/procurement/assessments/${row.id}/pdf`,
      })),
  ]
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
    .slice(0, 5)

  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>
  const name = userDisplayNameFromMetadata(meta, user?.email)
  const firstName = name && !name.includes('@') ? name.split(/\s+/)[0] : null
  const showClientWorkspaceSelector = isClientWorkspaceEnabled()
  const showCompactDemoStatus = showClientWorkspaceSelector && (isDevBypass || process.env.NODE_ENV !== 'production')

  return (
    <div className="space-y-6" data-tour="dashboard dashboard-main">
      {isDevBypass ? (
        <Notice tone="warn" title="Local development only">
          Sign-in is switched off (NEXT_PUBLIC_DEV_BYPASS_AUTH). Turn it off to test real sign-in.
        </Notice>
      ) : null}

      <PageHeader
        title={`${greeting()}${firstName ? `, ${firstName}` : ''}`}
        description={isAdmin ? 'Every client’s companies and where each stands.' : 'Your companies and what to do next.'}
        actions={showCompactDemoStatus ? <DashboardDemoEnvironmentChip /> : null}
      />
      {loadFailed ? (
        <Notice tone="bad" title="Some of your work could not be loaded">
          Refresh the page. If it keeps happening, check your connection.
        </Notice>
      ) : null}

      <section aria-labelledby="next-heading" className="rounded-card border border-brand bg-brand p-5 text-brand-ink sm:p-6" data-tour="setup-checklist">
        <p className="text-sm text-brand-ink/80">Next step</p>
        <h2 id="next-heading" className="mt-0.5 text-xl font-semibold">{next.title}</h2>
        <p className="mt-1 text-[15px] text-brand-ink/90">{next.body}</p>
        <Link href={next.href} className={buttonStyles({ variant: 'secondary', className: 'mt-4' })}>
          {next.button} <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </section>

      {showClientWorkspaceSelector ? <DashboardWorkspaceSelector /> : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/companies/new" data-tour="checklist-create-company" className={buttonStyles({ variant: 'secondary' })}>
          <Plus className="h-4 w-4" aria-hidden /> Add a company
        </Link>
        <Link href="/start?type=full" className={buttonStyles({ variant: 'secondary' })}>
          <Upload className="h-4 w-4" aria-hidden /> Upload a workbook
        </Link>
      </div>

      <Panel
        title={isAdmin ? 'All companies' : 'Your companies'}
        actions={
          isAdmin ? (
            <nav aria-label="Filter companies" className="flex gap-2">
              <Link href="/dashboard" aria-current={!showAttention ? 'page' : undefined} className={buttonStyles({ variant: !showAttention ? 'primary' : 'ghost', size: 'sm' })}>
                All
              </Link>
              <Link href="/dashboard?filter=attention" aria-current={showAttention ? 'page' : undefined} className={buttonStyles({ variant: showAttention ? 'primary' : 'ghost', size: 'sm' })}>
                Needs attention ({attentionCount})
              </Link>
            </nav>
          ) : null
        }
        flush
      >
        {visible.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={<Building2 className="h-6 w-6" aria-hidden />}
              title={showAttention ? 'Nothing needs attention' : 'No companies yet'}
              action={
                showAttention ? null : (
                  <Link href="/companies/new" className={buttonStyles({ variant: 'primary' })}>
                    <Plus className="h-4 w-4" aria-hidden /> Add your first company
                  </Link>
                )
              }
            >
              {showAttention ? 'Every company’s latest scorecard is in order.' : 'Add a company to start its scorecard.'}
            </EmptyState>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {visible.map((row) => (
              <li key={row.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <Link href={`/companies/${row.id}`} className="text-base font-semibold text-ink hover:text-brand hover:underline">
                    {row.name}
                  </Link>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                    <StatusBadge tone={row.tone === 'info' ? 'brand' : row.tone}>{row.status}</StatusBadge>
                    {row.progress ? <span>{row.progress}</span> : null}
                    <span>{row.size ?? 'Size not given'}</span>
                    <span>Updated {shortDate(row.updatedAt)}</span>
                  </p>
                  {row.needsAttention && row.attentionReason ? <p className="text-sm text-warn">{row.attentionReason}</p> : null}
                </div>
                <Link href={row.action.href} className={buttonStyles({ variant: row.action.label === 'View result' ? 'secondary' : 'primary', className: 'shrink-0 self-start sm:self-center' })}>
                  {row.action.label}
                  <span className="sr-only"> for {row.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Recent reports" description="Download again in one click.">
        {reports.length === 0 ? (
          <p className="text-[15px] text-muted">Reports appear here once a scorecard is worked out.</p>
        ) : (
          <ul className="divide-y divide-line rounded-control border border-line">
            {reports.map((report) => (
              <li key={report.key} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="min-w-0">
                  <span className="block text-[15px] font-medium text-ink">{report.title}</span>
                  <span className="block text-sm text-muted">
                    {report.company} · {shortDate(report.date)}
                  </span>
                </span>
                <a href={report.pdf} className={buttonStyles({ variant: 'ghost', size: 'sm', className: 'self-start sm:self-center' })}>
                  <Download className="h-4 w-4" aria-hidden /> Download PDF
                  <span className="sr-only"> of {report.title}, {report.company}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
        <Link href="/dashboard/activity" data-tour="checklist-activity" className="mt-3 inline-block text-[15px] font-semibold text-brand hover:underline">
          See all activity
        </Link>
      </Panel>
    </div>
  )
}
