import { createClient } from '@/utils/supabase/server'
import {
  Building2,
  FileBarChart2,
  TrendingUp,
  ArrowRight,
  Plus,
  ChevronRight,
  AlertCircle,
  Check,
} from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { isAuthDevBypassEnabled } from '@/lib/auth/dev-bypass'
import { deriveScoreLevel } from '@/lib/scorecard/calculateScorecard'
import { formatSignedPoints } from '@/lib/procurement/compareAssessments'
import {
  computePortfolioProcurementTrends,
  type PortfolioAttentionItem,
  type PortfolioProcurementAssessmentRow,
} from '@/lib/procurement/portfolioProcurementTrends'

/** REAP level pills: one brand accent (#063b3f) for strong tiers; slate elsewhere (no rose/amber clash). */
function procurementReapBadgeClass(level: string): string {
  if (level === 'Non-Compliant') {
    return 'border-slate-300 bg-slate-100 text-slate-700'
  }
  if (level.startsWith('Level ')) {
    const n = parseInt(level.slice(6), 10)
    if (!Number.isNaN(n) && n <= 3) {
      return 'border-[#063b3f]/35 bg-[#063b3f]/10 text-[#042f34]'
    }
    if (!Number.isNaN(n) && n <= 5) {
      return 'border-slate-200 bg-slate-50 text-slate-700'
    }
  }
  return 'border-slate-200/90 bg-white text-slate-700'
}

function attentionReasonSummary(item: PortfolioAttentionItem): string {
  if (item.reason === 'declined_vs_prior' && item.scoreDeltaVsPrior != null) {
    return `Down ${formatSignedPoints(item.scoreDeltaVsPrior)} pts vs prior run`
  }
  if (item.reason === 'low_latest_score') {
    return 'Below portfolio average or non-compliant on latest run'
  }
  return 'Review latest procurement inputs'
}

/** Presentation-only: clarify dashboard rows where 0.00 may be valid or incomplete. */
function isProcurementPointsZero(value: number | string | null | undefined): boolean {
  if (value == null) return false
  const n = Number(value)
  return !Number.isNaN(n) && n === 0
}

