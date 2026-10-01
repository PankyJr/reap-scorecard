import Link from 'next/link'
import { notFound } from 'next/navigation'
import { loadGenericAssessment } from '../load'
import { confirmGenericWorkbookImport } from '../actions'
import { Flash, Shell } from '../ui'
import { Panel, MoreOptions, FactList } from '@/components/ui/Panel'
import { Notice } from '@/components/ui/Notice'
import { Term } from '@/components/ui/Term'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { PendingSubmitButton } from '@/components/ui/PendingSubmitButton'
import { workflowForLoaded } from '../workflow-context'
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

  const { assessment, company, elements, contributions } = loaded
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
        companyId={company.id}
        assessmentName={assessment.name}
        current="workbook-review"
        title="Check the imported data"
        workflow={workflow}
      >
        <Flash searchParams={query} />
        <Notice
          tone="info"
          title="There is no workbook waiting to be checked"
          action={
            <Link href={`/scorecards/calculator/${assessmentId}/generic`} className={buttonStyles({ variant: 'primary' })}>
              Go to the overview
            </Link>
          }
        >
          Either it has already been imported, or none has been uploaded yet. Upload one from the scorecard overview.
        </Notice>
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
      skills: elements.find((row) => row.element_key === 'skills_development')?.contextual_inputs,
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

  const decisionLabel: Record<string, string> = {
    import: 'Import',
    skip: 'Skip',
    keep_existing: 'Keep what is there',
    replace_existing: 'Replace with the workbook',
    merge_missing_only: 'Only fill in the gaps',
  }

  return (
    <Shell
      assessmentId={assessmentId}
      companyName={company.name}
      companyId={company.id}
      assessmentName={assessment.name}
      current="workbook-review"
      title="Check the imported data"
      subtitle="Nothing is saved until you confirm. Scores and levels typed in the workbook are ignored; the app works them out itself."
      workflow={workflow}
    >
      <Flash searchParams={query} />

      <Panel title="Import summary">
        <p className="text-base text-ink">
          Found <strong>{sectionsFound}</strong> of the scorecard’s sections in {analysis.filename} ({analysis.sheetCount} of{' '}
          {analysis.expectedSheetCount} sheets). <strong>{sectionsReady}</strong> are complete;{' '}
          <strong>{sectionsNeedingConfirmation}</strong> will need something from you after the import.
        </p>
        <p className="mt-3 text-[15px] text-muted">
          Procurement is never read from the workbook: you attach a <Term k="procurementScorecard">procurement scorecard</Term>{' '}
          on the Preferential procurement element.
        </p>
      </Panel>

      <form action={confirmGenericWorkbookImport} className="space-y-6">
        <input type="hidden" name="assessmentId" value={assessmentId} />

        <Panel title="What will be imported" description="The recommended choice is already selected for each section.">
          <ul className="divide-y divide-line rounded-control border border-line">
            {analysis.elements.map((element) => {
              const hasExisting = Boolean(existingFlags[element.elementKey])
              const recommended = recommendedAction({
                willPopulate: element.willPopulate,
                hasExisting,
                defaultDecision: defaults[element.elementKey],
              })
              const options = hasExisting
                ? ['import', 'skip', 'keep_existing', 'replace_existing', 'merge_missing_only']
                : ['import', 'skip']
              return (
                <li key={element.elementKey} className="px-4 py-3.5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-ink">{element.displayName}</p>
                      <p className="text-[15px] text-muted">
                        {element.willPopulate ? 'Found in the workbook' : 'Not found in the workbook'}
                        {element.missingInputs.length > 0
                          ? `. Still needed: ${element.missingInputs.slice(0, 2).join('; ')}${element.missingInputs.length > 2 ? '…' : ''}`
                          : element.willPopulate
                            ? '. Nothing missing.'
                            : ''}
                      </p>
                      {hasExisting ? (
                        <p className="text-[15px] font-medium text-warn">This scorecard already has figures here. Choose what to do.</p>
                      ) : null}
                    </div>
                    <label className="shrink-0 text-sm text-muted sm:w-64">
                      <span className="sr-only">Import choice for {element.displayName}</span>
                      <select
                        name={`decision_${element.elementKey}`}
                        defaultValue={recommended}
                        className="block w-full rounded-control border border-line-strong bg-surface px-3 py-2 text-[15px] text-ink"
                      >
                        {options.map((value) => (
                          <option key={value} value={value}>
                            {decisionLabel[value]}
                            {recommended === value ? ' (recommended)' : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {element.summary.length > 0 || element.warnings.length > 0 ? (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-[15px] font-semibold text-brand">See what was read</summary>
                      <dl className="mt-2 grid gap-2 text-[15px] sm:grid-cols-2">
                        {element.summary.map((entry) => (
                          <div key={entry.key}>
                            <dt className="text-sm text-muted">{entry.label}</dt>
                            <dd className="font-medium tabular-nums text-ink">{formatTypedDisplayValue(entry)}</dd>
                          </div>
                        ))}
                      </dl>
                      {element.warnings.length > 0 ? (
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
                          {element.warnings.slice(0, 6).map((warning) => (
                            <li key={warning}>{warning}</li>
                          ))}
                        </ul>
                      ) : null}
                    </details>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </Panel>

        <Panel title="Confirm">
          <div className="space-y-3 text-[15px] text-ink">
            <label className="flex items-start gap-3">
              <input type="checkbox" name="acceptWarnings" className="mt-1 h-4 w-4 accent-[var(--reap-brand)]" />
              <span>Import the sections as chosen above. I know scores and levels typed in the workbook are ignored.</span>
            </label>
            <label className="flex items-start gap-3">
              <input type="checkbox" name="acknowledgeMissingFields" className="mt-1 h-4 w-4 accent-[var(--reap-brand)]" required />
              <span>I will fill in anything that is still missing after the import.</span>
            </label>
            <label className="flex items-start gap-3">
              <input type="checkbox" name="acknowledgeProcurementSeparate" className="mt-1 h-4 w-4 accent-[var(--reap-brand)]" required />
              <span>I will attach a procurement scorecard separately; procurement is not read from this workbook.</span>
            </label>
          </div>
          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row">
            <Link href={`/scorecards/calculator/${assessmentId}/generic`} className={buttonStyles({ variant: 'secondary' })}>
              Cancel
            </Link>
            <PendingSubmitButton label="Confirm and import" pendingLabel="Importing…" className={buttonStyles({ variant: 'primary' })} />
          </div>
        </Panel>
      </form>

      <MoreOptions label="Audit details (file, checksum, sheets)">
        <FactList
          items={[
            { label: 'File', value: analysis.filename },
            { label: 'Size', value: `${(analysis.fileSize / 1024).toFixed(1)} KB` },
            { label: 'Import version', value: analysis.importVersion },
            { label: 'Cells showing Excel errors', value: excelErrorTotal },
            { label: 'SHA-256 checksum', value: <span className="break-all font-mono text-sm">{analysis.checksumSha256}</span> },
          ]}
        />
        <div className="relative overflow-x-auto rounded-control border border-line bg-surface">
          <table className="min-w-full text-left text-[15px]">
            <thead className="bg-sunken text-sm text-muted">
              <tr>
                <th scope="col" className="px-3 py-2">Sheet</th>
                <th scope="col" className="px-3 py-2">Recognised as</th>
                <th scope="col" className="px-3 py-2">Used for</th>
                <th scope="col" className="px-3 py-2">Rows</th>
              </tr>
            </thead>
            <tbody>
              {analysis.sheets.map((sheet) => (
                <tr key={sheet.detectedName} className="border-t border-line align-top">
                  <td className="px-3 py-2 font-medium text-ink">{sheet.detectedName}</td>
                  <td className="px-3 py-2 text-muted">{sheet.canonicalName ?? 'Not recognised'}</td>
                  <td className="px-3 py-2 text-muted">{sheet.classification.replace(/_/g, ' ')}</td>
                  <td className="px-3 py-2 tabular-nums text-muted">
                    {sheet.rowCount}
                    {sheet.excelErrorCount > 0 ? ` (${sheet.excelErrorCount} errors)` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {[...analysis.workbookDefects, ...analysis.demonstrationRowWarnings].length > 0 ? (
          <ul className="list-disc space-y-1 pl-5 text-[15px] text-muted">
            {[...analysis.workbookDefects, ...analysis.demonstrationRowWarnings].map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
      </MoreOptions>
    </Shell>
  )
}
