import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, FileText, Download, Pencil } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { firstEmbeddedRow } from '@/utils/supabase/embed'
import { buildProcurementComparison } from '@/lib/procurement/compareAssessments'
import { buildProcurementResultFromRows, type ProcurementAssessmentResult } from '@/lib/procurement/assessment'
import {
  TMPS_EXCLUSIONS,
  TMPS_INCLUSIONS,
  calculateProcurementTmpsTotals,
  coerceProcurementTmpsInputsFromRecord,
} from '@/lib/procurement/tmps'
import { formatCurrency, formatPercentFromRatio } from '@/lib/procurement/format'
import type { ProcurementCategoryKey } from '@/lib/procurement/config'
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
} from './ProcurementAssessmentInsights'
import { ProcurementAssessmentComparison } from './ProcurementAssessmentComparison'
import { DeleteProcurementAssessmentButton } from './DeleteProcurementAssessmentButton'

export default async function ProcurementAssessmentDetailsPage({
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
  const { strongest, weakest } = getStrongestAndWeakestCategories(categoryInsights)
  const recommendations = buildProcurementRecommendations({
    insights: categoryInsights,
    mix,
  })
  const totalScore = result?.totalScore ?? 0
  const reapLevel = deriveProcurementReapLevel(totalScore)
  const executiveInterpretation = result
    ? getProcurementExecutiveInterpretation(reapLevel, totalScore)
    : 'No procurement category results are stored for this assessment yet. Results appear after a successful save with calculated categories.'

  const { data: previousAssessment } = await supabase
    .from('procurement_assessments')
    .select(
      'id, assessment_year, created_at, total_score, total_measured_procurement_spend',
    )
    .eq('company_id', assessment.company_id)
    .lt('created_at', assessment.created_at)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let comparison = null as ReturnType<typeof buildProcurementComparison> | null
  if (previousAssessment) {
    const { data: spendRows } = await supabase
      .from('procurement_suppliers')
      .select('assessment_id, bbbee_spend')
      .in('assessment_id', [assessment.id, previousAssessment.id])

    const sumBbbee = (aid: string) =>
      spendRows
        ?.filter((r) => r.assessment_id === aid)
        .reduce((s, r) => s + Number(r.bbbee_spend ?? 0), 0) ?? 0

    const { data: prevResultRows } = await supabase
      .from('procurement_results')
      .select('*')
      .eq('assessment_id', previousAssessment.id)

    const previousResult = prevResultRows?.length
      ? buildProcurementResultFromRows(
          prevResultRows as unknown as {
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

    comparison = buildProcurementComparison(
      {
        totalScore,
        totalMeasuredSpend,
        totalBbbeeSpend,
        categories: result?.categories ?? [],
      },
      {
        id: previousAssessment.id,
        assessmentYear: previousAssessment.assessment_year ?? null,
        createdAt: previousAssessment.created_at,
        totalScore:
          previousResult?.totalScore ??
          Number(previousAssessment.total_score ?? 0),
        totalMeasuredSpend: Number(
          previousAssessment.total_measured_procurement_spend ?? 0,
        ),
        totalBbbeeSpend: sumBbbee(previousAssessment.id),
        categories: previousResult?.categories ?? [],
      },
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/companies/${company.id}`}
            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Procurement Assessment
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {company.name} · {assessment.assessment_year}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/procurement/assessments/${assessment.id}/edit`}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Link>
          <Link
            href={`/procurement/assessments/${assessment.id}/report`}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50"
          >
            <FileText className="h-4 w-4" />
            View report
          </Link>
          <Link
            href={`/api/procurement/assessments/${assessment.id}/render-pdf`}
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-slate-800"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Link>
          <DeleteProcurementAssessmentButton
            assessmentId={assessment.id}
            companyName={company.name}
            assessmentYear={assessment.assessment_year}
          />
        </div>
      </div>

      {comparison ? (
        <ProcurementAssessmentComparison comparison={comparison} />
      ) : null}

      <ExecutiveSummarySection
        totalScore={totalScore}
        reapLevel={reapLevel}
        interpretation={executiveInterpretation}
        totalMeasuredSpend={totalMeasuredSpend}
        totalBbbeeSpend={totalBbbeeSpend}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <CategoryInsightsSection
            insights={categoryInsights}
            strongestName={strongest?.name ?? null}
            weakestName={weakest?.name ?? null}
          />

          <RecommendationsSection items={recommendations} />

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  TMPS breakdown
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  {hasTmpsBreakdown
                    ? 'Derived from the TMPS inclusions and exclusions inputs.'
                    : 'TMPS breakdown not captured for this assessment.'}
                </div>
              </div>

              <div className="text-right">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Total (denominator)
                </div>
                <div className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                  {formatCurrency(totalMeasuredSpend)}
                </div>
              </div>
            </div>

            {hasTmpsBreakdown && tmpsTotals ? (
              <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Inclusions
                  </div>
                  <div className="space-y-1 text-sm text-slate-700">
                    {TMPS_INCLUSIONS.map((line) => (
                      <div
                        key={line.key}
                        className="flex items-center justify-between gap-3"
                      >
                        <span>{line.label}</span>
                        <span className="font-semibold tabular-nums text-slate-900">
                          {formatCurrency(
                            Number(assessmentRecord[line.key] ?? 0),
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 border-t border-slate-200 pt-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold">Inclusions total</span>
                      <span className="font-semibold tabular-nums text-slate-900">
                        {formatCurrency(tmpsTotals.inclusionsTotal)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Exclusions
                  </div>
                  <div className="space-y-1 text-sm text-slate-700">
                    {TMPS_EXCLUSIONS.map((line) => (
                      <div
                        key={line.key}
                        className="flex items-center justify-between gap-3"
                      >
                        <span>{line.label}</span>
                        <span className="font-semibold tabular-nums text-slate-900">
                          {formatCurrency(
                            Number(assessmentRecord[line.key] ?? 0),
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 border-t border-slate-200 pt-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold">Exclusions total</span>
                      <span className="font-semibold tabular-nums text-slate-900">
                        {formatCurrency(tmpsTotals.exclusionsTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {hasTmpsBreakdown && tmpsTotals ? (
              <div className="mt-4 border-t border-slate-200 pt-3 text-sm text-slate-700">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-slate-900">TMPS Total</span>
                  <span className="font-semibold tabular-nums text-slate-900">
                    {formatCurrency(tmpsTotals.tmpsTotal)}
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Saved as `total_measured_procurement_spend`.
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-sm font-semibold text-slate-900">
                Detailed category breakdown
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Raw targets, achieved shares, points, and numerators for each procurement
                scorecard category.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">Category</th>
                    <th className="px-6 py-3 text-right">Target %</th>
                    <th className="px-6 py-3 text-right">Achieved %</th>
                    <th className="px-6 py-3 text-right">Points</th>
                    <th className="px-6 py-3 text-right">Numerator</th>
                    <th className="px-6 py-3 text-right">Denominator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result?.categories.map((cat) => (
                    <tr key={cat.key}>
                      <td className="px-6 py-3 text-slate-900 font-medium">
                        {cat.name}
                      </td>
                      <td className="px-6 py-3 text-right">
                        {formatPercentFromRatio(cat.targetPercent, 0)}
                      </td>
                      <td className="px-6 py-3 text-right">
                        {formatPercentFromRatio(cat.achievedPercent, 1)}
                      </td>
                      <td className="px-6 py-3 text-right">
                        {cat.pointsAchieved.toFixed(2)} /{' '}
                        {cat.availablePoints.toFixed(2)}
                      </td>
                      <td className="px-6 py-3 text-right">
                        {formatCurrency(cat.numeratorValue)}
                      </td>
                      <td className="px-6 py-3 text-right">
                        {formatCurrency(cat.denominatorValue)}
                      </td>
                    </tr>
                  ))}
                  {!result && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-8 text-center text-slate-500"
                      >
                        No procurement results captured for this assessment.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <SupplierImpactSection
            suppliers={supplierList}
            totalBbbeeSpend={totalBbbeeSpend}
            mix={{
              compliantCount: mix.compliantCount,
              nonCompliantCount: mix.nonCompliantCount,
              totalValueExVat: mix.totalValueExVat,
              nonCompliantValueExVat: mix.nonCompliantValueExVat,
            }}
          />
        </div>
      </div>
    </div>
  )
}

