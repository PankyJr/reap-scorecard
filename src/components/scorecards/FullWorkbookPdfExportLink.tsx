import { FileText } from 'lucide-react'
import { isFullWorkbookPdfExportAvailable } from '@/lib/scorecard/full/pdf-export-availability'
import { FullWorkbookPdfUnavailableNote } from '@/components/scorecards/FullWorkbookPdfUnavailableNote'

export function FullWorkbookPdfExportLink({
  workbookId,
  className = 'inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50',
}: {
  workbookId: string
  className?: string
}) {
  if (!isFullWorkbookPdfExportAvailable()) {
    return <FullWorkbookPdfUnavailableNote className="max-w-md" />
  }

  return (
    <a
      href={`/api/scorecards/full/${encodeURIComponent(workbookId)}/render-pdf`}
      className={className}
    >
      <FileText className="h-4 w-4 text-slate-500" aria-hidden />
      Download PDF
    </a>
  )
}
