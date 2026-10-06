import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getScorecardElementAdapter, isScorecardElementKey } from '@/lib/scorecard/calculator/elements/registry'
import {
  calculateElement,
  updateElementContextualInputs,
  updateImportedSedRow,
  uploadElementWorkbook,
} from '../../../actions'
import type { CalculatorImportPreview } from '@/lib/scorecard/calculator/types'
import { SpreadsheetFileInput } from '@/components/uploads/SpreadsheetFileInput'
import { SPREADSHEET_UPLOAD_MAX_BYTES } from '@/lib/uploads/limits'
import { uploadLimitLabel } from '@/lib/uploads/spreadsheet-file'

/**
 * Rows imported here carry their fields under `values`; rows written by the
 * full-scorecard workbook import are flat (`register`, `race`, ...). Read both,
 * so the page never crashes on an assessment created by the other path.
 */
function rowValues(row: unknown): Record<string, unknown> {
  const record = (row ?? {}) as { values?: unknown }
  if (record.values && typeof record.values === 'object') return record.values as Record<string, unknown>
  return record as Record<string, unknown>
}

type PageProps = {
  params: Promise<{ assessmentId: string; elementKey: string }>
  searchParams: Promise<{ error?: string; imported?: string; calculated?: string; saved?: string; edited?: string }>
}

