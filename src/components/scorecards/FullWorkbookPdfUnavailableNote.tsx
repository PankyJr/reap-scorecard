import { isFullWorkbookPdfExportAvailable } from '@/lib/scorecard/full/pdf-export-availability'

export function FullWorkbookPdfUnavailableNote({ className = '' }: { className?: string }) {
  if (isFullWorkbookPdfExportAvailable()) return null

  return (
    <p
      className={[
        'rounded-lg border border-line bg-sunken px-3 py-2 text-sm leading-relaxed text-muted',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="status"
    >
      Full workbook PDF export is not available in this hosted environment. For client reports, use{' '}
      <span className="font-medium text-ink">Download PDF</span> on a saved procurement assessment.
    </p>
  )
}
