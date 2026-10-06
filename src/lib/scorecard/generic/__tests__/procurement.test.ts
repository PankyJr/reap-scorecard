import { describe, expect, it } from 'vitest'
import { GENERIC_CODES_2019_V1 as RULE_SET } from '../../rules/generic-2019/scorecard'
import { calculateGenericScorecard } from '..'
import {
  applyProcurementElementCaps,
  calculatePreferentialProcurement,
  normaliseSourceProcurementPoints,
  PROCUREMENT_BASE_CAP,
  PROCUREMENT_BONUS_CAP,
  PROCUREMENT_COMBINED_CAP,
  PROCUREMENT_CRITERION_KEYS,
} from '../elements/procurement'
import { evaluatePrioritySubminimums } from '../aggregate'
import type { ElementResult } from '../types'
import { completeScorecardInputs, strongProcurementSnapshot } from './fixtures'

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

  it('exposes 25 available base points and 2 available bonus points', () => {
    const result = calculatePreferentialProcurement({
      ruleSet: RULE_SET,
      snapshot: strongProcurementSnapshot(),
    })
    expect(result.basePointsAvailable).toBe(PROCUREMENT_BASE_CAP)
    expect(result.bonusPointsAvailable).toBe(PROCUREMENT_BONUS_CAP)
    const bonus = indicator(result, 'preferential_procurement.bonus.designated_group')
    expect(bonus.basePointsAvailable).toBe(0)
    expect(bonus.bonusPointsAchieved).toBeCloseTo(2, 6)
    expect(result.basePointsAchieved).toBeLessThanOrEqual(PROCUREMENT_BASE_CAP)
    expect(result.bonusPointsAchieved).toBeLessThanOrEqual(PROCUREMENT_BONUS_CAP)
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

describe('procurement element caps (Generic product model)', () => {
  it('keeps base calculation below 25 uncapped', () => {
    const capped = applyProcurementElementCaps({ basePointsAchieved: 18.5, bonusPointsAchieved: 1 })
    expect(capped.basePointsAchieved).toBeCloseTo(18.5, 6)
    expect(capped.baseWasCapped).toBe(false)
  })

  it('keeps base calculation exactly 25', () => {
    const capped = applyProcurementElementCaps({ basePointsAchieved: 25, bonusPointsAchieved: 0 })
    expect(capped.basePointsAchieved).toBe(25)
    expect(capped.baseWasCapped).toBe(false)
  })

  it('caps base calculation attempting to exceed 25', () => {
    const capped = applyProcurementElementCaps({ basePointsAchieved: 27, bonusPointsAchieved: 2 })
    expect(capped.basePointsAchieved).toBe(PROCUREMENT_BASE_CAP)
    expect(capped.baseWasCapped).toBe(true)
    expect(capped.bonusPointsAchieved).toBe(PROCUREMENT_BONUS_CAP)
  })

  it('keeps bonus below 2 uncapped', () => {
    const capped = applyProcurementElementCaps({ basePointsAchieved: 10, bonusPointsAchieved: 1.25 })
    expect(capped.bonusPointsAchieved).toBeCloseTo(1.25, 6)
    expect(capped.bonusWasCapped).toBe(false)
  })

  it('caps bonus attempting to exceed 2', () => {
    const capped = applyProcurementElementCaps({ basePointsAchieved: 10, bonusPointsAchieved: 4 })
    expect(capped.bonusPointsAchieved).toBe(PROCUREMENT_BONUS_CAP)
    expect(capped.bonusWasCapped).toBe(true)
  })

  it('enforces combined procurement maximum 27', () => {
    const capped = applyProcurementElementCaps({ basePointsAchieved: 27, bonusPointsAchieved: 2 })
    expect(capped.combinedPoints).toBe(PROCUREMENT_COMBINED_CAP)
    expect(capped.combinedPoints).toBeLessThanOrEqual(27)
  })

  it('does not add bonus into base twice', () => {
    const full = calculatePreferentialProcurement({
      ruleSet: RULE_SET,
      snapshot: strongProcurementSnapshot(),
    })
    expect(full.basePointsAchieved).toBeLessThanOrEqual(PROCUREMENT_BASE_CAP)
    expect(full.bonusPointsAchieved).toBeLessThanOrEqual(PROCUREMENT_BONUS_CAP)
    expect(full.basePointsAchieved + full.bonusPointsAchieved).toBeLessThanOrEqual(PROCUREMENT_COMBINED_CAP)
    // Designated-group points stay in bonus only
    expect(indicator(full, 'preferential_procurement.bonus.designated_group').basePointsAchieved).toBe(0)
    expect(indicator(full, 'preferential_procurement.bonus.designated_group').bonusPointsAchieved).toBeCloseTo(2, 6)
  })

  it('caps a full Statement 400 criterion hit at 25 base for the element', () => {
    const result = calculatePreferentialProcurement({
      ruleSet: RULE_SET,
      snapshot: strongProcurementSnapshot(),
    })
    const rawIndicatorBase = result.indicators.reduce(
      (sum, row) => sum + (row.basePointsAchieved ?? 0),
      0,
    )
    expect(rawIndicatorBase).toBeGreaterThan(PROCUREMENT_BASE_CAP)
    expect(result.basePointsAchieved).toBe(PROCUREMENT_BASE_CAP)
    expect(result.warnings.join(' ')).toMatch(/capped at 25/i)
  })

  it('normalises a combined source total into separated base and bonus', () => {
    const normalised = normaliseSourceProcurementPoints({
      combinedTotal: 29,
      categoryBasePoints: 27,
      categoryBonusPoints: 2,
    })
    expect(normalised.sourceReportedBasePoints).toBe(PROCUREMENT_BASE_CAP)
    expect(normalised.sourceReportedBonusPoints).toBe(PROCUREMENT_BONUS_CAP)
    expect(normalised.sourceReportedCombinedPoints).toBe(29)
    expect(normalised.sourceNormalisationWarning).toMatch(/combined figure/i)
  })

  it('preserves separated values on a frozen snapshot', () => {
    const snapshot = strongProcurementSnapshot({
      sourceReportedBasePoints: 25,
      sourceReportedBonusPoints: 2,
      sourceReportedCombinedPoints: 29,
      sourceNormalisationWarning: 'Source procurement total 29.00 was treated as a combined figure',
    })
    const result = calculatePreferentialProcurement({ ruleSet: RULE_SET, snapshot })
    expect(snapshot.sourceReportedBasePoints).toBe(25)
    expect(snapshot.sourceReportedBonusPoints).toBe(2)
    expect(snapshot.sourceReportedCombinedPoints).toBe(29)
    expect(result.warnings.join(' ')).toMatch(/combined figure/i)
    expect(result.basePointsAchieved).toBeLessThanOrEqual(25)
  })

  it('does not inflate the overall Generic score with procurement overflow', () => {
    const result = calculateGenericScorecard(completeScorecardInputs())
    const procurement = result.elements.find((element) => element.elementKey === 'preferential_procurement')!
    expect(procurement.basePointsAchieved).toBeLessThanOrEqual(PROCUREMENT_BASE_CAP)
    expect(procurement.bonusPointsAchieved).toBeLessThanOrEqual(PROCUREMENT_BONUS_CAP)
    const otherBase = result.elements
      .filter((element) => element.elementKey !== 'preferential_procurement')
      .reduce((sum, element) => sum + element.basePointsAchieved, 0)
    expect(result.totalBasePointsAchieved).toBeCloseTo(otherBase + procurement.basePointsAchieved, 6)
    expect(result.totalBasePointsAvailable).toBe(109)
  })
})

describe('procurement priority sub-minimum', () => {
  const subminimum = (element: ElementResult) =>
    evaluatePrioritySubminimums({ ruleSet: RULE_SET, elements: [element] }).find(
      (outcome) => outcome.key === 'priority.preferential_procurement',
    )!

  it('tests 40% of 25 base points only', () => {
    const element = calculatePreferentialProcurement({
      ruleSet: RULE_SET,
      snapshot: strongProcurementSnapshot(),
    })
    const outcome = subminimum(element)
    expect(outcome.basisPoints).toBe(25)
    expect(outcome.thresholdPoints).toBeCloseTo(10, 6)
    expect(outcome.achievedPoints).toBe(element.basePointsAchieved)
    expect(outcome.achievedPoints).toBeLessThanOrEqual(PROCUREMENT_BASE_CAP)
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
