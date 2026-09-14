import type { GenericElementKey, LevelBandRule, RuleSet } from '../rules/types'
import { netValuePointsFrom } from './elements/ownership'
import type { ApplicabilityResult } from './applicability'
import type { NpatResolution } from './financial'
import {
  round2,
  type ElementResult,
  type GenericScorecardResult,
  type LevelOutcome,
  type PrioritySubminimumOutcome,
  type ScorecardReadiness,
} from './types'

export function resolveLevel(bands: LevelBandRule[], totalPoints: number | null): LevelOutcome {
  const fallback = bands[bands.length - 1]
  if (totalPoints == null || Number.isNaN(totalPoints)) {
    return { level: fallback.level, recognitionPercentage: fallback.recognitionPercentage }
  }
  for (const band of bands) {
    const aboveMin = totalPoints >= band.min
    const belowMax = band.maxExclusive == null || totalPoints < band.maxExclusive
    if (aboveMin && belowMax) {
      return { level: band.level, recognitionPercentage: band.recognitionPercentage }
    }
  }
  return { level: fallback.level, recognitionPercentage: fallback.recognitionPercentage }
}

/**
 * Discount a level by exactly one step.
 *
 * Statement 000 §3.3.3.1 discounts by one level for any failure, or any
 * combination of failures. Multiple failed sub-minimums never compound.
 */
export function discountLevelByOne(bands: LevelBandRule[], level: LevelOutcome): LevelOutcome {
  const index = bands.findIndex((band) => band.level === level.level)
  if (index < 0) return level
  const next = bands[index + 1]
  if (!next) return level
  return { level: next.level, recognitionPercentage: next.recognitionPercentage }
}

function elementByKey(elements: ElementResult[], key: GenericElementKey): ElementResult | undefined {
  return elements.find((element) => element.elementKey === key)
}

export function evaluatePrioritySubminimums(args: {
  ruleSet: RuleSet
  elements: ElementResult[]
}): PrioritySubminimumOutcome[] {
  const { ruleSet, elements } = args

  return ruleSet.prioritySubminimums.map((rule) => {
    const thresholdPoints = round2(rule.basisPoints * rule.fraction)
    const element = elementByKey(elements, rule.elementKey)

    if (!element || element.status === 'not_started' || element.status === 'missing_inputs') {
      return {
        key: rule.key,
        label: rule.label,
        elementKey: rule.elementKey,
        thresholdPoints,
        basisPoints: rule.basisPoints,
        achievedPoints: null,
        passed: null,
        evaluated: false,
        explanation: `${rule.label} has not been scored yet, so its ${rule.fraction * 100}% sub-minimum cannot be tested.`,
      }
    }

    let achievedPoints: number | null
    if (rule.measure === 'ownership_net_value_points') {
      achievedPoints = netValuePointsFrom(element)
    } else {
      // Only the base indicators matter. An unscored bonus indicator must not
      // block the sub-minimum test.
      const baseIndicators = element.indicators.filter((indicator) => indicator.basePointsAvailable > 0)
      const allBaseScored =
        baseIndicators.length > 0 && baseIndicators.every((indicator) => indicator.status === 'scored')
      achievedPoints = allBaseScored ? element.basePointsAchieved : null
    }

    if (achievedPoints == null) {
      return {
        key: rule.key,
        label: rule.label,
        elementKey: rule.elementKey,
        thresholdPoints,
        basisPoints: rule.basisPoints,
        achievedPoints: null,
        passed: null,
        evaluated: false,
        explanation:
          rule.measure === 'ownership_net_value_points'
            ? 'Net value has not been scored, so the ownership priority sub-minimum cannot be tested.'
            : `${rule.label} is only partially scored, so its sub-minimum cannot be tested.`,
      }
    }

    const passed = achievedPoints >= thresholdPoints
    return {
      key: rule.key,
      label: rule.label,
      elementKey: rule.elementKey,
      thresholdPoints,
      basisPoints: rule.basisPoints,
      achievedPoints: round2(achievedPoints),
      passed,
      evaluated: true,
      explanation: passed
        ? `${achievedPoints.toFixed(2)} points achieved against a ${thresholdPoints.toFixed(2)} point sub-minimum (${rule.fraction * 100}% of ${rule.basisPoints}).`
        : `${achievedPoints.toFixed(2)} points achieved, below the ${thresholdPoints.toFixed(2)} point sub-minimum (${rule.fraction * 100}% of ${rule.basisPoints}). The B-BBEE status is discounted by one level.`,
    }
  })
}

