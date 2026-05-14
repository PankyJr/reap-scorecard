'use client'

import { useEffect, useMemo, useState, startTransition } from 'react'
import { formatCurrencyZar, formatPercentFromRatio } from '@/lib/procurement/format'

/** Matches `cardSurface` in ProcurementAssessmentInsights (avoid circular import). */
const breakdownSectionSurface =
  'overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm'

export type ProcurementSupplierBreakdownRow = {
  id: string
  supplier_name: string
  supplier_type: string
  level: string
  value_ex_vat: number | string | null
  bbbee_spend: number | string | null
  recognition_percent: number | string | null
  is_51_black_owned?: boolean | null
  is_30_black_women_owned?: boolean | null
  is_51_bdgs?: boolean | null
}

function formatBbbeeLevel(level: string): string {
  if (!level || level === 'Non-Compliant') return 'Non-Compliant'
  if (/^\d+$/.test(level.trim())) return `Level ${level.trim()}`
  return level
}

function recognitionPercentDisplay(recognition: number | string | null | undefined): string {
  const n = Number(recognition ?? 0)
  if (!Number.isFinite(n) || n <= 0) return '—'
  return formatPercentFromRatio(n, 0)
}

function contributionBucketTags(row: ProcurementSupplierBreakdownRow): string[] {
  const tags: string[] = []
  if (row.supplier_type === 'EME') tags.push('EME')
  if (row.supplier_type === 'QSE') tags.push('QSE')
  if (row.is_51_black_owned) tags.push('51% BO')
  if (row.is_30_black_women_owned) tags.push('30% BWO')
  if (row.is_51_bdgs) tags.push('51% BDG')
  return tags
}

function recognitionRatioBadgeClass(ratio: number): string {
  if (!Number.isFinite(ratio) || ratio <= 0) {
    return 'border border-slate-200/80 bg-slate-50 text-slate-600'
  }
  if (ratio >= 1.2) {
    return 'border border-emerald-200/70 bg-emerald-50/90 text-emerald-900'
  }
  if (ratio >= 1) {
    return 'border border-emerald-100 bg-emerald-50/50 text-emerald-900'
  }
  if (ratio >= 0.85) {
    return 'border border-amber-200/70 bg-amber-50/85 text-amber-950'
  }
  return 'border border-slate-200/80 bg-slate-100/70 text-slate-700'
}

function MutedPill({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-lg border border-slate-300 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
      {label}
    </span>
  )
}

function ContributionBucketChips({ tags }: { tags: string[] }) {
  if (!tags.length) {
    return <span className="text-xs text-slate-400">—</span>
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((t) => (
        <span
          key={t}
          className="inline-flex rounded-lg border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700"
        >
          {t}
        </span>
      ))}
    </div>
  )
}

const hideListBtnClass =
  'inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#0b163d]/30 bg-white px-3 py-1.5 text-xs font-semibold text-[#0b163d] shadow-sm transition hover:bg-[#0b163d]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b163d]'

const showTableBtnClass =
  'inline-flex shrink-0 items-center gap-2 rounded-lg border border-[#0b5259]/25 bg-[#0b5259] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#094851]'

