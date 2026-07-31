import { describe, expect, it } from 'vitest'
import { GENERIC_CODES_2019_V1 as RULE_SET } from '../../rules/generic-2019/scorecard'
import { calculateGenericScorecard, PARTIAL_RESULT_MESSAGE } from '..'
import { discountLevelByOne, resolveLevel } from '../aggregate'
import { completeScorecardInputs, grantContribution, strongProcurementSnapshot } from './fixtures'

describe('level bands', () => {
  it.each([
    [140, 'Level 1', 135],
    [111, 'Level 1', 135],
    [100, 'Level 1', 135],
    [99.99, 'Level 2', 125],
    [95, 'Level 2', 125],
    [94.99, 'Level 3', 110],
    [90, 'Level 3', 110],
    [89.99, 'Level 4', 100],
    [80, 'Level 4', 100],
    [79.99, 'Level 5', 80],
    [75, 'Level 5', 80],
    [74.99, 'Level 6', 60],
    [70, 'Level 6', 60],
    [69.99, 'Level 7', 50],
    [55, 'Level 7', 50],
    [54.99, 'Level 8', 10],
    [40, 'Level 8', 10],
    [39.99, 'Non-compliant', 0],
    [0, 'Non-compliant', 0],
    [-5, 'Non-compliant', 0],
  ])('scores %s as %s at %i%% recognition', (points, level, recognition) => {
    const outcome = resolveLevel(RULE_SET.levelBands, points)
    expect(outcome.level).toBe(level)
    expect(outcome.recognitionPercentage).toBe(recognition)
  })

  it('falls back to non-compliant when there is no total', () => {
    expect(resolveLevel(RULE_SET.levelBands, null).level).toBe('Non-compliant')
  })
})

describe('one-level discounting', () => {
  it.each([
    ['Level 1', 'Level 2'],
    ['Level 2', 'Level 3'],
    ['Level 4', 'Level 5'],
    ['Level 7', 'Level 8'],
    ['Level 8', 'Non-compliant'],
  ])('discounts %s to %s', (from, to) => {
    const band = RULE_SET.levelBands.find((candidate) => candidate.level === from)!
    const discounted = discountLevelByOne(RULE_SET.levelBands, {
      level: band.level,
      recognitionPercentage: band.recognitionPercentage,
    })
    expect(discounted.level).toBe(to)
  })

  it('cannot discount below non-compliant', () => {
    const discounted = discountLevelByOne(RULE_SET.levelBands, { level: 'Non-compliant', recognitionPercentage: 0 })
    expect(discounted.level).toBe('Non-compliant')
  })
})

