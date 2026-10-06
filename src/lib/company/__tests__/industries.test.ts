import { describe, expect, it } from 'vitest'
import { findIndustry, measurementPeriodFor, parsePercent, parseRand } from '../industries'

describe('company form values', () => {
  it('reads rand amounts the way people type them', () => {
    expect(parseRand('R30 000 000')).toBe(30_000_000)
    expect(parseRand('30,000,000')).toBe(30_000_000)
    expect(parseRand('')).toBeNull()
    expect(parseRand('-5')).toBeNull()
    expect(parseRand('abc')).toBeNull()
  })

  it('reads a percentage and refuses anything outside 0 to 100', () => {
    expect(parsePercent('40')).toBe(40)
    expect(parsePercent('40%')).toBe(40)
    expect(parsePercent('51,5')).toBe(51.5)
    expect(parsePercent('101')).toBeNull()
    expect(parsePercent('')).toBeNull()
  })

  it('finds a listed industry, and treats older free-text values as unlisted', () => {
    expect(findIndustry('Manufacturing')?.mayHaveSectorCode).toBe(false)
    expect(findIndustry('Construction')?.mayHaveSectorCode).toBe(true)
    expect(findIndustry('Widgets')).toBeNull()
  })

  it('works out the financial year that ends in the scorecard year', () => {
    expect(measurementPeriodFor(2026, 2)).toEqual({ start: '2025-03-01', end: '2026-02-28' })
    expect(measurementPeriodFor(2024, 2)).toEqual({ start: '2023-03-01', end: '2024-02-29' })
    expect(measurementPeriodFor(2026, 12)).toEqual({ start: '2026-01-01', end: '2026-12-31' })
    expect(measurementPeriodFor(2026, 6)).toEqual({ start: '2025-07-01', end: '2026-06-30' })
  })
})
