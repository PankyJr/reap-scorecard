import { FileText, Printer } from 'lucide-react'
import Link from 'next/link'
import { isFullWorkbookPdfExportAvailable } from '@/lib/scorecard/full/pdf-export-availability'

const DEFAULT_CLASS =
  'inline-flex items-center gap-2 rounded-md border border-line bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-sunken'

/**
 * The workbook's PDF. The server-made PDF needs a local Chrome, so on a hosted
 * site (Netlify) this opens the printable report instead, which the browser
 * can save as a PDF.
 */
export function FullWorkbookPdfExportLink({ workbookId, className = DEFAULT_CLASS }: { workbookId: string; className?: string }) {
  const id = encodeURIComponent(workbookId)
  if (!isFullWorkbookPdfExportAvailable()) {
    return (
      <Link href={`/scorecards/full/${id}/report?print=1`} className={className}>
        <Printer className="h-4 w-4 text-muted" aria-hidden />
        Print or save as PDF
      </Link>
    )
  }

  return (
    <a href={`/api/scorecards/full/${id}/render-pdf`} className={className}>
      <FileText className="h-4 w-4 text-muted" aria-hidden />
      Download PDF
    </a>
  )
}
