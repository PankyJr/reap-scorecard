import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Upload } from 'lucide-react'
import { loadGenericAssessment } from './load'
import { uploadGenericWorkbookForReview } from './actions'
import { AssessmentAside, Flash, NextActionCard, Shell, formatElementPoints } from './ui'
import { PendingSubmitButton } from '@/components/ui/PendingSubmitButton'
import { resolveImportStatus, storedCalculation, workflowForLoaded } from './workflow-context'
import { buildElementCardViews, GENERIC_CODES_USER_LABEL, isWorkbookImportConfirmed } from '@/lib/scorecard/generic/ux/workflow'
import { Panel, MoreOptions } from '@/components/ui/Panel'
import { Notice } from '@/components/ui/Notice'
import { StatusBadge, type BadgeTone } from '@/components/ui/StatusBadge'
import { Term } from '@/components/ui/Term'
import { buttonStyles } from '@/components/ui/buttonStyles'

type PageProps = {
  params: Promise<{ assessmentId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function UploadForm({ assessmentId, replace }: { assessmentId: string; replace?: boolean }) {
  return (
    <form action={uploadGenericWorkbookForReview} className="space-y-4">
      <input type="hidden" name="assessmentId" value={assessmentId} />
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed border-line-strong bg-sunken px-6 py-8 text-center hover:border-brand" data-tour="upload">
        <Upload className="mb-3 h-8 w-8 text-brand" aria-hidden />
        <span className="text-base font-semibold text-ink">{replace ? 'Choose the new workbook' : 'Choose the scorecard workbook'}</span>
        <span className="mt-1 text-sm text-muted">Excel file (.xlsx), up to 8 MB</span>
        <input
          type="file"
          name="workbook"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          required
          className="mt-4 block w-full max-w-md text-[15px] text-muted file:mr-3 file:rounded-control file:border-0 file:bg-brand file:px-3.5 file:py-2 file:text-[15px] file:font-semibold file:text-white"
        />
      </label>
      <PendingSubmitButton
        label={replace ? 'Read the new workbook' : 'Read the workbook'}
        pendingLabel="Reading the workbook…"
        className={buttonStyles({ variant: 'primary' })}
      />
    </form>
  )
}

const statusTone = (label: string): BadgeTone =>
  /complete|calculated/i.test(label) ? 'ok' : /needs|again/i.test(label) ? 'warn' : /not started/i.test(label) ? 'neutral' : 'brand'

export default async function GenericOverviewPage({ params, searchParams }: PageProps) {
  const { assessmentId } = await params
  const query = await searchParams
  const loaded = await loadGenericAssessment(assessmentId)
  if (!loaded) notFound()

  const { assessment, company, preview, elements } = loaded
  const base = `/scorecards/calculator/${assessmentId}/generic`
  const { importStatus, pending } = resolveImportStatus(loaded)
  const confirmed = (assessment as { workbook_import_snapshot?: { filename?: string; confirmedAt?: string } | null })
    .workbook_import_snapshot
  const workflow = workflowForLoaded(loaded, '')
  const workbookImported = isWorkbookImportConfirmed(importStatus)
  const elementCards = buildElementCardViews({
    assessmentId,
    preview,
    elements,
    hasStoredCalculation: workflow.hasStoredCalculation,
    needsRecalculation: workflow.needsRecalculation,
    workbookImported,
  })
  const setupItems = workflow.items.filter((item) => item.id === 'applicability' || item.id === 'financial')
  const setupLabels: Record<string, { label: string; term: 'applicability' | 'npat' }> = {
    applicability: { label: 'Company size and sector', term: 'applicability' },
    financial: { label: 'Financial figures (revenue, profit, payroll)', term: 'npat' },
  }

  return (
    <Shell
      assessmentId={assessmentId}
      companyName={company.name}
      companyId={company.id}
      assessmentName={assessment.name}
      current=""
      title={assessment.name}
      subtitle={`Full B-BBEE scorecard for ${company.name}, ${assessment.measurement_year}.`}
      workflow={workflow}
    >
      <Flash searchParams={query} />

      {!workbookImported && !pending ? (
        <Panel
          title="Upload the scorecard workbook"
          description={
            <>
              Upload the company’s REAP Generic Scorecard <Term k="workbook">workbook</Term>. The app reads each sheet and
              shows you what it found. Nothing is saved until you confirm. Scores and levels typed in the workbook are
              ignored; the app works them out itself.
            </>
          }
        >
          <UploadForm assessmentId={assessmentId} />
        </Panel>
      ) : null}

      {pending ? (
        <Notice
          tone="info"
          title="The workbook has been read"
          action={
            <Link href={`${base}/workbook-review`} className={buttonStyles({ variant: 'primary' })}>
              Check imported data
            </Link>
          }
        >
          Look over what was found in {pending.filename}, then confirm it to fill in the scorecard.
        </Notice>
      ) : null}

      {workbookImported ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-6">
            <NextActionCard workflow={workflow} />

            <Panel title="Before the elements" description="Two sets of figures the elements are measured against.">
              <ul className="divide-y divide-line rounded-control border border-line">
                {setupItems.map((item) => (
                  <li key={item.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-base text-ink">
                      <Term k={setupLabels[item.id].term}>{setupLabels[item.id].label}</Term>
                    </span>
                    <span className="flex items-center gap-3">
                      <StatusBadge tone={item.complete ? 'ok' : 'warn'}>{item.complete ? 'Done' : 'To do'}</StatusBadge>
                      <Link href={item.href} className="text-[15px] font-semibold text-brand hover:underline">
                        {item.complete ? 'Review' : 'Add'}
                      </Link>
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel
              title="The seven elements"
              description={
                <>
                  Each <Term k="element">element</Term> scores part of the B-BBEE picture. Open one to see its points or fill a
                  gap.
                </>
              }
            >
              <ul className="grid gap-3 md:grid-cols-2" data-tour="scorecard-workspace">
                {elementCards.map((card) => {
                  const blocking = card.missingRequirements[0]
                  return (
                    <li key={card.elementKey} className="rounded-control border border-line px-4 py-3.5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="text-base font-semibold text-ink">{card.displayName}</p>
                          <StatusBadge tone={statusTone(card.statusLabel)}>{card.statusLabel}</StatusBadge>
                          {blocking ? <p className="text-[15px] text-warn">Needs: {blocking}</p> : null}
                        </div>
                        <div className="text-right">
                          <p className="text-base font-semibold tabular-nums text-ink">
                            {card.showPoints ? formatElementPoints(card.basePointsAchieved, card.basePointsAvailable) : `— / ${card.basePointsAvailable}`}
                          </p>
                          <p className="text-sm text-muted">points</p>
                        </div>
                      </div>
                      <Link href={card.actionHref} className="mt-2 inline-block text-[15px] font-semibold text-brand hover:underline">
                        {blocking ? 'Fix this' : 'Open'}
                        <span className="sr-only"> {card.displayName}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </Panel>
          </div>
          <aside className="min-w-0 space-y-4 lg:order-none">
            <AssessmentAside preview={preview} workflow={workflow} stored={storedCalculation(loaded)} />
          </aside>
        </div>
      ) : null}

      {workbookImported ? (
        <MoreOptions label="Replace the workbook or see calculation details">
          <div>
            <p className="text-[15px] font-semibold text-ink">Replace the workbook</p>
            <p className="pb-3 text-[15px] text-muted">
              {confirmed?.filename ? `Currently from ${confirmed.filename}` : 'Imported workbook'}
              {confirmed?.confirmedAt ? `, confirmed ${new Date(confirmed.confirmedAt).toLocaleString('en-ZA')}` : ''}.
              Uploading a new one lets you choose, per element, what to replace.
            </p>
            <UploadForm assessmentId={assessmentId} replace />
          </div>
          <div className="border-t border-line pt-4 text-[15px] text-muted">
            <p>
              Rules: {GENERIC_CODES_USER_LABEL} ({preview.ruleSetKey}, version {preview.ruleSetVersion}). Measurement year{' '}
              {assessment.measurement_year}.
            </p>
            <p>
              Procurement is not read from the workbook: it comes from a procurement scorecard you attach on the Preferential
              Procurement element.
            </p>
          </div>
        </MoreOptions>
      ) : null}
    </Shell>
  )
}
