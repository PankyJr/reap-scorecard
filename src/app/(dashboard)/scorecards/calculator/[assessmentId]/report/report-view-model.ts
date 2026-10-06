import { listScorecardElementAdapters } from '@/lib/scorecard/calculator/elements/registry'

/**
 * Display name for a stored element row.
 *
 * The generic engine stores seven element keys; the calculator adapter
 * registry covers four, and `getScorecardElementAdapter` throws on the rest.
 * Calling it from the report crashed every generic assessment
 * (`Unknown scorecard element: ownership`). The report renders whatever is
 * stored, so it must never throw on an unknown key.
 */
export function elementLabel(elementKey: string): string {
  const adapter = listScorecardElementAdapters().find((a) => a.elementKey === elementKey)
  if (adapter) return adapter.elementName
  return String(elementKey)
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export type ReportElementRow = { result_snapshot?: unknown }

export type ReportElementPoints = {
  achieved: number | null
  available: number | null
  bonusAchieved: number | null
  bonusAvailable: number | null
}

const finite = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null

/**
 * Points for one stored element row, whichever engine wrote it.
 *
 * The modular calculator stores `pointsAchieved` / `pointsAvailable`. The
 * generic engine stores `basePointsAchieved` / `basePointsAvailable` plus the
 * bonus pair. The report only knew the first shape, so every generic scorecard
 * printed "0.00 points" and "— / —" beside a Result page showing the real
 * total. Reading both shapes here is display only; nothing is recalculated.
 */
export function elementPoints(resultSnapshot: unknown): ReportElementPoints {
  const snapshot = (resultSnapshot ?? null) as Record<string, unknown> | null
  if (!snapshot || typeof snapshot !== 'object') {
    return { achieved: null, available: null, bonusAchieved: null, bonusAvailable: null }
  }
  return {
    achieved: finite(snapshot.pointsAchieved) ?? finite(snapshot.basePointsAchieved),
    available: finite(snapshot.pointsAvailable) ?? finite(snapshot.basePointsAvailable),
    bonusAchieved: finite(snapshot.bonusPointsAchieved),
    bonusAvailable: finite(snapshot.bonusPointsAvailable),
  }
}

/**
 * The headline figure. A generic assessment carries the engine's own
 * `rawTotalPoints` (which already applies element caps), so that is used as
 * stored. Otherwise the element rows are summed, base plus bonus.
 */
export function combinedReportScore(args: {
  overallResultSnapshot: unknown
  elements: ReportElementRow[] | null | undefined
}): number {
  const overall = (args.overallResultSnapshot ?? null) as Record<string, unknown> | null
  const raw = overall && typeof overall === 'object' ? finite(overall.rawTotalPoints) : null
  if (raw != null) return raw
  return (args.elements ?? []).reduce((sum, el) => {
    const points = elementPoints(el.result_snapshot)
    return sum + (points.achieved ?? 0) + (points.bonusAchieved ?? 0)
  }, 0)
}

/** "12.57 / 19" with an em dash for a side that has no number. */
export function formatReportPoints(achieved: number | null, available: number | null): string {
  const side = (value: number | null) => (value == null ? '—' : Number(value.toFixed(2)).toString())
  return `${side(achieved)} / ${side(available)}`
}

/**
 * A report is only meaningful once something has been calculated: either the
 * assessment carries an overall result snapshot, or at least one element row
 * has a numeric points figure.
 */
export function hasCalculatedResult(args: {
  overallResultSnapshot: unknown
  elements: ReportElementRow[] | null | undefined
}): boolean {
  if (args.overallResultSnapshot != null) return true
  return (args.elements ?? []).some((el) => elementPoints(el.result_snapshot).achieved != null)
}
