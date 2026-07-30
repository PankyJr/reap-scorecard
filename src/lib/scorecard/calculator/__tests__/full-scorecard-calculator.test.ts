import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as XLSX from 'xlsx'
import { describe, expect, it } from 'vitest'
import { importSedBeneficiaryWorkbook, sumValidRecognisedAmount } from '../elements/socio-economic-development/import'
import { socioEconomicDevelopmentAdapter } from '../elements/socio-economic-development/adapter'
import { calculateSedBeneficiaryScore } from '../rules/sed-beneficiary-v1'
import { resolveSelectedElements, describeAssessmentScope } from '../assessment/scope'
import { validateEapTargetMatrix, expectedEapCells } from '../eap/demographics'
import { getScorecardElementAdapter, listScorecardElementAdapters } from '../elements/registry'

function buildSedWorkbook(rows: unknown[][]): Buffer {
  const wb = XLSX.utils.book_new()
  const sheet = XLSX.utils.aoa_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, sheet, 'SED')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

const baseTemplate = (): unknown[][] => [
  ['Socio Economic Development'],
  ['Qualifying Beneficiaries', 'Claimed', 'Recognised Amount', 'Notes'],
  ['Beneficiary Alpha', null, 140000, 'Grant A'],
  ['Beneficiary Beta', null, 140000, null],
  ['Beneficiary Gamma', 'yes', 140000, 'Community project'],
  [null, null, null, null],
  [null, null, null, null],
  [null, null, null, null],
  [null, null, null, null],
  [null, null, null, null],
  [null, null, null, null],
  [null, null, null, null],
  [null, null, null, null],
  [null, null, null, null],
  [null, null, null, null],
  [null, null, null, null],
  [null, null, null, null],
  ['Total', null, 420000, null],
]

describe('SED beneficiary importer', () => {
  it('detects SED sheet, row-2 headers, imports 3 rows, ignores blanks and Total, recalculates R420000', () => {
    const fixturePath = join(__dirname, '../fixtures/sed-beneficiaries-synthetic.xlsx')
    const buffer = readFileSync(fixturePath)
    const preview = importSedBeneficiaryWorkbook({ workbookBuffer: buffer })

    expect(preview.sheetName).toBe('SED')
    expect(preview.detectedHeaders.beneficiary.toLowerCase()).toContain('qualifying')
    expect(preview.detectedHeaders.recognisedAmount.toLowerCase()).toContain('recognised')
    expect(preview.validRowCount).toBe(3)
    expect(preview.platformTotalRecognised).toBe(420000)
    expect(preview.workbookDisplayedTotal).toBe(420000)
    expect(preview.totalsMatch).toBe(true)
    expect(preview.rows.every((r) => r.sourceRowNumber >= 3)).toBe(true)
    expect(preview.rows.find((r) => String(r.values.beneficiary).toLowerCase() === 'total')).toBeUndefined()
  })

  it('does not trust workbook total when it disagrees with rows', () => {
    const rows = baseTemplate()
    rows[17] = ['Total', null, 999999, null]
    const preview = importSedBeneficiaryWorkbook({ workbookBuffer: buildSedWorkbook(rows) })
    expect(preview.platformTotalRecognised).toBe(420000)
    expect(preview.workbookDisplayedTotal).toBe(999999)
    expect(preview.totalsMatch).toBe(false)
  })

  it('supports extra rows beyond 17 and blank rows between records', () => {
    const rows = [
      ['Socio Economic Development'],
      ['Qualifying Beneficiaries', 'Claimed', 'Recognised Amount', 'Notes'],
      ['One', null, 100, null],
      [null, null, null, null],
      ['Two', null, 200, 'note'],
      ...Array.from({ length: 20 }, () => [null, null, null, null]),
      ['Three', null, 300, null],
      ['Total', null, 600, null],
    ]
    const preview = importSedBeneficiaryWorkbook({ workbookBuffer: buildSedWorkbook(rows) })
    expect(preview.validRowCount).toBe(3)
    expect(preview.platformTotalRecognised).toBe(600)
    expect(preview.rows.map((r) => r.sourceRowNumber)).toEqual([3, 5, 26])
  })

  it('rejects negative recognised amounts and warns on malformed amounts', () => {
    const rows = [
      ['Title'],
      ['Beneficiary', 'Claim', 'Recognized Value', 'Comments'],
      ['Ok', null, 50, 'fine'],
      ['BadNeg', null, -10, null],
      ['BadText', null, 'abc', null],
    ]
    const preview = importSedBeneficiaryWorkbook({ workbookBuffer: buildSedWorkbook(rows) })
    expect(preview.validRowCount).toBe(1)
    expect(preview.rejectedRowCount).toBe(2)
    expect(preview.rows.find((r) => r.values.beneficiary === 'Ok')?.values.notes).toBe('fine')
  })

  it('accepts header aliases case-insensitively', () => {
    const rows = [
      ['Socio Economic Development'],
      ['  Beneficiary Name ', 'CLAIM STATUS', 'Recognized Amount', 'COMMENT'],
      ['Alias Co', 'x', 1000, 'n'],
    ]
    const preview = importSedBeneficiaryWorkbook({ workbookBuffer: buildSedWorkbook(rows) })
    expect(preview.validRowCount).toBe(1)
    expect(preview.platformTotalRecognised).toBe(1000)
  })

  it('preserves claimed raw without using it in scoring', () => {
    const preview = importSedBeneficiaryWorkbook({ workbookBuffer: buildSedWorkbook(baseTemplate()) })
    const gamma = preview.rows.find((r) => r.values.beneficiary === 'Beneficiary Gamma')
    expect(gamma?.values.claimed).toBe('yes')
    const score = socioEconomicDevelopmentAdapter.calculate({
      rows: preview.rows.filter((r) => r.validationStatus === 'valid'),
      contextualInputs: { npatAmount: 42_000_000, targetPercent: 0.01, availablePoints: 5 },
    })
    expect(score.inputsUsed.claimedColumnUsedInScoring).toBe('no')
    expect(score.pointsAchieved).toBe(5)
  })
})

