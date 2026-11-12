import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, PencilLine, Upload } from 'lucide-react'
import { loadGenericAssessment } from './load'
import { uploadGenericWorkbookForReview } from './actions'
import { Flash, Shell } from './ui'
import { PendingSubmitButton } from '@/components/ui/PendingSubmitButton'
import { resolveImportStatus, storedCalculation, workbookReading, workflowForLoaded, workspaceFor } from './workflow-context'
import { GENERIC_CODES_USER_LABEL, isWorkbookImportConfirmed } from '@/lib/scorecard/generic/ux/workflow'
import { importSummary, startedByHand as hasStartedByHand } from '@/lib/scorecard/generic/ux/areas'
import { CARD_FRAME, MoreOptions, SectionTitle } from '@/components/ui/Card'
import { Callout } from '@/components/ui/Callout'
import { Chip } from '@/components/ui/Chip'
import { ScoreCard } from '@/components/scorecard/ScoreCard'
import { buildScorecardView } from '@/components/scorecard/scorecard-view'
import { Term } from '@/components/ui/Term'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { SpreadsheetFileInput } from '@/components/uploads/SpreadsheetFileInput'
import { SPREADSHEET_UPLOAD_MAX_BYTES } from '@/lib/uploads/limits'
import { uploadLimitLabel } from '@/lib/uploads/spreadsheet-file'

// Design rule 17: the browser tab says which page this is.
export const metadata = { title: 'Full scorecard' }

