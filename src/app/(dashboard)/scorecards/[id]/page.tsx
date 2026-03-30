import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { ArrowLeft, Calendar, Award, StickyNote } from 'lucide-react'
import { notFound, redirect } from 'next/navigation'
import { ScorecardChart } from '@/components/charts/ScorecardChart'
import { analyseGaps } from '@/lib/scorecard/analysis'
import { generateRecommendations } from '@/lib/scorecard/recommendations'
import { getReportInterpretation } from '@/lib/scorecard/interpretation'
import type { ScorecardResult } from '@/lib/scorecard/calculateScorecard'
import type { CategoryGapAnalysis } from '@/lib/scorecard/analysis'
import { ScoreImprovementSimulator } from '@/components/scorecards/ScoreImprovementSimulator'
import { GeneratePdfButton } from '@/components/scorecards/GeneratePdfButton'
import { DeleteScorecardButton } from './DeleteScorecardButton'

const CATEGORY_ORDER = [
  'Ownership',
  'Management Control',
  'Skills Development',
  'Enterprise Development',
  'Socio-Economic Development',
]

function sortCategoriesByOrder(categories: CategoryGapAnalysis[]): CategoryGapAnalysis[] {
  const index = (name: string) => {
    const i = CATEGORY_ORDER.indexOf(name)
    return i === -1 ? 999 : i
  }
  return [...categories].sort((a, b) => index(a.category_name) - index(b.category_name))
}

