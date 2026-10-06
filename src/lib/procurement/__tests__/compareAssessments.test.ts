import { describe, expect, it } from 'vitest'
import { buildProcurementComparison, describeProcurementPointsChange } from '../compareAssessments'
import type { ProcurementPoints } from '../scoreSummary'
import { PROCUREMENT_BASE_CAP, PROCUREMENT_BONUS_CAP } from '@/lib/scorecard/generic/elements/procurement'

function points(basePoints: number, bonusPoints: number): ProcurementPoints {
  return {
    basePoints,
    baseCap: PROCUREMENT_BASE_CAP,
    bonusPoints,
    bonusCap: PROCUREMENT_BONUS_CAP,
    uncappedBasePoints: basePoints,
    uncappedBonusPoints: bonusPoints,
    baseWasCapped: false,
  }
}

describe('how procurement points moved since the previous scorecard', () => {
  it('states the base points before and now, out of the cap', () => {
    expect(describeProcurementPointsChange({ points: points(21.1, 1), storedTotal: 0 }, { points: points(18.4, 1), storedTotal: 0 })).toBe(
      `Procurement points went up from 18.40 to 21.10 of ${PROCUREMENT_BASE_CAP}.`,
    )
    expect(describeProcurementPointsChange({ points: points(18.4, 1), storedTotal: 0 }, { points: points(21.1, 1), storedTotal: 0 })).toBe(
      `Procurement points went down from 21.10 to 18.40 of ${PROCUREMENT_BASE_CAP}.`,
    )
    expect(describeProcurementPointsChange({ points: points(18.4, 1), storedTotal: 0 }, { points: points(18.4, 1), storedTotal: 0 })).toBe(
      `Procurement points stayed at 18.40 of ${PROCUREMENT_BASE_CAP}.`,
    )
  })

  it('adds the bonus only when it moved', () => {
    expect(describeProcurementPointsChange({ points: points(20, 1.5), storedTotal: 0 }, { points: points(20, 0.5), storedTotal: 0 })).toBe(
      `Procurement points stayed at 20.00 of ${PROCUREMENT_BASE_CAP}. The bonus went up from 0.50 to 1.50 of ${PROCUREMENT_BONUS_CAP}.`,
    )
  })

  it('says honestly when the earlier scorecard kept only its stored total', () => {
    const text = describeProcurementPointsChange({ points: points(21.1, 1), storedTotal: 22.1 }, { points: null, storedTotal: 26.4 })
    expect(text).toBe(
      `Procurement points are now 21.10 of ${PROCUREMENT_BASE_CAP}, bonus 1.00 of ${PROCUREMENT_BONUS_CAP}. ` +
        'The earlier scorecard kept only its total of 26.40 points (all six indicators added up), so the two are not compared.',
    )
    expect(describeProcurementPointsChange({ points: null, storedTotal: 20 }, { points: null, storedTotal: 18 })).toBe(
      'The stored totals (all six indicators added up) went up from 18.00 to 20.00 points.',
    )
  })

  it('builds the comparison from line results and no longer carries a procurement rating', () => {
    const line = (key: string, pointsAchieved: number) =>
      ({ key, name: key, pointsAchieved, availablePoints: 0, targetPercent: 0, achievedPercent: 0, numeratorValue: 0, denominatorValue: 0 }) as never
    const snap = buildProcurementComparison(
      { totalScore: 0, totalMeasuredSpend: 0, totalBbbeeSpend: 0, categories: [line('all_bbbee_suppliers', 5), line('bdgs_51', 1)] },
      { id: 'p0', assessmentYear: 2024, createdAt: '2025-01-01', totalScore: 0, totalMeasuredSpend: 0, totalBbbeeSpend: 0, categories: [line('all_bbbee_suppliers', 3), line('bdgs_51', 1)] },
    )
    expect(snap.pointsSentence).toBe(`Procurement points went up from 3.00 to 5.00 of ${PROCUREMENT_BASE_CAP}.`)
    expect(snap.basePointsDelta).toBe(2)
    expect(snap).not.toHaveProperty('reapLevelCurrent')
    expect(snap).not.toHaveProperty('reapLevelRankDelta')
  })
})
