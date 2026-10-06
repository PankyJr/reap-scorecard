import { describe, expect, it } from 'vitest'
import { loadProcurementSizeClass, procurementSizeClassFromApplicability } from '../companySize'

describe('procurementSizeClassFromApplicability', () => {
  it('reads the size from the full scorecard’s turnover', () => {
    expect(procurementSizeClassFromApplicability({ annualRevenue: 5_000_000 })).toBe('eme')
    expect(procurementSizeClassFromApplicability({ annualRevenue: 30_000_000 })).toBe('qse')
    expect(procurementSizeClassFromApplicability({ annualRevenue: 80_000_000 })).toBe('generic')
  })

  it('does not guess when turnover is missing', () => {
    expect(procurementSizeClassFromApplicability(null)).toBe('unknown')
    expect(procurementSizeClassFromApplicability({})).toBe('unknown')
    expect(procurementSizeClassFromApplicability('x')).toBe('unknown')
  })

  it('uses the Generic targets for a QSE that chose the full Generic scorecard', () => {
    expect(
      procurementSizeClassFromApplicability({
        annualRevenue: 30_000_000,
        fullScorecardElection: { elected: true, reason: 'tender', evidence: null, electedBy: 'u', electedAt: '2026-01-01' },
      }),
    ).toBe('generic')
  })
})

describe('loadProcurementSizeClass', () => {
  function client(data: unknown, error: unknown = null) {
    const chain = {
      select: () => chain,
      eq: () => chain,
      not: () => chain,
      order: () => chain,
      limit: () => Promise.resolve({ data, error }),
    }
    return { from: () => chain }
  }

  it('takes the newest full scorecard that has a turnover', async () => {
    expect(
      await loadProcurementSizeClass(client([{ applicability_snapshot: {} }, { applicability_snapshot: { annualRevenue: 20_000_000 } }]), 'c'),
    ).toBe('qse')
  })

  it('is unknown when the database cannot say (for example, no full scorecard columns)', async () => {
    expect(await loadProcurementSizeClass(client(null, { code: '42703' }), 'c')).toBe('unknown')
    expect(await loadProcurementSizeClass(client([]), 'c')).toBe('unknown')
  })
})
