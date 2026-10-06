import type { LoadedGenericAssessment } from './load'
import type { GenericScorecardCalculation } from '@/lib/scorecard/generic'
import { buildGenericWorkflow, type GenericWorkflowView } from '@/lib/scorecard/generic/ux/workflow'
import type { GenericWorkbookAnalysis } from '@/lib/scorecard/generic/workbook-import'
import { buildAreaRows, liveScore, nextUnfinished, type AreaKey } from '@/lib/scorecard/generic/ux/areas'
import type { WorkspaceView } from './workspace'

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

/**
 * Everything the workspace frame needs (checklist, live score, next step),
 * built from what the page has already loaded: no extra query, no extra maths.
 */
export function workspaceFor(
  loaded: LoadedGenericAssessment,
  workflow: GenericWorkflowView,
  current: AreaKey | null,
): WorkspaceView {
  const base = `/scorecards/calculator/${loaded.assessment.id as string}/generic`
  const rows = buildAreaRows({
    assessmentId: loaded.assessment.id as string,
    preview: loaded.preview,
    workflowItems: workflow.items,
    procurementAttached: Boolean(loaded.inputs.procurementSnapshot),
  })
  return {
    rows,
    score: liveScore(loaded.preview),
    current,
    next: nextUnfinished(rows, current),
    reviewHref: `${base}/review`,
    hubHref: base,
  }
}

/**
 * What the confirmed workbook import read, for the "From your workbook" tag.
 * Null when no workbook was imported (the scorecard was filled in by hand).
 */
export function workbookReading(loaded: LoadedGenericAssessment): GenericWorkbookAnalysis | null {
  const snapshot = (loaded.assessment as { workbook_import_snapshot?: GenericWorkbookAnalysis | null }).workbook_import_snapshot
  return snapshot && typeof snapshot === 'object' && 'ownership' in snapshot ? snapshot : null
}

/** True when a figure still matches what the workbook said: it came from there and was not changed. */
export function sameAsWorkbook(imported: unknown, current: unknown): boolean {
  if (imported == null || current == null || imported === '') return false
  if (typeof imported === 'number' && typeof current === 'number') return Math.abs(imported - current) < 1e-9
  return imported === current
}
