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
        <p className="text-sm font-semibold  text-muted">Retired page</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Scorecard upload has moved</h1>
      </div>

      <p className="rounded-xl border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-warn">
        This page was a preview-only workbook upload. It is no longer part of the workflow, and it did not
        produce a scorecard on its own.
      </p>

      <div className="space-y-3">
        <p className="text-sm text-ink">Depending on what you came here to do:</p>
        <div className="space-y-2">
          <Link
            href="/scorecards/new"
            className="block rounded-xl border border-line px-4 py-3 text-sm hover:border-line-strong"
          >
            <span className="font-medium text-ink">Upload a Generic Scorecard workbook</span>
            <span className="mt-0.5 block text-muted">
              Start an assessment, then upload the workbook on step 2.
            </span>
          </Link>
          <Link
            href="/procurement/assessments/new"
            className="block rounded-xl border border-line px-4 py-3 text-sm hover:border-line-strong"
          >
            <span className="font-medium text-ink">Upload a procurement supplier register</span>
            <span className="mt-0.5 block text-muted">
              Create a Formal Procurement Assessment — where this page used to send you.
            </span>
          </Link>
        </div>
      </div>
    </div>
  )
}
