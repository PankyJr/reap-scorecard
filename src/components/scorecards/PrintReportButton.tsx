'use client'

export function PrintReportButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-xl bg-[#063b3f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#052e32]"
    >
      Print / Save as PDF
    </button>
  )
}