type PageProps = {
  params: Promise<{ assessmentId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function UploadForm({ assessmentId, replace }: { assessmentId: string; replace?: boolean }) {
  return (
    <form action={uploadGenericWorkbookForReview} className="space-y-4">
      <input type="hidden" name="assessmentId" value={assessmentId} />
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-control border border-dashed border-control-line bg-sunken px-6 py-6 text-center transition-colors duration-200 hover:border-teal" data-tour="upload">
        <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-control border border-line bg-surface text-icon">
          <Upload className="h-[18px] w-[18px]" aria-hidden />
        </span>
        <span className="text-body font-medium text-ink">{replace ? 'Choose the new workbook' : 'Choose the scorecard workbook'}</span>
        <span className="mt-1 text-meta text-label">Excel file (.xlsx), up to {uploadLimitLabel(SPREADSHEET_UPLOAD_MAX_BYTES)}</span>
        <SpreadsheetFileInput
          maxBytes={SPREADSHEET_UPLOAD_MAX_BYTES}
          name="workbook"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          required
          className="mt-4 block w-full max-w-md text-meta text-label file:mr-3 file:h-9 file:rounded-control file:border file:border-control-line file:bg-surface file:px-3 file:text-body file:font-medium file:text-ink"
        />
      </label>
      <PendingSubmitButton
        label={replace ? 'Read the new workbook' : 'Read the workbook'}
        pendingLabel="Reading the workbook…"
        className={buttonStyles({ variant: replace ? 'secondary' : 'primary' })}
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

      {/* The whole scorecard, compact: rings, the live points, level and status. */}
      <ScoreCard
        view={buildScorecardView(preview)}
        company={company.name}
        year={assessment.measurement_year}
        compact
        fillKey={`overview-${assessmentId}`}
      />

      {pending ? (
        <section className={`space-y-3 p-5 sm:p-6 ${CARD_FRAME}`}>
          <SectionTitle>The workbook has been read</SectionTitle>
          <p className="text-body text-label">Look over what was found in {pending.filename}, then confirm it to fill in the scorecard.</p>
          <Link href={`${base}/workbook-review`} className={buttonStyles({ variant: 'primary' })}>
            Check what it found <ArrowRight aria-hidden />
          </Link>
        </section>
      ) : null}

      {!workbookImported && !pending && !startedByHand ? (
        <div className="grid gap-4 md:grid-cols-2">
          <section className={`space-y-4 p-5 sm:p-6 ${CARD_FRAME}`}>
            <div className="space-y-1">
              <p className="flex flex-wrap items-center gap-2">
                <SectionTitle as="h2">Upload your workbook</SectionTitle>
                <Chip tone="progress">Quick</Chip>
              </p>
              <p className="text-meta text-label">
                The REAP scorecard <Term k="workbook">workbook</Term>. The app reads it, shows you what it found, and fills in
                what it can. Nothing is saved until you confirm.
              </p>
            </div>
            <UploadForm assessmentId={assessmentId} />
          </section>
          <section className={`space-y-4 p-5 sm:p-6 ${CARD_FRAME}`}>
            <span className="flex h-10 w-10 items-center justify-center rounded-control border border-line text-icon" aria-hidden>
              <PencilLine className="h-[18px] w-[18px]" />
            </span>
            <div className="space-y-1">
              <SectionTitle as="h2">Or fill it in by hand</SectionTitle>
              <p className="text-meta text-label">Type the figures into each area. Each field says what it is and gives an example.</p>
            </div>
            <Link href={workspace.next?.href ?? `${base}/applicability`} className={buttonStyles({ variant: 'secondary' })}>
              Start with {workspace.next?.label ?? 'Company size and sector'} <ArrowRight aria-hidden />
            </Link>
          </section>
        </div>
      ) : null}

      {workbookImported || startedByHand ? (
        <section className={`space-y-3 p-5 sm:p-6 ${CARD_FRAME}`} aria-labelledby="next-step">
          <SectionTitle id="next-step">{workspace.next ? 'What to do next' : 'Everything is filled in'}</SectionTitle>
          {workspace.next ? (
            <>
              <p className="text-body text-label">
                <span className="font-medium text-ink">{workspace.next.label}</span>
                {workspace.next.note ? `: ${workspace.next.note.charAt(0).toLowerCase()}${workspace.next.note.slice(1)}.` : '.'}
              </p>
              <Link href={workspace.next.href} className={buttonStyles({ variant: 'primary' })}>
                Go to {workspace.next.label} <ArrowRight aria-hidden />
              </Link>
            </>
          ) : (
            <>
              <p className="text-body text-label">Check the figures once more, then work out the final level.</p>
              <Link href={`${base}/review`} className={buttonStyles({ variant: 'primary' })}>
                Review my scorecard <ArrowRight aria-hidden />
              </Link>
            </>
          )}
          {stored ? (
            <p className="border-t border-line pt-3 text-meta text-label">
              {stored.readiness.complete ? `Last calculated: ${stored.finalLevel.level}.` : 'A result has been calculated and saved.'}
              {workflow.needsRecalculation ? ' Something has changed since, so review it again for an up-to-date result.' : ''}{' '}
              <Link href={`${base}/result`} className="font-medium text-teal hover:underline">
                See the result
              </Link>
            </p>
          ) : null}
        </section>
      ) : null}

      {summary ? (
        <Callout title={summary.sentence}>Procurement is not in the workbook: it comes from a procurement scorecard you attach.</Callout>
      ) : null}

      <MoreOptions label={workbookImported ? 'Replace the workbook or see calculation details' : 'Upload a workbook or see calculation details'}>
        <div>
          <p className="text-body font-medium text-ink">{workbookImported ? 'Replace the workbook' : 'Upload a workbook'}</p>
          <p className="pb-3 text-meta text-label">
            {reading?.filename ? `Currently from ${reading.filename}` : 'No workbook yet'}
            {reading?.confirmedAt ? `, confirmed ${new Date(reading.confirmedAt).toLocaleString('en-ZA')}` : ''}.{' '}
            {workbookImported ? 'Uploading a new one lets you choose, per area, what to replace.' : ''}
          </p>
          <UploadForm assessmentId={assessmentId} replace={workbookImported} />
        </div>
        <div className="border-t border-line pt-4 text-meta text-label">
          <p>
            Rules: {GENERIC_CODES_USER_LABEL} ({preview.ruleSetKey}, version {preview.ruleSetVersion}). Measurement year{' '}
            {assessment.measurement_year}.
          </p>
        </div>
      </MoreOptions>
    </Shell>
  )
}
