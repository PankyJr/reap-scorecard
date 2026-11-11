import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, Download, FileBarChart2, Plus } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { isAuthDevBypassEnabled } from '@/lib/auth/dev-bypass'
import { isClientWorkspaceEnabled } from '@/lib/demo/clientWorkspaceFlag'
import { isReapInternalAdmin } from '@/lib/admin/internal-admin'
import { createServiceRoleSupabase } from '@/lib/supabase/service-role'
import { DashboardWorkspaceSelector } from '@/components/dashboard/DashboardWorkspaceSelector'
import { DashboardDemoEnvironmentChip } from '@/components/dashboard/DashboardDemoEnvironmentChip'
import { NeedsYouCard, type NeedItem } from '@/components/dashboard/NeedsYouCard'
import { CompaniesTable, type CompanyTableRow } from '@/components/dashboard/CompaniesTable'
import { ScoreHero } from '@/components/scorecard/ScoreHero'
import { ElementBar } from '@/components/scorecard/ElementBar'
import { buildScorecardView } from '@/components/scorecard/scorecard-view'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardLabel } from '@/components/ui/Card'
import { Notice } from '@/components/ui/Notice'
import { EmptyState } from '@/components/ui/EmptyState'
import { chipToneFor } from '@/components/ui/Chip'
import { RelativeTime } from '@/components/ui/RelativeTime'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { formatDate } from '@/components/ui/format'
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
import { fullScorecardStatus } from '@/lib/status/assessment-status'
import { procurementScoreText } from '@/lib/procurement/scoreSummary'
import { reasonLink } from '@/lib/scorecard/generic/ux/reason-links'
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

