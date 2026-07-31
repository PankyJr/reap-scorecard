import { describe, expect, it } from 'vitest'
import { GENERIC_CODES_2019_V1 as RULE_SET } from '../../rules/generic-2019/scorecard'
import {
  applySkillsCaps,
  calculateSkillsDevelopment,
  CATEGORY_F_G_CAP_FRACTION,
  EMPTY_SKILLS_DEVELOPMENT_INPUTS,
  TRAINING_ADMINISTRATION_CAP_FRACTION,
} from '../elements/skills-development'
import { evaluatePrioritySubminimums } from '../aggregate'
import type { ElementResult } from '../types'
import { strongSkillsDevelopment } from './fixtures'

const indicator = (result: ElementResult, key: string) => {
  const found = result.indicators.find((candidate) => candidate.indicatorKey === key)
  if (!found) throw new Error(`indicator ${key} not found`)
  return found
}

/**
 * Distribute an amount across the black EAP bands in exactly the proportions the
 * engine expects, so that a spend equal to the target scores full points.
 */
const BLACK_EAP_TOTAL = 0.435 + 0.046 + 0.017 + 0.375 + 0.042 + 0.01

const evenSpend = (total: number) => ({
  african_male: (total * 0.435) / BLACK_EAP_TOTAL,
  coloured_male: (total * 0.046) / BLACK_EAP_TOTAL,
  indian_male: (total * 0.017) / BLACK_EAP_TOTAL,
  african_female: (total * 0.375) / BLACK_EAP_TOTAL,
  coloured_female: (total * 0.042) / BLACK_EAP_TOTAL,
  indian_female: (total * 0.01) / BLACK_EAP_TOTAL,
})

describe('skills development eligibility gates', () => {
  it('is not started with no inputs at all', () => {
    const result = calculateSkillsDevelopment({ ruleSet: RULE_SET, inputs: EMPTY_SKILLS_DEVELOPMENT_INPUTS })
    expect(result.status).toBe('not_started')
    expect(result.basePointsAchieved).toBe(0)
  })

  it.each([
    ['unconfirmed WSP/ATR approval', { wspAtrSetaApproved: null }],
    ['a rejected WSP/ATR', { wspAtrSetaApproved: false }],
  ])('awards no points with %s', (_label, overrides) => {
    const result = calculateSkillsDevelopment({
      ruleSet: RULE_SET,
      inputs: strongSkillsDevelopment(overrides),
    })
    expect(result.basePointsAchieved).toBe(0)
    expect(result.bonusPointsAchieved).toBe(0)
    expect(result.indicators.every((candidate) => candidate.basePointsAchieved === null)).toBe(true)
    expect(result.missingInputs.join(' ')).toMatch(/SETA-approved Workplace Skills Plan/i)
  })

  it.each([
    ['the pivotal report', { pivotalReportSubmitted: false }],
    ['the priority skills programme', { prioritySkillsProgrammeImplemented: null }],
    ['the trainee tracking register', { trainingRegisterMaintained: false }],
  ])('withholds all points when %s is unconfirmed', (_label, overrides) => {
    const result = calculateSkillsDevelopment({
      ruleSet: RULE_SET,
      inputs: strongSkillsDevelopment(overrides),
    })
    expect(result.basePointsAchieved).toBe(0)
    expect(result.bonusPointsAchieved).toBe(0)
    expect(result.indicators.every((candidate) => candidate.status === 'blocked')).toBe(true)
  })
})

