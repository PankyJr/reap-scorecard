import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  EXPECTED_GENERIC_SHEET_COUNT,
  analyseGenericWorkbook,
  applyWorkbookImportDecisions,
  assertSafeWorkbookFile,
  defaultImportDecisions,
  matchExpectedSheet,
  type GenericWorkbookAnalysis,
} from '../index'
import { EMPTY_FINANCIAL_INPUTS } from '../../financial'
import { EMPTY_OWNERSHIP_INPUTS } from '../../elements/ownership'
import { EMPTY_MANAGEMENT_CONTROL_INPUTS } from '../../elements/management-control'
import { EMPTY_SKILLS_DEVELOPMENT_INPUTS } from '../../elements/skills-development'

const REFERENCE_PATH = join(
  process.cwd(),
  'tmp/full-scorecard-reference/Generic-Scorecard Calculator.xlsx',
)

function loadReference(): Buffer | null {
  try {
    return readFileSync(REFERENCE_PATH)
  } catch {
    return null
  }
}

describe('generic workbook sheet catalogue', () => {
  it('expects 22 worksheets', () => {
    expect(EXPECTED_GENERIC_SHEET_COUNT).toBe(22)
  })

  it('matches known misspellings and whitespace', () => {
    expect(matchExpectedSheet('4 Executive Committe ')?.key).toBe('executive_committee')
    expect(matchExpectedSheet('ED&SD')?.key).toBe('ed_sd')
    expect(matchExpectedSheet(' Yes Targets Calc')?.key).toBe('yes_targets_calc')
    expect(matchExpectedSheet('Procurement Scorecard')?.classification).toBe('ignored')
    expect(matchExpectedSheet('Full Scorecard')?.classification).toBe('ignored')
  })
})

