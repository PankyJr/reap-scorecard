import { describe, expect, it } from 'vitest'
import { GENERIC_CODES_2019_V1 as RULE_SET } from '../../rules/generic-2019/scorecard'
import { calculateContributionElement, evaluateContribution } from '../elements/contributions'
import {
  ESD_BENEFIT_FACTORS,
  findBenefitFactor,
  resolveBenefitFactor,
  SED_BENEFIT_FACTORS,
} from '../benefit-factors'
import { evaluatePrioritySubminimums } from '../aggregate'
import { grantContribution, sedContribution } from './fixtures'

const NPAT = 20_000_000

const edElement = (records = [grantContribution()], applicableNpat: number | null = NPAT) =>
  calculateContributionElement({
    ruleSet: RULE_SET,
    elementKey: 'enterprise_development',
    inputs: { records, applicableNpat, npatReason: 'Actual NPAT used.' },
  })

const sdElement = (records = [grantContribution()], applicableNpat: number | null = NPAT) =>
  calculateContributionElement({
    ruleSet: RULE_SET,
    elementKey: 'supplier_development',
    inputs: { records, applicableNpat, npatReason: 'Actual NPAT used.' },
  })

const sedElement = (records = [sedContribution()], applicableNpat: number | null = NPAT) =>
  calculateContributionElement({
    ruleSet: RULE_SET,
    elementKey: 'socio_economic_development',
    inputs: { records, applicableNpat, npatReason: 'Actual NPAT used.' },
  })

describe('benefit factor matrix', () => {
  it.each(ESD_BENEFIT_FACTORS.filter((definition) => definition.kind === 'fixed'))(
    'resolves the Annexe 400(B) benefit factor for $key',
    (definition) => {
      const { factor } = resolveBenefitFactor({
        scope: 'esd',
        contributionType: definition.key,
        suppliedFactor: null,
      })
      expect(factor).toBeCloseTo(definition.factor!, 6)
    },
  )

  it.each([
    ['lower_interest_rate_loan', 'Prime rate'],
    ['investment_lower_dividend', 'Dividend rate'],
    ['shorter_payment_period', 'invoiced'],
  ])('treats %s as a rate-based factor that must be supplied', (contributionType, formulaFragment) => {
    const definition = findBenefitFactor('esd', contributionType)!
    expect(definition.kind).toBe('variable')
    expect(definition.variableFormula).toMatch(new RegExp(formulaFragment, 'i'))
    const { factor, warnings } = resolveBenefitFactor({ scope: 'esd', contributionType, suppliedFactor: null })
    expect(factor).toBeNull()
    expect(warnings.join(' ')).toMatch(/supply the computed factor/i)
  })

  it('cites a gazetted source on every matrix row', () => {
    for (const definition of [...ESD_BENEFIT_FACTORS, ...SED_BENEFIT_FACTORS]) {
      expect(definition.source.standing).toBe('gazetted')
      expect(definition.contributionBasis.length).toBeGreaterThan(3)
      if (definition.kind === 'fixed') expect(definition.factor).not.toBeNull()
      else expect(definition.variableFormula).toBeTruthy()
    }
  })

  it('never treats an unknown contribution type as fully recognised', () => {
    const { factor, warnings } = resolveBenefitFactor({
      scope: 'esd',
      contributionType: 'something_unmapped',
      suppliedFactor: null,
    })
    expect(factor).toBeNull()
    expect(warnings.join(' ')).toMatch(/not.*(recognised|matrix)/i)
  })

  it('accepts a supplied rate for a variable factor', () => {
    const supplied = resolveBenefitFactor({
      scope: 'esd',
      contributionType: 'lower_interest_rate_loan',
      suppliedFactor: 0.45,
    })
    expect(supplied.factor).toBeCloseTo(0.45, 6)
    expect(supplied.warnings).toEqual([])
  })

  it('refuses to let a supplied factor override a fixed matrix row', () => {
    const supplied = resolveBenefitFactor({
      scope: 'esd',
      contributionType: 'guarantee',
      suppliedFactor: 1,
    })
    expect(supplied.factor).toBe(findBenefitFactor('esd', 'guarantee')!.factor)
    expect(supplied.warnings.join(' ')).toMatch(/the matrix fixes it at/i)
  })
})

