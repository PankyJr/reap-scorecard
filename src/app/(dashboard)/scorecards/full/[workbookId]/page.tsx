import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, FileSpreadsheet, FileText, FlaskConical } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import {
  countEngineWarningStrings,
  countIndicatorsByStatus,
  countIndicatorsInPillar,
  formatBbbeeLevelDisplay,
  formatRecognitionDisplay,
  formatScorecardBoolean,
  formatScorecardNumber,
  indicatorActionRequired,
  indicatorStatusPresentation,
  type IndicatorStatusBadgeKind,
} from '@/lib/scorecard/full/full-scorecard-detail-present'
import {
  type FullScorecardNextStep,
  formatFullEngineRunStatus,
  formatFullWorkbookStatus,
  getFullScorecardNextStep,
  groupEngineWarnings,
  groupFullScorecardValidationIssues,
} from '@/lib/scorecard/full/ui-labels'
import { runScoringEngine } from '../new/actions'

type PageProps = {
  params: Promise<{ workbookId: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function firstSearchParam(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined
  return Array.isArray(value) ? value[0] : value
}

function hrefWithDebugQuery(
  pathname: string,
  searchParams: Record<string, string | string[] | undefined>,
  includeDebug: boolean,
): string {
  const params = new URLSearchParams()
  for (const [key, raw] of Object.entries(searchParams)) {
    if (key === 'debug') continue
    if (raw === undefined) continue
    const parts = Array.isArray(raw) ? raw : [raw]
    for (const part of parts) {
      if (part !== '') params.append(key, part)
    }
  }
  if (includeDebug) params.set('debug', '1')
  const qs = params.toString()
  return qs ? `${pathname}?${qs}` : pathname
}

type ValidationSummaryJson = {
  generatedAt?: string
  scoreCompleteness?: string
  missingPillarsForCompleteScore?: string[]
  overall?: {
    referenceFinalScore?: number | null
    referenceSourceCell?: string | null
    calculatedFinalScore?: number | null
    variance?: number | null
    status?: string
    reason?: string | null
  }
  elements?: Array<{
    elementKey: string
    label: string
    referenceAchievedPoints?: number | null
    calculatedAchievedPoints?: number | null
    achievedVariance?: number | null
    reconciliationStatus?: string
    reconciliationReason?: string | null
    sourceMetricRefs?: Array<{
      metricKey: string
      sourceSheet?: string
      sourceCell?: string | null
      validationState?: string
    }>
    indicatorMissingMetricKeys?: string[]
    indicatorWarnings?: string[]
  }>
  referenceMetricIssues?: Array<{
    metricKey: string
    validationState?: string
    validationMessage?: string | null
    sourceCell?: string | null
  }>
  inputMetricQuality?: { totalKeys?: number; valid?: number; warning?: number; error?: number }
  interpretationHints?: string[]
}

type EngineResultJson = {
  engineVersion?: string
  overall?: {
    totalAvailablePoints: number | null
    totalScore: number | null
    bbbeeLevel: string | null
    recognitionPercentage: number | null
    discountingApplicable: boolean | null
    scoreCompleteness?: 'complete' | 'partial'
    missingPillarsForCompleteScore?: string[]
  }
  pillars?: Array<{
    key: string
    label: string
    availablePoints: number | null
    achievedPoints: number | null
    possiblePoints1: number | null
    possiblePoints2: number | null
    status: string
    sections: Array<{
      key: string
      label: string
      indicators: Array<{
        key: string
        label: string
        availablePoints: number | null
        achievedPoints: number | null
        possiblePoints1: number | null
        possiblePoints2: number | null
        status: string
        missingMetricKeys: string[]
        warnings: string[]
        sourceMetrics?: Array<{
          metricKey: string
          sourceSheet?: string
          sourceCell?: string | null
          sourceRange?: string | null
        }>
      }>
    }>
    warnings: string[]
  }>
  reconciliation?: {
    overall?: {
      referenceMetricKey: string
      referenceFinalScore: number | null
      referenceSourceCell: string | null
      calculatedFinalScore: number | null
      variance: number | null
      status: string
      reason: string | null
    }
    elements?: Array<{
      elementKey: string
      label: string
      referenceAvailablePoints: number | null
      referenceAvailableSourceCell: string | null
      referenceAchievedPoints: number | null
      referenceAchievedSourceCell: string | null
      calculatedAvailablePoints: number | null
      calculatedAchievedPoints: number | null
      achievedVariance: number | null
      status: string
      reason: string | null
    }>
    referenceMetricKey?: string | null
    excelReferenceTotal?: number | null
    calculatedTotal?: number | null
    variance?: number | null
    status?: string
    reason?: string | null
  }
  warnings?: Array<{ code: string; message: string }>
  errors?: Array<{ code: string; message: string }>
  validationSummary?: ValidationSummaryJson
}

function truncateForClient(text: string, maxLen: number): string {
  const t = text.trim()
  if (t.length <= maxLen) return t
  return `${t.slice(0, maxLen)}…`
}

function statusPillClass(kind: IndicatorStatusBadgeKind): string {
  switch (kind) {
    case 'calculated':
      return 'border-emerald-200/90 bg-emerald-50 text-emerald-900'
    case 'pending':
      return 'border-slate-200 bg-slate-100 text-slate-800'
    case 'warning':
      return 'border-amber-200/90 bg-amber-50 text-amber-950'
    case 'error':
      return 'border-red-200/90 bg-red-50 text-red-950'
    case 'not_implemented':
      return 'border-violet-200/90 bg-violet-50 text-violet-950'
    default:
      return 'border-slate-200 bg-slate-100 text-slate-800'
  }
}

function headerBadges(args: {
  workbookStatus: string
  runStatus: string | null
  scoreCompleteness?: 'complete' | 'partial'
}): Array<{ label: string; key: string }> {
  const out: Array<{ label: string; key: string }> = []
  if (args.scoreCompleteness === 'partial') {
    out.push({ key: 'partial', label: 'Partial scorecard' })
  }
  const warn =
    args.workbookStatus === 'scored_with_warnings' || args.runStatus === 'completed_with_warnings'
  if (warn && args.scoreCompleteness === 'complete') {
    out.push({ key: 'complete-warn', label: 'Completed with warnings' })
  } else if (warn) {
    out.push({ key: 'scored-warn', label: 'Scored with warnings' })
  }
  return out
}

export default async function FullScorecardDetailPage({ params, searchParams }: PageProps) {
  const { workbookId } = await params
  const rawSearch = (await searchParams) ?? {}
  const debug = firstSearchParam(rawSearch.debug) === '1'
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: workbook } = await supabase
    .from('scorecard_workbooks')
    .select('id, company_id, filename, status, engine_version, uploaded_at, processed_at')
    .eq('id', workbookId)
    .single()

  if (!workbook) notFound()

  const { data: company } = await supabase
    .from('companies')
    .select('id, name, owner_id')
    .eq('id', workbook.company_id)
    .single()

  if (!company || company.owner_id !== user.id) notFound()

  const validationIssuesPromise = debug
    ? supabase
        .from('scorecard_validation_issues')
        .select('id, issue_type, severity, sheet_name, cell_ref, message, metadata, created_at')
        .eq('workbook_id', workbook.id)
        .order('created_at', { ascending: false })
        .limit(1000)
    : supabase
        .from('scorecard_validation_issues')
        .select('id, issue_type, severity, sheet_name, cell_ref, message, created_at')
        .eq('workbook_id', workbook.id)
        .order('created_at', { ascending: false })
        .limit(250)

  const [
    metricTotalResult,
    metricValidResult,
    metricWarningResult,
    metricErrorResult,
    validationIssuesResult,
    latestRunResult,
  ] = await Promise.all([
    supabase
      .from('scorecard_metric_values')
      .select('id', { count: 'exact', head: true })
      .eq('workbook_id', workbook.id),
    supabase
      .from('scorecard_metric_values')
      .select('id', { count: 'exact', head: true })
      .eq('workbook_id', workbook.id)
      .eq('validation_state', 'valid'),
    supabase
      .from('scorecard_metric_values')
      .select('id', { count: 'exact', head: true })
      .eq('workbook_id', workbook.id)
      .eq('validation_state', 'warning'),
    supabase
      .from('scorecard_metric_values')
      .select('id', { count: 'exact', head: true })
      .eq('workbook_id', workbook.id)
      .eq('validation_state', 'error'),
    validationIssuesPromise,
    supabase
      .from('scorecard_engine_runs')
      .select(
        'id, status, engine_version, started_at, completed_at, warnings_count, errors_count, metadata',
      )
      .eq('workbook_id', workbook.id)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const metricSummary = {
    total: metricTotalResult.count ?? 0,
    valid: metricValidResult.count ?? 0,
    warnings: metricWarningResult.count ?? 0,
    errors: metricErrorResult.count ?? 0,
  }
  const validationIssues = validationIssuesResult.data ?? []
  const latestRun = latestRunResult.data

  const { data: latestResultRow } = latestRun
    ? await supabase
        .from('scorecard_engine_results')
        .select(
          'id,total_available_points,total_score,bbbee_level,recognition_percentage,discounting_applicable,result_json,created_at',
        )
        .eq('engine_run_id', latestRun.id)
        .maybeSingle()
    : { data: null }

  const resultJson = (latestResultRow?.result_json ?? null) as EngineResultJson | null
  const overall = resultJson?.overall
  const reconciliation = resultJson?.reconciliation
  const validationSummary = resultJson?.validationSummary

  const blockingErrors = (validationIssues ?? []).filter((i) => i.severity === 'error')

  const nextStep = getFullScorecardNextStep({
    workbookStatus: workbook.status,
    extractedMetricCount: metricSummary.total,
    latestRunStatus: latestRun?.status ?? null,
    hasEngineResult: Boolean(latestResultRow?.result_json),
    scoreCompleteness: overall?.scoreCompleteness,
  })

  const validationGroups = groupFullScorecardValidationIssues(validationIssues ?? [])
  const engineWarningGroups = groupEngineWarnings(resultJson?.warnings ?? [])
  const canExportReports =
    Boolean(latestResultRow?.result_json) && latestRun?.status !== 'running'

  const indicatorCounts = countIndicatorsByStatus(resultJson?.pillars)
  const validationWarningRows = (validationIssues ?? []).filter((i) => i.severity === 'warning').length
  const engineWarnLineCount = countEngineWarningStrings(resultJson?.pillars, resultJson?.warnings)
  const issueSummaryWarnings = validationWarningRows + engineWarnLineCount

  const badges = headerBadges({
    workbookStatus: workbook.status,
    runStatus: latestRun?.status ?? null,
    scoreCompleteness: overall?.scoreCompleteness,
  })

  const partialWithResult =
    Boolean(latestResultRow?.result_json) && overall?.scoreCompleteness === 'partial'

  const detailPath = `/scorecards/full/${encodeURIComponent(workbook.id)}`
  const diagnosticsHref = hrefWithDebugQuery(detailPath, rawSearch, true)
  const scorecardViewHref = hrefWithDebugQuery(detailPath, rawSearch, false)

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-b from-slate-100/90 via-slate-50 to-slate-100/80">
      <div className="mx-auto min-w-0 max-w-5xl px-4 py-6 sm:px-5 lg:px-6 lg:py-8 space-y-6">
        {/* Premium header */}
        <header className="min-w-0 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-900/[0.04]">
          <div className="p-5 sm:p-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 gap-4">
                <Link
                  href={`/scorecards/full/new?companyId=${company.id}&workbookId=${workbook.id}`}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:border-slate-300 hover:bg-white hover:text-slate-900"
                  aria-label="Back to import workspace"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                      Full scorecard
                    </h1>
                    {badges.map((b) => (
                      <span
                        key={b.key}
                        className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-600"
                      >
                        {b.label}
                      </span>
                    ))}
                  </div>
                  <p className="mt-1 truncate text-sm font-medium text-slate-700">{company.name}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500" title={workbook.filename}>
                    {workbook.filename}
                  </p>
                  <p className="mt-3 max-w-xl text-xs leading-relaxed text-slate-500">
                    Engine-calculated scores and exports. Excel &quot;Full Scorecard&quot; tab is reference-only for
                    reconciliation.
                  </p>
                </div>
              </div>
              <div className="w-full shrink-0 space-y-3 rounded-xl border border-slate-100 bg-slate-50/90 p-4 sm:w-72">
                <div className="flex justify-between gap-3 text-xs">
                  <span className="text-slate-500">Workbook</span>
                  <span className="font-medium text-slate-900">{formatFullWorkbookStatus(workbook.status)}</span>
                </div>
                <div className="flex justify-between gap-3 text-xs">
                  <span className="text-slate-500">Engine</span>
                  <span className="font-medium text-slate-900">
                    {latestRun?.status ? formatFullEngineRunStatus(latestRun.status) : 'No run yet'}
                  </span>
                </div>
                <div className="flex justify-between gap-3 text-xs">
                  <span className="text-slate-500">Uploaded</span>
                  <span className="font-medium tabular-nums text-slate-900">
                    {new Date(workbook.uploaded_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between gap-3 text-xs">
                  <span className="text-slate-500">Scored</span>
                  <span className="font-medium tabular-nums text-slate-900">
                    {latestRun?.completed_at ? new Date(latestRun.completed_at).toLocaleString() : '—'}
                  </span>
                </div>
                <p className="border-t border-slate-200/80 pt-2 text-[10px] text-slate-400">
                  Engine {workbook.engine_version ?? latestRun?.engine_version ?? '—'}
                </p>
              </div>
            </div>

            {latestResultRow ? (
              <div className="no-print mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-5">
                {canExportReports ? (
                  <>
                    <a
                      href={`/api/scorecards/full/${encodeURIComponent(workbook.id)}/export-excel`}
                      className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
                    >
                      <FileSpreadsheet className="h-4 w-4 opacity-90" />
                      Export Excel
                    </a>
                    <a
                      href={`/api/scorecards/full/${encodeURIComponent(workbook.id)}/render-pdf`}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      <FileText className="h-4 w-4 text-slate-500" />
                      Download PDF
                    </a>
                  </>
                ) : (
                  <p className="text-xs text-slate-500">Exports unlock when the engine run completes.</p>
                )}
                {!debug ? (
                  <Link
                    href={diagnosticsHref}
                    className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"
                  >
                    <FlaskConical className="h-3.5 w-3.5" />
                    View diagnostics
                  </Link>
                ) : (
                  <Link
                    href={scorecardViewHref}
                    className="ml-auto text-xs font-medium text-slate-500 hover:text-slate-800"
                  >
                    Hide diagnostics
                  </Link>
                )}
              </div>
            ) : null}
          </div>
        </header>

        {debug ? (
          <div className="no-print min-w-0 rounded-2xl border border-sky-200/90 bg-gradient-to-br from-sky-50/90 to-white p-4 shadow-sm ring-1 ring-sky-900/[0.04] sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-slate-900">Workbook diagnostics</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Use this view to inspect workbook source cells, extracted metrics, validation issues, and calculation
                  warnings.
                </p>
              </div>
              <Link
                href={scorecardViewHref}
                className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              >
                Back to scorecard view
              </Link>
            </div>
          </div>
        ) : null}

        {partialWithResult ? (
          <section className="min-w-0 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.03]">
            <div className="border-l-[3px] border-sky-500 pl-4">
              <h2 className="text-base font-semibold text-slate-900">Scorecard imported — calculation incomplete</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                We imported the workbook successfully, but some sections could not be calculated from the detected
                rows. Review the issue summary below, fix the workbook or extractor mappings, then run the scoring engine
                again.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {!debug ? (
                  <Link
                    href={diagnosticsHref}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                  >
                    Open workbook diagnostics
                  </Link>
                ) : (
                  <Link
                    href={scorecardViewHref}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                  >
                    Hide diagnostics
                  </Link>
                )}
                {canExportReports ? (
                  <>
                    <a
                      href={`/api/scorecards/full/${encodeURIComponent(workbook.id)}/export-excel`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                      Export current Excel
                    </a>
                    <a
                      href={`/api/scorecards/full/${encodeURIComponent(workbook.id)}/render-pdf`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                      Download current PDF
                    </a>
                  </>
                ) : null}
              </div>
            </div>
          </section>
        ) : (
          <GuidanceCard step={nextStep} />
        )}

        {!latestResultRow ? (
          <section className="min-w-0 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">No engine result yet</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              The scoring engine has not produced a result for the latest run (or a run is still in progress). PDF and
              Excel exports are enabled only after a completed run writes engine output.
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Extraction: {metricSummary.total} metrics ({metricSummary.valid} valid, {metricSummary.warnings} warnings,{' '}
              {metricSummary.errors} errors).
            </p>
            <form action={runScoringEngine} className="mt-4">
              <input type="hidden" name="company_id" value={company.id} />
              <input type="hidden" name="workbook_id" value={workbook.id} />
              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Run scoring engine
              </button>
            </form>
          </section>
        ) : (
          <>
            <section className="min-w-0 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.03]">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <h2 className="text-base font-semibold text-slate-900">Final result</h2>
                <p className="text-xs text-slate-500">
                  {overall?.scoreCompleteness === 'complete'
                    ? 'All required sections calculated.'
                    : overall?.scoreCompleteness === 'partial'
                      ? 'Final B-BBEE level is pending until all required sections calculate.'
                      : null}
                </p>
              </div>
              {(overall?.missingPillarsForCompleteScore?.length ?? 0) > 0 ? (
                <p className="mt-3 rounded-lg border border-sky-100 bg-sky-50/60 px-3 py-2 text-xs text-sky-950">
                  <span className="font-medium">Missing sections:</span>{' '}
                  {overall?.missingPillarsForCompleteScore?.join(', ')}.
                </p>
              ) : null}
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <MetricTile label="Total available points" value={formatScorecardNumber(overall?.totalAvailablePoints)} />
                <MetricTile label="Total score" value={formatScorecardNumber(overall?.totalScore)} />
                <MetricTile
                  label="B-BBEE level"
                  value={formatBbbeeLevelDisplay(overall?.bbbeeLevel, overall?.scoreCompleteness)}
                />
                <MetricTile
                  label="Recognition %"
                  value={formatRecognitionDisplay(overall?.recognitionPercentage, overall?.scoreCompleteness)}
                />
                <MetricTile label="Discounting" value={formatScorecardBoolean(overall?.discountingApplicable)} />
              </div>
              {debug && (resultJson?.warnings?.length ?? 0) > 0 ? (
                <div className="mt-4 space-y-2 rounded-xl border border-amber-100 bg-amber-50/40 p-3 text-xs text-amber-950">
                  {engineWarningGroups.incomplete.length > 0 ? (
                    <div>
                      <p className="font-semibold">Incomplete score</p>
                      <ul className="mt-1 list-inside list-disc space-y-0.5">
                        {engineWarningGroups.incomplete.map((m, i) => (
                          <li key={`inc-${i}`}>{m}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {engineWarningGroups.discounting.length > 0 ? (
                    <div>
                      <p className="font-semibold">Discounting / subminimum</p>
                      <ul className="mt-1 list-inside list-disc space-y-0.5">
                        {engineWarningGroups.discounting.map((m, i) => (
                          <li key={`disc-${i}`}>{m}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {engineWarningGroups.other.length > 0 ? (
                    <div>
                      <p className="font-semibold">Other engine notes</p>
                      <ul className="mt-1 list-inside list-disc space-y-0.5">
                        {engineWarningGroups.other.map((m, i) => (
                          <li key={`oth-${i}`}>{m}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : (resultJson?.warnings?.length ?? 0) > 0 ? (
                <p className="mt-3 text-xs text-slate-500">
                  {resultJson?.warnings?.length} engine note{resultJson?.warnings?.length === 1 ? '' : 's'} —{' '}
                  <Link href={diagnosticsHref} className="font-medium text-slate-700 underline decoration-slate-300">
                    Open workbook diagnostics
                  </Link>{' '}
                  for full detail.
                </p>
              ) : null}
            </section>

            <section className="min-w-0 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.03]">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Scorecard detail</h2>
                  <p className="mt-0.5 text-xs text-slate-500">By element — engine output only.</p>
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                <HealthChip label="Calculated" value={indicatorCounts.calculated} tone="positive" />
                <HealthChip label="Pending" value={indicatorCounts.notCalculated} tone="neutral" />
                <HealthChip label="Warnings" value={issueSummaryWarnings} tone="caution" />
                <HealthChip label="Formula errors" value={validationGroups.excelErrors.length} tone="risk" />
                <HealthChip label="Ambiguous rows" value={validationGroups.ambiguousRows.length} tone="neutral" />
              </div>
              {!debug ? (
                <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                  Need more detail?{' '}
                  <Link href={diagnosticsHref} className="font-medium text-slate-700 underline decoration-slate-300">
                    Open workbook diagnostics
                  </Link>
                  . Workbook diagnostics are available for reviewing source cells, extracted metrics, and calculation
                  warnings.
                </p>
              ) : null}
              <div className="mt-4 max-w-full overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full min-w-0 table-fixed text-left text-xs sm:min-w-[560px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/90 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      <th className="w-[13%] px-3 py-2.5">Element</th>
                      <th className="w-[24%] px-3 py-2.5">Indicator</th>
                      <th className="w-[12%] px-3 py-2.5">Status</th>
                      <th className="w-[11%] px-3 py-2.5 text-right">Available</th>
                      <th className="w-[11%] px-3 py-2.5 text-right">Achieved</th>
                      <th className="w-[29%] px-3 py-2.5">Action</th>
                    </tr>
                  </thead>
                  {(resultJson?.pillars ?? []).map((pillar) => {
                    const { calculated, total } = countIndicatorsInPillar(pillar)
                    const groupComplete = calculated === total && total > 0
                    return (
                      <tbody key={pillar.key} className="border-b border-slate-100 last:border-b-0">
                        <tr className="bg-slate-50/95">
                          <td colSpan={6} className="px-3 py-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-700">
                                {pillar.label}
                              </span>
                              <span
                                className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                                  groupComplete
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                                    : 'border-slate-200 bg-white text-slate-600'
                                }`}
                              >
                                {calculated}/{total} calculated
                              </span>
                            </div>
                          </td>
                        </tr>
                        {pillar.sections.flatMap((section) =>
                          section.indicators.map((indicator) => {
                            const pres = indicatorStatusPresentation({
                              status: indicator.status,
                              warnings: indicator.warnings ?? [],
                              missingMetricKeys: indicator.missingMetricKeys ?? [],
                            })
                            const pendingRow = indicator.status !== 'calculated'
                            return (
                              <tr
                                key={`${pillar.key}-${section.key}-${indicator.key}`}
                                className={pendingRow ? 'bg-slate-50/50 text-slate-800' : 'bg-white'}
                              >
                                <td className="min-w-0 px-3 py-2 align-middle text-[11px] font-medium text-slate-700 break-words">
                                  {pillar.label}
                                </td>
                                <td className="min-w-0 px-3 py-2 align-middle break-words">
                                  <span className="font-medium text-slate-900">{indicator.label}</span>
                                  <span className="mt-0.5 block text-[10px] text-slate-500">{section.label}</span>
                                  {debug ? (
                                    <span className="mt-1 block font-mono text-[10px] text-slate-400 break-all">
                                      {indicator.key}
                                    </span>
                                  ) : null}
                                </td>
                                <td className="min-w-0 px-3 py-2 align-middle">
                                  <span
                                    className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusPillClass(pres.kind)}`}
                                  >
                                    {pres.label}
                                  </span>
                                </td>
                                <td className="min-w-0 px-3 py-2 align-middle text-right tabular-nums text-slate-800">
                                  {formatScorecardNumber(indicator.availablePoints)}
                                </td>
                                <td className="min-w-0 px-3 py-2 align-middle text-right tabular-nums text-slate-800">
                                  {formatScorecardNumber(indicator.achievedPoints)}
                                </td>
                                <td className="min-w-0 px-3 py-2 align-middle text-[11px] text-slate-800">
                                  <span className="font-medium">
                                    {indicatorActionRequired({
                                      status: indicator.status,
                                      warnings: indicator.warnings ?? [],
                                      missingMetricKeys: indicator.missingMetricKeys ?? [],
                                    })}
                                  </span>
                                  {debug ? (
                                    <span className="mt-1 block font-mono text-[10px] leading-snug text-slate-500 break-all">
                                      {indicator.warnings?.length
                                        ? indicator.warnings.join(' · ')
                                        : indicator.missingMetricKeys?.length
                                          ? `Missing: ${indicator.missingMetricKeys.join(', ')}`
                                          : ''}
                                      {indicator.sourceMetrics?.length ? (
                                        <>
                                          <br />
                                          {indicator.sourceMetrics.map((s) => {
                                            const loc = [s.sourceSheet, s.sourceCell, s.sourceRange]
                                              .filter(Boolean)
                                              .join(' ')
                                            return `${s.metricKey}${loc ? ` (${loc})` : ''}`
                                          }).join(' · ')}
                                        </>
                                      ) : null}
                                    </span>
                                  ) : null}
                                </td>
                              </tr>
                            )
                          }),
                        )}
                      </tbody>
                    )
                  })}
                </table>
              </div>
            </section>

            <section className="min-w-0 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.03]">
              <h2 className="text-base font-semibold text-slate-900">Reconciliation</h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Excel &quot;Full Scorecard&quot; values are <span className="font-medium text-slate-700">reference only</span> for
                comparison with engine totals.
              </p>

              {debug && validationSummary ? (
                <div className="mt-4 rounded-xl border border-dashed border-amber-200/90 bg-amber-50/30 p-4 text-xs">
                  <h3 className="font-semibold text-amber-950">Calculation trace</h3>
                  {validationSummary.interpretationHints?.length ? (
                    <ul className="mt-2 list-inside list-disc text-amber-950/90">
                      {validationSummary.interpretationHints.map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                  ) : null}
                  {validationSummary.referenceMetricIssues && validationSummary.referenceMetricIssues.length > 0 ? (
                    <ul className="mt-2 max-h-36 overflow-y-auto font-mono text-[10px] text-amber-950/90">
                      {validationSummary.referenceMetricIssues.map((m) => (
                        <li key={m.metricKey}>
                          {m.metricKey} [{m.validationState}] {m.sourceCell ?? ''} — {m.validationMessage ?? '—'}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <div className="mt-3 max-w-full overflow-x-auto rounded-lg border border-amber-100 bg-white/80">
                    <table className="w-full min-w-0 text-left text-[11px]">
                      <thead className="bg-amber-50/80 text-amber-950">
                        <tr>
                          <th className="px-2 py-1.5">Element</th>
                          <th className="px-2 py-1.5 text-right">Ref ach.</th>
                          <th className="px-2 py-1.5 text-right">Calc ach.</th>
                          <th className="px-2 py-1.5 text-right">Var.</th>
                          <th className="px-2 py-1.5">Status</th>
                          <th className="px-2 py-1.5">Source metrics</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-50">
                        {(validationSummary.elements ?? []).map((el) => (
                          <tr key={el.elementKey}>
                            <td className="px-2 py-1.5 font-medium">{el.label}</td>
                            <td className="px-2 py-1.5 text-right tabular-nums">
                              {formatScorecardNumber(el.referenceAchievedPoints ?? null)}
                            </td>
                            <td className="px-2 py-1.5 text-right tabular-nums">
                              {formatScorecardNumber(el.calculatedAchievedPoints ?? null)}
                            </td>
                            <td className="px-2 py-1.5 text-right tabular-nums">
                              {formatScorecardNumber(el.achievedVariance ?? null)}
                            </td>
                            <td className="px-2 py-1.5">{el.reconciliationStatus}</td>
                            <td className="px-2 py-1.5 font-mono text-[10px] text-slate-600">
                              {(el.sourceMetricRefs ?? [])
                                .slice(0, 4)
                                .map((s) => `${s.metricKey} (${s.sourceSheet} ${s.sourceCell ?? ''})`)
                                .join(' · ')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {reconciliation?.overall ? (
                <>
                  <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-medium text-slate-600">Overall reference status</p>
                      <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-slate-800">
                        {reconciliation.overall.status}
                      </span>
                    </div>
                    {debug ? (
                      <p className="mt-2 text-[10px] text-slate-500">
                        Reference metric{' '}
                        <code className="rounded bg-white px-1">{reconciliation.overall.referenceMetricKey}</code>
                      </p>
                    ) : null}
                    <div className={`mt-3 grid gap-2 ${debug ? 'sm:grid-cols-2 lg:grid-cols-5' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
                      <MetricTile
                        label="Reference final score"
                        value={formatScorecardNumber(reconciliation.overall.referenceFinalScore)}
                        compact
                      />
                      {debug ? (
                        <MetricTile
                          label="Reference cell"
                          value={reconciliation.overall.referenceSourceCell ?? '—'}
                          compact
                        />
                      ) : null}
                      <MetricTile
                        label="Calculated total score"
                        value={formatScorecardNumber(reconciliation.overall.calculatedFinalScore)}
                        compact
                      />
                      <MetricTile label="Variance" value={formatScorecardNumber(reconciliation.overall.variance)} compact />
                      <MetricTile label="Status" value={reconciliation.overall.status} compact />
                    </div>
                    {reconciliation.overall.reason ? (
                      <p className="mt-2 text-xs text-slate-600">
                        {debug ? reconciliation.overall.reason : truncateForClient(reconciliation.overall.reason, 180)}
                      </p>
                    ) : null}
                  </div>

                  {reconciliation.elements && reconciliation.elements.length > 0 ? (
                    <details className="mt-4 min-w-0 rounded-xl border border-slate-100 bg-slate-50/30 px-3 py-2">
                      <summary className="cursor-pointer text-sm font-medium text-slate-800">
                        Element reconciliation
                        <span className="ml-2 font-normal text-slate-500">— expand for row detail</span>
                      </summary>
                      <div className="mt-3 max-w-full overflow-x-auto rounded-lg border border-slate-100 bg-white">
                        <table className="w-full min-w-0 table-fixed text-left text-xs">
                          <thead className="border-b border-slate-100 bg-slate-50/90 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            <tr>
                              <th className="w-[15%] px-2 py-2">Element</th>
                              <th className="w-[11%] px-2 py-2">Status</th>
                              <th className="w-[10%] px-2 py-2 text-right">Ref avail.</th>
                              <th className="w-[10%] px-2 py-2 text-right">Calc avail.</th>
                              <th className="w-[10%] px-2 py-2 text-right">Ref ach.</th>
                              {debug ? <th className="w-[12%] px-2 py-2 text-right">Ref cells</th> : null}
                              <th className="w-[10%] px-2 py-2 text-right">Calc ach.</th>
                              <th className="w-[10%] px-2 py-2 text-right">Δ</th>
                              <th className="w-[12%] px-2 py-2">Note</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {reconciliation.elements.map((row) => (
                              <tr key={row.elementKey}>
                                <td className="min-w-0 px-2 py-1.5 font-medium text-slate-900 break-words">{row.label}</td>
                                <td className="min-w-0 px-2 py-1.5 break-words text-slate-700">{row.status}</td>
                                <td className="min-w-0 px-2 py-1.5 text-right tabular-nums">
                                  {formatScorecardNumber(row.referenceAvailablePoints)}
                                </td>
                                <td className="min-w-0 px-2 py-1.5 text-right tabular-nums">
                                  {formatScorecardNumber(row.calculatedAvailablePoints)}
                                </td>
                                <td className="min-w-0 px-2 py-1.5 text-right tabular-nums">
                                  {formatScorecardNumber(row.referenceAchievedPoints)}
                                </td>
                                {debug ? (
                                  <td className="min-w-0 px-2 py-1.5 text-right font-mono text-[10px] text-slate-500 break-all">
                                    {row.referenceAvailableSourceCell ?? '—'}
                                    <br />
                                    {row.referenceAchievedSourceCell ?? '—'}
                                  </td>
                                ) : null}
                                <td className="min-w-0 px-2 py-1.5 text-right tabular-nums">
                                  {formatScorecardNumber(row.calculatedAchievedPoints)}
                                </td>
                                <td className="min-w-0 px-2 py-1.5 text-right tabular-nums">
                                  {formatScorecardNumber(row.achievedVariance)}
                                </td>
                                <td className="min-w-0 px-2 py-1.5 text-slate-600 break-words">
                                  {row.reason ? (debug ? row.reason : truncateForClient(row.reason, 120)) : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  ) : null}
                </>
              ) : (
                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                  <MetricTile
                    label="Reference metric key"
                    value={debug ? reconciliation?.referenceMetricKey ?? '—' : '—'}
                    compact
                  />
                  <MetricTile
                    label="Excel reference total"
                    value={formatScorecardNumber(reconciliation?.excelReferenceTotal)}
                    compact
                  />
                  <MetricTile label="Calculated total" value={formatScorecardNumber(reconciliation?.calculatedTotal)} compact />
                  <MetricTile label="Variance" value={formatScorecardNumber(reconciliation?.variance)} compact />
                  <MetricTile label="Status" value={reconciliation?.status ?? 'Pending'} compact />
                </div>
              )}
              {!reconciliation?.overall && reconciliation?.reason ? (
                <p className="mt-2 text-xs text-slate-600">{reconciliation.reason}</p>
              ) : null}
            </section>
          </>
        )}

        <section className="min-w-0 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.03]">
          <h2 className="text-base font-semibold text-slate-900">Workbook issues</h2>
          <p className="mt-1 text-xs text-slate-500">
            High-level summary. Full lists are in the Excel export (&quot;Validation Issues&quot; sheet).
          </p>
          <PolishedIssueGroup
            title="Blocking errors"
            description="These must be resolved before the pipeline can be trusted."
            tone="blocking"
            items={blockingErrors.map((issue) =>
              debug ? `${issue.message}${issue.cell_ref ? ` (${issue.sheet_name ?? ''} ${issue.cell_ref})` : ''}` : issue.message,
            )}
            emptyLabel="No blocking errors."
            initialVisible={4}
          />
          <PolishedIssueGroup
            title="Formula errors"
            description="Workbook cells returned Excel errors or failed validation as formula issues."
            tone="caution"
            preamble={
              validationGroups.excelErrors.length > 0
                ? `${validationGroups.excelErrors.length} issue(s) in this category. Showing first 5.`
                : undefined
            }
            items={validationGroups.excelErrors.map((issue) =>
              debug
                ? `${issue.message}${issue.cell_ref ? ` — ${issue.sheet_name ?? ''} ${issue.cell_ref}` : ''}`
                : issue.message,
            )}
            emptyLabel="None recorded."
            initialVisible={5}
          />
          <PolishedIssueGroup
            title="Ambiguous rows"
            description="Multiple workbook rows matched where a single row was required."
            tone="caution"
            items={validationGroups.ambiguousRows.map((issue) =>
              debug
                ? `${issue.message}${issue.cell_ref ? ` — ${issue.sheet_name ?? ''} ${issue.cell_ref}` : ''}`
                : issue.message,
            )}
            emptyLabel="None recorded."
            initialVisible={4}
          />
          <PolishedIssueGroup
            title="Missing source values"
            description="Required sheets or metrics were not found in the workbook."
            tone="info"
            items={validationGroups.missingInputs.map((issue) =>
              debug
                ? `${issue.message}${issue.cell_ref ? ` — ${issue.sheet_name ?? ''} ${issue.cell_ref}` : ''}`
                : issue.message,
            )}
            emptyLabel="None recorded."
            initialVisible={4}
          />
          <PolishedIssueGroup
            title="Other warnings"
            description="Additional validation notes."
            tone="caution"
            items={[...validationGroups.otherWarnings, ...validationGroups.other].map((issue) =>
              debug
                ? `${issue.message}${issue.cell_ref ? ` — ${issue.sheet_name ?? ''} ${issue.cell_ref}` : ''}`
                : issue.message,
            )}
            emptyLabel="None recorded."
            initialVisible={4}
          />
          {(resultJson?.errors?.length ?? 0) > 0 ? (
            <PolishedIssueGroup
              title="Engine errors"
              description="The scoring engine reported errors on the last run."
              tone="blocking"
              items={(resultJson?.errors ?? []).map((e) =>
                debug ? `${e.code ? `${e.code}: ` : ''}${e.message}` : e.message,
              )}
              emptyLabel="None."
              initialVisible={4}
            />
          ) : null}
        </section>

        {debug ? (
          <section className="min-w-0 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.03]">
            <h2 className="text-base font-semibold text-slate-900">Source data audit</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Structured exports for tracing extraction and engine output. For everyday review, use the scorecard tables
              above.
            </p>
            <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-slate-800">Developer JSON</summary>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                Machine-readable payloads (latest result, validation summary, and run metadata).
              </p>
              <div className="mt-3 space-y-3">
                <details className="rounded-lg border border-slate-100 bg-white/90 p-3">
                  <summary className="cursor-pointer text-sm font-medium text-slate-800">Latest engine result</summary>
                  <pre className="mt-2 max-h-[min(70vh,520px)] overflow-auto rounded-lg bg-slate-950 p-3 text-[11px] leading-relaxed text-slate-100">
                    {JSON.stringify(resultJson, null, 2)}
                  </pre>
                </details>
                {validationSummary ? (
                  <details className="rounded-lg border border-slate-100 bg-white/90 p-3">
                    <summary className="cursor-pointer text-sm font-medium text-slate-800">Validation summary</summary>
                    <pre className="mt-2 max-h-[min(60vh,420px)] overflow-auto rounded-lg bg-slate-950 p-3 text-[11px] leading-relaxed text-slate-100">
                      {JSON.stringify(validationSummary, null, 2)}
                    </pre>
                  </details>
                ) : null}
                <details className="rounded-lg border border-slate-100 bg-white/90 p-3">
                  <summary className="cursor-pointer text-sm font-medium text-slate-800">Validation details</summary>
                  <pre className="mt-2 max-h-[min(60vh,420px)] overflow-auto rounded-lg bg-slate-950 p-3 text-[11px] leading-relaxed text-slate-100">
                    {JSON.stringify(validationIssues ?? [], null, 2)}
                  </pre>
                </details>
                <details className="rounded-lg border border-slate-100 bg-white/90 p-3">
                  <summary className="cursor-pointer text-sm font-medium text-slate-800">Extracted metrics</summary>
                  <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-950 p-3 text-[11px] text-slate-100">
                    {JSON.stringify(metricSummary, null, 2)}
                  </pre>
                </details>
                <details className="rounded-lg border border-slate-100 bg-white/90 p-3">
                  <summary className="cursor-pointer text-sm font-medium text-slate-800">Engine run metadata</summary>
                  <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-950 p-3 text-[11px] text-slate-100">
                    {JSON.stringify(latestRun?.metadata ?? {}, null, 2)}
                  </pre>
                </details>
              </div>
            </details>
          </section>
        ) : (
          <p className="text-center text-xs leading-relaxed text-slate-500 no-print">
            Need more detail?{' '}
            <Link href={diagnosticsHref} className="font-medium text-slate-700 underline decoration-slate-300">
              Open workbook diagnostics
            </Link>{' '}
            to review source cells, extracted metrics, and calculation warnings.
          </p>
        )}
      </div>
    </div>
  )
}

function MetricTile({
  label,
  value,
  compact,
}: {
  label: string
  value: string
  compact?: boolean
}) {
  return (
    <div
      className={`rounded-xl border border-slate-100 bg-slate-50/40 ${compact ? 'px-3 py-2' : 'px-3 py-3'} shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)]`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 font-semibold text-slate-900 ${compact ? 'text-xs' : 'text-sm'}`}>{value}</p>
    </div>
  )
}

function HealthChip({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'positive' | 'neutral' | 'caution' | 'risk'
}) {
  const ring =
    tone === 'positive'
      ? 'border-emerald-100 bg-emerald-50/50 text-emerald-900'
      : tone === 'caution'
        ? 'border-amber-100 bg-amber-50/40 text-amber-950'
        : tone === 'risk'
          ? 'border-rose-100 bg-rose-50/40 text-rose-950'
          : 'border-slate-100 bg-slate-50/80 text-slate-800'
  return (
    <div className={`rounded-xl border px-3 py-2 ${ring}`}>
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function PolishedIssueGroup({
  title,
  description,
  tone,
  items,
  emptyLabel,
  initialVisible,
  preamble,
}: {
  title: string
  description?: string
  tone: 'blocking' | 'caution' | 'info'
  items: string[]
  emptyLabel: string
  initialVisible: number
  preamble?: string
}) {
  const shell =
    tone === 'blocking'
      ? 'border-red-100 bg-red-50/20'
      : tone === 'caution'
        ? 'border-amber-100/90 bg-amber-50/15'
        : 'border-slate-100 bg-slate-50/40'
  const head = items.slice(0, initialVisible)
  const tail = items.slice(initialVisible)

  return (
    <div className={`mt-4 min-w-0 rounded-xl border px-4 py-3 ${shell}`}>
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      {description ? <p className="mt-1 text-xs leading-relaxed text-slate-600">{description}</p> : null}
      {preamble && items.length > 0 ? <p className="mt-2 text-xs font-medium text-slate-700">{preamble}</p> : null}
      {items.length > 0 ? (
        <>
          <ul className="mt-2 space-y-1.5 text-xs leading-snug text-slate-700">
            {head.map((item, index) => (
              <li key={`${title}-${index}`} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" aria-hidden />
                <span className="min-w-0 break-words">{item}</span>
              </li>
            ))}
          </ul>
          {tail.length > 0 ? (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs font-medium text-slate-600 hover:text-slate-900">
                Show {tail.length} more
              </summary>
              <ul className="mt-2 space-y-1.5 text-xs text-slate-600">
                {tail.map((item, index) => (
                  <li key={`${title}-m-${index}`} className="flex gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-300" aria-hidden />
                    <span className="min-w-0 break-words">{item}</span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </>
      ) : (
        <p className="mt-2 text-xs text-slate-500">{emptyLabel}</p>
      )}
    </div>
  )
}

function GuidanceCard({ step }: { step: FullScorecardNextStep }) {
  const border =
    step.tone === 'success'
      ? 'border-l-emerald-500'
      : step.tone === 'warning'
        ? 'border-l-amber-400'
        : step.tone === 'error'
          ? 'border-l-red-500'
          : 'border-l-slate-300'
  return (
    <section className="min-w-0 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.03]">
      <div className={`border-l-[3px] pl-4 ${border}`}>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Next step</h2>
        <p className="mt-1 text-base font-semibold text-slate-900">{step.title}</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.body}</p>
      </div>
    </section>
  )
}