describe('skills development expenditure indicators', () => {
  it.each([
    ['zero spend', 0, 0],
    ['half the 3.5% target', 700_000, 3],
    ['exactly 3.5% of the leviable amount', 1_400_000, 6],
    ['above target is capped', 4_000_000, 6],
  ])('scores general black skills expenditure at %s', (_label, total, expected) => {
    const result = calculateSkillsDevelopment({
      ruleSet: RULE_SET,
      inputs: strongSkillsDevelopment({
        leviableAmount: 40_000_000,
        generalTrainingSpendByDemographic: evenSpend(total),
      }),
    })
    expect(indicator(result, 'skills_development.expenditure.black_people').basePointsAchieved).toBeCloseTo(
      expected,
      1,
    )
  })

  it('scores black student bursaries against 2.5% of the leviable amount', () => {
    const result = calculateSkillsDevelopment({
      ruleSet: RULE_SET,
      inputs: strongSkillsDevelopment({
        leviableAmount: 40_000_000,
        bursarySpendByDemographic: evenSpend(1_000_000),
      }),
    })
    expect(indicator(result, 'skills_development.bursaries.black_students').basePointsAchieved).toBeCloseTo(4, 1)
  })

  it('scores disability training against 0.3% of the leviable amount', () => {
    const result = calculateSkillsDevelopment({
      ruleSet: RULE_SET,
      inputs: strongSkillsDevelopment({ leviableAmount: 40_000_000, disabilityTrainingSpend: 60_000 }),
    })
    expect(
      indicator(result, 'skills_development.expenditure.disabled_black_people').basePointsAchieved,
    ).toBeCloseTo(2, 6)
  })

  it('cannot score expenditure without a leviable amount', () => {
    const result = calculateSkillsDevelopment({
      ruleSet: RULE_SET,
      inputs: strongSkillsDevelopment({ leviableAmount: null }),
    })
    expect(indicator(result, 'skills_development.expenditure.black_people').basePointsAchieved).toBeNull()
    expect(result.missingInputs).toContain('Leviable amount')
  })
})

describe('skills development learnerships', () => {
  it.each([
    ['zero learners', 0, 0],
    ['half the 5% target', 10, 3],
    ['at the 5% target', 20, 6],
    ['above the target', 60, 6],
  ])('scores black learners at %s', (_label, learners, expected) => {
    const result = calculateSkillsDevelopment({
      ruleSet: RULE_SET,
      inputs: strongSkillsDevelopment({
        totalEmployees: 400,
        learnerHeadcountByDemographic: evenSpend(learners),
      }),
    })
    expect(indicator(result, 'skills_development.learnerships').basePointsAchieved).toBeCloseTo(expected, 1)
  })

  it('cannot score learnerships without a total employee denominator', () => {
    const result = calculateSkillsDevelopment({
      ruleSet: RULE_SET,
      inputs: strongSkillsDevelopment({ totalEmployees: null }),
    })
    expect(indicator(result, 'skills_development.learnerships').basePointsAchieved).toBeNull()
  })
})

describe('skills development absorption bonus', () => {
  it.each([
    ['nobody absorbed', 20, 0, 0],
    ['half absorbed', 20, 10, 2.5],
    ['everybody absorbed', 20, 20, 5],
  ])('scores absorption when %s', (_label, completed, absorbed, expected) => {
    const result = calculateSkillsDevelopment({
      ruleSet: RULE_SET,
      inputs: strongSkillsDevelopment({ learnersCompleted: completed, learnersAbsorbed: absorbed }),
    })
    const bonus = indicator(result, 'skills_development.bonus.absorption')
    expect(bonus.bonusPointsAchieved).toBeCloseTo(expected, 6)
    expect(bonus.basePointsAvailable).toBe(0)
  })

  it('measures absorption against completed learners, not total headcount', () => {
    const result = calculateSkillsDevelopment({
      ruleSet: RULE_SET,
      inputs: strongSkillsDevelopment({ learnersCompleted: 10, learnersAbsorbed: 10, totalEmployees: 400 }),
    })
    expect(indicator(result, 'skills_development.bonus.absorption').bonusPointsAchieved).toBeCloseTo(5, 6)
  })

  it('cannot score absorption when no learners completed', () => {
    const result = calculateSkillsDevelopment({
      ruleSet: RULE_SET,
      inputs: strongSkillsDevelopment({ learnersCompleted: 0, learnersAbsorbed: 0 }),
    })
    expect(indicator(result, 'skills_development.bonus.absorption').bonusPointsAchieved).toBeNull()
  })

  it('keeps bonus points out of the base total', () => {
    const result = calculateSkillsDevelopment({ ruleSet: RULE_SET, inputs: strongSkillsDevelopment() })
    expect(result.basePointsAvailable).toBe(20)
    expect(result.bonusPointsAvailable).toBe(5)
    expect(result.basePointsAchieved).toBeLessThanOrEqual(20)
    expect(result.bonusPointsAchieved).toBeCloseTo(5, 6)
  })
})

