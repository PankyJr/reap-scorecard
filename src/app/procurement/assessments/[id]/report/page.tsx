import { notFound } from 'next/navigation'
import { firstEmbeddedRow } from '@/utils/supabase/embed'
import {
  buildProcurementResultFromRows,
  type ProcurementAssessmentResult,
} from '@/lib/procurement/assessment'
import type { ProcurementCategoryKey } from '@/lib/procurement/config'
import {
  TMPS_EXCLUSIONS,
  TMPS_INCLUSIONS,
  calculateProcurementTmpsTotals,
  coerceProcurementTmpsInputsFromRecord,
} from '@/lib/procurement/tmps'
import { parseTmpsCustomLinesFromUnknown } from '@/lib/procurement/tmpsCustom'
import {
  buildCategoryInsights,
  buildProcurementRecommendations,
  buildProcurementWhatThisMeans,
  deriveProcurementReapLevel,
  getStrongestAndWeakestCategories,
  summarizeSupplierMix,
} from '@/lib/procurement/insights'
import {
  CategoryInsightsSection,
  DetailedCategoryBreakdownSection,
  ExecutiveSummarySection,
  ImportSourceCard,
  ProcurementReportSummaryBlock,
  RecognisedSupplierBreakdownSection,
  RecommendationsSection,
  TmpsBreakdownSection,
  WhatThisMeansSection,
} from '@/app/(dashboard)/procurement/assessments/[id]/ProcurementAssessmentInsights'
import { resolveTenantReadContext } from '@/lib/admin/tenant-read-context'

export default async function ProcurementReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ print?: string }>
}) {
  const { id } = await params
  await searchParams

  const { user, db, isReapInternalAdmin: isReapAdminViewer } = await resolveTenantReadContext()

  const { data: assessment } = await db
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
  const isOwner = Boolean(company?.owner_id && company.owner_id === user.id)
  if (!assessment || !company || (!isReapAdminViewer && !isOwner)) {
    notFound()
  }

  const { data: suppliers } = await db
    .from('procurement_suppliers')
    .select('*')
    .eq('assessment_id', assessment.id)
    .order('bbbee_spend', { ascending: false })

  const { data: resultRows } = await db
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

  const customTmpsInclusions = parseTmpsCustomLinesFromUnknown(
    assessmentRecord.tmps_custom_inclusions,
  )
  const customTmpsExclusions = parseTmpsCustomLinesFromUnknown(
    assessmentRecord.tmps_custom_exclusions,
  )

  const hasStandardTmpsLine = tmpsFieldKeys.some((key) => {
    const value = assessmentRecord[key]
    return value !== null && value !== undefined
  })

  const hasTmpsBreakdown =
    hasStandardTmpsLine ||
    customTmpsInclusions.length > 0 ||
    customTmpsExclusions.length > 0

  const tmpsInputs = hasTmpsBreakdown
    ? coerceProcurementTmpsInputsFromRecord(assessmentRecord)
    : null

  const tmpsTotals =
    tmpsInputs !== null
      ? calculateProcurementTmpsTotals(tmpsInputs, {
          inclusions: customTmpsInclusions,
          exclusions: customTmpsExclusions,
        })
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
  const procurementLevel = deriveProcurementReapLevel(totalScore)
  const recognisedSpendRatio =
    totalMeasuredSpend > 0 ? totalBbbeeSpend / totalMeasuredSpend : 0

  const whatThisMeans =
    result && categoryInsights.length
      ? buildProcurementWhatThisMeans({
          totalScore,
          insights: categoryInsights,
        })
      : null

  const importMeta = assessment as {
    import_workbook_name?: string | null
    import_sheet_name?: string | null
  }

  return (
    <div
      className="report-page min-h-screen bg-white text-slate-900"
      id="procurement-report-root"
    >
      <main className="mx-auto max-w-5xl space-y-10 px-6 py-10 text-sm leading-relaxed print:max-w-none print:px-8">
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
            <div className="mt-0.5">
              Assessment saved {new Date(assessment.created_at).toLocaleDateString()}
            </div>
          </div>
        </header>

        <section className="report-section print-avoid-break-inside">
          <ProcurementReportSummaryBlock
            companyName={company.name}
            assessmentYear={assessment.assessment_year}
            procurementLevel={procurementLevel}
            totalScore={totalScore}
            totalMeasuredSpend={totalMeasuredSpend}
            totalBbbeeSpend={totalBbbeeSpend}
            recognisedSpendRatio={recognisedSpendRatio}
          />
        </section>

        <section className="report-section print-avoid-break-inside">
          <ExecutiveSummarySection
            totalScore={totalScore}
            procurementLevel={procurementLevel}
            totalMeasuredSpend={totalMeasuredSpend}
            totalBbbeeSpend={totalBbbeeSpend}
            recognisedSpendRatio={recognisedSpendRatio}
          />
        </section>

        <section className="report-section print-avoid-break-inside">
          <WhatThisMeansSection content={whatThisMeans} />
        </section>

        <section className="report-section print-avoid-break-inside">
          <ImportSourceCard
            workbookName={importMeta.import_workbook_name ?? null}
            sheetName={importMeta.import_sheet_name ?? null}
            supplierCount={supplierList.length}
            assessmentYear={assessment.assessment_year}
          />
        </section>

        <section className="report-section print-avoid-break-inside">
          <RecognisedSupplierBreakdownSection
            suppliers={supplierList.map((s) => ({
              id: s.id,
              supplier_name: s.supplier_name,
              supplier_type: s.supplier_type,
              level: s.level,
              value_ex_vat: s.value_ex_vat,
              bbbee_spend: s.bbbee_spend,
              recognition_percent: s.recognition_percent,
              is_51_black_owned: s.is_51_black_owned,
              is_30_black_women_owned: s.is_30_black_women_owned,
              is_51_bdgs: s.is_51_bdgs,
            }))}
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

        <section className="report-section print-avoid-break-inside">
          <TmpsBreakdownSection
            hasTmpsBreakdown={hasTmpsBreakdown}
            assessmentRecord={assessmentRecord}
            tmpsTotals={tmpsTotals}
            totalMeasuredSpend={totalMeasuredSpend}
            customInclusionLines={customTmpsInclusions}
            customExclusionLines={customTmpsExclusions}
          />
        </section>

        <section className="report-section print-avoid-break-inside">
          <DetailedCategoryBreakdownSection
            categories={result?.categories ?? []}
            strongestName={strongest?.name ?? null}
            weakestName={weakest?.name ?? null}
          />
        </section>

        <footer className="mt-8 border-t border-slate-200 pt-4 text-[11px] text-slate-500">
          <div>Prepared by REAP Solutions · Procurement scorecard module.</div>
          <p className="mt-1 leading-relaxed">
            This report mirrors the in-app assessment view: executive summary, category
            insights, recommended actions, TMPS context, detailed categories, and
            recognised supplier breakdown. Use alongside your underlying supplier
            schedule and certificates.
          </p>
        </footer>
      </main>
    </div>
  )
}