describe('complete generic scorecard', () => {
  it('produces a final level, separates base from bonus, and reports readiness', () => {
    const result = calculateGenericScorecard(completeScorecardInputs())

    expect(result.ruleSetKey).toBe('generic-codes-2019-v1')
    expect(result.ruleSetVersion).toBe(RULE_SET.version)
    expect(result.totalBasePointsAvailable).toBe(111)
    expect(result.totalBonusPointsAvailable).toBe(9)
    expect(result.rawTotalPoints).toBeCloseTo(
      result.totalBasePointsAchieved + result.totalBonusPointsAchieved,
      6,
    )
    expect(result.elements).toHaveLength(7)
    expect(result.readiness.complete).toBe(true)
    expect(result.readiness.reasons).toEqual([])
    expect(result.discountApplied).toBe(false)
    expect(result.finalLevel.level).toBe(result.preliminaryLevel.level)
    expect(result.headlineMessage).toMatch(/B-BBEE recognition/)
    expect(result.calculatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('evaluates all five priority sub-minimums', () => {
    const result = calculateGenericScorecard(completeScorecardInputs())
    expect(result.prioritySubminimums.map((outcome) => outcome.key).sort()).toEqual([
      'priority.enterprise_development',
      'priority.ownership.net_value',
      'priority.preferential_procurement',
      'priority.skills_development',
      'priority.supplier_development',
    ])
    expect(result.prioritySubminimums.every((outcome) => outcome.evaluated)).toBe(true)
  })

  it('discounts by exactly one level when a single sub-minimum fails', () => {
    const baseline = calculateGenericScorecard(completeScorecardInputs())
    const failing = calculateGenericScorecard(
      completeScorecardInputs({
        supplierDevelopment: { records: [grantContribution({ id: 'sd-1', actualValue: 1 })] },
      }),
    )

    expect(failing.discountApplied).toBe(true)
    expect(failing.failedPriorityKeys).toEqual(['priority.supplier_development'])
    const preliminaryIndex = RULE_SET.levelBands.findIndex(
      (band) => band.level === failing.preliminaryLevel.level,
    )
    const finalIndex = RULE_SET.levelBands.findIndex((band) => band.level === failing.finalLevel.level)
    expect(finalIndex - preliminaryIndex).toBe(1)
    expect(failing.warnings.join(' ')).toMatch(/discounted to/i)
    expect(baseline.discountApplied).toBe(false)
  })

  it('still discounts by only one level when several sub-minimums fail', () => {
    const result = calculateGenericScorecard(
      completeScorecardInputs({
        supplierDevelopment: { records: [grantContribution({ id: 'sd-1', actualValue: 1 })] },
        enterpriseDevelopment: { records: [grantContribution({ id: 'ed-1', actualValue: 1 })] },
        procurementSnapshot: strongProcurementSnapshot({
          totalMeasuredProcurementSpend: 100_000_000,
          recognisedSpend: { 'preferential_procurement.all_empowering_suppliers': 1_000_000 },
        }),
      }),
    )
    expect(result.failedPriorityKeys.length).toBeGreaterThan(1)
    const preliminaryIndex = RULE_SET.levelBands.findIndex(
      (band) => band.level === result.preliminaryLevel.level,
    )
    const finalIndex = RULE_SET.levelBands.findIndex((band) => band.level === result.finalLevel.level)
    expect(finalIndex - preliminaryIndex).toBe(1)
  })

  it('preserves the points actually achieved when a level is discounted', () => {
    const inputs = completeScorecardInputs({
      supplierDevelopment: { records: [grantContribution({ id: 'sd-1', actualValue: 1 })] },
    })
    const result = calculateGenericScorecard(inputs)
    const supplierDevelopment = result.elements.find(
      (element) => element.elementKey === 'supplier_development',
    )!
    expect(supplierDevelopment.basePointsAchieved).toBeGreaterThanOrEqual(0)
    expect(result.rawTotalPoints).toBeCloseTo(
      result.elements.reduce(
        (sum, element) => sum + element.basePointsAchieved + element.bonusPointsAchieved,
        0,
      ),
      2,
    )
  })

  it('recovers the original level once the failed element is fixed', () => {
    const failing = calculateGenericScorecard(
      completeScorecardInputs({
        supplierDevelopment: { records: [grantContribution({ id: 'sd-1', actualValue: 1 })] },
      }),
    )
    const fixed = calculateGenericScorecard(completeScorecardInputs())
    expect(failing.discountApplied).toBe(true)
    expect(fixed.discountApplied).toBe(false)
    expect(fixed.finalLevel.level).not.toBe(failing.finalLevel.level)
  })
})

describe('partial results', () => {
  it('refuses a final level when an element is out of scope', () => {
    const result = calculateGenericScorecard(
      completeScorecardInputs({ elementKeys: ['socio_economic_development'] }),
    )
    expect(result.elements).toHaveLength(1)
    expect(result.readiness.complete).toBe(false)
    expect(result.readiness.reasons.join(' ')).toMatch(/1 of 7 elements/)
    expect(result.headlineMessage).toBe(PARTIAL_RESULT_MESSAGE)
  })

  it('refuses a final level when no procurement assessment is attached', () => {
    const result = calculateGenericScorecard(completeScorecardInputs({ procurementSnapshot: null }))
    expect(result.readiness.complete).toBe(false)
    expect(result.readiness.reasons.join(' ')).toMatch(/Preferential Procurement is not started/i)
    expect(result.headlineMessage).toBe(PARTIAL_RESULT_MESSAGE)
  })

  it('refuses a final level when a sector code applies', () => {
    const inputs = completeScorecardInputs()
    const result = calculateGenericScorecard({
      ...inputs,
      applicability: { ...inputs.applicability, sectorCodeApplies: true, sectorCodeName: 'Tourism Sector Code' },
    })
    expect(result.readiness.complete).toBe(false)
    expect(result.readiness.reasons.join(' ')).toMatch(/Tourism Sector Code/)
  })

  it('refuses a final level when the NPAT denominator needs confirmation', () => {
    const inputs = completeScorecardInputs()
    const result = calculateGenericScorecard({
      ...inputs,
      financial: { ...inputs.financial, industryNpatMargin: null },
    })
    expect(result.npat.requiresAuthorisedConfirmation).toBe(true)
    expect(result.readiness.complete).toBe(false)
    expect(result.warnings.join(' ')).toMatch(/requires authorised confirmation/i)
  })

  it('refuses a final level under the reserved 2026 draft', () => {
    const result = calculateGenericScorecard(
      completeScorecardInputs({
        ruleSetKey: 'generic-codes-2026-draft',
        allowNonProductionDraft: true,
      }),
    )
    expect(result.ruleSetOperative).toBe(false)
    expect(result.readiness.complete).toBe(false)
    expect(result.headlineMessage).toBe(PARTIAL_RESULT_MESSAGE)
  })

  it('accepts explicit external readiness blockers', () => {
    const result = calculateGenericScorecard(
      completeScorecardInputs({
        additionalReadinessBlockers: ['A Management Control import is still awaiting review.'],
      }),
    )
    expect(result.readiness.complete).toBe(false)
    expect(result.readiness.reasons).toContain('A Management Control import is still awaiting review.')
  })
})

describe('audit snapshot', () => {
  it('carries everything a calculation run must store', () => {
    const result = calculateGenericScorecard(completeScorecardInputs())
    expect(result).toMatchObject({
      ruleSetKey: expect.any(String),
      ruleSetVersion: expect.any(String),
      ruleSetDisplayName: expect.any(String),
      totalBasePointsAchieved: expect.any(Number),
      totalBonusPointsAchieved: expect.any(Number),
      rawTotalPoints: expect.any(Number),
      calculatedAt: expect.any(String),
    })
    expect(result.npat.selection).toBeTruthy()
    expect(result.contributionTargets.supplierDevelopment).toBeCloseTo(400_000, 2)
    for (const element of result.elements) {
      for (const indicator of element.indicators) {
        expect(indicator.ruleSource.citation.length).toBeGreaterThan(10)
        expect(indicator.explanation.length).toBeGreaterThan(5)
      }
    }
  })
})
