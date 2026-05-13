import Link from 'next/link'
import {
  Building2,
  ClipboardList,
  FileBarChart2,
  FileSpreadsheet,
  Users,
  CalendarDays,
} from 'lucide-react'

import {
  AdminLevelPill,
  AdminMetricTile,
  AdminPanel,
  AdminPrimaryAction,
  AdminQuietLink,
} from '@/app/admin/_ui'
import {
  fetchAdminCompaniesPage,
  fetchAdminOverviewMetrics,
  fetchAdminProcurementPage,
  fetchRecentCompanies,
  fetchRecentProcurementAssessments,
  fetchRecentScorecards,
  fetchRecentWorkbooks,
  formatAdminDate,
  formatAdminDateCompact,
  formatAdminRelative,
} from '@/lib/admin/queries'
import { formatCurrencyZar, formatPoints } from '@/lib/procurement/format'

const PREVIEW_ROWS = 10

function ActivityBlockRecent({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-3">
        <h3 className="text-xs font-semibold text-white">{title}</h3>
        {description ? <p className="mt-1 text-xs leading-relaxed text-sky-100/65">{description}</p> : null}
      </div>
      {children}
    </div>
  )
}

function ActivityListRecent({ children }: { children: React.ReactNode }) {
  return (
    <ul className="divide-y divide-white/[0.08] overflow-hidden rounded-xl border border-white/10 bg-black/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      {children}
    </ul>
  )
}

function EmptyActivityRecent({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-white/25 bg-white/[0.04] px-4 py-8 text-center">
      <p className="text-sm text-sky-100/85">{message}</p>
    </div>
  )
}

function ActivityWhenRecent({ iso }: { iso: string }) {
  const rel = formatAdminRelative(iso)
  return (
    <div className="shrink-0 text-right">
      <time
        className="block text-xs tabular-nums text-sky-50"
        dateTime={iso}
        title={formatAdminDate(iso)}
      >
        {formatAdminDateCompact(iso)}
      </time>
      {rel ? <span className="mt-0.5 block text-[11px] text-sky-200/45">{rel}</span> : null}
    </div>
  )
}

const linkOnTeal = 'font-semibold text-white hover:text-emerald-200 hover:underline'