export default async function ElementWorkspacePage({ params, searchParams }: PageProps) {
  const { assessmentId, elementKey } = await params
  const q = await searchParams
  if (!isScorecardElementKey(elementKey)) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: assessment } = await supabase
    .from('scorecard_assessments')
    .select('*')
    .eq('id', assessmentId)
    .maybeSingle()
  if (!assessment) notFound()

  const { data: company } = await supabase
    .from('companies')
    .select('id, name, owner_id')
    .eq('id', assessment.company_id)
    .maybeSingle()
  if (!company || company.owner_id !== user.id) notFound()

  const { data: element } = await supabase
    .from('scorecard_assessment_elements')
    .select('*')
    .eq('assessment_id', assessmentId)
    .eq('element_key', elementKey)
    .maybeSingle()
  if (!element) notFound()

  const adapter = getScorecardElementAdapter(elementKey)
  const preview = element.import_snapshot as CalculatorImportPreview | null
  const result = element.result_snapshot as {
    pointsAchieved?: number | null
    pointsAvailable?: number | null
    actual?: number | null
    target?: number | null
    explanation?: string
    warnings?: string[]
    ruleVersion?: string
    inputsUsed?: Record<string, unknown>
  } | null
  const inputs = (element.contextual_inputs ?? {}) as {
    npatAmount?: number
    targetPercent?: number
    availablePoints?: number
    notes?: string
  }

  return (
    <div className="min-h-[70vh] bg-sunken px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link
          href={`/scorecards/calculator/${assessmentId}`}
          className="text-sm font-medium text-muted hover:text-ink"
        >
          ← Back to assessment
        </Link>

        <header className="rounded-[28px] border border-line bg-surface p-6 shadow-sm">
          <p className="text-sm font-medium text-muted">
            {company.name} · {assessment.measurement_year} · {adapter.shortName}
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-ink">{adapter.elementName}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{adapter.help.summary}</p>
          {!adapter.scoringReady && (
            <p className="mt-3 rounded-xl border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-warn">
              Scoring for this element is scaffolded. Upload and validation work; verified points require a confirmed
              REAP template or the existing full-scorecard engine path.
            </p>
          )}
        </header>

        {q.error && (
          <div className="rounded-xl border border-bad/30 bg-bad-soft px-4 py-3 text-sm text-bad">{q.error}</div>
        )}
        {(q.imported || q.calculated || q.saved || q.edited) && (
          <div className="rounded-xl border border-ok/30 bg-ok-soft px-4 py-3 text-sm text-ok">
            {q.imported
              ? 'Import saved.'
              : q.calculated
                ? 'Calculation saved.'
                : q.edited
                  ? 'Row updated. Recalculation required.'
                  : 'Contextual inputs saved.'}
          </div>
        )}

        {(element.needs_recalculation || assessment.needs_recalculation) && (
          <div className="rounded-xl border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-warn">
            Inputs changed since the last calculation. Recalculate explicitly to refresh the score — historical
            calculation runs are retained.
          </div>
        )}

        <section className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-ink">Upload workbook</h2>
          <p className="mt-1 text-sm text-muted">Accepted: .xlsx (and .xls where safely supported). Up to {uploadLimitLabel(SPREADSHEET_UPLOAD_MAX_BYTES)}.</p>
          <form action={uploadElementWorkbook} className="mt-4 space-y-3">
            <input type="hidden" name="assessmentId" value={assessmentId} />
            <input type="hidden" name="elementKey" value={elementKey} />
            <SpreadsheetFileInput
              maxBytes={SPREADSHEET_UPLOAD_MAX_BYTES}
              name="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              required
              className="block w-full text-sm"
            />
            <button
              type="submit"
              className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover"
            >
              Upload and validate
            </button>
          </form>
          {element.upload_filename && (
            <div className="mt-5 space-y-4">
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted">Filename</dt>
                  <dd className="font-medium text-ink">{element.upload_filename}</dd>
                </div>
                <div>
                  <dt className="text-muted">Worksheet</dt>
                  <dd className="font-medium text-ink">{element.sheet_name ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-muted">Valid rows</dt>
                  <dd className="font-medium text-ink">{preview?.validRowCount ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-muted">Warnings / rejected</dt>
                  <dd className="font-medium text-ink">
                    {preview?.warningCount ?? 0} / {preview?.rejectedRowCount ?? 0}
                  </dd>
                </div>
                {preview?.platformTotalRecognised != null && (
                  <div>
                    <dt className="text-muted">Platform recognised total</dt>
                    <dd className="font-medium text-ink">
                      R{preview.platformTotalRecognised.toLocaleString('en-ZA')}
                    </dd>
                  </div>
                )}
                {preview?.workbookDisplayedTotal != null && (
                  <div>
                    <dt className="text-muted">Workbook displayed total</dt>
                    <dd className="font-medium text-ink">
                      R{preview.workbookDisplayedTotal.toLocaleString('en-ZA')}
                      {preview.totalsMatch != null
                        ? preview.totalsMatch
                          ? ' (matches)'
                          : ' (differs — platform total used)'
                        : ''}
                    </dd>
                  </div>
                )}
              </dl>
              {(preview?.notes ?? []).length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-sm leading-5 text-muted">
                  {preview!.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        {preview && preview.rows.length > 0 && (
          <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
            <div className="border-b border-line px-5 py-3">
              <h2 className="text-sm font-semibold text-ink">Import preview</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-sunken text-sm  text-muted">
                  <tr>
                    <th className="px-4 py-2">Source</th>
                    <th className="px-4 py-2">Row</th>
                    <th className="px-4 py-2">Status</th>
                    {elementKey === 'management_control' ? (
                      <>
                        <th className="px-4 py-2">Register</th>
                        <th className="px-4 py-2">Role category</th>
                        <th className="px-4 py-2">Gender</th>
                        <th className="px-4 py-2">Race</th>
                        <th className="px-4 py-2">Nationality</th>
                        <th className="px-4 py-2">Position provided</th>
                        <th className="px-4 py-2">Resignation recorded</th>
                      </>
                    ) : (
                      <th className="px-4 py-2">Values</th>
                    )}
                    <th className="px-4 py-2">Messages</th>
                    {elementKey === 'socio_economic_development' ? (
                      <th className="px-4 py-2">Edit</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row) => {
                    const values = rowValues(row)
                    return (
                    <tr
                      key={`${row.sourceSheet ?? preview.sheetName}:${row.sourceRowNumber}`}
                      className="border-t border-line align-top"
                    >
                      <td className="px-4 py-2 text-sm text-muted">
                        {row.sourceSheet ?? preview.sheetName}
                      </td>
                      <td className="px-4 py-2 font-mono text-sm">{row.sourceRowNumber}</td>
                      <td className="px-4 py-2 capitalize">{row.validationStatus}</td>
                      {elementKey === 'management_control' ? (
                        <>
                          <td className="px-4 py-2 text-sm text-ink">
                            {String(values.register ?? '—')}
                          </td>
                          <td className="px-4 py-2 text-sm text-ink">
                            {String(values.roleCategory ?? '—')}
                          </td>
                          <td className="px-4 py-2 text-sm text-ink">
                            {String(values.gender ?? '—')}
                          </td>
                          <td className="px-4 py-2 text-sm text-ink">
                            {String(values.race ?? '—')}
                          </td>
                          <td className="px-4 py-2 text-sm text-ink">
                            {String(values.nationality ?? '—')}
                          </td>
                          <td className="px-4 py-2 text-sm text-ink">
                            {String(values.positionProvided ?? '—')}
                          </td>
                          <td className="px-4 py-2 text-sm text-ink">
                            {String(values.resignationRecorded ?? '—')}
                          </td>
                        </>
                      ) : (
                        <td className="px-4 py-2">
                          <pre className="whitespace-pre-wrap font-sans text-sm text-ink">
                            {JSON.stringify(values, null, 0)}
                          </pre>
                        </td>
                      )}
                      <td className="px-4 py-2 text-sm text-muted">
                        {row.validationMessages.join('; ') || '—'}
                      </td>
                      {elementKey === 'socio_economic_development' ? (
                        <td className="px-4 py-2">
                          <form action={updateImportedSedRow} className="space-y-2">
                            <input type="hidden" name="assessmentId" value={assessmentId} />
                            <input type="hidden" name="elementKey" value={elementKey} />
                            <input type="hidden" name="sourceRowNumber" value={row.sourceRowNumber} />
                            <input
                              name="beneficiary"
                              defaultValue={String(values.beneficiary ?? '')}
                              className="w-36 rounded border border-line px-2 py-1 text-sm"
                              aria-label="Beneficiary"
                            />
                            <input
                              name="recognisedAmount"
                              type="number"
                              step="0.01"
                              defaultValue={
                                typeof values.recognisedAmount === 'number'
                                  ? values.recognisedAmount
                                  : ''
                              }
                              className="w-28 rounded border border-line px-2 py-1 text-sm"
                              aria-label="Recognised amount"
                            />
                            <input
                              name="notes"
                              defaultValue={String(values.notes ?? '')}
                              className="w-36 rounded border border-line px-2 py-1 text-sm"
                              aria-label="Notes"
                            />
                            <button
                              type="submit"
                              className="rounded-lg border border-line px-2 py-1 text-sm font-semibold text-ink"
                            >
                              Save row
                            </button>
                          </form>
                        </td>
                      ) : null}
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {elementKey === 'socio_economic_development' && (
          <section className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-ink">SED scoring inputs</h2>
            <p className="mt-1 text-sm text-muted">
              Points use the verified proportional engine formula. NPAT is required to derive compliance %. Suggested
              target 1% comes from existing engine fixtures — confirm for this entity.
            </p>
            <form action={updateElementContextualInputs} className="mt-4 grid gap-4 sm:grid-cols-3">
              <input type="hidden" name="assessmentId" value={assessmentId} />
              <input type="hidden" name="elementKey" value={elementKey} />
              <label className="text-sm">
                <span className="font-medium text-ink">NPAT (R)</span>
                <input
                  name="npatAmount"
                  type="number"
                  step="0.01"
                  defaultValue={inputs.npatAmount ?? ''}
                  className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5"
                />
              </label>
              <label className="text-sm">
                <span className="font-medium text-ink">Target (fraction or %)</span>
                <input
                  name="targetPercent"
                  type="number"
                  step="0.0001"
                  defaultValue={inputs.targetPercent ?? 0.01}
                  className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5"
                />
              </label>
              <label className="text-sm">
                <span className="font-medium text-ink">Available points</span>
                <input
                  name="availablePoints"
                  type="number"
                  step="0.01"
                  defaultValue={inputs.availablePoints ?? 5}
                  className="mt-1.5 w-full rounded-xl border border-line px-3 py-2.5"
                />
              </label>
              <div className="sm:col-span-3">
                <button
                  type="submit"
                  className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-ink"
                >
                  Save inputs
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-ink">Calculate</h2>
              <p className="mt-1 text-sm text-muted">Rule: {adapter.ruleVersion}</p>
            </div>
            {adapter.scoringReady ? (
              <form action={calculateElement}>
                <input type="hidden" name="assessmentId" value={assessmentId} />
                <input type="hidden" name="elementKey" value={elementKey} />
                <button
                  type="submit"
                  className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-hover"
                >
                  Calculate element
                </button>
              </form>
            ) : (
              <span className="rounded-xl border border-warn/30 bg-warn-soft px-4 py-2.5 text-sm font-semibold text-warn">
                Import review only — scoring unavailable
              </span>
            )}
          </div>
          {result && (
            <div className="mt-5 space-y-3 rounded-xl bg-sunken p-4 text-sm">
              <p>
                <span className="text-muted">Points achieved:</span>{' '}
                <span className="font-semibold text-ink">
                  {result.pointsAchieved ?? '—'} / {result.pointsAvailable ?? '—'}
                </span>
              </p>
              <p>
                <span className="text-muted">Actual / target:</span>{' '}
                <span className="font-semibold text-ink">
                  {result.actual ?? '—'} / {result.target ?? '—'}
                </span>
              </p>
              <p className="text-ink">{result.explanation}</p>
              {(result.warnings ?? []).length > 0 && (
                <ul className="list-disc pl-5 text-warn">
                  {[...new Set(result.warnings!)].map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        {adapter.help.outstandingBusinessRules.length > 0 && (
          <section className="rounded-2xl border border-line bg-surface p-6 text-sm text-muted shadow-sm">
            <h2 className="font-semibold text-ink">Outstanding confirmations</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {adapter.help.outstandingBusinessRules.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}
