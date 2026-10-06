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
  function client(scorecards: { data: unknown; error?: unknown }, company: { data: unknown; error?: unknown } = { data: null }) {
    const scorecardChain = {
      select: () => scorecardChain,
      eq: () => scorecardChain,
      not: () => scorecardChain,
      order: () => scorecardChain,
      limit: () => Promise.resolve({ data: scorecards.data, error: scorecards.error ?? null }),
    }
    const companyChain = {
      select: () => companyChain,
      eq: () => companyChain,
      maybeSingle: () => Promise.resolve({ data: company.data, error: company.error ?? null }),
    }
    return { from: (table: string) => (table === 'companies' ? companyChain : scorecardChain) }
  }

  it('takes the newest full scorecard that has a turnover', async () => {
    expect(
      await loadProcurementSizeClass(
        client({ data: [{ applicability_snapshot: {} }, { applicability_snapshot: { annualRevenue: 20_000_000 } }] }),
        'c',
      ),
    ).toBe('qse')
  })

  it('falls back to the turnover on the company’s details', async () => {
    expect(await loadProcurementSizeClass(client({ data: [] }, { data: { annual_turnover: '4000000' } }), 'c')).toBe('eme')
  })

  it('is unknown when the database cannot say (for example, the columns are not there yet)', async () => {
    expect(await loadProcurementSizeClass(client({ data: null, error: { code: '42703' } }, { data: null, error: { code: '42703' } }), 'c')).toBe(
      'unknown',
    )
    expect(await loadProcurementSizeClass(client({ data: [] }, { data: { annual_turnover: null } }), 'c')).toBe('unknown')
  })
})
