import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { ArrowLeft, Upload, FileSpreadsheet } from 'lucide-react'
import { redirect } from 'next/navigation'
import {
  formatFullEngineRunStatus,
  formatFullWorkbookStatus,
  getFullScorecardNextStep,
} from '@/lib/scorecard/full/ui-labels'
import {
  formatBbbeeLevelDisplay,
  formatRecognitionDisplay,
  formatScorecardBoolean,
  formatScorecardNumber,
} from '@/lib/scorecard/full/full-scorecard-detail-present'
import { runScoringEngine, uploadFullScorecardWorkbook } from './actions'
import { FullWorkbookPdfExportLink } from '@/components/scorecards/FullWorkbookPdfExportLink'

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
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

type WorkbookSheetRow = {
  id: string
  sheet_name: string
  row_count: number
  column_count: number
}

type WorkbookRow = {
  id: string
  filename: string
  status: string
  uploaded_at: string
  metadata: {
    detected_sheets?: string[]
    missing_required_sheets?: string[]
    extraction?: {
      extractedMetricCount?: number
      validMetricCount?: number
      warningCount?: number
      errorCount?: number
    }
  } | null
}

type MetricPreviewRow = {
  id: string
  pillar: string
  metric_key: string
  label: string
  value_type: string
  numeric_value: number | null
  text_value: string | null
  boolean_value: boolean | null
  date_value: string | null
  unit: string | null
  source_sheet: string
  source_cell: string | null
  source_range: string | null
  validation_state: string
}

type EngineRunRow = {
  id: string
  status: string
  engine_version: string
  started_at: string
  completed_at: string | null
  warnings_count: number
  errors_count: number
}

type EngineRunHistoryRow = EngineRunRow & {
  result: {
    total_score: number | null
    bbbee_level: string | null
  }[] | null
}

type EngineResultRow = {
  id: string
  total_available_points: number | null
  total_score: number | null
  bbbee_level: string | null
  recognition_percentage: number | null
  discounting_applicable: boolean | null
  result_json: {
    overall?: {
      scoreCompleteness?: 'complete' | 'partial'
      missingPillarsForCompleteScore?: string[]
    },
    pillars?: Array<{
      key: string
      label: string
      availablePoints: number | null
      achievedPoints: number | null
      status: string
      warnings?: string[]
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
      /** @deprecated older engine JSON */
      referenceMetricKey?: string | null
      excelReferenceTotal?: number | null
      calculatedTotal?: number | null
      variance?: number | null
      status?: string
      reason?: string | null
    }
    warnings?: Array<{ code: string; message: string }>
    errors?: Array<{ code: string; message: string }>
  } | null
}

