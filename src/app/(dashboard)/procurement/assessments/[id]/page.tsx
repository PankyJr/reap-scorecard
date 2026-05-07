import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Building2, Calendar, Download, FileText, Pencil } from 'lucide-react'
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
  cardSurface,
  CategoryInsightsSection,
  ExecutiveSummarySection,
  RecommendationsSection,
  SupplierImpactSection,
} from './ProcurementAssessmentInsights'
import { ProcurementAssessmentComparison } from './ProcurementAssessmentComparison'
import { DeleteProcurementAssessmentButton } from './DeleteProcurementAssessmentButton'
import { buttonStyles } from '@/components/ui/buttonStyles'

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
    <div className="space-y-8">
      <div className="flex flex-col gap-4 border-b border-slate-200/90 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <Link
            href={`/companies/${company.id}`}
            className="shrink-0 rounded-full border border-transparent p-2 text-slate-500 transition hover:border-slate-200/80 hover:bg-white hover:text-slate-900 hover:shadow-sm"
            aria-label="Back to company"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-[1.75rem] sm:tracking-tighter">
              Procurement assessment
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm font-medium text-slate-600">
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-4 w-4 shrink-0" />
                {company.name}
              </span>
              <span className="text-slate-300">·</span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-4 w-4 shrink-0" />
                {assessment.assessment_year}
              </span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/companies/${company.id}`}
            className={buttonStyles({ variant: 'secondary', size: 'sm' })}
          >
            Back to Company
          </Link>
          <Link
            href={`/procurement/assessments/${assessment.id}/edit`}
            className={buttonStyles({ variant: 'secondary', size: 'sm' })}
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Link>
          <Link
            href={`/procurement/assessments/${assessment.id}/report`}
            className={buttonStyles({ variant: 'secondary', size: 'sm' })}
          >
            <FileText className="h-4 w-4" />
            View Procurement Result
          </Link>
          <Link
            href={`/api/procurement/assessments/${assessment.id}/render-pdf`}
            className={buttonStyles({ variant: 'primary', size: 'sm' })}
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

      <div className="space-y-7">
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_23rem]">
          <div className="min-w-0 space-y-6">
            <CategoryInsightsSection
              insights={categoryInsights}
              strongestName={strongest?.name ?? null}
              weakestName={weakest?.name ?? null}
            />

            <RecommendationsSection items={recommendations} />

            <div className={cardSurface}>
              <div className="border-b border-slate-100 bg-gradient-to-b from-slate-50/80 to-white px-6 py-5 sm:px-7 sm:py-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      TMPS breakdown
                    </p>
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
                      {hasTmpsBreakdown
                        ? 'Derived from the TMPS inclusions and exclusions inputs.'
                        : 'TMPS breakdown not captured for this assessment.'}
                    </p>
                  </div>
                  <div className="shrink-0 sm:border-l sm:border-slate-200/70 sm:pl-7">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      Total (denominator)
                    </p>
                    <p className="mt-1 text-right text-2xl font-semibold tabular-nums tracking-tight text-slate-950 sm:text-[1.65rem]">
                      {formatCurrency(totalMeasuredSpend)}
                    </p>
                  </div>
                </div>
              </div>

              {hasTmpsBreakdown && tmpsTotals ? (
                <div className="px-6 pb-6 pt-5 sm:px-7 sm:pb-7 sm:pt-6">
                  <div className="overflow-hidden rounded-2xl bg-slate-50/80 ring-1 ring-slate-900/[0.04]">
                    <div className="grid grid-cols-1 lg:grid-cols-2 lg:divide-x lg:divide-slate-200/60">
                      <div className="p-5 sm:p-6">
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                          Inclusions
                        </h3>
                        <div className="mt-4 divide-y divide-slate-200/60">
                          {TMPS_INCLUSIONS.map((line) => (
                            <div
                              key={line.key}
                              className="flex justify-between gap-4 py-2.5 first:pt-0"
                            >
                              <span className="text-xs font-medium leading-snug text-slate-500">
                                {line.label}
                              </span>
                              <span className="shrink-0 text-sm font-semibold tabular-nums tracking-tight text-slate-950">
                                {formatCurrency(Number(assessmentRecord[line.key] ?? 0))}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 flex justify-between gap-4 border-t border-slate-300/50 pt-3.5 text-sm font-semibold text-slate-900">
                          <span>Inclusions total</span>
                          <span className="tabular-nums tracking-tight text-slate-950">
                            {formatCurrency(tmpsTotals.inclusionsTotal)}
                          </span>
                        </div>
                      </div>
                      <div className="border-t border-slate-200/60 p-5 sm:p-6 lg:border-t-0">
                        <h3 className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                          Exclusions
                        </h3>
                        <div className="mt-4 divide-y divide-slate-200/60">
                          {TMPS_EXCLUSIONS.map((line) => (
                            <div
                              key={line.key}
                              className="flex justify-between gap-4 py-2.5 first:pt-0"
                            >
                              <span className="text-xs font-medium leading-snug text-slate-500">
                                {line.label}
                              </span>
                              <span className="shrink-0 text-sm font-semibold tabular-nums tracking-tight text-slate-950">
                                {formatCurrency(Number(assessmentRecord[line.key] ?? 0))}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 flex justify-between gap-4 border-t border-slate-300/50 pt-3.5 text-sm font-semibold text-slate-900">
                          <span>Exclusions total</span>
                          <span className="tabular-nums tracking-tight text-slate-950">
                            {formatCurrency(tmpsTotals.exclusionsTotal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-1 rounded-xl bg-gradient-to-br from-slate-100/95 via-slate-50 to-white px-5 py-4 ring-1 ring-slate-900/[0.05] sm:flex-row sm:items-baseline sm:justify-between sm:px-6 sm:py-5">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">TMPS total</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Saved as <span className="font-mono text-[11px] text-slate-600">total_measured_procurement_spend</span>.
                      </p>
                    </div>
                    <p className="text-right text-xl font-semibold tabular-nums tracking-tight text-slate-950 sm:text-2xl">
                      {formatCurrency(tmpsTotals.tmpsTotal)}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            <div className={cardSurface}>
              <div className="border-b border-slate-100 bg-gradient-to-b from-slate-50/90 to-slate-50/30 px-6 py-5 sm:px-8">
                <h2 className="text-lg font-semibold tracking-tight text-slate-950">
                  Detailed category breakdown
                </h2>
                <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600">
                  Targets, achieved shares, points, and numerators per category.
                </p>
              </div>
              <div className="min-w-0 overflow-x-auto">
                <table className="w-full min-w-0 table-fixed border-collapse text-left text-sm">
                  <colgroup>
                    <col className="w-[28%]" />
                    <col className="w-[11%]" />
                    <col className="w-[18%]" />
                    <col className="w-[14%]" />
                    <col className="w-[14.5%]" />
                    <col className="w-[14.5%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-slate-200/90 bg-slate-50/90 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 backdrop-blur-sm">
                      <th className="px-5 py-4 pl-6 text-left font-bold sm:px-6 sm:pl-8">
                        Category
                      </th>
                      <th className="px-3 py-4 text-right font-bold sm:px-4">Target %</th>
                      <th className="px-3 py-4 pr-2 text-right font-bold sm:px-4">Achieved %</th>
                      <th className="px-3 py-4 text-right font-bold sm:px-4">Points</th>
                      <th className="px-3 py-4 text-right font-bold sm:px-4">Numerator</th>
                      <th className="px-5 py-4 pr-6 text-right font-bold sm:px-6 sm:pr-8">
                        Denominator
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/90">
                    {result?.categories.map((cat) => {
                      const toTargetPct =
                        cat.targetPercent > 0
                          ? Math.min(100, (cat.achievedPercent / cat.targetPercent) * 100)
                          : 0
                      const achievedLabel = formatPercentFromRatio(cat.achievedPercent, 1)
                      return (
                        <tr
                          key={cat.key}
                          className="transition-[background-color] duration-150 odd:bg-white even:bg-slate-50/[0.28] hover:bg-slate-100/45"
                        >
                          <td className="break-words px-5 py-4 pl-6 align-middle text-[13px] font-semibold leading-snug tracking-tight text-slate-950 sm:px-6 sm:pl-8 sm:text-sm">
                            {cat.name}
                          </td>
                          <td className="px-3 py-4 text-right align-middle text-sm tabular-nums font-medium text-slate-500 sm:px-4">
                            {formatPercentFromRatio(cat.targetPercent, 0)}
                          </td>
                          <td className="px-3 py-4 pr-2 text-right align-middle sm:px-4">
                            <div className="ml-auto flex max-w-full items-center justify-end gap-2.5 sm:gap-3">
                              <div
                                className="h-2 min-h-[8px] min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200/95 p-px shadow-[inset_0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-inset ring-slate-900/[0.04]"
                                role="img"
                                aria-label={`Achieved ${achievedLabel} of target; ${Math.round(toTargetPct)}% of target share`}
                              >
                                <div
                                  className="h-full min-w-0 rounded-full bg-gradient-to-r from-slate-800 via-slate-600 to-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]"
                                  style={{ width: `${toTargetPct}%` }}
                                />
                              </div>
                              <span className="w-[3.5rem] shrink-0 text-right text-sm font-semibold tabular-nums tracking-tight text-slate-900 sm:w-16">
                                {achievedLabel}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-4 text-right align-middle tabular-nums sm:px-4">
                            <span className="text-sm font-semibold text-slate-950">
                              {cat.pointsAchieved.toFixed(2)}
                            </span>
                            <span className="text-sm font-normal text-slate-400"> / </span>
                            <span className="text-sm font-medium text-slate-600">
                              {cat.availablePoints.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-3 py-4 text-right align-middle text-sm tabular-nums font-medium text-slate-700 sm:px-4">
                            {formatCurrency(cat.numeratorValue)}
                          </td>
                          <td className="px-5 py-4 pr-6 text-right align-middle text-sm tabular-nums font-medium text-slate-700 sm:px-6 sm:pr-8">
                            {formatCurrency(cat.denominatorValue)}
                          </td>
                        </tr>
                      )
                    })}
                    {!result && (
                      <tr>
                        <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-500">
                          No procurement results captured for this assessment.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="min-w-0 lg:sticky lg:top-6 lg:self-start">
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
    </div>
  )
}

