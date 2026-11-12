import Link from 'next/link'
import { notFound } from 'next/navigation'
import { loadGenericAssessment } from '../load'
import { confirmGenericWorkbookImport } from '../actions'
import { Flash, Shell } from '../ui'
import { Card, MoreOptions, FactList } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHelpData } from '@/components/help/PageHelpData'
import { HelpLink } from '@/components/help/HelpLink'
import { FileSpreadsheet } from 'lucide-react'
import { Term } from '@/components/ui/Term'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { PendingSubmitButton } from '@/components/ui/PendingSubmitButton'
import { workflowForLoaded } from '../workflow-context'
import { formatTypedDisplayValue, plainMissingInput } from '@/lib/scorecard/generic/ux/display-values'
import {
  defaultDecisionsForAnalysis,
  hasExistingElementData,
  type GenericWorkbookAnalysis,
  type ImportElementKey,
} from '@/lib/scorecard/generic/workbook-import'

// Design rule 17: the browser tab says which page this is.
export const metadata = { title: 'Check imported data' }

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
  const base = `/scorecards/calculator/${assessmentId}/generic`
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
        <PageHelpData
          page="workbook-review"
          data={{ waiting: false, overviewHref: base, confirmHref: base, hasWarnings: false, needsInput: 0 }}
        />
        <div data-help="workbook-review-empty">
          <EmptyState
            icon={<FileSpreadsheet aria-hidden />}
            title="No workbook is waiting to be checked"
            action={
              <Link href={base} className={buttonStyles({ variant: 'primary' })}>
                Go to the overview
              </Link>
            }
          >
            Either it has already been imported, or none has been uploaded yet. Upload one from the scorecard overview.
            <span className="mt-1 block">
              <HelpLink />
            </span>
          </EmptyState>
        </div>
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
  // The import stops unless the first box is ticked whenever any section has warnings.
  const hasWarnings = analysis.elements.some((element) => element.warningCount > 0)

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
      <PageHelpData
        page="workbook-review"
        data={{
          waiting: true,
          overviewHref: base,
          confirmHref: `${base}/workbook-review#confirm`,
          hasWarnings,
          needsInput: sectionsNeedingConfirmation,
        }}
      />

      <Card title="Import summary" data-help="workbook-review-summary">
        <p className="text-body text-ink">
          Found <strong>{sectionsFound}</strong> of the scorecard’s sections in your <Term k="workbook">workbook</Term>,{' '}
          {analysis.filename} ({analysis.sheetCount} of {analysis.expectedSheetCount} sheets). <strong>{sectionsReady}</strong>{' '}
          are complete; <strong>{sectionsNeedingConfirmation}</strong> will need something from you after the import.
        </p>
        <p className="mt-3 text-body text-label">
          Procurement is never read from the workbook: you attach a <Term k="procurementScorecard">procurement scorecard</Term>{' '}
          on the Procurement area.
        </p>
      </Card>

      <form action={confirmGenericWorkbookImport} className="space-y-6">
        <input type="hidden" name="assessmentId" value={assessmentId} />

        <Card
          title="What will be imported"
          description="The recommended choice is already selected for each section. Import fills the section from the workbook; Skip leaves it as it is. Where the scorecard already has figures you can also keep them, replace them, or only fill in the gaps."
          data-help="workbook-review-choices"
        >
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
                      <p className="text-body font-semibold text-ink">{element.displayName}</p>
                      <p className="text-body text-label">
                        {element.willPopulate ? 'Found in the workbook' : 'Not found in the workbook'}
                        {element.missingInputs.length > 0
                          ? `. Still needed: ${element.missingInputs.slice(0, 2).map(plainMissingInput).join('; ')}${element.missingInputs.length > 2 ? '…' : ''}`
                          : element.willPopulate
                            ? '. Nothing missing.'
                            : ''}
                      </p>
                      {hasExisting ? (
                        <p className="text-body font-medium text-warn">This scorecard already has figures here. Choose what to do.</p>
                      ) : null}
                    </div>
                    <label className="shrink-0 text-meta text-label sm:w-64">
                      <span className="sr-only">Import choice for {element.displayName}</span>
                      <select
                        name={`decision_${element.elementKey}`}
                        defaultValue={recommended}
                        className="block w-full rounded-control border border-line-strong bg-surface px-3 py-2 text-body text-ink"
                      >
                        {options.map((value) => (
                          <option key={value} value={value}>
                            {decisionLabel[value]}
                            {recommended === value ? ' (recommended)' : ''}
                          </option>
                        ))}
                      </select>
                      <span className="mt-1 block text-meta text-label">
                        {hasExisting
                          ? 'Keep what is there leaves your figures; Replace overwrites them; Only fill in the gaps adds the workbook’s figures where yours are empty.'
                          : element.willPopulate
                            ? 'Import fills this section from the workbook. Check the figures under See what was read first.'
                            : 'Nothing was found for this section, so Skip is selected. Type its figures in its area after the import.'}
                      </span>
                    </label>
                  </div>
                  {element.summary.length > 0 || element.warnings.length > 0 ? (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-body font-semibold text-teal">See what was read</summary>
                      <dl className="mt-2 grid gap-2 text-body sm:grid-cols-2">
                        {element.summary.map((entry) => (
                          <div key={entry.key}>
                            <dt className="text-meta text-label">{entry.label}</dt>
                            <dd className="font-medium tabular-nums text-ink">{formatTypedDisplayValue(entry)}</dd>
                          </div>
                        ))}
                      </dl>
                      {element.warnings.length > 0 ? (
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-meta text-label">
                          {[...new Set(element.warnings)].slice(0, 6).map((warning) => (
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
        </Card>

        <Card title="Confirm" id="confirm" data-help="workbook-review-confirm">
          <div className="space-y-3 text-body text-ink">
            <label className="flex items-start gap-3">
              <input type="checkbox" name="acceptWarnings" className="mt-1 h-4 w-4 accent-[var(--reap-brand)]" />
              <span>
                Import the sections as chosen above. I know scores and levels typed in the workbook are ignored.
                <span className="block text-meta text-label">
                  {hasWarnings
                    ? 'Needed here: some sections have warnings (see “See what was read”), and the import stops without this tick.'
                    : 'Only needed when a section has warnings; none do in this workbook.'}
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3">
              <input type="checkbox" name="acknowledgeMissingFields" className="mt-1 h-4 w-4 accent-[var(--reap-brand)]" required />
              <span>
                I will fill in anything that is still missing after the import.
                <span className="block text-meta text-label">
                  Anything listed as “Still needed” above stays empty until you type it in. For example: a missing industry
                  profit margin is typed into Financial figures.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3">
              <input type="checkbox" name="acknowledgeProcurementSeparate" className="mt-1 h-4 w-4 accent-[var(--reap-brand)]" required />
              <span>
                I will attach a procurement scorecard separately; procurement is not read from this workbook.
                <span className="block text-meta text-label">You attach it on the Procurement area of this scorecard.</span>
              </span>
            </label>
          </div>
          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row">
            <Link href={`/scorecards/calculator/${assessmentId}/generic`} className={buttonStyles({ variant: 'secondary' })}>
              Cancel
            </Link>
            <PendingSubmitButton label="Confirm and import" pendingLabel="Importing…" className={buttonStyles({ variant: 'primary' })} />
          </div>
        </Card>
      </form>

      <div data-help="workbook-review-audit">
      <MoreOptions label="Audit details (file, checksum, sheets)">
        <FactList
          items={[
            { label: 'File', value: analysis.filename },
            { label: 'Size', value: `${(analysis.fileSize / 1024).toFixed(1)} KB` },
            { label: 'Import version', value: analysis.importVersion },
            { label: 'Cells showing Excel errors', value: excelErrorTotal },
            { label: 'SHA-256 checksum', value: <span className="break-all font-mono text-body">{analysis.checksumSha256}</span> },
          ]}
        />
        <div className="relative overflow-x-auto rounded-control border border-line bg-surface">
          <table className="min-w-full text-left text-body">
            <thead className="bg-sunken text-meta text-label">
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
                  <td className="px-3 py-2 text-label">{sheet.canonicalName ?? 'Not recognised'}</td>
                  <td className="px-3 py-2 text-label">{sheet.classification.replace(/_/g, ' ')}</td>
                  <td className="px-3 py-2 tabular-nums text-label">
                    {sheet.rowCount}
                    {sheet.excelErrorCount > 0 ? ` (${sheet.excelErrorCount} errors)` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {[...analysis.workbookDefects, ...analysis.demonstrationRowWarnings].length > 0 ? (
          <ul className="list-disc space-y-1 pl-5 text-body text-label">
            {[...analysis.workbookDefects, ...analysis.demonstrationRowWarnings].map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
      </MoreOptions>
      </div>
    </Shell>
  )
}
