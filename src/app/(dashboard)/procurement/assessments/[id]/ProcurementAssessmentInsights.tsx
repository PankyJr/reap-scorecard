import {
  PROCUREMENT_MAX_POINTS,
  type ProcurementCategoryInsight,
} from '@/lib/procurement/insights'
import { formatCurrency, formatPercentFromRatio } from '@/lib/procurement/format'

/** Shared surface: layered shadow + hairline ring for depth without loud chrome */
export const cardSurface =
  'overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_2px_8px_-2px_rgba(15,23,42,0.05),0_22px_44px_-14px_rgba(15,23,42,0.11)] ring-1 ring-slate-900/[0.035]'

function reapLevelBadgeClass(level: string): string {
  const l = level.toLowerCase()
  if (l.includes('non-compliant') || l.includes('non compliant'))
    return 'border-rose-200/80 bg-rose-50/90 text-rose-800'
  const levelMatch = l.match(/level\s*(\d+)/)
  const n = levelMatch ? Number(levelMatch[1]) : NaN
  if (Number.isFinite(n)) {
    if (n <= 2) return 'border-emerald-200 bg-emerald-50 text-emerald-900'
    if (n <= 4) return 'border-teal-200 bg-teal-50 text-teal-900'
    if (n <= 6) return 'border-sky-200 bg-sky-50 text-sky-900'
    if (n <= 8) return 'border-slate-200 bg-slate-50 text-slate-800'
  }
  return 'border-slate-200 bg-slate-50 text-slate-800'
}

export function ExecutiveSummarySection({
  totalScore,
  reapLevel,
  interpretation,
  totalMeasuredSpend,
  totalBbbeeSpend,
}: {
  totalScore: number
  reapLevel: string
  interpretation: string
  totalMeasuredSpend: number
  totalBbbeeSpend: number
}) {
  const pct =
    PROCUREMENT_MAX_POINTS > 0
      ? Math.min(100, (totalScore / PROCUREMENT_MAX_POINTS) * 100)
      : 0

  return (
    <div className={`relative ${cardSurface}`}>
      <div
        className="h-1 bg-gradient-to-r from-slate-900 via-slate-600 to-slate-400"
        aria-hidden
      />
      <div className="flex flex-col gap-6 p-6 sm:p-7 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Executive summary
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <span className="text-4xl font-semibold tabular-nums tracking-tight text-slate-950 sm:text-5xl">
              {totalScore.toFixed(2)}
            </span>
            <span className="pb-1.5 text-sm font-medium text-slate-500">
              of {PROCUREMENT_MAX_POINTS} procurement points
            </span>
          </div>
          <div className="mt-5 h-3 max-w-md overflow-hidden rounded-full bg-slate-100/90 p-px shadow-[inset_0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-inset ring-slate-900/[0.06]">
            <div
              className="h-full min-h-[10px] rounded-full bg-gradient-to-r from-slate-900 via-slate-700 to-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-3">
            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${reapLevelBadgeClass(reapLevel)}`}
            >
              REAP level (procurement): {reapLevel}
            </span>
          </div>
          <p className="mt-4 max-w-2xl text-[15px] leading-[1.65] text-slate-600">
            {interpretation}
          </p>
        </div>
        <div className="shrink-0 rounded-xl border border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-slate-50/30 px-5 py-4 text-sm text-slate-600 shadow-sm ring-1 ring-slate-900/[0.04] lg:min-w-[240px] lg:text-right">
          <div>
            <span className="text-xs font-medium text-slate-500">Measured procurement (TMPS)</span>
            <div className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-slate-950">
              {formatCurrency(totalMeasuredSpend)}
            </div>
          </div>
          <div className="mt-4 border-t border-slate-200/80 pt-4">
            <span className="text-xs font-medium text-slate-500">Recognised B-BBEE spend</span>
            <div className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-slate-950">
              {formatCurrency(totalBbbeeSpend)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: ProcurementCategoryInsight['status'] }) {
  const label =
    status === 'strong' ? 'Strong' : status === 'moderate' ? 'Moderate' : 'Priority'
  const cls =
    status === 'strong'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : status === 'moderate'
        ? 'border-amber-200 bg-amber-50 text-amber-900'
        : 'border-rose-200/80 bg-rose-50/90 text-rose-800'
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cls}`}
    >
      {label}
    </span>
  )
}

function categoryProgressWidth(cat: ProcurementCategoryInsight): number {
  if (cat.targetPercent <= 0) return 0
  return Math.min(100, (cat.achievedPercent / cat.targetPercent) * 100)
}

function progressBarClass(status: ProcurementCategoryInsight['status']): string {
  if (status === 'strong') return 'bg-gradient-to-r from-emerald-600 to-emerald-500'
  if (status === 'moderate') return 'bg-gradient-to-r from-amber-500 to-amber-400'
  return 'bg-gradient-to-r from-rose-500 to-rose-400'
}

function categoryStripeClass(status: ProcurementCategoryInsight['status']): string {
  if (status === 'strong') return 'border-l-emerald-500'
  if (status === 'moderate') return 'border-l-amber-400'
  return 'border-l-rose-400'
}

