import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, PencilLine, Upload, Zap } from 'lucide-react'
import { loadGenericAssessment } from './load'
import { uploadGenericWorkbookForReview } from './actions'
import { Flash, Shell } from './ui'
import { PendingSubmitButton } from '@/components/ui/PendingSubmitButton'
import { resolveImportStatus, storedCalculation, workbookReading, workflowForLoaded, workspaceFor } from './workflow-context'
import { GENERIC_CODES_USER_LABEL, isWorkbookImportConfirmed } from '@/lib/scorecard/generic/ux/workflow'
import { importSummary, startedByHand as hasStartedByHand } from '@/lib/scorecard/generic/ux/areas'
import { formatPoints } from '@/lib/scorecard/generic/ux/display-values'
import { Panel, MoreOptions } from '@/components/ui/Panel'
import { Notice } from '@/components/ui/Notice'
import { Term } from '@/components/ui/Term'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { SpreadsheetFileInput } from '@/components/uploads/SpreadsheetFileInput'
import { SPREADSHEET_UPLOAD_MAX_BYTES } from '@/lib/uploads/limits'
import { uploadLimitLabel } from '@/lib/uploads/spreadsheet-file'

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
        <span className="mt-1 text-sm text-muted">Excel file (.xlsx), up to {uploadLimitLabel(SPREADSHEET_UPLOAD_MAX_BYTES)}</span>
        <SpreadsheetFileInput
          maxBytes={SPREADSHEET_UPLOAD_MAX_BYTES}
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

export default async function GenericOverviewPage({ params, searchParams }: PageProps) {
  const { assessmentId } = await params
  const query = await searchParams
  const loaded = await loadGenericAssessment(assessmentId)
  if (!loaded) notFound()

  const { assessment, company, preview } = loaded
  const base = `/scorecards/calculator/${assessmentId}/generic`
  const { importStatus, pending } = resolveImportStatus(loaded)
  const workflow = workflowForLoaded(loaded, '')
  const workspace = workspaceFor(loaded, workflow, null)
  const workbookImported = isWorkbookImportConfirmed(importStatus)
  const reading = workbookReading(loaded) as (ReturnType<typeof workbookReading> & { appliedElements?: string[]; confirmedAt?: string }) | null
  const summary = workbookImported && reading ? importSummary(reading.appliedElements ?? [], preview) : null
  const stored = storedCalculation(loaded)
  const startedByHand = !workbookImported && !pending && hasStartedByHand(workspace.rows)

  return (
    <Shell
      assessmentId={assessmentId}
      companyName={company.name}
      companyId={company.id}
      assessmentName={assessment.name}
      current=""
      title={assessment.name}
      subtitle={`Full B-BBEE scorecard for ${company.name}, ${assessment.measurement_year}. Fill in the areas in any order; the score updates as you go.`}
      workflow={workflow}
      workspace={workspace}
    >
      <Flash searchParams={query} />

      {summary ? (
        <Notice tone={summary.missing.length ? 'info' : 'ok'} title={summary.sentence}>
          Procurement is not in the workbook: it comes from a procurement scorecard you attach.
        </Notice>
      ) : null}

      {pending ? (
        <Notice
          tone="info"
          title="The workbook has been read"
          action={
            <Link href={`${base}/workbook-review`} className={buttonStyles({ variant: 'primary' })}>
              Check what it found
            </Link>
          }
        >
          Look over what was found in {pending.filename}, then confirm it to fill in the scorecard.
        </Notice>
      ) : null}

      {!workbookImported && !pending && !startedByHand ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Panel
            title={
              <span className="flex items-center gap-2">
                Upload your workbook
                <span className="inline-flex items-center gap-1 rounded-full bg-ok-soft px-2 py-0.5 text-xs font-semibold text-ok">
                  <Zap className="h-3 w-3" aria-hidden /> Quick
                </span>
              </span>
            }
            description={
              <>
                The REAP scorecard <Term k="workbook">workbook</Term>. The app reads it, shows you what it found, and fills in
                what it can. Nothing is saved until you confirm.
              </>
            }
          >
            <UploadForm assessmentId={assessmentId} />
          </Panel>
          <Panel
            title={
              <span className="flex items-center gap-2">
                <PencilLine className="h-5 w-5 text-brand" aria-hidden /> Or fill it in by hand
              </span>
            }
            description="Type the figures into each area. Each field says what it is and gives an example."
          >
            <Link href={workspace.next?.href ?? `${base}/applicability`} className={buttonStyles({ variant: 'secondary' })}>
              Start with {workspace.next?.label ?? 'Company size and sector'} <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Panel>
        </div>
      ) : null}

      {workbookImported || startedByHand ? (
        <Panel title={workspace.next ? 'What to do next' : 'Everything is filled in'}>
          {workspace.next ? (
            <div className="space-y-3">
              <p className="text-[15px] text-ink">
                <strong>{workspace.next.label}</strong>
                {workspace.next.note ? `: ${workspace.next.note.charAt(0).toLowerCase()}${workspace.next.note.slice(1)}.` : '.'}
              </p>
              <Link href={workspace.next.href} className={buttonStyles({ variant: 'primary' })}>
                Go to {workspace.next.label} <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[15px] text-ink">Check the figures once more, then work out the final level.</p>
              <Link href={`${base}/review`} className={buttonStyles({ variant: 'primary' })}>
                Review my scorecard <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          )}
        </Panel>
      ) : null}

      {stored ? (
        <Panel title="Last worked out">
          <p className="text-[15px] text-ink">
            {stored.readiness.complete ? `${stored.finalLevel.level}, ` : ''}
            {formatPoints(stored.rawTotalPoints)} points
            {workflow.needsRecalculation ? '. Something has changed since, so review it again for an up-to-date result.' : '.'}
          </p>
          <Link href={`${base}/result`} className={buttonStyles({ variant: 'secondary', className: 'mt-3' })}>
            See the result
          </Link>
        </Panel>
      ) : null}

      <MoreOptions label={workbookImported ? 'Replace the workbook or see calculation details' : 'Upload a workbook or see calculation details'}>
        <div>
          <p className="text-[15px] font-semibold text-ink">{workbookImported ? 'Replace the workbook' : 'Upload a workbook'}</p>
          <p className="pb-3 text-[15px] text-muted">
            {reading?.filename ? `Currently from ${reading.filename}` : 'No workbook yet'}
            {reading?.confirmedAt ? `, confirmed ${new Date(reading.confirmedAt).toLocaleString('en-ZA')}` : ''}.{' '}
            {workbookImported ? 'Uploading a new one lets you choose, per area, what to replace.' : ''}
          </p>
          <UploadForm assessmentId={assessmentId} replace={workbookImported} />
        </div>
        <div className="border-t border-line pt-4 text-[15px] text-muted">
          <p>
            Rules: {GENERIC_CODES_USER_LABEL} ({preview.ruleSetKey}, version {preview.ruleSetVersion}). Measurement year{' '}
            {assessment.measurement_year}.
          </p>
        </div>
      </MoreOptions>
    </Shell>
  )
}
