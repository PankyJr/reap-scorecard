import { describe, expect, it } from 'vitest'
import { buildEngineInputs } from '../build-inputs'
import { buildReconciliation } from '../reconciliation'
import { calculateFullScorecard } from '../calculate'
import { PRIMARY_REFERENCE_FINAL_SCORE_KEY } from '../types'
import { validMetricRow } from './fixtures'

const SD = 'Skills Development'
const REF = 'Full Scorecard Reference'

function sdMetric(
  key: string,
  numericValue: number | null,
  opts: {
    value_type?: string
    validation_state?: 'valid' | 'warning' | 'error'
    validation_message?: string | null
    source_sheet?: string
  } = {},
) {
  return validMetricRow({
    metric_key: key,
    pillar: SD,
    source_sheet: opts.source_sheet ?? SD,
    numeric_value: numericValue,
    value_type: opts.value_type ?? 'number',
    validation_state: opts.validation_state ?? 'valid',
    validation_message: opts.validation_message ?? null,
  })
}

function expenditureBlackPeopleFull() {
  return [
    sdMetric('skills_development.expenditure.black_people.percentage', 0.04, {
      value_type: 'percentage',
    }),
    sdMetric('skills_development.expenditure.black_people.target', 0.06, {
      value_type: 'percentage',
    }),
    sdMetric('skills_development.expenditure.black_people.available_points', 8),
  ]
}

function learnershipBlackWomenFull() {
  return [
    sdMetric('skills_development.learnerships.black_women.percentage', 0.1, {
      value_type: 'percentage',
      source_sheet: 'Interns & Learners',
    }),
    sdMetric('skills_development.learnerships.black_women.target', 0.2, {
      value_type: 'percentage',
      source_sheet: 'Interns & Learners',
    }),
    sdMetric('skills_development.learnerships.black_women.available_points', 4, {
      source_sheet: 'Interns & Learners',
    }),
  ]
}

function absorptionBonusFull() {
  return [
    sdMetric('skills_development.bonus.absorption.percentage', 0.5, {
      value_type: 'percentage',
      source_sheet: 'Learner summary',
    }),
    sdMetric('skills_development.bonus.absorption.target', 0.5, {
      value_type: 'percentage',
      source_sheet: 'Learner summary',
    }),
    sdMetric('skills_development.bonus.absorption.available_points', 2, {
      source_sheet: 'Learner summary',
    }),
  ]
}

function referenceSkills(achieved: number, available = 25) {
  return [
    validMetricRow({
      metric_key: 'full_scorecard.reference.skills_development.available_points',
      numeric_value: available,
      pillar: REF,
    }),
    validMetricRow({
      metric_key: 'full_scorecard.reference.skills_development.possible_points_1',
      numeric_value: available,
      pillar: REF,
    }),
    validMetricRow({
      metric_key: 'full_scorecard.reference.skills_development.points_achieved',
      numeric_value: achieved,
      pillar: REF,
    }),
  ]
}

