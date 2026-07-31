import { describe, expect, it } from 'vitest'
import { GENERIC_CODES_2019_V1 as RULE_SET } from '../../rules/generic-2019/scorecard'
import { calculateOwnership, EMPTY_OWNERSHIP_INPUTS, netValuePointsFrom } from '../elements/ownership'
import { evaluatePrioritySubminimums } from '../aggregate'
import { fullOwnership } from './fixtures'

const indicator = (result: ReturnType<typeof calculateOwnership>, key: string) => {
  const found = result.indicators.find((candidate) => candidate.indicatorKey === key)
  if (!found) throw new Error(`indicator ${key} not found`)
  return found
}

describe('ownership scoring', () => {
  it('returns missing inputs and no points when nothing is captured', () => {
    const result = calculateOwnership({ ruleSet: RULE_SET, inputs: EMPTY_OWNERSHIP_INPUTS })
    expect(result.status).toBe('not_started')
    expect(result.basePointsAchieved).toBe(0)
    expect(result.indicators.every((candidate) => candidate.basePointsAchieved === null)).toBe(true)
    expect(result.missingInputs.length).toBeGreaterThan(0)
  })

  it.each([
    ['zero', 0, 0],
    ['half of target', 0.125, 2],
    ['exactly at target', 0.25, 4],
    ['overachievement is capped', 0.6, 4],
  ])('scores black economic interest with %s', (_label, actual, expected) => {
    const result = calculateOwnership({
      ruleSet: RULE_SET,
      inputs: fullOwnership({ blackEconomicInterestPercentage: actual }),
    })
    expect(indicator(result, 'ownership.economic_interest.black_people').basePointsAchieved).toBeCloseTo(expected, 6)
  })

  it.each([
    ['zero', 0, 0],
    ['half of target', 0.05, 1],
    ['at target', 0.1, 2],
    ['above target', 0.3, 2],
  ])('scores black women economic interest with %s', (_label, actual, expected) => {
    const result = calculateOwnership({
      ruleSet: RULE_SET,
      inputs: fullOwnership({ blackWomenEconomicInterestPercentage: actual }),
    })
    expect(indicator(result, 'ownership.economic_interest.black_women').basePointsAchieved).toBeCloseTo(expected, 6)
  })

  it('scores designated groups and new entrants against their own targets', () => {
    const result = calculateOwnership({
      ruleSet: RULE_SET,
      inputs: fullOwnership({
        designatedGroupsEconomicInterestPercentage: 0.015,
        newEntrantsEconomicInterestPercentage: 0.01,
      }),
    })
    expect(indicator(result, 'ownership.economic_interest.designated_groups').basePointsAchieved).toBeCloseTo(1.5, 6)
    expect(indicator(result, 'ownership.new_entrants').basePointsAchieved).toBeCloseTo(1, 6)
  })

  describe('25% plus one vote', () => {
    it('uses an exact vote count when share counts are supplied', () => {
      const result = calculateOwnership({
        ruleSet: RULE_SET,
        inputs: fullOwnership({ totalExercisableVotes: 1000, blackExercisableVotes: 251 }),
      })
      const votes = indicator(result, 'ownership.voting_rights.black_people')
      expect(votes.target).toBeCloseTo(0.251, 10)
      expect(votes.basePointsAchieved).toBeCloseTo(4, 6)
      expect(votes.warnings.join(' ')).not.toMatch(/approximat/i)
    })

    it('fails full points at exactly 25% of the votes', () => {
      const result = calculateOwnership({
        ruleSet: RULE_SET,
        inputs: fullOwnership({ totalExercisableVotes: 1000, blackExercisableVotes: 250 }),
      })
      const votes = indicator(result, 'ownership.voting_rights.black_people')
      expect(votes.basePointsAchieved!).toBeLessThan(4)
      expect(votes.basePointsAchieved!).toBeCloseTo(3.98, 2)
    })

    it('documents the approximation when only a percentage is supplied', () => {
      const result = calculateOwnership({
        ruleSet: RULE_SET,
        inputs: fullOwnership({
          totalExercisableVotes: null,
          blackExercisableVotes: null,
          blackVotingRightsPercentage: 0.3,
        }),
      })
      const votes = indicator(result, 'ownership.voting_rights.black_people')
      expect(votes.target).toBeCloseTo(0.251, 10)
      expect(votes.warnings.join(' ')).toMatch(/approximated as 25\.1%/i)
      expect(result.warnings.join(' ')).toMatch(/exact exercisable vote counts were not supplied/i)
    })
  })

  it('flags absent evidence and measurement date as missing inputs', () => {
    const result = calculateOwnership({
      ruleSet: RULE_SET,
      inputs: fullOwnership({ evidenceSource: null, measurementDate: null }),
    })
    expect(result.missingInputs).toContain('Ownership evidence source')
    expect(result.missingInputs).toContain('Ownership measurement date')
    expect(result.status).toBe('partial')
  })

  it('records modified flow-through and exclusion principles for the audit trail', () => {
    const result = calculateOwnership({
      ruleSet: RULE_SET,
      inputs: fullOwnership({ modifiedFlowThroughApplied: true, exclusionPrincipleApplied: true }),
    })
    expect(result.warnings.join(' ')).toMatch(/modified flow-through/i)
    expect(result.warnings.join(' ')).toMatch(/exclusion principle/i)
  })

  it('never invents net value when it has not been captured', () => {
    const result = calculateOwnership({
      ruleSet: RULE_SET,
      inputs: fullOwnership({ netValuePercentage: null }),
    })
    const netValue = indicator(result, 'ownership.net_value')
    expect(netValue.basePointsAchieved).toBeNull()
    expect(netValue.status).toBe('missing_inputs')
    expect(netValuePointsFrom(result)).toBeNull()
    expect(result.missingInputs.join(' ')).toMatch(/verified net value percentage has not been captured/i)
  })
})

describe('ownership net value priority sub-minimum', () => {
  const subminimum = (netValuePercentage: number | null) => {
    const element = calculateOwnership({ ruleSet: RULE_SET, inputs: fullOwnership({ netValuePercentage }) })
    return evaluatePrioritySubminimums({ ruleSet: RULE_SET, elements: [element] }).find(
      (outcome) => outcome.key === 'priority.ownership.net_value',
    )!
  }

  it('passes at exactly 40% of the eight net value points', () => {
    const outcome = subminimum(0.1)
    expect(outcome.achievedPoints).toBeCloseTo(3.2, 6)
    expect(outcome.thresholdPoints).toBeCloseTo(3.2, 6)
    expect(outcome.passed).toBe(true)
  })

  it('fails just below the threshold', () => {
    const outcome = subminimum(0.09)
    expect(outcome.passed).toBe(false)
    expect(outcome.explanation).toMatch(/discounted by one level/i)
  })

  it('cannot be tested when net value is missing', () => {
    const outcome = subminimum(null)
    expect(outcome.evaluated).toBe(false)
    expect(outcome.passed).toBeNull()
  })
})
