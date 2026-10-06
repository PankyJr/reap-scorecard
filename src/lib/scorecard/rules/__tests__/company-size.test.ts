import { describe, expect, it } from 'vitest'
import { EMPTY_APPLICABILITY_INPUTS, evaluateApplicability } from '../../generic/applicability'

/**
 * Pins the engine's size classification and deemed levels at every boundary,
 * with the exact wording it has always used. It passes on the engine before and
 * after the numbers moved into rules/company-size.ts, which is the proof that
 * moving them changed nothing.
 */
function evaluate(annualRevenue: number | null, blackOwnershipPercentage: number | null, isStartUp: boolean | null = false) {
  return evaluateApplicability({ ...EMPTY_APPLICABILITY_INPUTS, annualRevenue, blackOwnershipPercentage, isStartUp })
}

describe('company size bands', () => {
  it.each([
    [0, 'eme'],
    [10_000_000, 'eme'],
    [10_000_001, 'qse'],
    [49_999_999, 'qse'],
    [50_000_000, 'generic'],
    [250_000_000, 'generic'],
  ])('turnover R%i is %s', (revenue, classification) => {
    expect(evaluate(revenue, 0.3).classification).toBe(classification)
  })

  it('a start-up is an EME whatever its turnover', () => {
    expect(evaluate(80_000_000, 0, true).classification).toBe('eme')
  })

  it('no turnover means the size is unknown, never guessed', () => {
    expect(evaluate(null, 0.3).classification).toBe('unresolved')
  })
})

describe('deemed (automatic) levels', () => {
  it.each([
    [5_000_000, 1, 'Level 1', 135, 'A 100% black-owned Exempted Micro-Enterprise, measured on the flow-through principle, is elevated to Level One Contributor.'],
    [5_000_000, 0.51, 'Level 2', 125, 'A Exempted Micro-Enterprise that is at least 51% black owned, measured on the flow-through principle, is elevated to Level Two Contributor.'],
    [5_000_000, 0.5, 'Level 4', 100, 'An Exempted Micro-Enterprise is deemed to be a Level Four Contributor.'],
    [5_000_000, null, 'Level 4', 100, 'An Exempted Micro-Enterprise is deemed to be a Level Four Contributor.'],
    [20_000_000, 1, 'Level 1', 135, 'A 100% black-owned Qualifying Small Enterprise, measured on the flow-through principle, is elevated to Level One Contributor.'],
    [20_000_000, 0.51, 'Level 2', 125, 'A Qualifying Small Enterprise that is at least 51% black owned, measured on the flow-through principle, is elevated to Level Two Contributor.'],
    [20_000_000, 0.5, 'Requires QSE scorecard', 0, 'A Qualifying Small Enterprise that is less than 51% black owned must be measured on the QSE scorecard, which this calculator does not implement.'],
  ])('turnover R%i, black owned %s: %s at %i%%', (revenue, owned, level, recognition, reason) => {
    expect(evaluate(revenue, owned).deemedStatus).toEqual({ level, recognitionPercentage: recognition, reason })
  })

  it('a large enterprise has no deemed level', () => {
    expect(evaluate(60_000_000, 1).deemedStatus).toBeNull()
  })
})
