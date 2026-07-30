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
      level: '1',
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
      level: '2',
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

describe('calculateSupplierRow Flow Through', () => {
  it('keeps standard recognised spend when Flow Through is off or absent', () => {
    const base = {
      supplier_name: 'Standard supplier',
      supplier_type: 'Generic' as const,
      level: '1',
      value_ex_vat: 1_000,
      is_51_black_owned: false,
      is_30_black_women_owned: false,
      is_51_bdgs: false,
    }

    expect(calculateSupplierRow(base).bbbee_spend).toBe(1_350)
    expect(
      calculateSupplierRow({
        ...base,
        is_51_percent_flow_through: false,
      }).bbbee_spend,
    ).toBe(1_350)
  })

  it('applies the approved 1.20 uplift exactly once for IKOPEKELA', () => {
    const row = calculateSupplierRow({
      supplier_name: 'IKOPEKELA',
      supplier_type: 'QSE',
      level: '4',
      value_ex_vat: 1_764_614_302.92,
      is_51_black_owned: true,
      is_30_black_women_owned: true,
      is_51_bdgs: true,
      is_51_percent_flow_through: true,
    })

    expect(row.recognition_percent).toBe(1)
    expect(row.bbbee_spend).toBeCloseTo(2_117_537_163.504, 6)
    expect(row.qse_amount).toBeCloseTo(row.bbbee_spend, 6)
    expect(row.black_owned_amount).toBeCloseTo(row.bbbee_spend, 6)
    expect(row.black_women_amount).toBeCloseTo(row.bbbee_spend, 6)
    expect(row.bdgs_amount).toBeCloseTo(row.bbbee_spend, 6)
  })

  it('allows an effective 162% rate for ACHINTYA without changing the standard rate', () => {
    const row = calculateSupplierRow({
      supplier_name: 'ACHINTYA',
      supplier_type: 'EME',
      level: '1',
      value_ex_vat: 177_373_164.77,
      is_51_black_owned: false,
      is_30_black_women_owned: false,
      is_51_bdgs: false,
      is_51_percent_flow_through: true,
    })

    expect(row.recognition_percent).toBe(1.35)
    expect(row.bbbee_spend).toBeCloseTo(287_344_526.9274, 6)
    expect(row.eme_amount).toBeCloseTo(row.bbbee_spend, 6)
  })

  it('does not create recognised spend for a non-compliant supplier', () => {
    const row = calculateSupplierRow({
      supplier_name: 'Non-compliant supplier',
      supplier_type: 'Generic',
      level: 'Non-Compliant',
      value_ex_vat: 100_000,
      is_51_black_owned: true,
      is_30_black_women_owned: true,
      is_51_bdgs: true,
      is_51_percent_flow_through: true,
    })

    expect(row.bbbee_spend).toBe(0)
    expect(row.black_owned_amount).toBe(0)
    expect(row.black_women_amount).toBe(0)
    expect(row.bdgs_amount).toBe(0)
  })
})
