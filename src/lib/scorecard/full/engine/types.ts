export type EngineValueStatus = 'calculated' | 'not_calculated'

export interface EngineSourceMetricRef {
  metricKey: string
  sourceSheet: string
  sourceCell?: string | null
  sourceRange?: string | null
}

export interface FullEngineWarning {
  code: string
  message: string
  pillar?: string
  indicator?: string
}

export interface FullEngineError {
  code: string
  message: string
  pillar?: string
  indicator?: string
}

export interface FullScorecardEngineInputMetric {
  metricKey: string
  pillar: string
  numericValue: number | null
  textValue: string | null
  booleanValue: boolean | null
  valueType: string
  validationState: 'valid' | 'warning' | 'error'
  validationMessage?: string | null
  sourceSheet: string
  sourceCell?: string | null
  sourceRange?: string | null
}

export interface FullScorecardEngineInput {
  byPillar: Record<string, FullScorecardEngineInputMetric[]>
  byMetricKey: Record<string, FullScorecardEngineInputMetric>
  warnings: FullEngineWarning[]
  errors: FullEngineError[]
}

export interface FullScorecardIndicatorResult {
  key: string
  label: string
  target: number | null
  percentageAchieved: number | null
  availablePoints: number | null
  achievedPoints: number | null
  possiblePoints1: number | null
  possiblePoints2: number | null
  status: EngineValueStatus
  missingMetricKeys: string[]
  sourceMetrics: EngineSourceMetricRef[]
  warnings: string[]
}

export interface FullScorecardSectionResult {
  key: string
  label: string
  indicators: FullScorecardIndicatorResult[]
}

export interface FullScorecardPillarResult {
  key: string
  label: string
  availablePoints: number | null
  achievedPoints: number | null
  possiblePoints1: number | null
  possiblePoints2: number | null
  status: EngineValueStatus
  sections: FullScorecardSectionResult[]
  warnings: string[]
}

/** Whether all five generic scorecard pillars contributed a calculated rollup (required for level assignment). */
export type OverallScoreCompleteness = 'complete' | 'partial'

export interface FullScorecardOverallResult {
  totalAvailablePoints: number | null
  totalScore: number | null
  bbbeeLevel: string | null
  recognitionPercentage: number | null
  discountingApplicable: boolean | null
  /** `complete` only when Ownership, MC, Skills, Procurement/ESD, and SED pillars all have a calculated rollup. */
  scoreCompleteness: OverallScoreCompleteness
  /** Pillar display names still missing for a complete score (empty when `scoreCompleteness` is `complete`). */
  missingPillarsForCompleteScore: string[]
}

export type ReconciliationRowStatus =
  | 'matched'
  | 'variance'
  | 'not_available'
  | 'not_calculated'
  | 'ambiguous_reference'

export const PRIMARY_REFERENCE_FINAL_SCORE_KEY = 'full_scorecard.reference.final_score'

export interface FullScorecardOverallReconciliation {
  referenceMetricKey: string
  referenceFinalScore: number | null
  referenceSourceCell: string | null
  calculatedFinalScore: number | null
  variance: number | null
  status: ReconciliationRowStatus
  reason: string | null
}

export interface FullScorecardElementReconciliation {
  elementKey: string
  label: string
  referenceAvailablePoints: number | null
  referenceAvailableSourceCell: string | null
  referenceAchievedPoints: number | null
  referenceAchievedSourceCell: string | null
  calculatedAvailablePoints: number | null
  calculatedAchievedPoints: number | null
  achievedVariance: number | null
  status: ReconciliationRowStatus
  reason: string | null
}

export interface FullScorecardReconciliationResult {
  overall: FullScorecardOverallReconciliation
  elements: FullScorecardElementReconciliation[]
}

export interface FullScorecardValidationSourceRef {
  metricKey: string
  sourceSheet: string
  sourceCell: string | null
  validationState?: 'valid' | 'warning' | 'error'
}

export interface FullScorecardValidationElementSummary {
  elementKey: string
  label: string
  referenceAchievedPoints: number | null
  referenceAchievedSourceCell: string | null
  referenceAvailablePoints: number | null
  referenceAvailableSourceCell: string | null
  calculatedAchievedPoints: number | null
  calculatedAvailablePoints: number | null
  achievedVariance: number | null
  reconciliationStatus: ReconciliationRowStatus
  reconciliationReason: string | null
  /** Distinct source metrics attached to the calculated indicator(s) for this element. */
  sourceMetricRefs: FullScorecardValidationSourceRef[]
  indicatorMissingMetricKeys: string[]
  indicatorWarnings: string[]
}

export interface FullScorecardValidationSummary {
  generatedAt: string
  scoreCompleteness: OverallScoreCompleteness
  missingPillarsForCompleteScore: string[]
  overall: {
    referenceFinalScore: number | null
    referenceSourceCell: string | null
    calculatedFinalScore: number | null
    variance: number | null
    status: ReconciliationRowStatus
    reason: string | null
  }
  elements: FullScorecardValidationElementSummary[]
  /** Reference metrics that are warning/error (reconciliation comparison may be unreliable). */
  referenceMetricIssues: Array<{
    metricKey: string
    validationState: 'valid' | 'warning' | 'error'
    validationMessage: string | null
    sourceCell: string | null
  }>
  inputMetricQuality: {
    totalKeys: number
    valid: number
    warning: number
    error: number
  }
  /** Human-readable notes for variance debugging (not scoring inputs). */
  interpretationHints: string[]
}

export interface FullScorecardEngineResult {
  engineVersion: string
  overall: FullScorecardOverallResult
  pillars: FullScorecardPillarResult[]
  reconciliation: FullScorecardReconciliationResult
  warnings: FullEngineWarning[]
  errors: FullEngineError[]
  /** Developer / variance summary; safe to ignore in production UI unless debugging. */
  validationSummary?: FullScorecardValidationSummary
}
