import Link from 'next/link'
import { notFound } from 'next/navigation'
import { loadGenericAssessment } from '../load'
import { confirmGenericWorkbookImport } from '../actions'
import { AssessmentAside, Card, Flash, Shell } from '../ui'
import { storedCalculation, workflowForLoaded } from '../workflow-context'
import { formatTypedDisplayValue } from '@/lib/scorecard/generic/ux/display-values'
import {
  defaultDecisionsForAnalysis,
  hasExistingElementData,
  type GenericWorkbookAnalysis,
  type ImportElementKey,
} from '@/lib/scorecard/generic/workbook-import'

type PageProps = {
  params: Promise<{ assessmentId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function recommendedAction(args: {
  willPopulate: boolean
  hasExisting: boolean
  defaultDecision: string
}): string {
  if (!args.willPopulate) return 'skip'
  if (!args.hasExisting) return 'import'
  return args.defaultDecision
}

export default async function GenericWorkbookReviewPage({ params, searchParams }: PageProps) {
  const { assessmentId } = await params
  const query = await searchParams
  const loaded = await loadGenericAssessment(assessmentId)
  if (!loaded) notFound()

  const { assessment, company, preview, elements, contributions } = loaded
  const workflow = workflowForLoaded(loaded, 'workbook-review')
  const analysis =
    (assessment as { workbook_import_preview?: GenericWorkbookAnalysis | null })
      .workbook_import_preview ??
    ((assessment.metadata as { generic_workbook_import?: { pending_analysis?: GenericWorkbookAnalysis } } | null)
      ?.generic_workbook_import?.pending_analysis ?? null)

  if (!analysis) {
    return (
      <Shell
        assessmentId={assessmentId}
        companyName={company.name}
        assessmentName={assessment.name}
        current=""
        title="Workbook review"
        subtitle="No pending workbook analysis was found. Upload a Generic Scorecard workbook from the assessment overview."
        workflow={workflow}
        aside={
          <AssessmentAside
            preview={preview}
            workflow={workflow}
            stored={storedCalculation(loaded)}
          />
        }
      >
        <Flash searchParams={query} />
        <Card title="Upload required">
          <Link href={`/scorecards/calculator/${assessmentId}/generic`} className="text-sm font-medium text-[#063b3f] underline">
            Return to assessment overview
          </Link>
        </Card>
      </Shell>
    )
  }

  const existingFlags: Partial<Record<ImportElementKey, boolean>> = {
    financial: hasExistingElementData({ elementKey: 'financial', financial: assessment.financial_inputs }),
    ownership: hasExistingElementData({ elementKey: 'ownership', ownership: assessment.ownership_inputs }),
    management_control: hasExistingElementData({
      elementKey: 'management_control',
      hasMcImport: Boolean(elements.find((row) => row.element_key === 'management_control')?.import_snapshot),
    }),
    skills_development: hasExistingElementData({
      elementKey: 'skills_development',
      hasSkills: Boolean(elements.find((row) => row.element_key === 'skills_development')?.contextual_inputs),
    }),
    enterprise_development: hasExistingElementData({
      elementKey: 'enterprise_development',
      contributionsByElement: {
        enterprise_development: contributions.filter((row) => row.element_key === 'enterprise_development').length,
      },
    }),
    supplier_development: hasExistingElementData({
      elementKey: 'supplier_development',
      contributionsByElement: {
        supplier_development: contributions.filter((row) => row.element_key === 'supplier_development').length,
      },
    }),
    socio_economic_development: hasExistingElementData({
      elementKey: 'socio_economic_development',
      contributionsByElement: {
        socio_economic_development: contributions.filter((row) => row.element_key === 'socio_economic_development')
          .length,
      },
    }),
  }
  const defaults = defaultDecisionsForAnalysis(analysis, existingFlags)

  const sectionsFound = analysis.elements.filter((element) => element.willPopulate).length
  const sectionsReady = analysis.elements.filter(
    (element) => element.willPopulate && element.missingInputs.length === 0,
  ).length
  const sectionsNeedingConfirmation = analysis.elements.filter(
    (element) => element.willPopulate && (element.missingInputs.length > 0 || element.warningCount > 0),
  ).length
  const excelErrorTotal = analysis.sheets.reduce((sum, sheet) => sum + sheet.excelErrorCount, 0)

  return (
    <Shell
      assessmentId={assessmentId}
      companyName={company.name}
      assessmentName={assessment.name}
      current=""
      title="Review workbook before import"
      subtitle="Nothing is written until you confirm. The workbook is an input source only — scores and levels from Excel are ignored."
      workflow={workflow}
      aside={
        <AssessmentAside
          preview={preview}
          workflow={workflow}
          stored={storedCalculation(loaded)}
        />
      }
    >
      <Flash searchParams={query} />

      <Card title="Import summary">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Sheets detected</dt>
            <dd className="font-medium text-slate-900">
              {analysis.sheetCount} / {analysis.expectedSheetCount} expected
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Scorecard sections found</dt>
            <dd className="font-medium text-slate-900">{sectionsFound}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Sections ready to import</dt>
            <dd className="font-medium text-slate-900">{sectionsReady}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Sections needing confirmation</dt>
            <dd className="font-medium text-slate-900">{sectionsNeedingConfirmation}</dd>
          </div>
        </dl>
        <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Procurement stays separate. {analysis.procurementNotice}
        </p>
      </Card>

      <details className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <summary className="cursor-pointer text-base font-semibold text-slate-950">Audit details</summary>
        <div className="mt-4 space-y-4 text-sm text-slate-700">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Filename</dt>
              <dd className="font-medium text-slate-900">{analysis.filename}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Size</dt>
              <dd className="font-medium text-slate-900">{(analysis.fileSize / 1024).toFixed(1)} KB</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase tracking-wide text-slate-500">SHA-256 checksum</dt>
              <dd className="break-all font-mono text-xs text-slate-700">{analysis.checksumSha256}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Import version</dt>
              <dd className="font-medium text-slate-900">{analysis.importVersion}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-500">Raw Excel-error count</dt>
              <dd className="font-medium text-slate-900">{excelErrorTotal}</dd>
            </div>
          </dl>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Detected</th>
                  <th className="py-2 pr-4">Canonical</th>
                  <th className="py-2 pr-4">Classification</th>
                  <th className="py-2 pr-4">Rows</th>
                  <th className="py-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {analysis.sheets.map((sheet) => (
                  <tr key={sheet.detectedName} className="border-t border-slate-100 align-top">
                    <td className="py-2 pr-4 font-medium text-slate-900">{sheet.detectedName}</td>
                    <td className="py-2 pr-4 text-slate-700">{sheet.canonicalName ?? '—'}</td>
                    <td className="py-2 pr-4 text-slate-700">{sheet.classification.replace(/_/g, ' ')}</td>
                    <td className="py-2 pr-4 text-slate-700">
                      {sheet.rowCount}
                      {sheet.excelErrorCount > 0 ? ` · ${sheet.excelErrorCount} errors` : ''}
                    </td>
                    <td className="py-2 text-slate-600">{sheet.notes ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {[...analysis.workbookDefects, ...analysis.demonstrationRowWarnings].length > 0 ? (
            <ul className="list-disc space-y-1 pl-5">
              {[...analysis.workbookDefects, ...analysis.demonstrationRowWarnings].map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </details>

      <form action={confirmGenericWorkbookImport} className="space-y-6">
        <input type="hidden" name="assessmentId" value={assessmentId} />

        {analysis.elements.map((element) => {
          const hasExisting = Boolean(existingFlags[element.elementKey])
          const recommended = recommendedAction({
            willPopulate: element.willPopulate,
            hasExisting,
            defaultDecision: defaults[element.elementKey],
          })

          return (
            <Card
              key={element.elementKey}
              title={element.displayName}
              footer={
                <label className="block text-sm text-slate-700">
                  Import decision
                  <select
                    name={`decision_${element.elementKey}`}
                    defaultValue={recommended}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                  >
                    <option value="import">
                      Import{recommended === 'import' ? ' — Recommended' : ''}
                    </option>
                    <option value="skip">
                      Skip{recommended === 'skip' ? ' — Recommended' : ''}
                    </option>
                    {hasExisting ? (
                      <>
                        <option value="keep_existing">
                          Keep existing{recommended === 'keep_existing' ? ' — Recommended' : ''}
                        </option>
                        <option value="replace_existing">
                          Replace{recommended === 'replace_existing' ? ' — Recommended' : ''}
                        </option>
                        <option value="merge_missing_only">
                          Merge missing values
                          {recommended === 'merge_missing_only' ? ' — Recommended' : ''}
                        </option>
                      </>
                    ) : null}
                  </select>
                </label>
              }
            >
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <p>
                  Found: <strong>{element.willPopulate ? 'Yes' : 'Not found'}</strong>
                </p>
                <p>
                  Warning count: <strong>{element.warningCount}</strong>
                </p>
              </div>

              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Data summary</p>
                <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                  {element.summary.map((entry) => (
                    <div key={entry.key}>
                      <dt className="text-xs uppercase tracking-wide text-slate-500">{entry.label}</dt>
                      <dd className="font-medium text-slate-900">{formatTypedDisplayValue(entry)}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              {element.missingInputs.length > 0 ? (
                <p className="mt-3 text-sm text-amber-800">
                  Missing information: {element.missingInputs.join('; ')}
                </p>
              ) : (
                <p className="mt-3 text-sm text-emerald-800">Missing information: none for import</p>
              )}

              <p className="mt-2 text-sm text-slate-700">
                Recommended action:{' '}
                <strong>
                  {recommended === 'import'
                    ? 'Import'
                    : recommended === 'skip'
                      ? 'Skip'
                      : recommended === 'keep_existing'
                        ? 'Keep existing'
                        : recommended === 'replace_existing'
                          ? 'Replace'
                          : 'Merge missing values'}
                </strong>
              </p>

              {element.warnings.length > 0 ? (
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
                  {element.warnings.slice(0, 6).map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : null}

              {hasExisting ? (
                <p className="mt-3 text-sm font-medium text-rose-700">
                  Existing assessment data is present for this section. Choose Keep existing, Replace, or Merge missing
                  values.
                </p>
              ) : null}
            </Card>
          )
        })}

        <Card title="Confirmations required">
          <div className="space-y-3 text-sm text-slate-700">
            <label className="flex items-start gap-3">
              <input type="checkbox" name="acceptWarnings" className="mt-1" />
              <span>I accept the listed warnings and understand workbook scores/levels are ignored.</span>
            </label>
            <label className="flex items-start gap-3">
              <input type="checkbox" name="acknowledgeMissingFields" className="mt-1" required />
              <span>I understand missing fields will remain incomplete until captured or confirmed manually.</span>
            </label>
            <label className="flex items-start gap-3">
              <input type="checkbox" name="acknowledgeProcurementSeparate" className="mt-1" required />
              <span>
                I understand procurement must be attached from a completed Formal Procurement Assessment and is not
                imported from this workbook.
              </span>
            </label>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="submit"
              className="rounded-xl bg-[#063b3f] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#052e32]"
            >
              Confirm import
            </button>
            <Link
              href={`/scorecards/calculator/${assessmentId}/generic`}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700"
            >
              Cancel
            </Link>
          </div>
        </Card>
      </form>
    </Shell>
  )
}
