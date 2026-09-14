import type { RuleSet } from '../../rules/types'
import { elementWeighting, indicatorsForElement } from '../../rules/types'
import { missingInputResult, scoreProportionalIndicator, type IndicatorResult } from '../scoring'
import { round2, summariseElement, type ElementResult } from '../types'

/**
 * Generic Scorecard product caps for Preferential Procurement.
 *
 * Statement 400 criterion weights still sum to 27 base (GN 304 raised 51%
 * black-owned procurement to 11 points). Statement 000 and the Generic
 * Calculator product model contribute at most 25 base + 2 bonus to the
 * overall score and display.
 */
export const PROCUREMENT_BASE_CAP = 25
export const PROCUREMENT_BONUS_CAP = 2
export const PROCUREMENT_COMBINED_CAP = PROCUREMENT_BASE_CAP + PROCUREMENT_BONUS_CAP

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
  /**
   * Points the source Formal Procurement Assessment reported, normalised into
   * base vs bonus. Original combined total (if any) is preserved separately.
   */
  sourceReportedBasePoints: number | null
  sourceReportedBonusPoints: number | null
  /** Original combined / raw total from the source assessment before normalisation. */
  sourceReportedCombinedPoints?: number | null
  /** Audit note when the source total looked like a combined base+bonus figure. */
  sourceNormalisationWarning?: string | null
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

/** Cap element contribution for Generic aggregation / display. Indicator rows stay uncapped at their own available points. */
export function applyProcurementElementCaps(args: {
  basePointsAchieved: number
  bonusPointsAchieved: number
}): {
  basePointsAchieved: number
  bonusPointsAchieved: number
  combinedPoints: number
  baseWasCapped: boolean
  bonusWasCapped: boolean
} {
  const basePointsAchieved = round2(Math.min(Math.max(args.basePointsAchieved, 0), PROCUREMENT_BASE_CAP))
  const bonusPointsAchieved = round2(Math.min(Math.max(args.bonusPointsAchieved, 0), PROCUREMENT_BONUS_CAP))
  return {
    basePointsAchieved,
    bonusPointsAchieved,
    combinedPoints: round2(basePointsAchieved + bonusPointsAchieved),
    baseWasCapped: args.basePointsAchieved > PROCUREMENT_BASE_CAP + 1e-9,
    bonusWasCapped: args.bonusPointsAchieved > PROCUREMENT_BONUS_CAP + 1e-9,
  }
}

/**
 * Separate a Formal Procurement Assessment total into base vs bonus for audit.
 * Never trusts a combined total as if it were base-only.
 */
export function normaliseSourceProcurementPoints(args: {
  combinedTotal: number | null | undefined
  categoryBasePoints: number
  categoryBonusPoints: number
}): {
  sourceReportedBasePoints: number
  sourceReportedBonusPoints: number
  sourceReportedCombinedPoints: number | null
  sourceNormalisationWarning: string | null
} {
  const bonusRaw = Math.max(0, args.categoryBonusPoints)
  const baseRaw = Math.max(0, args.categoryBasePoints)
  const combined =
    args.combinedTotal != null && Number.isFinite(args.combinedTotal)
      ? Math.max(0, Number(args.combinedTotal))
      : null

  const separatedBonus = round2(Math.min(bonusRaw, PROCUREMENT_BONUS_CAP))
  let separatedBase = round2(Math.min(baseRaw, PROCUREMENT_BASE_CAP))
  let warning: string | null = null

  if (combined != null) {
    const impliedBase = round2(Math.max(0, combined - bonusRaw))
    // If the stored total looks like base+bonus (or was treated as base-only), keep the audit trail.
    if (Math.abs(combined - (baseRaw + bonusRaw)) <= 0.05 || combined > PROCUREMENT_BASE_CAP + 1e-9) {
      separatedBase = round2(Math.min(impliedBase, PROCUREMENT_BASE_CAP))
      warning =
        `Source procurement total ${combined.toFixed(2)} was treated as a combined figure ` +
        `(base ${separatedBase.toFixed(2)} + bonus ${separatedBonus.toFixed(2)}); ` +
        `original total preserved for audit.`
    }
  }

  return {
    sourceReportedBasePoints: separatedBase,
    sourceReportedBonusPoints: separatedBonus,
    sourceReportedCombinedPoints: combined,
    sourceNormalisationWarning: warning,
  }
}

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

  const availableBase = Math.min(weighting.basePoints, PROCUREMENT_BASE_CAP)
  const availableBonus = Math.min(weighting.bonusPoints, PROCUREMENT_BONUS_CAP)

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
      basePointsAvailable: availableBase,
      bonusPointsAvailable: availableBonus,
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
  if (snapshot.sourceNormalisationWarning) {
    warnings.push(snapshot.sourceNormalisationWarning)
  }

  const summarised = summariseElement({
    elementKey: 'preferential_procurement',
    displayName: weighting.displayName,
    indicators: results,
    basePointsAvailable: availableBase,
    bonusPointsAvailable: availableBonus,
    missingInputs,
    warnings,
  })

  const capped = applyProcurementElementCaps({
    basePointsAchieved: summarised.basePointsAchieved,
    bonusPointsAchieved: summarised.bonusPointsAchieved,
  })

  if (capped.baseWasCapped) {
    summarised.warnings.push(
      `Procurement base points calculated at ${summarised.basePointsAchieved.toFixed(2)} were capped at ${PROCUREMENT_BASE_CAP} for Generic scorecard aggregation. Criterion rows retain their Statement 400 available points.`,
    )
  }
  if (capped.bonusWasCapped) {
    summarised.warnings.push(
      `Procurement bonus points calculated at ${summarised.bonusPointsAchieved.toFixed(2)} were capped at ${PROCUREMENT_BONUS_CAP}.`,
    )
  }

  const computedBase = capped.basePointsAchieved
  if (
    snapshot.sourceReportedBasePoints != null &&
    Math.abs(snapshot.sourceReportedBasePoints - computedBase) > 0.01
  ) {
    summarised.warnings.push(
      `The procurement assessment reported ${snapshot.sourceReportedBasePoints.toFixed(2)} base points, while the ${ruleSet.key} rule set scores the same spend at ${computedBase.toFixed(2)}. Review the difference before relying on the final level.`,
    )
  }

  return {
    ...summarised,
    basePointsAchieved: capped.basePointsAchieved,
    bonusPointsAchieved: capped.bonusPointsAchieved,
  }
}
