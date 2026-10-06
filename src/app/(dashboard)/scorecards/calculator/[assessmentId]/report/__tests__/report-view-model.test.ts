import { describe, expect, it } from 'vitest'
import {
  combinedReportScore,
  elementLabel,
  elementPoints,
  formatReportPoints,
  hasCalculatedResult,
} from '../report-view-model'
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

/**
 * The generic engine stores base/bonus points; the modular calculator stores a
 * single points pair. The printable report read only the modular shape, so a
 * generic scorecard printed "0.00 points" and "— / —" next to a Result page
 * showing the real total (found in the 2026-09-30 end-to-end audit).
 */
describe('report points for both stored shapes', () => {
  const genericElement = {
    result_snapshot: {
      elementKey: 'management_control',
      basePointsAchieved: 12.57,
      basePointsAvailable: 19,
      bonusPointsAchieved: 0,
      bonusPointsAvailable: 0,
    },
  }
  const modularElement = { result_snapshot: { pointsAchieved: 3, pointsAvailable: 5 } }

  it('reads the generic engine shape', () => {
    expect(elementPoints(genericElement.result_snapshot)).toEqual({
      achieved: 12.57,
      available: 19,
      bonusAchieved: 0,
      bonusAvailable: 0,
    })
  })

  it('still reads the modular calculator shape', () => {
    const points = elementPoints(modularElement.result_snapshot)
    expect(points.achieved).toBe(3)
    expect(points.available).toBe(5)
    expect(points.bonusAvailable).toBeNull()
  })

  it('returns nulls, never zeros, for a row with no result', () => {
    expect(elementPoints(null).achieved).toBeNull()
    expect(elementPoints({ status: 'not_started' }).available).toBeNull()
  })

  it('uses the engine raw total as the headline when the assessment has one', () => {
    expect(
      combinedReportScore({ overallResultSnapshot: { rawTotalPoints: 54.69 }, elements: [genericElement] }),
    ).toBe(54.69)
  })

  it('sums base and bonus across element rows when there is no overall snapshot', () => {
    const withBonus = { result_snapshot: { basePointsAchieved: 20, basePointsAvailable: 20, bonusPointsAchieved: 5, bonusPointsAvailable: 5 } }
    expect(combinedReportScore({ overallResultSnapshot: null, elements: [modularElement, withBonus] })).toBe(28)
    expect(combinedReportScore({ overallResultSnapshot: null, elements: [] })).toBe(0)
  })

  it('counts a generic element row as a calculated result', () => {
    expect(hasCalculatedResult({ overallResultSnapshot: null, elements: [genericElement] })).toBe(true)
  })

  it('formats points as "achieved / available" with a dash for a missing side', () => {
    expect(formatReportPoints(12.57, 19)).toBe('12.57 / 19')
    expect(formatReportPoints(16.1, 25)).toBe('16.1 / 25')
    expect(formatReportPoints(null, 25)).toBe('— / 25')
  })
})
