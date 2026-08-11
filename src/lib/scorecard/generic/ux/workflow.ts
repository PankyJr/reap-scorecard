/**
 * User-facing Generic Scorecard workflow: five stages + ordered next actions.
 * Does not change scoring formulas.
 */

import type { GenericScorecardCalculation } from '..'
import type { StoredElementRow } from '../persistence'

export const GENERIC_CODES_USER_LABEL = 'Generic Codes 2019'

/** Statuses that mean the workbook has been confirmed into the assessment. */
export function isWorkbookImportConfirmed(status: string | null | undefined): boolean {
  return (
    status === 'imported' ||
    status === 'confirmed' ||
    status === 'imported_with_warnings'
  )
}

/** Statuses that mean a workbook is present (pending review or already imported). */
export function isWorkbookPresent(status: string | null | undefined, hasPendingReview = false): boolean {
  return (
    hasPendingReview ||
    status === 'review_required' ||
    isWorkbookImportConfirmed(status)
  )
}

export type WorkflowStageId =
  | 'setup'
  | 'upload'
  | 'review'
  | 'complete'
  | 'calculate'

export type WorkflowStage = {
  id: WorkflowStageId
  label: string
  description: string
  href: string
}

export type NextActionId =
  | 'applicability'
  | 'financial'
  | 'ownership'
  | 'management_control'
  | 'skills_development'
  | 'procurement'
  | 'enterprise_development'
  | 'supplier_development'
  | 'socio_economic_development'
  | 'review_calculate'

export type NextActionItem = {
  id: NextActionId
  label: string
  href: string
  complete: boolean
}

export type ReadinessChecklist = {
  workbookUploaded: boolean
  elementsReviewed: boolean
  procurementAttached: boolean
  requiredConfirmationsRemaining: number
  readyToCalculate: boolean
}

export type ElementCardStatus =
  | 'not_started'
  | 'imported'
  | 'needs_confirmation'
  | 'ready_to_calculate'
  | 'calculated'
  | 'needs_recalculation'
  | 'complete'

export type ElementCardView = {
  elementKey: string
  displayName: string
  status: ElementCardStatus
  statusLabel: string
  description: string
  dataSource: string
  missingRequirements: string[]
  actionLabel: string
  actionHref: string
  showPoints: boolean
  basePointsAchieved: number
  basePointsAvailable: number
  bonusPointsAchieved: number
  bonusPointsAvailable: number
}

export type GenericWorkflowView = {
  stages: WorkflowStage[]
  currentStageId: WorkflowStageId
  currentStageIndex: number
  percentComplete: number
  previousHref: string | null
  continueHref: string
  nextAction: NextActionItem | null
  items: NextActionItem[]
  completedCount: number
  remainingCount: number
  checklist: ReadinessChecklist
  hasStoredCalculation: boolean
  needsRecalculation: boolean
}

const ELEMENT_SLUG: Record<string, string> = {
  ownership: 'ownership',
  management_control: 'management-control',
  skills_development: 'skills-development',
  preferential_procurement: 'procurement',
  enterprise_development: 'enterprise-development',
  supplier_development: 'supplier-development',
  socio_economic_development: 'socio-economic-development',
}

const STATUS_LABELS: Record<ElementCardStatus, string> = {
  not_started: 'Not started',
  imported: 'Imported',
  needs_confirmation: 'Needs confirmation',
  ready_to_calculate: 'Ready to calculate',
  calculated: 'Calculated',
  needs_recalculation: 'Needs recalculation',
  complete: 'Complete',
}

function basePath(assessmentId: string) {
  return `/scorecards/calculator/${assessmentId}/generic`
}

function isFilledNumber(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value)
}

function hasMeaningfulInputs(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  return Object.values(value as Record<string, unknown>).some((entry) => {
    if (typeof entry === 'number') return Number.isFinite(entry)
    if (typeof entry === 'boolean') return true
    if (typeof entry === 'string') return entry.trim().length > 0
    if (Array.isArray(entry)) return entry.length > 0
    if (entry && typeof entry === 'object') return Object.keys(entry as object).length > 0
    return false
  })
}

