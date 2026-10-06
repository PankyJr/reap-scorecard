export default function ProcurementAssessmentLoading() {
  return (
    <div className="space-y-6" role="status" aria-live="polite">
      <p className="text-[15px] text-muted">Loading the procurement score…</p>
      <div className="animate-pulse space-y-6" aria-hidden>
        <div className="h-44 rounded-card bg-line" />
        <div className="h-64 rounded-card bg-line" />
        <div className="h-72 rounded-card bg-line" />
      </div>
    </div>
  )
}