describe('contribution recognition', () => {
  it('applies the benefit factor rather than the raw amount', () => {
    const evaluated = evaluateContribution({
      record: grantContribution({ contributionType: 'standard_loan', actualValue: 1_000_000 }),
      scope: 'esd',
      mode: 'esd_beneficiary',
    })
    const expectedFactor = findBenefitFactor('esd', 'standard_loan')!.factor!
    expect(expectedFactor).toBeLessThan(1)
    expect(evaluated.benefitFactor).toBeCloseTo(expectedFactor, 6)
    expect(evaluated.recognisedValue).toBeCloseTo(1_000_000 * expectedFactor, 2)
  })

  it.each([
    ['ownership below 51%', { beneficiaryBlackOwnershipPercentage: 0.5 }, /51% black owned/i],
    ['no classification', { beneficiaryClassification: null }, /classification/i],
    ['unknown ownership', { beneficiaryBlackOwnershipPercentage: null }, /ownership has not been captured/i],
  ])('excludes an ESD beneficiary with %s', (_label, overrides, expected) => {
    const evaluated = evaluateContribution({
      record: grantContribution(overrides),
      scope: 'esd',
      mode: 'esd_beneficiary',
    })
    expect(evaluated.eligible).toBe(false)
    expect(evaluated.recognisedValue).toBeNull()
    expect(evaluated.eligibilityReason).toMatch(expected)
  })

  it('accepts a grown beneficiary only inside the five-year window', () => {
    const inside = evaluateContribution({
      record: grantContribution({
        beneficiaryClassification: 'generic',
        wasEmeOrQseAtFirstAssistance: true,
        yearsSinceFirstAssistance: 4,
      }),
      scope: 'esd',
      mode: 'esd_beneficiary',
    })
    expect(inside.eligible).toBe(true)

    const outside = evaluateContribution({
      record: grantContribution({
        beneficiaryClassification: 'generic',
        wasEmeOrQseAtFirstAssistance: true,
        yearsSinceFirstAssistance: 6,
      }),
      scope: 'esd',
      mode: 'esd_beneficiary',
    })
    expect(outside.eligible).toBe(false)
    expect(outside.eligibilityReason).toMatch(/five-year window/i)
  })

  it('withholds recognition when no evidence is recorded', () => {
    const evaluated = evaluateContribution({
      record: grantContribution({ evidenceProvided: false }),
      scope: 'esd',
      mode: 'esd_beneficiary',
    })
    expect(evaluated.recognisedValue).toBeNull()
    expect(evaluated.warnings.join(' ')).toMatch(/evidence/i)
  })

  it('records a manual override with its full audit trail', () => {
    const evaluated = evaluateContribution({
      record: grantContribution({
        actualValue: 100_000,
        manualOverride: {
          value: 80_000,
          previousValue: 100_000,
          reason: 'Verification agency disallowed part of the claim.',
          overriddenBy: 'synthetic-admin',
          overriddenAt: '2026-04-01T10:00:00.000Z',
        },
      }),
      scope: 'esd',
      mode: 'esd_beneficiary',
    })
    expect(evaluated.recognisedValue).toBe(80_000)
    expect(evaluated.warnings.join(' ')).toMatch(/synthetic-admin/)
    expect(evaluated.warnings.join(' ')).toMatch(/Verification agency disallowed/)
  })
})

describe('enterprise development', () => {
  it('targets 1% of applicable NPAT for 5 points', () => {
    const element = edElement([grantContribution({ actualValue: NPAT * 0.01 })])
    expect(element.basePointsAvailable).toBe(5)
    expect(element.basePointsAchieved).toBeCloseTo(5, 6)
  })

  it.each([
    ['zero', 0, 0],
    ['half the target', 0.005, 2.5],
    ['at the target', 0.01, 5],
    ['above the target', 0.05, 5],
  ])('scores %s of NPAT', (_label, fraction, expected) => {
    const element = edElement([grantContribution({ actualValue: NPAT * fraction })])
    expect(element.basePointsAchieved).toBeCloseTo(expected, 6)
  })

  it('cannot score without a resolved NPAT denominator', () => {
    const element = edElement([grantContribution()], null)
    expect(element.status).toBe('missing_inputs')
    expect(element.missingInputs).toContain('Applicable NPAT denominator')
  })

  it('cannot score against a zero or negative NPAT', () => {
    const element = edElement([grantContribution()], 0)
    expect(element.basePointsAchieved).toBe(0)
    expect(element.missingInputs).toContain('A positive applicable NPAT denominator')
  })

  it('awards the job creation bonus only when confirmed and evidenced', () => {
    const confirmed = calculateContributionElement({
      ruleSet: RULE_SET,
      elementKey: 'enterprise_development',
      inputs: {
        records: [grantContribution()],
        applicableNpat: NPAT,
        npatReason: '',
        bonusConfirmed: true,
        bonusEvidenceProvided: true,
      },
    })
    expect(confirmed.bonusPointsAchieved).toBeCloseTo(1, 6)

    const unevidenced = calculateContributionElement({
      ruleSet: RULE_SET,
      elementKey: 'enterprise_development',
      inputs: {
        records: [grantContribution()],
        applicableNpat: NPAT,
        npatReason: '',
        bonusConfirmed: true,
        bonusEvidenceProvided: false,
      },
    })
    expect(unevidenced.bonusPointsAchieved).toBe(0)
  })

  it('never exposes the excluded orphan 11% new jobs row', () => {
    const element = edElement()
    expect(element.indicators.map((indicator) => indicator.displayName).join(' ')).not.toMatch(/11%/)
    expect(element.bonusPointsAvailable).toBe(1)
  })
})

