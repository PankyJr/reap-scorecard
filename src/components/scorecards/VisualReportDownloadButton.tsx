'use client'

// Simple visual export that uses the browser's print → Save as PDF
// from the clean report layout, so what you see is what you get.

interface VisualReportDownloadButtonProps {
  companyName: string
}

export function VisualReportDownloadButton({}: VisualReportDownloadButtonProps) {
  const handleClick = () => {
    if (typeof window === 'undefined') return
    window.print()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="no-print inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
    >
      <span>Print / Save as PDF</span>
    </button>
  )
}

