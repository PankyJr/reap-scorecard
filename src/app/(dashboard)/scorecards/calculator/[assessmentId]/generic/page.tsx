import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Upload } from 'lucide-react'
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
  const pending = (assessment as { workbook_import_preview?: GenericWorkbookAnalysis | null })
    .workbook_import_preview
  const confirmed = (assessment as { workbook_import_snapshot?: { filename?: string; confirmedAt?: string; status?: string } | null })
    .workbook_import_snapshot
  const importStatus =
    (assessment as { workbook_import_status?: string | null }).workbook_import_status ??
    (pending ? 'review_required' : confirmed ? 'imported' : 'no_workbook_uploaded')

  return (
    <Shell
      assessmentId={assessmentId}
      companyName={company.name}
      assessmentName={assessment.name}
      current=""
      title="Generic scorecard workspace"
      subtitle="Upload the REAP Generic Scorecard Calculator workbook, review the detected data, confirm the import, attach procurement, then calculate."
      aside={
        <ResultSummary preview={preview} needsRecalculation={assessment.needs_recalculation} />
      }
    >
      <Flash searchParams={query} />

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

      <Card title="Next: attach Formal Procurement Assessment">
        <p className="text-sm text-slate-700">
          Procurement remains separate. After workbook import, attach a completed Formal Procurement Assessment
          snapshot. Workbook procurement points are never imported.
        </p>
        <Link
          href={`${base}/procurement`}
          className="mt-3 inline-flex text-sm font-medium text-[#063b3f] underline"
        >
          Open procurement attachment →
        </Link>
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
                href={slug === 'workbook-review' && !pending ? base : `${base}/${slug}`}
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
            const fromWorkbook = Boolean(stored?.upload_filename) || Boolean(confirmed?.filename)
            return (
              <div
                key={element.elementKey}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-950">{element.displayName}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {element.status.replace(/_/g, ' ')}
                    {fromWorkbook ? ' · Data source: Full Generic Workbook' : ''}
                    {stored?.upload_filename ? ` · ${stored.upload_filename}` : ''}
                    {stored?.status === 'needs_review' ? ' · awaiting review' : ''}
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
