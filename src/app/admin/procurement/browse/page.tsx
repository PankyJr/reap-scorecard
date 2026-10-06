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
  fetchAdminProcurementPage,
  formatAdminDate,
  formatAdminDateCompact,
} from '@/lib/admin/queries'
import { formatCurrencyZar } from '@/lib/procurement/format'

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

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-2xl border border-line/90 bg-surface px-5 py-5 shadow-sm sm:px-6">
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">Procurement</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Filter by tenant company name. Newest assessments first. Open a row for the in-app result view.
        </p>
        {q ? (
          <p className="mt-3 text-sm text-muted">
            Filter active: <span className="font-medium text-ink">&ldquo;{q}&rdquo;</span>
          </p>
        ) : null}
      </header>

      <AdminPanel variant="elevated" title="Assessments" description="Paged list with search. Read-only.">
        <form
          method="get"
          className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end"
          role="search"
          aria-label="Search procurement by company"
        >
          <div className="min-w-0 flex-1">
            <label htmlFor="admin-pa-q" className="block text-sm font-semibold text-muted">
              Company name
            </label>
            <input
              id="admin-pa-q"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Match tenant company…"
              className="mt-1.5 w-full max-w-md rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink shadow-sm outline-none transition focus:border-brand/45 focus:ring-2 focus:ring-brand/15"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-hover"
            >
              Search
            </button>
            {q ? (
              <Link
                href="/admin/procurement/browse"
                className="rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink shadow-sm transition hover:bg-sunken"
              >
                Clear
              </Link>
            ) : null}
          </div>
        </form>

        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-sunken/70 px-6 py-12 text-center">
            <p className="text-sm font-medium text-ink">No assessments match</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
              {q
                ? 'Try a different company name or clear the filter to browse the full list.'
                : 'No assessments returned for this page.'}
            </p>
            {q ? (
              <Link
                href="/admin/procurement/browse"
                className="mt-4 inline-flex text-sm font-semibold text-brand underline-offset-4 hover:underline"
              >
                Clear search
              </Link>
            ) : null}
          </div>
        ) : (
          <div className={adminTableShell}>
            <table className="min-w-[900px] w-full text-left text-sm">
              <thead className={adminTableHead}>
                <tr>
                  <th className={adminTableTh}>Company</th>
                  <th className={adminTableTh}>Year</th>
                  <th className={`${adminTableTh} text-right`}>Points</th>
                  <th className={`${adminTableTh} text-right`}>TMPS</th>
                  <th className={`${adminTableTh} text-right`}>Recognised</th>
                  <th className={adminTableTh}>Created</th>
                  <th className={`${adminTableTh} w-[1%] text-right`} scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((p) => (
                  <tr key={p.id} className={adminTableRow}>
                    <td className={`${adminTableTd} font-medium text-ink`}>{p.company_name}</td>
                    <td className={`${adminTableTd} tabular-nums text-muted`}>{p.assessment_year ?? '—'}</td>
                    <td className={`${adminTableTd} text-right`}>
                      <span className="font-semibold tabular-nums text-brand">{p.points_display}</span>
                    </td>
                    <td className={`${adminTableTd} text-right tabular-nums text-ink`}>
                      {formatCurrencyZar(p.tmps)}
                    </td>
                    <td className={`${adminTableTd} text-right tabular-nums text-ink`}>
                      {p.recognised_pct_display}
                    </td>
                    <td className={`${adminTableTd} tabular-nums text-muted`} title={formatAdminDate(p.created_at)}>
                      {formatAdminDateCompact(p.created_at)}
                    </td>
                    <td className={`${adminTableTd} text-right`}>
                      <AdminPrimaryAction href={`/procurement/assessments/${p.id}`}>Open</AdminPrimaryAction>
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
          basePath="/admin/procurement/browse"
          search={q}
        />
      </AdminPanel>
    </div>
  )
}
