import { createClient } from '@/utils/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { AutoPrint } from '@/components/scorecards/AutoPrint'
import { ReportToolbar } from '@/components/reports/ReportToolbar'
import { formatFullEngineRunStatus, formatFullWorkbookStatus } from '@/lib/scorecard/full/ui-labels'

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
      status: string
      reason: string | null
      referenceAchievedPoints: number | null
      calculatedAchievedPoints: number | null
      achievedVariance: number | null
    }>
  }
  warnings?: Array<{ code: string; message: string }>
  validationSummary?: {
    referenceMetricIssues?: Array<{
      metricKey: string
      validationState?: string
      validationMessage?: string | null
    }>
  }
}

function num(v: number | null | undefined): string {
  return v == null ? '—' : String(v)
}

export default async function FullScorecardReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ workbookId: string }>
  searchParams: Promise<{ print?: string }>
}) {
  const { workbookId } = await params
  const { print } = await searchParams

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

  const { data: validationIssues } = await supabase
    .from('scorecard_validation_issues')
    .select('id, issue_type, severity, sheet_name, cell_ref, message, created_at')
    .eq('workbook_id', workbook.id)
    .order('created_at', { ascending: false })

  const { data: latestRun } = await supabase
    .from('scorecard_engine_runs')
    .select('id, status, engine_version, started_at, completed_at')
    .eq('workbook_id', workbook.id)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

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
  const generatedAt = new Date().toLocaleString()
  const resultAt = latestResultRow?.created_at
    ? new Date(latestResultRow.created_at).toLocaleString()
    : null

  const blockingErrors = (validationIssues ?? []).filter((i) => i.severity === 'error')
  const validationWarnings = (validationIssues ?? []).filter((i) => i.severity === 'warning')
  const ambiguousReferenceIssues = (validationIssues ?? []).filter(
    (i) =>
      i.message?.toLowerCase().includes('ambiguous') &&
      (i.issue_type === 'metric_value_warning' || i.sheet_name?.toLowerCase().includes('full scorecard')),
  )
  const refIssuesFromSummary = resultJson?.validationSummary?.referenceMetricIssues ?? []

  return (
    <div
      className="report-page min-h-screen bg-surface text-ink print:bg-surface print:text-black"
      id="full-scorecard-report-root"
    >
      {print === '1' ? <AutoPrint /> : null}
      <main className="mx-auto max-w-4xl px-6 py-10 text-sm leading-relaxed print:max-w-none print:px-8 print:py-6">
        <ReportToolbar
          backHref={`/scorecards/full/${workbookId}`}
          backLabel="Back to workbook"
          pdfApiPath={`/api/scorecards/full/${encodeURIComponent(workbookId)}/render-pdf`}
          filenameBase={`REAP-FullScorecard-${company.name}-${workbook.filename}`}
          className="mb-6"
        />
        <header className="border-b border-line pb-4 mb-6 print:border-line-strong">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold  text-muted">Full scorecard report</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">{company.name}</h1>
              <p className="mt-1 text-muted">{workbook.filename}</p>
            </div>
            <div className="text-right text-sm text-muted no-print">
              <p>Generated {generatedAt}</p>
              {resultAt ? <p className="mt-0.5">Engine result {resultAt}</p> : null}
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-muted">Engine version</dt>
              <dd className="font-medium">{resultJson?.engineVersion ?? workbook.engine_version ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted">Score completeness</dt>
              <dd className="font-medium">
                {overall?.scoreCompleteness === 'complete'
                  ? 'Complete'
                  : overall?.scoreCompleteness === 'partial'
                    ? 'Partial / incomplete'
                    : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Workbook status</dt>
              <dd className="font-medium">{formatFullWorkbookStatus(workbook.status)}</dd>
            </div>
            <div>
              <dt className="text-muted">Latest run</dt>
              <dd className="font-medium">
                {latestRun?.status ? formatFullEngineRunStatus(latestRun.status) : '—'}
              </dd>
            </div>
          </dl>
          {overall?.scoreCompleteness === 'partial' ? (
            <p className="mt-3 rounded-md border border-warn/30 bg-warn-soft px-3 py-2 text-sm text-warn print:border-warn/30 print:bg-warn-soft">
              <span className="font-semibold">Partial score.</span> Totals and level reflect calculated pillars only.
              {overall.missingPillarsForCompleteScore?.length
                ? ` Missing pillars: ${overall.missingPillarsForCompleteScore.join(', ')}.`
                : null}
            </p>
          ) : null}
        </header>

        <section className="report-section mb-8 break-inside-avoid">
          <h2 className="border-b border-line pb-1 text-sm font-semibold  text-muted print:border-line-strong">
            Final result (app-calculated)
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-muted">Total available points</p>
              <p className="text-lg font-semibold tabular-nums">{num(overall?.totalAvailablePoints)}</p>
            </div>
            <div>
              <p className="text-sm text-muted">Calculated total score</p>
              <p className="text-lg font-semibold tabular-nums">{num(overall?.totalScore)}</p>
            </div>
            <div>
              <p className="text-sm text-muted">B-BBEE level</p>
              <p className="text-lg font-semibold">{overall?.bbbeeLevel ?? '—'}</p>
            </div>
            <div>
              <p className="text-sm text-muted">Recognition %</p>
              <p className="text-lg font-semibold tabular-nums">{num(overall?.recognitionPercentage)}</p>
            </div>
            <div className="col-span-2">
              <p className="text-sm text-muted">Discounting</p>
              <p className="text-sm">
                {overall?.discountingApplicable == null
                  ? 'Not extracted.'
                  : overall.discountingApplicable
                    ? 'Workbook flags discounting as applicable. The engine does not yet adjust scores or level for discounting (display / reconciliation only).'
                    : 'Discounting not flagged as applicable in reference row.'}
              </p>
            </div>
          </div>
        </section>

        <section className="report-section mb-8 break-inside-avoid">
          <h2 className="border-b border-line pb-1 text-sm font-semibold  text-muted print:border-line-strong">
            Full scorecard table
          </h2>
          <p className="mt-2 text-sm text-muted">
            Figures below come from the scoring engine (source-sheet metrics), not from Excel reference cells.
          </p>
          {!resultJson?.pillars?.length ? (
            <p className="mt-4 text-muted">No engine output available for this workbook.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse border border-line text-sm print:text-sm">
                <thead>
                  <tr className="bg-sunken text-left print:bg-sunken">
                    <th className="border border-line px-2 py-1.5 font-semibold">Pillar / indicator</th>
                    <th className="border border-line px-2 py-1.5 text-right font-semibold">Available</th>
                    <th className="border border-line px-2 py-1.5 text-right font-semibold">Achieved</th>
                    <th className="border border-line px-2 py-1.5 text-right font-semibold">Possible 1</th>
                    <th className="border border-line px-2 py-1.5 text-right font-semibold">Possible 2</th>
                    <th className="border border-line px-2 py-1.5 font-semibold">Status</th>
                    <th className="border border-line px-2 py-1.5 font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {(resultJson.pillars ?? []).map((pillar) =>
                    pillar.sections.flatMap((section) =>
                      section.indicators.map((ind) => (
                        <tr key={ind.key} className="align-top">
                          <td className="border border-line px-2 py-1.5">
                            <span className="font-medium text-ink">{ind.label}</span>
                            <span className="block text-sm text-muted">
                              {pillar.label} · {section.label}
                            </span>
                          </td>
                          <td className="border border-line px-2 py-1.5 text-right tabular-nums">
                            {num(ind.availablePoints)}
                          </td>
                          <td className="border border-line px-2 py-1.5 text-right tabular-nums">
                            {num(ind.achievedPoints)}
                          </td>
                          <td className="border border-line px-2 py-1.5 text-right tabular-nums">
                            {num(ind.possiblePoints1)}
                          </td>
                          <td className="border border-line px-2 py-1.5 text-right tabular-nums">
                            {num(ind.possiblePoints2)}
                          </td>
                          <td className="border border-line px-2 py-1.5">{ind.status}</td>
                          <td className="border border-line px-2 py-1.5 text-sm text-ink">
                            {ind.warnings?.length ? ind.warnings.join('; ') : null}
                            {ind.missingMetricKeys?.length
                              ? `${ind.warnings?.length ? ' ' : ''}Missing: ${ind.missingMetricKeys.join(', ')}`
                              : null}
                            {!ind.warnings?.length && !ind.missingMetricKeys?.length ? '—' : null}
                          </td>
                        </tr>
                      )),
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="report-section mb-8 break-inside-avoid">
          <h2 className="border-b border-line pb-1 text-sm font-semibold  text-muted print:border-line-strong">
            Reconciliation vs Excel Full Scorecard (reference only)
          </h2>
          <p className="mt-2 text-sm text-muted">
            Excel values are for comparison only; they are not used to compute the scores above.
          </p>
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <p className="text-sm text-muted">Calculated final score</p>
              <p className="font-semibold tabular-nums">{num(reconciliation?.overall?.calculatedFinalScore)}</p>
            </div>
            <div>
              <p className="text-sm text-muted">Excel reference final score</p>
              <p className="font-semibold tabular-nums">{num(reconciliation?.overall?.referenceFinalScore)}</p>
            </div>
            <div>
              <p className="text-sm text-muted">Variance (calculated − reference)</p>
              <p className="font-semibold tabular-nums">{num(reconciliation?.overall?.variance)}</p>
            </div>
            <div>
              <p className="text-sm text-muted">Status</p>
              <p className="font-semibold">{reconciliation?.overall?.status ?? '—'}</p>
            </div>
          </div>
          {reconciliation?.overall?.reason ? (
            <p className="mt-2 text-sm text-muted">{reconciliation.overall.reason}</p>
          ) : null}
          {reconciliation?.elements && reconciliation.elements.length > 0 ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse border border-line text-sm">
                <thead>
                  <tr className="bg-sunken text-left">
                    <th className="border border-line px-2 py-1 font-semibold">Area</th>
                    <th className="border border-line px-2 py-1 text-right font-semibold">Ref achieved</th>
                    <th className="border border-line px-2 py-1 text-right font-semibold">Calc achieved</th>
                    <th className="border border-line px-2 py-1 text-right font-semibold">Variance</th>
                    <th className="border border-line px-2 py-1 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reconciliation.elements.map((el) => (
                    <tr key={el.elementKey}>
                      <td className="border border-line px-2 py-1">{el.label}</td>
                      <td className="border border-line px-2 py-1 text-right tabular-nums">
                        {num(el.referenceAchievedPoints)}
                      </td>
                      <td className="border border-line px-2 py-1 text-right tabular-nums">
                        {num(el.calculatedAchievedPoints)}
                      </td>
                      <td className="border border-line px-2 py-1 text-right tabular-nums">
                        {num(el.achievedVariance)}
                      </td>
                      <td className="border border-line px-2 py-1">{el.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>

        <section className="report-section mb-8 break-inside-avoid">
          <h2 className="border-b border-line pb-1 text-sm font-semibold  text-muted print:border-line-strong">
            Warnings and validation
          </h2>
          {overall?.missingPillarsForCompleteScore && overall.missingPillarsForCompleteScore.length > 0 ? (
            <div className="mt-3">
              <p className="text-sm font-semibold text-ink">Missing pillars (complete score)</p>
              <ul className="mt-1 list-inside list-disc text-sm text-ink">
                {overall.missingPillarsForCompleteScore.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {resultJson?.warnings && resultJson.warnings.length > 0 ? (
            <div className="mt-4">
              <p className="text-sm font-semibold text-ink">Engine warnings</p>
              <ul className="mt-1 list-inside list-disc text-sm text-ink">
                {resultJson.warnings.map((w, idx) => (
                  <li key={`${w.code}-${idx}`}>
                    <span className="font-mono text-sm">{w.code}</span>: {w.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {blockingErrors.length > 0 ? (
            <div className="mt-4">
              <p className="text-sm font-semibold text-bad">Blocking validation issues</p>
              <ul className="mt-1 list-inside list-disc text-sm text-bad">
                {blockingErrors.map((i) => (
                  <li key={i.id}>
                    [{i.sheet_name ?? '—'}] {i.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {ambiguousReferenceIssues.length > 0 ? (
            <div className="mt-4">
              <p className="text-sm font-semibold text-warn">Ambiguous or unclear Excel reference rows</p>
              <ul className="mt-1 list-inside list-disc text-sm text-warn">
                {ambiguousReferenceIssues.map((i) => (
                  <li key={i.id}>
                    [{i.sheet_name ?? '—'}] {i.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {refIssuesFromSummary.length > 0 ? (
            <div className="mt-4">
              <p className="text-sm font-semibold text-warn">Reference metric extraction issues</p>
              <ul className="mt-1 list-inside list-disc text-sm text-warn">
                {refIssuesFromSummary.map((m) => (
                  <li key={m.metricKey}>
                    {m.metricKey}: {m.validationMessage ?? m.validationState}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {validationWarnings.length > 0 ? (
            <div className="mt-4">
              <p className="text-sm font-semibold text-ink">
                Validation warnings ({validationWarnings.length}, showing up to 30)
              </p>
              <ul className="mt-1 max-h-48 overflow-y-auto list-inside list-disc text-sm text-ink print:max-h-none">
                {validationWarnings.slice(0, 30).map((i) => (
                  <li key={i.id}>
                    [{i.sheet_name ?? '—'}] {i.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {!blockingErrors.length &&
          !resultJson?.warnings?.length &&
          !validationWarnings.length &&
          !ambiguousReferenceIssues.length &&
          !refIssuesFromSummary.length &&
          !(overall?.missingPillarsForCompleteScore?.length ?? 0) ? (
            <p className="mt-3 text-sm text-muted">No warnings recorded for this export.</p>
          ) : null}
        </section>

        <footer className="mt-10 border-t border-line pt-4 text-sm text-muted print:border-line-strong">
          <p>Full scorecard engine output (app-calculated). Excel Full Scorecard tab values appear only in the reconciliation section for comparison.</p>
        </footer>

        <p className="no-print mt-8 text-center text-sm text-muted">
          <a href={`/scorecards/full/${workbookId}`} className="text-ink underline">
            Back to workbook
          </a>
        </p>
      </main>
    </div>
  )
}