describe('generic workbook analyse + apply', () => {
  const buffer = loadReference()
  const maybeIt = buffer ? it : it.skip
  let analysis: GenericWorkbookAnalysis | null = null

  maybeIt('accepts the reference Generic workbook and detects all 22 sheets', () => {
    assertSafeWorkbookFile({ filename: 'Generic-Scorecard Calculator.xlsx', size: buffer!.length })
    analysis = analyseGenericWorkbook({
      filename: 'Generic-Scorecard Calculator.xlsx',
      buffer: buffer!,
    })
    expect(analysis.detectedSheetCount).toBe(22)
    expect(analysis.recognisedSheetCount).toBe(22)
    expect(analysis.missingExpectedSheets).toEqual([])
    expect(analysis.checksumSha256).toHaveLength(64)
    expect(analysis.elements.find((e) => e.elementKey === 'preferential_procurement')?.willPopulate).toBe(
      false,
    )
    expect(analysis.workbookDefects.join(' ')).toMatch(/procurement/i)
    expect(analysis.workbookDefects.join(' ')).toMatch(/NPAT/i)
    expect(analysis.workbookDefects.join(' ')).toMatch(/Full Scorecard/i)
  }, 30_000)

  maybeIt('does not write until apply is called, and import refuses to overwrite existing data', () => {
    expect(analysis).toBeTruthy()
    const decisions = defaultImportDecisions(analysis!.elements)
    const blocked = applyWorkbookImportDecisions({
      analysis: analysis!,
      decisions: { ...decisions, ownership: 'import', financial: 'import' },
      warningsAccepted: true,
      existing: {
        financial: { ...EMPTY_FINANCIAL_INPUTS, actualNpat: 1 },
        ownership: { ...EMPTY_OWNERSHIP_INPUTS, netValuePercentage: 0.25 },
        managementControl: EMPTY_MANAGEMENT_CONTROL_INPUTS,
        skillsDevelopment: EMPTY_SKILLS_DEVELOPMENT_INPUTS,
        enterpriseDevelopmentRecords: [],
        supplierDevelopmentRecords: [],
        socioEconomicDevelopmentRecords: [],
      },
    })
    expect(blocked.ownership).toBeNull()
    expect(blocked.financial).toBeNull()

    const replaced = applyWorkbookImportDecisions({
      analysis: analysis!,
      decisions: { ...decisions, ownership: 'replace_existing', financial: 'replace_existing' },
      warningsAccepted: true,
      existing: {
        financial: { ...EMPTY_FINANCIAL_INPUTS, actualNpat: 1 },
        ownership: { ...EMPTY_OWNERSHIP_INPUTS, netValuePercentage: 0.25 },
        managementControl: EMPTY_MANAGEMENT_CONTROL_INPUTS,
        skillsDevelopment: EMPTY_SKILLS_DEVELOPMENT_INPUTS,
        enterpriseDevelopmentRecords: [],
        supplierDevelopmentRecords: [],
        socioEconomicDevelopmentRecords: [],
      },
    })
    expect(replaced.ownership).not.toBeNull()
    expect(replaced.ownership?.netValuePercentage).toBeCloseTo(0.25, 5)
  })

  maybeIt('keep_existing and merge_missing protect or fill gaps without silent overwrite', () => {
    expect(analysis).toBeTruthy()
    const decisions = defaultImportDecisions(analysis!.elements)

    const kept = applyWorkbookImportDecisions({
      analysis: analysis!,
      decisions: { ...decisions, ownership: 'keep_existing' },
      warningsAccepted: true,
      existing: {
        financial: EMPTY_FINANCIAL_INPUTS,
        ownership: { ...EMPTY_OWNERSHIP_INPUTS, netValuePercentage: 0.4 },
        managementControl: EMPTY_MANAGEMENT_CONTROL_INPUTS,
        skillsDevelopment: EMPTY_SKILLS_DEVELOPMENT_INPUTS,
        enterpriseDevelopmentRecords: [],
        supplierDevelopmentRecords: [],
        socioEconomicDevelopmentRecords: [],
      },
    })
    expect(kept.ownership).toBeNull()

    const merged = applyWorkbookImportDecisions({
      analysis: analysis!,
      decisions: { ...decisions, ownership: 'merge_missing' },
      warningsAccepted: true,
      existing: {
        financial: EMPTY_FINANCIAL_INPUTS,
        ownership: {
          ...EMPTY_OWNERSHIP_INPUTS,
          netValuePercentage: 0.4,
          blackVotingRightsPercentage: null,
        },
        managementControl: EMPTY_MANAGEMENT_CONTROL_INPUTS,
        skillsDevelopment: EMPTY_SKILLS_DEVELOPMENT_INPUTS,
        enterpriseDevelopmentRecords: [],
        supplierDevelopmentRecords: [],
        socioEconomicDevelopmentRecords: [],
      },
    })
    expect(merged.ownership?.netValuePercentage).toBe(0.4)
    expect(merged.ownership?.blackVotingRightsPercentage).toBeCloseTo(0.25, 5)
  })

  maybeIt('keeps ED and Supplier Development separate and never imports procurement scores', () => {
    expect(analysis).toBeTruthy()
    const ed = analysis!.elements.find((e) => e.elementKey === 'enterprise_development')
    const sd = analysis!.elements.find((e) => e.elementKey === 'supplier_development')
    const pp = analysis!.elements.find((e) => e.elementKey === 'preferential_procurement')
    expect(ed).toBeTruthy()
    expect(sd).toBeTruthy()
    expect(ed?.elementKey).not.toBe(sd?.elementKey)
    expect(sd?.elementKey).toBe('supplier_development')
    expect(pp?.willPopulate).toBe(false)
    expect(pp?.warnings.join(' ')).toMatch(/Formal Procurement Assessment/i)
    expect(defaultImportDecisions(analysis!.elements).preferential_procurement).toBe('skip')
  })

  maybeIt('populates Ownership and Management Control privacy-safe aggregates', () => {
    expect(analysis).toBeTruthy()
    const ownership = analysis!.elements.find((e) => e.elementKey === 'ownership')
    const mc = analysis!.elements.find((e) => e.elementKey === 'management_control')
    expect(ownership?.willPopulate).toBe(true)
    expect(ownership?.proposedOwnership?.blackVotingRightsPercentage).toBeCloseTo(0.25, 5)
    expect(JSON.stringify(mc?.summary)).not.toMatch(/idNumber|identity|surname/i)
    expect(mc?.warnings.join(' ')).toMatch(/Names and identity/i)
    expect(mc?.willPopulate).toBe(true)
  })

  maybeIt('ignores workbook NPAT target cells and cached score/level defects', () => {
    expect(analysis).toBeTruthy()
    const financial = analysis!.elements.find((e) => e.elementKey === 'financial')
    expect(financial?.proposedFinancial?.actualNpat).toBeNull()
    expect(analysis!.workbookDefects.join(' ')).toMatch(/ignored/i)
  })

  maybeIt('separates SED claimed raw from scoring inputs', () => {
    expect(analysis).toBeTruthy()
    const sed = analysis!.elements.find((e) => e.elementKey === 'socio_economic_development')
    expect(sed?.warnings.join(' ')).toMatch(/Claimed/i)
  })

  it('rejects oversized or non-xlsx files', () => {
    expect(() => assertSafeWorkbookFile({ filename: 'notes.csv', size: 10 })).toThrow(/xlsx/i)
    expect(() => assertSafeWorkbookFile({ filename: 'legacy.xls', size: 10 })).toThrow(/xlsx/i)
    expect(() => assertSafeWorkbookFile({ filename: 'big.xlsx', size: 9 * 1024 * 1024 })).toThrow(/8 MB/i)
  })
})
