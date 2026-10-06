import { describe, expect, it } from 'vitest'
import {
  computeDeemedNpat,
  contributionTargets,
  DEEMED_NPAT_INDUSTRY_FRACTION,
  EMPTY_FINANCIAL_INPUTS,
  missingFinancialInputs,
  resolveNpatDenominator,
} from '../financial'
import { evaluateApplicability } from '../applicability'
import { genericApplicability, healthyFinancials } from './fixtures'

describe('deemed NPAT', () => {
  it('is a quarter of the industry margin applied to revenue', () => {
    expect(DEEMED_NPAT_INDUSTRY_FRACTION).toBe(0.25)
    expect(computeDeemedNpat({ revenue: 250_000_000, industryNpatMargin: 0.0573 })).toBeCloseTo(3_581_250, 2)
  })

  it('cannot be computed without revenue or a margin', () => {
    expect(computeDeemedNpat({ revenue: null, industryNpatMargin: 0.0573 })).toBeNull()
    expect(computeDeemedNpat({ revenue: 100, industryNpatMargin: null })).toBeNull()
  })
})

describe('applicable NPAT denominator', () => {
  it('uses actual NPAT when it exceeds the deemed NPAT', () => {
    const result = resolveNpatDenominator(healthyFinancials())
    expect(result.selection).toBe('actual')
    expect(result.applicableNpat).toBe(20_000_000)
    expect(result.requiresAuthorisedConfirmation).toBe(false)
    expect(result.reason).toMatch(/at least equal to the deemed NPAT/i)
  })

  it('uses deemed NPAT when the entity underperforms the industry norm', () => {
    const result = resolveNpatDenominator(healthyFinancials({ actualNpat: 1_000_000 }))
    expect(result.selection).toBe('deemed')
    expect(result.applicableNpat).toBeCloseTo(3_581_250, 2)
    expect(result.reason).toMatch(/below a quarter of the/i)
  })

  it('uses deemed NPAT when the entity made a loss', () => {
    const result = resolveNpatDenominator(healthyFinancials({ actualNpat: -5_000_000 }))
    expect(result.selection).toBe('deemed')
    expect(result.applicableNpat).toBeCloseTo(3_581_250, 2)
  })

  it('refuses to resolve a loss-making entity with no industry norm', () => {
    const result = resolveNpatDenominator(
      healthyFinancials({ actualNpat: -5_000_000, industryNpatMargin: null }),
    )
    expect(result.selection).toBe('unresolved')
    expect(result.applicableNpat).toBeNull()
    expect(result.requiresAuthorisedConfirmation).toBe(true)
  })

  it('flags actual NPAT for confirmation when no industry norm is available to compare against', () => {
    const result = resolveNpatDenominator(healthyFinancials({ industryNpatMargin: null }))
    expect(result.selection).toBe('actual')
    expect(result.requiresAuthorisedConfirmation).toBe(true)
    expect(result.warnings.join(' ')).toMatch(/authorised user should confirm/i)
  })

  it('never silently chooses a value when nothing has been captured', () => {
    const result = resolveNpatDenominator(EMPTY_FINANCIAL_INPUTS)
    expect(result.selection).toBe('unresolved')
    expect(result.applicableNpat).toBeNull()
    expect(result.requiresAuthorisedConfirmation).toBe(true)
  })

  it('honours an authorised override and records who made it and why', () => {
    const result = resolveNpatDenominator(
      healthyFinancials({
        npatOverride: {
          selection: 'authorised_override',
          value: 12_500_000,
          reason: 'Restated annual financial statements.',
          overriddenBy: 'synthetic-admin',
          overriddenAt: '2026-04-02T08:00:00.000Z',
        },
      }),
    )
    expect(result.selection).toBe('authorised_override')
    expect(result.applicableNpat).toBe(12_500_000)
    expect(result.requiresAuthorisedConfirmation).toBe(false)
    expect(result.reason).toMatch(/synthetic-admin/)
    expect(result.reason).toMatch(/Restated annual financial statements/)
  })

  it('rejects an override that does not resolve to a usable value', () => {
    const result = resolveNpatDenominator(
      healthyFinancials({
        actualNpat: null,
        npatOverride: {
          selection: 'actual',
          value: null,
          reason: 'Use actual.',
          overriddenBy: 'synthetic-admin',
          overriddenAt: '2026-04-02T08:00:00.000Z',
        },
      }),
    )
    expect(result.selection).toBe('unresolved')
    expect(result.requiresAuthorisedConfirmation).toBe(true)
  })
})