export function CategoryInsightsSection({
  insights,
  strongestName,
  weakestName,
}: {
  insights: ProcurementCategoryInsight[]
  strongestName: string | null
  weakestName: string | null
}) {
  if (!insights.length) return null

  return (
    <div className={cardSurface}>
      <div className="border-b border-slate-100 bg-gradient-to-b from-slate-50/90 to-slate-50/30 px-6 py-4 sm:px-7">
        <h2 className="text-base font-semibold tracking-tight text-slate-950">Category insights</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
          Each row compares achieved spend share of TMPS to the category target.
        </p>
        {(strongestName || weakestName) && (
          <p className="mt-2 text-xs text-slate-600">
            {strongestName ? (
              <>
                <span className="font-semibold text-slate-800">Strongest: </span>
                {strongestName}
              </>
            ) : null}
            {strongestName && weakestName ? <span className="mx-1 text-slate-300">·</span> : null}
            {weakestName ? (
              <>
                <span className="font-semibold text-slate-800">Weakest: </span>
                {weakestName}
              </>
            ) : null}
          </p>
        )}
      </div>
      <ul className="divide-y divide-slate-100">
        {insights.map((cat) => {
          const bar = categoryProgressWidth(cat)
          return (
            <li
              key={cat.key}
              className={`border-l-[3px] py-6 pl-5 pr-6 transition-colors odd:bg-white even:bg-slate-50/[0.45] hover:bg-slate-50 sm:pl-6 sm:pr-7 ${categoryStripeClass(cat.status)}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold tracking-tight text-slate-950">{cat.name}</span>
                    <StatusBadge status={cat.status} />
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">
                    Target{' '}
                    <span className="font-medium text-slate-800">
                      {formatPercentFromRatio(cat.targetPercent, 1)}
                    </span>{' '}
                    of TMPS for full points · Achieved{' '}
                    <span className="font-medium text-slate-800">
                      {formatPercentFromRatio(cat.achievedPercent, 1)}
                    </span>
                    {cat.gapPercentPoints > 0.05 ? (
                      <>
                        {' '}
                        · Gap{' '}
                        <span className="font-medium text-slate-800">
                          {cat.gapPercentPoints.toFixed(1)} pp
                        </span>{' '}
                        below target
                      </>
                    ) : (
                      <> · At or above target share</>
                    )}
                  </p>
                  <div className="mt-4 max-w-xl">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      <span>Progress to target</span>
                      <span className="tabular-nums text-slate-500">{bar.toFixed(0)}%</span>
                    </div>
                    <div className="mt-2.5 h-3 overflow-hidden rounded-full bg-slate-100/90 p-px shadow-[inset_0_1px_2px_rgba(15,23,42,0.05)] ring-1 ring-inset ring-slate-900/[0.05]">
                      <div
                        className={`h-full min-h-[10px] rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] ${progressBarClass(cat.status)}`}
                        style={{ width: `${bar}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="shrink-0 rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/90 px-4 py-3.5 text-right shadow-sm ring-1 ring-slate-900/[0.03]">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Points
                  </div>
                  <div className="mt-1 text-base font-semibold tabular-nums tracking-tight text-slate-950">
                    {cat.pointsAchieved.toFixed(2)}
                    <span className="text-sm font-normal text-slate-400"> / </span>
                    <span className="text-sm font-semibold text-slate-600">
                      {cat.availablePoints.toFixed(0)}
                    </span>
                  </div>
                  {cat.pointsRemaining > 0.01 ? (
                    <div className="mt-1.5 text-[11px] font-medium text-slate-500">
                      {cat.pointsRemaining.toFixed(2)} pts available
                    </div>
                  ) : null}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

type SupplierRow = {
  id: string
  supplier_name: string
  supplier_code: string | null
  supplier_type: string
  level: string
  value_ex_vat: number | string | null
  bbbee_spend: number | string | null
}

export function SupplierImpactSection({
  suppliers,
  totalBbbeeSpend,
  mix,
  layout = 'panel',
}: {
  suppliers: SupplierRow[]
  totalBbbeeSpend: number
  mix: {
    compliantCount: number
    nonCompliantCount: number
    totalValueExVat: number
    nonCompliantValueExVat: number
  }
  layout?: 'panel' | 'report'
}) {
  const spendDenom = totalBbbeeSpend > 0 ? totalBbbeeSpend : 0
  const tableScroll =
    layout === 'report' ? '' : 'max-h-[min(32rem,70vh)] overflow-y-auto overflow-x-hidden'
  const theadRowClass =
    layout === 'report'
      ? 'border-b border-slate-200 bg-slate-50 text-slate-500'
      : 'sticky top-0 z-[1] border-b border-slate-200 bg-slate-50/95 text-slate-500 backdrop-blur-sm'

  return (
    <div className={`min-w-0 ${cardSurface}`}>
      <div className="border-b border-slate-100 bg-gradient-to-b from-slate-50/90 to-slate-50/30 px-5 py-4 sm:px-6">
        <h2 className="text-base font-semibold tracking-tight text-slate-950">Supplier impact</h2>
        <p className="mt-1.5 text-sm text-slate-600">
          Compliance status, spend, and share of recognised B-BBEE spend.
        </p>
        {mix.totalValueExVat > 0 ? (
          <p className="mt-2 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">{mix.compliantCount}</span> compliant ·{' '}
            <span className="font-semibold text-slate-800">{mix.nonCompliantCount}</span>{' '}
            non-compliant
            {mix.nonCompliantValueExVat > 0 ? (
              <>
                {' '}
                · Non-compliant value{' '}
                <span className="font-semibold text-slate-800">
                  {formatPercentFromRatio(
                    mix.nonCompliantValueExVat / mix.totalValueExVat,
                    0,
                  )}
                </span>{' '}
                of supplier value
              </>
            ) : null}
          </p>
        ) : null}
      </div>
      <div className={tableScroll}>
        <table
          className={`w-full min-w-0 border-collapse text-left text-xs ${layout === 'panel' ? 'table-fixed' : ''}`}
        >
          {layout === 'panel' ? (
            <colgroup>
              <col style={{ width: '34%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '22%' }} />
              <col style={{ width: '24%' }} />
            </colgroup>
          ) : (
            <colgroup>
              <col style={{ width: '28%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '20%' }} />
            </colgroup>
          )}
          <thead className={theadRowClass}>
            <tr className="text-[10px] font-bold uppercase tracking-wider">
              <th className="px-4 py-3.5 pl-5">Supplier</th>
              <th className="px-3 py-3.5">Status</th>
              <th className="px-3 py-3.5 text-right">Supplier value</th>
              <th className="px-3 py-3.5 text-right">B-BBEE</th>
              {layout === 'report' ? (
                <th className="px-4 py-3.5 pr-5 text-right">Share</th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {suppliers.length ? (
              suppliers.map((s) => {
                const b = Number(s.bbbee_spend ?? 0) || 0
                const v = Number(s.value_ex_vat ?? 0) || 0
                const compliant = s.level !== 'Non-Compliant'
                const share = spendDenom > 0 ? b / spendDenom : 0
                return (
                  <tr
                    key={s.id}
                    className="transition-colors odd:bg-white even:bg-slate-50/[0.4] hover:bg-slate-100/60"
                  >
                    <td className="px-4 py-3.5 pl-5 align-top">
                      <div
                        className={`font-semibold tracking-tight text-slate-950 ${layout === 'panel' ? 'truncate' : ''}`}
                        title={s.supplier_name}
                      >
                        {s.supplier_name}
                      </div>
                      <div
                        className={`text-[11px] text-slate-500 ${layout === 'panel' ? 'truncate' : ''}`}
                      >
                        {s.supplier_type}
                        {s.supplier_code ? ` · ${s.supplier_code}` : ''}
                      </div>
                      <div className={`text-[11px] text-slate-400 ${layout === 'panel' ? 'truncate' : ''}`}>
                        Level {s.level}
                      </div>
                    </td>
                    <td className="px-3 py-3.5 align-top">
                      {compliant ? (
                        <span className="inline-flex rounded-full border border-emerald-200/90 bg-emerald-50/95 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-900 shadow-sm">
                          Compliant
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full border border-rose-200/90 bg-rose-50/95 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-900 shadow-sm">
                          Non-compliant
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3.5 text-right tabular-nums text-slate-700 align-top">
                      {formatCurrency(v)}
                    </td>
                    <td className="px-3 py-3.5 text-right align-top">
                      <span className="font-semibold tabular-nums tracking-tight text-slate-950">
                        {formatCurrency(b)}
                      </span>
                      {layout === 'panel' && spendDenom > 0 ? (
                        <div className="mt-0.5 text-[10px] text-slate-500">
                          {formatPercentFromRatio(share, 0)} of spend
                        </div>
                      ) : null}
                    </td>
                    {layout === 'report' ? (
                      <td className="px-4 py-3.5 pr-5 text-right tabular-nums text-slate-600 align-top">
                        {spendDenom > 0 ? formatPercentFromRatio(share, 0) : '—'}
                      </td>
                    ) : null}
                  </tr>
                )
              })
            ) : (
              <tr>
                <td
                  colSpan={layout === 'report' ? 5 : 4}
                  className="px-5 py-8 text-center text-sm text-slate-500"
                >
                  No suppliers captured for this assessment yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function RecommendationsSection({ items }: { items: string[] }) {
  if (!items.length) return null
  return (
    <div className={`${cardSurface} px-6 py-5 sm:px-7 sm:py-6`}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        Recommendations
      </div>
      <h2 className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
        Suggested next steps
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
        Rule-based guidance from category gaps and supplier compliance mix.
      </p>
      <ol className="mt-6 overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] ring-1 ring-slate-900/[0.03]">
        {items.map((line, i) => (
          <li
            key={i}
            className="flex gap-4 border-b border-slate-100 px-4 py-3.5 last:border-b-0 sm:gap-5 sm:px-5 sm:py-4"
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold tabular-nums text-white shadow-md ring-1 ring-white/10"
              aria-hidden
            >
              {i + 1}
            </span>
            <p className="min-w-0 flex-1 text-sm leading-relaxed text-slate-700">{line}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}
