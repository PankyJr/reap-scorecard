import { describe, expect, it } from 'vitest'
import {
  formatFullEngineRunStatus,
  formatFullWorkbookStatus,
  getFullScorecardNextStep,
  groupFullScorecardValidationIssues,
} from '../ui-labels'

describe('ui-labels', () => {
  it('formatFullWorkbookStatus maps known statuses', () => {
    expect(formatFullWorkbookStatus('parsed')).toBe('Parsed')
    expect(formatFullWorkbookStatus('extracted_with_warnings')).toBe('Extracted — review warnings')
    expect(formatFullWorkbookStatus('validation_failed')).toBe('Validation failed')
    expect(formatFullWorkbookStatus('scored')).toBe('Scored')
    expect(formatFullWorkbookStatus('scored_with_warnings')).toBe('Scored — review warnings')
  })

  it('formatFullEngineRunStatus maps run statuses', () => {
    expect(formatFullEngineRunStatus('completed_with_warnings')).toBe('Completed with warnings')
    expect(formatFullEngineRunStatus('failed')).toBe('Failed')
  })

  it('getFullScorecardNextStep suggests running engine after extraction', () => {
    const step = getFullScorecardNextStep({
      workbookStatus: 'extracted',
      extractedMetricCount: 12,
      latestRunStatus: null,
      hasEngineResult: false,
    })
    expect(step.tone).toBe('neutral')
    expect(step.title).toContain('scoring engine')
  })

  it('getFullScorecardNextStep celebrates complete score', () => {
    const step = getFullScorecardNextStep({
      workbookStatus: 'scored',
      extractedMetricCount: 12,
      latestRunStatus: 'completed',
      hasEngineResult: true,
      scoreCompleteness: 'complete',
    })
    expect(step.tone).toBe('success')
    expect(step.body.toLowerCase()).toContain('pdf')
  })

  it('groupFullScorecardValidationIssues buckets issues', () => {
    const grouped = groupFullScorecardValidationIssues([
      { issue_type: 'required_metric_missing', message: 'Missing x', severity: 'warning' },
      { issue_type: 'metric_value_warning', message: 'Ambiguous row for foo', severity: 'warning' },
      { issue_type: 'metric_value_error', message: 'Excel error in cell', severity: 'error' },
    ])
    expect(grouped.missingInputs).toHaveLength(1)
    expect(grouped.ambiguousRows).toHaveLength(1)
    expect(grouped.excelErrors).toHaveLength(1)
  })
})