describe('supplier development', () => {
  it('targets 2% of applicable NPAT for 10 points and stays separate from skills development', () => {
    const element = sdElement([grantContribution({ actualValue: NPAT * 0.02 })])
    expect(element.elementKey).toBe('supplier_development')
    expect(element.basePointsAvailable).toBe(10)
    expect(element.basePointsAchieved).toBeCloseTo(10, 6)
  })

  it('awards the graduation bonus only when confirmed', () => {
    const element = calculateContributionElement({
      ruleSet: RULE_SET,
      elementKey: 'supplier_development',
      inputs: {
        records: [grantContribution()],
        applicableNpat: NPAT,
        npatReason: '',
        bonusConfirmed: true,
        bonusEvidenceProvided: true,
      },
    })
    expect(element.bonusPointsAchieved).toBeCloseTo(1, 6)
  })

  it.each([
    ['passes at 40% of ten points', 0.008, true],
    ['fails just below', 0.0079, false],
  ])('%s', (_label, fraction, passed) => {
    const element = sdElement([grantContribution({ actualValue: NPAT * fraction })])
    const outcome = evaluatePrioritySubminimums({ ruleSet: RULE_SET, elements: [element] }).find(
      (candidate) => candidate.key === 'priority.supplier_development',
    )!
    expect(outcome.thresholdPoints).toBeCloseTo(4, 6)
    expect(outcome.passed).toBe(passed)
  })
})

describe('socio-economic development', () => {
  it('targets 1% of applicable NPAT for 5 points', () => {
    const element = sedElement([sedContribution({ actualValue: NPAT * 0.01 })])
    expect(element.basePointsAvailable).toBe(5)
    expect(element.bonusPointsAvailable).toBe(0)
    expect(element.basePointsAchieved).toBeCloseTo(5, 6)
  })

  it('recognises a contribution pro rata to the black beneficiary percentage', () => {
    const element = sedElement([
      sedContribution({ actualValue: NPAT * 0.01, blackBeneficiaryPercentage: 0.5 }),
    ])
    expect(element.basePointsAchieved).toBeCloseTo(2.5, 6)
  })

  it('rejects a contribution with no black beneficiaries', () => {
    const element = sedElement([sedContribution({ blackBeneficiaryPercentage: 0 })])
    expect(element.basePointsAchieved).toBe(0)
    expect(element.warnings.join(' ')).toMatch(/excluded as ineligible/i)
  })

  it('cannot recognise a contribution with an uncaptured beneficiary percentage', () => {
    const evaluated = evaluateContribution({
      record: sedContribution({ blackBeneficiaryPercentage: null }),
      scope: 'sed',
      mode: 'sed_beneficiary',
    })
    expect(evaluated.eligible).toBe(false)
    expect(evaluated.recognisedValue).toBeNull()
  })

  it('uses the Annexe 500(A) benefit factor matrix', () => {
    const { factor } = resolveBenefitFactor({
      scope: 'sed',
      contributionType: 'grant_contribution',
      suppliedFactor: null,
    })
    expect(factor).toBe(1)
    const discounted = resolveBenefitFactor({
      scope: 'sed',
      contributionType: 'overhead_cost',
      suppliedFactor: null,
    })
    expect(discounted.factor).toBeCloseTo(0.8, 6)
  })

  it('has no bonus indicators', () => {
    const element = sedElement()
    expect(element.bonusPointsAvailable).toBe(0)
    expect(element.bonusPointsAchieved).toBe(0)
  })
})