describe('skills development spend caps', () => {
  it('caps category F and G informal learning at 15% of total spend', () => {
    const inputs = strongSkillsDevelopment({
      totalSkillsDevelopmentSpend: 1_000_000,
      informalWorkplaceLearningSpend: 400_000,
      generalTrainingSpendByDemographic: evenSpend(1_000_000),
    })
    const { warnings, adjustedGeneralSpend, adjustments } = applySkillsCaps(inputs)
    const capped = Object.values(adjustedGeneralSpend).reduce((sum, value) => sum + value, 0)
    expect(CATEGORY_F_G_CAP_FRACTION).toBe(0.15)
    expect(capped).toBeCloseTo(1_000_000 - (400_000 - 150_000), 2)
    expect(adjustments[0].disallowedAmount).toBeCloseTo(250_000, 2)
    expect(warnings.join(' ')).toMatch(/15%/)
  })

  it('caps training administration cost at 15% of total spend', () => {
    const inputs = strongSkillsDevelopment({
      totalSkillsDevelopmentSpend: 1_000_000,
      trainingAdministrationCost: 300_000,
      generalTrainingSpendByDemographic: evenSpend(1_000_000),
    })
    const { warnings, adjustedGeneralSpend } = applySkillsCaps(inputs)
    const capped = Object.values(adjustedGeneralSpend).reduce((sum, value) => sum + value, 0)
    expect(TRAINING_ADMINISTRATION_CAP_FRACTION).toBe(0.15)
    expect(capped).toBeCloseTo(1_000_000 - (300_000 - 150_000), 2)
    expect(warnings.join(' ')).toMatch(/administration/i)
  })

  it('leaves spend untouched when it is within both caps', () => {
    const inputs = strongSkillsDevelopment({
      totalSkillsDevelopmentSpend: 1_000_000,
      informalWorkplaceLearningSpend: 100_000,
      trainingAdministrationCost: 100_000,
      generalTrainingSpendByDemographic: evenSpend(1_000_000),
    })
    const { warnings, adjustedGeneralSpend, adjustments } = applySkillsCaps(inputs)
    const capped = Object.values(adjustedGeneralSpend).reduce((sum, value) => sum + value, 0)
    expect(capped).toBeCloseTo(1_000_000, 2)
    expect(adjustments).toEqual([])
    expect(warnings).toEqual([])
  })
})

describe('skills development priority sub-minimum', () => {
  const subminimum = (element: ElementResult) =>
    evaluatePrioritySubminimums({ ruleSet: RULE_SET, elements: [element] }).find(
      (outcome) => outcome.key === 'priority.skills_development',
    )!

  it('tests 40% of the 20 base points and ignores the bonus', () => {
    const element = calculateSkillsDevelopment({ ruleSet: RULE_SET, inputs: strongSkillsDevelopment() })
    const outcome = subminimum(element)
    expect(outcome.basisPoints).toBe(20)
    expect(outcome.thresholdPoints).toBeCloseTo(8, 6)
    expect(outcome.achievedPoints).toBe(element.basePointsAchieved)
    expect(outcome.passed).toBe(true)
  })

  it('fails when base points fall below eight even with a full bonus', () => {
    const element = calculateSkillsDevelopment({
      ruleSet: RULE_SET,
      inputs: strongSkillsDevelopment({
        generalTrainingSpendByDemographic: evenSpend(100_000),
        bursarySpendByDemographic: evenSpend(50_000),
        disabilityTrainingSpend: 1_000,
        learnerHeadcountByDemographic: {
          african_male: 1,
          coloured_male: 0,
          indian_male: 0,
          african_female: 1,
          coloured_female: 0,
          indian_female: 0,
        },
      }),
    })
    expect(element.bonusPointsAchieved).toBeCloseTo(5, 6)
    const outcome = subminimum(element)
    expect(outcome.achievedPoints!).toBeLessThan(8)
    expect(outcome.passed).toBe(false)
  })
})
