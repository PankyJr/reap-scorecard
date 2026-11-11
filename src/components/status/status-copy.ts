/**
 * The one set of status words, for every list that shows a scorecard's state
 * (Home, /companies, company detail, /scorecards). DISPLAY ONLY: the status
 * itself still comes from fullScorecardStatus() / procurementStatus(), which
 * this file never changes. It only says the same thing in fewer words, and
 * folds every tone into the four chip colours.
 *
 *   status label (from the status function)   chip            tone
 *   ─────────────────────────────────────────  ──────────────  ─────────
 *   Finished: Level 4                           Level 4         success
 *   Calculated, level not final                 Not final       attention
 *   Changed since last calculation              Recalculate     attention
 *   Check the imported data                     Check import    progress
 *   In progress                                 In progress     progress
 *   Workbook not uploaded                       No workbook     neutral
 *   Selected areas only                         Selected areas  neutral
 *   (no full scorecard)                         Not started     neutral
 *   procurement: Finished                       (its own column: "23.88 of 25")
 */
import type { ChipTone } from '@/components/ui/Chip'
import { chipToneFor } from '@/components/ui/Chip'
import type { AssessmentStatus } from '@/lib/status/assessment-status'
import { procurementPointsFromStoredResults } from '@/lib/procurement/scoreSummary'

export type StatusChip = { label: string; tone: ChipTone }

const SHORT: Record<string, string> = {
  'Calculated, level not final': 'Not final',
  'Changed since last calculation': 'Recalculate',
  'Check the imported data': 'Check import',
  'In progress': 'In progress',
  'Workbook not uploaded': 'No workbook',
  'Selected areas only': 'Selected areas',
}

export const NOT_STARTED_CHIP: StatusChip = { label: 'Not started', tone: 'neutral' }

/** A full scorecard's status, as the chip on every list. */
export function fullStatusChip(status: Pick<AssessmentStatus, 'label' | 'tone'>): StatusChip {
  const finished = status.label.match(/^Finished:\s*(.+)$/)
  const label = finished ? finished[1] : (SHORT[status.label] ?? status.label)
  const tone = status.label === 'Calculated, level not final' ? 'attention' : chipToneFor(status.tone as Parameters<typeof chipToneFor>[0])
  return { label, tone }
}

/**
 * A procurement scorecard's base points for its own column: "23.88 of 25".
 * From the saved per-line points when there are any (as the score page shows
 * them), otherwise the stored total with the 25-point ceiling unknown.
 */
export function procurementCell(args: {
  results?: Parameters<typeof procurementPointsFromStoredResults>[0]
  storedTotal?: number | string | null
}): { achieved: number; cap: number | null } | null {
  const points = procurementPointsFromStoredResults(args.results)
  if (points) return { achieved: points.basePoints, cap: points.baseCap }
  const total = args.storedTotal == null || args.storedTotal === '' ? NaN : Number(args.storedTotal)
  return Number.isFinite(total) ? { achieved: total, cap: null } : null
}