describe('skills development engine', () => {
  it('computes proportional expenditure points', () => {
    const input = buildEngineInputs(expenditureBlackPeopleFull())
    const exp = calculateFullScorecard({ input, engineVersion: 'test' }).pillars
      .flatMap((p) => p.sections)
      .flatMap((s) => s.indicators)
      .find((i) => i.key === 'skills_development.expenditure')
    expect(exp?.status).toBe('calculated')
    expect(exp?.achievedPoints).toBeCloseTo(5.33, 1)
    expect(exp?.availablePoints).toBe(8)
  })

  it('caps when actual exceeds target', () => {
    const input = buildEngineInputs([
      sdMetric('skills_development.expenditure.black_people.percentage', 0.12, {
        value_type: 'percentage',
      }),
      sdMetric('skills_development.expenditure.black_people.target', 0.06, {
        value_type: 'percentage',
      }),
      sdMetric('skills_development.expenditure.black_people.available_points', 8),
    ])
    const exp = calculateFullScorecard({ input, engineVersion: 'test' }).pillars
      .flatMap((p) => p.sections)
      .flatMap((s) => s.indicators)
      .find((i) => i.key === 'skills_development.expenditure')
    expect(exp?.achievedPoints).toBe(8)
  })

  it('is not_calculated when percentage missing', () => {
    const input = buildEngineInputs([
      sdMetric('skills_development.expenditure.black_people.target', 0.5, { value_type: 'percentage' }),
      sdMetric('skills_development.expenditure.black_people.available_points', 8),
    ])
    const exp = calculateFullScorecard({ input, engineVersion: 'test' }).pillars
      .flatMap((p) => p.sections)
      .flatMap((s) => s.indicators)
      .find((i) => i.key === 'skills_development.expenditure')
    expect(exp?.status).toBe('not_calculated')
  })

  it('is not_calculated when target missing', () => {
    const input = buildEngineInputs([
      sdMetric('skills_development.expenditure.black_people.percentage', 0.04, {
        value_type: 'percentage',
      }),
      sdMetric('skills_development.expenditure.black_people.available_points', 8),
    ])
    const exp = calculateFullScorecard({ input, engineVersion: 'test' }).pillars
      .flatMap((p) => p.sections)
      .flatMap((s) => s.indicators)
      .find((i) => i.key === 'skills_development.expenditure')
    expect(exp?.status).toBe('not_calculated')
  })

  it('excludes warning-state metrics from proportional scoring', () => {
    const input = buildEngineInputs([
      sdMetric('skills_development.expenditure.black_people.percentage', 0.04, {
        value_type: 'percentage',
        validation_state: 'warning',
        validation_message: 'Ambiguous Skills Development sheet',
      }),
      sdMetric('skills_development.expenditure.black_people.target', 0.06, {
        value_type: 'percentage',
      }),
      sdMetric('skills_development.expenditure.black_people.available_points', 8),
      ...learnershipBlackWomenFull(),
    ])
    const exp = calculateFullScorecard({ input, engineVersion: 'test' }).pillars
      .flatMap((p) => p.sections)
      .flatMap((s) => s.indicators)
      .find((i) => i.key === 'skills_development.expenditure')
    expect(exp?.status).toBe('not_calculated')
    const learn = calculateFullScorecard({ input, engineVersion: 'test' }).pillars
      .flatMap((p) => p.sections)
      .flatMap((s) => s.indicators)
      .find((i) => i.key === 'skills_development.learnerships')
    expect(learn?.status).toBe('calculated')
    expect(learn?.achievedPoints).toBe(2)
  })

  it('includes absorption bonus only when fully specified', () => {
    const withBonus = buildEngineInputs([...expenditureBlackPeopleFull(), ...absorptionBonusFull()])
    const bonus = calculateFullScorecard({ input: withBonus, engineVersion: 'test' }).pillars
      .flatMap((p) => p.sections)
      .flatMap((s) => s.indicators)
      .find((i) => i.key === 'skills_development.absorption_bonus')
    expect(bonus?.status).toBe('calculated')
    expect(bonus?.achievedPoints).toBe(2)

    const without = buildEngineInputs(expenditureBlackPeopleFull())
    const bonus2 = calculateFullScorecard({ input: without, engineVersion: 'test' }).pillars
      .flatMap((p) => p.sections)
      .flatMap((s) => s.indicators)
      .find((i) => i.key === 'skills_development.absorption_bonus')
    expect(bonus2?.status).toBe('not_calculated')
  })

  it('sums SD total from children without double-counting pillar rollup', () => {
    const input = buildEngineInputs([
      ...expenditureBlackPeopleFull(),
      ...learnershipBlackWomenFull(),
      ...absorptionBonusFull(),
    ])
    const pillar = calculateFullScorecard({ input, engineVersion: 'test' }).pillars.find(
      (p) => p.key === 'skills_development',
    )
    const total = pillar?.sections
      .flatMap((s) => s.indicators)
      .find((i) => i.key === 'skills_development.total')
    expect(total?.status).toBe('calculated')
    expect(pillar?.achievedPoints).toBe(total?.achievedPoints)
    const subKeys = [
      'skills_development.expenditure',
      'skills_development.learnerships',
      'skills_development.absorption_bonus',
    ]
    const subs = pillar?.sections.flatMap((s) => s.indicators).filter((i) => subKeys.includes(i.key)) ?? []
    expect(subs.every((s) => s.status === 'calculated')).toBe(true)
  })

  it('reconciles Skills Development pillar to Full Scorecard reference', () => {
    const base = [...expenditureBlackPeopleFull(), ...learnershipBlackWomenFull(), ...absorptionBonusFull()]
    const prelim = calculateFullScorecard({ input: buildEngineInputs(base), engineVersion: 'test' })
    const sdPillar = prelim.pillars.find((p) => p.key === 'skills_development')
    const achieved = sdPillar?.achievedPoints
    const available = sdPillar?.availablePoints
    expect(achieved).not.toBeNull()
    expect(available).not.toBeNull()

    const input = buildEngineInputs([
      ...base,
      ...referenceSkills(achieved!, available!),
      validMetricRow({
        metric_key: PRIMARY_REFERENCE_FINAL_SCORE_KEY,
        numeric_value: achieved!,
        pillar: REF,
      }),
    ])
    const result = calculateFullScorecard({ input, engineVersion: 'test' })
    const rec = buildReconciliation({
      input,
      calculatedTotal: result.overall.totalScore,
      pillars: result.pillars,
    })
    const sd = rec.elements.find((e) => e.elementKey === 'skills_development')
    expect(sd?.status).toBe('matched')
    expect(sd?.calculatedAchievedPoints).toBe(achieved)
    expect(sd?.achievedVariance).toBe(0)
  })

  it('reconciles variance when reference SD achieved differs', () => {
    const input = buildEngineInputs([
      ...expenditureBlackPeopleFull(),
      ...learnershipBlackWomenFull(),
      ...absorptionBonusFull(),
      ...referenceSkills(0),
      validMetricRow({
        metric_key: PRIMARY_REFERENCE_FINAL_SCORE_KEY,
        numeric_value: 100,
        pillar: REF,
      }),
    ])
    const result = calculateFullScorecard({ input, engineVersion: 'test' })
    const rec = buildReconciliation({
      input,
      calculatedTotal: result.overall.totalScore,
      pillars: result.pillars,
    })
    const sd = rec.elements.find((e) => e.elementKey === 'skills_development')
    expect(sd?.status).toBe('variance')
    expect(sd?.achievedVariance).not.toBe(0)
  })
})
