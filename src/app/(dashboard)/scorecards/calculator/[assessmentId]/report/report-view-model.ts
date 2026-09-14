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
  return (args.elements ?? []).some((el) => {
    const snapshot = el.result_snapshot as { pointsAchieved?: number | null } | null
    return snapshot != null && typeof snapshot.pointsAchieved === 'number'
  })
}
