import Link from 'next/link'

import {
  AdminLevelPill,
  AdminPanel,
  AdminPagination,
  AdminPrimaryAction,
} from '@/app/admin/_ui'
import {
  fetchAdminProcurementPage,
  formatAdminDate,
  formatAdminDateCompact,
} from '@/lib/admin/queries'
import { formatCurrencyZar, formatPoints } from '@/lib/procurement/format'

const PAGE_SIZE = 25

function parsePage(raw: string | string[] | undefined): number {
  const v = Array.isArray(raw) ? raw[0] : raw
  const n = v ? parseInt(v, 10) : 1
  return Number.isFinite(n) && n > 0 ? n : 1
}

function parseQ(raw: string | string[] | undefined): string {
  const v = Array.isArray(raw) ? raw[0] : raw
  return typeof v === 'string' ? v : ''
}

export default async function AdminProcurementBrowsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const q = parseQ(sp.q)
  const page = parsePage(sp.page)

  const { rows, total } = await fetchAdminProcurementPage({ page, pageSize: PAGE_SIZE, search: q })

  const tableHead =
    'border-b border-slate-200 bg-slate-50/95 text-left text-xs font-medium text-slate-500 normal-case'
  const tableTh = 'whitespace-nowrap px-3 py-2.5 first:pl-4 last:pr-4'
  const tableRow = 'border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/90'
  const tableTd = 'px-3 py-2 align-middle text-sm first:pl-4 last:pr-4'

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Procurement</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Filter by tenant company name. Newest assessments first. Open a row for the in-app result view.
        </p>
      </header>

      <AdminPanel variant="elevated" title="Assessments" description="Paged list with search.">
        <form
          method="get"
          className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end"
          role="search"
          aria-label="Search procurement by company"
        >
          <div className="min-w-0 flex-1">
            <label htmlFor="admin-pa-q" className="block text-xs font-medium text-slate-500">
              Company name
            </label>
            <input
              id="admin-pa-q"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Match tenant company…"
              className="mt-1 w-full max-w-md rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[#063b3f]/40 focus:ring-2 focus:ring-[#063b3f]/20"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-[#063b3f] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#052a2e]"
            >
              Search
            </button>
            {q ? (
              <Link
                href="/admin/procurement/browse"
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Clear
              </Link>
            ) : null}
          </div>
        </form>

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
              {rows.map((p) => (
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

        <AdminPagination
          total={total}
          page={page}
          pageSize={PAGE_SIZE}
          basePath="/admin/procurement/browse"
          search={q}
        />
      </AdminPanel>
    </div>
  )
}
