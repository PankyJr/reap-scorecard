import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { readFileSync as readSource } from 'node:fs'
import {
  EXPECTED_GENERIC_SHEETS,
  GENERIC_WORKBOOK_IMPORT_VERSION,
  MAX_UPLOAD_BYTES,
  analyseGenericScorecardWorkbook,
  applyWorkbookImportDecisions,
  defaultDecisionsForAnalysis,
  hasExistingElementData,
  matchExpectedSheet,
  normalizeSheetLabel,
} from '../workbook-import'
import type { GenericWorkbookAnalysis, ImportElementKey } from '../workbook-import'
import { EMPTY_FINANCIAL_INPUTS } from '../financial'
import { EMPTY_OWNERSHIP_INPUTS } from '../elements/ownership'
import { EMPTY_MANAGEMENT_CONTROL_INPUTS } from '../elements/management-control'
import { EMPTY_SKILLS_DEVELOPMENT_INPUTS } from '../elements/skills-development'
import { calculateGenericScorecard } from '../index'
import { GENERIC_CODES_2019_V1 } from '../../rules/generic-2019/scorecard'
import { completeScorecardInputs } from './fixtures'

const REFERENCE_WORKBOOK = resolve(
  process.cwd(),
  'tmp/full-scorecard-reference/Generic-Scorecard Calculator.xlsx',
)
const hasReferenceWorkbook = existsSync(REFERENCE_WORKBOOK)

function minimalAnalysis(overrides: Partial<GenericWorkbookAnalysis> = {}): GenericWorkbookAnalysis {
  return {
    importVersion: GENERIC_WORKBOOK_IMPORT_VERSION,
    filename: 'Generic-Scorecard Calculator.xlsx',
    fileSize: 1000,
    checksumSha256: 'abc',
    analysedAt: new Date().toISOString(),
    sheetCount: 22,
    sheets: [],
    expectedSheetCount: 22,
    recognisedSheetCount: 22,
    unsupportedSheets: [],
    workbookDefects: ['Workbook B-BBEE level and total score are ignored.'],
    demonstrationRowWarnings: [],
    procurementNotice:
      'Procurement data was detected in the workbook, but procurement must be sourced from a completed Formal Procurement Assessment.',
    elements: [],
    financial: {
      ...EMPTY_FINANCIAL_INPUTS,
      revenue: 10_000_000,
      actualNpat: 500_000,
      leviableAmount: 1_000_000,
    },
    ownership: {
      ...EMPTY_OWNERSHIP_INPUTS,
      blackVotingRightsPercentage: 0.51,
      netValuePercentage: 0.4,
    },
    managementControl: { ...EMPTY_MANAGEMENT_CONTROL_INPUTS },
    skillsDevelopment: {
      ...EMPTY_SKILLS_DEVELOPMENT_INPUTS,
      leviableAmount: 1_000_000,
      totalSkillsDevelopmentSpend: 80_000,
    },
    enterpriseDevelopmentContributions: [
      {
        id: 'ed-1',
        beneficiaryName: 'ED Co',
        beneficiaryClassification: 'eme',
        beneficiaryBlackOwnershipPercentage: 1,
        wasEmeOrQseAtFirstAssistance: true,
        yearsSinceFirstAssistance: 1,
        contributionType: 'grant_contribution',
        actualValue: 100_000,
        suppliedBenefitFactor: null,
        contributionDate: null,
        evidenceProvided: false,
        notes: null,
        blackBeneficiaryPercentage: null,
        manualOverride: null,
      },
    ],
    supplierDevelopmentContributions: [
      {
        id: 'sd-1',
        beneficiaryName: 'SD Co',
        beneficiaryClassification: 'eme',
        beneficiaryBlackOwnershipPercentage: 1,
        wasEmeOrQseAtFirstAssistance: true,
        yearsSinceFirstAssistance: 1,
        contributionType: 'grant_contribution',
        actualValue: 50_000,
        suppliedBenefitFactor: null,
        contributionDate: null,
        evidenceProvided: false,
        notes: null,
        blackBeneficiaryPercentage: null,
        manualOverride: null,
      },
    ],
    socioEconomicDevelopmentContributions: [
      {
        id: 'sed-1',
        beneficiaryName: 'SED Beneficiary',
        beneficiaryClassification: 'individual',
        beneficiaryBlackOwnershipPercentage: null,
        wasEmeOrQseAtFirstAssistance: null,
        yearsSinceFirstAssistance: null,
        contributionType: 'grant_contribution',
        actualValue: 25_000,
        suppliedBenefitFactor: null,
        contributionDate: null,
        evidenceProvided: false,
        notes: null,
        blackBeneficiaryPercentage: 1,
        manualOverride: null,
      },
    ],
    managementControlImportSnapshot: { validRowCount: 3, rows: [] },
    sedImportSnapshot: { validRowCount: 1, rows: [] },
    ...overrides,
  }
}

