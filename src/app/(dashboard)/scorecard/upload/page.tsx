import Link from 'next/link'

/**
 * Retired route.
 *
 * This was a preview-only workbook upload. It used to `redirect()` straight to
 * `/procurement/assessments/new` — a different feature — so anyone following an
 * old link or bookmark was teleported somewhere unrelated with no explanation.
 * It now says what it was and offers the two places its work actually moved to.
 *
 * `?legacy=1` still renders the original read-only preview for internal use.
 */
export default async function ScorecardUploadRetiredPage({
  searchParams,
}: {
  searchParams: Promise<{ legacy?: string }>
}) {
  const params = await searchParams

  if (params.legacy === '1') {
    const { default: LegacyUploadPage } = await import('./LegacyUploadPage')
    return <LegacyUploadPage />
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Retired page</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-950">Scorecard upload has moved</h1>
      </div>

      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        This page was a preview-only workbook upload. It is no longer part of the workflow, and it did not
        produce a scorecard on its own.
      </p>

      <div className="space-y-3">
        <p className="text-sm text-slate-700">Depending on what you came here to do:</p>
        <div className="space-y-2">
          <Link
            href="/scorecards/new"
            className="block rounded-xl border border-slate-200 px-4 py-3 text-sm hover:border-slate-400"
          >
            <span className="font-medium text-slate-950">Upload a Generic Scorecard workbook</span>
            <span className="mt-0.5 block text-slate-600">
              Start an assessment, then upload the workbook on step 2.
            </span>
          </Link>
          <Link
            href="/procurement/assessments/new"
            className="block rounded-xl border border-slate-200 px-4 py-3 text-sm hover:border-slate-400"
          >
            <span className="font-medium text-slate-950">Upload a procurement supplier register</span>
            <span className="mt-0.5 block text-slate-600">
              Create a Formal Procurement Assessment — where this page used to send you.
            </span>
          </Link>
        </div>
      </div>
    </div>
  )
}
