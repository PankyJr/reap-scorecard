import { describe, expect, it } from 'vitest'
import {
  TMPS_EXCLUSIONS,
  TMPS_INCLUSIONS,
  calculateProcurementTmpsTotals,
} from '../tmps'

/**
 * Statement 400: TMPS is all goods and services procured. Purchases, operating
 * expenses, utilities, service fees, recharges, finance costs and capex are
 * INCLUDED; salaries and depreciation are EXCLUDED. Inventory enters through
 * purchases = cost of sales + closing inventory - opening inventory.
 */
describe('calculateProcurementTmpsTotals', () => {
  it('puts purchases of goods and services on the inclusion side', () => {
    const r = calculateProcurementTmpsTotals({
      tmps_purchase_of_goods: 28_047_870,
      tmps_purchase_of_services: 17_190_630,
    })
    expect(r.inclusionsTotal).toBe(45_238_500)
    expect(r.exclusionsTotal).toBe(0)
    expect(r.tmpsTotal).toBe(45_238_500)
  })

  it('treats employee costs and depreciation as exclusions', () => {
    const r = calculateProcurementTmpsTotals({
      tmps_cost_of_sales: 1_000_000,
      tmps_employee_costs: 300_000,
      tmps_depreciation: 50_000,
    })
    expect(r.inclusionsTotal).toBe(1_000_000)
    expect(r.exclusionsTotal).toBe(350_000)
    expect(r.tmpsTotal).toBe(650_000)
  })

  it('recovers purchases from cost of sales with the inventory identity', () => {
    // purchases = cost of sales + closing - opening = 800 + 300 - 200 = 900
    const r = calculateProcurementTmpsTotals({
      tmps_cost_of_sales: 800,
      tmps_closing_inventory: 300,
      tmps_opening_inventory: 200,
    })
    expect(r.tmpsTotal).toBe(900)
  })

  it('includes utilities, service fees, recharges, finance costs and capex', () => {
    const r = calculateProcurementTmpsTotals({
      tmps_utilities: 10,
      tmps_service_fees: 20,
      tmps_recharge_for_services: 30,
      tmps_finance_costs: 40,
      tmps_capital_expenditure: 50,
      tmps_other_operating_expenses: 60,
    })
    expect(r.inclusionsTotal).toBe(210)
    expect(r.exclusionsTotal).toBe(0)
  })

  it('adds custom lines to their own side', () => {
    const r = calculateProcurementTmpsTotals(
      { tmps_cost_of_sales: 1000 },
      { inclusions: [{ amount: 100 }], exclusions: [{ amount: 25 }] },
    )
    expect(r.inclusionsTotal).toBe(1100)
    expect(r.exclusionsTotal).toBe(25)
    expect(r.tmpsTotal).toBe(1075)
  })

  it('never lets a negative or non-numeric input reduce a side', () => {
    const r = calculateProcurementTmpsTotals({
      tmps_cost_of_sales: -5,
      tmps_employee_costs: Number.NaN,
    })
    expect(r.inclusionsTotal).toBe(0)
    expect(r.exclusionsTotal).toBe(0)
  })

  it('keeps the display lists and the arithmetic on the same sides', () => {
    const inc = new Set(TMPS_INCLUSIONS.map((l) => l.key))
    const exc = new Set(TMPS_EXCLUSIONS.map((l) => l.key))
    expect(inc.has('tmps_purchase_of_goods')).toBe(true)
    expect(inc.has('tmps_purchase_of_services')).toBe(true)
    expect(exc.has('tmps_employee_costs')).toBe(true)
    expect(exc.has('tmps_depreciation')).toBe(true)
    expect(exc.has('tmps_opening_inventory')).toBe(true)
    expect(inc.has('tmps_closing_inventory')).toBe(true)
    for (const k of inc) expect(exc.has(k)).toBe(false)
    expect(inc.size + exc.size).toBe(13)
  })
})