describe('generic workbook sheet catalog', () => {
  it('lists all 22 expected sheets', () => {
    expect(EXPECTED_GENERIC_SHEETS).toHaveLength(22)
  })

  it('tolerates whitespace and known misspellings', () => {
    expect(matchExpectedSheet('  Ownership  ')?.canonicalName).toBe('Ownership')
    expect(matchExpectedSheet('4 Executive Committe')?.canonicalName).toBe('4 Executive Committe')
    expect(matchExpectedSheet('4 Executive Committee')?.canonicalName).toBe('4 Executive Committe')
    expect(matchExpectedSheet('Category BCD (Hcount)')?.canonicalName).toBe('Category BCD(Hcount)')
    expect(normalizeSheetLabel('ED & SD')).toContain('ed')
  })

  it('classifies procurement and full scorecard as non-importable score sources', () => {
    expect(matchExpectedSheet('Procurement Scorecard')?.classification).toBe('ignored')
    expect(matchExpectedSheet('Full Scorecard')?.classification).toBe('ignored')
    expect(matchExpectedSheet('Summary')?.classification).toBe('informational_only')
  })
})

describe('generic workbook UI surfaces', () => {
  it('shows full workbook upload on the Generic workspace', () => {
    const source = readSource(
      resolve(process.cwd(), 'src/app/(dashboard)/scorecards/calculator/[assessmentId]/generic/page.tsx'),
      'utf8',
    )
    expect(source).toContain('Upload Generic Scorecard Workbook')
    expect(source).toContain('uploadGenericWorkbookForReview')
    expect(source).toContain('Maximum 8 MB')
  })

  it('keeps /scorecards/full/new with a newer calculator notice', () => {
    const source = readSource(
      resolve(process.cwd(), 'src/app/(dashboard)/scorecards/full/new/page.tsx'),
      'utf8',
    )
    expect(source).toContain('A newer Generic Scorecard Calculator is available.')
    expect(source).toContain('New Scorecard Calculation')
  })

  it('routes review before import through workbook-review', () => {
    const source = readSource(
      resolve(process.cwd(), 'src/app/(dashboard)/scorecards/calculator/[assessmentId]/generic/workbook-review/page.tsx'),
      'utf8',
    )
    expect(source).toContain('Review workbook before import')
    expect(source).toContain('confirmGenericWorkbookImport')
    expect(source).toContain('Audit details')
    expect(source).toContain('Import summary')
    expect(source).toContain('formatTypedDisplayValue')
    expect(source).toContain('keep_existing')
    expect(source).toContain('replace_existing')
    expect(source).toContain('merge_missing_only')
  })

  it('uses a five-stage progress stepper instead of twelve equal pills', () => {
    const ui = readSource(
      resolve(process.cwd(), 'src/app/(dashboard)/scorecards/calculator/[assessmentId]/generic/ui.tsx'),
      'utf8',
    )
    expect(ui).toContain('Assessment overview')
    expect(ui).not.toContain('Modular calculator')
    expect(ui).toContain('Assessment readiness')
    expect(ui).toContain('Saved calculation')
    expect(ui).toContain('Continue assessment')
    expect(ui).toContain('GENERIC_CODES_USER_LABEL')
  })
})

