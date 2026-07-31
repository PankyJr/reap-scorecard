import Link from 'next/link'
import { notFound } from 'next/navigation'
import { loadGenericAssessment } from '../load'
import { confirmGenericWorkbookImport } from '../actions'
import { Card, Flash, Shell } from '../ui'
import type { ElementImportDecision, GenericWorkbookAnalysis } from '@/lib/scorecard/generic/workbook-import'
import { elementHasExistingData } from '@/lib/scorecard/generic/workbook-import'

type PageProps = {
  params: Promise<{ assessmentId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const DECISION_OPTIONS: { value: ElementImportDecision; label: string }[] = [
  { value: 'import', label: 'Import (only if empty)' },
  { value: 'replace_existing', label: 'Replace existing data' },
  { value: 'keep_existing', label: 'Keep existing data' },
  { value: 'merge_missing', label: 'Merge missing values only' },
  { value: 'skip', label: 'Skip' },
]

export default async function WorkbookReviewPage({ params, searchParams }: PageProps) {
  const { assessmentId } = await params
  const query = await searchParams
  const loaded = await loadGenericAssessment(assessmentId)
  if (!loaded) notFound()

  const analysis = (loaded.assessment as { workbook_import_preview?: GenericWorkbookAnalysis | null })
    .workbook_import_preview
  if (!analysis) {
    return (
      <Shell
        assessmentId={assessmentId}
        companyName={loaded.company.name}
        assessmentName={loaded.assessment.name}
        current="workbook-review"
        title="Workbook review"
        subtitle="Upload a Generic Scorecard workbook from the workspace landing page before confirming an import."
      >
        <Card title="No pending workbook">
          <p className="text-sm text-slate-600">There is no workbook waiting for review.</p>
          <Link href={`/scorecards/calculator/${assessmentId}/generic`} className="mt-4 inline-block text-sm font-medium text-[#063b3f] hover:underline">
            ← Back to workspace
          </Link>
        </Card>
      </Shell>
    )
  }

  const contributionCounts = {
    enterprise_development: loaded.contributions.filter((r) => r.element_key === 'enterprise_development').length,
    supplier_development: loaded.contributions.filter((r) => r.element_key === 'supplier_development').length,
    socio_economic_development: loaded.contributions.filter((r) => r.element_key === 'socio_economic_development')
      .length,
  }

  return (
    <Shell
      assessmentId={assessmentId}
      companyName={loaded.company.name}
      assessmentName={loaded.assessment.name}
      current="workbook-review"
      title="Review workbook before import"
      subtitle="Nothing is written to Ownership, Management Control, Skills, ED, Supplier Development or SED until you confirm. Procurement workbook scores are never imported."
    >
      <Flash searchParams={query} />

      <Card title="Workbook">
        <dl className="grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-[0.14em] text-slate-400">Filename</dt>
            <dd className="mt-1 font-medium text-slate-900">{analysis.filename}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.14em] text-slate-400">Size</dt>
            <dd className="mt-1 font-medium text-slate-900">{(analysis.fileSize / 1024).toFixed(1)} KB</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-[0.14em] text-slate-400">SHA-256</dt>
            <dd className="mt-1 break-all font-mono text-xs text-slate-700">{analysis.checksumSha256}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.14em] text-slate-400">Sheets detected</dt>
            <dd className="mt-1 font-medium text-slate-900">
              {analysis.detectedSheetCount} / {analysis.expectedSheetCount} expected
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.14em] text-slate-400">Recognised</dt>
            <dd className="mt-1 font-medium text-slate-900">{analysis.recognisedSheetCount}</dd>
          </div>
        </dl>
      </Card>

      <Card title="Sheets detected">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.12em] text-slate-400">
              <tr>
                <th className="py-2 pr-4">Sheet</th>
                <th className="py-2 pr-4">Classification</th>
                <th className="py-2 pr-4">Rows</th>
                <th className="py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {analysis.detectedSheets.map((sheet) => (
                <tr key={sheet.sheetName} className="border-t border-slate-100 align-top">
                  <td className="py-2 pr-4 font-medium text-slate-900">{sheet.sheetName}</td>
                  <td className="py-2 pr-4 text-slate-600">{sheet.classification.replace(/_/g, ' ')}</td>
                  <td className="py-2 pr-4 text-slate-600">{sheet.rowCount}</td>
                  <td className="py-2 text-slate-500">{sheet.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {analysis.missingExpectedSheets.length > 0 ? (
          <p className="mt-3 text-sm text-amber-800">
            Missing expected sheets: {analysis.missingExpectedSheets.join(', ')}
          </p>
        ) : null}
      </Card>

      <form action={confirmGenericWorkbookImport} className="space-y-6">
        <input type="hidden" name="assessmentId" value={assessmentId} />

        {analysis.elements.map((element) => {
          const hasExisting = elementHasExistingData({
            elementKey: element.elementKey,
            financial: loaded.inputs.financial,
            ownership: loaded.inputs.ownership,
            managementControl: loaded.inputs.managementControl,
            skillsDevelopment: loaded.inputs.skillsDevelopment,
            contributionCounts,
          })
          const defaultDecision =
            element.elementKey === 'preferential_procurement'
              ? 'skip'
              : hasExisting
                ? 'keep_existing'
                : analysis.defaultDecisions[element.elementKey] ?? 'skip'

          return (
            <Card key={element.elementKey} title={element.displayName}>
              <div className="grid gap-3 text-sm text-slate-700">
                <p>
                  Valid rows {element.validRows} · Warnings {element.warningRows} · Rejected{' '}
                  {element.rejectedRows}
                  {hasExisting ? ' · Existing assessment data present' : ''}
                </p>
                {element.missingInputs.length > 0 ? (
                  <p className="text-amber-800">Missing: {element.missingInputs.join('; ')}</p>
                ) : null}
                {element.warnings.length > 0 ? (
                  <ul className="list-disc space-y-1 pl-5 text-slate-600">
                    {element.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                ) : null}
                <pre className="overflow-x-auto rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                  {JSON.stringify(element.summary, null, 2)}
                </pre>
                <label className="block">
                  <span className="text-xs uppercase tracking-[0.14em] text-slate-400">Import decision</span>
                  <select
                    name={`decision_${element.elementKey}`}
                    defaultValue={defaultDecision}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                    disabled={element.elementKey === 'preferential_procurement'}
                  >
                    {DECISION_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </Card>
          )
        })}

        <Card title="Confirmations required">
          <div className="space-y-3 text-sm text-slate-700">
            <label className="flex items-start gap-3">
              <input type="checkbox" name="warningsAccepted" className="mt-1 rounded border-slate-300" required />
              <span>
                I accept the listed warnings, missing fields and workbook defects. Workbook totals, levels and cached
                Excel errors will not be used for scoring.
              </span>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                name="procurementAcknowledged"
                className="mt-1 rounded border-slate-300"
                required
              />
              <span>
                Procurement will be attached separately from a completed Formal Procurement Assessment. Workbook
                procurement points will not be imported.
              </span>
            </label>
            <p className="text-slate-500">
              Existing element data is never overwritten automatically. Choose <strong>Replace existing data</strong>{' '}
              only when you intend to discard current values.
            </p>
            <button
              type="submit"
              className="rounded-full bg-[#063b3f] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#052e32]"
            >
              Confirm import
            </button>
            <Link
              href={`/scorecards/calculator/${assessmentId}/generic`}
              className="ml-4 text-sm font-medium text-slate-600 hover:underline"
            >
              Cancel
            </Link>
          </div>
        </Card>
      </form>
    </Shell>
  )
}
