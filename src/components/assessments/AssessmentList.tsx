import Link from 'next/link'
import { ClipboardList, FileBarChart2 } from 'lucide-react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { AssessmentRow } from '@/lib/assessments/rows'

function formatDate(value: string | null): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * Assessments as a list: what it is, for which company, where it stands and
 * the one next thing to do. The same row is used on every screen.
 */
export function AssessmentList({ rows, showCompany = true }: { rows: AssessmentRow[]; showCompany?: boolean }) {
  return (
    <ul className="divide-y divide-line rounded-control border border-line bg-surface">
      {rows.map((row) => {
        const Icon = row.kind === 'full' ? FileBarChart2 : ClipboardList
        const date = formatDate(row.updatedAt)
        return (
          <li key={`${row.kind}-${row.id}`} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 gap-3">
              <span
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-control ${
                  row.kind === 'full' ? 'bg-brand-soft text-brand' : 'bg-sunken text-muted ring-1 ring-inset ring-line'
                }`}
                aria-hidden
              >
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 space-y-1">
                <p className="truncate text-base font-semibold text-ink">
                  <Link href={row.status.href} className="hover:text-brand hover:underline">
                    {row.title}
                  </Link>
                </p>
                <p className="text-sm text-muted">
                  {row.kind === 'full' ? 'Full scorecard' : 'Procurement scorecard'}
                  {showCompany ? ` for ${row.companyName}` : ''}
                  {date ? `, updated ${date}` : ''}
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <StatusBadge tone={row.status.tone}>{row.status.label}</StatusBadge>
                  {row.score ? <span className="text-sm font-medium tabular-nums text-ink">{row.score}</span> : null}
                </div>
              </div>
            </div>
            <Link
              href={row.status.href}
              className="inline-flex shrink-0 items-center justify-center rounded-control border border-line-strong px-3.5 py-2 text-[15px] font-semibold text-brand hover:border-brand hover:bg-brand-soft"
            >
              {row.status.next}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
