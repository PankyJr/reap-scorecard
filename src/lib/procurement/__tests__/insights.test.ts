import { describe, expect, it } from 'vitest'
import { aggregateCategoryTotals, calculateProcurementResults } from '../assessment'
import { calculateSupplierRow, type ProcurementSupplierInput } from '../rows'
import {
  buildCategoryInsights,
  buildProcurementWhatThisMeans,
  deriveProcurementReapLevel,
  getProcurementExecutiveInterpretation,
} from '../insights'
import { procurementPointsFromLines, summariseProcurementScore } from '../scoreSummary'
import { PROCUREMENT_BASE_CAP, PROCUREMENT_BONUS_CAP } from '@/lib/scorecard/generic/elements/procurement'

function supplier(overrides: Partial<ProcurementSupplierInput>): ProcurementSupplierInput {
  return {
    supplier_name: 'Supplier',
    supplier_type: 'Generic',
    level: '4',
    value_ex_vat: 100,
    is_51_black_owned: false,
    is_30_black_women_owned: false,
    is_51_bdgs: false,
    ...overrides,
  }
}

// Every line full: the five base lines add up past the cap.
const FULL_MARKS = calculateProcurementResults({
  totals: aggregateCategoryTotals(
    [
      supplier({ supplier_type: 'QSE', level: '1', value_ex_vat: 500, is_51_black_owned: true, is_30_black_women_owned: true, is_51_bdgs: true }),
      supplier({ supplier_type: 'EME', level: '1', value_ex_vat: 500, is_51_black_owned: true, is_30_black_women_owned: true, is_51_bdgs: true }),
    ].map(calculateSupplierRow),
  ),
  totalMeasuredSpend: 1000,
})

const CAPPED = `${PROCUREMENT_BASE_CAP}.00 of ${PROCUREMENT_BASE_CAP} points, bonus ${PROCUREMENT_BONUS_CAP}.00 of ${PROCUREMENT_BONUS_CAP}`

describe('procurement interpretation sentences', () => {
  it('"What this means" says the base points out of the cap with the bonus apart, as the score headline does', () => {
    const content = buildProcurementWhatThisMeans({ insights: buildCategoryInsights(FULL_MARKS.categories) })
    expect(content?.intro).toBe(`This company scored ${CAPPED}.`)
    const summary = summariseProcurementScore(FULL_MARKS)
    expect(content?.points.basePoints).toBe(summary.basePoints)
    expect(content?.points.bonusPoints).toBe(summary.bonusPoints)
    expect(content?.intro).not.toMatch(/29/)
  })

  it('the executive interpretation keeps the level sentence and states the capped points', () => {
    const level = deriveProcurementReapLevel(FULL_MARKS.totalScore)
    const text = getProcurementExecutiveInterpretation(level, procurementPointsFromLines(FULL_MARKS.categories))
    expect(text).toMatch(/^Recognition is strong/)
    expect(text).toMatch(new RegExp(`This assessment scores ${CAPPED.replace(/\./g, '\\.')}\\.$`))
    expect(text).not.toMatch(/29/)
  })

  it('leaves the procurement rating on its own bands (all six indicators added up)', () => {
    // The rating is REAP's own and is not changed by the caps.
    expect(deriveProcurementReapLevel(FULL_MARKS.totalScore)).toBe('Level 1')
  })
})
