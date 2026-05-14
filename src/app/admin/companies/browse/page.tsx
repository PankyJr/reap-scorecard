import Link from 'next/link'

import {
  AdminPanel,
  AdminPagination,
  AdminPrimaryAction,
  adminTableHead,
  adminTableRow,
  adminTableShell,
  adminTableTd,
  adminTableTh,
} from '@/app/admin/_ui'
import {
  fetchAdminCompaniesPage,
  formatAdminDate,
  formatAdminDateCompact,
} from '@/lib/admin/queries'

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

export default async function AdminCompaniesBrowsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const q = parseQ(sp.q)
  const page = parsePage(sp.page)

  const { rows, total } = await fetchAdminCompaniesPage({ page, pageSize: PAGE_SIZE, search: q })

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white px-5 py-5 shadow-sm sm:px-6">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Companies</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          Search by company name. Results refresh on submit; use paging for large directories.
        </p>
        {q ? (
          <p className="mt-3 text-xs text-slate-500">
            Filter active: <span className="font-medium text-slate-700">&ldquo;{q}&rdquo;</span>
          </p>
        ) : null}
      </header>

      <AdminPanel variant="elevated" title="Directory" description="Newest companies first. Read-only.">
        <form
          method="get"
          className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end"
          role="search"
          aria-label="Search companies"
        >
          <div className="min-w-0 flex-1">
            <label htmlFor="admin-co-q" className="block text-xs font-semibold text-slate-600">
              Search
            </label>
            <input
              id="admin-co-q"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Company name…"
              className="mt-1.5 w-full max-w-md rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[#063b3f]/45 focus:ring-2 focus:ring-[#063b3f]/15"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="rounded-xl bg-[#063b3f] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#052a2e]"
            >
              Search
            </button>
            {q ? (
              <Link
                href="/admin/companies/browse"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Clear
              </Link>
            ) : null}
          </div>
        </form>

        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-800">No companies match</p>
            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500">
              {q
                ? 'Try a shorter search term or clear the filter to see the full directory.'
                : 'No companies returned for this page.'}
            </p>
            {q ? (
              <Link
                href="/admin/companies/browse"
                className="mt-4 inline-flex text-xs font-semibold text-[#063b3f] underline-offset-4 hover:underline"
              >
                Clear search
              </Link>
            ) : null}
          </div>
        ) : (
          <div className={adminTableShell}>
            <table className="min-w-[720px] w-full text-left text-sm">
              <thead className={adminTableHead}>
                <tr>
                  <th className={adminTableTh}>Company</th>
                  <th className={adminTableTh}>Owner email</th>
                  <th className={adminTableTh}>Created</th>
                  <th className={`${adminTableTh} text-right`}>Assessments</th>
                  <th className={adminTableTh}>Last activity</th>
                  <th className={`${adminTableTh} w-[1%] text-right`} scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((c) => (
                  <tr key={c.id} className={adminTableRow}>
                    <td className={`${adminTableTd} font-medium text-slate-900`}>{c.name}</td>
                    <td className={`${adminTableTd} text-slate-600`}>
                      <span className="max-w-[14rem] truncate block" title={c.owner_email ?? undefined}>
                        {c.owner_email ?? '—'}
                      </span>
                    </td>
                    <td className={`${adminTableTd} tabular-nums text-slate-600`} title={formatAdminDate(c.created_at)}>
                      {formatAdminDateCompact(c.created_at)}
                    </td>
                    <td className={`${adminTableTd} text-right tabular-nums text-slate-800`}>{c.assessment_count}</td>
                    <td
                      className={`${adminTableTd} tabular-nums text-slate-600`}
                      title={c.last_activity_at ? formatAdminDate(c.last_activity_at) : undefined}
                    >
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
        )}

        <AdminPagination
          total={total}
          page={page}
          pageSize={PAGE_SIZE}
          basePath="/admin/companies/browse"
          search={q}
        />
      </AdminPanel>
    </div>
  )
}