export default async function ScorecardDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: scorecard } = await supabase
    .from('scorecards')
    .select(`
      *,
      company:companies(*)
    `)
    .eq('id', id)
    .single()

  const company = Array.isArray(scorecard?.company) ? scorecard?.company?.[0] : scorecard?.company
  if (!scorecard || !company || company.owner_id !== user.id) {
    notFound()
  }

  // Fetch Results for analysis & charting
  const { data: results } = await supabase
    .from('scorecard_results')
    .select('*')
    .eq('scorecard_id', scorecard.id)
    .order('category_name')

  const chartData = results?.map((r) => ({
    name: r.category_name.replace(' Development', ''), // Shorten for chart
    score: Number(r.score),
    max_score: Number(r.max_score),
  })) || []

  const scorecardResult: ScorecardResult = {
    total_score: Number(scorecard.total_score ?? 0),
    score_level: scorecard.score_level ?? 'Non-Compliant',
    category_results:
      results?.map((r) => ({
        category_key: r.category_name.toLowerCase().replace(/\s+/g, '_'),
        category_name: r.category_name,
        score: Number(r.score),
        max_score: Number(r.max_score),
      })) ?? [],
  }

  const gapSummary = analyseGaps(scorecardResult)
  const allRecommendations = generateRecommendations(scorecardResult)
  const interpretation = getReportInterpretation(
    gapSummary,
    scorecardResult.score_level,
    scorecardResult.total_score
  )
  const sortedCategories = sortCategoriesByOrder(gapSummary.categories)
  const focusRecommendations = [...allRecommendations]
    .sort((a, b) => a.completion - b.completion)
    .filter((r) => r.priority === 'high' || r.priority === 'medium')
    .slice(0, 4)
  const focusAreas =
    focusRecommendations.length >= 2
      ? focusRecommendations
      : [...allRecommendations].sort((a, b) => a.completion - b.completion).slice(0, 4)

  const assessmentDate = new Date(scorecard.created_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.03),_transparent_35%),linear-gradient(to_bottom,_#f8fafc,_#f8fafc)]">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8" id="scorecard-report">
        {/* Report header */}
        <header className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <Link
                href={`/companies/${scorecard.company_id}`}
                className="no-print mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                aria-label="Back to company"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                  {scorecard.company?.name ?? 'Company'}
                </h1>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                  <Calendar className="h-4 w-4" />
                  Assessment date: {assessmentDate}
                </p>
              </div>
            </div>
            <div className="no-print shrink-0 flex items-center gap-3 flex-wrap justify-end">
              <GeneratePdfButton scorecardId={id} />
              <Link
                href={`/scorecards/${id}/edit`}
                className="no-print inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Edit scorecard
              </Link>
              <DeleteScorecardButton
                scorecardId={id}
                companyName={scorecard.company?.name ?? 'Company'}
                scoreLevel={scorecard.score_level}
                totalScore={Number(scorecard.total_score ?? 0)}
              />
            </div>
          </div>

          {/* Score dominance: visual anchor of the page */}
          <div className="mt-8 rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_40px_rgba(15,23,42,0.08)] overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-stretch">
              <div className="flex flex-1 flex-col items-center justify-center border-b border-slate-200 px-8 py-10 sm:border-b-0 sm:border-r sm:py-12 sm:px-10">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Total score
                </p>
                <p className="mt-3 text-6xl font-bold tabular-nums tracking-tight text-slate-950 sm:text-7xl">
                  {Number(scorecard.total_score ?? 0).toFixed(2)}
                </p>
                <p className="mt-2 text-sm text-slate-500">out of 100 points</p>
              </div>
              <div className="flex items-center justify-center border-t border-slate-200 bg-slate-100/80 px-8 py-8 sm:border-t-0 sm:border-l sm:min-w-[220px]">
                <div className="flex flex-col items-center text-center">
                  <Award className="mb-2 h-9 w-9 text-slate-600" />
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    REAP level
                  </p>
                  <span className="mt-2 inline-flex items-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xl font-semibold text-slate-900 shadow-sm">
                    {scorecard.score_level ?? '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Category breakdown — visual scanning with progress bars */}
        <section className="mb-12" aria-labelledby="category-breakdown-heading">
          <h2 id="category-breakdown-heading" className="mb-5 text-base font-semibold text-slate-900">
            Category breakdown
          </h2>
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_20px_rgba(15,23,42,0.04)] overflow-hidden">
            <div className="divide-y divide-slate-100">
              {sortedCategories.map((cat) => {
                const pct = cat.max_score > 0 ? Math.min(100, (cat.score / cat.max_score) * 100) : 0
                const isStrong = pct >= 80
                const isWeak = pct < 50
                const barBg = isStrong
                  ? 'bg-emerald-600'
                  : isWeak
                    ? 'bg-amber-500'
                    : 'bg-slate-700'
                return (
                  <div
                    key={cat.category_key}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-8 sm:py-5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">{cat.category_name}</p>
                      <p className="mt-0.5 text-sm tabular-nums text-slate-600">
                        {Number(cat.score).toFixed(2)} / {cat.max_score} points
                      </p>
                    </div>
                    <div className="flex flex-1 shrink-0 items-center gap-4 sm:max-w-xs">
                      <div className="h-3 flex-1 min-w-0 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={`h-full rounded-full transition-all ${barBg}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-12 shrink-0 text-right text-sm font-semibold tabular-nums text-slate-800">
                        {(pct).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* What this means — insight block */}
        <section className="mb-12" aria-labelledby="interpretation-heading">
          <h2 id="interpretation-heading" className="mb-5 text-base font-semibold text-slate-900">
            What this means
          </h2>
          <div className="rounded-2xl border border-slate-200/80 border-l-4 border-l-slate-800 bg-slate-50/60 px-6 py-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_20px_rgba(15,23,42,0.04)] sm:px-8 sm:py-8">
            <p className="text-base leading-relaxed text-slate-800 sm:text-[1.0625rem]">
              {interpretation}
            </p>
          </div>
        </section>

        {/* Recommended focus areas — priority clarity */}
        <section className="mb-12" aria-labelledby="focus-heading">
          <h2 id="focus-heading" className="mb-5 text-base font-semibold text-slate-900">
            Recommended focus areas
          </h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {focusAreas.map((rec) => (
              <div
                key={rec.category_key}
                className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_20px_rgba(15,23,42,0.04)] sm:p-6"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      rec.priority === 'high'
                        ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/80'
                        : rec.priority === 'medium'
                          ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/80'
                          : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200/80'
                    }`}
                  >
                    {rec.priority === 'high'
                      ? 'High priority'
                      : rec.priority === 'medium'
                        ? 'Medium priority'
                        : 'Focus area'}
                  </span>
                  <span className="text-sm tabular-nums text-slate-500">
                    {rec.currentScore} / {rec.maxScore}
                  </span>
                </div>
                <p className="mt-3 text-base font-semibold text-slate-900">
                  {rec.category_name}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  {rec.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Supporting detail: chart + gap table + insights */}
        <section className="mb-12" aria-labelledby="supporting-detail-heading">
          <h2 id="supporting-detail-heading" className="mb-5 text-base font-semibold text-slate-900">
            Supporting detail
          </h2>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="xl:col-span-2 space-y-6">
              <div
                id="performance-chart"
                className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_20px_rgba(15,23,42,0.04)] sm:p-6"
              >
                <h3 className="text-sm font-semibold text-slate-700">Performance by category</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Achieved vs. maximum possible per category.
                </p>
                <div className="mt-4">
                  <ScorecardChart data={chartData} />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_20px_rgba(15,23,42,0.04)] overflow-hidden">
                <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-4">
                  <h3 className="text-sm font-semibold text-slate-900">Score gap analysis</h3>
                  <p className="mt-0.5 text-xs text-slate-500">Achievement vs. category maximums</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[320px] text-left text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50/80">
                      <tr>
                        <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Category
                        </th>
                        <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Achieved
                        </th>
                        <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Max
                        </th>
                        <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                          Gap
                        </th>
                        <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                          %
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {gapSummary.categories.map((cat) => (
                        <tr key={cat.category_key} className="hover:bg-slate-50/70">
                          <td className="px-5 py-3 font-medium text-slate-900">
                            {cat.category_name}
                          </td>
                          <td className="px-5 py-3 text-right tabular-nums text-slate-900">
                            {cat.score}
                          </td>
                          <td className="px-5 py-3 text-right tabular-nums text-slate-500">
                            {cat.max_score}
                          </td>
                          <td className="px-5 py-3 text-right tabular-nums text-slate-500">
                            {cat.gap}
                          </td>
                          <td className="px-5 py-3 text-right tabular-nums text-slate-700">
                            {(cat.completion * 100).toFixed(0)}%
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t border-slate-200 bg-slate-50/70 font-semibold">
                        <td className="px-5 py-3 text-slate-900">Total</td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-900">
                          {scorecard.total_score}
                        </td>
                        <td className="px-5 py-3 text-right text-slate-500">–</td>
                        <td className="px-5 py-3 text-right text-slate-500">–</td>
                        <td className="px-5 py-3 text-right text-slate-500">–</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {gapSummary.strongestCategory && (
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_20px_rgba(15,23,42,0.04)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-600">
                    Strongest area
                  </p>
                  <p className="mt-1.5 font-medium text-slate-900">
                    {gapSummary.strongestCategory.category_name}
                  </p>
                  <p className="mt-1 text-sm tabular-nums text-slate-600">
                    {gapSummary.strongestCategory.score} / {gapSummary.strongestCategory.max_score} (
                    {(gapSummary.strongestCategory.completion * 100).toFixed(0)}%)
                  </p>
                </div>
              )}
              {gapSummary.weakestCategory && (
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_20px_rgba(15,23,42,0.04)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-600">
                    Weakest area
                  </p>
                  <p className="mt-1.5 font-medium text-slate-900">
                    {gapSummary.weakestCategory.category_name}
                  </p>
                  <p className="mt-1 text-sm tabular-nums text-slate-600">
                    {gapSummary.weakestCategory.score} / {gapSummary.weakestCategory.max_score} (
                    {(gapSummary.weakestCategory.completion * 100).toFixed(0)}%)
                  </p>
                </div>
              )}
              {gapSummary.biggestGapCategory && (
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_6px_20px_rgba(15,23,42,0.04)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-600">
                    Biggest opportunity
                  </p>
                  <p className="mt-1.5 font-medium text-slate-900">
                    {gapSummary.biggestGapCategory.category_name}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {gapSummary.biggestGapCategory.gap} points to maximum
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Consultant notes */}
        <section className="mb-12">
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-5 flex gap-3 sm:p-6">
            <StickyNote className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-slate-700">Consultant notes</p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                Use this report as the anchor document during executive read‑outs. Capture key
                decisions and agreed next steps alongside the scorecard in your engagement
                artefacts.
              </p>
            </div>
          </div>
        </section>

        {/* Improvement simulator — interactive tool emphasis */}
        <section className="pt-10 border-t border-slate-200/80">
          <ScoreImprovementSimulator
            originalTotal={scorecardResult.total_score}
            originalLevel={scorecardResult.score_level}
            categories={scorecardResult.category_results}
          />
        </section>
      </div>
    </div>
  )
}
