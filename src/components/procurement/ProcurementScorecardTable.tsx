import type { ProcurementAssessmentResult } from '@/lib/procurement/assessment'
import type { ProcurementCategoryKey } from '@/lib/procurement/config'
import {
  formatPercentFromRatio,
  formatPoints,
} from '@/lib/procurement/format'

/** Excel-style workbook colours (approximate to typical B-BBEE template). */
const EXCEL_GREEN = '#92D050'
const EXCEL_HEADER_BLUE = '#B4C6E7'

/** Display labels per Bongani / workbook wording (scoring unchanged). */
const SCORECARD_ROW_LABELS: Record<ProcurementCategoryKey, string> = {
  all_bbbee_suppliers: 'All B-BBEE Suppliers',
  all_qses: 'From all QSEs',
  all_emes: 'From all EMEs',
  black_owned_51: 'Spend with atleast 51% Black Owned supplier',
  black_women_30: 'spend with atleast 30% Black women owned supplier',
  bdgs_51: 'Spend with atleast 51% black designated group suppliers',
}

const PREFERENTIAL_KEYS: ProcurementCategoryKey[] = [
  'all_bbbee_suppliers',
  'all_qses',
  'all_emes',
  'black_owned_51',
  'black_women_30',
]

const BONUS_KEYS: ProcurementCategoryKey[] = ['bdgs_51']

const cellBorder = 'border border-black border-solid'
const bodyFont = 'font-serif text-black antialiased'

function categoryMap(
  categories: ProcurementAssessmentResult['categories'],
): Map<ProcurementCategoryKey, (typeof categories)[number]> {
  return new Map(categories.map((c) => [c.key, c]))
}

export type ProcurementScorecardTableProps = {
  result: ProcurementAssessmentResult
  tmpsDenominatorNote?: string | null
  className?: string
}

/**
 * Excel-style preferential procurement scorecard (layout only).
 * All numeric values come from {@link ProcurementAssessmentResult} — no scoring logic.
 */
export function ProcurementScorecardTable({
  result,
  tmpsDenominatorNote,
  className = '',
}: ProcurementScorecardTableProps) {
  const map = categoryMap(result.categories)

  const totalAvailable = result.categories.reduce(
    (s, c) => s + c.availablePoints,
    0,
  )

  const outer =
    'rounded-2xl border border-slate-200/90 bg-white p-1 shadow-sm print:border-slate-400 print:shadow-none'

  const renderDataRow = (key: ProcurementCategoryKey) => {
    const cat = map.get(key)
    const label = SCORECARD_ROW_LABELS[key]
    return (
      <tr key={key} className={`bg-white ${bodyFont}`}>
        <td
          className={`${cellBorder} w-[40%] px-2 py-1 text-left text-[15px] leading-tight sm:px-2.5 sm:py-1.5`}
        >
          {label}
        </td>
        <td
          className={`${cellBorder} w-[12%] px-2 py-1 text-right text-[15px] tabular-nums sm:px-2.5 sm:py-1.5`}
        >
          {cat ? formatPercentFromRatio(cat.targetPercent, 2) : '—'}
        </td>
        <td
          className={`${cellBorder} w-[22%] px-2 py-1 text-right text-[15px] tabular-nums sm:px-2.5 sm:py-1.5`}
        >
          {cat ? formatPoints(cat.availablePoints) : '—'}
        </td>
        <td
          className={`${cellBorder} w-[14%] px-2 py-1 text-right text-[15px] tabular-nums sm:px-2.5 sm:py-1.5`}
        >
          {cat ? formatPercentFromRatio(cat.achievedPercent, 2) : '—'}
        </td>
        <td
          className={`${cellBorder} w-[12%] px-2 py-1 text-right text-[15px] tabular-nums sm:px-2.5 sm:py-1.5`}
        >
          {cat ? formatPoints(cat.pointsAchieved) : '—'}
        </td>
      </tr>
    )
  }

  const tableBlock = (
    <div className="overflow-x-auto rounded-2xl border border-black bg-white print:border-black">
      <table className="w-full min-w-[640px] border-collapse text-[15px] print:min-w-0">
        <thead>
          <tr>
            <th
              colSpan={5}
              className={`${cellBorder} px-3 py-2 text-center font-serif text-xl font-bold text-black sm:text-2xl`}
              style={{ backgroundColor: EXCEL_GREEN }}
            >
              Preferential Procurement
            </th>
          </tr>
          <tr style={{ backgroundColor: EXCEL_HEADER_BLUE }}>
            <th
              className={`${cellBorder} px-2 py-2 text-center font-serif text-base font-bold text-black sm:px-3 sm:py-2.5 sm:text-lg`}
            >
              Measurement Category &amp; Criteria
            </th>
            <th
              className={`${cellBorder} px-2 py-2 text-center font-serif text-base font-bold text-black sm:px-3 sm:py-2.5`}
            >
              Target
            </th>
            <th
              className={`${cellBorder} px-2 py-2 text-center font-serif text-base font-bold text-black sm:px-3 sm:py-2.5`}
            >
              Available Points
            </th>
            <th
              className={`${cellBorder} px-2 py-2 text-center font-serif text-base font-bold text-black sm:px-3 sm:py-2.5`}
            >
              Achieved %
            </th>
            <th
              className={`${cellBorder} px-2 py-2 text-center font-serif text-base font-bold text-black sm:px-3 sm:py-2.5`}
            >
              Points Achieved
            </th>
          </tr>
          <tr style={{ backgroundColor: EXCEL_HEADER_BLUE }}>
            <th
              colSpan={5}
              className={`${cellBorder} px-2 py-1 text-center font-serif text-lg font-bold text-black sm:text-xl`}
            >
              Preferential Procurement
            </th>
          </tr>
        </thead>
        <tbody>
          {PREFERENTIAL_KEYS.map(renderDataRow)}
          <tr style={{ backgroundColor: EXCEL_HEADER_BLUE }}>
            <td
              colSpan={5}
              className={`${cellBorder} px-2 py-1 text-center font-serif text-lg font-bold text-black sm:text-xl`}
            >
              Bonus Points
            </td>
          </tr>
          {BONUS_KEYS.map(renderDataRow)}
          <tr className={`bg-white font-bold ${bodyFont}`}>
            <td
              className={`${cellBorder} px-2 py-1 text-left text-[15px] sm:px-2.5 sm:py-1.5`}
            >
              Total
            </td>
            <td className={`${cellBorder} px-2 py-1 sm:px-2.5 sm:py-1.5`} />
            <td
              className={`${cellBorder} px-2 py-1 text-right text-[15px] tabular-nums sm:px-2.5 sm:py-1.5`}
            >
              {formatPoints(totalAvailable)}
            </td>
            <td className={`${cellBorder} px-2 py-1 sm:px-2.5 sm:py-1.5`} />
            <td
              className={`${cellBorder} px-2 py-1 text-right text-[15px] tabular-nums sm:px-2.5 sm:py-1.5`}
            >
              {formatPoints(result.totalScore)}
            </td>
          </tr>
        </tbody>
      </table>
      {tmpsDenominatorNote ? (
        <div
          className="border-t border-black bg-white px-2 py-1.5 text-center text-xs leading-snug text-slate-600 sm:text-[13px]"
        >
          <span className="font-semibold text-slate-800">Scoring denominator: </span>
          {tmpsDenominatorNote}
        </div>
      ) : null}
    </div>
  )

  return (
    <div className={`${outer} ${className}`.trim()}>
      {tableBlock}
    </div>
  )
}
