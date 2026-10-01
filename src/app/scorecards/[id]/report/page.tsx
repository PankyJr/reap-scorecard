import { createClient } from '@/utils/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { ScorecardChart } from '@/components/charts/ScorecardChart'
import { analyseGaps } from '@/lib/scorecard/analysis'
import { generateRecommendations } from '@/lib/scorecard/recommendations'
import type { ScorecardResult } from '@/lib/scorecard/calculateScorecard'
import { AutoPrint } from '@/components/scorecards/AutoPrint'
import { ReportToolbar } from '@/components/reports/ReportToolbar'

export default async function ScorecardReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ print?: string }>
}) {
  const { id } = await params
  const { print } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: scorecard } = await supabase
    .from('scorecards')
    .select(
      `
      *,
      company:companies(*)
    `,
    )
    .eq('id', id)
    .single()

  const company = Array.isArray(scorecard?.company) ? scorecard?.company?.[0] : scorecard?.company
  if (!scorecard || !company || company.owner_id !== user.id) {
    notFound()
  }

  const { data: results } = await supabase
    .from('scorecard_results')
    .select('*')
    .eq('scorecard_id', scorecard.id)
    .order('category_name')

  const chartData =
    results?.map((r) => ({
      name: r.category_name.replace(' Development', ''),
      score: Number(r.score),
      max_score: Number(r.max_score),
    })) ?? []

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
  const recommendations = generateRecommendations(scorecardResult)

  return (
    <div
      className="report-page min-h-screen bg-surface text-ink"
      id="scorecard-report-root"
    >
      {print === '1' && <AutoPrint />}
      <main
        id="report-root"
        className="max-w-3xl mx-auto py-10 px-6 space-y-8 text-sm leading-relaxed"
      >
        <ReportToolbar
          backHref={`/scorecards/${id}`}
          backLabel="Back to scorecard"
          pdfApiPath={`/api/scorecards/${encodeURIComponent(id)}/render-pdf`}
          filenameBase={`REAP-Scorecard-${company.name}`}
        />
        {/* Report header */}
        <header className="border-b border-line pb-4 mb-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold tracking-[0.18em] uppercase text-muted">
                REAP SOLUTIONS
              </div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">
                Procurement Scorecard Executive Report
              </h1>
            </div>
            <div className="text-right text-sm text-muted">
              <div>{new Date(scorecard.created_at).toLocaleDateString()}</div>
              <div className="mt-0.5">
                Ref: {scorecard.company.name} · Scorecard
              </div>
            </div>
          </div>
        </header>

        {/* Executive Summary */}
        <section className="report-section">
          <h2 className="text-sm font-semibold text-muted ">
            Executive Summary
          </h2>
          <p className="mt-3">
            {scorecard.company.name} currently achieves{' '}
            <span className="font-semibold">
              {scorecard.total_score} points
            </span>{' '}
            at <span className="font-semibold">{scorecard.score_level}</span>{' '}
            level. This assessment provides a concise view of overall
            performance, highlights the primary areas of strength, and pinpoints
            high‑impact opportunities to improve procurement compliance and
            contribution.
          </p>
        </section>

        {/* Score Overview & Metadata */}
        <section className="report-section grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-semibold text-muted ">
              Score Overview
            </h3>
            <div className="mt-3 text-3xl font-black text-ink">
              {scorecard.score_level}
            </div>
            <div className="mt-1 text-sm text-ink">
              {scorecard.total_score} total points
            </div>
          </div>
          <div className="text-sm text-ink space-y-1">
            <div>
              <span className="font-semibold">Company: </span>
              <span>{scorecard.company.name}</span>
            </div>
            {scorecard.company.industry && (
              <div>
                <span className="font-semibold">Industry: </span>
                <span>{scorecard.company.industry}</span>
              </div>
            )}
            <div>
              <span className="font-semibold">Assessment Date: </span>
              <span>
                {new Date(scorecard.created_at).toLocaleString()}
              </span>
            </div>
          </div>
        </section>

        {/* Performance Breakdown chart */}
        <section className="report-section print-break-after mb-6">
          <h3 className="text-sm font-semibold text-muted ">
            Performance Breakdown
          </h3>
          <p className="mt-2 text-sm text-muted">
            Category performance relative to maximum attainable score.
          </p>
          <div className="mt-4 rounded-xl border border-line bg-surface p-6 shadow-sm">
            <ScorecardChart data={chartData} />
          </div>
        </section>

        {/* Score Gap Analysis */}
        <section className="report-section mt-14">
          <h3 className="text-sm font-semibold text-muted ">
            Score Gap Analysis
          </h3>
          <p className="mt-2 text-sm text-muted">
            Comparison of achieved scores to category maximums, highlighting
            residual gaps and completion percentages.
          </p>
          <table className="mt-4 w-full text-sm border-t border-line">
            <thead className="text-muted">
              <tr className="border-b border-line">
                <th className="py-2 pr-2 text-left">Category</th>
                <th className="py-2 px-2 text-right">Achieved</th>
                <th className="py-2 px-2 text-right">Max</th>
                <th className="py-2 px-2 text-right">Gap</th>
                <th className="py-2 pl-2 text-right">% Complete</th>
              </tr>
            </thead>
            <tbody>
              {gapSummary.categories.map((cat) => (
                <tr key={cat.category_key} className="border-b border-line">
                  <td className="py-1.5 pr-2 font-medium text-ink">
                    {cat.category_name}
                  </td>
                  <td className="py-1.5 px-2 text-right text-ink">
                    {cat.score}
                  </td>
                  <td className="py-1.5 px-2 text-right text-ink">
                    {cat.max_score}
                  </td>
                  <td className="py-1.5 px-2 text-right text-ink">
                    {cat.gap}
                  </td>
                  <td className="py-1.5 pl-2 text-right text-ink">
                    {(cat.completion * 100).toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Improvement Opportunities */}
        <div className="print-page-break" />
        <section className="report-section print-break-before">
          <h3 className="text-sm font-semibold text-muted ">
            Improvement Opportunities
          </h3>
          <p className="mt-2 text-sm text-muted">
            Priority‑ranked focus areas based on relative performance and
            remaining gap to maximum score.
          </p>
          <div className="mt-3 space-y-3">
            {recommendations.map((rec) => (
              <div
                key={rec.category_key}
                className="border border-line rounded-md px-3 py-2 print-avoid-break-inside"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-ink">
                    {rec.category_name}
                  </span>
                  <span>
                    {rec.currentScore} / {rec.maxScore} (
                    {(rec.completion * 100).toFixed(0)}% · gap {rec.gap})
                  </span>
                </div>
                <div className="mt-1 text-sm font-semibold text-ink">
                  {rec.title}
                </div>
                <p className="mt-0.5 text-sm text-muted">
                  {rec.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Assessment metadata footer */}
        <footer className="pt-4 mt-4 border-t border-line text-sm text-muted">
          <div>Prepared by REAP Solutions · Internal consulting use.</div>
          <div className="mt-0.5">
            This report summarises the current scorecard position and should be
            read in conjunction with detailed engagement notes.
          </div>
        </footer>
      </main>
    </div>
  )
}

