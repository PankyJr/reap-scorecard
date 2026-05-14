import Link from 'next/link'
import {
  ArrowRight,
  Building2,
  CalendarDays,
  ClipboardList,
  FileBarChart2,
  FileSpreadsheet,
  Gauge,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react'

import {
  AdminLevelPill,
  AdminPrimaryAction,
  AdminQuietLink,
  adminTableHead,
  adminTableRow,
  adminTableShell,
  adminTableTd,
  adminTableTh,
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
import { formatFullWorkbookStatus } from '@/lib/scorecard/full/ui-labels'

const PREVIEW_ROWS = 10
const ACTIVITY_PREVIEW = 5

function RelativeDate({ iso, inverse = false }: { iso: string; inverse?: boolean }) {
  const rel = formatAdminRelative(iso)

  return (
    <div className="shrink-0 text-right">
      <time
        className={`block text-xs font-semibold tabular-nums ${inverse ? 'text-white/90' : 'text-slate-700'}`}
        dateTime={iso}
        title={formatAdminDate(iso)}
      >
        {formatAdminDateCompact(iso)}
      </time>
      {rel ? (
        <span className={`mt-0.5 block text-[10px] ${inverse ? 'text-white/45' : 'text-slate-400'}`}>{rel}</span>
      ) : null}
    </div>
  )
}

function CommandMetric({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'light',
}: {
  label: string
  value: string
  hint: string
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  tone?: 'brand' | 'navy' | 'light'
}) {
  const isDark = tone === 'brand' || tone === 'navy'

  return (
    <div
      className={[
        'group relative overflow-hidden rounded-[1.35rem] border p-5 transition duration-200',
        isDark
          ? 'border-white/10 bg-[#052f33] text-white shadow-[0_22px_50px_-28px_rgba(2,24,27,0.95)]'
          : 'border-slate-200/85 bg-white text-slate-950 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.5)] hover:-translate-y-0.5 hover:shadow-[0_22px_60px_-36px_rgba(15,23,42,0.55)]',
        tone === 'navy' ? 'bg-[#071225]' : '',
      ].join(' ')}
    >
      {isDark ? (
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_10%,rgba(52,211,153,0.20),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_42%)]"
          aria-hidden
        />
      ) : null}

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p
            className={[
              'text-[11px] font-bold uppercase tracking-[0.2em]',
              isDark ? 'text-white/55' : 'text-slate-400',
            ].join(' ')}
          >
            {label}
          </p>
          <p className="mt-4 text-4xl font-semibold tracking-[-0.05em] tabular-nums">{value}</p>
          <p className={['mt-3 text-sm', isDark ? 'text-white/62' : 'text-slate-500'].join(' ')}>{hint}</p>
        </div>

        <span
          className={[
            'inline-flex h-11 w-11 items-center justify-center rounded-2xl border',
            isDark ? 'border-emerald-300/25 bg-white/8 text-emerald-200' : 'border-slate-200 bg-white text-[#063b3f] shadow-sm',
          ].join(' ')}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </div>
    </div>
  )
}

