'use client'

interface GeneratePdfButtonProps {
  scorecardId: string
  className?: string
}

export function GeneratePdfButton({ scorecardId, className }: GeneratePdfButtonProps) {
  const handleClick = () => {
    if (typeof window !== 'undefined') {
      const url = `/scorecards/${encodeURIComponent(scorecardId)}/report`
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`no-print inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ${className ?? ''}`}
    >
      <span>Generate PDF Report</span>
    </button>
  )
}