/**
 * Home (Keel layout): the score of the latest full scorecard and what needs
 * you, the points by area, the companies, the recent reports. A REAP
 * administrator sees the same layout across every client, with a "needs
 * attention" filter on the companies.
 *
 * UI only: the reads above are unchanged. Everything below arranges data this
 * page already loaded.
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
  const latestProcurementRow = new Map<string, StoredProcurement & { company_id: string }>()
  for (const row of procStored) {
    if (!latestProcurement.has(row.company_id)) latestProcurement.set(row.company_id, { id: row.id, created_at: row.created_at ?? null })
    if (!latestProcurementRow.has(row.company_id)) latestProcurementRow.set(row.company_id, row)
  }

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

  // --- Display only from here: no reads, no calculation. ---

  // The score hero shows the most recently changed full scorecard the engine can read.
  const heroRow = fullStored.find((row) => previews.has(row.id)) ?? null
  const heroPreview = heroRow ? previews.get(heroRow.id)! : null
  const heroView = heroPreview ? buildScorecardView(heroPreview) : null
  const heroCompany = heroRow ? (Array.isArray(heroRow.companies) ? heroRow.companies[0] : heroRow.companies)?.name ?? '' : ''
  const heroStored = heroRow?.overall_result_snapshot as GenericScorecardCalculation | null | undefined
  const heroStatus = heroRow ? fullScorecardStatus(heroRow) : null
  const heroBase = heroRow ? `/scorecards/calculator/${heroRow.id}/generic` : ''

  // NEEDS YOU: the next step, then companies needing attention, then what the
  // engine says still stops the hero scorecard from having a final level.
  const needs: NeedItem[] = []
  const seen = new Set<string>()
  const addNeed = (item: NeedItem) => {
    if (seen.has(item.href)) return
    seen.add(item.href)
    needs.push(item)
  }
  if (next.title !== 'Everything is up to date') {
    addNeed({ key: 'next', title: withoutRepeatedName(next.title), sub: next.body, href: next.href })
  }
  for (const row of rows.filter((r) => r.needsAttention && r.attentionReason)) {
    addNeed({ key: `attention-${row.id}`, title: row.attentionReason!, sub: row.name, href: row.action.href })
  }
  if (heroRow && heroPreview && !heroPreview.readiness.complete) {
    for (const reason of heroPreview.readiness.reasons) {
      const link = reasonLink(heroRow.id, reason)
      addNeed({ key: `reason-${reason}`, title: reason, sub: [heroCompany, link?.label].filter(Boolean).join(' · '), href: link?.href ?? heroBase })
    }
  }

  // YOUR COMPANIES: the same status chips, from the same function, as /companies.
  const tableRows: CompanyTableRow[] = visible.map((row) => {
    const full = latestFull.get(row.id)
    const proc = latestProcurementRow.get(row.id)
    const chips: CompanyTableRow['chips'] = []
    if (full) {
      const status = fullScorecardStatus(full)
      chips.push({ label: `Full: ${status.label}`, tone: chipToneFor(status.tone) })
    }
    if (proc) {
      chips.push({
        label: `Procurement: ${procurementScoreText({ results: proc.procurement_results, storedTotal: proc.total_score }, { bonus: false })}`,
        tone: 'neutral',
      })
    }
    if (chips.length === 0) chips.push({ label: 'No scorecards yet', tone: 'neutral' })
    const preview = full ? previews.get(full.id) : undefined
    const scored = preview ?? (full?.overall_result_snapshot as GenericScorecardCalculation | null | undefined) ?? null
    return {
      id: row.id,
      name: row.name,
      href: `/companies/${row.id}`,
      size: row.size,
      chips,
      score: scored ? { total: scored.rawTotalPoints, available: scored.totalBasePointsAvailable, final: Boolean(scored.readiness?.complete) } : null,
      updatedAt: row.updatedAt,
      attention: isAdmin && row.needsAttention ? row.attentionReason : null,
    }
  })

  const lastChange = [...rows.map((r) => r.updatedAt), ...reports.map((r) => r.date)].filter((d): d is string => Boolean(d)).sort().at(-1) ?? null

  return (
    <div className="space-y-6" data-tour="dashboard dashboard-main">
      {isDevBypass ? (
        <Notice tone="warn" title="Local development only">
          Sign-in is switched off (NEXT_PUBLIC_DEV_BYPASS_AUTH). Turn it off to test real sign-in.
        </Notice>
      ) : null}

      <PageHeader
        title={`${greeting()}${firstName ? `, ${firstName}` : ''}`}
        meta={lastChange ? <RelativeTime value={lastChange} className="text-sm text-label" /> : isAdmin ? 'Every client’s companies and where each stands.' : 'Your companies and what to do next.'}
        actions={showCompactDemoStatus ? <DashboardDemoEnvironmentChip /> : null}
      />
      {loadFailed ? (
        <Notice tone="bad" title="Some of your work could not be loaded">
          Refresh the page. If it keeps happening, check your connection.
        </Notice>
      ) : null}

      {/* Row 1: the score (2/3) and what needs you (1/3). */}
      <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
        <Card className="lg:col-span-2" bodyClassName="h-full">
          {heroRow && heroView ? (
            <ScoreHero
              className="h-full"
              view={heroView}
              company={heroCompany}
              year={heroRow.measurement_year}
              updatedAt={heroRow.updated_at}
              previousTotal={heroStored?.rawTotalPoints ?? null}
              countKey={`hero-${heroRow.id}`}
              action={
                heroStatus ? (
                  <Link href={heroStatus.href} className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
                    {heroStatus.next} <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                ) : null
              }
            />
          ) : (
            <div className="flex h-full flex-col">
              <CardLabel as="h2">B-BBEE score</CardLabel>
              <p className="mt-4 font-serif text-title font-semibold text-ink">No full scorecard yet.</p>
              <p className="mt-2 max-w-[52ch] text-base text-label">Upload a client’s workbook and the score and level appear here.</p>
              <div className="mt-6">
                <Link href="/start?type=full" className={buttonStyles({ variant: 'secondary' })}>
                  <FileBarChart2 className="h-4 w-4" aria-hidden /> Start a full scorecard
                </Link>
              </div>
            </div>
          )}
        </Card>
        <NeedsYouCard items={needs} />
      </div>

      {/* Row 2: points by area, full width. */}
      {heroRow && heroView ? (
        <Card label={`Points by area · ${heroCompany}`} updated={heroRow.updated_at}>
          <ElementBar view={heroView} hrefBase={heroBase} />
        </Card>
      ) : null}

      {showClientWorkspaceSelector ? <DashboardWorkspaceSelector /> : null}

      {/* Row 3: the companies. */}
      <Card
        label={isAdmin ? 'All companies' : 'Your companies'}
        updated={rows.map((r) => r.updatedAt).filter((d): d is string => Boolean(d)).sort().at(-1) ?? null}
        flush
        actions={
          <>
            {isAdmin ? (
              <nav aria-label="Filter companies" className="flex gap-1">
                <Link href="/dashboard" aria-current={!showAttention ? 'page' : undefined} className={buttonStyles({ variant: 'ghost', size: 'sm', className: !showAttention ? 'bg-brand-soft' : '' })}>
                  All
                </Link>
                <Link href="/dashboard?filter=attention" aria-current={showAttention ? 'page' : undefined} className={buttonStyles({ variant: 'ghost', size: 'sm', className: showAttention ? 'bg-brand-soft' : '' })}>
                  Needs attention ({attentionCount})
                </Link>
              </nav>
            ) : null}
            <Link href="/companies/new" data-tour="checklist-create-company" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
              <Plus className="h-4 w-4" aria-hidden /> Add a company
            </Link>
          </>
        }
      >
        {tableRows.length === 0 ? (
          <div className="px-5 pb-5 sm:px-6 sm:pb-6">
            <EmptyState
              title={showAttention ? 'Nothing needs attention' : 'No companies yet'}
              action={
                showAttention ? null : (
                  <Link href="/companies/new" className={buttonStyles({ variant: 'secondary' })}>
                    <Plus className="h-4 w-4" aria-hidden /> Add your first company
                  </Link>
                )
              }
            >
              {showAttention ? 'Every company’s latest scorecard is in order.' : 'Add a company to start its scorecard.'}
            </EmptyState>
          </div>
        ) : (
          <div className="pb-2">
            <CompaniesTable rows={tableRows} />
          </div>
        )}
      </Card>

      {/* Row 4: recent reports. */}
      <Card label="Recent reports" updated={reports[0]?.date ?? null} flush>
        {reports.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-label sm:px-6 sm:pb-6">Reports appear here once a scorecard is calculated.</p>
        ) : (
          <ul className="border-t border-line">
            {reports.map((report) => (
              <li key={report.key} className="flex min-h-14 items-center gap-3 border-b border-dashed border-line px-5 py-2 last:border-b-0 sm:px-6">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink" title={report.title}>
                    {report.title}
                  </span>
                  <span className="block truncate text-xs text-label" title={report.company}>
                    {report.company} · {formatDate(report.date)}
                  </span>
                </span>
                <a href={report.pdf} className={buttonStyles({ variant: 'ghost', size: 'sm', className: 'shrink-0' })}>
                  <Download className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">Download PDF</span>
                  <span className="sr-only sm:hidden">Download PDF</span>
                  <span className="sr-only"> of {report.title}, {report.company}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
        <div className="border-t border-line px-5 py-3 sm:px-6">
          <Link href="/dashboard/activity" data-tour="checklist-activity" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand hover:underline sm:min-h-0">
            See all activity <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </Card>
    </div>
  )
}

/**
 * "Halfway Logistics FY2026 scorecard for Halfway Logistics" -> drop the
 * repeated company. Display only: the next-step title is built elsewhere
 * from the scorecard's name and its company's name.
 */
function withoutRepeatedName(title: string): string {
  const at = title.lastIndexOf(' for ')
  if (at < 0) return title
  const what = title.slice(0, at)
  const who = title.slice(at + 5).trim()
  const core = who.replace(/\s*\((pty|proprietary)\)\s*(ltd|limited)?\.?$/i, '').trim()
  return core && what.toLowerCase().includes(core.toLowerCase()) ? what : title
}