describe('SED calculation rule', () => {
  it('is deterministic and matches proportional engine maths', () => {
    const a = calculateSedBeneficiaryScore({
      totalRecognisedAmount: 420000,
      npatAmount: 42_000_000,
      targetPercent: 0.01,
      availablePoints: 5,
    })
    const b = calculateSedBeneficiaryScore({
      totalRecognisedAmount: 420000,
      npatAmount: 42_000_000,
      targetPercent: 0.01,
      availablePoints: 5,
    })
    expect(a).toEqual(b)
    expect(a.percentage).toBe(0.01)
    expect(a.pointsAchieved).toBe(5)
  })

  it('does not score without NPAT / target', () => {
    const score = calculateSedBeneficiaryScore({
      totalRecognisedAmount: 420000,
      npatAmount: null,
      targetPercent: null,
    })
    expect(score.pointsAchieved).toBeNull()
    expect(score.warnings.length).toBeGreaterThan(0)
  })
})

describe('Assessment scope', () => {
  it('creates single and selected element scopes without forcing all elements', () => {
    expect(resolveSelectedElements({ scopeMode: 'single', selectedElements: ['socio_economic_development'] })).toEqual({
      ok: true,
      elements: ['socio_economic_development'],
    })
    expect(resolveSelectedElements({ scopeMode: 'single', selectedElements: ['management_control'] }).ok).toBe(true)
    expect(resolveSelectedElements({ scopeMode: 'single', selectedElements: ['enterprise_development'] }).ok).toBe(true)
    expect(resolveSelectedElements({ scopeMode: 'single', selectedElements: ['supplier_development'] }).ok).toBe(true)
    expect(
      resolveSelectedElements({
        scopeMode: 'selected',
        selectedElements: ['socio_economic_development', 'management_control'],
      }),
    ).toEqual({
      ok: true,
      elements: ['socio_economic_development', 'management_control'],
    })
  })

  it('never presents a complete B-BBEE level for modular calculator scopes', () => {
    const single = describeAssessmentScope({
      scopeMode: 'single',
      selectedElements: ['socio_economic_development'],
    })
    expect(single.isCompleteBbbeeScorecard).toBe(false)
    expect(single.honestyMessage).toContain('not a complete B-BBEE level')

    const full = describeAssessmentScope({
      scopeMode: 'full',
      selectedElements: [
        'socio_economic_development',
        'enterprise_development',
        'supplier_development',
        'management_control',
      ],
    })
    expect(full.isCompleteBbbeeScorecard).toBe(false)
    expect(full.label).toBe('All available elements result')
    expect(full.honestyMessage).toMatch(
      /^Selected-element score\. This is not a complete B-BBEE level\./,
    )
  })
})

describe('EAP target validation', () => {
  it('validates required demographic structure from MC engine', () => {
    const cells = expectedEapCells().map((c) => ({ ...c, targetValue: 0.1 }))
    expect(validateEapTargetMatrix(cells).ok).toBe(true)
  })

  it('rejects black_women on disabilities and out-of-range values', () => {
    const bad = validateEapTargetMatrix([
      { bandKey: 'employees_with_disabilities', demographicKey: 'black_women', targetValue: 0.1 },
      { bandKey: 'board', demographicKey: 'black_people', targetValue: 2 },
    ])
    expect(bad.ok).toBe(false)
    expect(bad.errors.length).toBeGreaterThan(0)
  })
})

describe('Element registry', () => {
  it('exposes unambiguous keys and never a bare sd key', () => {
    const keys = listScorecardElementAdapters().map((a) => a.elementKey)
    expect(keys).toContain('supplier_development')
    expect(keys).toContain('socio_economic_development')
    expect(keys).not.toContain('sd')
    expect(getScorecardElementAdapter('supplier_development').elementName).toContain('Supplier')
  })

  it('sumValidRecognisedAmount uses valid rows only', () => {
    const preview = importSedBeneficiaryWorkbook({ workbookBuffer: buildSedWorkbook(baseTemplate()) })
    expect(sumValidRecognisedAmount(preview.rows)).toBe(420000)
  })
})
