import type { ProcurementCategoryResult } from './assessment'
import { deriveProcurementReapLevel } from './insights'

/** Same REAP labels as legacy scorecard / procurement insights; higher rank = stronger. */
const REAP_LEVEL_ORDER = [
  'Level 1',
  'Level 2',
  'Level 3',
  'Level 4',
  'Level 5',
  'Level 6',
  'Level 7',
  'Non-Compliant',
] as const

/** Numeric strength for trend direction (Level 1 highest). Unknown labels → -1. */
export function reapLevelNumericRank(level: string): number {
  const i = REAP_LEVEL_ORDER.indexOf(
    level as (typeof REAP_LEVEL_ORDER)[number],
  )
  if (i === -1) return -1
  return REAP_LEVEL_ORDER.length - 1 - i
}

/** Shared threshold for “meaningful” procurement point moves (portfolio + per-assessment). */
export const PROCUREMENT_POINT_COMPARE_EPS = 0.005

export function compareCategoryPointDeltas(
  current: ProcurementCategoryResult[],
  previous: ProcurementCategoryResult[],
): {
  strongestImprovement: { key: string; name: string; delta: number } | null
  biggestDecline: { key: string; name: string; delta: number } | null
} {
  const prevByKey = new Map(previous.map((c) => [c.key, c]))
  const deltas: { key: string; name: string; delta: number }[] = []
  for (const c of current) {
    const p = prevByKey.get(c.key)
    if (!p) continue
    deltas.push({
      key: c.key,
      name: c.name,
      delta: c.pointsAchieved - p.pointsAchieved,
    })
  }
  if (deltas.length === 0) {
    return { strongestImprovement: null, biggestDecline: null }
  }
  const strongest = deltas.reduce((a, b) => (b.delta > a.delta ? b : a))
  const decline = deltas.reduce((a, b) => (b.delta < a.delta ? b : a))
  return {
    strongestImprovement:
      strongest.delta > PROCUREMENT_POINT_COMPARE_EPS ? strongest : null,
    biggestDecline: decline.delta < -PROCUREMENT_POINT_COMPARE_EPS ? decline : null,
  }
}

export interface ProcurementComparisonSnapshot {
  previousMeta: {
    id: string
    assessmentYear: number | null
    createdAt: string
  }
  scoreCurrent: number
  scorePrevious: number
  scoreDelta: number
  reapLevelCurrent: string
  reapLevelPrevious: string
  /** Positive when REAP level improved (e.g. Level 4 → Level 3). */
  reapLevelRankDelta: number
  tmpsCurrent: number
  tmpsPrevious: number
  tmpsDelta: number
  bbbeeSpendCurrent: number
  bbbeeSpendPrevious: number
  bbbeeSpendDelta: number
  strongestCategoryImprovement: { name: string; delta: number } | null
  biggestCategoryDecline: { name: string; delta: number } | null
}

export function buildProcurementComparison(
  current: {
    totalScore: number
    totalMeasuredSpend: number
    totalBbbeeSpend: number
    categories: ProcurementCategoryResult[]
  },
  previous: {
    id: string
    assessmentYear: number | null
    createdAt: string
    totalScore: number
    totalMeasuredSpend: number
    totalBbbeeSpend: number
    categories: ProcurementCategoryResult[]
  },
): ProcurementComparisonSnapshot {
  const reapLevelCurrent = deriveProcurementReapLevel(current.totalScore)
  const reapLevelPrevious = deriveProcurementReapLevel(previous.totalScore)
  const { strongestImprovement, biggestDecline } = compareCategoryPointDeltas(
    current.categories,
    previous.categories,
  )

  return {
    previousMeta: {
      id: previous.id,
      assessmentYear: previous.assessmentYear,
      createdAt: previous.createdAt,
    },
    scoreCurrent: current.totalScore,
    scorePrevious: previous.totalScore,
    scoreDelta: current.totalScore - previous.totalScore,
    reapLevelCurrent,
    reapLevelPrevious,
    reapLevelRankDelta:
      reapLevelNumericRank(reapLevelCurrent) -
      reapLevelNumericRank(reapLevelPrevious),
    tmpsCurrent: current.totalMeasuredSpend,
    tmpsPrevious: previous.totalMeasuredSpend,
    tmpsDelta: current.totalMeasuredSpend - previous.totalMeasuredSpend,
    bbbeeSpendCurrent: current.totalBbbeeSpend,
    bbbeeSpendPrevious: previous.totalBbbeeSpend,
    bbbeeSpendDelta: current.totalBbbeeSpend - previous.totalBbbeeSpend,
    strongestCategoryImprovement: strongestImprovement
      ? { name: strongestImprovement.name, delta: strongestImprovement.delta }
      : null,
    biggestCategoryDecline: biggestDecline
      ? { name: biggestDecline.name, delta: biggestDecline.delta }
      : null,
  }
}

export function formatSignedPoints(delta: number, digits = 2): string {
  const abs = Math.abs(delta).toFixed(digits)
  if (delta > PROCUREMENT_POINT_COMPARE_EPS) return `+${abs}`
  if (delta < -PROCUREMENT_POINT_COMPARE_EPS) return `-${abs}`
  return (0).toFixed(digits)
}
