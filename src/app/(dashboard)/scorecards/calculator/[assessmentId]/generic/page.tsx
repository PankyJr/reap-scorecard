import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Upload } from 'lucide-react'
import { loadGenericAssessment } from './load'
import { uploadGenericWorkbookForReview } from './actions'
import {
  AssessmentAside,
  Card,
  Flash,
  NextActionCard,
  Shell,
  formatPoints,
} from './ui'
import { resolveImportStatus, storedCalculation, workflowForLoaded } from './workflow-context'
import {
  buildElementCardViews,
  GENERIC_CODES_USER_LABEL,
  isWorkbookImportConfirmed,
} from '@/lib/scorecard/generic/ux/workflow'


type PageProps = {
  params: Promise<{ assessmentId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function GenericOverviewPage({ params, searchParams }: PageProps) {
  const { assessmentId } = await params
  const query = await searchParams
  const loaded = await loadGenericAssessment(assessmentId)
  if (!loaded) notFound()

  const { assessment, company, preview, elements } = loaded
  const base = `/scorecards/calculator/${assessmentId}/generic`
  const { importStatus, pending } = resolveImportStatus(loaded)
  const confirmed = (assessment as { workbook_import_snapshot?: { filename?: string; confirmedAt?: string; status?: string } | null })
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

  return (
    <Shell
      assessmentId={assessmentId}
      companyName={company.name}
      assessmentName={assessment.name}
      current=""
      title="Generic scorecard workspace"
      subtitle="Follow five clear stages: set up the assessment, upload the workbook, review imported data, complete missing information, then calculate and report."
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

      {(workbookImported || pending) && <NextActionCard workflow={workflow} />}

      <Card title="Assessment">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Company</dt>
            <dd className="font-medium text-slate-900">{company.name}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Assessment</dt>
            <dd className="font-medium text-slate-900">{assessment.name}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Measurement year</dt>
            <dd className="font-medium text-slate-900">{assessment.measurement_year}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Calculation details</dt>
            <dd className="font-medium text-slate-900">{GENERIC_CODES_USER_LABEL}</dd>
          </div>
        </dl>
        <details className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          <summary className="cursor-pointer font-medium text-slate-800">Calculation details</summary>
          <p className="mt-2 text-xs text-slate-500">
            Internal rule key: {preview.ruleSetKey} · version {preview.ruleSetVersion}
          </p>
        </details>
      </Card>

      <Card
        title="Upload Generic Scorecard Workbook"
        footer={
          pending ? (
            <Link
              href={`${base}/workbook-review`}
              className="inline-flex rounded-xl bg-[#063b3f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#052e32]"
            >
              Continue workbook review →
            </Link>
          ) : null
        }
      >
        <p className="text-sm text-slate-700">
          Upload the REAP Generic Scorecard Calculator workbook. The platform will detect supported sheets,
          review the data with you, and populate the scorecard elements.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Accepted: .xlsx (and safely supported .xls) · Maximum 8 MB · Workbook scores and levels are ignored.
        </p>
        <form action={uploadGenericWorkbookForReview} className="mt-5 space-y-4">
          <input type="hidden" name="assessmentId" value={assessmentId} />
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#063b3f]/30 bg-[#063b3f]/[0.03] px-6 py-10 text-center hover:border-[#063b3f]/60">
            <Upload className="mb-3 h-8 w-8 text-[#063b3f]" />
            <span className="text-sm font-semibold text-slate-900">Choose Generic-Scorecard Calculator.xlsx</span>
            <span className="mt-1 text-xs text-slate-500">Primary workflow · review before import</span>
            <input
              type="file"
              name="workbook"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              required
              className="mt-4 block w-full max-w-md text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-[#063b3f] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
            />
          </label>
          <button
            type="submit"
            className="rounded-xl bg-[#063b3f] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#052e32]"
          >
            Analyse workbook
          </button>
        </form>
        <p className="mt-4 text-sm text-slate-600">
          Import status: <strong>{importStatus.replace(/_/g, ' ')}</strong>
          {confirmed?.filename ? ` · Last import: ${confirmed.filename}` : ''}
          {confirmed?.confirmedAt ? ` · ${new Date(confirmed.confirmedAt).toLocaleString('en-ZA')}` : ''}
        </p>
      </Card>

      <Card title="Complete missing information">
        <p className="text-sm text-slate-700">
          Scorecard elements are completed under this stage. Procurement stays separate and must be attached from a
          Formal Procurement Assessment.
        </p>
        <div className="mt-4 grid gap-3">
          {elementCards.map((card) => (
            <div
              key={card.elementKey}
              className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-950">{card.displayName}</p>
                  <p className="mt-1 text-xs font-medium text-[#063b3f]">{card.statusLabel}</p>
                  <p className="mt-1 text-xs text-slate-600">{card.description}</p>
                  <p className="mt-1 text-xs text-slate-500">Data source: {card.dataSource}</p>
                  {card.missingRequirements.length > 0 ? (
                    <p className="mt-1 text-xs text-amber-800">
                      Missing: {card.missingRequirements.join('; ')}
                    </p>
                  ) : null}
                </div>
                <div className="text-right">
                  {card.showPoints ? (
                    <p className="text-sm font-semibold text-slate-950">
                      {formatPoints(card.basePointsAchieved)}
                      <span className="text-xs font-normal text-slate-400">
                        {' '}
                        / {formatPoints(card.basePointsAvailable)} base
                      </span>
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500">Points after calculation</p>
                  )}
                  <Link
                    href={card.actionHref}
                    className="mt-2 inline-flex text-sm font-semibold text-[#063b3f] underline"
                  >
                    {card.actionLabel} →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Attached Procurement Assessment">
        <p className="text-sm text-slate-700">
          Procurement remains separate. After workbook import, attach a completed Formal Procurement Assessment.
          Workbook procurement points are never imported.
        </p>
        <Link
          href={`${base}/procurement`}
          className="mt-3 inline-flex text-sm font-medium text-[#063b3f] underline"
        >
          Open procurement attachment →
        </Link>
      </Card>
    </Shell>
  )
}