function SectionShell({
  eyebrow,
  title,
  description,
  children,
  dark = false,
}: {
  eyebrow?: string
  title: string
  description?: string
  children: React.ReactNode
  dark?: boolean
}) {
  return (
    <section
      className={[
        'overflow-hidden rounded-[1.6rem] border shadow-[0_24px_70px_-48px_rgba(15,23,42,0.65)]',
        dark ? 'border-white/10 bg-[#031f22] text-white' : 'border-slate-200/90 bg-white text-slate-950',
      ].join(' ')}
    >
      <div
        className={[
          'border-b px-5 py-5 sm:px-6',
          dark ? 'border-white/10 bg-white/[0.025]' : 'border-slate-100 bg-gradient-to-r from-white via-slate-50/60 to-white',
        ].join(' ')}
      >
        {eyebrow ? (
          <p className={['text-[11px] font-bold uppercase tracking-[0.18em]', dark ? 'text-emerald-200/70' : 'text-slate-400'].join(' ')}>
            {eyebrow}
          </p>
        ) : null}
        <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.025em]">{title}</h2>
            {description ? (
              <p className={['mt-1 max-w-3xl text-sm leading-relaxed', dark ? 'text-white/58' : 'text-slate-500'].join(' ')}>
                {description}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      {children}
    </section>
  )
}

function ActivityCard({
  title,
  hint,
  viewAllHref,
  viewAllLabel,
  children,
}: {
  title: string
  hint: string
  viewAllHref?: string
  viewAllLabel?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-[17rem] flex-col rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <div className="border-b border-white/10 pb-3">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-100/70">{title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-white/45">{hint}</p>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
      {viewAllHref && viewAllLabel ? (
        <div className="mt-3 border-t border-white/10 pt-3">
          <Link
            href={viewAllHref}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-100 transition hover:text-white"
          >
            {viewAllLabel}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      ) : null}
    </div>
  )
}

function ActivityEmpty({ message }: { message: string }) {
  return (
    <div className="mt-3 rounded-xl border border-dashed border-white/12 bg-black/10 px-3 py-8 text-center">
      <p className="text-xs leading-relaxed text-white/45">{message}</p>
    </div>
  )
}

function ActivityRows({ children }: { children: React.ReactNode }) {
  return <ul className="divide-y divide-white/10">{children}</ul>
}

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
    fetchRecentCompanies(ACTIVITY_PREVIEW),
    fetchRecentProcurementAssessments(ACTIVITY_PREVIEW),
    fetchRecentScorecards(ACTIVITY_PREVIEW),
    fetchRecentWorkbooks(ACTIVITY_PREVIEW),
    fetchAdminCompaniesPage({ page: 1, pageSize: PREVIEW_ROWS, search: '' }),
    fetchAdminProcurementPage({ page: 1, pageSize: PREVIEW_ROWS, search: '' }),
  ])

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-[#052f33]/20 bg-[#031f22] px-6 py-7 text-white shadow-[0_30px_90px_-55px_rgba(2,24,27,0.9)] sm:px-8">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(52,211,153,0.20),transparent_28%),radial-gradient(circle_at_90%_18%,rgba(148,163,184,0.18),transparent_26%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_34%)]"
          aria-hidden
        />
        <div className="relative grid gap-7 xl:grid-cols-[1.1fr_0.9fr] xl:items-end">
          <div>
            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-100/80">
              Operator command centre
            </div>
            <h2 className="mt-5 max-w-3xl text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
              Full tenant visibility, without touching client data.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/62">
              Monitor the live estate, inspect procurement runs, and jump into company dossiers from one internal read-only surface.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/42">Mode</p>
              <p className="mt-2 text-sm font-semibold text-white">Read-only</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/42">Month</p>
              <p className="mt-2 text-sm font-semibold tabular-nums text-white">
                {metrics.procurementAssessmentsThisMonth.toLocaleString()} procurement runs
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.08] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100/55">Status</p>
              <p className="mt-2 text-sm font-semibold text-emerald-50">Live production</p>
            </div>
          </div>
        </div>
      </section>

      <SectionShell
        eyebrow="Estate snapshot"
        title="Key metrics"
        description="Cross-tenant counts across the live REAP environment."
      >
        <div className="space-y-8 px-5 py-6 sm:px-6">
          <div className="grid gap-4 lg:grid-cols-3">
            <CommandMetric
              label="Companies"
              value={metrics.totalCompanies.toLocaleString()}
              hint="Tenant organisations"
              icon={Building2}
              tone="brand"
            />
            <CommandMetric
              label="Procurement assessments"
              value={metrics.totalProcurementAssessments.toLocaleString()}
              hint="Saved procurement runs"
              icon={ClipboardList}
              tone="navy"
            />
            <CommandMetric
              label="Users"
              value={metrics.totalUsers.toLocaleString()}
              hint="Registered profiles"
              icon={Users}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <CommandMetric
              label="Scorecards"
              value={metrics.totalScorecards.toLocaleString()}
              hint="Legacy scorecard rows"
              icon={FileBarChart2}
            />
            <CommandMetric
              label="Workbooks"
              value={metrics.totalWorkbooks.toLocaleString()}
              hint="Full scorecard uploads"
              icon={FileSpreadsheet}
            />
            <CommandMetric
              label="Procurement this month"
              value={metrics.procurementAssessmentsThisMonth.toLocaleString()}
              hint="New assessments this UTC month"
              icon={CalendarDays}
            />
          </div>
        </div>
      </SectionShell>

      <SectionShell
        dark
        eyebrow="Live movement"
        title="Recent activity"
        description={`Latest ${ACTIVITY_PREVIEW} records per stream. Hover dates for exact timestamps.`}
      >
        <div className="px-5 py-6 sm:px-6">
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
            <ActivityCard title="Companies" hint="Newest tenant records." viewAllHref="/admin/companies/browse" viewAllLabel="View companies">
              {recentCompanies.length === 0 ? (
                <ActivityEmpty message="No companies yet." />
              ) : (
                <ActivityRows>
                  {recentCompanies.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/admin/companies/${c.id}`}
                        className="flex items-center justify-between gap-3 py-3 text-sm transition hover:bg-white/[0.035]"
                      >
                        <span className="min-w-0 truncate font-semibold text-white">{c.name}</span>
                        <RelativeDate iso={c.created_at} inverse />
                      </Link>
                    </li>
                  ))}
                </ActivityRows>
              )}
            </ActivityCard>

            <ActivityCard title="Procurement" hint="Latest saved assessments." viewAllHref="/admin/procurement/browse" viewAllLabel="View assessments">
              {recentProcurement.length === 0 ? (
                <ActivityEmpty message="No procurement assessments yet." />
              ) : (
                <ActivityRows>
                  {recentProcurement.map((r) => {
                    const co = r.company as { name?: string } | { name?: string }[] | null
                    const name = Array.isArray(co) ? co[0]?.name : co?.name

                    return (
                      <li key={r.id}>
                        <Link
                          href={`/procurement/assessments/${r.id}`}
                          className="flex items-center justify-between gap-3 py-3 text-sm transition hover:bg-white/[0.035]"
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-white">{name ?? 'Company'}</span>
                            <span className="block text-xs text-white/42">Year {r.assessment_year}</span>
                          </span>
                          <RelativeDate iso={r.created_at} inverse />
                        </Link>
                      </li>
                    )
                  })}
                </ActivityRows>
              )}
            </ActivityCard>

            <ActivityCard title="Scorecards" hint="Legacy scoring records." viewAllHref="/dashboard" viewAllLabel="Open app">
              {recentScorecards.length === 0 ? (
                <ActivityEmpty message="No scorecards yet." />
              ) : (
                <ActivityRows>
                  {recentScorecards.map((s) => {
                    const co = s.company as { name?: string } | { name?: string }[] | null
                    const name = Array.isArray(co) ? co[0]?.name : co?.name

                    return (
                      <li key={s.id}>
                        <Link
                          href={`/scorecards/${s.id}`}
                          className="flex items-center justify-between gap-3 py-3 text-sm transition hover:bg-white/[0.035]"
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-white">{name ?? 'Company'}</span>
                            <span className="block text-xs text-white/42">
                              {s.score_level ?? '—'} · {formatPoints(Number(s.total_score ?? 0))} pts
                            </span>
                          </span>
                          <RelativeDate iso={s.updated_at} inverse />
                        </Link>
                      </li>
                    )
                  })}
                </ActivityRows>
              )}
            </ActivityCard>

            <ActivityCard title="Workbooks" hint="Full scorecard uploads.">
              {recentWorkbooks.length === 0 ? (
                <ActivityEmpty message="No workbook uploads yet." />
              ) : (
                <ActivityRows>
                  {recentWorkbooks.map((w) => {
                    const co = w.company as { name?: string } | { name?: string }[] | null
                    const name = Array.isArray(co) ? co[0]?.name : co?.name

                    return (
                      <li key={w.id}>
                        <div className="flex items-center justify-between gap-3 py-3 text-sm">
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-white">{w.filename}</span>
                            <span className="block truncate text-xs text-white/42">
                              {name ?? '—'} · {formatFullWorkbookStatus(w.status)}
                            </span>
                          </span>
                          <RelativeDate iso={w.uploaded_at} inverse />
                        </div>
                      </li>
                    )
                  })}
                </ActivityRows>
              )}
            </ActivityCard>
          </div>
        </div>
      </SectionShell>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionShell
          eyebrow="Tenant directory"
          title="Companies"
          description={`Latest ${Math.min(PREVIEW_ROWS, companiesPreview.rows.length)} of ${metrics.totalCompanies.toLocaleString()} companies.`}
        >
          <div className="px-5 py-5 sm:px-6">
            <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Search className="h-4 w-4 text-[#063b3f]" aria-hidden />
                Full search and paging lives on the Companies page.
              </div>
              <AdminQuietLink href="/admin/companies/browse">
                <span className="inline-flex items-center gap-1">
                  View all
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </span>
              </AdminQuietLink>
            </div>

            <div className={adminTableShell}>
              <table className="min-w-[760px] w-full text-left text-sm">
                <thead className={adminTableHead}>
                  <tr>
                    <th className={adminTableTh}>Company</th>
                    <th className={adminTableTh}>Owner</th>
                    <th className={`${adminTableTh} text-right`}>Runs</th>
                    <th className={adminTableTh}>Last activity</th>
                    <th className={`${adminTableTh} w-[1%] text-right`} scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {companiesPreview.rows.map((c) => (
                    <tr key={c.id} className={adminTableRow}>
                      <td className={`${adminTableTd} font-semibold text-slate-950`}>{c.name}</td>
                      <td className={`${adminTableTd} text-slate-600`}>
                        <span className="block max-w-[13rem] truncate" title={c.owner_email ?? undefined}>
                          {c.owner_email ?? '—'}
                        </span>
                      </td>
                      <td className={`${adminTableTd} text-right font-semibold tabular-nums text-[#063b3f]`}>
                        {c.assessment_count}
                      </td>
                      <td className={`${adminTableTd} tabular-nums text-slate-600`}>
                        {c.last_activity_at ? formatAdminDateCompact(c.last_activity_at) : '—'}
                      </td>
                      <td className={`${adminTableTd} text-right`}>
                        <AdminPrimaryAction href={`/admin/companies/${c.id}`}>View</AdminPrimaryAction>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </SectionShell>

        <SectionShell
          eyebrow="Procurement control"
          title="Procurement assessments"
          description={`Latest ${Math.min(PREVIEW_ROWS, procurementPreview.rows.length)} of ${metrics.totalProcurementAssessments.toLocaleString()} saved runs.`}
        >
          <div className="px-5 py-5 sm:px-6">
            <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Gauge className="h-4 w-4 text-[#063b3f]" aria-hidden />
                Open any row to inspect the in-app result.
              </div>
              <AdminQuietLink href="/admin/procurement/browse">
                <span className="inline-flex items-center gap-1">
                  View all
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </span>
              </AdminQuietLink>
            </div>

            <div className={adminTableShell}>
              <table className="min-w-[920px] w-full text-left text-sm">
                <thead className={adminTableHead}>
                  <tr>
                    <th className={adminTableTh}>Company</th>
                    <th className={`${adminTableTh} text-right`}>Score</th>
                    <th className={adminTableTh}>Level</th>
                    <th className={`${adminTableTh} text-right`}>TMPS</th>
                    <th className={`${adminTableTh} text-right`}>Recognised</th>
                    <th className={`${adminTableTh} w-[1%] text-right`} scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {procurementPreview.rows.map((p) => (
                    <tr key={p.id} className={adminTableRow}>
                      <td className={`${adminTableTd} font-semibold text-slate-950`}>
                        <span className="block">{p.company_name}</span>
                        <span className="mt-0.5 block text-xs font-normal text-slate-400">Year {p.assessment_year ?? '—'}</span>
                      </td>
                      <td className={`${adminTableTd} text-right`}>
                        <span className="font-bold tabular-nums text-[#042f34]">
                          {p.total_score != null ? formatPoints(p.total_score) : '—'}
                        </span>
                      </td>
                      <td className={adminTableTd}>
                        <AdminLevelPill label={p.level} />
                      </td>
                      <td className={`${adminTableTd} text-right tabular-nums text-slate-700`}>
                        {formatCurrencyZar(p.tmps)}
                      </td>
                      <td className={`${adminTableTd} text-right tabular-nums text-slate-700`}>
                        {p.recognised_pct_display}
                      </td>
                      <td className={`${adminTableTd} text-right`}>
                        <AdminPrimaryAction href={`/procurement/assessments/${p.id}`}>Open</AdminPrimaryAction>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </SectionShell>
      </div>

      <section className="rounded-[1.5rem] border border-emerald-900/10 bg-white px-5 py-4 shadow-sm sm:px-6">
        <div className="flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#063b3f]" aria-hidden />
            <span>
              Admin mode is read-only. Operators can inspect, but tenant edits still happen in the main app.
            </span>
          </div>
          <Link href="/dashboard" className="font-semibold text-[#063b3f] hover:underline">
            Return to app
          </Link>
        </div>
      </section>
    </div>
  )
}