function ProcurementPointsZeroHint({ className }: { className?: string }) {
  return (
    <p
      className={[
        'mt-0.5 max-w-[11rem] text-left text-[10px] leading-snug text-slate-500 sm:max-w-none sm:text-right',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      Zero can reflect saved inputs; open the assessment if totals look incomplete.
    </p>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Counts scoped to owned data; scorecards filtered by RLS via company ownership
  let companyCount = 0
  let scorecardCount = 0
  let averageLevelDisplay: string | null = null
  const levelCounts: Record<string, number> = {}
  type RecentScorecardRow = {
    id: string
    total_score: number | null
    score_level: string | null
    created_at: string
    company: { name: string } | { name: string }[] | null
  }
  let recentScorecards: RecentScorecardRow[] | null = null

  type RecentProcurementRow = {
    id: string
    assessment_year: number | null
    total_score: number | null
    created_at: string
    company: { name: string } | null
  }
  let recentProcurement: RecentProcurementRow[] = []

  try {
    const companies = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', user.id)
    companyCount = companies.count ?? 0
  } catch {
    // Table may not exist yet
  }

  try {
    const scorecards = await supabase
      .from('scorecards')
      .select('*', { count: 'exact', head: true })
    scorecardCount = scorecards.count ?? 0
  } catch {
    // Table may not exist yet
  }

  try {
    const { data: scores } = await supabase
      .from('scorecards')
      .select('total_score, score_level')

    if (scores && scores.length > 0) {
      const numericScores: number[] = []

      for (const s of scores as { total_score: number | null; score_level: string | null }[]) {
        const numeric = Number(s.total_score)
        if (!Number.isNaN(numeric)) {
          numericScores.push(numeric)
        }
        if (s.score_level) {
          levelCounts[s.score_level] = (levelCounts[s.score_level] ?? 0) + 1
        }
      }

      if (numericScores.length > 0) {
        const sum = numericScores.reduce((acc, v) => acc + v, 0)
        const avg = sum / numericScores.length
        averageLevelDisplay = deriveScoreLevel(avg)
      }
    }
  } catch {
    // aggregation is best-effort for dashboard only
  }

  try {
    const { data } = await supabase
      .from('scorecards')
      .select(
        `
        id,
        total_score,
        score_level,
        created_at,
        company:companies(name)
      `,
      )
      .order('created_at', { ascending: false })
      .limit(5)

    recentScorecards = (data ?? []) as unknown as RecentScorecardRow[]
  } catch {
    // recent list is best-effort
  }

  let procurementAssessmentsAll: PortfolioProcurementAssessmentRow[] = []
  try {
    const { data } = await supabase
      .from('procurement_assessments')
      .select(
        `
        id,
        company_id,
        assessment_year,
        total_score,
        created_at,
        company:companies(name)
      `,
      )
      .order('created_at', { ascending: true })

    procurementAssessmentsAll = (data ?? []) as unknown as PortfolioProcurementAssessmentRow[]
  } catch {
    // procurement list / trends are best-effort
  }

  const procurementTrends = computePortfolioProcurementTrends(
    procurementAssessmentsAll,
    { recentWindowDays: 30 },
  )

  recentProcurement = [...procurementAssessmentsAll]
    .reverse()
    .slice(0, 4)
    .map((r) => {
      const co = r.company
      const name =
        (Array.isArray(co) ? co[0]?.name : co?.name) ?? 'Unknown company'
      return {
        id: r.id,
        assessment_year: r.assessment_year ?? null,
        total_score: r.total_score,
        created_at: r.created_at,
        company: { name },
      }
    })

  // Show dev mode banner only when local dev bypass is actually active (never in production)
  const isDevBypass = isAuthDevBypassEnabled()
  const today = new Date()
  const formattedDate = today.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  const orderedLevels = ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5']
  const levelDistribution = orderedLevels
    .map((label) => ({ label, count: levelCounts[label] ?? 0 }))
    .filter((entry) => entry.count > 0)

  const totalForDistribution = levelDistribution.reduce((acc, entry) => acc + entry.count, 0)
  const maxLevelCount = levelDistribution.reduce((max, entry) => (entry.count > max ? entry.count : max), 0)

  const isFirstLogin = companyCount === 0 && scorecardCount === 0
  const hasData = companyCount > 0 || scorecardCount > 0
  const hasAvgLevel = averageLevelDisplay != null
  const avgLevelPrimary = hasAvgLevel ? averageLevelDisplay : 'Awaiting data'
  const avgLevelSecondary = hasAvgLevel
    ? 'Overall REAP maturity'
    : scorecardCount > 0
      ? 'Needs at least one scorecard with a calculated total.'
      : 'Appears after you save a scorecard with points.'
  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'there'
  const firstName = displayName.split(' ')[0]

  return (
    <div className="space-y-10">
      {isDevBypass && (
        <div className="rounded-xl border border-amber-300/80 bg-amber-50 p-4 text-sm">
          <p className="text-sm font-medium text-amber-800">
            Local dev only: auth bypass is on. Unset{' '}
            <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs">
              NEXT_PUBLIC_DEV_BYPASS_AUTH
            </code>{' '}
            in <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs">.env.local</code> to test
            real sign-in.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {isFirstLogin ? `Welcome, ${firstName}` : 'Dashboard'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isFirstLogin
              ? 'Get started by adding your first company.'
              : 'Overview of REAP Scorecard activity'}
          </p>
        </div>
        {hasData && (
          <div className="flex items-center gap-2 text-xs text-slate-500 sm:text-sm">
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 shadow-xs">
              <span className="mr-2 h-2 w-2 rounded-full bg-emerald-500" />
              Live as of {formattedDate}
            </span>
          </div>
        )}
      </div>

      {/* Setup checklist — visible until company + scorecard exist */}
      {(companyCount === 0 || scorecardCount === 0) && (
        <section
          className="overflow-hidden rounded-2xl border border-[#052a2e] bg-[#063b3f] shadow-[0_4px_24px_rgba(6,59,63,0.25)]"
          aria-labelledby="onboarding-checklist-heading"
        >
          <div className="border-b border-white/10 px-6 py-6 sm:px-8 sm:py-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-200/70">Checklist</p>
            <h3 id="onboarding-checklist-heading" className="mt-2 text-lg font-semibold tracking-tight text-white">
              Complete your setup
            </h3>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-sky-100/85">
              Finish these steps to unlock the full workspace—same flow as below, at a glance.
            </p>
          </div>

          <ol className="divide-y divide-white/10 bg-[#063b3f]">
            <li className="flex gap-4 px-6 py-5 sm:gap-5 sm:px-8 sm:py-6">
              <div className="flex shrink-0 flex-col items-center pt-0.5">
                {companyCount > 0 ? (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#063b3f] shadow-md ring-2 ring-white/30">
                    <Check className="h-4 w-4 stroke-[2.5]" aria-hidden />
                  </span>
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-[13px] font-semibold tabular-nums text-white ring-1 ring-white/25">
                    1
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold leading-snug text-white">Add your first company</p>
                <p className="mt-1 text-[13px] leading-relaxed text-sky-100/80">
                  Create an organisation profile—scorecards are linked to companies.
                </p>
                {companyCount === 0 ? (
                  <Link
                    href="/companies/new"
                    className="mt-3.5 inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-[13px] font-semibold text-[#063b3f] shadow-md transition hover:bg-sky-50"
                  >
                    Create a company
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                ) : (
                  <p className="mt-2 text-[12px] font-medium text-emerald-300">Done</p>
                )}
              </div>
            </li>

            <li className="flex gap-4 px-6 py-5 sm:gap-5 sm:px-8 sm:py-6">
              <div className="flex shrink-0 flex-col items-center pt-0.5">
                {scorecardCount > 0 ? (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#063b3f] shadow-md ring-2 ring-white/30">
                    <Check className="h-4 w-4 stroke-[2.5]" aria-hidden />
                  </span>
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-[13px] font-semibold tabular-nums text-white ring-1 ring-white/25">
                    2
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold leading-snug text-white">Create your first scorecard</p>
                <p className="mt-1 text-[13px] leading-relaxed text-sky-100/80">
                  Enter category scores and generate REAP levels for a client.
                </p>
                {scorecardCount === 0 ? (
                  <Link
                    href="/scorecards/new"
                    className="mt-3.5 inline-flex items-center gap-1.5 rounded-lg border border-white/35 bg-white/10 px-3.5 py-2 text-[13px] font-medium text-white shadow-sm backdrop-blur-[2px] transition hover:bg-white/20"
                  >
                    New scorecard
                    <ArrowRight className="h-3.5 w-3.5 text-sky-100" aria-hidden />
                  </Link>
                ) : (
                  <p className="mt-2 text-[12px] font-medium text-emerald-300">Done</p>
                )}
              </div>
            </li>

            <li className="flex gap-4 px-6 py-5 sm:gap-5 sm:px-8 sm:py-6">
              <div className="flex shrink-0 flex-col items-center pt-0.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-white/35 bg-white/5 text-[13px] font-semibold text-sky-100/90">
                  3
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold leading-snug text-white">Review activity</p>
                <p className="mt-1 text-[13px] leading-relaxed text-sky-100/80">
                  See company and scorecard changes over time in your audit trail.
                </p>
                <Link
                  href="/dashboard/activity"
                  className="mt-3.5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-white underline decoration-white/40 underline-offset-4 transition hover:decoration-white"
                >
                  Open Activity
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>
            </li>
          </ol>
        </section>
      )}

      {/* First-login onboarding */}
      {isFirstLogin && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="px-6 py-8 sm:px-8 sm:py-10">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Getting started</p>
            <h2 className="mt-3 text-lg font-semibold text-slate-900">Welcome to REAP Scorecard</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Measure B-BBEE and procurement performance for your clients in one place—start by adding a company, then
              build scorecards and track activity.
            </p>
            <h3 className="mt-6 text-base font-semibold text-slate-900">Three quick steps</h3>
            <p className="mt-1 text-sm text-slate-500">Each step takes less than a minute.</p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                {
                  step: '1',
                  title: 'Add a company',
                  desc: 'Create a client profile to attach scorecards to.',
                  href: '/companies/new',
                  active: true,
                },
                {
                  step: '2',
                  title: 'Create a scorecard',
                  desc: 'Enter category scores and generate a REAP level.',
                  href: null,
                  active: false,
                },
                {
                  step: '3',
                  title: 'Review results',
                  desc: 'See insights, gaps, and recommendations.',
                  href: null,
                  active: false,
                },
              ].map((s) => (
                <div
                  key={s.step}
                  className={`relative rounded-xl border p-5 ${
                    s.active
                      ? 'border-slate-900 bg-slate-950 text-white shadow-md'
                      : 'border-slate-200 bg-slate-50/80 text-slate-400'
                  }`}
                >
                  <div className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold ${
                    s.active ? 'bg-white text-slate-900' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {s.step}
                  </div>
                  <p className={`mt-3 text-[14px] font-semibold ${s.active ? 'text-white' : 'text-slate-700'}`}>
                    {s.title}
                  </p>
                  <p className={`mt-1 text-[13px] leading-relaxed ${s.active ? 'text-slate-300' : 'text-slate-500'}`}>
                    {s.desc}
                  </p>
                  {s.active && s.href && (
                    <Link
                      href={s.href}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-[13px] font-medium text-slate-900 shadow-sm transition hover:bg-slate-100"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add company
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stats grid — only show when there is data */}
      {hasData && (
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/companies" className="group rounded-2xl bg-[#063b3f] p-4 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-sky-100/90">Companies</p>
                <p className="mt-2.5 text-3xl font-semibold tabular-nums">{companyCount}</p>
              </div>
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#02181b] text-white ring-1 ring-blue-300/50">
                <Building2 className="h-5 w-5" />
              </div>
            </div>
          </Link>

          <Link href="/scorecards/new" className="group rounded-2xl bg-slate-900 p-4 text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-blue-100/80">Scorecards</p>
                <p className="mt-2.5 text-3xl font-semibold tabular-nums">{scorecardCount}</p>
              </div>
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-white ring-1 ring-emerald-300/40">
                <FileBarChart2 className="h-5 w-5" />
              </div>
            </div>
          </Link>

          <div className="group rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-widest text-slate-500/80">Avg Level</p>
                <p
                  className={`mt-2.5 text-2xl font-semibold tabular-nums leading-tight ${
                    hasAvgLevel ? 'text-slate-900' : 'text-slate-600'
                  }`}
                >
                  {avgLevelPrimary}
                </p>
                <p className="mt-1 text-xs leading-snug text-slate-500">{avgLevelSecondary}</p>
              </div>
              <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-700 ring-1 ring-slate-200">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>
      )}

      {hasData && procurementTrends.totalAssessmentCount > 0 && (
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_40px_-8px_rgba(15,23,42,0.08)]">
          {/* Module header + metrics — compact dashboard strip (not a marketing hero) */}
          <div className="relative overflow-hidden bg-[#063b3f] px-5 py-5 sm:px-6 sm:py-5">
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_100%_0%,rgba(255,255,255,0.04),transparent_55%)]"
              aria-hidden
            />

            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
              <div className="min-w-0 max-w-2xl">
                <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/50">
                  Live metrics
                </p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-[1.35rem] sm:leading-snug">
                  Procurement portfolio
                </h2>
                <p className="mt-1.5 text-[13px] leading-snug text-sky-100/72">
                  Live totals across your companies. Recent = new runs in the last{' '}
                  {procurementTrends.recentWindowDays} days. Improved / declined compare each
                  company&apos;s latest score to its previous assessment.
                </p>
              </div>
              <Link
                href="/companies"
                className="relative inline-flex shrink-0 items-center justify-center self-start rounded-lg border border-white/20 bg-[#02181b] px-4 py-2 text-xs font-semibold text-white shadow-sm ring-1 ring-white/10 transition hover:border-white/30 hover:bg-[#032428] sm:self-auto"
              >
                Browse companies
              </Link>
            </div>

            <div className="relative mt-5 border-t border-white/12 pt-5">
              <div className="grid grid-cols-2 gap-x-5 gap-y-6 sm:grid-cols-3 sm:gap-y-7 lg:grid-cols-5 lg:gap-x-0 lg:gap-y-0">
                {[
                  {
                    label: 'Companies',
                    value: procurementTrends.companiesWithProcurement,
                    hint: 'With procurement data',
                  },
                  {
                    label: 'Recent',
                    value: procurementTrends.recentAssessmentCount,
                    hint: `Last ${procurementTrends.recentWindowDays} days`,
                  },
                  {
                    label: 'Avg latest score',
                    value:
                      procurementTrends.averageLatestScore != null
                        ? procurementTrends.averageLatestScore.toFixed(2)
                        : '—',
                    hint: 'Mean of latest points',
                  },
                  {
                    label: 'Improved vs prior',
                    value: procurementTrends.companiesImprovedVsPrior,
                    hint:
                      procurementTrends.companiesComparable > 0
                        ? `of ${procurementTrends.companiesComparable} comparable`
                        : 'Needs earlier run',
                  },
                  {
                    label: 'Declined vs prior',
                    value: procurementTrends.companiesDeclinedVsPrior,
                    hint:
                      procurementTrends.companiesComparable > 0
                        ? `of ${procurementTrends.companiesComparable} comparable`
                        : 'Needs earlier run',
                  },
                ].map((tile, idx) => (
                  <div
                    key={tile.label}
                    className={[
                      'min-w-0',
                      idx > 0 ? 'lg:border-l lg:border-white/12 lg:pl-6' : '',
                    ].join(' ')}
                  >
                    <p className="text-[10px] font-normal uppercase tracking-[0.12em] text-white/45">
                      {tile.label}
                    </p>
                    <p className="mt-1 text-[1.75rem] font-semibold tabular-nums leading-none tracking-tight text-white sm:text-[2rem]">
                      {tile.value}
                    </p>
                    <p className="mt-1 text-[11px] leading-snug text-white/38">{tile.hint}</p>
                    {tile.label === 'Avg latest score' && tile.value === '0.00' ? (
                      <p className="mt-1 text-[10px] leading-snug text-white/30">
                        A mean of zero means latest saved totals are all zero—open assessments to
                        confirm category entries.
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <p className="relative mt-5 text-[11px] leading-snug text-white/35">
              {procurementTrends.totalAssessmentCount} assessment
              {procurementTrends.totalAssessmentCount === 1 ? '' : 's'} on file in this portfolio.
            </p>
          </div>

          {/* Priority actions */}
          {procurementTrends.attention.length > 0 ? (
            <div className="border-t border-slate-200/80 bg-slate-50 px-5 py-5 sm:px-6">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200/80 pb-4">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#063b3f]/20 bg-[#063b3f]/10 text-[#063b3f]">
                    <AlertCircle className="h-[17px] w-[17px] stroke-[2.25]" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900">Needs attention</h3>
                    <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                      Declines first, then weak latest scores vs the pack.
                    </p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full border border-[#063b3f]/15 bg-[#063b3f]/8 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-[#063b3f]">
                  {procurementTrends.attention.length}{' '}
                  {procurementTrends.attention.length === 1 ? 'company' : 'companies'}
                </span>
              </div>

              <ul className="mt-4 space-y-3">
                {procurementTrends.attention.map((item) => (
                  <li key={`${item.companyId}-${item.latestAssessmentId}`}>
                    <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
                      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-[6.25rem_minmax(0,1fr)_auto] sm:items-start sm:gap-6">
                        {/* Left: latest score — compact stat module */}
                        <div className="flex sm:block sm:justify-stretch">
                          <div className="w-full rounded-lg border border-slate-200/90 bg-slate-50/90 px-3 py-2.5 text-center sm:px-3 sm:py-3">
                            <p className="text-[1.65rem] font-semibold tabular-nums leading-none tracking-tight text-slate-900 sm:text-[1.75rem]">
                              {item.latestScore.toFixed(2)}
                            </p>
                            <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
                              Latest pts
                            </p>
                            {isProcurementPointsZero(item.latestScore) ? (
                              <p className="mt-1.5 text-[10px] leading-snug text-slate-500">
                                Confirm inputs on the assessment if this looks unexpected.
                              </p>
                            ) : null}
                          </div>
                        </div>

                        {/* Center: company, status, context */}
                        <div className="min-w-0 border-t border-slate-100 pt-3 sm:border-t-0 sm:pt-0">
                          <p className="text-base font-semibold leading-snug text-slate-900">
                            {item.companyName}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold leading-none ${procurementReapBadgeClass(item.reapLevelCurrent)}`}
                            >
                              {item.reapLevelCurrent}
                            </span>
                            {item.reason === 'declined_vs_prior' &&
                            item.reapLevelPrevious &&
                            item.reapLevelPrevious !== item.reapLevelCurrent ? (
                              <span className="text-[11px] text-slate-500">
                                from {item.reapLevelPrevious}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-2.5 text-[13px] leading-snug text-slate-600">
                            {attentionReasonSummary(item)}
                          </p>
                        </div>

                        {/* Right: actions */}
                        <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 sm:border-t-0 sm:items-end sm:pt-1">
                          <Link
                            href={`/procurement/assessments/${item.latestAssessmentId}`}
                            className="inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 sm:w-auto sm:min-w-[9.5rem]"
                          >
                            Open assessment
                          </Link>
                          <Link
                            href={`/companies/${item.companyId}`}
                            className="inline-flex w-full items-center justify-center text-center text-xs font-semibold text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline sm:w-auto"
                          >
                            Company profile
                          </Link>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      )}

      {/* Recent Scorecards */}
      {hasData && (
        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200/80 px-5 py-3 sm:px-6">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Recent Scorecards</h2>
              <p className="mt-0.5 text-xs text-slate-500">Latest assessments across your portfolio.</p>
            </div>
            <Link
              href="/scorecards/new"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs transition hover:bg-slate-50 hover:text-slate-900"
            >
              <Plus className="h-3 w-3" />
              New
            </Link>
          </div>
          {recentScorecards && recentScorecards.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {recentScorecards.map((row) => {
                const co = row.company
                const companyName =
                  (Array.isArray(co) ? co[0]?.name : co?.name) ?? 'Unknown company'
                const initial = companyName.trim().charAt(0).toUpperCase() || '?'
                return (
                  <Link
                    key={row.id}
                    href={`/scorecards/${row.id}`}
                    className="flex items-center justify-between px-5 py-3 text-sm transition-colors hover:bg-slate-50/80 sm:px-6 sm:py-3.5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold uppercase text-slate-50">
                        {initial}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{companyName}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {new Date(row.created_at).toLocaleDateString()} · {row.score_level ?? 'Pending'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-semibold tabular-nums text-slate-900">
                          {row.total_score ?? '-'}
                        </p>
                        <p className="text-[10px] uppercase tracking-wide text-slate-400">points</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300" />
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="px-5 py-6 text-center sm:px-6 sm:py-7">
              <p className="text-sm font-semibold text-slate-800">No recent scorecards</p>
              <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">
                Scorecards appear here after you save one. Add a company first, then create a scorecard and enter
                category scores—your latest work will show up automatically.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <Link
                  href="/companies"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Browse companies
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href="/scorecards/new"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-[13px] font-medium text-slate-800 transition hover:bg-slate-100"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New scorecard
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {hasData && recentProcurement.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_40px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-2 border-b border-slate-200/80 bg-gradient-to-b from-slate-50/80 to-white px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-3.5">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-slate-900">
                Recent procurement assessments
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Newest first — open a row for full results and comparison.
              </p>
            </div>
            <Link
              href="/companies"
              className="inline-flex shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:px-4"
            >
              All companies
            </Link>
          </div>
          <div className="p-1.5 sm:p-2">
            {recentProcurement.map((row) => {
              const companyName = row.company?.name ?? 'Unknown company'
              const initial = companyName.trim().charAt(0).toUpperCase() || '?'
              const yearLabel =
                row.assessment_year != null
                  ? `Year ${row.assessment_year}`
                  : 'Procurement'
              return (
                <Link
                  key={row.id}
                  href={`/procurement/assessments/${row.id}`}
                  className="group mb-0.5 flex items-center gap-3 rounded-xl border border-transparent px-2.5 py-2.5 transition last:mb-0 hover:border-slate-200/90 hover:bg-slate-50/90 sm:gap-4 sm:px-3 sm:py-3"
                >
                  <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-950 text-xs font-bold uppercase tracking-wide text-emerald-50 ring-1 ring-emerald-900/20 group-hover:ring-emerald-800/40">
                    {initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-slate-950">
                      {companyName}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      <span className="font-medium text-slate-600">{yearLabel}</span>
                      <span className="mx-1.5 text-slate-300">·</span>
                      <span>{new Date(row.created_at).toLocaleDateString()}</span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                    <div className="text-right">
                      <p className="text-lg font-semibold tabular-nums tracking-tight text-slate-900 group-hover:text-slate-950">
                        {row.total_score != null ? Number(row.total_score).toFixed(2) : '—'}
                      </p>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                        Points
                      </p>
                      {isProcurementPointsZero(row.total_score) ? (
                        <ProcurementPointsZeroHint />
                      ) : null}
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 text-slate-50 shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-base font-semibold text-slate-50 sm:text-lg">
              Portfolio Insights
            </h2>
            <p className="mt-0.5 text-xs text-slate-400 sm:text-sm">
              Distribution of REAP levels across saved scorecards—updates as you add assessments.
            </p>
          </div>
          {totalForDistribution > 0 && (
            <div className="inline-flex items-center rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-[11px] font-medium text-slate-100">
              <span className="mr-2 h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {totalForDistribution} active assessment
              {totalForDistribution === 1 ? '' : 's'}
            </div>
          )}
        </div>

        {totalForDistribution === 0 && (
          <div className="border-t border-slate-800/80 px-5 py-5 sm:px-6 sm:py-6">
            <div className="rounded-xl border border-slate-700/90 bg-slate-950/55 p-4 sm:p-5">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
                Not enough data yet
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-100">
                Level mix will appear after scored scorecards exist
              </p>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Each saved scorecard carries a REAP level. This panel aggregates how many fall in
                each band so you can see concentration and prioritise follow-ups—no chart is shown
                until those levels exist.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {hasData ? (
                  <>
                    <Link
                      href="/scorecards/new"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-800"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      New scorecard
                    </Link>
                    <Link
                      href="/companies"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/90 px-3.5 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-900/80"
                    >
                      View companies
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </>
                ) : (
                  <Link
                    href="/companies/new"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-800"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add a company
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {totalForDistribution > 0 && (
          <div className="border-t border-slate-800/80 px-6 py-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Left: level distribution */}
              <div className="space-y-4 md:pr-6 md:border-r md:border-slate-800/80">
                <div className="flex items-center justify-between border-b border-slate-800/70 pb-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Level distribution
                  </p>
                  <span className="text-[11px] text-slate-500">
                    {levelDistribution.length} populated level
                    {levelDistribution.length === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="space-y-3">
                  {levelDistribution.map((entry) => {
                    const percentage =
                      totalForDistribution > 0
                        ? Math.round((entry.count / totalForDistribution) * 100)
                        : 0

                    const relativeWidth =
                      maxLevelCount > 0 ? (entry.count / maxLevelCount) * 100 : 0

                    return (
                      <div
                        key={entry.label}
                        className="rounded-xl border border-slate-800/80 bg-slate-950/40 px-4 py-3"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <div className="text-sm font-medium text-slate-100">{entry.label}</div>
                          <div className="text-[11px] font-medium tabular-nums text-slate-300">
                            {entry.count}{' '}
                            <span className="text-slate-500">({percentage}%)</span>
                          </div>
                        </div>

                        <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full bg-emerald-400"
                            style={{ width: `${relativeWidth}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Right: qualitative snapshot */}
              <div className="space-y-4 md:pl-2">
                <div className="border-b border-slate-800/70 pb-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    What this means
                  </p>
                </div>

                {levelDistribution.length > 0 && (
                  <div className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-4 text-sm text-slate-100">
                    <p className="font-medium leading-6">
                      Most assessments are currently at{' '}
                      <span className="text-emerald-300">
                        {levelDistribution.reduce((top, entry) =>
                          entry.count > (top?.count ?? 0) ? entry : top,
                        )?.label ?? 'N/A'}
                      </span>
                      .
                    </p>
                    <div className="mt-3 border-t border-slate-800/70 pt-3 text-xs leading-5 text-slate-400">
                      Use this mix to decide where to focus uplift work first — for example,
                      moving clients clustered in the lower levels up by one band has a
                      disproportionate impact on overall maturity.
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-dashed border-slate-700/80 bg-slate-950/30 px-4 py-3 text-[11px] leading-5 text-slate-300">
                  As more procurement assessments are captured, you&apos;ll be able to track how
                  this distribution shifts over time and spot when the portfolio starts to migrate
                  into higher levels.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}