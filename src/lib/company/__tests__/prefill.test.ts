import { describe, expect, it } from 'vitest'
import { prefillApplicability, suggestedScorecardYear } from '../prefill'

const company = { industry: 'Manufacturing', financial_year_end_month: 2, annual_turnover: '30000000', black_ownership_percentage: '51' }

describe('suggested scorecard year', () => {
  it('is the latest financial year that has ended', () => {
    const october2026 = new Date(2026, 9, 6)
    expect(suggestedScorecardYear(2, october2026)).toBe(2026)
    expect(suggestedScorecardYear(9, october2026)).toBe(2026)
    expect(suggestedScorecardYear(10, october2026)).toBe(2025)
    expect(suggestedScorecardYear(12, october2026)).toBe(2025)
    expect(suggestedScorecardYear(null, october2026)).toBe(2026)
  })
})

describe('pre-filled company size for a new scorecard', () => {
  it('copies last year’s figures when there is an earlier scorecard', () => {
    const { snapshot, source } = prefillApplicability({
      measurementYear: 2026,
      company,
      previous: {
        measurement_year: 2025,
        applicability_snapshot: { annualRevenue: 28_000_000, blackOwnershipPercentage: 0.4, sector: 'Manufacturing', entityType: 'Private company', sectorCodeApplies: false },
      },
    })
    expect(source).toEqual({ kind: 'previous_scorecard', year: 2025 })
    expect(snapshot).toMatchObject({ annualRevenue: 28_000_000, blackOwnershipPercentage: 0.4, entityType: 'Private company' })
    expect(snapshot.measurementPeriodStart).toBe('2025-03-01')
    expect(snapshot.measurementPeriodEnd).toBe('2026-02-28')
  })

  it('never pre-fills whether a sector code applies: that must be confirmed', () => {
    const { snapshot } = prefillApplicability({
      measurementYear: 2026,
      company,
      previous: { measurement_year: 2025, applicability_snapshot: { annualRevenue: 1, sectorCodeApplies: false } },
    })
    expect(snapshot.sectorCodeApplies).toBeNull()
  })

  it('falls back to the company’s details, ownership as a fraction', () => {
    const { snapshot, source } = prefillApplicability({ measurementYear: 2026, company, previous: null })
    expect(source).toEqual({ kind: 'company_details' })
    expect(snapshot).toMatchObject({ annualRevenue: 30_000_000, blackOwnershipPercentage: 0.51, sector: 'Manufacturing' })
  })

  it('fills nothing it does not know', () => {
    const { snapshot, source } = prefillApplicability({
      measurementYear: 2026,
      company: { industry: null, financial_year_end_month: null, annual_turnover: null, black_ownership_percentage: null },
      previous: null,
    })
    expect(source).toBeNull()
    expect(snapshot.annualRevenue).toBeNull()
    expect(snapshot.measurementPeriodStart).toBeNull()
  })
})
