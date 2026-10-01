/**
 * One plain-English status, and the single next thing to do, for every kind of
 * assessment. Home, the lists and the company page all use this, so the same
 * assessment never reads differently on two screens.
 */

export type StatusTone = 'ok' | 'warn' | 'neutral' | 'brand'

export type AssessmentStatus = {
  /** Short status, e.g. "Finished" or "Check the imported data". */
  label: string
  tone: StatusTone
  /** The one next action, in words a button can carry. */
  next: string
  href: string
  /** True when nothing is left to do. */
  finished: boolean
  /** One sentence on what this status means for the user. */
  explain: string
}

export type FullScorecardRow = {
  id: string
  scope_mode?: string | null
  workbook_import_status?: string | null
  workbook_import_preview?: unknown
  overall_result_snapshot?: unknown
  needs_recalculation?: boolean | null
  readiness_complete?: boolean | null
  final_level?: string | null
  preliminary_level?: string | null
}

const CONFIRMED = new Set(['imported', 'confirmed', 'imported_with_warnings'])

export function fullScorecardStatus(row: FullScorecardRow): AssessmentStatus {
  const base = `/scorecards/calculator/${row.id}/generic`
  if (row.scope_mode && row.scope_mode !== 'full') {
    return {
      label: 'Selected elements only',
      tone: 'neutral',
      next: 'Open',
      href: `/scorecards/calculator/${row.id}`,
      finished: false,
      explain: 'Scores a few elements without a B-BBEE level.',
    }
  }
  const calculated = row.overall_result_snapshot != null
  if (calculated && !row.needs_recalculation && row.readiness_complete && row.final_level) {
    return {
      label: `Finished: ${row.final_level}`,
      tone: 'ok',
      next: 'View result',
      href: `${base}/result`,
      finished: true,
      explain: 'The scorecard is calculated and the level is final.',
    }
  }
  if (calculated && row.needs_recalculation) {
    return {
      label: 'Changed since last calculation',
      tone: 'warn',
      next: 'Calculate again',
      href: `${base}/review`,
      finished: false,
      explain: 'Something was edited after the last calculation, so the saved result is out of date.',
    }
  }
  const status = row.workbook_import_status ?? null
  if (status === 'review_required' || (!status && row.workbook_import_preview != null)) {
    return {
      label: 'Check the imported data',
      tone: 'brand',
      next: 'Check imported data',
      href: `${base}/workbook-review`,
      finished: false,
      explain: 'The workbook has been read. Look over what was found, then confirm it.',
    }
  }
  if (!status || status === 'no_workbook_uploaded') {
    if (!calculated) {
      return {
        label: 'Workbook not uploaded',
        tone: 'neutral',
        next: 'Upload the workbook',
        href: base,
        finished: false,
        explain: 'Upload the company’s REAP scorecard workbook to fill in the scorecard.',
      }
    }
  }
  if (calculated) {
    return {
      label: 'Calculated, level not final',
      tone: 'warn',
      next: 'See what is missing',
      href: `${base}/review`,
      finished: false,
      explain: 'Points are calculated, but some information is still missing before the level is final.',
    }
  }
  return {
    label: 'In progress',
    tone: 'brand',
    next: 'Continue',
    href: base,
    finished: false,
    explain: status && CONFIRMED.has(status)
      ? 'The workbook is in. Complete the elements that still need information, then calculate.'
      : 'Continue where you left off.',
  }
}

export type ProcurementRow = { id: string; total_score?: number | string | null }

/** A procurement scorecard is complete as soon as it is saved: it always has a score. */
export function procurementStatus(row: ProcurementRow): AssessmentStatus {
  return {
    label: 'Finished',
    tone: 'ok',
    next: 'View result',
    href: `/procurement/assessments/${row.id}`,
    finished: true,
    explain: 'Saved and scored.',
  }
}

/** Points out of the procurement scorecard's 29 (27 + 2 bonus). */
export const PROCUREMENT_MAX_POINTS = 29

export function formatScore(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? Number(value) : value
  if (n == null || !Number.isFinite(n)) return '—'
  return n.toFixed(2)
}