export type AggregateArgs = {
  ruleSet: RuleSet
  elements: ElementResult[]
  applicability: ApplicabilityResult
  npat: NpatResolution
  /** False when a reserved draft rule set is in use. */
  ruleSetOperative: boolean
  /** Extra readiness blockers from the persistence layer, e.g. unresolved reviews. */
  additionalReadinessBlockers?: string[]
}

export function aggregateGenericScorecard(args: AggregateArgs): GenericScorecardResult {
  const { ruleSet, elements, applicability, npat, ruleSetOperative } = args

  const totalBasePointsAvailable = ruleSet.elements.reduce((sum, element) => sum + element.basePoints, 0)
  const totalBonusPointsAvailable = ruleSet.elements.reduce((sum, element) => sum + element.bonusPoints, 0)
  const totalBasePointsAchieved = round2(elements.reduce((sum, element) => sum + element.basePointsAchieved, 0))
  const totalBonusPointsAchieved = round2(elements.reduce((sum, element) => sum + element.bonusPointsAchieved, 0))
  const rawTotalPoints = round2(totalBasePointsAchieved + totalBonusPointsAchieved)

  const preliminaryLevel = resolveLevel(ruleSet.levelBands, rawTotalPoints)
  const prioritySubminimums = evaluatePrioritySubminimums({ ruleSet, elements })
  const failed = prioritySubminimums.filter((outcome) => outcome.evaluated && outcome.passed === false)
  const discountApplied = failed.length > 0
  const finalLevel = discountApplied ? discountLevelByOne(ruleSet.levelBands, preliminaryLevel) : preliminaryLevel

  const readiness = evaluateReadiness({
    ruleSet,
    elements,
    applicability,
    npat,
    prioritySubminimums,
    ruleSetOperative,
    additionalReadinessBlockers: args.additionalReadinessBlockers ?? [],
  })

  const warnings: string[] = []
  if (discountApplied) {
    warnings.push(
      `The preliminary ${preliminaryLevel.level} is discounted to ${finalLevel.level} because ${failed.length} priority sub-minimum${failed.length === 1 ? '' : 's'} were not met: ${failed.map((outcome) => outcome.label).join('; ')}. The actual points achieved are preserved.`,
    )
  }
  if (npat.requiresAuthorisedConfirmation) {
    warnings.push(`The NPAT denominator requires authorised confirmation. ${npat.reason}`)
  }
  warnings.push(...applicability.warnings)

  return {
    ruleSetKey: ruleSet.key,
    ruleSetVersion: ruleSet.version,
    ruleSetDisplayName: ruleSet.displayName,
    /** The exact rules this result was produced under, for freezing. */
    ruleSet,
    elements,
    totalBasePointsAvailable,
    totalBonusPointsAvailable,
    totalBasePointsAchieved,
    totalBonusPointsAchieved,
    rawTotalPoints,
    preliminaryLevel,
    prioritySubminimums,
    discountApplied,
    failedPriorityKeys: failed.map((outcome) => outcome.key),
    finalLevel,
    readiness,
    warnings,
  }
}

function evaluateReadiness(args: {
  ruleSet: RuleSet
  elements: ElementResult[]
  applicability: ApplicabilityResult
  npat: NpatResolution
  prioritySubminimums: PrioritySubminimumOutcome[]
  ruleSetOperative: boolean
  additionalReadinessBlockers: string[]
}): ScorecardReadiness {
  const reasons: string[] = []

  if (!args.ruleSetOperative) {
    reasons.push('The selected rule set is a reserved draft and cannot produce a final B-BBEE level.')
  }
  if (!args.applicability.mayProduceGenericFinalLevel) {
    reasons.push(...args.applicability.blockingReasons)
  }
  if (args.npat.applicableNpat == null) {
    reasons.push('The applicable NPAT denominator has not been resolved.')
  } else if (args.npat.requiresAuthorisedConfirmation) {
    reasons.push('The applicable NPAT denominator still requires authorised confirmation.')
  }

  const expected = new Set(args.ruleSet.elements.map((element) => element.elementKey))
  for (const key of expected) {
    const element = args.elements.find((candidate) => candidate.elementKey === key)
    if (!element) {
      reasons.push(`${key} has not been calculated.`)
      continue
    }
    if (element.status !== 'scored') {
      reasons.push(`${element.displayName} is ${element.status.replace('_', ' ')}.`)
    }
  }

  for (const outcome of args.prioritySubminimums) {
    if (!outcome.evaluated) {
      reasons.push(`The ${outcome.label} priority sub-minimum could not be tested.`)
    }
  }

  reasons.push(...args.additionalReadinessBlockers)

  return { complete: reasons.length === 0, reasons }
}

export const PARTIAL_RESULT_MESSAGE = 'Partial scorecard result. This is not a complete B-BBEE level.'
