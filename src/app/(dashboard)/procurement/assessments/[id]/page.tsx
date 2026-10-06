import Link from 'next/link'
import { notFound } from 'next/navigation'
import { FileText, Pencil } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel, MoreOptions } from '@/components/ui/Panel'
import { Notice } from '@/components/ui/Notice'
import { ProgressSteps } from '@/components/ui/ProgressSteps'
import { Term } from '@/components/ui/Term'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { PROCUREMENT_STEPS, stepsFor } from '@/lib/flows'
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
import { ProcurementPdfDownloadButton } from '@/components/procurement/ProcurementPdfDownloadButton'
import { fetchAllRows } from '@/lib/procurement/supplierStore'

export default async function ProcurementAssessmentDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ created?: string; saved?: string }>
}) {
  const { id } = await params
  const query = (await searchParams) ?? {}
  const created = query.created === '1' || query.saved === '1'
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

  // Every supplier, page by page (a plain select stops at 1,000 rows).
  const { data: suppliers } = await fetchAllRows((from, to) =>
    db
      .from('procurement_suppliers')
      .select('*')
      .eq('assessment_id', assessment.id)
      .order('bbbee_spend', { ascending: false })
      .order('id', { ascending: true })
      .range(from, to),
  )

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
    const { data: spendRows } = await fetchAllRows((from, to) =>
      db
        .from('procurement_suppliers')
        .select('id, assessment_id, bbbee_spend')
        .in('assessment_id', [assessment.id, previousAssessment.id])
        .order('id', { ascending: true })
        .range(from, to),
    )

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
    <div className="space-y-6" data-tour="scorecard-workspace">
      <PageHeader
        crumbs={[
          { label: 'Companies', href: '/companies' },
          { label: company.name, href: `/companies/${company.id}` },
          { label: `Procurement ${assessment.assessment_year}` },
        ]}
        title={`Procurement scorecard ${assessment.assessment_year}`}
        description={`For ${company.name}. ${totalScore.toFixed(2)} of 29 points.`}
        actions={
          <>
            <Link href={`/procurement/assessments/${assessment.id}/report`} data-tour="reports" className={buttonStyles({ variant: 'primary' })}>
              <FileText className="h-4 w-4" aria-hidden /> Report
            </Link>
            <ProcurementPdfDownloadButton assessmentId={assessment.id} companyName={company.name} className={buttonStyles({ variant: 'secondary' })} />
            {isOwner ? (
              <Link href={`/procurement/assessments/${assessment.id}/edit`} className={buttonStyles({ variant: 'secondary' })}>
                <Pencil className="h-4 w-4" aria-hidden /> Edit
              </Link>
            ) : null}
          </>
        }
      />
      {created ? <Notice tone="ok" title="Procurement scorecard saved">Here is its score. You can edit it at any time.</Notice> : null}
      {!isOwner ? (
        <Notice tone="info" title="REAP staff view">You are viewing another user’s procurement scorecard. Only the owner can change it.</Notice>
      ) : null}
      <ProgressSteps steps={stepsFor('procurement', PROCUREMENT_STEPS.length - 1)} label="Procurement steps" />

      <div data-tour="results">
        <ProcurementReportSummaryBlock
          companyName={company.name}
          assessmentYear={assessment.assessment_year}
          procurementLevel={procurementLevel}
          totalScore={totalScore}
          totalMeasuredSpend={totalMeasuredSpend}
          totalBbbeeSpend={totalBbbeeSpend}
          recognisedSpendRatio={recognisedSpendRatio}
        />
      </div>

      {result ? (
        <section className="print-avoid-break-inside">
          <ProcurementScorecardTable result={result} tmpsDenominatorNote={tmpsDenominatorSourceLabel} />
        </section>
      ) : null}

      <Panel
        title="Count it towards a B-BBEE level"
        description={
          <>
            Procurement is one of the seven elements of the <Term k="fullScorecard">full scorecard</Term>. Open the company’s
            full scorecard, go to Preferential procurement and attach this one. There it counts for up to 25 points plus 2 bonus.
          </>
        }
      >
        <Link href={`/companies/${company.id}`} className={buttonStyles({ variant: 'secondary' })}>
          Go to {company.name}’s scorecards
        </Link>
      </Panel>

      {comparison ? <ProcurementAssessmentComparison comparison={comparison} /> : null}

      <WhatThisMeansSection content={whatThisMeans} />
      <RecommendationsSection items={recommendations} />

      <MoreOptions label="Full breakdown (summary, suppliers, categories and total spend)">
        <ExecutiveSummarySection
          totalScore={totalScore}
          procurementLevel={procurementLevel}
          totalMeasuredSpend={totalMeasuredSpend}
          totalBbbeeSpend={totalBbbeeSpend}
          recognisedSpendRatio={recognisedSpendRatio}
          tmpsDenominatorSourceLabel={tmpsDenominatorSourceLabel}
        />
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
            is_51_percent_flow_through: s.is_51_percent_flow_through,
          }))}
        />
        <CategoryInsightsSection insights={categoryInsights} strongestName={strongest?.name ?? null} weakestName={weakest?.name ?? null} />
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
      </MoreOptions>

      {isOwner ? (
        <div className="border-t border-line pt-5">
          <DeleteProcurementAssessmentButton assessmentId={assessment.id} companyName={company.name} assessmentYear={assessment.assessment_year} />
        </div>
      ) : null}
    </div>
  )
}
