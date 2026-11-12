'use client'

export function PrintReportButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-control bg-brand px-4 py-2 text-body font-semibold text-white hover:bg-brand-hover"
    >
      Print / Save as PDF
    </button>
  )
}
