import { describe, expect, it } from 'vitest'
import { GENERIC_CODES_2019_V1 as RULE_SET } from '../../rules/generic-2019/scorecard'
import {
  calculateManagementControl,
  EMPTY_MANAGEMENT_CONTROL_INPUTS,
} from '../elements/management-control'
import type { ElementResult } from '../types'
import { strongManagementControl } from './fixtures'

const indicator = (result: ElementResult, key: string) => {
  const found = result.indicators.find((candidate) => candidate.indicatorKey === key)
  if (!found) throw new Error(`indicator ${key} not found`)
  return found
}

const emptyBand = { african_male: 0, coloured_male: 0, indian_male: 0, african_female: 0, coloured_female: 0, indian_female: 0 }

describe('management control direct representation', () => {
  it('is not started when no register has been imported', () => {
    const result = calculateManagementControl({ ruleSet: RULE_SET, inputs: EMPTY_MANAGEMENT_CONTROL_INPUTS })
    expect(result.status).toBe('not_started')
    expect(result.basePointsAchieved).toBe(0)
  })

  it.each([
    ['board black people', 'management_control.board.black_people', { board: { total: 8, black: 4, blackWomen: 2 } }, 2],
    ['board black women', 'management_control.board.black_women', { board: { total: 8, black: 4, blackWomen: 2 } }, 1],
    [
      'executive directors black people',
      'management_control.executive_directors.black_people',
      { executiveDirectors: { total: 4, black: 2, blackWomen: 1 } },
      2,
    ],
    [
      'other executive management black people',
      'management_control.other_executive_management.black_people',
      { otherExecutiveManagement: { total: 10, black: 6, blackWomen: 3 } },
      2,
    ],
  ])('awards full points for %s at target', (_label, key, overrides, expected) => {
    const result = calculateManagementControl({
      ruleSet: RULE_SET,
      inputs: strongManagementControl(overrides),
    })
    expect(indicator(result, key).basePointsAchieved).toBeCloseTo(expected, 6)
  })

  it('scores proportionally below target and caps above it', () => {
    const half = calculateManagementControl({
      ruleSet: RULE_SET,
      inputs: strongManagementControl({ board: { total: 8, black: 2, blackWomen: 0 } }),
    })
    expect(indicator(half, 'management_control.board.black_people').basePointsAchieved).toBeCloseTo(1, 6)

    const over = calculateManagementControl({
      ruleSet: RULE_SET,
      inputs: strongManagementControl({ board: { total: 8, black: 8, blackWomen: 8 } }),
    })
    expect(indicator(over, 'management_control.board.black_people').basePointsAchieved).toBeCloseTo(2, 6)
    expect(indicator(over, 'management_control.board.black_women').basePointsAchieved).toBeCloseTo(1, 6)
  })

  it('reports a missing denominator rather than dividing by zero', () => {
    const result = calculateManagementControl({
      ruleSet: RULE_SET,
      inputs: strongManagementControl({ board: { total: null, black: 4, blackWomen: 2 } }),
    })
    const board = indicator(result, 'management_control.board.black_people')
    expect(board.basePointsAchieved).toBeNull()
    expect(board.status).toBe('missing_inputs')
    expect(result.status).toBe('partial')
  })

  it('treats a zero-size body as a missing denominator', () => {
    const result = calculateManagementControl({
      ruleSet: RULE_SET,
      inputs: strongManagementControl({ executiveDirectors: { total: 0, black: 0, blackWomen: 0 } }),
    })
    expect(indicator(result, 'management_control.executive_directors.black_people').basePointsAchieved).toBeNull()
  })
})

describe('management control EAP disaggregation', () => {
  it('requires an EAP target set before scoring the occupational bands', () => {
    const result = calculateManagementControl({
      ruleSet: RULE_SET,
      inputs: strongManagementControl({ eapDistribution: null, eapTargetSetLabel: null }),
    })
    expect(indicator(result, 'management_control.senior_management.black_people').basePointsAchieved).toBeNull()
    expect(result.missingInputs).toContain(
      'EAP target set (required for senior, middle and junior management)',
    )
  })

  it('awards full points when every sub-race band meets its EAP-weighted share', () => {
    const result = calculateManagementControl({ ruleSet: RULE_SET, inputs: strongManagementControl() })
    expect(indicator(result, 'management_control.senior_management.black_people').basePointsAchieved).toBeCloseTo(2, 6)
    expect(indicator(result, 'management_control.middle_management.black_people').basePointsAchieved).toBeCloseTo(2, 6)
  })

  it('caps each sub-race band so one over-represented group cannot mask another', () => {
    const skewed = calculateManagementControl({
      ruleSet: RULE_SET,
      inputs: strongManagementControl({
        seniorManagement: {
          total: 100,
          byDemographic: { ...emptyBand, african_male: 100 },
        },
      }),
    })
    const senior = indicator(skewed, 'management_control.senior_management.black_people')
    // African males alone can only contribute their own EAP-weighted share.
    expect(senior.basePointsAchieved!).toBeLessThan(2)
    expect(senior.eapBands?.length).toBe(6)
    const africanMale = senior.eapBands!.find((band) => band.bandKey === 'african_male')!
    expect(africanMale.pointsAwarded).toBeCloseTo(africanMale.maximumBandPoints, 2)
    const indianFemale = senior.eapBands!.find((band) => band.bandKey === 'indian_female')!
    expect(indianFemale.pointsAwarded).toBe(0)
  })

  it('scores black women bands against the female EAP sub-total only', () => {
    const result = calculateManagementControl({ ruleSet: RULE_SET, inputs: strongManagementControl() })
    const women = indicator(result, 'management_control.senior_management.black_women')
    expect(women.eapBands?.map((band) => band.bandKey)).toEqual([
      'african_female',
      'coloured_female',
      'indian_female',
    ])
  })

  it('scores junior management at one point each', () => {
    const result = calculateManagementControl({ ruleSet: RULE_SET, inputs: strongManagementControl() })
    expect(indicator(result, 'management_control.junior_management.black_people').basePointsAvailable).toBe(1)
    expect(indicator(result, 'management_control.junior_management.black_women').basePointsAvailable).toBe(1)
  })
})

describe('management control disability indicator', () => {
  it.each([
    ['zero', 0, 0],
    ['half of the 2% target', 4, 1],
    ['at the 2% target', 8, 2],
    ['above the target', 40, 2],
  ])('scores black employees with disabilities: %s', (_label, count, expected) => {
    const result = calculateManagementControl({
      ruleSet: RULE_SET,
      inputs: strongManagementControl({ blackEmployeesWithDisabilities: count, totalEmployees: 400 }),
    })
    expect(
      indicator(result, 'management_control.employees_with_disabilities.black_people').basePointsAchieved,
    ).toBeCloseTo(expected, 6)
  })

  it('cannot score disability without a total employee denominator', () => {
    const result = calculateManagementControl({
      ruleSet: RULE_SET,
      inputs: strongManagementControl({ totalEmployees: null }),
    })
    expect(
      indicator(result, 'management_control.employees_with_disabilities.black_people').basePointsAchieved,
    ).toBeNull()
  })
})

describe('management control privacy', () => {
  it('exposes only counts, never personal records', () => {
    const result = calculateManagementControl({ ruleSet: RULE_SET, inputs: strongManagementControl() })
    const serialised = JSON.stringify(result)
    expect(serialised).not.toMatch(/idNumber|identityNumber|\bsurname\b/i)
    for (const value of Object.values(result.indicators)) {
      expect(typeof value.numerator === 'number' || value.numerator === null).toBe(true)
    }
  })
})
