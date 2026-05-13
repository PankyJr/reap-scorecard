import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

/** Matches dashboard procurement level pill treatment (`dashboard/page.tsx`). */
export function procurementLevelBadgeClass(level: string): string {
  if (level === 'Non-Compliant') {
    return 'border-slate-300 bg-slate-100 text-slate-700'
  }
  if (level.startsWith('Level ')) {
    const n = parseInt(level.slice(6), 10)
    if (!Number.isNaN(n) && n <= 3) {
      return 'border-[#063b3f]/35 bg-[#063b3f]/10 text-[#042f34]'
    }
    if (!Number.isNaN(n) && n <= 5) {
      return 'border-slate-200 bg-slate-50 text-slate-700'
    }
  }
  return 'border-slate-200/90 bg-white text-slate-700'
}

export const adminCardShadow =
  'shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_40px_-8px_rgba(15,23,42,0.08)]'

export function AdminMetricTile({
  label,
  value,
  hint,
  icon: Icon,
  variant = 'light',
}: {
  label: string
  value: string | number
  hint?: string
  icon?: LucideIcon
  variant?: 'light' | 'brand' | 'ink'
}) {
  const shell =
    variant === 'brand'
      ? 'rounded-2xl bg-[#063b3f] p-4 text-white shadow-sm sm:p-5'
      : variant === 'ink'
        ? 'rounded-2xl bg-slate-900 p-4 text-white shadow-sm sm:p-5'
        : 'rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-5'

  const labelCls =
    variant === 'light'
      ? 'text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500'
      : 'text-[11px] font-medium uppercase tracking-[0.14em] text-white/55'

  const valueCls =
    variant === 'light' ? 'text-2xl font-semibold tabular-nums text-slate-900 sm:text-[1.65rem]' : 'text-2xl font-semibold tabular-nums sm:text-[1.65rem]'

  const hintCls = variant === 'light' ? 'text-xs leading-snug text-slate-500' : 'text-xs leading-snug text-sky-100/75'

  const iconWrap =
    variant === 'light'
      ? 'rounded-xl bg-[#02181b] p-2 text-white ring-1 ring-emerald-500/25'
      : variant === 'brand'
        ? 'rounded-xl bg-[#02181b] p-2 text-white ring-1 ring-sky-300/35'
        : 'rounded-xl bg-slate-800 p-2 text-white ring-1 ring-emerald-400/30'

  return (
    <div className={`relative flex flex-col ${shell}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={labelCls}>{label}</p>
          <p className={`mt-2.5 ${valueCls}`}>{value}</p>
          {hint ? <p className={`mt-1.5 ${hintCls}`}>{hint}</p> : null}
        </div>
        {Icon ? (
          <div className={`shrink-0 ${iconWrap}`}>
            <Icon className="h-5 w-5" aria-hidden />
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function AdminPanel({
  title,
  description,
  children,
  variant = 'default',
}: {
  title: string
  description?: string
  children: React.ReactNode
  variant?: 'default' | 'elevated'
}) {
  const wrap =
    variant === 'elevated'
      ? `overflow-hidden rounded-2xl border border-slate-200/80 bg-white ${adminCardShadow}`
      : 'rounded-2xl border border-slate-200/90 bg-white shadow-sm'

  return (
    <section className={wrap}>
      <div className="border-b border-slate-100 px-5 py-3 sm:px-6">
        <h2 className="text-sm font-semibold tracking-tight text-slate-900">{title}</h2>
        {description ? (
          <p className="mt-1 text-xs leading-relaxed text-slate-500 line-clamp-2">{description}</p>
        ) : null}
      </div>
      <div className="px-5 py-4 sm:px-6 sm:py-5">{children}</div>
    </section>
  )
}

export function AdminPagination({
  total,
  page,
  pageSize,
  basePath,
  search,
}: {
  total: number
  page: number
  pageSize: number
  basePath: string
  search: string
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const displayPage = Math.min(Math.max(1, page), totalPages)
  const q = search.trim()
  const qParam = q ? `&q=${encodeURIComponent(q)}` : ''
  const from = total === 0 ? 0 : (displayPage - 1) * pageSize + 1
  const to = Math.min(displayPage * pageSize, total)

  const prev = displayPage > 1 ? displayPage - 1 : null
  const next = displayPage < totalPages ? displayPage + 1 : null

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
      <p className="tabular-nums text-xs sm:text-sm">
        {total === 0 ? (
          'No rows'
        ) : (
          <>
            <span className="font-medium text-slate-800">
              {from}–{to}
            </span>{' '}
            of <span className="font-medium text-slate-800">{total}</span>
            {totalPages > 1 ? (
              <span className="text-slate-400">
                {' '}
                · page {displayPage} of {totalPages}
              </span>
            ) : null}
          </>
        )}
      </p>
      {totalPages > 1 ? (
        <div className="flex items-center gap-2">
          {prev != null ? (
            <Link
              href={`${basePath}?page=${prev}${qParam}`}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Previous
            </Link>
          ) : (
            <span className="rounded-md border border-transparent px-3 py-1.5 text-xs font-semibold text-slate-300">
              Previous
            </span>
          )}
          {next != null ? (
            <Link
              href={`${basePath}?page=${next}${qParam}`}
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Next
            </Link>
          ) : (
            <span className="rounded-md border border-transparent px-3 py-1.5 text-xs font-semibold text-slate-300">
              Next
            </span>
          )}
        </div>
      ) : null}
    </div>
  )
}

export function AdminQuietLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-xs font-semibold text-[#063b3f] underline-offset-4 transition hover:underline"
    >
      {children}
    </Link>
  )
}

export function AdminLevelPill({ label }: { label: string }) {
  return (
    <span
      className={`inline-flex max-w-[12rem] items-center truncate rounded-md border px-2 py-0.5 text-xs font-semibold ${procurementLevelBadgeClass(label)}`}
    >
      {label}
    </span>
  )
}

export function AdminPrimaryAction({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-lg bg-[#063b3f] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#052a2e]"
    >
      {children}
    </Link>
  )
}

export function AdminSecondaryAction({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
    >
      {children}
    </Link>
  )
}