export function RecognisedSupplierBreakdownSection({
  suppliers,
}: {
  suppliers: ProcurementSupplierBreakdownRow[]
}) {
  const [tableHidden, setTableHidden] = useState(false)

  const totalActual = suppliers.reduce(
    (sum, r) => sum + (Number(r.value_ex_vat ?? 0) || 0),
    0,
  )
  const totalRecognised = suppliers.reduce(
    (sum, r) => sum + (Number(r.bbbee_spend ?? 0) || 0),
    0,
  )
  const count = suppliers.length

  const supplierIdsKey = useMemo(() => suppliers.map((s) => s.id).join('|'), [suppliers])

  useEffect(() => {
    startTransition(() => {
      setTableHidden(false)
    })
  }, [supplierIdsKey])

  const hideTableOnScreen = tableHidden && count > 0

  return (
    <div className={`min-w-0 ${breakdownSectionSurface} print:overflow-visible`}>
      <div className="border-b border-slate-200/60 bg-slate-50/40 px-5 py-4 sm:flex sm:items-start sm:justify-between sm:gap-6 sm:px-6 sm:py-5">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-slate-950 sm:text-xl">
            Recognised supplier breakdown
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600">
            Actual spend, recognised value, recognition percentage, and contribution buckets (from
            supplier flags and recognition rules).
          </p>
          {hideTableOnScreen ? (
            <p className="mt-2 text-xs leading-relaxed text-slate-500 print:hidden">
              Table hidden on screen to save space; it still appears when you print or export this
              view.
            </p>
          ) : null}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-0 sm:shrink-0 sm:justify-end">
          <span className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium tabular-nums text-slate-700">
            {count} supplier{count === 1 ? '' : 's'}
          </span>
          <span className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium tabular-nums text-slate-700">
            {formatCurrencyZar(totalRecognised)} recognised
          </span>
          <span className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-medium tabular-nums text-slate-700">
            {formatCurrencyZar(totalActual)} actual spend
          </span>
          {count > 0 && !tableHidden ? (
            <button type="button" className={hideListBtnClass} onClick={() => setTableHidden(true)}>
              Hide supplier list
            </button>
          ) : null}
          {count > 0 && tableHidden ? (
            <button
              type="button"
              className={showTableBtnClass}
              onClick={() => setTableHidden(false)}
            >
              Show supplier table
            </button>
          ) : null}
        </div>
      </div>
      <div
        className={
          hideTableOnScreen ? 'hidden overflow-x-auto print:block' : 'overflow-x-auto'
        }
      >
        <table className="w-full min-w-[58rem] border-collapse text-left text-sm print:min-w-0">
          <thead className="border-b border-slate-200 bg-slate-50/95 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-5 py-3.5 pl-6 text-left font-semibold sm:pl-7">Supplier</th>
              <th className="px-3 py-3.5 text-left font-semibold">Type</th>
              <th className="px-3 py-3.5 text-left font-semibold">Level</th>
              <th className="px-3 py-3.5 text-right font-semibold">Actual spend</th>
              <th className="px-3 py-3.5 text-right font-semibold">Recognised spend</th>
              <th className="px-3 py-3.5 text-center font-semibold">Recognition</th>
              <th className="px-5 py-3.5 pr-6 text-left font-semibold sm:pr-7">
                Contribution buckets
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {suppliers.length ? (
              suppliers.map((s) => {
                const v = Number(s.value_ex_vat ?? 0) || 0
                const b = Number(s.bbbee_spend ?? 0) || 0
                const ratio = Number(s.recognition_percent ?? 0) || 0
                const recLabel = recognitionPercentDisplay(s.recognition_percent)
                const buckets = contributionBucketTags(s)
                return (
                  <tr
                    key={s.id}
                    className="align-middle odd:bg-white even:bg-slate-50/[0.25] hover:bg-slate-50/80"
                  >
                    <td className="max-w-[16rem] px-5 py-4 pl-6 align-middle text-[15px] font-semibold leading-snug text-slate-950 sm:max-w-none sm:pl-7">
                      {s.supplier_name}
                    </td>
                    <td className="px-3 py-4 align-middle">
                      <MutedPill label={s.supplier_type} />
                    </td>
                    <td className="px-3 py-4 align-middle">
                      <MutedPill label={formatBbbeeLevel(s.level)} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-right align-middle text-sm font-medium tabular-nums text-slate-800">
                      {formatCurrencyZar(v)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-right align-middle text-sm font-semibold tabular-nums text-slate-950">
                      {formatCurrencyZar(b)}
                    </td>
                    <td className="px-3 py-4 text-center align-middle">
                      <span
                        className={`inline-flex min-w-[3.25rem] justify-center rounded-lg px-2 py-0.5 text-xs font-semibold tabular-nums ${recognitionRatioBadgeClass(ratio)}`}
                      >
                        {recLabel}
                      </span>
                    </td>
                    <td className="px-5 py-4 pr-6 align-middle sm:pr-7">
                      <ContributionBucketChips tags={buckets} />
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-500">
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