export function mapStepSlugToStage(
  slug: string,
  args: {
    importStatus: string | null | undefined
    hasPendingReview: boolean
  },
): WorkflowStageId {
  if (slug === 'review' || slug === 'result') return 'calculate'
  if (slug === 'workbook-review') return 'review'
  if (
    [
      'applicability',
      'financial',
      'ownership',
      'management-control',
      'skills-development',
      'procurement',
      'enterprise-development',
      'supplier-development',
      'socio-economic-development',
    ].includes(slug)
  ) {
    return 'complete'
  }
  if (args.hasPendingReview || args.importStatus === 'review_required') return 'review'
  if (isWorkbookImportConfirmed(args.importStatus)) return 'complete'
  if (!args.importStatus || args.importStatus === 'no_workbook_uploaded') return 'upload'
  return 'setup'
}

export function buildGenericWorkflow(args: {
  assessmentId: string
  currentSlug: string
  importStatus: string | null | undefined
  hasPendingReview: boolean
  hasStoredCalculation: boolean
  needsRecalculation: boolean
  preview: GenericScorecardCalculation
  assessment: {
    financial_inputs?: unknown
    ownership_inputs?: unknown
    applicability?: unknown
    procurement_snapshot?: unknown
  }
  elements: StoredElementRow[]
  contributionCounts: Partial<Record<string, number>>
}): GenericWorkflowView {
  const base = basePath(args.assessmentId)
  const stages: WorkflowStage[] = [
    {
      id: 'setup',
      label: 'Set up assessment',
      description: 'Company, year and assessment details',
      href: base,
    },
    {
      id: 'upload',
      label: 'Upload workbook',
      description: 'Upload the Generic Scorecard workbook',
      href: base,
    },
    {
      id: 'review',
      label: 'Review imported data',
      description: 'Confirm what will be imported',
      href: `${base}/workbook-review`,
    },
    {
      id: 'complete',
      label: 'Elements',
      description: 'Confirmations, attachments and gaps',
      href: `${base}/applicability`,
    },
    {
      id: 'calculate',
      label: 'Calculate and report',
      description: 'Calculate the scorecard and view the result',
      href: `${base}/review`,
    },
  ]

  const applicability = (args.assessment.applicability ?? {}) as Record<string, unknown>
  const financial = (args.assessment.financial_inputs ?? {}) as Record<string, unknown>
  const ownership = (args.assessment.ownership_inputs ?? {}) as Record<string, unknown>
  const skills = args.elements.find((row) => row.element_key === 'skills_development')
  const skillsInputs = (skills?.contextual_inputs ?? {}) as Record<string, unknown>
  const mc = args.elements.find((row) => row.element_key === 'management_control')
  const mcInputs = (mc?.contextual_inputs ?? {}) as Record<string, unknown>

  const edCount = args.contributionCounts.enterprise_development ?? 0
  const sdCount = args.contributionCounts.supplier_development ?? 0
  const sedCount = args.contributionCounts.socio_economic_development ?? 0
  const edElement = args.elements.find((row) => row.element_key === 'enterprise_development')
  const sdElement = args.elements.find((row) => row.element_key === 'supplier_development')
  const sedElement = args.elements.find((row) => row.element_key === 'socio_economic_development')

  const edConfirmed =
    edCount === 0 ||
    edElement?.status === 'complete' ||
    (edElement?.contextual_inputs as { benefitFactorsConfirmed?: boolean } | null)?.benefitFactorsConfirmed ===
      true
  const sdConfirmed =
    sdCount === 0 ||
    sdElement?.status === 'complete' ||
    (sdElement?.contextual_inputs as { benefitFactorsConfirmed?: boolean } | null)?.benefitFactorsConfirmed ===
      true
  const sedConfirmed =
    sedCount === 0 ||
    sedElement?.status === 'complete' ||
    (sedElement?.contextual_inputs as { confirmed?: boolean } | null)?.confirmed === true

  const items: NextActionItem[] = [
    {
      id: 'applicability',
      label: 'Applicability',
      href: `${base}/applicability`,
      complete: Boolean(applicability.entityType || isFilledNumber(applicability.annualRevenue)),
    },
    {
      id: 'financial',
      label: 'Financial denominator',
      href: `${base}/financial`,
      complete: Boolean(
        isFilledNumber(financial.revenue) ||
          isFilledNumber(financial.leviableAmount) ||
          isFilledNumber(financial.actualNpat),
      ),
    },
    {
      id: 'ownership',
      label: 'Ownership confirmation',
      href: `${base}/ownership`,
      complete: Boolean(
        isFilledNumber(ownership.blackVotingRightsPercentage) ||
          isFilledNumber(ownership.blackEconomicInterestPercentage) ||
          isFilledNumber(ownership.netValuePercentage),
      ),
    },
    {
      id: 'management_control',
      label: 'Management Control EAP target',
      href: `${base}/management-control`,
      complete: Boolean(mc?.import_snapshot) || hasMeaningfulInputs(mcInputs),
    },
    {
      id: 'skills_development',
      label: 'Skills eligibility',
      href: `${base}/skills-development`,
      complete:
        skillsInputs.setaWspAtrConfirmed === true ||
        skillsInputs.pivotalReportConfirmed === true ||
        hasMeaningfulInputs(skillsInputs),
    },
    {
      id: 'procurement',
      label: 'Procurement attachment',
      href: `${base}/procurement`,
      complete: Boolean(args.assessment.procurement_snapshot),
    },
    {
      id: 'enterprise_development',
      label: 'ED benefit factors',
      href: `${base}/enterprise-development`,
      complete: edConfirmed,
    },
    {
      id: 'supplier_development',
      label: 'Supplier Development benefit factors',
      href: `${base}/supplier-development`,
      complete: sdConfirmed,
    },
    {
      id: 'socio_economic_development',
      label: 'SED confirmation',
      href: `${base}/socio-economic-development`,
      complete: sedConfirmed,
    },
    {
      id: 'review_calculate',
      label: 'Review and calculate',
      href: `${base}/review`,
      complete: args.hasStoredCalculation && !args.needsRecalculation,
    },
  ]

  const nextAction = items.find((item) => !item.complete) ?? null
  const completedCount = items.filter((item) => item.complete).length
  const remainingCount = items.length - completedCount
  const percentComplete = Math.round((completedCount / items.length) * 100)

  const workbookUploaded = isWorkbookPresent(args.importStatus, args.hasPendingReview)

  const elementsReviewed = isWorkbookImportConfirmed(args.importStatus)
  const priorItemsComplete = items.slice(0, -1).every((item) => item.complete)

  const checklist: ReadinessChecklist = {
    workbookUploaded,
    elementsReviewed,
    procurementAttached: Boolean(args.assessment.procurement_snapshot),
    requiredConfirmationsRemaining: remainingCount,
    readyToCalculate: priorItemsComplete,
  }

  const currentStageId = mapStepSlugToStage(args.currentSlug, {
    importStatus: args.importStatus,
    hasPendingReview: args.hasPendingReview,
  })
  const currentStageIndex = Math.max(
    0,
    stages.findIndex((stage) => stage.id === currentStageId),
  )

  return {
    stages,
    currentStageId,
    currentStageIndex,
    percentComplete,
    previousHref: currentStageIndex > 0 ? stages[currentStageIndex - 1]!.href : null,
    continueHref: nextAction?.href ?? `${base}/review`,
    nextAction,
    items,
    completedCount,
    remainingCount,
    checklist,
    hasStoredCalculation: args.hasStoredCalculation,
    needsRecalculation: args.needsRecalculation,
  }
}

