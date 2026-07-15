import { isFullWorkbookPdfExportAvailable } from '@/lib/scorecard/full/pdf-export-availability'

export function FullWorkbookPdfUnavailableNote({ className = '' }: { className?: string }) {
  if (isFullWorkbookPdfExportAvailable()) return null

  return (
    <p
      className={[
        'rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="status"
    >
      Full workbook PDF export is not available in this hosted environment. For client reports, use{' '}
      <span className="font-medium text-slate-800">Download PDF</span> on a saved procurement assessment.
    </p>
  )
}
