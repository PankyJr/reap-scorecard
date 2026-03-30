import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { firstEmbeddedRow } from '@/utils/supabase/embed'
import {
  buildProcurementResultFromRows,
  type ProcurementAssessmentResult,
} from '@/lib/procurement/assessment'
import type { ProcurementCategoryKey } from '@/lib/procurement/config'
import { formatCurrency, formatPercentFromRatio } from '@/lib/procurement/format'
import {
  TMPS_EXCLUSIONS,
  TMPS_INCLUSIONS,
  calculateProcurementTmpsTotals,
  coerceProcurementTmpsInputsFromRecord,
} from '@/lib/procurement/tmps'
import {
  buildCategoryInsights,
  buildProcurementRecommendations,
  deriveProcurementReapLevel,
  getProcurementExecutiveInterpretation,
  getStrongestAndWeakestCategories,
  summarizeSupplierMix,
} from '@/lib/procurement/insights'
import {
  CategoryInsightsSection,
  ExecutiveSummarySection,
  RecommendationsSection,
  SupplierImpactSection,
} from '@/app/(dashboard)/procurement/assessments/[id]/ProcurementAssessmentInsights'

export default async function ProcurementReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ print?: string }>
}) {
  const { id } = await params
  await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: assessment } = await supabase
    .from('procurement_assessments')
    .select(
      `
      *,
      company:companies(*)
    `,
    )
    .eq('id', id)
    .single()

  type CompanyRow = { id: string; name: string; owner_id: string | null }
  const company = firstEmbeddedRow(
    assessment?.company as CompanyRow | CompanyRow[] | null | undefined,
  )
  if (!assessment || !company || company.owner_id !== user.id) {
    notFound()
  }

  const { data: suppliers } = await supabase
    .from('procurement_suppliers')
    .select('*')
    .eq('assessment_id', assessment.id)
    .order('bbbee_spend', { ascending: false })

  const { data: resultRows } = await supabase
    .from('procurement_results')
    .select('*')
    .eq('assessment_id', assessment.id)
    .order('category_name')

  const result: ProcurementAssessmentResult | null = resultRows
    ? buildProcurementResultFromRows(
        resultRows as unknown as {
          category_key: ProcurementCategoryKey
          category_name: string
          target_percent: number
          available_points: number
          achieved_percent: number
          points_achieved: number
          numerator_value: number
          denominator_value: number
        }[],
      )
    : null

  const totalMeasuredSpend =
    Number(assessment.total_measured_procurement_spend ?? 0) || 0

  type AssessmentTmpsRecord = Record<
    string,
    number | string | null | undefined
  >
  const assessmentRecord = assessment as unknown as AssessmentTmpsRecord

  const tmpsFieldKeys = [
    ...TMPS_INCLUSIONS.map((l) => l.key),
    ...TMPS_EXCLUSIONS.map((l) => l.key),
  ]

  const hasTmpsBreakdown = tmpsFieldKeys.some((key) => {
    const value = assessmentRecord[key]
    return value !== null && value !== undefined
  })

  const tmpsInputs = hasTmpsBreakdown
    ? coerceProcurementTmpsInputsFromRecord(assessmentRecord)
    : null

  const tmpsTotals = tmpsInputs
    ? calculateProcurementTmpsTotals(tmpsInputs)
    : null

  const totalBbbeeSpend =
    suppliers?.reduce(
      (sum, row) => sum + Number(row.bbbee_spend ?? 0),
      0,
    ) ?? 0

  const supplierList = suppliers ?? []
  const mix = summarizeSupplierMix(supplierList, totalMeasuredSpend)
  const categoryInsights = result
    ? buildCategoryInsights(result.categories)
    : []
  const { strongest, weakest } =
    getStrongestAndWeakestCategories(categoryInsights)
  const recommendations = buildProcurementRecommendations({
    insights: categoryInsights,
    mix,
  })
  const totalScore = result?.totalScore ?? 0
  const reapLevel = deriveProcurementReapLevel(totalScore)
  const executiveInterpretation = result
    ? getProcurementExecutiveInterpretation(reapLevel, totalScore)
    : 'No procurement category results are stored for this assessment yet. Results appear after a successful save with calculated categories.'

  return (
    <div
      className="report-page min-h-screen bg-white text-slate-900"
      id="procurement-report-root"
    >
      <main className="mx-auto max-w-3xl space-y-10 px-6 py-10 text-sm leading-relaxed">
        <header className="mb-2 flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-xs font-semibold tracking-[0.18em] text-slate-500">
              REAP SOLUTIONS
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              Procurement assessment report
            </h1>
            <p className="mt-2 text-xs text-slate-600">
              {company.name} · Assessment year {assessment.assessment_year}
            </p>
          </div>
          <div className="text-left text-xs text-slate-500 sm:text-right">
            <div>Generated {new Date().toLocaleDateString()}</div>
            <div className="mt-0.5">Assessment saved {new Date(assessment.created_at).toLocaleDateString()}</div>
          </div>
        </header>

        <section className="report-section print-avoid-break-inside">
          <ExecutiveSummarySection
            totalScore={totalScore}
            reapLevel={reapLevel}
            interpretation={executiveInterpretation}
            totalMeasuredSpend={totalMeasuredSpend}
            totalBbbeeSpend={totalBbbeeSpend}
          />
        </section>

        <section className="report-section print-avoid-break-inside">
          <CategoryInsightsSection
            insights={categoryInsights}
            strongestName={strongest?.name ?? null}
            weakestName={weakest?.name ?? null}
          />
        </section>

        {recommendations.length > 0 ? (
          <section className="report-section print-avoid-break-inside">
            <RecommendationsSection items={recommendations} />
          </section>
        ) : null}

        <section className="report-section space-y-4 print-avoid-break-inside">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              TMPS breakdown
            </h2>
            <p className="mt-1 text-xs text-slate-600">
              {hasTmpsBreakdown && tmpsTotals
                ? 'Derived from the TMPS inclusions and exclusions inputs.'
                : 'TMPS breakdown not captured for this assessment.'}
            </p>
          </div>

          {hasTmpsBreakdown && tmpsTotals ? (
            <>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Inclusions total
                  </div>
                  <div className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                    {formatCurrency(tmpsTotals.inclusionsTotal)}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Exclusions total
                  </div>
                  <div className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                    {formatCurrency(tmpsTotals.exclusionsTotal)}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  TMPS total (saved denominator)
                </div>
                <div className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                  {formatCurrency(tmpsTotals.tmpsTotal)}
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  Saved as total measured procurement spend on the assessment record.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <div className="text-xs font-semibold text-slate-600">
                    Inclusions
                  </div>
                  <table className="mt-2 w-full text-xs">
                    <tbody>
                      {TMPS_INCLUSIONS.map((line) => (
                        <tr key={line.key} className="border-b border-slate-100">
                          <td className="py-1 pr-2 text-left text-slate-700">
                            {line.label}
                          </td>
                          <td className="py-1 text-right font-semibold tabular-nums text-slate-900">
                            {formatCurrency(
                              Number(assessmentRecord[line.key] ?? 0),
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-600">
                    Exclusions
                  </div>
                  <table className="mt-2 w-full text-xs">
                    <tbody>
                      {TMPS_EXCLUSIONS.map((line) => (
                        <tr key={line.key} className="border-b border-slate-100">
                          <td className="py-1 pr-2 text-left text-slate-700">
                            {line.label}
                          </td>
                          <td className="py-1 text-right font-semibold tabular-nums text-slate-900">
                            {formatCurrency(
                              Number(assessmentRecord[line.key] ?? 0),
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Total (denominator)
              </div>
              <div className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                {formatCurrency(totalMeasuredSpend)}
              </div>
            </div>
          )}
        </section>

        <section className="report-section space-y-3 print-avoid-break-inside">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Detailed category breakdown
          </h2>
          <p className="text-xs text-slate-600">
            Raw targets, achieved shares, points, numerators, and denominators for each
            procurement scorecard category.
          </p>
          <table className="mt-3 w-full border-t border-slate-200 text-xs">
            <thead className="text-slate-500">
              <tr className="border-b border-slate-200">
                <th className="py-2 pr-2 text-left">Category</th>
                <th className="px-1 py-2 text-right">Target %</th>
                <th className="px-1 py-2 text-right">Achieved %</th>
                <th className="px-1 py-2 text-right">Points</th>
                <th className="px-1 py-2 text-right">Numerator</th>
                <th className="py-2 pl-1 text-right">Denominator</th>
              </tr>
            </thead>
            <tbody>
              {result?.categories.map((cat) => (
                <tr key={cat.key} className="border-b border-slate-100">
                  <td className="py-1.5 pr-2 font-medium text-slate-900">
                    {cat.name}
                  </td>
                  <td className="px-1 py-1.5 text-right text-slate-700">
                    {formatPercentFromRatio(cat.targetPercent, 0)}
                  </td>
                  <td className="px-1 py-1.5 text-right text-slate-900">
                    {formatPercentFromRatio(cat.achievedPercent, 1)}
                  </td>
                  <td className="px-1 py-1.5 text-right text-slate-900">
                    {cat.pointsAchieved.toFixed(2)} /{' '}
                    {cat.availablePoints.toFixed(2)}
                  </td>
                  <td className="px-1 py-1.5 text-right text-slate-900">
                    {formatCurrency(cat.numeratorValue)}
                  </td>
                  <td className="py-1.5 pl-1 text-right text-slate-900">
                    {formatCurrency(cat.denominatorValue)}
                  </td>
                </tr>
              ))}
              {!result && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-4 text-center text-slate-500"
                  >
                    No procurement results captured for this assessment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="report-section print-break-before print-avoid-break-inside">
          <SupplierImpactSection
            suppliers={supplierList}
            totalBbbeeSpend={totalBbbeeSpend}
            mix={{
              compliantCount: mix.compliantCount,
              nonCompliantCount: mix.nonCompliantCount,
              totalValueExVat: mix.totalValueExVat,
              nonCompliantValueExVat: mix.nonCompliantValueExVat,
            }}
            layout="report"
          />
        </section>

        <footer className="mt-8 border-t border-slate-200 pt-4 text-[11px] text-slate-500">
          <div>Prepared by REAP Solutions · Procurement scorecard module.</div>
          <p className="mt-1 leading-relaxed">
            This report mirrors the in-app assessment view: executive summary, category
            insights, recommendations, TMPS context, detailed categories, and supplier
            impact. Use alongside your underlying supplier schedule and certificates.
          </p>
        </footer>
      </main>
    </div>
  )
}
