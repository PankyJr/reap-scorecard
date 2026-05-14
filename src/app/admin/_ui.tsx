import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

/** Matches dashboard procurement level pill treatment (`dashboard/page.tsx`). */
export function procurementLevelBadgeClass(level: string): string {
  if (level === 'Non-Compliant') {
    return 'border-rose-200/90 bg-rose-50/90 text-rose-800 ring-1 ring-rose-100'
  }
  if (level.startsWith('Level ')) {
    const n = parseInt(level.slice(6), 10)
    if (!Number.isNaN(n) && n <= 3) {
      return 'border-[#063b3f]/30 bg-gradient-to-br from-[#063b3f]/12 to-emerald-50/50 text-[#02181b] ring-1 ring-[#063b3f]/15'
    }
    if (!Number.isNaN(n) && n <= 5) {
      return 'border-slate-200 bg-slate-50 text-slate-800 ring-1 ring-slate-100'
    }
  }
  return 'border-slate-200/90 bg-white text-slate-700 ring-1 ring-slate-100/80'
}

export const adminCardShadow =
  'shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_40px_-8px_rgba(15,23,42,0.08)]'

export function AdminStatusChip({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'success' | 'muted' }) {
  const cls =
    tone === 'success'
      ? 'border-emerald-200/80 bg-emerald-50/90 text-emerald-900'
      : tone === 'muted'
        ? 'border-slate-200/90 bg-slate-50 text-slate-600'
        : 'border-[#063b3f]/25 bg-[#063b3f]/[0.06] text-[#042f34]'

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${cls}`}
    >
      {label}
    </span>
  )
}

export function AdminMetricTile({
  label,
  value,
  hint,
  icon: Icon,
  variant = 'light',
  size = 'lg',
}: {
  label: string
  value: string | number
  hint?: string
  icon?: LucideIcon
  variant?: 'light' | 'brand' | 'ink'
  size?: 'lg' | 'md'
}) {
  const shell =
    variant === 'brand'
      ? 'rounded-2xl border border-[#052a2e]/20 bg-gradient-to-br from-[#063b3f] to-[#042a2e] p-4 text-white shadow-md sm:p-5'
      : variant === 'ink'
        ? 'rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900 to-slate-950 p-4 text-white shadow-md sm:p-5'
        : 'rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white to-slate-50/70 p-4 shadow-sm sm:p-5'

  const labelCls =
    variant === 'light'
      ? 'text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500'
      : 'text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60'

  const valueSz = size === 'lg' ? 'text-2xl sm:text-[1.75rem]' : 'text-xl sm:text-2xl'
  const valueCls =
    variant === 'light'
      ? `${valueSz} font-semibold tracking-tight tabular-nums text-slate-900`
      : `${valueSz} font-semibold tracking-tight tabular-nums`

  const hintCls =
    variant === 'light' ? 'text-xs leading-snug text-slate-500' : 'text-xs leading-snug text-sky-100/80'

  const iconWrap =
    variant === 'light'
      ? 'rounded-xl border border-slate-200/80 bg-white p-2 text-[#063b3f] shadow-sm'
      : variant === 'brand'
        ? 'rounded-xl border border-white/15 bg-[#02181b]/50 p-2 text-emerald-200/95'
        : 'rounded-xl border border-white/10 bg-slate-800/80 p-2 text-sky-200'

  return (
    <div className={`relative flex flex-col ${shell}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={labelCls}>{label}</p>
          <p className={`mt-2 ${valueCls}`}>{value}</p>
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
      <div className="border-b border-slate-100/90 bg-slate-50/40 px-5 py-3.5 sm:px-6">
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

  const btnBase =
    'rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50'
  const btnDisabled = 'rounded-lg border border-transparent px-3 py-2 text-xs font-semibold text-slate-300'

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
      <p className="tabular-nums text-xs sm:text-sm">
        {total === 0 ? (
          'No rows'
        ) : (
          <>
            <span className="font-semibold text-slate-800">
              {from}–{to}
            </span>{' '}
            of <span className="font-semibold text-slate-800">{total.toLocaleString()}</span>
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
            <Link href={`${basePath}?page=${prev}${qParam}`} className={btnBase}>
              Previous
            </Link>
          ) : (
            <span className={btnDisabled}>Previous</span>
          )}
          {next != null ? (
            <Link href={`${basePath}?page=${next}${qParam}`} className={btnBase}>
              Next
            </Link>
          ) : (
            <span className={btnDisabled}>Next</span>
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
      className="inline-flex items-center gap-1 text-xs font-semibold text-[#063b3f] underline-offset-4 transition hover:underline"
    >
      {children}
    </Link>
  )
}

export function AdminLevelPill({ label }: { label: string }) {
  return (
    <span
      className={`inline-flex max-w-[13rem] items-center truncate rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none shadow-sm ${procurementLevelBadgeClass(label)}`}
    >
      {label}
    </span>
  )
}

export function AdminPrimaryAction({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-full border border-[#063b3f]/20 bg-[#063b3f] px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#052a2e]"
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

/** Shared table chrome for admin directory / preview tables. */
export const adminTableShell = 'overflow-x-auto rounded-xl border border-slate-200/90 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]'
export const adminTableHead =
  'border-b border-slate-200 bg-slate-50/95 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500'
export const adminTableTh = 'whitespace-nowrap px-3 py-3 first:pl-4 last:pr-4'
export const adminTableRow =
  'border-b border-slate-100/90 transition-colors last:border-0 hover:bg-[#063b3f]/[0.035]'
export const adminTableTd = 'px-3 py-2.5 align-middle text-sm first:pl-4 last:pr-4'
