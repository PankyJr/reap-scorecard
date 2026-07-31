import type { RuleSet } from '../../rules/types'
import { elementWeighting, indicatorsForElement } from '../../rules/types'
import { missingInputResult, scoreProportionalIndicator, type IndicatorResult } from '../scoring'
import { summariseElement, type ElementResult } from '../types'

/**
 * A frozen snapshot of a completed Formal Procurement Assessment.
 *
 * The full scorecard never re-imports suppliers. It stores the measured
 * spend ratios produced by the procurement system at a point in time, then
 * scores them against the selected rule set so that the points are consistent
 * with the rest of the scorecard.
 */
export type ProcurementSnapshot = {
  sourceAssessmentId: string
  sourceAssessmentName: string
  measurementPeriodStart: string | null
  measurementPeriodEnd: string | null
  capturedAt: string
  capturedBy: string | null
  totalMeasuredProcurementSpend: number | null
  /** Recognised B-BBEE spend per criterion, keyed by generic indicator key. */
  recognisedSpend: Partial<Record<ProcurementCriterionKey, number>>
  /** Whether the 51% flow-through calculation was applied in the source system. */
  flowThroughApplied: boolean
  /** Points the source system reported, kept for reconciliation only. */
  sourceReportedBasePoints: number | null
  sourceReportedBonusPoints: number | null
}

export const PROCUREMENT_CRITERION_KEYS = [
  'preferential_procurement.all_empowering_suppliers',
  'preferential_procurement.qse',
  'preferential_procurement.eme',
  'preferential_procurement.black_owned_51',
  'preferential_procurement.black_women_owned_30',
  'preferential_procurement.bonus.designated_group',
] as const

export type ProcurementCriterionKey = (typeof PROCUREMENT_CRITERION_KEYS)[number]

export function calculatePreferentialProcurement(args: {
  ruleSet: RuleSet
  snapshot: ProcurementSnapshot | null
}): ElementResult {
  const { ruleSet, snapshot } = args
  const rules = indicatorsForElement(ruleSet, 'preferential_procurement')
  const weighting = elementWeighting(ruleSet, 'preferential_procurement')

  const missingInputs: string[] = []
  const warnings: string[] = []
  const results: IndicatorResult[] = []

  if (!snapshot) {
    for (const rule of rules) {
      results.push(
        missingInputResult({
          rule,
          reason: 'No completed procurement assessment has been attached to this scorecard.',
        }),
      )
    }
    return summariseElement({
      elementKey: 'preferential_procurement',
      displayName: weighting.displayName,
      indicators: results,
      basePointsAvailable: weighting.basePoints,
      bonusPointsAvailable: weighting.bonusPoints,
      missingInputs: ['Attached procurement assessment'],
      warnings,
      notStarted: true,
    })
  }

  const tmps = snapshot.totalMeasuredProcurementSpend
  if (tmps == null || tmps <= 0) missingInputs.push('Total measured procurement spend')

  for (const rule of rules) {
    const key = rule.key as ProcurementCriterionKey
    const recognised = snapshot.recognisedSpend[key] ?? null
    results.push(
      scoreProportionalIndicator({
        rule,
        numerator: recognised,
        denominator: tmps,
        missingInputReason:
          tmps == null || tmps <= 0
            ? 'The attached procurement assessment does not carry a positive total measured procurement spend.'
            : `The attached procurement assessment does not carry recognised spend for ${rule.displayName.toLowerCase()}.`,
      }),
    )
  }

  warnings.push(
    `Scored from a frozen snapshot of "${snapshot.sourceAssessmentName}" captured on ${snapshot.capturedAt}. Changing the underlying procurement assessment does not change this result until the snapshot is explicitly replaced.`,
  )
  if (snapshot.flowThroughApplied) {
    warnings.push('The 51% flow-through calculation from the procurement assessment is preserved in this snapshot.')
  }

  const computedBase = results.reduce((sum, indicator) => sum + (indicator.basePointsAchieved ?? 0), 0)
  if (
    snapshot.sourceReportedBasePoints != null &&
    Math.abs(snapshot.sourceReportedBasePoints - computedBase) > 0.01
  ) {
    warnings.push(
      `The procurement assessment reported ${snapshot.sourceReportedBasePoints.toFixed(2)} base points, while the ${ruleSet.key} rule set scores the same spend at ${computedBase.toFixed(2)}. Review the difference before relying on the final level.`,
    )
  }

  return summariseElement({
    elementKey: 'preferential_procurement',
    displayName: weighting.displayName,
    indicators: results,
    basePointsAvailable: weighting.basePoints,
    bonusPointsAvailable: weighting.bonusPoints,
    missingInputs,
    warnings,
  })
}
