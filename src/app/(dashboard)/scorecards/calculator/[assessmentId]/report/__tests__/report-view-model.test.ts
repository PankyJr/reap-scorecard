import { describe, expect, it } from 'vitest'
import { elementLabel, hasCalculatedResult } from '../report-view-model'
import { GENERIC_ELEMENT_KEYS } from '@/lib/scorecard/rules/types'
import { getScorecardElementAdapter } from '@/lib/scorecard/calculator/elements/registry'

/**
 * Regression guard for the /report server-side exception (digest 4180638343):
 *
 *   Error: Unknown scorecard element: ownership
 *     at getScorecardElementAdapter (registry.ts:21)
 *     at CalculatorReportPage (report/page.tsx:121)
 *
 * The generic engine stores seven element keys; the calculator adapter
 * registry covers four. The report renders whatever is stored, so labelling
 * must never throw.
 */
describe('report element labelling', () => {
  it('never throws for any element key the generic engine can store', () => {
    for (const key of GENERIC_ELEMENT_KEYS) {
      expect(() => elementLabel(key), key).not.toThrow()
      expect(elementLabel(key).length, key).toBeGreaterThan(0)
    }
  })

  it('labels the three keys that used to crash the page', () => {
    // These have no adapter — they are exactly what threw.
    expect(elementLabel('ownership')).toBe('Ownership')
    expect(elementLabel('skills_development')).toBe('Skills Development')
    expect(elementLabel('preferential_procurement')).toBe('Preferential Procurement')
  })

  it('still prefers the adapter name where an adapter exists', () => {
    const adapterName = getScorecardElementAdapter('socio_economic_development').elementName
    expect(elementLabel('socio_economic_development')).toBe(adapterName)
  })

  it('confirms the underlying registry does still throw, so the fix is load-bearing', () => {
    expect(() => getScorecardElementAdapter('ownership' as never)).toThrow(/Unknown scorecard element/)
  })
})

describe('report calculated-state detection', () => {
  it('treats an assessment with an overall result snapshot as calculated', () => {
    expect(hasCalculatedResult({ overallResultSnapshot: { rawTotalPoints: 54.69 }, elements: [] })).toBe(true)
  })

  it('treats an element row carrying numeric points as calculated', () => {
    expect(
      hasCalculatedResult({
        overallResultSnapshot: null,
        elements: [{ result_snapshot: { pointsAchieved: 0 } }],
      }),
    ).toBe(true)
  })

  it('treats an imported-but-uncalculated assessment as NOT calculated', () => {
    // This is the real state of every assessment that crashed: rows exist,
    // nothing has been calculated.
    expect(
      hasCalculatedResult({
        overallResultSnapshot: null,
        elements: [{ result_snapshot: null }, { result_snapshot: {} }],
      }),
    ).toBe(false)
  })

  it('treats an empty assessment as NOT calculated', () => {
    expect(hasCalculatedResult({ overallResultSnapshot: null, elements: [] })).toBe(false)
    expect(hasCalculatedResult({ overallResultSnapshot: null, elements: null })).toBe(false)
  })
})
