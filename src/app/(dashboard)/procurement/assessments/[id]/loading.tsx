export default function ProcurementAssessmentLoading() {
  return (
    <div className="reap-delay-show space-y-6" role="status" aria-live="polite">
      <p className="text-[15px] text-muted">Loading the procurement score…</p>
      <div className="space-y-6" aria-hidden>
        <div className="h-44 rounded-card reap-skeleton bg-track" />
        <div className="h-64 rounded-card reap-skeleton bg-track" />
        <div className="h-72 rounded-card reap-skeleton bg-track" />
      </div>
    </div>
  )
}
