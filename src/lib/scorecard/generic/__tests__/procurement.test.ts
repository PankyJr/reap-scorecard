import { describe, expect, it } from 'vitest'
import { GENERIC_CODES_2019_V1 as RULE_SET } from '../../rules/generic-2019/scorecard'
import { calculatePreferentialProcurement, PROCUREMENT_CRITERION_KEYS } from '../elements/procurement'
import { evaluatePrioritySubminimums } from '../aggregate'
import type { ElementResult } from '../types'
import { strongProcurementSnapshot } from './fixtures'

const indicator = (result: ElementResult, key: string) => {
  const found = result.indicators.find((candidate) => candidate.indicatorKey === key)
  if (!found) throw new Error(`indicator ${key} not found`)
  return found
}

describe('preferential procurement snapshot', () => {
  it('is not started until an assessment is attached', () => {
    const result = calculatePreferentialProcurement({ ruleSet: RULE_SET, snapshot: null })
    expect(result.status).toBe('not_started')
    expect(result.missingInputs).toContain('Attached procurement assessment')
    expect(result.basePointsAchieved).toBe(0)
  })

  it('separates 27 available base points from 2 available bonus points', () => {
    const result = calculatePreferentialProcurement({
      ruleSet: RULE_SET,
      snapshot: strongProcurementSnapshot(),
    })
    expect(result.basePointsAvailable).toBe(27)
    expect(result.bonusPointsAvailable).toBe(2)
    const bonus = indicator(result, 'preferential_procurement.bonus.designated_group')
    expect(bonus.basePointsAvailable).toBe(0)
    expect(bonus.bonusPointsAchieved).toBeCloseTo(2, 6)
    expect(result.basePointsAchieved).toBeLessThanOrEqual(27)
  })

  it.each([
    ['preferential_procurement.all_empowering_suppliers', 0.8, 5],
    ['preferential_procurement.qse', 0.15, 3],
    ['preferential_procurement.eme', 0.15, 4],
    ['preferential_procurement.black_owned_51', 0.5, 11],
    ['preferential_procurement.black_women_owned_30', 0.12, 4],
    ['preferential_procurement.bonus.designated_group', 0.02, 2],
  ])('awards full points for %s at its target', (key, target, points) => {
    const tmps = 100_000_000
    const snapshot = strongProcurementSnapshot({
      totalMeasuredProcurementSpend: tmps,
      recognisedSpend: { [key]: tmps * target },
    })
    const result = calculatePreferentialProcurement({ ruleSet: RULE_SET, snapshot })
    const scored = indicator(result, key)
    expect((scored.basePointsAchieved ?? 0) + (scored.bonusPointsAchieved ?? 0)).toBeCloseTo(points, 6)
  })

  it('scores every criterion proportionally below target and caps above it', () => {
    const tmps = 100_000_000
    const half = calculatePreferentialProcurement({
      ruleSet: RULE_SET,
      snapshot: strongProcurementSnapshot({
        totalMeasuredProcurementSpend: tmps,
        recognisedSpend: { 'preferential_procurement.black_owned_51': tmps * 0.25 },
      }),
    })
    expect(indicator(half, 'preferential_procurement.black_owned_51').basePointsAchieved).toBeCloseTo(5.5, 6)

    const over = calculatePreferentialProcurement({
      ruleSet: RULE_SET,
      snapshot: strongProcurementSnapshot({
        totalMeasuredProcurementSpend: tmps,
        recognisedSpend: { 'preferential_procurement.black_owned_51': tmps * 2 },
      }),
    })
    expect(indicator(over, 'preferential_procurement.black_owned_51').basePointsAchieved).toBeCloseTo(11, 6)
  })

  it('covers every procurement criterion in the rule set', () => {
    const result = calculatePreferentialProcurement({
      ruleSet: RULE_SET,
      snapshot: strongProcurementSnapshot(),
    })
    expect(result.indicators.map((candidate) => candidate.indicatorKey).sort()).toEqual(
      [...PROCUREMENT_CRITERION_KEYS].sort(),
    )
  })

  it('cannot score without a total measured procurement spend', () => {
    const result = calculatePreferentialProcurement({
      ruleSet: RULE_SET,
      snapshot: strongProcurementSnapshot({ totalMeasuredProcurementSpend: null }),
    })
    expect(result.status).toBe('missing_inputs')
    expect(result.missingInputs).toContain('Total measured procurement spend')
  })

  it('records that the result is frozen and that flow-through was preserved', () => {
    const result = calculatePreferentialProcurement({
      ruleSet: RULE_SET,
      snapshot: strongProcurementSnapshot({ flowThroughApplied: true }),
    })
    expect(result.warnings.join(' ')).toMatch(/frozen snapshot/i)
    expect(result.warnings.join(' ')).toMatch(/flow-through/i)
  })

  it('reconciles against the points the source assessment reported', () => {
    const result = calculatePreferentialProcurement({
      ruleSet: RULE_SET,
      snapshot: strongProcurementSnapshot({ sourceReportedBasePoints: 12 }),
    })
    expect(result.warnings.join(' ')).toMatch(/reported 12\.00 base points/i)
  })

  it('does not warn when the source assessment agrees', () => {
    const first = calculatePreferentialProcurement({
      ruleSet: RULE_SET,
      snapshot: strongProcurementSnapshot(),
    })
    const second = calculatePreferentialProcurement({
      ruleSet: RULE_SET,
      snapshot: strongProcurementSnapshot({ sourceReportedBasePoints: first.basePointsAchieved }),
    })
    expect(second.warnings.join(' ')).not.toMatch(/Review the difference/i)
  })

  it('keeps a replaced snapshot independent of the previous one', () => {
    const original = calculatePreferentialProcurement({
      ruleSet: RULE_SET,
      snapshot: strongProcurementSnapshot(),
    })
    const replacement = calculatePreferentialProcurement({
      ruleSet: RULE_SET,
      snapshot: strongProcurementSnapshot({
        sourceAssessmentId: '00000000-0000-4000-8000-000000000002',
        sourceAssessmentName: 'Synthetic procurement assessment 2025',
        totalMeasuredProcurementSpend: 100_000_000,
        recognisedSpend: { 'preferential_procurement.all_empowering_suppliers': 40_000_000 },
      }),
    })
    expect(replacement.basePointsAchieved).not.toBe(original.basePointsAchieved)
    expect(replacement.warnings.join(' ')).toMatch(/2025/)
  })
})

