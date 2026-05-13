import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Building2, Shield } from 'lucide-react'

import {
  AdminLevelPill,
  AdminPanel,
  AdminPrimaryAction,
  AdminSecondaryAction,
} from '@/app/admin/_ui'
import { fetchAdminCompanyDetail, formatAdminDate, formatAdminDateCompact } from '@/lib/admin/queries'
import { formatPoints } from '@/lib/procurement/format'

type PageProps = { params: Promise<{ id: string }> }

function EmptySection({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center">
      <p className="text-sm text-slate-600">{message}</p>
    </div>
  )
}

export default async function AdminCompanyDetailPage({ params }: PageProps) {
  const { id } = await params
  const detail = await fetchAdminCompanyDetail(id)
  if (!detail) notFound()

  const { company, ownerEmail, procurementAssessments, scorecards, workbooks } = detail

  const tableHead =
    'border-b border-slate-200 bg-slate-50/95 text-left text-xs font-medium text-slate-500 normal-case'
  const tableTh = 'whitespace-nowrap px-3 py-3 first:pl-4 last:pr-4'
  const tableRow = 'border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/90'
  const tableTd = 'px-3 py-2.5 align-middle text-sm first:pl-4 last:pr-4'

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="overflow-hidden rounded-2xl border border-[#052a2e]/30 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_40px_-8px_rgba(15,23,42,0.08)]">
        <div className="relative bg-[#063b3f] px-5 py-6 sm:px-6 sm:py-7">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_80%_at_100%_0%,rgba(255,255,255,0.07),transparent_52%)]"
            aria-hidden
          />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-4">
              <div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <Link
                    href="/admin"
                    className="text-sm font-semibold text-sky-100/90 underline-offset-4 transition hover:text-white hover:underline"
                  >
                    ← Overview
                  </Link>
                  <Link
                    href="/admin/companies/browse"
                    className="text-sm font-semibold text-white/90 underline-offset-4 transition hover:text-white hover:underline"
                  >
                    All companies →
                  </Link>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-[#02181b]/60 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-200/95">
                    <Shield className="h-3 w-3" aria-hidden />
                    Read-only dossier
                  </span>
                </div>
                <h1 className="mt-2 flex items-center gap-2 text-2xl font-semibold tracking-tight text-white sm:text-[1.65rem]">
                  <Building2 className="h-7 w-7 shrink-0 text-emerald-300/90" aria-hidden />
                  <span className="min-w-0">{company.name}</span>
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-sky-100/85">
                  Internal snapshot for REAP operators. Edits and new assessments stay in the main app with the tenant
                  owner.
                </p>
              </div>
              <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-sky-50/95">
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-white/45">Owner</dt>
                  <dd className="mt-0.5 font-medium text-white">{ownerEmail ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-white/45">Created</dt>
                  <dd className="mt-0.5 tabular-nums">{formatAdminDate(company.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-white/45">Updated</dt>
                  <dd className="mt-0.5 tabular-nums">{formatAdminDate(company.updated_at)}</dd>
                </div>
              </dl>
            </div>
            <div className="flex shrink-0 flex-col gap-2 lg:items-end">
              <Link
                href={`/companies/${company.id}`}
                className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-[#063b3f] shadow-md transition hover:bg-sky-50"
              >
                Open in client app
              </Link>
              <p className="max-w-[16rem] text-right text-[11px] leading-snug text-sky-100/70 lg:text-left">
                Same company record—the client view still follows normal ownership rules.
              </p>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-100 bg-white px-5 py-4 sm:px-6">
          <p className="text-xs text-slate-500">
            Use the sections below to jump to procurement results, legacy scorecards, or uploaded workbooks.
          </p>
        </div>
      </div>

      <AdminPanel
        variant="elevated"
        title="Company overview"
        description="Registration and contact details on file. Not a substitute for verified statutory records."
      >
        <dl className="grid gap-6 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-slate-500">Industry</dt>
            <dd className="mt-1 font-medium text-slate-900">{company.industry ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">Contact person</dt>
            <dd className="mt-1 font-medium text-slate-900">{company.contact_person ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">Company email</dt>
            <dd className="mt-1 break-all font-medium text-slate-900">{company.email ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500">Phone</dt>
            <dd className="mt-1 tabular-nums font-medium text-slate-900">{company.phone ?? '—'}</dd>
          </div>
        </dl>
        {company.notes ? (
          <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-sm leading-relaxed text-slate-700">
            <p className="text-xs font-medium text-slate-500">Notes (visible to owner in app)</p>
            <p className="mt-2">{company.notes}</p>
          </div>
        ) : null}
      </AdminPanel>

      <AdminPanel
        variant="elevated"
        title="Procurement assessments"
        description="Saved runs for this company. Result opens the assessment workspace; Report opens the printable view."
      >
        {procurementAssessments.length === 0 ? (
          <EmptySection message="No procurement assessments on record for this company." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white">
            <table className="min-w-[820px] w-full text-left text-sm">
              <thead className={tableHead}>
                <tr>
                  <th className={tableTh}>Year</th>
                  <th className={`${tableTh} text-right`}>Points</th>
                  <th className={tableTh}>Level</th>
                  <th className={`${tableTh} text-right`}>TMPS</th>
                  <th className={`${tableTh} text-right`}>Recognised</th>
                  <th className={tableTh}>Import</th>
                  <th className={tableTh}>Created</th>
                  <th className={`${tableTh} w-[1%] text-right`} scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {procurementAssessments.map((p) => (
                  <tr key={p.id} className={tableRow}>
                    <td className={`${tableTd} tabular-nums text-slate-800`}>{p.assessment_year}</td>
                    <td className={`${tableTd} text-right tabular-nums text-slate-900`}>{p.points_display}</td>
                    <td className={tableTd}>
                      <AdminLevelPill label={p.level} />
                    </td>
                    <td className={`${tableTd} text-right tabular-nums text-slate-700`}>{p.tmps_display}</td>
                    <td className={`${tableTd} text-right tabular-nums text-slate-700`}>{p.recognised_display}</td>
                    <td className={`${tableTd} max-w-[10rem] truncate text-xs text-slate-600`}>
                      {p.import_workbook_name || p.import_sheet_name
                        ? [p.import_workbook_name, p.import_sheet_name].filter(Boolean).join(' · ')
                        : '—'}
                    </td>
                    <td className={`${tableTd} tabular-nums text-slate-600`} title={formatAdminDate(p.created_at)}>
                      {formatAdminDateCompact(p.created_at)}
                    </td>
                    <td className={`${tableTd} text-right`}>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <AdminPrimaryAction href={`/procurement/assessments/${p.id}`}>Result</AdminPrimaryAction>
                        <AdminSecondaryAction href={`/procurement/assessments/${p.id}/report`}>Report</AdminSecondaryAction>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminPanel>

      <AdminPanel variant="elevated" title="Scorecards" description="Legacy scorecard records for this company.">
        {scorecards.length === 0 ? (
          <EmptySection message="No legacy scorecards for this company." />
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_0_rgba(15,23,42,0.04)]">
            {scorecards.map((s) => (
              <li
                key={s.id}
                className="flex flex-col gap-3 px-4 py-3 transition-colors hover:bg-slate-50/90 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{s.score_level ?? '—'}</p>
                  <p className="text-xs text-slate-500">
                    {formatPoints(Number(s.total_score ?? 0))} points · updated{' '}
                    <time dateTime={s.updated_at}>{formatAdminDate(s.updated_at)}</time>
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <AdminPrimaryAction href={`/scorecards/${s.id}`}>Open</AdminPrimaryAction>
                  <AdminSecondaryAction href={`/scorecards/${s.id}/report`}>Report</AdminSecondaryAction>
                </div>
              </li>
            ))}
          </ul>
        )}
      </AdminPanel>

      <AdminPanel variant="elevated" title="Full scorecard workbooks" description="Uploaded files and processing status.">
        {workbooks.length === 0 ? (
          <EmptySection message="No full scorecard workbook uploads for this company." />
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_0_rgba(15,23,42,0.04)]">
            {workbooks.map((w) => (
              <li
                key={w.id}
                className="flex flex-col gap-3 px-4 py-3 transition-colors hover:bg-slate-50/90 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{w.filename}</p>
                  <p className="text-xs text-slate-500">
                    <span className="font-medium text-slate-600">{w.status}</span>
                    {' · '}
                    uploaded <time dateTime={w.uploaded_at}>{formatAdminDate(w.uploaded_at)}</time>
                    {w.processed_at ? (
                      <>
                        {' · '}
                        processed <time dateTime={w.processed_at}>{formatAdminDate(w.processed_at)}</time>
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <AdminPrimaryAction href={`/scorecards/full/${w.id}`}>Workbook</AdminPrimaryAction>
                  <AdminSecondaryAction href={`/scorecards/full/${w.id}/report`}>Report</AdminSecondaryAction>
                </div>
              </li>
            ))}
          </ul>
        )}
      </AdminPanel>
    </div>
  )
}
