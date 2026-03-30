import {
  PROCUREMENT_MAX_POINTS,
  type ProcurementCategoryInsight,
} from '@/lib/procurement/insights'
import { formatCurrency, formatPercentFromRatio } from '@/lib/procurement/format'

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
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm px-6 py-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            Executive summary
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <span className="text-4xl font-semibold tracking-tight text-slate-900 tabular-nums">
              {totalScore.toFixed(2)}
            </span>
            <span className="pb-1 text-sm text-slate-500">
              of {PROCUREMENT_MAX_POINTS} procurement points
            </span>
          </div>
          <div className="mt-3">
            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-800">
              REAP level (procurement): {reapLevel}
            </span>
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-600">
            {interpretation}
          </p>
        </div>
        <div className="shrink-0 rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-600 lg:text-right">
          <div>
            <span className="text-slate-500">Measured procurement (TMPS)</span>
            <div className="mt-0.5 font-semibold tabular-nums text-slate-900">
              {formatCurrency(totalMeasuredSpend)}
            </div>
          </div>
          <div className="mt-3 border-t border-slate-200/80 pt-3">
            <span className="text-slate-500">Recognised B-BBEE spend</span>
            <div className="mt-0.5 font-semibold tabular-nums text-slate-900">
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
        : 'border-rose-200 bg-rose-50 text-rose-900'
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${cls}`}
    >
      {label}
    </span>
  )
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
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200">
        <h2 className="text-sm font-semibold text-slate-900">Category insights</h2>
        <p className="mt-1 text-xs text-slate-500">
          Each row compares achieved spend share of TMPS to the category target. Gaps show
          where procurement mix can still improve.
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
        {insights.map((cat) => (
          <li key={cat.key} className="px-6 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">{cat.name}</span>
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
              </div>
              <div className="text-right shrink-0">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Points
                </div>
                <div className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">
                  {cat.pointsAchieved.toFixed(2)}
                  <span className="font-normal text-slate-400"> / </span>
                  {cat.availablePoints.toFixed(0)}
                </div>
                {cat.pointsRemaining > 0.01 ? (
                  <div className="mt-1 text-[11px] text-slate-500">
                    {cat.pointsRemaining.toFixed(2)} pts available
                  </div>
                ) : null}
              </div>
            </div>
          </li>
        ))}
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
  /** `report`: full table for print/PDF (no scroll clip, no sticky header). */
  layout?: 'panel' | 'report'
}) {
  const spendDenom = totalBbbeeSpend > 0 ? totalBbbeeSpend : 0
  const tableScroll =
    layout === 'report' ? '' : 'max-h-[32rem] overflow-auto'
  const theadRowClass =
    layout === 'report'
      ? 'bg-slate-50 text-slate-500 border-b border-slate-200'
      : 'bg-slate-50 text-slate-500 border-b border-slate-200 sticky top-0 z-[1]'

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200">
        <h2 className="text-sm font-semibold text-slate-900">Supplier impact</h2>
        <p className="mt-1 text-xs text-slate-500">
          Compliance status, spend, and each supplier&apos;s share of total recognised B-BBEE
          spend.
        </p>
        {mix.totalValueExVat > 0 ? (
          <p className="mt-2 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">{mix.compliantCount}</span> compliant
            ·{' '}
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
                of supplier ex-VAT total
              </>
            ) : null}
          </p>
        ) : null}
      </div>
      <div className={tableScroll}>
        <table className="w-full text-xs text-left">
          <thead className={theadRowClass}>
            <tr>
              <th className="px-4 py-2.5">Supplier</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5 text-right">Ex-VAT</th>
              <th className="px-4 py-2.5 text-right">B-BBEE</th>
              <th className="px-4 py-2.5 text-right">Share</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {suppliers.length ? (
              suppliers.map((s) => {
                const b = Number(s.bbbee_spend ?? 0) || 0
                const v = Number(s.value_ex_vat ?? 0) || 0
                const compliant =
                  s.level !== 'Non-Compliant'
                const share = spendDenom > 0 ? b / spendDenom : 0
                return (
                  <tr key={s.id}>
                    <td className="px-4 py-2.5 align-top">
                      <div className="font-medium text-slate-900">{s.supplier_name}</div>
                      <div className="text-[11px] text-slate-500">
                        {s.supplier_type}
                        {s.supplier_code ? ` · ${s.supplier_code}` : ''}
                      </div>
                      <div className="text-[11px] text-slate-500">Level {s.level}</div>
                    </td>
                    <td className="px-4 py-2.5 align-top">
                      {compliant ? (
                        <span className="inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-800">
                          Compliant
                        </span>
                      ) : (
                        <span className="inline-flex rounded-md border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[11px] font-medium text-rose-800">
                          Non-compliant
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-800 align-top">
                      {formatCurrency(v)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-900 font-medium align-top">
                      {formatCurrency(b)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-600 align-top">
                      {spendDenom > 0 ? formatPercentFromRatio(share, 0) : '—'}
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-slate-500">
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
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm px-6 py-5">
      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
        Recommendations
      </div>
      <h2 className="mt-2 text-sm font-semibold text-slate-900">Suggested next steps</h2>
      <p className="mt-1 text-xs text-slate-500">
        Rule-based guidance from category gaps and supplier compliance mix. Use alongside
        your own sourcing policy.
      </p>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
        {items.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </div>
  )
}
