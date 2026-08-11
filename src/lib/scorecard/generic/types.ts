import type { GenericElementKey, RuleSet } from '../rules/types'
import type { IndicatorResult } from './scoring'

export type ElementStatus =
  /** Every indicator scored from complete inputs. */
  | 'scored'
  /** Some indicators scored, others are waiting on inputs. */
  | 'partial'
  /**
   * Every indicator scored, but the element achieved nothing because a human
   * confirmation is outstanding (evidence on imported contributions). Distinct
   * from `scored`, which means a genuine zero.
   */
  | 'pending_confirmation'
  /** No indicator could be scored. */
  | 'missing_inputs'
  /** No data has been supplied for this element at all. */
  | 'not_started'

export type ElementResult = {
  elementKey: GenericElementKey
  displayName: string
  indicators: IndicatorResult[]
  basePointsAvailable: number
  bonusPointsAvailable: number
  basePointsAchieved: number
  bonusPointsAchieved: number
  status: ElementStatus
  missingInputs: string[]
  warnings: string[]
}

export function summariseElement(args: {
  elementKey: GenericElementKey
  displayName: string
  indicators: IndicatorResult[]
  basePointsAvailable: number
  bonusPointsAvailable: number
  missingInputs?: string[]
  warnings?: string[]
  notStarted?: boolean
  /**
   * True when inputs are present but nothing was recognised because a human
   * confirmation is outstanding. Only downgrades a would-be `scored` zero.
   */
  pendingConfirmation?: boolean
}): ElementResult {
  const { indicators } = args
  const scored = indicators.filter((indicator) => indicator.status === 'scored')
  const unscored = indicators.filter((indicator) => indicator.status !== 'scored')

  const basePointsAchieved = scored.reduce((sum, indicator) => sum + (indicator.basePointsAchieved ?? 0), 0)
  const bonusPointsAchieved = scored.reduce((sum, indicator) => sum + (indicator.bonusPointsAchieved ?? 0), 0)

  const declaredMissing = args.missingInputs ?? []

  let status: ElementStatus
  if (args.notStarted || indicators.length === 0) status = 'not_started'
  else if (unscored.length === 0) status = declaredMissing.length > 0 ? 'partial' : 'scored'
  else if (scored.length === 0) status = 'missing_inputs'
  else status = 'partial'

  // A zero that is only waiting on a human tick is not the same as a genuine
  // zero. Deliberately narrow: it never rewrites 'partial', 'missing_inputs'
  // or 'not_started', so sub-minimum evaluation is unchanged.
  if (status === 'scored' && args.pendingConfirmation && basePointsAchieved === 0) {
    status = 'pending_confirmation'
  }

  const missingInputs = [
    ...declaredMissing,
    ...unscored.map((indicator) => `${indicator.displayName}: ${indicator.explanation}`),
  ]

  return {
    elementKey: args.elementKey,
    displayName: args.displayName,
    indicators,
    basePointsAvailable: args.basePointsAvailable,
    bonusPointsAvailable: args.bonusPointsAvailable,
    basePointsAchieved: round2(basePointsAchieved),
    bonusPointsAchieved: round2(bonusPointsAchieved),
    status,
    missingInputs,
    warnings: [...(args.warnings ?? []), ...indicators.flatMap((indicator) => indicator.warnings)],
  }
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export type PrioritySubminimumOutcome = {
  key: string
  label: string
  elementKey: GenericElementKey
  /** 40% of the basis points. */
  thresholdPoints: number
  basisPoints: number
  /** Points actually achieved on the measure being tested. */
  achievedPoints: number | null
  passed: boolean | null
  /** Null when the element has not been scored yet. */
  evaluated: boolean
  explanation: string
}

export type LevelOutcome = {
  level: string
  recognitionPercentage: number
}

export type ScorecardReadiness = {
  /** True when a final B-BBEE level may be shown. */
  complete: boolean
  reasons: string[]
}

export type GenericScorecardResult = {
  ruleSetKey: string
  ruleSetVersion: string
  ruleSetDisplayName: string
  /** The exact rule set used, persisted so the result stays reproducible. */
  ruleSet: RuleSet
  elements: ElementResult[]
  totalBasePointsAvailable: number
  totalBonusPointsAvailable: number
  totalBasePointsAchieved: number
  totalBonusPointsAchieved: number
  rawTotalPoints: number
  preliminaryLevel: LevelOutcome
  prioritySubminimums: PrioritySubminimumOutcome[]
  /** True when at least one evaluated priority sub-minimum failed. */
  discountApplied: boolean
  failedPriorityKeys: string[]
  finalLevel: LevelOutcome
  readiness: ScorecardReadiness
  warnings: string[]
}

export type GenericEngineContext = {
  ruleSet: RuleSet
}