describe('procurement priority sub-minimum', () => {
  const subminimum = (element: ElementResult) =>
    evaluatePrioritySubminimums({ ruleSet: RULE_SET, elements: [element] }).find(
      (outcome) => outcome.key === 'priority.preferential_procurement',
    )!

  it('tests 40% of 25 points even though 27 are available', () => {
    const element = calculatePreferentialProcurement({
      ruleSet: RULE_SET,
      snapshot: strongProcurementSnapshot(),
    })
    const outcome = subminimum(element)
    expect(outcome.basisPoints).toBe(25)
    expect(outcome.thresholdPoints).toBeCloseTo(10, 6)
    expect(outcome.passed).toBe(true)
  })

  it('excludes the bonus from the sub-minimum measure', () => {
    const tmps = 100_000_000
    const element = calculatePreferentialProcurement({
      ruleSet: RULE_SET,
      snapshot: strongProcurementSnapshot({
        totalMeasuredProcurementSpend: tmps,
        recognisedSpend: {
          'preferential_procurement.all_empowering_suppliers': tmps * 0.4,
          'preferential_procurement.qse': 0,
          'preferential_procurement.eme': 0,
          'preferential_procurement.black_owned_51': tmps * 0.1,
          'preferential_procurement.black_women_owned_30': 0,
          'preferential_procurement.bonus.designated_group': tmps * 0.05,
        },
      }),
    })
    expect(element.bonusPointsAchieved).toBeCloseTo(2, 6)
    const outcome = subminimum(element)
    expect(outcome.achievedPoints).toBe(element.basePointsAchieved)
    expect(outcome.achievedPoints!).toBeLessThan(10)
    expect(outcome.passed).toBe(false)
  })
})
