import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Building2, Download, FileBarChart2, FileText, Home as HomeIcon, Plus } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { isAuthDevBypassEnabled } from '@/lib/auth/dev-bypass'
import { isClientWorkspaceEnabled } from '@/lib/demo/clientWorkspaceFlag'
import { isReapInternalAdmin } from '@/lib/admin/internal-admin'
import { createServiceRoleSupabase } from '@/lib/supabase/service-role'
import { DashboardWorkspaceSelector } from '@/components/dashboard/DashboardWorkspaceSelector'
import { DashboardDemoEnvironmentChip } from '@/components/dashboard/DashboardDemoEnvironmentChip'
import { NeedsYouCard, type NeedItem } from '@/components/dashboard/NeedsYouCard'
import { attentionCopy, nextStepCopy, reasonCopy } from '@/components/dashboard/needs-copy'
import { fullStatusChip, NOT_STARTED_CHIP, procurementCell } from '@/components/status/status-copy'
import { CompaniesTable, type CompanyTableRow } from '@/components/dashboard/CompaniesTable'
import { ScoreCard } from '@/components/scorecard/ScoreCard'
import { AreaTiles } from '@/components/scorecard/AreaTiles'
import { buildScorecardView } from '@/components/scorecard/scorecard-view'
import { PageHeader } from '@/components/ui/PageHeader'
import { CARD_FRAME, SectionTitle } from '@/components/ui/Card'
import { Section } from '@/components/ui/Section'
import { Metric, MetricStrip } from '@/components/ui/Metric'
import { Segmented } from '@/components/ui/Segmented'
import { Callout } from '@/components/ui/Callout'
import { Reveal } from '@/components/ui/Reveal'
import { EmptyState } from '@/components/ui/EmptyState'
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
import { reasonLink } from '@/lib/scorecard/generic/ux/reason-links'
import { userDisplayNameFromMetadata } from '@/lib/auth/user-display-name'
import type { GenericScorecardCalculation } from '@/lib/scorecard/generic'
import { loadLivePreviews } from '@/lib/assessments/live-preview'

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
  // The live score per scorecard (shared with /companies and company detail).
  const previews = await loadLivePreviews(db, latestIds)
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
  const allReports = [
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
  const reports = allReports.slice(0, 5)

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
    // The same row pickNextAction chose (most recent unfinished), to word it as an action.
    const unfinished = allRows.filter((row) => !row.status.finished).sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))[0]
    const copy = nextStepCopy({ company: unfinished?.companyName ?? null, next: unfinished?.status.next ?? '', fallbackTitle: next.title, fallbackBody: next.body })
    addNeed({ key: 'next', ...copy, href: next.href, kind: 'next' })
  }
  for (const row of rows.filter((r) => r.needsAttention && r.attentionReason)) {
    addNeed({ key: `attention-${row.id}`, ...attentionCopy(row.name, row.attentionReason!), href: row.action.href, kind: 'attention' })
  }
  if (heroRow && heroPreview && !heroPreview.readiness.complete) {
    for (const reason of heroPreview.readiness.reasons) {
      const link = reasonLink(heroRow.id, reason)
      const notice = /Exempted Micro-Enterprise|Qualifying Small Enterprise|sector code/i.test(reason)
      addNeed({ key: `reason-${reason}`, ...reasonCopy(heroCompany, reason, link?.label ?? null), href: link?.href ?? heroBase, kind: notice ? 'notice' : 'todo' })
    }
  }

  // YOUR COMPANIES: the same status chips, from the same function, as /companies.
  const tableRows: CompanyTableRow[] = visible.map((row) => {
    const full = latestFull.get(row.id)
    const proc = latestProcurementRow.get(row.id)
    const status = full ? fullStatusChip(fullScorecardStatus(full)) : NOT_STARTED_CHIP
    const preview = full ? previews.get(full.id) : undefined
    const scored = preview ?? (full?.overall_result_snapshot as GenericScorecardCalculation | null | undefined) ?? null
    return {
      id: row.id,
      name: row.name,
      href: `/companies/${row.id}`,
      size: row.size,
      status,
      score: scored ? { total: scored.rawTotalPoints, available: scored.totalBasePointsAvailable } : null,
      procurement: proc ? procurementCell({ results: proc.procurement_results, storedTotal: proc.total_score }) : null,
      updatedAt: row.updatedAt,
      attention: isAdmin && row.needsAttention ? row.attentionReason : null,
    }
  })

  const lastChange = [...rows.map((r) => r.updatedAt), ...reports.map((r) => r.date)].filter((d): d is string => Boolean(d)).sort().at(-1) ?? null

  // Metrics strip: counts of data already loaded.
  const inProgress = fullStored.filter((row) => !fullScorecardStatus(row).finished).length
  const monthKey = formatDate(new Date()).slice(3)
  const reportsThisMonth = allReports.filter((r) => r.date && formatDate(r.date).slice(3) === monthKey).length
  const heroStatus = heroRow ? fullScorecardStatus(heroRow) : null

  return (
    <div className="space-y-8" data-tour="dashboard dashboard-main">
      {isDevBypass ? (
        <Callout tone="attention" title="Local development only">
          Sign-in is switched off (NEXT_PUBLIC_DEV_BYPASS_AUTH). Turn it off to test real sign-in.
        </Callout>
      ) : null}

      <Reveal index={0}>
        <PageHeader
          title="Home"
          icon={HomeIcon}
          meta={
            <>
              {greeting()}
              {firstName ? `, ${firstName}` : ''}
              {lastChange ? ` · Updated ${formatDate(lastChange)}` : ''}
            </>
          }
          actions={showCompactDemoStatus ? <DashboardDemoEnvironmentChip /> : null}
        />
      </Reveal>
      {loadFailed ? (
        <Callout tone="danger" title="Some of your work could not be loaded">
          Refresh the page. If it keeps happening, check your connection.
        </Callout>
      ) : null}

      {/* Row 1: the score (8 of 12) and what needs you (4). */}
      <Reveal index={1} className="grid gap-4 lg:grid-cols-12">
        {heroRow && heroView ? (
          <ScoreCard
            className="lg:col-span-8"
            view={heroView}
            company={heroCompany}
            year={heroRow.measurement_year}
            status={heroStatus ? fullStatusChip(heroStatus) : null}
            action={heroStatus ? { href: heroStatus.href, label: 'Continue scorecard' } : null}
            previousTotal={heroStored?.rawTotalPoints ?? null}
            fillKey={`home-${heroRow.id}`}
          />
        ) : (
          <div className={`flex lg:col-span-8 ${CARD_FRAME}`}>
            <EmptyState
              icon={<FileBarChart2 aria-hidden />}
              title="No full scorecard yet"
              action={
                <Link href="/start?type=full" className={buttonStyles({ variant: 'primary' })}>
                  Start a full scorecard
                </Link>
              }
            >
              Upload a client’s workbook and the score and level appear here.
            </EmptyState>
          </div>
        )}
        <NeedsYouCard items={needs} className="lg:col-span-4" />
      </Reveal>

      {/* Row 2: the five areas. */}
      {heroRow && heroView ? (
        <Reveal index={2}>
          <AreaTiles view={heroView} hrefBase={heroBase} />
        </Reveal>
      ) : null}

      {/* Row 3: the metrics strip. */}
      <Reveal index={3}>
        <Section>
          <MetricStrip>
            <Metric label="Companies" value={companies.length} href="/companies" sub="Clients you score" />
            <Metric label="Scorecards in progress" value={inProgress} href="/scorecards" sub={`of ${fullStored.length} full scorecards`} />
            <Metric label="Reports this month" value={reportsThisMonth} href="/dashboard/activity" sub={`of ${allReports.length} in all`} />
          </MetricStrip>
        </Section>
      </Reveal>

      {/* Row 4: the companies. */}
      <Reveal index={4}>
        <Section
          title={isAdmin ? 'All companies' : 'Your companies'}
          actions={
            <>
              {isAdmin ? (
                <Segmented
                  label="Filter companies"
                  value={showAttention ? 'attention' : 'all'}
                  options={[
                    { value: 'all', label: 'All', href: '/dashboard' },
                    { value: 'attention', label: 'Needs attention', href: '/dashboard?filter=attention', count: attentionCount },
                  ]}
                />
              ) : null}
              <Link href="/companies/new" data-tour="checklist-create-company" className={buttonStyles({ variant: 'secondary' })}>
                <Plus aria-hidden /> Add company
              </Link>
            </>
          }
        >
          {tableRows.length === 0 ? (
            <EmptyState
              icon={<Building2 aria-hidden />}
              title={showAttention ? 'Nothing needs attention' : 'No companies yet'}
              action={
                showAttention ? null : (
                  <Link href="/companies/new" className={buttonStyles({ variant: 'primary' })}>
                    <Plus aria-hidden /> Add your first company
                  </Link>
                )
              }
            >
              {showAttention ? 'Every company’s latest scorecard is in order.' : 'Add a company to start its scorecard.'}
            </EmptyState>
          ) : (
            <CompaniesTable rows={tableRows} />
          )}
        </Section>
      </Reveal>

      {/* Row 5: workspaces and recent reports, side by side. */}
      <Reveal index={5} className="grid gap-x-10 gap-y-8 border-t border-line pt-6 sm:pt-8 lg:grid-cols-2">
        {showClientWorkspaceSelector ? <DashboardWorkspaceSelector /> : null}
        <section aria-labelledby="recent-reports-heading" className={showClientWorkspaceSelector ? '' : 'lg:col-span-2'}>
          <div className="mb-2 flex min-h-9 items-center justify-between gap-3">
            <SectionTitle id="recent-reports-heading">Recent reports</SectionTitle>
            <Link href="/dashboard/activity" data-tour="checklist-activity" className={buttonStyles({ variant: 'plain', size: 'sm', className: '-mr-2' })}>
              See all activity
            </Link>
          </div>
          {reports.length === 0 ? (
            <p className="py-4 text-body text-label">Reports appear here once a scorecard is calculated.</p>
          ) : (
            <ul className="divide-y divide-divider">
              {reports.map((report) => (
                <li key={report.key} className="flex min-h-[52px] items-center gap-3 py-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-segment text-icon">
                    <FileText className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body font-medium text-ink" title={report.title}>
                      {report.title}
                    </span>
                    <span className="block truncate text-meta text-label">
                      {report.company} · {formatDate(report.date)}
                    </span>
                  </span>
                  <a href={report.pdf} className={buttonStyles({ variant: 'plain', size: 'sm', className: 'shrink-0' })}>
                    <Download aria-hidden /> <span className="hidden sm:inline">Download</span>
                    <span className="sr-only">
                      {' '}
                      PDF of {report.title}, {report.company}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </Reveal>
    </div>
  )
}
