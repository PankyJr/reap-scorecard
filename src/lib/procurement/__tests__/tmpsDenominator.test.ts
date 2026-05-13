import { describe, expect, it } from 'vitest'
import { computeProcurementScoringDenominator } from '../tmpsDenominator'

describe('computeProcurementScoringDenominator', () => {
  it('uses calculated pad total when source is calculated', () => {
    const r = computeProcurementScoringDenominator({
      source: 'calculated',
      tmpsInputs: { tmps_cost_of_sales: 1000 },
      tmpsCustomInclusions: [],
      tmpsCustomExclusions: [],
      tmpsManualAmount: undefined,
      suppliers: [{ value_ex_vat: 500 }],
    })
    expect(r.denominator).toBe(1000)
    expect(r.source).toBe('calculated')
  })

  it('uses manual amount when source is manual', () => {
    const r = computeProcurementScoringDenominator({
      source: 'manual',
      tmpsInputs: {},
      tmpsCustomInclusions: [],
      tmpsCustomExclusions: [],
      tmpsManualAmount: 250_000,
      suppliers: [],
    })
    expect(r.denominator).toBe(250_000)
    expect(r.source).toBe('manual')
  })

  it('sums supplier lines for import_supplier_total', () => {
    const r = computeProcurementScoringDenominator({
      source: 'import_supplier_total',
      tmpsInputs: {},
      tmpsCustomInclusions: [],
      tmpsCustomExclusions: [],
      tmpsManualAmount: undefined,
      suppliers: [{ value_ex_vat: 100 }, { value_ex_vat: 40 }],
    })
    expect(r.denominator).toBe(140)
    expect(r.source).toBe('import_supplier_total')
  })
})
