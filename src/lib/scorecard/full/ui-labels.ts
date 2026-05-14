import type { FullWorkbookStatus } from './types'

/** Human-readable workbook pipeline status for UI copy. */
export function formatFullWorkbookStatus(status: string): string {
  const map: Record<string, string> = {
    uploaded: 'Uploaded',
    parsed: 'Parsed',
    extracted: 'Extracted',
    extracted_with_warnings: 'Extracted — review warnings',
    validation_failed: 'Validation failed',
    scored: 'Scored',
    scored_with_warnings: 'Scored — review warnings',
    processing_error: 'Processing error',
  }
  return map[status] ?? status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Human-readable engine run status. */
export function formatFullEngineRunStatus(status: string): string {
  const map: Record<string, string> = {
    running: 'Running',
    completed: 'Completed',
    completed_with_warnings: 'Completed with warnings',
    failed: 'Failed',
  }
  return map[status] ?? status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export type FullScorecardNextStep = {
  tone: 'neutral' | 'success' | 'warning' | 'error'
  title: string
  body: string
}

/**
 * Short “what to do next” copy for import / detail flows.
 * Does not encode business rules beyond status flags already on the workbook.
 */
export function getFullScorecardNextStep(args: {
  workbookStatus: FullWorkbookStatus | string
  extractedMetricCount: number
  latestRunStatus: string | null
  hasEngineResult: boolean
  scoreCompleteness?: 'complete' | 'partial' | undefined
}): FullScorecardNextStep {
  const ws = args.workbookStatus

  if (ws === 'validation_failed') {
    return {
      tone: 'error',
      title: 'Fix validation issues before relying on scores',
      body: 'Review blocking errors and missing required sheets or metrics on the import page, upload a corrected workbook if needed, then run the scoring engine again.',
    }
  }

  if (ws === 'uploaded' || ws === 'parsed') {
    return {
      tone: 'neutral',
      title: 'Processing',
      body: 'If this state persists, reopen the import page or re-upload the workbook. Normally extraction completes in the same step as upload.',
    }
  }

  if (
    (ws === 'extracted' || ws === 'extracted_with_warnings') &&
    !args.hasEngineResult &&
    args.latestRunStatus !== 'running'
  ) {
    return {
      tone: ws === 'extracted_with_warnings' ? 'warning' : 'neutral',
      title: 'Run the scoring engine',
      body:
        ws === 'extracted_with_warnings'
          ? 'Review validation results and warnings, then run the scoring engine to produce app-calculated pillar scores and totals.'
          : 'Review validation results, then run the scoring engine to produce app-calculated pillar scores and totals.',
    }
  }

  if (args.latestRunStatus === 'running') {
    return {
      tone: 'neutral',
      title: 'Scoring in progress',
      body: 'Wait for the engine run to finish, then refresh this page.',
    }
  }

  if (args.latestRunStatus === 'failed') {
    return {
      tone: 'error',
      title: 'Last scoring run failed',
      body: 'Check extracted metrics and engine messages on the import page, fix data issues, and run the scoring engine again.',
    }
  }

  if (args.hasEngineResult && args.scoreCompleteness === 'partial') {
    return {
      tone: 'warning',
      title: 'Partial scorecard',
      body: 'Some sections could not be calculated. Review missing metrics and warnings, then re-run the engine after fixing the workbook. You can still open exports for the current calculated output.',
    }
  }

  if (args.hasEngineResult && args.scoreCompleteness === 'complete') {
    return {
      tone: 'success',
      title: 'Scorecard ready',
      body: 'You can open the full scorecard view, download the PDF report, or export the Excel workbook. Excel reference values remain comparison-only.',
    }
  }

  if (args.hasEngineResult) {
    return {
      tone: 'neutral',
      title: 'Review results',
      body: 'Open the full scorecard for detail, reconciliation, and exports.',
    }
  }

  if (args.extractedMetricCount === 0 && (ws === 'extracted' || ws === 'extracted_with_warnings')) {
    return {
      tone: 'warning',
      title: 'No metrics extracted',
      body: 'Required sheets may be missing or the template may not match expectations. Check the import summary and upload a compatible workbook.',
    }
  }

  return {
    tone: 'neutral',
    title: 'Continue on the import page',
    body: 'Use the import workspace to review sheets, metrics, and engine runs.',
  }
}

export type ValidationIssueLike = {
  issue_type: string
  message: string
  severity: string
  sheet_name?: string | null
  cell_ref?: string | null
}

export type GroupedValidationIssues = {
  missingInputs: ValidationIssueLike[]
  ambiguousRows: ValidationIssueLike[]
  excelErrors: ValidationIssueLike[]
  otherWarnings: ValidationIssueLike[]
  other: ValidationIssueLike[]
}

function messageLooksAmbiguous(message: string): boolean {
  return /\bambiguous\b/i.test(message)
}

function messageLooksExcelError(message: string): boolean {
  return /\bexcel error\b/i.test(message) || /\b#+[A-Z]{2,}!\b/.test(message)
}

/**
 * Buckets validation issues for clearer demo UI without changing extraction logic.
 */
export function groupFullScorecardValidationIssues(
  issues: ValidationIssueLike[],
): GroupedValidationIssues {
  const missingInputs: ValidationIssueLike[] = []
  const ambiguousRows: ValidationIssueLike[] = []
  const excelErrors: ValidationIssueLike[] = []
  const otherWarnings: ValidationIssueLike[] = []
  const other: ValidationIssueLike[] = []

  for (const issue of issues) {
    const t = issue.issue_type
    const msg = issue.message ?? ''

    if (t === 'missing_required_sheet' || t === 'required_metric_missing') {
      missingInputs.push(issue)
    } else if (messageLooksAmbiguous(msg) || t === 'ambiguous_row') {
      ambiguousRows.push(issue)
    } else if (t === 'metric_value_error' || messageLooksExcelError(msg)) {
      excelErrors.push(issue)
    } else if (t === 'metric_value_warning' || t === 'parse_warning') {
      otherWarnings.push(issue)
    } else {
      other.push(issue)
    }
  }

  return { missingInputs, ambiguousRows, excelErrors, otherWarnings, other }
}

/** Buckets engine warning messages (free text) for summary chips. */
export function groupEngineWarnings(warnings: Array<{ code: string; message: string }>): {
  incomplete: string[]
  discounting: string[]
  other: string[]
} {
  const incomplete: string[] = []
  const discounting: string[] = []
  const other: string[] = []

  for (const w of warnings) {
    const m = `${w.code} ${w.message}`.toLowerCase()
    if (
      m.includes('partial') ||
      m.includes('incomplete') ||
      m.includes('missing pillar') ||
      m.includes('not assigned')
    ) {
      incomplete.push(w.message)
    } else if (m.includes('discount') || m.includes('subminimum') || m.includes('sub-minimum')) {
      discounting.push(w.message)
    } else {
      other.push(w.message)
    }
  }

  return { incomplete, discounting, other }
}
