import { describe, expect, it } from 'vitest'
import { formatCeiling, formatDate, formatMoney, formatPointsOf, formatPts, timeAgo } from '../format'

describe('one date format and one money format (design rule 19)', () => {
  it('dates read "06 Oct 2026" in South African time', () => {
    expect(formatDate('2026-10-06T10:00:00Z')).toBe('06 Oct 2026')
    // 23:30 UTC on 5 Oct is already 6 Oct in Johannesburg.
    expect(formatDate('2026-10-05T23:30:00Z')).toBe('06 Oct 2026')
    expect(formatDate(null)).toBe('—')
    expect(formatDate('not a date')).toBe('—')
  })

  it('money reads "R 1 250 000": whole rands, spaces between thousands', () => {
    expect(formatMoney(1250000).replace(/ /g, ' ')).toBe('R 1 250 000')
    expect(formatMoney(999).replace(/ /g, ' ')).toBe('R 999')
    expect(formatMoney(-4500.6).replace(/ /g, ' ')).toBe('-R 4 501')
    expect(formatMoney(null)).toBe('—')
  })

  it('points: two decimals, a ceiling stays whole, never a number alone', () => {
    expect(formatPts(7.25)).toBe('7.25')
    expect(formatPts(7)).toBe('7.00')
    expect(formatCeiling(25)).toBe('25')
    expect(formatCeiling(2.5)).toBe('2.50')
    expect(formatPointsOf(7.25, 25)).toBe('7.25 of 25')
  })

  it('"Updated X ago" steps from minutes to hours to days to a date', () => {
    const now = new Date('2026-11-11T12:00:00Z')
    expect(timeAgo('2026-11-11T11:59:50Z', now)).toBe('just now')
    expect(timeAgo('2026-11-11T11:58:00Z', now)).toBe('2 min ago')
    expect(timeAgo('2026-11-11T09:00:00Z', now)).toBe('3 hours ago')
    expect(timeAgo('2026-11-10T11:00:00Z', now)).toBe('yesterday')
    expect(timeAgo('2026-10-06T12:00:00Z', now)).toBe('06 Oct 2026')
  })
})
