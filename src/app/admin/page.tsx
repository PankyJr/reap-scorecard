import Link from 'next/link'

import {
  fetchAdminCompaniesTable,
  fetchAdminOverviewMetrics,
  fetchAdminProcurementTable,
  fetchRecentCompanies,
  fetchRecentProcurementAssessments,
  fetchRecentScorecards,
  fetchRecentWorkbooks,
  formatAdminDate,
} from '@/lib/admin/queries'
import { formatCurrencyZar, formatPoints } from '@/lib/procurement/format'

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string | number
  hint?: string
}) {
  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white px-4 py-4 shadow-sm ring-1 ring-slate-900/[0.02]">
      <p className="text-xs font-semibold text-slate-600">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-[#0c1a2e]">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  )
}

function CardShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.02] sm:p-6">
      <h2 className="text-base font-semibold tracking-tight text-[#0c1a2e]">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  )
}

export default async function AdminOverviewPage() {
  const [
    metrics,
    recentCompanies,
    recentProcurement,
    recentScorecards,
    recentWorkbooks,
    companiesTable,
    procurementTable,
  ] = await Promise.all([
    fetchAdminOverviewMetrics(),
    fetchRecentCompanies(8),
    fetchRecentProcurementAssessments(8),
    fetchRecentScorecards(8),
    fetchRecentWorkbooks(8),
    fetchAdminCompaniesTable(400),
    fetchAdminProcurementTable(80),
  ])

  return (
    <div className="space-y-10">
      <div>
        <p className="text-sm text-slate-500">Read-only snapshot across all tenants.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard label="Users" value={metrics.totalUsers} hint="Profiles registered" />
        <MetricCard label="Companies" value={metrics.totalCompanies} />
        <MetricCard label="Procurement assessments" value={metrics.totalProcurementAssessments} />
        <MetricCard label="Scorecards" value={metrics.totalScorecards} hint="Legacy scorecard rows" />
        <MetricCard label="Workbooks" value={metrics.totalWorkbooks} hint="Full scorecard uploads" />
        <MetricCard
          label="Procurement this month"
          value={metrics.procurementAssessmentsThisMonth}
          hint="New assessments (UTC month)"
        />
      </div>

      <CardShell title="Recent activity" subtitle="Latest movement across key objects.">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Companies</h3>
            <ul className="mt-2 divide-y divide-slate-100 rounded-2xl border border-slate-100">
              {recentCompanies.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                  <Link href={`/admin/companies/${c.id}`} className="font-medium text-[#0b5259] hover:underline">
                    {c.name}
                  </Link>
                  <span className="shrink-0 text-xs text-slate-500">{formatAdminDate(c.created_at)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Procurement</h3>
            <ul className="mt-2 divide-y divide-slate-100 rounded-2xl border border-slate-100">
              {recentProcurement.map((r) => {
                const co = r.company as { name?: string } | { name?: string }[] | null
                const name = Array.isArray(co) ? co[0]?.name : co?.name
                return (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <Link
                        href={`/procurement/assessments/${r.id}`}
                        className="font-medium text-[#0b5259] hover:underline"
                      >
                        {name ?? 'Company'}
                      </Link>
                      <p className="truncate text-xs text-slate-500">Year {r.assessment_year}</p>
                    </div>
                    <span className="shrink-0 text-xs text-slate-500">{formatAdminDate(r.created_at)}</span>
                  </li>
                )
              })}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Scorecards</h3>
            <ul className="mt-2 divide-y divide-slate-100 rounded-2xl border border-slate-100">
              {recentScorecards.map((s) => {
                const co = s.company as { name?: string } | { name?: string }[] | null
                const name = Array.isArray(co) ? co[0]?.name : co?.name
                return (
                  <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <Link href={`/scorecards/${s.id}`} className="font-medium text-[#0b5259] hover:underline">
                        {name ?? 'Company'}
                      </Link>
                      <p className="truncate text-xs text-slate-500">
                        {s.score_level ?? '—'} · {formatPoints(Number(s.total_score ?? 0))} pts
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-slate-500">{formatAdminDate(s.updated_at)}</span>
                  </li>
                )
              })}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Workbooks</h3>
            <ul className="mt-2 divide-y divide-slate-100 rounded-2xl border border-slate-100">
              {recentWorkbooks.map((w) => {
                const co = w.company as { name?: string } | { name?: string }[] | null
                const name = Array.isArray(co) ? co[0]?.name : co?.name
                return (
                  <li key={w.id} className="flex flex-col gap-0.5 px-3 py-2.5 text-sm">
                    <span className="font-medium text-slate-900">{w.filename}</span>
                    <span className="text-xs text-slate-500">
                      {name ?? '—'} · {w.status} · {formatAdminDate(w.uploaded_at)}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
        <p className="mt-4 text-xs text-slate-400">
          Procurement assessments created this UTC month: {metrics.procurementAssessmentsThisMonth}.
        </p>
      </CardShell>

      <CardShell title="Companies" subtitle="Owner, activity, and assessment coverage.">
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2.5">Company</th>
                <th className="px-3 py-2.5">Owner email</th>
                <th className="px-3 py-2.5">Created</th>
                <th className="px-3 py-2.5 text-right">Assessments</th>
                <th className="px-3 py-2.5">Last activity</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {companiesTable.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/60">
                  <td className="px-3 py-2.5 font-medium text-[#0c1a2e]">{c.name}</td>
                  <td className="px-3 py-2.5 text-slate-600">{c.owner_email ?? '—'}</td>
                  <td className="px-3 py-2.5 text-slate-600">{formatAdminDate(c.created_at)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{c.assessment_count}</td>
                  <td className="px-3 py-2.5 text-slate-600">{formatAdminDate(c.last_activity_at)}</td>
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/admin/companies/${c.id}`}
                      className="font-semibold text-[#0b5259] hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardShell>

      <CardShell title="Procurement assessments" subtitle="Latest saved assessments with headline financials.">
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2.5">Company</th>
                <th className="px-3 py-2.5">Year</th>
                <th className="px-3 py-2.5 text-right">Score</th>
                <th className="px-3 py-2.5">Level</th>
                <th className="px-3 py-2.5 text-right">TMPS</th>
                <th className="px-3 py-2.5 text-right">Recognised</th>
                <th className="px-3 py-2.5">Created</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {procurementTable.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/60">
                  <td className="px-3 py-2.5 font-medium text-[#0c1a2e]">{p.company_name}</td>
                  <td className="px-3 py-2.5 text-slate-700">{p.assessment_year ?? '—'}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-800">
                    {p.total_score != null ? formatPoints(p.total_score) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-slate-700">{p.level}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{formatCurrencyZar(p.tmps)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{p.recognised_pct_display}</td>
                  <td className="px-3 py-2.5 text-slate-600">{formatAdminDate(p.created_at)}</td>
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/procurement/assessments/${p.id}`}
                      className="font-semibold text-[#0b5259] hover:underline"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardShell>
    </div>
  )
}
