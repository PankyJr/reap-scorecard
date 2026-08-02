import Link from 'next/link'
import { notFound } from 'next/navigation'
import { loadGenericAssessment } from '../load'
import { confirmGenericWorkbookImport } from '../actions'
import { Card, Flash, ResultSummary, Shell, formatRand, formatPoints } from '../ui'
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

export default async function GenericWorkbookReviewPage({ params, searchParams }: PageProps) {
  const { assessmentId } = await params
  const query = await searchParams
  const loaded = await loadGenericAssessment(assessmentId)
  if (!loaded) notFound()

  const { assessment, company, preview, elements, contributions } = loaded
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
        subtitle="No pending workbook analysis was found. Upload a Generic Scorecard workbook from the workspace overview."
        aside={<ResultSummary preview={preview} needsRecalculation={assessment.needs_recalculation} />}
      >
        <Flash searchParams={query} />
        <Card title="Upload required">
          <Link href={`/scorecards/calculator/${assessmentId}/generic`} className="text-sm font-medium text-[#063b3f] underline">
            Return to Generic workspace
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

  return (
    <Shell
      assessmentId={assessmentId}
      companyName={company.name}
      assessmentName={assessment.name}
      current=""
      title="Review workbook before import"
      subtitle="Nothing is written until you confirm. The workbook is an input source only — scores and levels from Excel are ignored."
      aside={<ResultSummary preview={preview} needsRecalculation={assessment.needs_recalculation} />}
    >
      <Flash searchParams={query} />

      <Card title="Workbook">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Filename</dt>
            <dd className="font-medium text-slate-900">{analysis.filename}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Size</dt>
            <dd className="font-medium text-slate-900">{(analysis.fileSize / 1024).toFixed(1)} KB</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-wide text-slate-500">SHA-256</dt>
            <dd className="break-all font-mono text-xs text-slate-700">{analysis.checksumSha256}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Sheets detected</dt>
            <dd className="font-medium text-slate-900">
              {analysis.sheetCount} / {analysis.expectedSheetCount} expected
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Recognised</dt>
            <dd className="font-medium text-slate-900">{analysis.recognisedSheetCount}</dd>
          </div>
        </dl>
      </Card>

      <Card title="Sheets detected">
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
        {analysis.unsupportedSheets.length > 0 ? (
          <p className="mt-3 text-sm text-amber-800">
            Unsupported sheets: {analysis.unsupportedSheets.join(', ')}
          </p>
        ) : null}
      </Card>

      <Card title="Procurement">
        <p className="text-sm text-slate-700">{analysis.procurementNotice}</p>
        <p className="mt-2 text-sm text-slate-600">
          After import, attach a completed Formal Procurement Assessment from the Procurement step.
        </p>
      </Card>

      <Card title="Workbook defects and warnings">
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          {[...analysis.workbookDefects, ...analysis.demonstrationRowWarnings].map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Card>

      <form action={confirmGenericWorkbookImport} className="space-y-6">
        <input type="hidden" name="assessmentId" value={assessmentId} />

        {analysis.elements.map((element) => (
          <Card
            key={element.elementKey}
            title={element.displayName}
            footer={
              <label className="block text-sm text-slate-700">
                Import decision
                <select
                  name={`decision_${element.elementKey}`}
                  defaultValue={defaults[element.elementKey]}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                >
                  <option value="import">Import</option>
                  <option value="skip">Skip</option>
                  <option value="keep_existing">Keep existing data</option>
                  <option value="replace_existing">Replace existing data</option>
                  <option value="merge_missing_only">Merge missing values only</option>
                </select>
              </label>
            }
          >
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <p>
                Will populate: <strong>{element.willPopulate ? 'Yes' : 'No'}</strong>
              </p>
              <p>
                Valid / warning / rejected: {element.validRowCount} / {element.warningCount} /{' '}
                {element.rejectedRowCount}
              </p>
            </div>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              {Object.entries(element.summary).map(([key, value]) => (
                <div key={key}>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">{key}</dt>
                  <dd className="font-medium text-slate-900">
                    {typeof value === 'number'
                      ? key.toLowerCase().includes('percent')
                        ? `${(value * 100).toFixed(2)}%`
                        : key.toLowerCase().includes('count')
                          ? String(value)
                          : formatRand(value)
                      : value == null
                        ? '—'
                        : String(value)}
                  </dd>
                </div>
              ))}
            </dl>
            {element.missingInputs.length > 0 ? (
              <p className="mt-3 text-sm text-amber-800">Missing: {element.missingInputs.join('; ')}</p>
            ) : null}
            {element.warnings.length > 0 ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
                {element.warnings.slice(0, 6).map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}
            {existingFlags[element.elementKey] ? (
              <p className="mt-3 text-sm font-medium text-rose-700">
                Existing assessment data is present for this element. Choose Replace to overwrite, or Keep / Merge.
              </p>
            ) : null}
          </Card>
        ))}

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
          <p className="mt-3 text-xs text-slate-500">
            Live preview points ({formatPoints(preview.totalBasePointsAchieved)}) are unchanged until you confirm
            and recalculate.
          </p>
        </Card>
      </form>
    </Shell>
  )
}