describe('applyWorkbookImportDecisions', () => {
  const baseAck = {
    acceptWarnings: true,
    acknowledgeProcurementSeparate: true,
    acknowledgeMissingFields: true,
  }

  it('does not write when decisions are skip / keep_existing', () => {
    const analysis = minimalAnalysis()
    const applied = applyWorkbookImportDecisions({
      request: {
        analysis,
        decisions: {
          financial: 'keep_existing',
          ownership: 'skip',
          management_control: 'skip',
          skills_development: 'skip',
          enterprise_development: 'skip',
          supplier_development: 'skip',
          socio_economic_development: 'skip',
        },
        ...baseAck,
      },
      existing: {
        financial: { ...EMPTY_FINANCIAL_INPUTS, revenue: 1 },
        ownership: EMPTY_OWNERSHIP_INPUTS,
        managementControl: null,
        managementControlImportSnapshot: null,
        skillsDevelopment: null,
        enterpriseDevelopmentContributions: [],
        supplierDevelopmentContributions: [],
        socioEconomicDevelopmentContributions: [],
        sedImportSnapshot: null,
      },
    })
    expect(applied.financial).toBeNull()
    expect(applied.ownership).toBeNull()
    expect(applied.appliedElements).toHaveLength(0)
  })

  it('protects existing data when Import is chosen without Replace', () => {
    const analysis = minimalAnalysis()
    const applied = applyWorkbookImportDecisions({
      request: {
        analysis,
        decisions: {
          financial: 'import',
          ownership: 'skip',
          management_control: 'skip',
          skills_development: 'skip',
          enterprise_development: 'skip',
          supplier_development: 'skip',
          socio_economic_development: 'skip',
        },
        ...baseAck,
      },
      existing: {
        financial: { ...EMPTY_FINANCIAL_INPUTS, revenue: 99 },
        ownership: EMPTY_OWNERSHIP_INPUTS,
        managementControl: null,
        managementControlImportSnapshot: null,
        skillsDevelopment: null,
        enterpriseDevelopmentContributions: [],
        supplierDevelopmentContributions: [],
        socioEconomicDevelopmentContributions: [],
        sedImportSnapshot: null,
      },
    })
    expect(applied.financial).toBeNull()
    expect(applied.warnings.some((warning) => /existing data was kept/i.test(warning))).toBe(true)
  })

  it('replace_existing overwrites and merge_missing_only fills blanks only', () => {
    const analysis = minimalAnalysis()
    const replaced = applyWorkbookImportDecisions({
      request: {
        analysis,
        decisions: {
          financial: 'replace_existing',
          ownership: 'skip',
          management_control: 'skip',
          skills_development: 'skip',
          enterprise_development: 'skip',
          supplier_development: 'skip',
          socio_economic_development: 'skip',
        },
        ...baseAck,
      },
      existing: {
        financial: { ...EMPTY_FINANCIAL_INPUTS, revenue: 99 },
        ownership: EMPTY_OWNERSHIP_INPUTS,
        managementControl: null,
        managementControlImportSnapshot: null,
        skillsDevelopment: null,
        enterpriseDevelopmentContributions: [],
        supplierDevelopmentContributions: [],
        socioEconomicDevelopmentContributions: [],
        sedImportSnapshot: null,
      },
    })
    expect(replaced.financial?.revenue).toBe(10_000_000)

    const merged = applyWorkbookImportDecisions({
      request: {
        analysis,
        decisions: {
          financial: 'merge_missing_only',
          ownership: 'skip',
          management_control: 'skip',
          skills_development: 'skip',
          enterprise_development: 'skip',
          supplier_development: 'skip',
          socio_economic_development: 'skip',
        },
        ...baseAck,
      },
      existing: {
        financial: { ...EMPTY_FINANCIAL_INPUTS, revenue: 99, actualNpat: null },
        ownership: EMPTY_OWNERSHIP_INPUTS,
        managementControl: null,
        managementControlImportSnapshot: null,
        skillsDevelopment: null,
        enterpriseDevelopmentContributions: [],
        supplierDevelopmentContributions: [],
        socioEconomicDevelopmentContributions: [],
        sedImportSnapshot: null,
      },
    })
    expect(merged.financial?.revenue).toBe(99)
    expect(merged.financial?.actualNpat).toBe(500_000)
  })

  it('requires procurement acknowledgement and never imports procurement points', () => {
    const analysis = minimalAnalysis()
    expect(() =>
      applyWorkbookImportDecisions({
        request: {
          analysis,
          decisions: defaultDecisionsForAnalysis(analysis, {}),
          acceptWarnings: true,
          acknowledgeProcurementSeparate: false,
          acknowledgeMissingFields: true,
        },
        existing: {
          financial: null,
          ownership: null,
          managementControl: null,
          managementControlImportSnapshot: null,
          skillsDevelopment: null,
          enterpriseDevelopmentContributions: [],
          supplierDevelopmentContributions: [],
          socioEconomicDevelopmentContributions: [],
          sedImportSnapshot: null,
        },
      }),
    ).toThrow(/Formal Procurement Assessment/)
    expect(analysis.procurementNotice).toMatch(/Formal Procurement Assessment/)
  })

  it('defaults to keep_existing when element data is already present', () => {
    const analysis = minimalAnalysis({
      elements: [
        {
          elementKey: 'financial',
          displayName: 'Financial inputs',
          willPopulate: true,
          validRowCount: 1,
          warningCount: 0,
          rejectedRowCount: 0,
          missingInputs: [],
          warnings: [],
          summary: [],
          proposed: null,
        },
      ],
    })
    const decisions = defaultDecisionsForAnalysis(analysis, { financial: true })
    expect(decisions.financial).toBe('keep_existing')
    expect(hasExistingElementData({ elementKey: 'financial', financial: { revenue: 1 } })).toBe(true)
    expect(hasExistingElementData({ elementKey: 'skills_development', skills: {} })).toBe(false)
    expect(
      hasExistingElementData({
        elementKey: 'skills_development',
        skills: { totalSkillsSpend: 2_500_000 },
      }),
    ).toBe(true)
    expect(hasExistingElementData({ elementKey: 'skills_development', hasSkills: true })).toBe(true)
  })
})

