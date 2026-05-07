export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 w-48 rounded-xl bg-slate-200" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-28 rounded-2xl bg-slate-200" />
        <div className="h-28 rounded-2xl bg-slate-200" />
        <div className="h-28 rounded-2xl bg-slate-200" />
      </div>
      <div className="h-64 rounded-2xl bg-slate-200" />
      <div className="h-64 rounded-2xl bg-slate-200" />
    </div>
  )
}
