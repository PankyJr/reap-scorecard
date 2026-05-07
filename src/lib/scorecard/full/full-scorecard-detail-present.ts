/**
 * Pure helpers for full-scorecard detail page (client-safe copy / counts).
 */

export type IndicatorStatusBadgeKind =
  | 'calculated'
  | 'pending'
  | 'warning'
  | 'error'
  | 'not_implemented'

export function formatScorecardNumber(value: number | null | undefined): string {
  return value == null ? 'Pending' : String(value)
}

export function formatScorecardBoolean(value: boolean | null | undefined): string {
  if (value == null) return 'Pending'
  return value ? 'Yes' : 'No'
}

export function formatBbbeeLevelDisplay(
  level: string | null | undefined,
  scoreCompleteness: 'complete' | 'partial' | undefined,
): string {
  if (level != null && String(level).trim() !== '') return String(level)
  if (scoreCompleteness === 'partial') return 'Not assigned'
  return 'Pending'
}

export function formatRecognitionDisplay(
  value: number | null | undefined,
  scoreCompleteness: 'complete' | 'partial' | undefined,
): string {
  if (value != null) return String(value)
  if (scoreCompleteness === 'partial') return 'Incomplete'
  return 'Pending'
}

export function indicatorStatusPresentation(args: {
  status: string
  warnings: string[]
  missingMetricKeys: string[]
}): { kind: IndicatorStatusBadgeKind; label: string } {
  const wlow = (args.warnings ?? []).join(' ').toLowerCase()
  const hasWarn = (args.warnings ?? []).length > 0

  if (wlow.includes('not implemented') || wlow.includes('not yet implemented')) {
    return { kind: 'not_implemented', label: 'Not implemented' }
  }
  if (
    wlow.includes('excel error') ||
    wlow.includes('#div/0') ||
    wlow.includes('#ref') ||
    wlow.includes('#value') ||
    wlow.includes('#num')
  ) {
    return { kind: 'error', label: 'Error' }
  }
  if (wlow.includes('ambiguous') || wlow.includes('multiple rows matched') || wlow.includes('multiple ')) {
    return { kind: 'warning', label: 'Warning' }
  }
  if (args.status === 'calculated' && hasWarn) {
    return { kind: 'warning', label: 'Warning' }
  }
  if (args.status === 'calculated') {
    return { kind: 'calculated', label: 'Calculated' }
  }
  return { kind: 'pending', label: 'Pending' }
}

export function indicatorActionRequired(args: {
  status: string
  warnings: string[]
  missingMetricKeys: string[]
}): string {
  const wlow = (args.warnings ?? []).join(' ').toLowerCase()
  const hasMissing = (args.missingMetricKeys ?? []).length > 0
  const hasWarn = (args.warnings ?? []).length > 0

  if (wlow.includes('not implemented') || wlow.includes('not yet implemented')) {
    return 'Not implemented yet'
  }
  if (wlow.includes('ambiguous') || wlow.includes('multiple rows matched') || wlow.includes('multiple ')) {
    return 'Ambiguous workbook rows'
  }
  if (
    wlow.includes('excel error') ||
    wlow.includes('#div/0') ||
    wlow.includes('#ref') ||
    wlow.includes('#value') ||
    wlow.includes('#num')
  ) {
    return 'Formula/error cells'
  }
  if (args.status === 'calculated' && !hasMissing && !hasWarn) {
    return 'Ready'
  }
  if (hasMissing || wlow.includes('missing') || wlow.includes('not in extract') || wlow.includes('skipped')) {
    return 'Missing source values'
  }
  if (args.status === 'calculated' && hasWarn) {
    return 'Review diagnostics'
  }
  if (args.status !== 'calculated') {
    return 'Missing source values'
  }
  return 'Review diagnostics'
}

export function countIndicatorsInPillar(pillar: {
  sections: Array<{ indicators: Array<{ status: string }> }>
}): { calculated: number; total: number } {
  let calculated = 0
  let total = 0
  for (const s of pillar.sections ?? []) {
    for (const i of s.indicators ?? []) {
      total += 1
      if (i.status === 'calculated') calculated += 1
    }
  }
  return { calculated, total }
}

export function countIndicatorsByStatus(
  pillars: Array<{ sections: Array<{ indicators: Array<{ status: string }> }> }> | undefined,
): { calculated: number; notCalculated: number } {
  let calculated = 0
  let notCalculated = 0
  for (const p of pillars ?? []) {
    for (const s of p.sections ?? []) {
      for (const i of s.indicators ?? []) {
        if (i.status === 'calculated') calculated += 1
        else notCalculated += 1
      }
    }
  }
  return { calculated, notCalculated }
}

/** Counts engine + pillar + per-indicator warning strings (for issue summary). */
export function countEngineWarningStrings(
  pillars:
    | Array<{
        warnings?: string[]
        sections: Array<{ indicators: Array<{ warnings?: string[] }> }>
      }>
    | undefined,
  topLevel?: Array<{ message?: string }> | undefined,
): number {
  let n = topLevel?.length ?? 0
  for (const p of pillars ?? []) {
    n += p.warnings?.length ?? 0
    for (const s of p.sections ?? []) {
      for (const i of s.indicators ?? []) {
        n += i.warnings?.length ?? 0
      }
    }
  }
  return n
}
