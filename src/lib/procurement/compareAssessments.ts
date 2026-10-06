import type { ProcurementCategoryResult } from './assessment'
import { formatPoints } from './format'
import { procurementPointsFromLines, type ProcurementPoints } from './scoreSummary'

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

/** One side of a comparison: the points when line results are known, and the stored total. */
export type ProcurementComparisonSide = {
  /** Base points out of the engine cap with the bonus apart; null when no line results are saved. */
  points: ProcurementPoints | null
  /** The stored total: all six indicators added up, uncapped. */
  storedTotal: number
}

function movedWord(delta: number): 'up' | 'down' | null {
  if (delta > PROCUREMENT_POINT_COMPARE_EPS) return 'up'
  if (delta < -PROCUREMENT_POINT_COMPARE_EPS) return 'down'
  return null
}

/**
 * One plain sentence on how the procurement points moved, in the score page's
 * words ("X of 25 points", "bonus Y of 2"). When the earlier scorecard has no
 * saved line results, only its stored total is known (all six indicators added
 * up, uncapped); the sentence says so instead of comparing unlike figures.
 */
export function describeProcurementPointsChange(current: ProcurementComparisonSide, previous: ProcurementComparisonSide): string {
  const now = current.points
  const before = previous.points
  if (now && before) {
    const base = movedWord(now.basePoints - before.basePoints)
    const baseSentence = base
      ? `Procurement points went ${base} from ${formatPoints(before.basePoints)} to ${formatPoints(now.basePoints)} of ${now.baseCap}.`
      : `Procurement points stayed at ${formatPoints(now.basePoints)} of ${now.baseCap}.`
    const bonus = movedWord(now.bonusPoints - before.bonusPoints)
    const bonusSentence = bonus
      ? ` The bonus went ${bonus} from ${formatPoints(before.bonusPoints)} to ${formatPoints(now.bonusPoints)} of ${now.bonusCap}.`
      : ''
    return baseSentence + bonusSentence
  }
  if (now) {
    return (
      `Procurement points are now ${formatPoints(now.basePoints)} of ${now.baseCap}, bonus ${formatPoints(now.bonusPoints)} of ${now.bonusCap}. ` +
      `The earlier scorecard kept only its total of ${formatPoints(previous.storedTotal)} points (all six indicators added up), so the two are not compared.`
    )
  }
  const total = movedWord(current.storedTotal - previous.storedTotal)
  return total
    ? `The stored totals (all six indicators added up) went ${total} from ${formatPoints(previous.storedTotal)} to ${formatPoints(current.storedTotal)} points.`
    : `The stored totals (all six indicators added up) stayed at ${formatPoints(current.storedTotal)} points.`
}

export interface ProcurementComparisonSnapshot {
  previousMeta: {
    id: string
    assessmentYear: number | null
    createdAt: string
  }
  pointsCurrent: ProcurementPoints | null
  pointsPrevious: ProcurementPoints | null
  /** Base points now minus base points before; null unless both sides have line results. */
  basePointsDelta: number | null
  /** How the points moved, in one or two plain sentences. */
  pointsSentence: string
  tmpsCurrent: number
  tmpsPrevious: number
  tmpsDelta: number
  bbbeeSpendCurrent: number
  bbbeeSpendPrevious: number
  bbbeeSpendDelta: number
  strongestCategoryImprovement: { name: string; delta: number } | null
  biggestCategoryDecline: { name: string; delta: number } | null
}

type ComparisonInput = {
  totalScore: number
  totalMeasuredSpend: number
  totalBbbeeSpend: number
  categories: ProcurementCategoryResult[]
  /** Points from saved line results, when the caller has them but not full categories. */
  points?: ProcurementPoints | null
}

function sideOf(input: ComparisonInput): ProcurementComparisonSide {
  const points =
    input.points !== undefined ? input.points : input.categories.length > 0 ? procurementPointsFromLines(input.categories) : null
  return { points, storedTotal: input.totalScore }
}

export function buildProcurementComparison(
  current: ComparisonInput,
  previous: ComparisonInput & {
    id: string
    assessmentYear: number | null
    createdAt: string
  },
): ProcurementComparisonSnapshot {
  const { strongestImprovement, biggestDecline } = compareCategoryPointDeltas(
    current.categories,
    previous.categories,
  )
  const now = sideOf(current)
  const before = sideOf(previous)

  return {
    previousMeta: {
      id: previous.id,
      assessmentYear: previous.assessmentYear,
      createdAt: previous.createdAt,
    },
    pointsCurrent: now.points,
    pointsPrevious: before.points,
    basePointsDelta: now.points && before.points ? now.points.basePoints - before.points.basePoints : null,
    pointsSentence: describeProcurementPointsChange(now, before),
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