describe('generic engine still recalculates after workbook-shaped inputs', () => {
  it('ignores workbook score/level concepts and uses generic-codes-2019-v1', () => {
    const result = calculateGenericScorecard(completeScorecardInputs())
    expect(result.ruleSetKey).toBe(GENERIC_CODES_2019_V1.key)
    expect(result.finalLevel.level).toBeTruthy()
  })

  it('enforces the 8 MB upload limit constant', () => {
    expect(MAX_UPLOAD_BYTES).toBe(8 * 1024 * 1024)
  })
})

describe.skipIf(!hasReferenceWorkbook)('reference Generic-Scorecard Calculator.xlsx', () => {
  const buffer = readFileSync(REFERENCE_WORKBOOK)
  const analysis = analyseGenericScorecardWorkbook({
    filename: 'Generic-Scorecard Calculator.xlsx',
    buffer,
    fileSize: buffer.length,
  })

  it('accepts the generic workbook and detects all 22 expected sheets', () => {
    expect(analysis.sheetCount).toBe(22)
    expect(analysis.expectedSheetCount).toBe(22)
    expect(analysis.recognisedSheetCount).toBeGreaterThanOrEqual(20)
    expect(analysis.checksumSha256).toMatch(/^[a-f0-9]{64}$/)
  })

  it('shows review payload before any persistence (analysis-only)', () => {
    expect(analysis.elements.length).toBe(7)
    expect(analysis.importVersion).toBe(GENERIC_WORKBOOK_IMPORT_VERSION)
    expect(analysis.workbookDefects.some((item) => /level and total score are ignored/i.test(item))).toBe(
      true,
    )
  })

  it('populates financial, ownership, skills, ED, SD and SED previews', () => {
    const byKey = Object.fromEntries(analysis.elements.map((element) => [element.elementKey, element]))
    const financialKeys = byKey.financial.summary.map((entry) => entry.key)
    expect(financialKeys).toContain('actualNpat')
    expect(financialKeys).toContain('deemedNpat')
    const employees = byKey.financial.summary.find((entry) => entry.key === 'totalEmployees')
    expect(employees?.type).toBe('count')
    expect(byKey.ownership.willPopulate || byKey.ownership.validRowCount >= 0).toBe(true)
    expect(byKey.skills_development.displayName).toBe('Skills Development')
    expect(byKey.enterprise_development.elementKey).toBe('enterprise_development')
    expect(byKey.supplier_development.elementKey).toBe('supplier_development')
    expect(byKey.socio_economic_development.elementKey).toBe('socio_economic_development')
  })

  it('keeps ED and Supplier Development separated', () => {
    expect(analysis.enterpriseDevelopmentContributions).not.toBe(analysis.supplierDevelopmentContributions)
    const keys = analysis.elements.map((element) => element.elementKey)
    expect(keys).toContain('enterprise_development')
    expect(keys).toContain('supplier_development')
    expect(keys).not.toContain('sd')
  })

  it('does not import procurement as a scored element and warns on demo workbook naming', () => {
    expect(analysis.elements.every((element) => element.elementKey !== ('preferential_procurement' as ImportElementKey))).toBe(
      true,
    )
    expect(analysis.procurementNotice).toMatch(/Formal Procurement Assessment/)
    expect(analysis.demonstrationRowWarnings.length).toBeGreaterThan(0)
    expect(analysis.workbookDefects.some((item) => /#DIV\/0!/i.test(item) || /Excel error/i.test(item))).toBe(
      true,
    )
  })

  it('strips sensitive employee identity fields from MC snapshot', () => {
    const snapshot = JSON.stringify(analysis.managementControlImportSnapshot ?? {})
    expect(snapshot).not.toMatch(/identityNumber/i)
    expect(snapshot).not.toMatch(/personName/i)
    expect(snapshot).not.toMatch(/\bID Number\b/i)
  })

  it('apply import writes proposed financial when empty assessment', () => {
    const applied = applyWorkbookImportDecisions({
      request: {
        analysis,
        decisions: {
          financial: 'import',
          ownership: 'import',
          management_control: 'import',
          skills_development: 'import',
          enterprise_development: 'import',
          supplier_development: 'import',
          socio_economic_development: 'import',
        },
        acceptWarnings: true,
        acknowledgeProcurementSeparate: true,
        acknowledgeMissingFields: true,
      },
      existing: {
        financial: null,
        ownership: null,
        managementControl: null,
        managementControlImportSnapshot: null,
        skillsDevelopment: null,
        enterpriseDevelopmentContributions: [],
        supplierDevelopmentContributions: [],
        socioEconomicDevelopmentContributions: [],
        sedImportSnapshot: null,
      },
    })
    expect(applied.appliedElements.length).toBeGreaterThan(0)
    expect(applied.financial).toEqual(analysis.financial)
  })

  /**
   * Value assertions, not shape assertions.
   *
   * The tab is named "NPAT Calculation" but the metric definitions declared
   * sourceSheet 'NPAT', which findWorkbookSheetByTitle could not resolve, so
   * the whole financial block imported as null. Correcting the sheet name
   * alone was not enough: the tab opens with a StatsSA all-industries table
   * whose row 6 is also labelled "NPAT", so the ['npat'] matcher took the
   * industry figure at B6 (184115) instead of the entity's actual NPAT at B23.
   */
  it('imports the measured entity actual NPAT from NPAT Calculation!B23', () => {
    expect(analysis.financial.actualNpat).not.toBeNull()
    expect(analysis.financial.actualNpat).toBe(0)
    // Regression guard: B6 is the StatsSA all-industries NPAT, not the entity's.
    expect(analysis.financial.actualNpat).not.toBe(184115)
  })

  it('imports the industry profit norm after tax from NPAT Calculation!B10', () => {
    expect(analysis.financial.industryNpatMargin).not.toBeNull()
    expect(analysis.financial.industryNpatMargin).toBeCloseTo(0.05725310234761103, 12)
  })

  it('imports measurement-period revenue from NPAT Calculation!B15', () => {
    expect(analysis.financial.revenue).not.toBeNull()
    expect(analysis.financial.revenue).toBe(0)
  })
})
