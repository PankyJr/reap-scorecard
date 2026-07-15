import { describe, expect, it } from 'vitest'
import { calculateSupplierRow, getRecognitionPercent } from '@/lib/procurement/rows'
import { applyScenarioOverrides } from '../applyScenarioOverrides'
import { calculateProcurementPosition } from '../calculateProcurementPosition'
import { generateMbekiSimulatorSuppliers } from '../sampleData'
import type { SimulatorSupplier, SupplierScenarioOverride } from '../types'

function featuredSuppliers(): SimulatorSupplier[] {
  return generateMbekiSimulatorSuppliers(12)
}

describe('procurement simulator', () => {
  it('never mutates baseline suppliers when applying scenario overrides', () => {
    const baseline = featuredSuppliers()
    const snapshot = structuredClone(baseline)
    const overrides: Record<string, SupplierScenarioOverride> = {
      [baseline[0]!.id]: { level: 'Non-Compliant', value_ex_vat: 1 },
    }

    applyScenarioOverrides(baseline, overrides)

    expect(baseline).toEqual(snapshot)
  })

  it('applies overrides only to the scenario copy', () => {
    const baseline = featuredSuppliers()
    const target = baseline[0]!
    const overrides = { [target.id]: { level: '8', value_ex_vat: 500_000 } }

    const { scenarioSuppliers } = applyScenarioOverrides(baseline, overrides)
    const scenarioRow = scenarioSuppliers.find((s) => s.id === target.id)!

    expect(scenarioRow.level).toBe('8')
    expect(scenarioRow.value_ex_vat).toBe(500_000)
    expect(baseline.find((s) => s.id === target.id)!.level).toBe(target.level)
    expect(baseline.find((s) => s.id === target.id)!.value_ex_vat).toBe(
      target.value_ex_vat,
    )
  })

  it('reset restores baseline values via empty overrides', () => {
    const baseline = featuredSuppliers()
    const target = baseline[0]!
    const withChange = calculateProcurementPosition({
      baselineSuppliers: baseline,
      scenarioOverrides: {
        [target.id]: { compliance_status: 'non-compliant' },
      },
      reportingPeriod: 'Test',
    })
    const reset = calculateProcurementPosition({
      baselineSuppliers: baseline,
      scenarioOverrides: {},
      reportingPeriod: 'Test',
    })

    expect(reset.scenario.totalScore).toBe(reset.actual.totalScore)
    expect(withChange.scenario.totalScore).toBeLessThan(withChange.actual.totalScore)
  })

  it('counts modified suppliers accurately', () => {
    const baseline = featuredSuppliers()
    const comparison = calculateProcurementPosition({
      baselineSuppliers: baseline,
      scenarioOverrides: {
        [baseline[0]!.id]: { level: '2' },
        [baseline[1]!.id]: { excluded: true },
      },
      reportingPeriod: 'Test',
    })

    expect(comparison.modifiedSupplierCount).toBe(2)
  })

  it('treats non-compliant scenario changes with zero recognition', () => {
    const baseline = featuredSuppliers()
    const highSpend = baseline.find((s) => s.level === '1')!
    const actual = calculateProcurementPosition({
      baselineSuppliers: baseline,
      scenarioOverrides: {},
      reportingPeriod: 'Test',
    })
    const scenario = calculateProcurementPosition({
      baselineSuppliers: baseline,
      scenarioOverrides: {
        [highSpend.id]: { compliance_status: 'non-compliant' },
      },
      reportingPeriod: 'Test',
    })

    expect(scenario.scenario.totalScore).toBeLessThan(actual.actual.totalScore)
  })

  it('recalculates when B-BBEE level changes using existing mappings', () => {
    expect(getRecognitionPercent('1')).toBe(1.35)
    expect(getRecognitionPercent('8')).toBe(0.1)

    const baseline = featuredSuppliers()
    const target = baseline.find((s) => s.compliance_status === 'compliant')!
    const level1Row = calculateSupplierRow({
      supplier_name: target.supplier_name,
      supplier_type: target.supplier_type,
      level: '1',
      value_ex_vat: target.value_ex_vat,
      is_51_black_owned: target.is_51_black_owned,
      is_30_black_women_owned: target.is_30_black_women_owned,
      is_51_bdgs: target.is_51_bdgs,
    })
    const level8Row = calculateSupplierRow({
      supplier_name: target.supplier_name,
      supplier_type: target.supplier_type,
      level: '8',
      value_ex_vat: target.value_ex_vat,
      is_51_black_owned: target.is_51_black_owned,
      is_30_black_women_owned: target.is_30_black_women_owned,
      is_51_bdgs: target.is_51_bdgs,
    })

    expect(level1Row.bbbee_spend).toBeGreaterThan(level8Row.bbbee_spend)

    const { scenarioSuppliers } = applyScenarioOverrides(baseline, {
      [target.id]: { level: '1', compliance_status: 'compliant' },
    })
    const scenarioRow = scenarioSuppliers.find((s) => s.id === target.id)!
    expect(scenarioRow.level).toBe('1')
  })

  it('does not duplicate supplier records when overrides are re-applied', () => {
    const baseline = featuredSuppliers()
    const target = baseline[2]!
    let overrides: Record<string, SupplierScenarioOverride> = {
      [target.id]: { level: '2' },
    }
    let { scenarioSuppliers } = applyScenarioOverrides(baseline, overrides)
    expect(scenarioSuppliers).toHaveLength(baseline.length)

    overrides = { [target.id]: { level: '3', value_ex_vat: 1000 } }
    ;({ scenarioSuppliers } = applyScenarioOverrides(baseline, overrides))
    expect(scenarioSuppliers).toHaveLength(baseline.length)
    expect(scenarioSuppliers.filter((s) => s.id === target.id)).toHaveLength(1)
  })

  it('excludes suppliers from scenario totals when marked excluded', () => {
    const baseline = featuredSuppliers()
    const target = baseline[0]!
    const normal = calculateProcurementPosition({
      baselineSuppliers: baseline,
      scenarioOverrides: {},
      reportingPeriod: 'Test',
    })
    const excluded = calculateProcurementPosition({
      baselineSuppliers: baseline,
      scenarioOverrides: { [target.id]: { excluded: true } },
      reportingPeriod: 'Test',
    })

    expect(excluded.scenario.activeSupplierCount).toBe(
      normal.actual.activeSupplierCount - 1,
    )
    expect(excluded.scenario.totalMeasuredSpend).toBeLessThan(
      normal.actual.totalMeasuredSpend,
    )
  })

  it('handles approximately 900 suppliers within performance budget', () => {
    const baseline = generateMbekiSimulatorSuppliers(900)
    const start = performance.now()
    const result = calculateProcurementPosition({
      baselineSuppliers: baseline,
      scenarioOverrides: {
        [baseline[0]!.id]: { level: 'Non-Compliant' },
        [baseline[50]!.id]: { value_ex_vat: 0 },
      },
      reportingPeriod: 'Test',
    })
    const elapsed = performance.now() - start

    expect(baseline).toHaveLength(900)
    expect(result.actual.supplierCount).toBe(900)
    expect(elapsed).toBeLessThan(500)
  })

  it('filters suppliers by search criteria in consumer logic', () => {
    const baseline = featuredSuppliers()
    const q = 'Thabo'
    const matches = baseline.filter((s) =>
      `${s.supplier_name} ${s.supplier_code}`.toLowerCase().includes(q.toLowerCase()),
    )
    expect(matches.length).toBeGreaterThan(0)
    expect(matches[0]!.supplier_name).toContain('Thabo')
  })
})
