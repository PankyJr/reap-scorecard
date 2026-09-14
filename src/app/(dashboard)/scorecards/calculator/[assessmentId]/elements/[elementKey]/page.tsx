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
    <div className="min-h-[70vh] bg-slate-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link
          href={`/scorecards/calculator/${assessmentId}`}
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← Back to assessment
        </Link>

        <header className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            {company.name} · {assessment.measurement_year} · {adapter.shortName}
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">{adapter.elementName}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{adapter.help.summary}</p>
          {!adapter.scoringReady && (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              Scoring for this element is scaffolded. Upload and validation work; verified points require a confirmed
              REAP template or the existing full-scorecard engine path.
            </p>
          )}
        </header>

        {q.error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{q.error}</div>
        )}
        {(q.imported || q.calculated || q.saved || q.edited) && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
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
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Inputs changed since the last calculation. Recalculate explicitly to refresh the score — historical
            calculation runs are retained.
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-950">Upload workbook</h2>
          <p className="mt-1 text-sm text-slate-500">Accepted: .xlsx (and .xls where safely supported). Max 8 MB.</p>
          <form action={uploadElementWorkbook} className="mt-4 space-y-3">
            <input type="hidden" name="assessmentId" value={assessmentId} />
            <input type="hidden" name="elementKey" value={elementKey} />
            <input
              type="file"
              name="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              required
              className="block w-full text-sm"
            />
            <button
              type="submit"
              className="rounded-xl bg-[#063b3f] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#052e32]"
            >
              Upload and validate
            </button>
          </form>
          {element.upload_filename && (
            <div className="mt-5 space-y-4">
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">Filename</dt>
                  <dd className="font-medium text-slate-900">{element.upload_filename}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Worksheet</dt>
                  <dd className="font-medium text-slate-900">{element.sheet_name ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Valid rows</dt>
                  <dd className="font-medium text-slate-900">{preview?.validRowCount ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Warnings / rejected</dt>
                  <dd className="font-medium text-slate-900">
                    {preview?.warningCount ?? 0} / {preview?.rejectedRowCount ?? 0}
                  </dd>
                </div>
                {preview?.platformTotalRecognised != null && (
                  <div>
                    <dt className="text-slate-500">Platform recognised total</dt>
                    <dd className="font-medium text-slate-900">
                      R{preview.platformTotalRecognised.toLocaleString('en-ZA')}
                    </dd>
                  </div>
                )}
                {preview?.workbookDisplayedTotal != null && (
                  <div>
                    <dt className="text-slate-500">Workbook displayed total</dt>
                    <dd className="font-medium text-slate-900">
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
                <ul className="list-disc space-y-1 pl-5 text-xs leading-5 text-slate-600">
                  {preview!.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        {preview && preview.rows.length > 0 && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-3">
              <h2 className="text-sm font-semibold text-slate-950">Import preview</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
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
                  {preview.rows.map((row) => (
                    <tr
                      key={`${row.sourceSheet ?? preview.sheetName}:${row.sourceRowNumber}`}
                      className="border-t border-slate-100 align-top"
                    >
                      <td className="px-4 py-2 text-xs text-slate-600">
                        {row.sourceSheet ?? preview.sheetName}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs">{row.sourceRowNumber}</td>
                      <td className="px-4 py-2 capitalize">{row.validationStatus}</td>
                      {elementKey === 'management_control' ? (
                        <>
                          <td className="px-4 py-2 text-xs text-slate-700">
                            {String(row.values.register ?? '—')}
                          </td>
                          <td className="px-4 py-2 text-xs text-slate-700">
                            {String(row.values.roleCategory ?? '—')}
                          </td>
                          <td className="px-4 py-2 text-xs text-slate-700">
                            {String(row.values.gender ?? '—')}
                          </td>
                          <td className="px-4 py-2 text-xs text-slate-700">
                            {String(row.values.race ?? '—')}
                          </td>
                          <td className="px-4 py-2 text-xs text-slate-700">
                            {String(row.values.nationality ?? '—')}
                          </td>
                          <td className="px-4 py-2 text-xs text-slate-700">
                            {String(row.values.positionProvided ?? '—')}
                          </td>
                          <td className="px-4 py-2 text-xs text-slate-700">
                            {String(row.values.resignationRecorded ?? '—')}
                          </td>
                        </>
                      ) : (
                        <td className="px-4 py-2">
                          <pre className="whitespace-pre-wrap font-sans text-xs text-slate-700">
                            {JSON.stringify(row.values, null, 0)}
                          </pre>
                        </td>
                      )}
                      <td className="px-4 py-2 text-xs text-slate-600">
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
                              defaultValue={String(row.values.beneficiary ?? '')}
                              className="w-36 rounded border border-slate-200 px-2 py-1 text-xs"
                              aria-label="Beneficiary"
                            />
                            <input
                              name="recognisedAmount"
                              type="number"
                              step="0.01"
                              defaultValue={
                                typeof row.values.recognisedAmount === 'number'
                                  ? row.values.recognisedAmount
                                  : ''
                              }
                              className="w-28 rounded border border-slate-200 px-2 py-1 text-xs"
                              aria-label="Recognised amount"
                            />
                            <input
                              name="notes"
                              defaultValue={String(row.values.notes ?? '')}
                              className="w-36 rounded border border-slate-200 px-2 py-1 text-xs"
                              aria-label="Notes"
                            />
                            <button
                              type="submit"
                              className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-800"
                            >
                              Save row
                            </button>
                          </form>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {elementKey === 'socio_economic_development' && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-950">SED scoring inputs</h2>
            <p className="mt-1 text-sm text-slate-500">
              Points use the verified proportional engine formula. NPAT is required to derive compliance %. Suggested
              target 1% comes from existing engine fixtures — confirm for this entity.
            </p>
            <form action={updateElementContextualInputs} className="mt-4 grid gap-4 sm:grid-cols-3">
              <input type="hidden" name="assessmentId" value={assessmentId} />
              <input type="hidden" name="elementKey" value={elementKey} />
              <label className="text-sm">
                <span className="font-medium text-slate-800">NPAT (R)</span>
                <input
                  name="npatAmount"
                  type="number"
                  step="0.01"
                  defaultValue={inputs.npatAmount ?? ''}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5"
                />
              </label>
              <label className="text-sm">
                <span className="font-medium text-slate-800">Target (fraction or %)</span>
                <input
                  name="targetPercent"
                  type="number"
                  step="0.0001"
                  defaultValue={inputs.targetPercent ?? 0.01}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5"
                />
              </label>
              <label className="text-sm">
                <span className="font-medium text-slate-800">Available points</span>
                <input
                  name="availablePoints"
                  type="number"
                  step="0.01"
                  defaultValue={inputs.availablePoints ?? 5}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5"
                />
              </label>
              <div className="sm:col-span-3">
                <button
                  type="submit"
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-800"
                >
                  Save inputs
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-950">Calculate</h2>
              <p className="mt-1 text-sm text-slate-500">Rule: {adapter.ruleVersion}</p>
            </div>
            {adapter.scoringReady ? (
              <form action={calculateElement}>
                <input type="hidden" name="assessmentId" value={assessmentId} />
                <input type="hidden" name="elementKey" value={elementKey} />
                <button
                  type="submit"
                  className="rounded-xl bg-[#063b3f] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#052e32]"
                >
                  Calculate element
                </button>
              </form>
            ) : (
              <span className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-950">
                Import review only — scoring unavailable
              </span>
            )}
          </div>
          {result && (
            <div className="mt-5 space-y-3 rounded-xl bg-slate-50 p-4 text-sm">
              <p>
                <span className="text-slate-500">Points achieved:</span>{' '}
                <span className="font-semibold text-slate-950">
                  {result.pointsAchieved ?? '—'} / {result.pointsAvailable ?? '—'}
                </span>
              </p>
              <p>
                <span className="text-slate-500">Actual / target:</span>{' '}
                <span className="font-semibold text-slate-950">
                  {result.actual ?? '—'} / {result.target ?? '—'}
                </span>
              </p>
              <p className="text-slate-700">{result.explanation}</p>
              {(result.warnings ?? []).length > 0 && (
                <ul className="list-disc pl-5 text-amber-900">
                  {result.warnings!.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        {adapter.help.outstandingBusinessRules.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            <h2 className="font-semibold text-slate-950">Outstanding confirmations</h2>
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
