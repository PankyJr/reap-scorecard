import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, Building2, Plus } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { isAuthDevBypassEnabled } from '@/lib/auth/dev-bypass'
import { isClientWorkspaceEnabled } from '@/lib/demo/clientWorkspaceFlag'
import { DashboardWorkspaceSelector } from '@/components/dashboard/DashboardWorkspaceSelector'
import { DashboardDemoEnvironmentChip } from '@/components/dashboard/DashboardDemoEnvironmentChip'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel } from '@/components/ui/Panel'
import { Notice } from '@/components/ui/Notice'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { AssessmentList } from '@/components/assessments/AssessmentList'
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
import { pickNextAction } from '@/lib/status/next-action'
import { computePortfolioProcurementTrends, type PortfolioProcurementAssessmentRow } from '@/lib/procurement/portfolioProcurementTrends'
import { formatSignedPoints } from '@/lib/procurement/compareAssessments'
import { userDisplayNameFromMetadata } from '@/lib/auth/user-display-name'

export const metadata = { title: 'Home' }

const LEVELS = ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5', 'Level 6', 'Level 7', 'Level 8', 'Non-Compliant'] as const

function greeting(): string {
  const hour = Number(new Date().toLocaleString('en-ZA', { hour: 'numeric', hour12: false, timeZone: 'Africa/Johannesburg' }))
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isDevBypass = isAuthDevBypassEnabled()
  if (!user && !isDevBypass) redirect('/login')
  const ownerId = user?.id ?? '__dev_bypass__'

  const [companiesResult, fullResult, procurementResult, legacyResult] = await Promise.all([
    supabase.from('companies').select('id, name').eq('owner_id', ownerId).order('name'),
    supabase
      .from('scorecard_assessments')
      .select(`${FULL_SCORECARD_LIST_COLUMNS}, companies!inner(id, name, owner_id)`)
      .eq('companies.owner_id', ownerId)
      .order('updated_at', { ascending: false }),
    supabase
      .from('procurement_assessments')
      .select(`${PROCUREMENT_LIST_COLUMNS}, companies!inner(id, name, owner_id)`)
      .eq('companies.owner_id', ownerId)
      .order('created_at', { ascending: true }),
    supabase.from('scorecards').select('score_level, companies!inner(owner_id)').eq('companies.owner_id', ownerId),
  ])

  const loadFailed = Boolean(companiesResult.error || fullResult.error || procurementResult.error)
  const companies = (companiesResult.data ?? []) as Array<{ id: string; name: string }>
  const fullStored = (fullResult.data ?? []) as unknown as StoredFullScorecard[]
  const procStored = (procurementResult.data ?? []) as unknown as StoredProcurement[]
  const fullRows = fullStored.map((r) => fullScorecardToRow(r))
  const procRows = procStored.map((r) => procurementToRow(r))
  const allRows: AssessmentRow[] = [...fullRows, ...procRows].sort(byRecent)
  const next = pickNextAction({ companies, rows: allRows })

  // Latest of each kind per company, for "Your companies".
  const latest = new Map<string, { full?: AssessmentRow; procurement?: AssessmentRow; count: number }>()
  for (const row of allRows) {
    const entry = latest.get(row.companyId) ?? { count: 0 }
    entry.count += 1
    if (row.kind === 'full' && !entry.full) entry.full = row
    if (row.kind === 'procurement' && !entry.procurement) entry.procurement = row
    latest.set(row.companyId, entry)
  }

  // Portfolio overview: finished levels only (a provisional level is not a level).
  const levelCounts: Record<string, number> = {}
  for (const row of fullStored) {
    const status = fullScorecardToRow(row).status
    if (status.finished && row.final_level) levelCounts[row.final_level] = (levelCounts[row.final_level] ?? 0) + 1
  }
  for (const row of (legacyResult.data ?? []) as Array<{ score_level: string | null }>) {
    if (row.score_level) levelCounts[row.score_level] = (levelCounts[row.score_level] ?? 0) + 1
  }
  const levelTotal = Object.values(levelCounts).reduce((a, b) => a + b, 0)
  const trends = computePortfolioProcurementTrends(
    procStored.map((r) => ({ ...r, company: Array.isArray(r.companies) ? r.companies[0] : r.companies })) as unknown as PortfolioProcurementAssessmentRow[],
    { recentWindowDays: 30 },
  )

  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>
  const name = userDisplayNameFromMetadata(meta, user?.email)
  const firstName = name && !name.includes('@') ? name.split(/\s+/)[0] : null
  const showClientWorkspaceSelector = isClientWorkspaceEnabled()
  /** Compact demo status chip, only while the client workspace demo runs outside production. */
  const showCompactDemoStatus = showClientWorkspaceSelector && (isDevBypass || process.env.NODE_ENV !== 'production')

  return (
    <div className="space-y-6" data-tour="dashboard dashboard-main">
      {isDevBypass ? (
        <Notice tone="warn" title="Local development only">
          Sign-in is switched off (NEXT_PUBLIC_DEV_BYPASS_AUTH). Turn it off to test real sign-in.
        </Notice>
      ) : null}

      <PageHeader
        title={firstName ? `${greeting()}, ${firstName}` : greeting()}
        description="Your companies and scorecards, and what to do next."
        actions={
          <>
            {showCompactDemoStatus ? <DashboardDemoEnvironmentChip /> : null}
            <Link href="/start" className={buttonStyles({ variant: 'primary' })}>
              <Plus className="h-4 w-4" aria-hidden /> Start new
            </Link>
          </>
        }
      />

      {loadFailed ? (
        <Notice tone="bad" title="Some of your work could not be loaded">
          Refresh the page. If it keeps happening, check your internet connection.
        </Notice>
      ) : null}

      <section
        aria-labelledby="next-heading"
        data-tour="setup-checklist"
        className="rounded-card border border-brand bg-brand px-5 py-5 text-brand-ink sm:px-6"
      >
        <p className="text-sm text-white/80">Next thing to do</p>
        <h2 id="next-heading" className="mt-1 font-serif text-2xl font-semibold leading-snug text-white">
          {next.title}
        </h2>
        <p className="mt-1 max-w-[62ch] text-base text-white/90">{next.body}</p>
        <Link
          href={next.href}
          data-tour="checklist-create-company"
          className="mt-4 inline-flex items-center gap-2 rounded-control bg-white px-4 py-2.5 text-[15px] font-semibold text-brand hover:bg-brand-soft"
        >
          {next.button} <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </section>

      {showClientWorkspaceSelector ? <DashboardWorkspaceSelector /> : null}

      <Panel
        title="Your companies"
        description={companies.length ? 'Each company’s latest scorecards.' : undefined}
        actions={
          companies.length ? (
            <Link href="/companies" className={buttonStyles({ variant: 'ghost', size: 'sm' })}>
              All companies
            </Link>
          ) : null
        }
      >
        {companies.length === 0 ? (
          <p className="text-base text-muted">
            No companies yet. Use <strong className="text-ink">Start new</strong>: you add the company as part of starting
            your first scorecard.
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-control border border-line">
            {companies.slice(0, 8).map((company) => {
              const entry = latest.get(company.id)
              return (
                <li key={company.id} className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <Link href={`/companies/${company.id}`} className="flex min-w-0 items-center gap-3 text-base font-semibold text-ink hover:text-brand">
                    <Building2 className="h-5 w-5 shrink-0 text-faint" aria-hidden />
                    <span className="truncate">{company.name}</span>
                  </Link>
                  <div className="flex flex-wrap items-center gap-2 pl-8 sm:pl-0">
                    {entry?.full ? (
                      <StatusBadge tone={entry.full.status.tone}>Full scorecard: {entry.full.status.label}</StatusBadge>
                    ) : null}
                    {entry?.procurement ? (
                      <StatusBadge tone="neutral">Procurement: {entry.procurement.score}</StatusBadge>
                    ) : null}
                    {!entry ? <span className="text-sm text-muted">No scorecards yet</span> : null}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>

      {allRows.length > 0 ? (
        <Panel
          title="Recent work"
          actions={
            <Link href="/dashboard/activity" data-tour="checklist-activity" className={buttonStyles({ variant: 'ghost', size: 'sm' })}>
              See all activity
            </Link>
          }
        >
          <AssessmentList rows={allRows.slice(0, 5)} />
        </Panel>
      ) : null}

      {allRows.length > 0 ? (
        <Panel title="Portfolio overview" description="Across all your companies.">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'Companies', value: companies.length },
              { label: 'Full scorecards', value: fullRows.length },
              { label: 'Procurement scorecards', value: procRows.length },
              {
                label: 'Average procurement score',
                value: trends.averageLatestScore == null ? '—' : `${trends.averageLatestScore.toFixed(2)} / 29`,
              },
            ].map((stat) => (
              <div key={stat.label} className="rounded-control bg-sunken px-4 py-3">
                <dt className="text-sm text-muted">{stat.label}</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums text-ink">{stat.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="text-base font-semibold text-ink">Finished scorecards by B-BBEE level</h3>
              {levelTotal === 0 ? (
                <p className="mt-2 text-[15px] text-muted">Shows once a full scorecard has a final level.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {LEVELS.filter((l) => levelCounts[l]).map((level) => (
                    <li key={level} className="grid grid-cols-[7.5rem_1fr_2rem] items-center gap-3 text-[15px]">
                      <span className="text-ink">{level === 'Non-Compliant' ? 'Non-compliant' : level}</span>
                      <span className="h-2.5 overflow-hidden rounded-full bg-line">
                        <span
                          className="block h-full rounded-full bg-brand"
                          style={{ width: `${Math.round((levelCounts[level] / levelTotal) * 100)}%` }}
                        />
                      </span>
                      <span className="text-right tabular-nums text-muted">{levelCounts[level]}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="text-base font-semibold text-ink">Procurement to look at</h3>
              <p className="mt-1 text-sm text-muted">
                {trends.companiesImprovedVsPrior} improved and {trends.companiesDeclinedVsPrior} dropped since their previous
                procurement scorecard.
              </p>
              {trends.attention.length === 0 ? (
                <p className="mt-2 text-[15px] text-muted">Nothing needs attention.</p>
              ) : (
                <ul className="mt-3 divide-y divide-line rounded-control border border-line">
                  {trends.attention.slice(0, 5).map((item) => (
                    <li key={item.latestAssessmentId} className="flex items-center justify-between gap-3 px-4 py-3 text-[15px]">
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-ink">{item.companyName}</span>
                        <span className="block text-sm text-muted">
                          {item.reason === 'declined_vs_prior' && item.scoreDeltaVsPrior != null
                            ? `Down ${formatSignedPoints(item.scoreDeltaVsPrior)} points since the previous one`
                            : 'Below the average of your companies'}
                        </span>
                      </span>
                      <Link href={`/procurement/assessments/${item.latestAssessmentId}`} className="shrink-0 font-semibold text-brand hover:underline">
                        Open
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Panel>
      ) : null}
    </div>
  )
}
