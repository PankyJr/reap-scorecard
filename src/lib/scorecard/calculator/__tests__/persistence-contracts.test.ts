import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { importSedBeneficiaryWorkbook } from '../elements/socio-economic-development/import'
import { socioEconomicDevelopmentAdapter } from '../elements/socio-economic-development/adapter'
import { describeAssessmentScope } from '../assessment/scope'

describe('Full Scorecard Calculator integration contracts', () => {
  it('persists recalculation requirement after row correction semantics', () => {
    const fixture = readFileSync(
      join(__dirname, '../fixtures/sed-beneficiaries-synthetic.xlsx'),
    )
    const preview = importSedBeneficiaryWorkbook({ workbookBuffer: fixture })
    const first = socioEconomicDevelopmentAdapter.calculate({
      rows: preview.rows.filter((r) => r.validationStatus === 'valid'),
      contextualInputs: { npatAmount: 42_000_000, targetPercent: 0.01, availablePoints: 5 },
    })

    const edited = structuredClone(preview)
    edited.rows[0].values.recognisedAmount = 10_000
    edited.platformTotalRecognised = edited.rows
      .filter((r) => r.validationStatus === 'valid')
      .reduce((s, r) => s + (typeof r.values.recognisedAmount === 'number' ? r.values.recognisedAmount : 0), 0)

    const second = socioEconomicDevelopmentAdapter.calculate({
      rows: edited.rows.filter((r) => r.validationStatus === 'valid'),
      contextualInputs: { npatAmount: 42_000_000, targetPercent: 0.01, availablePoints: 5 },
    })

    expect(first.ruleVersion).toBe(second.ruleVersion)
    expect(edited.platformTotalRecognised).not.toBe(preview.platformTotalRecognised)
    expect(second.pointsAchieved).not.toBe(first.pointsAchieved)
    // Report parity: saved result fields mirror calculation breakdown
    expect(second.formulaName).toBe(first.formulaName)
    expect(second.inputsUsed.totalRecognisedAmount).toBe(edited.platformTotalRecognised)
  })

  it('keeps selected-scope disclaimer for report parity', () => {
    const scope = describeAssessmentScope({
      scopeMode: 'selected',
      selectedElements: ['socio_economic_development', 'management_control'],
    })
    expect(scope.honestyMessage).toBe(
      'Selected-element score. This is not a complete B-BBEE level.',
    )
    expect(scope.isCompleteBbbeeScorecard).toBe(false)
  })

  it('actions expose save/reopen and recalculation markers', () => {
    const actions = readFileSync(
      join(__dirname, '../../../../app/(dashboard)/scorecards/calculator/actions.ts'),
      'utf8',
    )
    expect(actions).toContain('needs_recalculation: true')
    expect(actions).toContain('scorecard_calculation_runs')
    expect(actions).toContain('updateImportedSedRow')
    expect(actions).toContain('eap_target_snapshot')
    expect(actions).toContain('import_snapshot')
  })
})
