import { describe, expect, it } from 'vitest'
import {
  formatTypedDisplayValue,
  typed,
} from '@/lib/scorecard/generic/ux/display-values'
import {
  buildGenericWorkflow,
  finalLevelDisplay,
  mapStepSlugToStage,
} from '@/lib/scorecard/generic/ux/workflow'
import type { GenericScorecardCalculation } from '@/lib/scorecard/generic'

function minimalPreview(): GenericScorecardCalculation {
  return {
    ruleSetKey: 'generic-codes-2019-v1',
    ruleSetVersion: '1.0.0',
    ruleSetDisplayName: 'Generic Codes 2019',
    headlineMessage: 'Partial',
    totalBasePointsAchieved: 0,
    totalBasePointsAvailable: 100,
    totalBonusPointsAchieved: 0,
    totalBonusPointsAvailable: 10,
    rawTotalPoints: 0,
    preliminaryLevel: { level: 'Non-Compliant', recognitionPercentage: 0 },
    finalLevel: { level: 'Non-Compliant', recognitionPercentage: 0 },
    discountApplied: false,
    failedPriorityKeys: [],
    readiness: { complete: false, reasons: ['Incomplete'] },
    prioritySubminimums: [],
    warnings: [],
    elements: [],
    applicability: {
      classification: 'unresolved',
      mayProduceGenericFinalLevel: false,
      blockingReasons: [],
      missingInputs: [],
      warnings: [],
    },
  } as unknown as GenericScorecardCalculation
}

describe('typed display values', () => {
  it('formats employees as a count, not currency', () => {
    expect(formatTypedDisplayValue(typed('totalEmployees', 'Total employees', 'count', 100, 'employees'))).toBe(
      '100 employees',
    )
  })

  it('formats currency with en-ZA grouping', () => {
    expect(formatTypedDisplayValue(typed('revenue', 'Revenue', 'currency', 1_250_000))).toMatch(/^R/)
  })

  it('formats percentages from fractions', () => {
    expect(formatTypedDisplayValue(typed('margin', 'Margin', 'percentage', 0.25))).toBe('25.00%')
  })

  it('formats points to two decimals', () => {
    expect(formatTypedDisplayValue(typed('pts', 'Points', 'points', 12.5))).toBe('12.50')
  })
})

describe('generic workflow staging', () => {
  it('maps overview import states onto five primary stages', () => {
    expect(mapStepSlugToStage('', { importStatus: 'no_workbook_uploaded', hasPendingReview: false })).toBe(
      'upload',
    )
    expect(mapStepSlugToStage('workbook-review', { importStatus: 'review_required', hasPendingReview: true })).toBe(
      'review',
    )
    expect(mapStepSlugToStage('ownership', { importStatus: 'imported', hasPendingReview: false })).toBe(
      'complete',
    )
    expect(mapStepSlugToStage('review', { importStatus: 'imported', hasPendingReview: false })).toBe(
      'calculate',
    )
  })

  it('orders next actions and exposes progress', () => {
    const workflow = buildGenericWorkflow({
      assessmentId: 'a1',
      currentSlug: '',
      importStatus: 'imported',
      hasPendingReview: false,
      hasStoredCalculation: false,
      needsRecalculation: false,
      preview: minimalPreview(),
      assessment: {
        financial_inputs: { revenue: 60_000_000 },
        ownership_inputs: {},
        applicability: { entityType: 'company' },
        procurement_snapshot: null,
      },
      elements: [],
      contributionCounts: {},
    })

    expect(workflow.stages).toHaveLength(5)
    expect(workflow.nextAction?.id).toBe('ownership')
    expect(workflow.completedCount).toBeGreaterThan(0)
    expect(workflow.checklist.workbookUploaded).toBe(true)
    expect(workflow.checklist.elementsReviewed).toBe(true)
    expect(workflow.checklist.procurementAttached).toBe(false)
  })

  it('treats imported_with_warnings as a confirmed workbook import', () => {
    const workflow = buildGenericWorkflow({
      assessmentId: 'a1',
      currentSlug: '',
      importStatus: 'imported_with_warnings',
      hasPendingReview: false,
      hasStoredCalculation: false,
      needsRecalculation: false,
      preview: minimalPreview(),
      assessment: {
        financial_inputs: { revenue: 60_000_000 },
        ownership_inputs: {},
        applicability: { entityType: 'company' },
        procurement_snapshot: null,
      },
      elements: [],
      contributionCounts: {},
    })

    expect(workflow.checklist.workbookUploaded).toBe(true)
    expect(workflow.checklist.elementsReviewed).toBe(true)
    expect(workflow.nextAction).not.toBeNull()
    expect(mapStepSlugToStage('', { importStatus: 'imported_with_warnings', hasPendingReview: false })).toBe(
      'complete',
    )
  })

  it('keeps final level unavailable until a complete saved calculation exists', () => {
    expect(
      finalLevelDisplay({
        hasStoredCalculation: false,
        needsRecalculation: false,
        readinessComplete: false,
        level: 'Level 4',
      }).value,
    ).toBe('Not available')
  })
})
