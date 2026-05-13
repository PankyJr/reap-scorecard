import Link from 'next/link'
import { notFound } from 'next/navigation'

import { fetchAdminCompanyDetail, formatAdminDate } from '@/lib/admin/queries'
import { formatPoints } from '@/lib/procurement/format'

type PageProps = { params: Promise<{ id: string }> }

export default async function AdminCompanyDetailPage({ params }: PageProps) {
  const { id } = await params
  const detail = await fetchAdminCompanyDetail(id)
  if (!detail) notFound()

  const { company, ownerEmail, procurementAssessments, scorecards, workbooks } = detail

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/admin" className="text-sm font-semibold text-[#0b5259] hover:underline">
            ← Overview
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#0c1a2e]">{company.name}</h1>
          <p className="mt-1 text-sm text-slate-500">Internal read-only company dossier.</p>
        </div>
        <Link
          href={`/companies/${company.id}`}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Open in client app
        </Link>
      </div>

      <section className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.02] sm:p-6">
        <h2 className="text-base font-semibold text-[#0c1a2e]">Company</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Industry</dt>
            <dd className="mt-0.5 text-slate-800">{company.industry ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contact</dt>
            <dd className="mt-0.5 text-slate-800">{company.contact_person ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Company email</dt>
            <dd className="mt-0.5 text-slate-800">{company.email ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</dt>
            <dd className="mt-0.5 text-slate-800">{company.phone ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Owner email</dt>
            <dd className="mt-0.5 text-slate-800">{ownerEmail ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Created</dt>
            <dd className="mt-0.5 text-slate-800">{formatAdminDate(company.created_at)}</dd>
          </div>
        </dl>
        {company.notes ? (
          <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/60 px-3 py-2 text-sm text-slate-700">
            {company.notes}
          </div>
        ) : null}
      </section>

      <section className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.02] sm:p-6">
        <h2 className="text-base font-semibold text-[#0c1a2e]">Procurement assessments</h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-100">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2.5">Year</th>
                <th className="px-3 py-2.5 text-right">Points</th>
                <th className="px-3 py-2.5">Level</th>
                <th className="px-3 py-2.5 text-right">TMPS</th>
                <th className="px-3 py-2.5 text-right">Recognised</th>
                <th className="px-3 py-2.5">Import</th>
                <th className="px-3 py-2.5">Created</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {procurementAssessments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/60">
                  <td className="px-3 py-2.5">{p.assessment_year}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{p.points_display}</td>
                  <td className="px-3 py-2.5">{p.level}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{p.tmps_display}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{p.recognised_display}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-600">
                    {p.import_workbook_name || p.import_sheet_name
                      ? [p.import_workbook_name, p.import_sheet_name].filter(Boolean).join(' · ')
                      : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-slate-600">{formatAdminDate(p.created_at)}</td>
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/procurement/assessments/${p.id}`}
                      className="font-semibold text-[#0b5259] hover:underline"
                    >
                      Result
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.02] sm:p-6">
        <h2 className="text-base font-semibold text-[#0c1a2e]">Scorecards</h2>
        {scorecards.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No scorecards for this company.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-100">
            {scorecards.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                <div>
                  <p className="font-medium text-slate-900">{s.score_level ?? '—'}</p>
                  <p className="text-xs text-slate-500">{formatPoints(Number(s.total_score ?? 0))} points</p>
                </div>
                <Link href={`/scorecards/${s.id}`} className="text-sm font-semibold text-[#0b5259] hover:underline">
                  Open
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm ring-1 ring-slate-900/[0.02] sm:p-6">
        <h2 className="text-base font-semibold text-[#0c1a2e]">Workbook uploads</h2>
        {workbooks.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No full scorecard workbooks on record.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-100">
            {workbooks.map((w) => (
              <li key={w.id} className="px-3 py-2.5 text-sm">
                <p className="font-medium text-slate-900">{w.filename}</p>
                <p className="text-xs text-slate-500">
                  {w.status} · uploaded {formatAdminDate(w.uploaded_at)}
                  {w.processed_at ? ` · processed ${formatAdminDate(w.processed_at)}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