export function buildElementCardViews(args: {
  assessmentId: string
  preview: GenericScorecardCalculation
  elements: StoredElementRow[]
  hasStoredCalculation: boolean
  needsRecalculation: boolean
  workbookImported: boolean
}): ElementCardView[] {
  const base = basePath(args.assessmentId)

  return args.preview.elements.map((element) => {
    const stored = args.elements.find((row) => row.element_key === element.elementKey)
    const slug = ELEMENT_SLUG[element.elementKey] ?? ''
    const actionHref = slug ? `${base}/${slug}` : base

    let status: ElementCardStatus = 'not_started'
    const missingRequirements: string[] = []

    if (args.needsRecalculation && args.hasStoredCalculation) {
      status = 'needs_recalculation'
    } else if (args.hasStoredCalculation && element.status === 'scored') {
      status = 'complete'
    } else if (element.status === 'scored') {
      status = 'calculated'
    } else if (element.elementKey === 'preferential_procurement') {
      const hasProcurementData = Boolean(stored?.import_snapshot) || hasMeaningfulInputs(stored?.contextual_inputs)
      if (!hasProcurementData) {
        status = args.workbookImported ? 'needs_confirmation' : 'not_started'
        missingRequirements.push('Attach a Formal Procurement Assessment')
      }
    } else if (stored?.status === 'needs_review') {
      status = 'needs_confirmation'
      missingRequirements.push('Confirm imported values on this element page')
    } else if (args.workbookImported && (stored?.upload_filename || stored?.import_snapshot || hasMeaningfulInputs(stored?.contextual_inputs))) {
      if (element.status === 'partial' || element.status === 'missing_inputs' || element.status === 'not_started') {
        status = 'needs_confirmation'
        missingRequirements.push('Review and complete missing confirmations')
      } else {
        status = 'ready_to_calculate'
      }
    } else if (element.status === 'partial' || element.status === 'missing_inputs') {
      status = 'needs_confirmation'
      missingRequirements.push('Capture required inputs')
    } else if (hasMeaningfulInputs(stored?.contextual_inputs) || stored?.import_snapshot) {
      status = 'imported'
    }

    const dataSource =
      element.elementKey === 'preferential_procurement'
        ? 'Attached Procurement Assessment'
        : stored?.upload_filename || args.workbookImported
          ? 'Generic Scorecard workbook'
          : 'Manual entry'

    const description =
      status === 'not_started'
        ? 'No data captured yet for this section.'
        : status === 'imported'
          ? 'Data was imported from the workbook and is ready to review.'
          : status === 'needs_confirmation'
            ? 'This section still needs a confirmation or attachment before calculation.'
            : status === 'ready_to_calculate'
              ? 'Required inputs look complete for this section.'
              : status === 'needs_recalculation'
                ? 'Inputs changed after the last saved calculation.'
                : status === 'complete'
                  ? 'Included in the saved calculation.'
                  : 'Calculated in the current working view — save a calculation to store the result.'

    return {
      elementKey: element.elementKey,
      displayName: element.displayName,
      status,
      statusLabel: STATUS_LABELS[status],
      description,
      dataSource,
      missingRequirements,
      actionLabel:
        status === 'not_started'
          ? 'Start'
          : status === 'needs_confirmation'
            ? 'Continue'
            : status === 'needs_recalculation'
              ? 'Review changes'
              : 'Open',
      actionHref,
      showPoints: args.hasStoredCalculation && !args.needsRecalculation,
      basePointsAchieved: element.basePointsAchieved,
      basePointsAvailable:
        element.elementKey === 'preferential_procurement' ? 25 : element.basePointsAvailable,
      bonusPointsAchieved: element.bonusPointsAchieved,
      bonusPointsAvailable:
        element.elementKey === 'preferential_procurement' ? 2 : element.bonusPointsAvailable,
    }
  })
}

export function finalLevelDisplay(args: {
  hasStoredCalculation: boolean
  needsRecalculation: boolean
  readinessComplete: boolean
  level: string | null | undefined
}): { value: string; supportingMessage: string | null } {
  if (!args.hasStoredCalculation || args.needsRecalculation || !args.readinessComplete) {
    return {
      value: 'Not available',
      supportingMessage:
        'Complete all required information and calculate the scorecard to generate a final level.',
    }
  }
  return { value: args.level ?? 'Not available', supportingMessage: null }
}
