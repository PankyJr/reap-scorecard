export default function CompaniesLoading() {
  return (
    <div className="reap-delay-show space-y-6">
      <div className="h-10 w-40 rounded-control reap-skeleton bg-track" />
      <div className="rounded-card border border-line bg-surface p-6">
        <div className="space-y-4">
          <div className="h-14 rounded-control reap-skeleton bg-track" />
          <div className="h-14 rounded-control reap-skeleton bg-track" />
          <div className="h-14 rounded-control reap-skeleton bg-track" />
          <div className="h-14 rounded-control reap-skeleton bg-track" />
        </div>
      </div>
    </div>
  )
}
