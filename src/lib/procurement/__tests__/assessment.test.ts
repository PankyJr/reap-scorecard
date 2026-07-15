import { describe, expect, it } from 'vitest'
import {
  aggregateCategoryTotals,
  buildProcurementResultFromRows,
  calculateProcurementResults,
} from '../assessment'
import { calculateSupplierRow } from '../rows'

describe('calculateProcurementResults', () => {
  it('returns zero points when measured spend is zero', () => {
    const result = calculateProcurementResults({
      totals: {
        all_bbbee_suppliers: 100_000,
        all_qses: 0,
        all_emes: 0,
        black_owned_51: 0,
        black_women_30: 0,
        bdgs_51: 0,
      },
      totalMeasuredSpend: 0,
    })

    expect(result.totalScore).toBe(0)
    for (const cat of result.categories) {
      expect(cat.achievedPercent).toBe(0)
      expect(cat.pointsAchieved).toBe(0)
    }
  })

  it('caps category points at available points', () => {
    const row = calculateSupplierRow({
      supplier_name: 'Supplier A',
      supplier_type: 'QSE',
      level: 1,
      value_ex_vat: 1_000_000,
      is_51_black_owned: true,
      is_30_black_women_owned: false,
      is_51_bdgs: false,
    })
    const totals = aggregateCategoryTotals([row])
    const result = calculateProcurementResults({
      totals,
      totalMeasuredSpend: 100_000,
    })

    for (const cat of result.categories) {
      expect(cat.pointsAchieved).toBeLessThanOrEqual(cat.availablePoints)
      expect(cat.pointsAchieved).toBeGreaterThanOrEqual(0)
    }
    expect(result.totalScore).toBe(
      result.categories.reduce((sum, c) => sum + c.pointsAchieved, 0),
    )
  })

  it('round-trips persisted result rows without changing totals', () => {
    const row = calculateSupplierRow({
      supplier_name: 'Supplier B',
      supplier_type: 'EME',
      level: 2,
      value_ex_vat: 250_000,
      is_51_black_owned: false,
      is_30_black_women_owned: true,
      is_51_bdgs: false,
    })
    const totals = aggregateCategoryTotals([row])
    const calculated = calculateProcurementResults({
      totals,
      totalMeasuredSpend: 500_000,
    })

    const rows = calculated.categories.map((cat) => ({
      category_key: cat.key,
      category_name: cat.name,
      target_percent: cat.targetPercent,
      available_points: cat.availablePoints,
      achieved_percent: cat.achievedPercent,
      points_achieved: cat.pointsAchieved,
      numerator_value: cat.numeratorValue,
      denominator_value: cat.denominatorValue,
    }))

    const rebuilt = buildProcurementResultFromRows(rows)
    expect(rebuilt.totalScore).toBeCloseTo(calculated.totalScore, 8)
    expect(rebuilt.categories).toHaveLength(calculated.categories.length)
  })
})
