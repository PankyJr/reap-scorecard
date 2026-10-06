import { describe, expect, it } from 'vitest'

import {
  formatCurrency,
  formatCurrencyZar,
  formatPercentage,
  formatPercentFromRatio,
  formatPoints,
  formatWholePercentFromRatio,
} from '../format'

/**
 * Display formatting for procurement reports and client-facing views.
 *
 * Note on locale: formatCurrency uses toLocaleString(undefined, ...), so the
 * thousands and decimal separators follow the runtime's locale. These tests
 * therefore assert the parts that are locale-independent (the R prefix, the
 * two-decimal precision, the digits present) rather than pinning a separator
 * that would differ between a South African browser and a CI container.
 */

describe('formatCurrency', () => {
  it('always shows exactly two decimal places', () => {
    expect(formatCurrency(1000)).toMatch(/1.?000[.,]00$/)
    expect(formatCurrency(0.5)).toMatch(/0[.,]50$/)
    expect(formatCurrency(1234.567)).toMatch(/[.,]57$/)
  })

  // Null and undefined arrive from optional database columns; they must render
  // as zero rather than "NaN" on a client-facing report.
  it('renders null and undefined as zero', () => {
    expect(formatCurrency(null)).toMatch(/0[.,]00$/)
    expect(formatCurrency(undefined)).toMatch(/0[.,]00$/)
    expect(formatCurrency(0)).toMatch(/0[.,]00$/)
  })

  it('keeps the sign on a negative amount', () => {
    expect(formatCurrency(-250)).toContain('-')
  })
})

describe('formatCurrencyZar', () => {
  it('prefixes the Rand symbol and a space', () => {
    expect(formatCurrencyZar(1000)).toMatch(/^R /)
    expect(formatCurrencyZar(null)).toMatch(/^R /)
  })

  it('wraps formatCurrency rather than formatting separately', () => {
    expect(formatCurrencyZar(4321.5)).toBe(`R ${formatCurrency(4321.5)}`)
  })
})

describe('formatPercentFromRatio', () => {
  it('multiplies a ratio by 100 and appends a percent sign', () => {
    expect(formatPercentFromRatio(0.5)).toBe('50.0%')
    expect(formatPercentFromRatio(1)).toBe('100.0%')
    expect(formatPercentFromRatio(0)).toBe('0.0%')
  })

  it('defaults to one decimal place and honours an override', () => {
    expect(formatPercentFromRatio(0.90012)).toBe('90.0%')
    expect(formatPercentFromRatio(0.90012, 2)).toBe('90.01%')
    expect(formatPercentFromRatio(0.90012, 0)).toBe('90%')
  })

  // A ratio above 1 is legitimate here: procurement spend can exceed its
  // target, and the report must show 120%, not cap silently at 100%.
  it('does not cap ratios above 1', () => {
    expect(formatPercentFromRatio(1.2)).toBe('120.0%')
  })

  // NaN and Infinity come out of divisions by a zero denominator. They must
  // degrade to 0%, never print "NaN%" on a client report.
  it.each([[NaN], [Infinity], [-Infinity]])(
    'renders the non-finite value %p as zero percent',
    (value) => {
      expect(formatPercentFromRatio(value)).toBe('0.0%')
    },
  )
})

describe('formatPercentage', () => {
  it('delegates to formatPercentFromRatio but defaults to two decimals', () => {
    expect(formatPercentage(0.90012)).toBe('90.01%')
    expect(formatPercentage(0.5)).toBe('50.00%')
    expect(formatPercentage(0.90012, 1)).toBe('90.0%')
  })
})

describe('formatWholePercentFromRatio', () => {
  it('rounds to a whole percent', () => {
    expect(formatWholePercentFromRatio(0.904)).toBe('90%')
    expect(formatWholePercentFromRatio(0.905)).toBe('91%')
    expect(formatWholePercentFromRatio(0)).toBe('0%')
  })
})

describe('formatPoints', () => {
  it('fixes scorecard points to two decimals by default', () => {
    expect(formatPoints(3)).toBe('3.00')
    expect(formatPoints(3.456)).toBe('3.46')
    expect(formatPoints(0)).toBe('0.00')
  })

  it('honours a custom precision', () => {
    expect(formatPoints(3.456, 1)).toBe('3.5')
    expect(formatPoints(3.456, 0)).toBe('3')
  })

  it('falls back to zero for non-finite values', () => {
    expect(formatPoints(NaN)).toBe('0.00')
    expect(formatPoints(Infinity)).toBe('0.00')
  })
})