export default async function AdminOverviewPage() {
  const [
    metrics,
    recentCompanies,
    recentProcurement,
    recentScorecards,
    recentWorkbooks,
    companiesPreview,
    procurementPreview,
  ] = await Promise.all([
    fetchAdminOverviewMetrics(),
    fetchRecentCompanies(8),
    fetchRecentProcurementAssessments(8),
    fetchRecentScorecards(8),
    fetchRecentWorkbooks(8),
    fetchAdminCompaniesPage({ page: 1, pageSize: PREVIEW_ROWS, search: '' }),
    fetchAdminProcurementPage({ page: 1, pageSize: PREVIEW_ROWS, search: '' }),
  ])

  const tableHead =
    'border-b border-slate-200 bg-slate-50/95 text-left text-xs font-medium text-slate-500 normal-case'
  const tableTh = 'whitespace-nowrap px-3 py-2.5 first:pl-4 last:pr-4'
  const tableRow = 'border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/90'
  const tableTd = 'px-3 py-2 align-middle text-sm first:pl-4 last:pr-4'

  return (
    <div className="space-y-8 sm:space-y-10">
      <header className="rounded-xl border border-slate-200/90 bg-white px-4 py-3.5 shadow-sm sm:px-5 sm:py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-baseline gap-3">
            <h1 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">Overview</h1>
            <span className="text-slate-300" aria-hidden>
              ·
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
              Live
            </span>
          </div>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Counts and recent movement. Use <span className="font-medium text-slate-800">Companies</span> or{' '}
          <span className="font-medium text-slate-800">Procurement</span> in the header for search and paging.
        </p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-[#063b3f]/20 bg-gradient-to-br from-emerald-50/40 via-white to-sky-50/50 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_40px_-10px_rgba(6,59,63,0.12)] ring-1 ring-[#063b3f]/[0.07]">
        <div className="border-b border-[#063b3f]/10 bg-white/60 px-4 py-3 sm:px-5">
          <h2 className="text-sm font-semibold text-slate-900">Key metrics</h2>
          <p className="mt-0.5 text-xs text-slate-600">Full-database totals — same palette as the main dashboard.</p>
        </div>
        <div className="px-4 py-5 sm:px-5 sm:py-6">
          <div className="grid gap-4 md:grid-cols-3">
            <AdminMetricTile
              label="Users"
              value={metrics.totalUsers}
              hint="Profiles registered"
              icon={Users}
              variant="brand"
            />
            <AdminMetricTile
              label="Companies"
              value={metrics.totalCompanies}
              hint="Tenant organisations"
              icon={Building2}
              variant="ink"
            />
            <AdminMetricTile
              label="Procurement assessments"
              value={metrics.totalProcurementAssessments}
              hint="Saved procurement runs"
              icon={ClipboardList}
              variant="light"
            />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AdminMetricTile
              label="Scorecards"
              value={metrics.totalScorecards}
              hint="Legacy scorecard rows"
              icon={FileBarChart2}
              variant="light"
            />
            <AdminMetricTile
              label="Workbooks"
              value={metrics.totalWorkbooks}
              hint="Full scorecard uploads"
              icon={FileSpreadsheet}
              variant="light"
            />
            <AdminMetricTile
              label="Procurement this month"
              value={metrics.procurementAssessmentsThisMonth}
              hint="New assessments (UTC month)"
              icon={CalendarDays}
              variant="light"
            />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#052a2e]/30 shadow-[0_8px_32px_rgba(2,24,27,0.28)]">
        <div className="relative bg-[#063b3f] px-4 py-3.5 sm:px-5">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_100%_at_0%_0%,rgba(255,255,255,0.07),transparent_55%)]"
            aria-hidden
          />
          <div className="relative flex flex-col gap-0.5 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="text-base font-semibold tracking-tight text-white sm:text-lg">Recent activity</h2>
            <p className="text-xs text-sky-100/75 sm:max-w-md sm:text-right">Hover a date for the exact time.</p>
          </div>
        </div>

        <div className="border-t border-white/10 bg-gradient-to-b from-[#063b3f] via-[#042f34] to-[#02181b] px-4 py-6 sm:px-5 sm:py-8">
          <div className="grid gap-10 lg:grid-cols-2">
            <div className="space-y-10">
              <ActivityBlockRecent title="Companies" description="Most recently created tenant records.">
                {recentCompanies.length === 0 ? (
                  <EmptyActivityRecent message="No companies in this window. When tenants onboard, they will appear here." />
                ) : (
                  <ActivityListRecent>
                    {recentCompanies.map((c) => (
                      <li key={c.id}>
                        <Link
                          href={`/admin/companies/${c.id}`}
                          className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/[0.06]"
                        >
                          <span className={`min-w-0 truncate ${linkOnTeal}`}>{c.name}</span>
                          <ActivityWhenRecent iso={c.created_at} />
                        </Link>
                      </li>
                    ))}
                  </ActivityListRecent>
                )}
              </ActivityBlockRecent>

              <ActivityBlockRecent title="Scorecards" description="Legacy scorecards with latest update time.">
                {recentScorecards.length === 0 ? (
                  <EmptyActivityRecent message="No scorecard rows in this window." />
                ) : (
                  <ActivityListRecent>
                    {recentScorecards.map((s) => {
                      const co = s.company as { name?: string } | { name?: string }[] | null
                      const name = Array.isArray(co) ? co[0]?.name : co?.name
                      return (
                        <li key={s.id}>
                          <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/[0.06]">
                            <div className="min-w-0">
                              <Link href={`/scorecards/${s.id}`} className={linkOnTeal}>
                                {name ?? 'Company'}
                              </Link>
                              <p className="truncate text-xs text-sky-100/55">
                                {s.score_level ?? '—'} · {formatPoints(Number(s.total_score ?? 0))} pts
                              </p>
                            </div>
                            <ActivityWhenRecent iso={s.updated_at} />
                          </div>
                        </li>
                      )
                    })}
                  </ActivityListRecent>
                )}
              </ActivityBlockRecent>
            </div>

            <div className="space-y-10">
              <ActivityBlockRecent title="Procurement" description="Latest saved assessments.">
                {recentProcurement.length === 0 ? (
                  <EmptyActivityRecent message="No procurement assessments in this window." />
                ) : (
                  <ActivityListRecent>
                    {recentProcurement.map((r) => {
                      const co = r.company as { name?: string } | { name?: string }[] | null
                      const name = Array.isArray(co) ? co[0]?.name : co?.name
                      return (
                        <li key={r.id}>
                          <div className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/[0.06]">
                            <div className="min-w-0">
                              <Link href={`/procurement/assessments/${r.id}`} className={linkOnTeal}>
                                {name ?? 'Company'}
                              </Link>
                              <p className="truncate text-xs text-sky-100/55">Year {r.assessment_year}</p>
                            </div>
                            <ActivityWhenRecent iso={r.created_at} />
                          </div>
                        </li>
                      )
                    })}
                  </ActivityListRecent>
                )}
              </ActivityBlockRecent>

              <ActivityBlockRecent title="Workbooks" description="Full scorecard uploads (filename and status).">
                {recentWorkbooks.length === 0 ? (
                  <EmptyActivityRecent message="No workbook uploads in this window." />
                ) : (
                  <ActivityListRecent>
                    {recentWorkbooks.map((w) => {
                      const co = w.company as { name?: string } | { name?: string }[] | null
                      const name = Array.isArray(co) ? co[0]?.name : co?.name
                      return (
                        <li key={w.id}>
                          <div className="flex items-start justify-between gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/[0.06]">
                            <div className="min-w-0">
                              <p className="truncate font-medium text-white">{w.filename}</p>
                              <p className="truncate text-xs text-sky-100/55">
                                {name ?? '—'} · {w.status}
                              </p>
                            </div>
                            <ActivityWhenRecent iso={w.uploaded_at} />
                          </div>
                        </li>
                      )
                    })}
                  </ActivityListRecent>
                )}
              </ActivityBlockRecent>
            </div>
          </div>

          <p className="mt-8 border-t border-white/10 pt-4 text-xs text-sky-100/70">
            Procurement assessments created this UTC month:{' '}
            <span className="font-semibold tabular-nums text-white">
              {metrics.procurementAssessmentsThisMonth.toLocaleString()}
            </span>
            .
          </p>
        </div>
      </section>

      <AdminPanel
        variant="elevated"
        title="Companies"
        description={`Latest ${Math.min(PREVIEW_ROWS, companiesPreview.rows.length)} of ${metrics.totalCompanies.toLocaleString()} companies (newest first).`}
      >
        <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white">
          <table className="min-w-[720px] w-full text-left text-sm">
            <thead className={tableHead}>
              <tr>
                <th className={tableTh}>Company</th>
                <th className={tableTh}>Owner email</th>
                <th className={tableTh}>Created</th>
                <th className={`${tableTh} text-right`}>Assessments</th>
                <th className={tableTh}>Last activity</th>
                <th className={`${tableTh} w-[1%] text-right`} scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {companiesPreview.rows.map((c) => (
                <tr key={c.id} className={tableRow}>
                  <td className={`${tableTd} font-medium text-slate-900`}>{c.name}</td>
                  <td className={`${tableTd} text-slate-600`}>{c.owner_email ?? '—'}</td>
                  <td className={`${tableTd} tabular-nums text-slate-600`} title={formatAdminDate(c.created_at)}>
                    {formatAdminDateCompact(c.created_at)}
                  </td>
                  <td className={`${tableTd} text-right tabular-nums text-slate-800`}>{c.assessment_count}</td>
                  <td
                    className={`${tableTd} tabular-nums text-slate-600`}
                    title={c.last_activity_at ? formatAdminDate(c.last_activity_at) : undefined}
                  >
                    {c.last_activity_at ? formatAdminDateCompact(c.last_activity_at) : '—'}
                  </td>
                  <td className={`${tableTd} text-right`}>
                    <AdminPrimaryAction href={`/admin/companies/${c.id}`}>View</AdminPrimaryAction>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            {metrics.totalCompanies > PREVIEW_ROWS
              ? `Showing a short preview so this page stays fast at scale.`
              : 'Showing all companies.'}
          </p>
          <AdminQuietLink href="/admin/companies/browse">View all →</AdminQuietLink>
        </div>
      </AdminPanel>

      <AdminPanel
        variant="elevated"
        title="Procurement assessments"
        description={`Latest ${Math.min(PREVIEW_ROWS, procurementPreview.rows.length)} of ${metrics.totalProcurementAssessments.toLocaleString()} assessments.`}
      >
        <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white">
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead className={tableHead}>
              <tr>
                <th className={tableTh}>Company</th>
                <th className={tableTh}>Year</th>
                <th className={`${tableTh} text-right`}>Score</th>
                <th className={tableTh}>Level</th>
                <th className={`${tableTh} text-right`}>TMPS</th>
                <th className={`${tableTh} text-right`}>Recognised</th>
                <th className={tableTh}>Created</th>
                <th className={`${tableTh} w-[1%] text-right`} scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {procurementPreview.rows.map((p) => (
                <tr key={p.id} className={tableRow}>
                  <td className={`${tableTd} font-medium text-slate-900`}>{p.company_name}</td>
                  <td className={`${tableTd} tabular-nums text-slate-700`}>{p.assessment_year ?? '—'}</td>
                  <td className={`${tableTd} text-right tabular-nums text-slate-900`}>
                    {p.total_score != null ? formatPoints(p.total_score) : '—'}
                  </td>
                  <td className={tableTd}>
                    <AdminLevelPill label={p.level} />
                  </td>
                  <td className={`${tableTd} text-right tabular-nums text-slate-700`}>{formatCurrencyZar(p.tmps)}</td>
                  <td className={`${tableTd} text-right tabular-nums text-slate-700`}>{p.recognised_pct_display}</td>
                  <td className={`${tableTd} tabular-nums text-slate-600`} title={formatAdminDate(p.created_at)}>
                    {formatAdminDateCompact(p.created_at)}
                  </td>
                  <td className={`${tableTd} text-right`}>
                    <AdminPrimaryAction href={`/procurement/assessments/${p.id}`}>Open</AdminPrimaryAction>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            {metrics.totalProcurementAssessments > PREVIEW_ROWS
              ? `Full directory with search and paging lives on the next screen.`
              : 'Showing all assessments.'}
          </p>
          <AdminQuietLink href="/admin/procurement/browse">View all →</AdminQuietLink>
        </div>
      </AdminPanel>
    </div>
  )
}