export default async function NewFullScorecardImportPage({ searchParams }: PageProps) {
  const rawSearch = await searchParams
  const companyId = firstSearchParam(rawSearch.companyId)
  const workbookId = firstSearchParam(rawSearch.workbookId)
  const error = firstSearchParam(rawSearch.error)
  const debug = firstSearchParam(rawSearch.debug) === '1'
  if (!companyId) {
    redirect('/companies')
  }

  const importWorkspacePath = '/scorecards/full/new'
  const diagnosticsImportHref = hrefWithDebugQuery(importWorkspacePath, rawSearch, true)
  const importWorkspaceHref = hrefWithDebugQuery(importWorkspacePath, rawSearch, false)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: company } = await supabase
    .from('companies')
    .select('id, name, owner_id')
    .eq('id', companyId)
    .single()

  if (!company || company.owner_id !== user.id) {
    redirect('/companies')
  }

  let workbook: WorkbookRow | null = null
  let sheets: WorkbookSheetRow[] = []
  let metrics: MetricPreviewRow[] = []
  let latestEngineRun: EngineRunRow | null = null
  let latestEngineResult: EngineResultRow | null = null
  let engineRunHistory: EngineRunHistoryRow[] = []

  if (workbookId) {
    const workbookResult = await supabase
      .from('scorecard_workbooks')
      .select('id, filename, status, uploaded_at, metadata')
      .eq('id', workbookId)
      .eq('company_id', company.id)
      .single()

    if (!workbookResult.error && workbookResult.data) {
      workbook = workbookResult.data as WorkbookRow
      const [runsResult, sheetsResult, metricsResult] = await Promise.all([
        supabase
          .from('scorecard_engine_runs')
          .select(
            'id,status,engine_version,started_at,completed_at,warnings_count,errors_count,result:scorecard_engine_results(total_score,bbbee_level)',
          )
          .eq('workbook_id', workbook.id)
          .order('started_at', { ascending: false })
          .limit(debug ? 10 : 1),
        debug
          ? supabase
              .from('scorecard_workbook_sheets')
              .select('id, sheet_name, row_count, column_count')
              .eq('workbook_id', workbook.id)
              .order('sheet_name')
          : Promise.resolve({ data: [] as WorkbookSheetRow[], error: null }),
        debug
          ? supabase
              .from('scorecard_metric_values')
              .select(
                'id,pillar,metric_key,label,value_type,numeric_value,text_value,boolean_value,date_value,unit,source_sheet,source_cell,source_range,validation_state',
              )
              .eq('workbook_id', workbook.id)
              .order('pillar')
              .order('metric_key')
          : Promise.resolve({ data: [] as MetricPreviewRow[], error: null }),
      ])

      sheets = (sheetsResult.data ?? []) as WorkbookSheetRow[]
      metrics = (metricsResult.data ?? []) as MetricPreviewRow[]

      if (!runsResult.error && runsResult.data) {
        engineRunHistory = debug ? ((runsResult.data ?? []) as EngineRunHistoryRow[]) : []
        latestEngineRun = (runsResult.data[0] ?? null) as EngineRunRow | null
      }

      if (latestEngineRun) {
        const engineResult = await supabase
          .from('scorecard_engine_results')
          .select(
            'id,total_available_points,total_score,bbbee_level,recognition_percentage,discounting_applicable,result_json',
          )
          .eq('engine_run_id', latestEngineRun.id)
          .maybeSingle()

        if (!engineResult.error && engineResult.data) {
          latestEngineResult = engineResult.data as EngineResultRow
        }
      }
    }
  }

  const detectedSheets = workbook?.metadata?.detected_sheets ?? []
  const missingRequiredSheets = workbook?.metadata?.missing_required_sheets ?? []
  const extractionSummary = workbook?.metadata?.extraction ?? null

  const groupedMetrics = metrics.reduce<Record<string, MetricPreviewRow[]>>((acc, row) => {
    if (!acc[row.pillar]) acc[row.pillar] = []
    acc[row.pillar].push(row)
    return acc
  }, {})

  const pillarOrder = [
    'Ownership',
    'Management Control',
    'Skills Development',
    'Procurement / ESD',
    'SED',
    'NPAT',
    'Final Scorecard Reference',
  ]

  const groupedForDisplay = pillarOrder
    .filter((pillar) => groupedMetrics[pillar]?.length)
    .map((pillar) => ({ pillar, rows: groupedMetrics[pillar] }))

  const fallbackSummary = {
    extractedMetricCount: metrics.length,
    validMetricCount: metrics.filter((m) => m.validation_state === 'valid').length,
    warningCount: metrics.filter((m) => m.validation_state === 'warning').length,
    errorCount: metrics.filter((m) => m.validation_state === 'error').length,
  }

  const summary = {
    extractedMetricCount:
      extractionSummary?.extractedMetricCount ?? fallbackSummary.extractedMetricCount,
    validMetricCount:
      extractionSummary?.validMetricCount ?? fallbackSummary.validMetricCount,
    warningCount: extractionSummary?.warningCount ?? fallbackSummary.warningCount,
    errorCount: extractionSummary?.errorCount ?? fallbackSummary.errorCount,
  }

  const importNextStep = workbook
    ? getFullScorecardNextStep({
        workbookStatus: workbook.status,
        extractedMetricCount: summary.extractedMetricCount,
        latestRunStatus: latestEngineRun?.status ?? null,
        hasEngineResult: Boolean(latestEngineResult?.result_json),
        scoreCompleteness: latestEngineResult?.result_json?.overall?.scoreCompleteness,
      })
    : null

  const canExportReports = Boolean(latestEngineResult?.result_json) && latestEngineRun?.status !== 'running'
  const missingSections = latestEngineResult?.result_json?.overall?.missingPillarsForCompleteScore ?? []

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.05),transparent_30%),linear-gradient(to_bottom,#f8fafc,#f8fafc)]">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_24px_60px_rgba(15,23,42,0.10)]">
          <div className="relative px-5 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-4">
                  <Link
                    href={`/companies/${company.id}`}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
                    aria-label="Back to company"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Link>

                  <div className="min-w-0 flex-1">
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Full Scorecard Import
                    </span>

                    <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2.15rem]">
                      Full scorecard import
                    </h1>

                    <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-[15px]">
                      Upload the client&apos;s generic B-BBEE <code className="rounded bg-slate-100 px-1 py-0.5 text-[13px]">.xlsx</code> for{' '}
                      <span className="font-medium text-slate-800">{company.name}</span>.
                      The file is parsed, canonical metrics are extracted, then you run the scoring engine from this page.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 shadow-sm sm:min-w-[220px]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Company
                </p>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-950">
                  {company.name}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_24px_60px_rgba(15,23,42,0.10)]">
          <div className="border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(255,255,255,1))] px-5 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            <h2 className="text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">
              Upload workbook
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Required format: <code>.xlsx</code>. Upload parses the file and runs extraction in one step. After that,
              review validation results, then run the scoring engine.
            </p>
          </div>

          <div className="px-5 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            <form action={uploadFullScorecardWorkbook} className="space-y-4">
              <input type="hidden" name="company_id" value={company.id} />
              <label
                htmlFor="workbook"
                className="block text-sm font-medium text-slate-700"
              >
                Generic scorecard workbook
              </label>
              <input
                id="workbook"
                name="workbook"
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                required
                className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-slate-800"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                <Upload className="h-4 w-4" />
                Upload and extract
              </button>
            </form>

            {error ? (
              <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}
          </div>
        </section>

        {!workbookId ? (
          <section className="mt-8 rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 px-5 py-8 text-center sm:px-8">
            <h2 className="text-base font-semibold text-slate-900">No workbook loaded</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-600">
              Choose an <code className="rounded bg-white px-1 py-0.5 text-xs">.xlsx</code> file above and submit. You
              will return to this page with validation, metrics, and engine controls for that upload.
            </p>
          </section>
        ) : null}

        {workbookId && !workbook ? (
          <section className="mt-8 rounded-[24px] border border-amber-200 bg-amber-50/60 px-5 py-6 sm:px-8">
            <h2 className="text-base font-semibold text-amber-950">Workbook not found</h2>
            <p className="mt-2 text-sm text-amber-900">
              This import link may be outdated or the file may belong to another company. Open{' '}
              <Link href={`/scorecards/full/new?companyId=${company.id}`} className="font-medium underline">
                full scorecard import
              </Link>{' '}
              again from the company page.
            </p>
          </section>
        ) : null}

        {workbook ? (
          <section className="mt-8 overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_24px_60px_rgba(15,23,42,0.10)]">
            <div className="border-b border-slate-200/80 px-5 py-5 sm:px-6 sm:py-6 lg:px-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-950">
                    Latest import result
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {workbook.filename} · {new Date(workbook.uploaded_at).toLocaleString()}
                  </p>
                </div>
                <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800">
                  {formatFullWorkbookStatus(workbook.status)}
                </span>
              </div>
            </div>

            <div className="space-y-6 px-5 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
              {debug ? (
                <div className="rounded-2xl border border-sky-200/90 bg-gradient-to-br from-sky-50/90 to-white p-4 shadow-sm ring-1 ring-sky-900/[0.04] sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900">Workbook diagnostics</h3>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">
                        Use this view to inspect workbook source cells, extracted metrics, validation issues, and
                        calculation warnings from the import workspace.
                      </p>
                    </div>
                    <Link
                      href={importWorkspaceHref}
                      className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      Hide diagnostics
                    </Link>
                  </div>
                </div>
              ) : null}

              {importNextStep ? (
                <div
                  className={[
                    'rounded-xl border px-4 py-3 text-sm',
                    importNextStep.tone === 'success'
                      ? 'border-emerald-200 bg-emerald-50/80 text-emerald-950'
                      : importNextStep.tone === 'warning'
                        ? 'border-amber-200 bg-amber-50/80 text-amber-950'
                        : importNextStep.tone === 'error'
                          ? 'border-red-200 bg-red-50/80 text-red-950'
                          : 'border-slate-200 bg-slate-50 text-slate-900',
                  ].join(' ')}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Next step</p>
                  <p className="mt-1 font-semibold">{importNextStep.title}</p>
                  <p className="mt-1 leading-relaxed text-slate-800">{importNextStep.body}</p>
                </div>
              ) : null}

              {summary.extractedMetricCount === 0 &&
              (workbook.status === 'extracted' || workbook.status === 'extracted_with_warnings') ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-950">
                  <p className="font-semibold">Extracted but no metric rows</p>
                  <p className="mt-1 text-amber-900/95">
                    Required sheets may be missing or labels may not match the expected template. Review missing
                    sheets above, then re-upload after correcting the workbook.
                  </p>
                </div>
              ) : null}

              <div>
                <h4 className="text-sm font-semibold text-slate-900">Detected sheets</h4>
                {detectedSheets.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {detectedSheets.map((sheet) => (
                      <span
                        key={sheet}
                        className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
                      >
                        <FileSpreadsheet className="mr-1 h-3.5 w-3.5" />
                        {sheet}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">No sheets detected.</p>
                )}
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-900">Missing required sheets</h4>
                {missingRequiredSheets.length > 0 ? (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-700">
                    {missingRequiredSheets.map((sheet) => (
                      <li key={sheet}>{sheet}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-emerald-700">
                    All required sheets are present.
                  </p>
                )}
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-900">Extraction summary</h4>
                <div className="mt-2 grid gap-3 sm:grid-cols-4">
                  <SummaryStat
                    label="Extracted metrics"
                    value={summary.extractedMetricCount}
                  />
                  <SummaryStat
                    label="Valid metrics"
                    value={summary.validMetricCount}
                  />
                  <SummaryStat
                    label="Warnings"
                    value={summary.warningCount}
                  />
                  <SummaryStat
                    label="Blocking errors"
                    value={summary.errorCount}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">Latest import status</h4>
                    <p className="mt-1 text-xs text-slate-600">
                      Engine {latestEngineRun?.engine_version ?? '—'}
                    </p>
                  </div>
                  {latestEngineRun ? (
                    <span className="inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-800">
                      {formatFullEngineRunStatus(latestEngineRun.status)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                      Pending
                    </span>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <form action={runScoringEngine}>
                    <input type="hidden" name="company_id" value={company.id} />
                    <input type="hidden" name="workbook_id" value={workbook.id} />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                    >
                      Run scoring engine
                    </button>
                  </form>
                  <Link
                    href={`/scorecards/full/${workbook.id}`}
                    className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                  >
                    Open scorecard view
                  </Link>
                  {!debug ? (
                    <Link
                      href={diagnosticsImportHref}
                      className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                    >
                      View diagnostics
                    </Link>
                  ) : (
                    <Link
                      href={importWorkspaceHref}
                      className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                    >
                      Hide diagnostics
                    </Link>
                  )}
                  {canExportReports ? (
                    <>
                      <a
                        href={`/api/scorecards/full/${encodeURIComponent(workbook.id)}/export-excel`}
                        className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                      >
                        Export Excel
                      </a>
                      <FullWorkbookPdfExportLink workbookId={workbook.id} />
                    </>
                  ) : null}
                </div>
              </div>

              {latestEngineResult ? (
                <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h4 className="text-sm font-semibold text-slate-900">Scoring status</h4>
                    <div className="flex flex-wrap items-center gap-2">
                      {!debug ? (
                        <Link
                          href={diagnosticsImportHref}
                          className="text-xs font-medium text-slate-600 underline decoration-slate-300 hover:text-slate-900"
                        >
                          Review source data
                        </Link>
                      ) : (
                        <Link
                          href={importWorkspaceHref}
                          className="text-xs font-medium text-slate-600 underline decoration-slate-300 hover:text-slate-900"
                        >
                          Hide diagnostics
                        </Link>
                      )}
                    <span className="text-xs text-slate-500">
                      {latestEngineResult.result_json?.overall?.scoreCompleteness === 'complete'
                        ? 'Scored'
                        : latestEngineResult.result_json?.overall?.scoreCompleteness === 'partial'
                          ? 'Incomplete'
                          : 'Pending'}
                    </span>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <SummaryStat label="Engine status" valueText={latestEngineRun ? formatFullEngineRunStatus(latestEngineRun.status) : 'Pending'} compact />
                    <SummaryStat
                      label="Score completeness"
                      valueText={
                        latestEngineResult.result_json?.overall?.scoreCompleteness === 'complete'
                          ? 'Complete'
                          : latestEngineResult.result_json?.overall?.scoreCompleteness === 'partial'
                            ? 'Incomplete'
                            : 'Pending'
                      }
                      compact
                    />
                    <SummaryStat label="Total available points" valueText={formatScorecardNumber(latestEngineResult.total_available_points)} compact />
                    <SummaryStat label="Total score" valueText={formatScorecardNumber(latestEngineResult.total_score)} compact />
                    <SummaryStat
                      label="B-BBEE level"
                      valueText={formatBbbeeLevelDisplay(latestEngineResult.bbbee_level, latestEngineResult.result_json?.overall?.scoreCompleteness)}
                      compact
                    />
                    <SummaryStat
                      label="Recognition %"
                      valueText={formatRecognitionDisplay(latestEngineResult.recognition_percentage, latestEngineResult.result_json?.overall?.scoreCompleteness)}
                      compact
                    />
                    <SummaryStat
                      label="Discounting"
                      valueText={formatScorecardBoolean(latestEngineResult.discounting_applicable)}
                      compact
                    />
                    <SummaryStat
                      label="Next action"
                      valueText={
                        latestEngineResult.result_json?.overall?.scoreCompleteness === 'complete'
                          ? 'Ready'
                          : 'Review workbook diagnostics'
                      }
                      compact
                    />
                    <SummaryStat
                      label="Missing sections"
                      valueText={missingSections.length > 0 ? missingSections.join(', ') : 'None'}
                      compact
                    />
                  </div>
                  {!debug ? (
                    <p className="text-xs leading-relaxed text-slate-500">
                      Need more detail?{' '}
                      <Link href={diagnosticsImportHref} className="font-medium text-slate-700 underline decoration-slate-300">
                        Open workbook diagnostics
                      </Link>{' '}
                      to inspect raw metrics, source cells, and warning strings.
                    </p>
                  ) : null}
                  {debug && latestEngineResult.result_json?.pillars?.length ? (
                    <details className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-xs text-slate-700">
                      <summary className="cursor-pointer font-semibold text-slate-900">
                        Calculation trace
                      </summary>
                      <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-white">
                        <table className="w-full min-w-[640px] text-left text-xs">
                          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                            <tr>
                              <th className="px-3 py-2">Pillar</th>
                              <th className="px-3 py-2 text-right">Available</th>
                              <th className="px-3 py-2 text-right">Achieved</th>
                              <th className="px-3 py-2">Status</th>
                              <th className="px-3 py-2">Warnings</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {latestEngineResult.result_json.pillars.map((pillar) => (
                              <tr key={pillar.key}>
                                <td className="px-3 py-2">{pillar.label}</td>
                                <td className="px-3 py-2 text-right tabular-nums">
                                  {formatNullableNumber(pillar.availablePoints)}
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums">
                                  {formatNullableNumber(pillar.achievedPoints)}
                                </td>
                                <td className="px-3 py-2">{pillar.status}</td>
                                <td className="px-3 py-2">{pillar.warnings?.length ? pillar.warnings.join('; ') : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  ) : null}
                  {debug ? (
                    <details className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-xs text-slate-700">
                      <summary className="cursor-pointer font-semibold text-slate-900">Developer JSON</summary>
                      <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                        Machine-readable engine output for advanced review.
                      </p>
                      <div className="mt-3 space-y-3">
                        {latestEngineResult.result_json?.reconciliation ? (
                          <details className="rounded-md border border-slate-100 bg-white/90 p-2">
                            <summary className="cursor-pointer font-medium text-slate-800">Reconciliation detail</summary>
                            <pre className="mt-2 overflow-x-auto rounded bg-slate-950 p-3 text-[11px] leading-5 text-slate-100">
                              {JSON.stringify(latestEngineResult.result_json.reconciliation, null, 2)}
                            </pre>
                          </details>
                        ) : null}
                        <details className="rounded-md border border-slate-100 bg-white/90 p-2">
                          <summary className="cursor-pointer font-medium text-slate-800">Latest engine result</summary>
                          <pre className="mt-2 overflow-x-auto rounded bg-slate-950 p-3 text-[11px] leading-5 text-slate-100">
                            {JSON.stringify(latestEngineResult.result_json, null, 2)}
                          </pre>
                        </details>
                      </div>
                    </details>
                  ) : null}
                </div>
              ) : null}

              {debug && engineRunHistory.length > 0 ? (
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">Calculation trace — engine runs</h4>
                  <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full min-w-[760px] text-left text-xs">
                      <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-3 py-2">Started</th>
                          <th className="px-3 py-2">Version</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2 text-right">Warnings</th>
                          <th className="px-3 py-2 text-right">Errors</th>
                          <th className="px-3 py-2 text-right">Total score</th>
                          <th className="px-3 py-2">B-BBEE level</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {engineRunHistory.map((run) => (
                          <tr key={run.id}>
                            <td className="px-3 py-2">{new Date(run.started_at).toLocaleString()}</td>
                            <td className="px-3 py-2">{run.engine_version}</td>
                            <td className="px-3 py-2">{run.status}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{run.warnings_count}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{run.errors_count}</td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {formatNullableNumber(run.result?.[0]?.total_score ?? null)}
                            </td>
                            <td className="px-3 py-2">{run.result?.[0]?.bbbee_level ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {debug ? (
              <div>
                <h4 className="text-sm font-semibold text-slate-900">
                  Source data audit — worksheet dimensions
                </h4>
                <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[360px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-2">Sheet</th>
                        <th className="px-4 py-2 text-right">Rows</th>
                        <th className="px-4 py-2 text-right">Columns</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sheets.map((sheet) => (
                        <tr key={sheet.id}>
                          <td className="px-4 py-2 text-slate-800">{sheet.sheet_name}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-slate-700">
                            {sheet.row_count}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums text-slate-700">
                            {sheet.column_count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              ) : null}

              {debug ? (
              <details className="rounded-xl border border-slate-200 bg-slate-50/40 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                  Extracted metrics (summary)
                </summary>
                <div className="mt-3 space-y-3">
                  {groupedForDisplay.length > 0 ? (
                    groupedForDisplay.map((group) => (
                      <div
                        key={group.pillar}
                        className="rounded-xl border border-slate-200 bg-white p-3"
                      >
                        <p className="text-sm font-semibold text-slate-900">{group.pillar}</p>
                        <p className="mt-1 text-xs text-slate-600">
                          {group.rows.length} extracted metric
                          {group.rows.length === 1 ? '' : 's'}
                        </p>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-700">
                          {group.rows.slice(0, 8).map((row) => (
                            <li key={row.id}>
                              {row.metric_key} ({row.validation_state})
                            </li>
                          ))}
                          {group.rows.length > 8 ? (
                            <li>+{group.rows.length - 8} more…</li>
                          ) : null}
                        </ul>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No metrics extracted yet.</p>
                  )}
                </div>
              </details>
              ) : null}

              {debug ? (
              <details className="rounded-xl border border-slate-200 bg-slate-50/40 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                  Extracted metrics
                </summary>
                <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full min-w-[900px] text-left text-xs">
                    <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Pillar</th>
                        <th className="px-3 py-2">Metric key</th>
                        <th className="px-3 py-2">Label</th>
                        <th className="px-3 py-2">Value</th>
                        <th className="px-3 py-2">Unit</th>
                        <th className="px-3 py-2">Source sheet</th>
                        <th className="px-3 py-2">Source cell/range</th>
                        <th className="px-3 py-2">Validation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {metrics.map((metric) => (
                        <tr key={metric.id}>
                          <td className="px-3 py-2">{metric.pillar}</td>
                          <td className="px-3 py-2 font-mono">{metric.metric_key}</td>
                          <td className="px-3 py-2">{metric.label}</td>
                          <td className="px-3 py-2">{formatMetricValue(metric)}</td>
                          <td className="px-3 py-2">{metric.unit ?? '—'}</td>
                          <td className="px-3 py-2">{metric.source_sheet}</td>
                          <td className="px-3 py-2">
                            {metric.source_cell ?? metric.source_range ?? '—'}
                          </td>
                          <td className="px-3 py-2">{metric.validation_state}</td>
                        </tr>
                      ))}
                      {metrics.length === 0 ? (
                        <tr>
                          <td className="px-3 py-4 text-slate-500" colSpan={8}>
                            No metric rows found for this workbook yet.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </details>
              ) : null}

              {!debug ? (
                <p className="text-xs leading-relaxed text-slate-500">
                  Workbook diagnostics are available for reviewing source cells, extracted metrics, and calculation
                  warnings.{' '}
                  <Link href={diagnosticsImportHref} className="font-medium text-slate-700 underline decoration-slate-300">
                    Open workbook diagnostics
                  </Link>{' '}
                  for grouped metric summaries, the full metric table, worksheet dimensions, engine run history, and
                  structured engine output.
                </p>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  )
}

function SummaryStat({
  label,
  value,
  valueText,
  compact,
}: {
  label: string
  value?: number
  valueText?: string
  compact?: boolean
}) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-slate-50 ${compact ? 'p-2.5' : 'p-3'}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 font-semibold tabular-nums text-slate-900 ${compact ? 'text-sm' : 'text-xl'}`}>
        {valueText ?? value ?? 0}
      </p>
    </div>
  )
}

function formatMetricValue(metric: MetricPreviewRow): string {
  if (metric.numeric_value != null) return String(metric.numeric_value)
  if (metric.text_value != null && metric.text_value !== '') return metric.text_value
  if (metric.boolean_value != null) return metric.boolean_value ? 'true' : 'false'
  if (metric.date_value != null) return metric.date_value
  return '—'
}

function formatNullableNumber(value: number | null): string {
  return value == null ? '—' : String(value)
}
