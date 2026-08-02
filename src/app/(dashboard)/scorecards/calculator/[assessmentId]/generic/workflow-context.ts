import type { LoadedGenericAssessment } from './load'
import type { GenericScorecardCalculation } from '@/lib/scorecard/generic'
import { buildGenericWorkflow, type GenericWorkflowView } from '@/lib/scorecard/generic/ux/workflow'
import type { GenericWorkbookAnalysis } from '@/lib/scorecard/generic/workbook-import'

export function resolveImportStatus(loaded: LoadedGenericAssessment): {
  importStatus: string
  hasPendingReview: boolean
  pending: GenericWorkbookAnalysis | null
} {
  const assessment = loaded.assessment as {
    workbook_import_preview?: GenericWorkbookAnalysis | null
    workbook_import_snapshot?: { filename?: string } | null
    workbook_import_status?: string | null
    metadata?: { generic_workbook_import?: { pending_analysis?: GenericWorkbookAnalysis } } | null
  }
  const pending =
    assessment.workbook_import_preview ??
    assessment.metadata?.generic_workbook_import?.pending_analysis ??
    null
  const confirmed = assessment.workbook_import_snapshot
  const importStatus =
    assessment.workbook_import_status ??
    (pending ? 'review_required' : confirmed ? 'imported' : 'no_workbook_uploaded')
  return { importStatus, hasPendingReview: Boolean(pending), pending }
}

export function workflowForLoaded(
  loaded: LoadedGenericAssessment,
  currentSlug: string,
): GenericWorkflowView {
  const { importStatus, hasPendingReview } = resolveImportStatus(loaded)
  const contributionCounts: Partial<Record<string, number>> = {}
  for (const row of loaded.contributions) {
    contributionCounts[row.element_key] = (contributionCounts[row.element_key] ?? 0) + 1
  }

  return buildGenericWorkflow({
    assessmentId: loaded.assessment.id as string,
    currentSlug,
    importStatus,
    hasPendingReview,
    hasStoredCalculation: Boolean(loaded.assessment.overall_result_snapshot),
    needsRecalculation: Boolean(loaded.assessment.needs_recalculation),
    preview: loaded.preview,
    assessment: {
      financial_inputs: loaded.assessment.financial_inputs,
      ownership_inputs: loaded.assessment.ownership_inputs,
      applicability: loaded.inputs.applicability,
      procurement_snapshot: loaded.inputs.procurementSnapshot,
    },
    elements: loaded.elements,
    contributionCounts,
  })
}

export function storedCalculation(loaded: LoadedGenericAssessment): GenericScorecardCalculation | null {
  return (loaded.assessment.overall_result_snapshot as GenericScorecardCalculation | null) ?? null
}
