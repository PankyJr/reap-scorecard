import Link from 'next/link'
import { notFound } from 'next/navigation'
import { loadGenericAssessment } from './load'
import { uploadGenericWorkbookForReview } from './actions'
import { Card, Flash, ResultSummary, Shell, formatPoints } from './ui'
import type { GenericWorkbookAnalysis } from '@/lib/scorecard/generic/workbook-import'

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
  const assessmentRecord = assessment as typeof assessment & {
    workbook_import_status?: string | null
    workbook_filename?: string | null
    workbook_checksum_sha256?: string | null
    workbook_imported_at?: string | null
    workbook_import_preview?: GenericWorkbookAnalysis | null
    workbook_import_snapshot?: { filename?: string; importedAt?: string } | null
  }
  const importStatus = assessmentRecord.workbook_import_status ?? 'no_workbook_uploaded'
  const pendingReview = Boolean(assessmentRecord.workbook_import_preview)
  const importedSnapshot = assessmentRecord.workbook_import_snapshot

  return (
    <Shell
      assessmentId={assessmentId}
      companyName={company.name}
      assessmentName={assessment.name}
      current=""
      title="Generic scorecard workspace"
      subtitle="Upload the Generic Scorecard Calculator workbook, review the detected data, confirm the import, attach a Formal Procurement Assessment, then calculate."
      aside={
        <ResultSummary preview={preview} needsRecalculation={assessment.needs_recalculation} />
      }
    >
      <Flash searchParams={query} />

      <section className="rounded-[28px] border border-[#063b3f]/15 bg-gradient-to-br from-[#063b3f] to-[#0a555a] p-6 text-white shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
          Primary workflow
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Upload Generic Scorecard Workbook</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/85">
          Upload the REAP Generic Scorecard Calculator workbook. The platform will detect supported sheets,
          review the data with you, and populate the scorecard elements. Procurement stays separate and must
          be attached from a completed Formal Procurement Assessment.
        </p>
        <form action={uploadGenericWorkbookForReview} className="mt-5 space-y-3">
          <input type="hidden" name="assessmentId" value={assessmentId} />
          <input
            type="file"
            name="workbook"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            required
            className="block w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#063b3f]"
          />
          <p className="text-xs text-white/70">Accepted: .xlsx · Maximum 8 MB · Review required before any data is written</p>
          <button
            type="submit"
            className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#063b3f] hover:bg-slate-100"
          >
            Analyse workbook
          </button>
        </form>
        {pendingReview ? (
          <p className="mt-4 text-sm text-amber-100">
            A workbook is waiting for review.{' '}
            <Link href={`${base}/workbook-review`} className="font-semibold underline">
              Open review screen →
            </Link>
          </p>
        ) : null}
        {importedSnapshot ? (
          <p className="mt-3 text-sm text-white/80">
            Last import: {importedSnapshot.filename ?? assessmentRecord.workbook_filename} · status{' '}
            {importStatus.replace(/_/g, ' ')}
            {assessmentRecord.workbook_imported_at
              ? ` · ${new Date(assessmentRecord.workbook_imported_at).toLocaleString()}`
              : ''}
          </p>
        ) : null}
      </section>

      <Card title="Workflow">
        <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>Upload workbook</li>
          <li>Review data</li>
          <li>Confirm import</li>
          <li>Attach procurement</li>
          <li>Calculate</li>
          <li>Report</li>
        </ol>
      </Card>

      <Card title="Guided steps">
        <ol className="grid gap-2 sm:grid-cols-2">
          {[
            ['workbook-review', '0. Workbook review'],
            ['applicability', '1. Applicability gate'],
            ['financial', '2. Shared financial inputs'],
            ['ownership', '3. Ownership'],
            ['management-control', '4. Management Control'],
            ['skills-development', '5. Skills Development'],
            ['procurement', '6. Procurement attachment'],
            ['enterprise-development', '7. Enterprise Development'],
            ['supplier-development', '8. Supplier Development'],
            ['socio-economic-development', '9. Socio-Economic Development'],
            ['review', '10. Review and calculate'],
            ['result', '11. Final result'],
          ].map(([slug, label]) => (
            <li key={slug}>
              <Link
                href={`${base}/${slug}`}
                className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-800 hover:border-[#063b3f]/40"
              >
                <span>{label}</span>
                <span className="text-slate-400">→</span>
              </Link>
            </li>
          ))}
        </ol>
      </Card>

      <Card title="Element status">
        <div className="grid gap-3">
          {preview.elements.map((element) => {
            const stored = elements.find((row) => row.element_key === element.elementKey)
            const decisions =
              (importedSnapshot as { decisions?: Record<string, string> } | null)?.decisions ?? {}
            const decision = decisions[element.elementKey]
            const importedDecision =
              decision === 'import' || decision === 'replace_existing' || decision === 'merge_missing'
            const fromWorkbook =
              (stored?.import_snapshot &&
                typeof stored.import_snapshot === 'object' &&
                (stored.import_snapshot as { source?: string }).source === 'full_generic_workbook') ||
              importedDecision
            return (
              <div
                key={element.elementKey}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-950">{element.displayName}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {element.status.replace(/_/g, ' ')}
                    {stored?.status === 'needs_review' ? ' · import awaiting review' : ''}
                    {fromWorkbook ? ' · Data source: Full Generic Workbook' : ''}
                    {fromWorkbook && assessmentRecord.workbook_filename
                      ? ` · ${assessmentRecord.workbook_filename}`
                      : ''}
                    {assessmentRecord.workbook_imported_at && fromWorkbook
                      ? ` · imported ${new Date(assessmentRecord.workbook_imported_at).toLocaleDateString()}`
                      : ''}
                    {element.elementKey === 'preferential_procurement'
                      ? ' · Attach Formal Procurement Assessment separately'
                      : ''}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-semibold text-slate-950">
                    {formatPoints(element.basePointsAchieved)}
                    <span className="text-xs font-normal text-slate-400">
                      {' '}
                      / {formatPoints(element.basePointsAvailable)} base
                    </span>
                  </p>
                  {element.bonusPointsAvailable > 0 ? (
                    <p className="text-xs text-slate-500">
                      +{formatPoints(element.bonusPointsAchieved)} bonus
                    </p>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <Card title="Rule set">
        <p className="text-sm text-slate-700">
          Operative rule set: <strong>{preview.ruleSetDisplayName}</strong> ({preview.ruleSetKey} v
          {preview.ruleSetVersion}). The reserved 2026 draft cannot produce a final level.
        </p>
        <p className="text-sm text-slate-600">
          This product is an internal scorecard calculator and readiness tool. Results remain subject
          to evidence review and authorised verification. It does not issue a B-BBEE certificate.
        </p>
      </Card>
    </Shell>
  )
}
