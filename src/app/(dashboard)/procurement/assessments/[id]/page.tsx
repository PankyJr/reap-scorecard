import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Building2, Calendar, Download, FileText, Pencil } from 'lucide-react'
import { firstEmbeddedRow } from '@/utils/supabase/embed'
import { buildProcurementComparison } from '@/lib/procurement/compareAssessments'
import { buildProcurementResultFromRows, type ProcurementAssessmentResult } from '@/lib/procurement/assessment'
import {
  TMPS_EXCLUSIONS,
  TMPS_INCLUSIONS,
  calculateProcurementTmpsTotals,
  coerceProcurementTmpsInputsFromRecord,
} from '@/lib/procurement/tmps'
import { parseTmpsCustomLinesFromUnknown } from '@/lib/procurement/tmpsCustom'
import {
  parseTmpsDenominatorSource,
  tmpsDenominatorSourceTitle,
} from '@/lib/procurement/tmpsDenominator'
import type { ProcurementCategoryKey } from '@/lib/procurement/config'
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
} from './ProcurementAssessmentInsights'
import { ProcurementAssessmentComparison } from './ProcurementAssessmentComparison'
import { DeleteProcurementAssessmentButton } from './DeleteProcurementAssessmentButton'
import { resolveTenantReadContext } from '@/lib/admin/tenant-read-context'
import { ProcurementScorecardTable } from '@/components/procurement/ProcurementScorecardTable'

export default async function ProcurementAssessmentDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
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

  const tmpsDenominatorSource = parseTmpsDenominatorSource(
    assessmentRecord.tmps_denominator_source as string | null | undefined,
  )
  const tmpsDenominatorSourceLabel =
    tmpsDenominatorSourceTitle(tmpsDenominatorSource)

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
  const { strongest, weakest } = getStrongestAndWeakestCategories(categoryInsights)
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

  const { data: previousAssessment } = await db
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
    const { data: spendRows } = await db
      .from('procurement_suppliers')
      .select('assessment_id, bbbee_spend')
      .in('assessment_id', [assessment.id, previousAssessment.id])

    const sumBbbee = (aid: string) =>
      spendRows
        ?.filter((r) => r.assessment_id === aid)
        .reduce((s, r) => s + Number(r.bbbee_spend ?? 0), 0) ?? 0

    const { data: prevResultRows } = await db
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
      <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
        <div className="flex min-w-0 items-start gap-4">
          <Link
            href={`/companies/${company.id}`}
            className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-600 transition hover:border-slate-400 hover:text-slate-950"
            aria-label="Back to company"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </Link>

          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              Procurement
            </p>
            <h1 className="mt-1 text-4xl font-semibold tracking-[-0.055em] text-slate-950 sm:text-5xl lg:text-[52px] lg:leading-[0.95]">
              Assessment
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-500">
              <span className="inline-flex min-w-0 items-center gap-2">
                <Building2 className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                <span className="truncate font-medium text-slate-700">{company.name}</span>
              </span>
              <span className="h-1 w-1 shrink-0 rounded-full bg-slate-300" aria-hidden />
              <span className="inline-flex items-center gap-2 tabular-nums">
                <Calendar className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                <span className="font-medium text-slate-700">{assessment.assessment_year}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-stretch gap-2.5 sm:items-start lg:items-end">
          <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">
            <Link
              href={`/companies/${company.id}`}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950"
            >
              Back to Company
            </Link>
            {isOwner ? (
              <Link
                href={`/procurement/assessments/${assessment.id}/edit`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950"
              >
                <Pencil className="h-4 w-4 text-slate-500" aria-hidden />
                Edit
              </Link>
            ) : null}
            <Link
              href={`/procurement/assessments/${assessment.id}/report`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950"
            >
              <FileText className="h-4 w-4 text-slate-500" aria-hidden />
              View Procurement Result
            </Link>
            <Link
              href={`/api/procurement/assessments/${assessment.id}/render-pdf`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-950 bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-900"
            >
              <Download className="h-4 w-4" aria-hidden />
              Download PDF
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">
            {isOwner ? (
              <DeleteProcurementAssessmentButton
                assessmentId={assessment.id}
                companyName={company.name}
                assessmentYear={assessment.assessment_year}
              />
            ) : null}
          </div>
        </div>
      </header>

      <div className="space-y-7">
        {comparison ? (
          <ProcurementAssessmentComparison comparison={comparison} />
        ) : null}

        <ProcurementReportSummaryBlock
          companyName={company.name}
          assessmentYear={assessment.assessment_year}
          procurementLevel={procurementLevel}
          totalScore={totalScore}
          totalMeasuredSpend={totalMeasuredSpend}
          totalBbbeeSpend={totalBbbeeSpend}
          recognisedSpendRatio={recognisedSpendRatio}
        />

        <ExecutiveSummarySection
          totalScore={totalScore}
          procurementLevel={procurementLevel}
          totalMeasuredSpend={totalMeasuredSpend}
          totalBbbeeSpend={totalBbbeeSpend}
          recognisedSpendRatio={recognisedSpendRatio}
          tmpsDenominatorSourceLabel={tmpsDenominatorSourceLabel}
        />

        {result ? (
          <section className="print-avoid-break-inside">
            <ProcurementScorecardTable
              result={result}
              tmpsDenominatorNote={tmpsDenominatorSourceLabel}
            />
          </section>
        ) : null}

        <WhatThisMeansSection content={whatThisMeans} />

        <ImportSourceCard
          workbookName={importMeta.import_workbook_name ?? null}
          sheetName={importMeta.import_sheet_name ?? null}
          supplierCount={supplierList.length}
          assessmentYear={assessment.assessment_year}
          tmpsDenominatorSourceLabel={tmpsDenominatorSourceLabel}
        />

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

        <CategoryInsightsSection
          insights={categoryInsights}
          strongestName={strongest?.name ?? null}
          weakestName={weakest?.name ?? null}
        />

        <RecommendationsSection items={recommendations} />

        <TmpsBreakdownSection
          hasTmpsBreakdown={hasTmpsBreakdown}
          assessmentRecord={assessmentRecord}
          tmpsTotals={tmpsTotals}
          totalMeasuredSpend={totalMeasuredSpend}
          tmpsDenominatorSource={tmpsDenominatorSource}
          customInclusionLines={customTmpsInclusions}
          customExclusionLines={customTmpsExclusions}
        />

        <DetailedCategoryBreakdownSection
          categories={result?.categories ?? []}
          strongestName={strongest?.name ?? null}
          weakestName={weakest?.name ?? null}
        />
      </div>
    </div>
  )
}

