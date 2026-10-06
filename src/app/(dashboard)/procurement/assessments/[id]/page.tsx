import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, FileText, Pencil } from 'lucide-react'
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
  getStrongestAndWeakestCategories,
  summarizeSupplierMix,
} from '@/lib/procurement/insights'
import {
  CategoryInsightsSection,
  DetailedCategoryBreakdownSection,
  ImportSourceCard,
  RecognisedSupplierBreakdownSection,
  RecommendationsSection,
  TmpsBreakdownSection,
  WhatThisMeansSection,
} from './ProcurementAssessmentInsights'
import { ProcurementAssessmentComparison } from './ProcurementAssessmentComparison'
import { DeleteProcurementAssessmentButton } from './DeleteProcurementAssessmentButton'
import { resolveTenantReadContext } from '@/lib/admin/tenant-read-context'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProcurementPdfDownloadButton } from '@/components/procurement/ProcurementPdfDownloadButton'
import { PendingSubmitButton } from '@/components/ui/PendingSubmitButton'
import { ProcurementScoreLines } from '@/components/procurement/ProcurementScoreLines'
import {
  HowIsThisCalculated,
  ProcurementScoreHeadline,
  procurementLineViews,
} from '@/components/procurement/ProcurementScoreSummary'
import { ProcurementTargetsNotice } from '@/components/procurement/ProcurementTargetsNotice'
import {
  PROCUREMENT_LINE_AMOUNT_FIELD,
  biggestProcurementGapSentence,
  summariseProcurementScore,
  suppliersForProcurementLine,
} from '@/lib/procurement/scoreSummary'
import { analyseNeedsAttention, certificateReferenceDate, expiredAndNotCounting } from '@/lib/procurement/needsAttention'
import { parseReviewDecisions } from '@/lib/procurement/reviewDecisions'
import { loadProcurementSizeClass } from '@/lib/procurement/companySize'
import { formatCurrencyZar, formatPoints } from '@/lib/procurement/format'
import { createGenericScorecardAssessment } from '@/app/(dashboard)/scorecards/calculator/actions'
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

  // ---------------------------------------------------------------------------
  // The score as the full scorecard counts it, and what needs attention.
  // ---------------------------------------------------------------------------
  const summary = result && result.categories.length > 0 ? summariseProcurementScore(result) : null
  const referenceDate = certificateReferenceDate(Number(assessment.assessment_year))
  const attentionRows = supplierList.map((s) => ({
    id: String(s.id),
    supplier_name: String(s.supplier_name ?? ''),
    value_ex_vat: Number(s.value_ex_vat ?? 0) || 0,
    level: String(s.level ?? ''),
    expiry: s.expiry ? String(s.expiry).slice(0, 10) : '',
    vat_number: s.vat_number ?? '',
    company_registration: s.company_registration ?? '',
  }))
  const reviewDecisions = parseReviewDecisions((assessment as { review_decisions?: unknown }).review_decisions)
  const attention = analyseNeedsAttention(attentionRows, {
    referenceDate,
    totalMeasuredSpend,
    keptDuplicateKeys: new Set(reviewDecisions.keptDuplicates),
  })
  const expiredNotCounting = expiredAndNotCounting(attentionRows, referenceDate)
  const incomplete = attention.count > 0
  const suppliersByLine = Object.fromEntries(
    (Object.keys(PROCUREMENT_LINE_AMOUNT_FIELD) as ProcurementCategoryKey[]).map((key) => [
      key,
      suppliersForProcurementLine(supplierList, key, 50),
    ]),
  )
  const sizeClass = await loadProcurementSizeClass(db, company.id)

  // "Continue to full scorecard": or open the one this was already attached to.
  const { data: attachedFull } = await db
    .from('scorecard_assessments')
    .select('id, name')
    .eq('procurement_assessment_id', assessment.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const scoreSentence = summary
    ? `${formatPoints(summary.basePoints)} of ${summary.baseCap} points, plus ${formatPoints(summary.bonusPoints)} bonus.`
    : 'Not scored yet.'
  const whatThisMeansContent =
    whatThisMeans && summary ? { ...whatThisMeans, intro: `This company scored ${scoreSentence}` } : whatThisMeans

  const plural = (n: number, one: string, many: string) => `${n.toLocaleString('en-ZA')} ${n === 1 ? one : many}`
  const holdingBack: string[] = []
  if (expiredNotCounting.count > 0) {
    holdingBack.push(
      `${plural(expiredNotCounting.count, 'supplier isn’t', 'suppliers aren’t')} counting because ${expiredNotCounting.count === 1 ? 'its certificate' : 'their certificates'} expired (${formatCurrencyZar(expiredNotCounting.spend)} of spend).`,
    )
  }
  if (attention.missingLevel.length > 0) {
    holdingBack.push(
      `${plural(attention.missingLevel.length, 'supplier isn’t', 'suppliers aren’t')} counting because ${attention.missingLevel.length === 1 ? 'it has' : 'they have'} no B-BBEE level.`,
    )
  }
  const stillToFix: string[] = []
  if (attention.expired.length > 0) {
    stillToFix.push(
      `${plural(attention.expired.length, 'supplier still counts', 'suppliers still count')} although ${attention.expired.length === 1 ? 'its certificate' : 'their certificates'} expired, so the score is too high until ${attention.expired.length === 1 ? 'it is' : 'they are'} marked non-compliant.`,
    )
  }
  if (attention.missingLevel.length > 0) stillToFix.push(`${plural(attention.missingLevel.length, 'supplier has', 'suppliers have')} no level.`)
  if (attention.duplicates.length > 0) {
    stillToFix.push(`${plural(attention.duplicates.length, 'supplier looks', 'suppliers look')} listed more than once.`)
  }
  const aboveTotal = attention.oddAmounts.filter((item) => item.reason === 'above_total').length
  if (aboveTotal > 0) stillToFix.push(`${plural(aboveTotal, 'supplier has', 'suppliers have')} more spend than the total spend.`)
  const oddOther = attention.oddAmounts.length - aboveTotal
  if (oddOther > 0) stillToFix.push(`${plural(oddOther, 'supplier has', 'suppliers have')} a zero or negative amount.`)

  const editHref = `/procurement/assessments/${assessment.id}/edit`
  const continueAction = isOwner ? (
    attachedFull?.id ? (
      <Link href={`/scorecards/calculator/${attachedFull.id}/generic`} className={buttonStyles({ variant: 'primary' })}>
        Open the full scorecard <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    ) : (
      <form action={createGenericScorecardAssessment}>
        <input type="hidden" name="companyId" value={company.id} />
        <input type="hidden" name="name" value={`${company.name} ${assessment.assessment_year} B-BBEE scorecard`} />
        <input type="hidden" name="measurementYear" value={String(assessment.assessment_year)} />
        <input type="hidden" name="procurementAssessmentId" value={assessment.id} />
        <PendingSubmitButton
          label="Continue to full scorecard"
          pendingLabel="Making the full scorecard…"
          className={buttonStyles({ variant: 'primary' })}
        />
      </form>
    )
  ) : null
  // The server-drawn PDF (/api/procurement/assessments/[id]/pdf); the button says plainly if it fails.
  const downloadReport = (
    <ProcurementPdfDownloadButton
      assessmentId={assessment.id}
      companyName={company.name}
      label="Download report"
      className={buttonStyles({ variant: 'secondary' })}
    />
  )

  return (
    <div className="space-y-6" data-tour="scorecard-workspace">
      <PageHeader
        crumbs={[
          { label: 'Companies', href: '/companies' },
          { label: company.name, href: `/companies/${company.id}` },
          { label: `Procurement ${assessment.assessment_year}` },
        ]}
        title={`Procurement scorecard ${assessment.assessment_year}`}
        description={`For ${company.name}. ${scoreSentence}`}
        actions={
          <>
            {continueAction}
            {downloadReport}
            {isOwner ? (
              <Link href={editHref} className={buttonStyles({ variant: 'secondary' })}>
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

      {summary && result ? (
        <>
          <Panel title="Procurement score" id="score">
            <div data-tour="results" className="space-y-4">
              <ProcurementScoreHeadline summary={summary} incomplete={incomplete} gapSentence={biggestProcurementGapSentence(summary)} />
              {holdingBack.length > 0 ? (
                <Notice tone="warn" title="What is holding the score back">
                  <ul className="list-disc space-y-1 pl-5">
                    {holdingBack.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </Notice>
              ) : null}
              {incomplete ? (
                <Notice
                  tone="warn"
                  title="Incomplete: the supplier list still needs attention"
                  action={
                    isOwner ? (
                      <Link href={editHref} className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
                        Fix the supplier list
                      </Link>
                    ) : null
                  }
                >
                  <ul className="list-disc space-y-1 pl-5">
                    {stillToFix.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </Notice>
              ) : null}
              <ProcurementTargetsNotice size={sizeClass} companyName={company.name} />
            </div>
          </Panel>

          <Panel
            title="How each indicator scored"
            description="Open an indicator to see the suppliers that count towards it, largest spend first."
          >
            <div className="space-y-5">
              <ProcurementScoreLines lines={procurementLineViews(summary)} suppliersByLine={suppliersByLine} />
              <HowIsThisCalculated summary={summary} result={result} denominatorNote={tmpsDenominatorSourceLabel} />
            </div>
          </Panel>
        </>
      ) : (
        <EmptyState
          title="This procurement scorecard has no score yet"
          action={
            isOwner ? (
              <Link href={editHref} className={buttonStyles({ variant: 'primary' })}>
                Add suppliers and total spend
              </Link>
            ) : null
          }
        >
          It needs at least one supplier and a total spend above zero. Open it to finish it.
        </EmptyState>
      )}

      <Panel
        title="Next"
        description={
          <>
            Procurement is one of the seven areas of the <Term k="fullScorecard">full scorecard</Term>. There it counts for up
            to 25 points plus 2 bonus, exactly as shown here.
          </>
        }
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {continueAction}
          {downloadReport}
          <Link href={`/procurement/assessments/${assessment.id}/report`} data-tour="reports" className={buttonStyles({ variant: 'ghost' })}>
            <FileText className="h-4 w-4" aria-hidden /> Open the printable report
          </Link>
        </div>
      </Panel>

      {comparison ? <ProcurementAssessmentComparison comparison={comparison} /> : null}

      <WhatThisMeansSection content={whatThisMeansContent} />
      <RecommendationsSection items={recommendations} />

      <MoreOptions label="Full breakdown (suppliers, categories and total spend)">
        <ImportSourceCard
          workbookName={importMeta.import_workbook_name ?? null}
          sheetName={importMeta.import_sheet_name ?? null}
          supplierCount={supplierList.length}
          assessmentYear={assessment.assessment_year}
          tmpsDenominatorSourceLabel={tmpsDenominatorSourceLabel}
        />
        <RecognisedSupplierBreakdownSection
          pageSize={100}
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