describe('contribution targets', () => {
  it('derives 1%, 2% and 1% of the applicable NPAT', () => {
    const targets = contributionTargets(20_000_000)
    expect(targets.enterpriseDevelopment).toBeCloseTo(200_000, 2)
    expect(targets.supplierDevelopment).toBeCloseTo(400_000, 2)
    expect(targets.socioEconomicDevelopment).toBeCloseTo(200_000, 2)
  })

  it('produces no targets without a denominator', () => {
    expect(contributionTargets(null)).toEqual({
      enterpriseDevelopment: null,
      supplierDevelopment: null,
      socioEconomicDevelopment: null,
    })
  })
})

describe('missing financial inputs', () => {
  it('lists every required field when nothing is captured', () => {
    const missing = missingFinancialInputs(EMPTY_FINANCIAL_INPUTS)
    expect(missing).toEqual(
      expect.arrayContaining([
        'Measurement period',
        'Annual revenue',
        'Actual NPAT',
        'Leviable amount',
        'Total employees',
        'Industry classification',
        'Industry NPAT margin',
        'Industry profit norm source',
      ]),
    )
  })

  it('is empty for a complete set', () => {
    expect(missingFinancialInputs(healthyFinancials())).toEqual([])
  })
})

describe('generic-code applicability gate', () => {
  it('classifies a large enterprise and allows a final generic level', () => {
    const result = evaluateApplicability(genericApplicability())
    expect(result.classification).toBe('generic')
    expect(result.mayProduceGenericFinalLevel).toBe(true)
    expect(result.blockingReasons).toEqual([])
  })

  it.each([
    ['an EME below R10 million', 5_000_000, 'eme'],
    ['a QSE between R10 million and R50 million', 30_000_000, 'qse'],
    ['a generic entity above R50 million', 60_000_000, 'generic'],
  ])('classifies %s', (_label, annualRevenue, expected) => {
    expect(evaluateApplicability(genericApplicability({ annualRevenue })).classification).toBe(expected)
  })

  it('cannot classify without revenue', () => {
    const result = evaluateApplicability(genericApplicability({ annualRevenue: null }))
    expect(result.classification).toBe('unresolved')
    expect(result.mayProduceGenericFinalLevel).toBe(false)
  })

  it('blocks a generic-code level when a sector code applies', () => {
    const result = evaluateApplicability(
      genericApplicability({ sectorCodeApplies: true, sectorCodeName: 'Construction Sector Code' }),
    )
    expect(result.mayProduceGenericFinalLevel).toBe(false)
    expect(result.blockingReasons.join(' ')).toMatch(/Construction Sector Code/)
  })

  it('gives an EME a deemed status rather than forcing generic scoring', () => {
    const result = evaluateApplicability(
      genericApplicability({ annualRevenue: 5_000_000, blackOwnershipPercentage: 0.6 }),
    )
    expect(result.classification).toBe('eme')
    expect(result.deemedStatus).not.toBeNull()
    expect(result.mayProduceGenericFinalLevel).toBe(false)
  })

  it.each([
    ['100% black owned', 1, 'Level 1'],
    ['at least 51% black owned', 0.6, 'Level 2'],
    ['less than 51% black owned', 0.3, 'Level 4'],
  ])('recognises an EME that is %s', (_label, blackOwnershipPercentage, expectedLevel) => {
    const result = evaluateApplicability(
      genericApplicability({ annualRevenue: 5_000_000, blackOwnershipPercentage }),
    )
    expect(result.deemedStatus?.level).toBe(expectedLevel)
  })

  it('treats a start-up as an EME regardless of revenue', () => {
    const result = evaluateApplicability(
      genericApplicability({ annualRevenue: 200_000_000, isStartUp: true }),
    )
    expect(result.classification).toBe('eme')
    expect(result.classificationReason).toMatch(/start-up/i)
  })

  it('allows an authorised full-scorecard election with a recorded reason', () => {
    const result = evaluateApplicability(
      genericApplicability({
        annualRevenue: 30_000_000,
        fullScorecardElection: {
          elected: true,
          reason: 'The client requires a generic scorecard for a tender.',
          electedBy: 'synthetic-admin',
          electedAt: '2026-04-02T08:00:00.000Z',
          evidence: 'Tender requirement letter',
        },
      }),
    )
    expect(result.classification).toBe('qse')
    expect(result.mayProduceGenericFinalLevel).toBe(true)
    expect(result.warnings.join(' ')).toMatch(/synthetic-admin/)
  })

  it('rejects an election with no recorded reason', () => {
    const result = evaluateApplicability(
      genericApplicability({
        annualRevenue: 30_000_000,
        fullScorecardElection: {
          elected: true,
          reason: '',
          electedBy: 'synthetic-admin',
          electedAt: '2026-04-02T08:00:00.000Z',
          evidence: null,
        },
      }),
    )
    expect(result.mayProduceGenericFinalLevel).toBe(false)
    expect(result.blockingReasons.join(' ')).toMatch(/reason/i)
  })
})
