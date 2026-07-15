import { describe, expect, it } from 'vitest'
import {
  calculateAberdareScenario,
  classifyImportFlag,
  normaliseAccredLevel,
  normaliseCategoricalPlaceholder,
  parseAberdareSpendReportFromRows,
  parseMultiplierPercent,
} from '@/lib/clients/aberdare'
import { buildSyntheticAberdareAoA } from './fixtures/syntheticAberdareRows'

describe('Aberdare spend report adapter', () => {
  it('parses the synthetic workbook structure successfully', () => {
    const result = parseAberdareSpendReportFromRows(
      buildSyntheticAberdareAoA(),
      'synthetic.xlsx',
    )
    expect(result.suppliers.length).toBe(5)
    expect(result.totalsRow).not.toBeNull()
    expect(result.reportingEntities).toContain('ABFI')
  })

  it('excludes the aggregate totals row from suppliers', () => {
    const result = parseAberdareSpendReportFromRows(
      buildSyntheticAberdareAoA(),
      'synthetic.xlsx',
    )
    expect(
      result.suppliers.some(
        (s) => !s.vendorName || s.vendorName === '6' || s.vendorCode === '6',
      ),
    ).toBe(false)
    expect(result.totalsRow?.amountExVat).toBe(
      result.reconciliation.sourceSpendTotal,
    )
  })

  it('preserves Level 6 as a valid accreditation level', () => {
    const accred = normaliseAccredLevel('6')
    expect(accred.level).toBe('6')
    expect(accred.complianceStatus).toBe('compliant')

    const result = parseAberdareSpendReportFromRows(
      buildSyntheticAberdareAoA({ includeLevelSix: true }),
      'synthetic.xlsx',
    )
    const levelSix = result.suppliers.find((s) => s.vendorCode === 'V300')
    expect(levelSix?.level).toBe('6')
    expect(levelSix?.complianceStatus).toBe('compliant')
  })

  it('maps nc to Non-Compliant', () => {
    const accred = normaliseAccredLevel(' nc ')
    expect(accred.level).toBe('Non-Compliant')
    expect(accred.complianceStatus).toBe('non-compliant')
  })

  it('treats placeholder 6 in non-level fields as unknown', () => {
    const spendExempt = normaliseCategoricalPlaceholder('6')
    expect(spendExempt.normalised).toBe('unknown')
    const certificate = normaliseCategoricalPlaceholder(6)
    expect(certificate.normalised).toBe('unknown')

    const result = parseAberdareSpendReportFromRows(
      buildSyntheticAberdareAoA({ includePlaceholderSix: true }),
      'synthetic.xlsx',
    )
    const row = result.suppliers.find((s) => s.vendorCode === 'V300')!
    expect(row.spendExemptNormalised).toBe('unknown')
    expect(row.placeholderUnknownFields.length).toBeGreaterThan(0)
  })

  it('classifies Import Y / N / blank correctly', () => {
    expect(classifyImportFlag('Y').classification).toBe('imported')
    expect(classifyImportFlag('N').classification).toBe('local')
    expect(classifyImportFlag('').classification).toBe(
      'not_explicitly_imported',
    )
    expect(classifyImportFlag(6).classification).toBe(
      'not_explicitly_imported',
    )
  })

  it('parses percentage multipliers correctly', () => {
    expect(parseMultiplierPercent('135%').percent).toBe(135)
    expect(parseMultiplierPercent('100%').percent).toBe(100)
    expect(parseMultiplierPercent('60%').percent).toBe(60)
    expect(parseMultiplierPercent('0').percent).toBe(0)
  })

  it('preserves negative spend values', () => {
    const result = parseAberdareSpendReportFromRows(
      buildSyntheticAberdareAoA(),
      'synthetic.xlsx',
    )
    const credit = result.suppliers.find((s) => s.vendorCode === 'V400')!
    expect(credit.amountExVat).toBe(-12_000)
    expect(result.reconciliation.negativeSpendRows).toBe(1)
  })

  it('keeps baseline immutable while scenario overrides change projection', () => {
    const result = parseAberdareSpendReportFromRows(
      buildSyntheticAberdareAoA(),
      'synthetic.xlsx',
    )
    const snapshot = structuredClone(result.suppliers)
    const target = result.suppliers.find((s) => s.level === '1')!

    const comparison = calculateAberdareScenario(
      result.suppliers,
      {
        [target.id]: {
          compliance_status: 'non-compliant',
          level: 'Non-Compliant',
        },
      },
      'Test',
    )

    expect(result.suppliers).toEqual(snapshot)
    expect(comparison.actual.totalScore).toBeGreaterThan(
      comparison.scenario.totalScore,
    )
    expect(comparison.modifiedSupplierCount).toBe(1)
  })

  it('excludes Import=Y rows from provisional scoring spend', () => {
    const result = parseAberdareSpendReportFromRows(
      buildSyntheticAberdareAoA(),
      'synthetic.xlsx',
    )
    const comparison = calculateAberdareScenario(
      result.suppliers,
      {},
      'Test',
    )
    const imported = result.suppliers.find((s) => s.vendorCode === 'V200')!
    expect(comparison.actual.importedSpend).toBe(imported.amountExVat)

    // Existing platform TMPS helper sums non-negative active rows only.
    const expectedTmps = result.suppliers
      .filter((s) => !s.simulator.is_imported && s.amountExVat >= 0)
      .reduce((sum, s) => sum + s.amountExVat, 0)
    expect(comparison.actual.totalMeasuredSpend).toBe(expectedTmps)
    expect(comparison.actual.totalMeasuredSpend).toBeLessThan(
      result.reconciliation.sourceSpendTotal,
    )
  })

  it('reset restores the actual position', () => {
    const result = parseAberdareSpendReportFromRows(
      buildSyntheticAberdareAoA(),
      'synthetic.xlsx',
    )
    const target = result.suppliers[0]!
    const changed = calculateAberdareScenario(
      result.suppliers,
      { [target.id]: { level: '8' } },
      'Test',
    )
    const reset = calculateAberdareScenario(result.suppliers, {}, 'Test')
    expect(reset.scenario.totalScore).toBe(reset.actual.totalScore)
    expect(changed.scenario.totalScore).not.toBe(changed.actual.totalScore)
  })

  it('reapplying an override does not duplicate a supplier', () => {
    const result = parseAberdareSpendReportFromRows(
      buildSyntheticAberdareAoA(),
      'synthetic.xlsx',
    )
    const target = result.suppliers[0]!
    const overrides = {
      [target.id]: { level: '4' as const },
    }
    const once = calculateAberdareScenario(result.suppliers, overrides, 'Test')
    const twice = calculateAberdareScenario(result.suppliers, overrides, 'Test')
    expect(once.scenario.supplierCount).toBe(result.suppliers.length)
    expect(twice.scenario.supplierCount).toBe(result.suppliers.length)
    expect(once.modifiedSupplierCount).toBe(1)
  })

  it('supports search by vendor name and vendor code', () => {
    const result = parseAberdareSpendReportFromRows(
      buildSyntheticAberdareAoA(),
      'synthetic.xlsx',
    )
    const byName = result.suppliers.filter((s) =>
      s.vendorName.toLowerCase().includes('alpha'),
    )
    const byCode = result.suppliers.filter((s) => s.vendorCode.includes('V200'))
    expect(byName).toHaveLength(1)
    expect(byCode).toHaveLength(1)
  })

  it('reclassifying an imported supplier as local includes it in scenario TMPS', () => {
    const result = parseAberdareSpendReportFromRows(
      buildSyntheticAberdareAoA(),
      'synthetic.xlsx',
    )
    const imported = result.suppliers.find((s) => s.vendorCode === 'V200')!
    const baseline = calculateAberdareScenario(result.suppliers, {}, 'Test')
    const scenario = calculateAberdareScenario(
      result.suppliers,
      { [imported.id]: { is_imported: false } },
      'Test',
    )
    expect(scenario.scenario.totalMeasuredSpend).toBeGreaterThan(
      baseline.actual.totalMeasuredSpend,
    )
  })

  it('undo restores the previous scenario state conceptually via prior overrides', () => {
    const result = parseAberdareSpendReportFromRows(
      buildSyntheticAberdareAoA(),
      'synthetic.xlsx',
    )
    const target = result.suppliers.find((s) => s.vendorCode === 'V100')!
    const secondTarget = result.suppliers.find((s) => s.vendorCode === 'V500')!
    const first = { [target.id]: { level: '8' } }
    const second = {
      [target.id]: { level: '8' },
      [secondTarget.id]: { compliance_status: 'non-compliant' as const, level: 'Non-Compliant' },
    }
    const afterSecond = calculateAberdareScenario(
      result.suppliers,
      second,
      'Test',
    )
    const afterUndo = calculateAberdareScenario(result.suppliers, first, 'Test')
    expect(afterSecond.modifiedSupplierCount).toBe(2)
    expect(afterUndo.modifiedSupplierCount).toBe(1)
    expect(afterUndo.scenario.totalScore).toBeGreaterThan(
      afterSecond.scenario.totalScore,
    )
  })

  it('calculates a large supplier set quickly for demo readiness', () => {
    const header = buildSyntheticAberdareAoA()[0]!
    const rows: unknown[][] = [header]
    for (let i = 0; i < 940; i++) {
      rows.push([
        'ABFI',
        i % 9 === 0 ? 'nc' : String((i % 8) + 1),
        `C${i}`,
        `Supplier ${i}`,
        10_000 + i,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        '',
        0,
        '',
        0,
        '',
        0,
        '',
        i % 40 === 0 ? 'Y' : '',
        i % 40 === 0 ? 1000 : 0,
        '',
        0,
        0,
        0,
        '',
        '',
        '',
        '100%',
        0,
        'ZNA',
        'Payable 30 days',
      ])
    }
    const started = performance.now()
    const parsed = parseAberdareSpendReportFromRows(rows, 'perf.xlsx')
    const comparison = calculateAberdareScenario(
      parsed.suppliers,
      { [parsed.suppliers[0]!.id]: { level: 'Non-Compliant' } },
      'Perf',
    )
    const elapsed = performance.now() - started
    expect(parsed.suppliers.length).toBe(940)
    expect(comparison.modifiedSupplierCount).toBe(1)
    expect(elapsed).toBeLessThan(1500)
  })
})
