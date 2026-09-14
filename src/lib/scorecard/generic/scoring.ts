import type { IndicatorRule, RuleSource } from '../rules/types'

export type IndicatorStatus =
  /** Scored from complete inputs. */
  | 'scored'
  /** A required numerator or denominator is absent; no points are awarded. */
  | 'missing_inputs'
  /** An eligibility gate or unresolved rule prevents scoring. */
  | 'blocked'

export type IndicatorResult = {
  indicatorKey: string
  displayName: string
  /** Effective target actually applied (may differ from the rule target, e.g. plus-one-vote). */
  target: number
  targetLabel: string
  numerator: number | null
  denominator: number | null
  /** numerator / denominator, or null when it could not be computed. */
  actual: number | null
  basePointsAvailable: number
  bonusPointsAvailable: number
  basePointsAchieved: number | null
  bonusPointsAchieved: number | null
  status: IndicatorStatus
  warnings: string[]
  explanation: string
  ruleSource: RuleSource
  /** Per-EAP-band detail for disaggregated indicators. */
  eapBands?: EapBandResult[]
}

export type EapBandResult = {
  bandKey: string
  label: string
  headcount: number
  sharePercentage: number
  adjustedEapPercentage: number
  splitComplianceTarget: number
  maximumBandPoints: number
  pointsAwarded: number
}

/** Rounding used for stored and displayed points. Two decimals matches verification practice. */
export function roundPoints(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function safeRatio(numerator: number | null | undefined, denominator: number | null | undefined): number | null {
  if (numerator == null || denominator == null) return null
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return null
  if (denominator === 0) return null
  return numerator / denominator
}

/**
 * points = min(actual / target, 1) × availablePoints
 *
 * A zero or negative target cannot be scored proportionally; the caller must
 * treat that as a missing input rather than dividing by zero.
 */
export function proportionalPoints(args: {
  actual: number | null
  target: number
  availablePoints: number
}): number | null {
  const { actual, target, availablePoints } = args
  if (actual == null || !Number.isFinite(actual)) return null
  if (!Number.isFinite(target) || target <= 0) return null
  if (availablePoints <= 0) return 0
  const ratio = actual / target
  if (!Number.isFinite(ratio)) return null
  return roundPoints(Math.min(Math.max(ratio, 0), 1) * availablePoints)
}

/**
 * Resolve the effective target for a "25% plus one vote" style indicator.
 *
 * With exact vote counts the target is (25% of total votes + 1) / total votes.
 * Without them we fall back to the widely used 25.1% approximation and say so.
 */
export function resolvePlusOneVoteTarget(args: {
  baseTarget: number
  totalVotes: number | null | undefined
}): { target: number; approximation: boolean; note: string } {
  const { baseTarget, totalVotes } = args
  if (totalVotes != null && Number.isFinite(totalVotes) && totalVotes > 0) {
    const target = (baseTarget * totalVotes + 1) / totalVotes
    return {
      target,
      approximation: false,
      note: `Target computed exactly from ${totalVotes} total exercisable votes: (${(baseTarget * 100).toFixed(0)}% × ${totalVotes} + 1) ÷ ${totalVotes} = ${(target * 100).toFixed(4)}%.`,
    }
  }
  const target = baseTarget + 0.001
  return {
    target,
    approximation: true,
    note: `Total exercisable votes were not supplied, so the "${(baseTarget * 100).toFixed(0)}% plus one vote" target is approximated as ${(target * 100).toFixed(1)}%. Capture exact vote counts for an exact result.`,
  }
}

export function missingInputResult(args: {
  rule: IndicatorRule
  target?: number
  numerator?: number | null
  denominator?: number | null
  reason: string
  status?: IndicatorStatus
}): IndicatorResult {
  const { rule, reason } = args
  return {
    indicatorKey: rule.key,
    displayName: rule.displayName,
    target: args.target ?? rule.target,
    targetLabel: rule.targetLabel,
    numerator: args.numerator ?? null,
    denominator: args.denominator ?? null,
    actual: null,
    basePointsAvailable: rule.basePoints,
    bonusPointsAvailable: rule.bonusPoints,
    basePointsAchieved: null,
    bonusPointsAchieved: null,
    status: args.status ?? 'missing_inputs',
    warnings: [reason],
    explanation: reason,
    ruleSource: rule.source,
  }
}

/** Score a plain proportional indicator from a numerator and denominator. */
export function scoreProportionalIndicator(args: {
  rule: IndicatorRule
  numerator: number | null
  denominator: number | null
  /** Overrides `rule.target` (used for plus-one-vote resolution). */
  effectiveTarget?: number
  extraWarnings?: string[]
  missingInputReason?: string
}): IndicatorResult {
  const { rule, numerator, denominator } = args
  const target = args.effectiveTarget ?? rule.target
  const warnings = [...(args.extraWarnings ?? [])]

  const actual = safeRatio(numerator, denominator)
  if (actual == null) {
    const reason =
      args.missingInputReason ??
      (denominator == null || denominator === 0
        ? `${rule.denominatorLabel} is missing or zero, so ${rule.displayName.toLowerCase()} cannot be scored.`
        : `${rule.numeratorLabel} is missing, so ${rule.displayName.toLowerCase()} cannot be scored.`)
    const result = missingInputResult({ rule, target, numerator, denominator, reason })
    result.warnings = [...warnings, ...result.warnings]
    return result
  }

  const points = proportionalPoints({ actual, target, availablePoints: rule.basePoints + rule.bonusPoints })
  if (points == null) {
    const reason = `Target for ${rule.displayName.toLowerCase()} is not a positive number, so it cannot be scored.`
    const result = missingInputResult({ rule, target, numerator, denominator, reason })
    result.warnings = [...warnings, ...result.warnings]
    return result
  }

  const isBonus = rule.bonusPoints > 0 && rule.basePoints === 0

  return {
    indicatorKey: rule.key,
    displayName: rule.displayName,
    target,
    targetLabel: rule.targetLabel,
    numerator,
    denominator,
    actual,
    basePointsAvailable: rule.basePoints,
    bonusPointsAvailable: rule.bonusPoints,
    basePointsAchieved: isBonus ? 0 : points,
    bonusPointsAchieved: isBonus ? points : 0,
    status: 'scored',
    warnings,
    explanation:
      `${formatPercentage(actual)} achieved against a ${rule.targetLabel} target. ` +
      `min(${formatPercentage(actual)} ÷ ${formatPercentage(target)}, 100%) × ${rule.basePoints + rule.bonusPoints} points = ${points.toFixed(2)} points.`,
    ruleSource: rule.source,
  }
}

/** Score an all-or-nothing bonus that depends on a confirmed yes/no plus evidence. */
export function scoreBooleanBonus(args: {
  rule: IndicatorRule
  confirmed: boolean | null
  evidenceProvided: boolean
}): IndicatorResult {
  const { rule, confirmed, evidenceProvided } = args

  if (confirmed == null) {
    return missingInputResult({
      rule,
      reason: `${rule.displayName} has not been confirmed either way, so no bonus point is awarded.`,
    })
  }

  if (confirmed && !evidenceProvided) {
    return {
      ...missingInputResult({
        rule,
        reason: `${rule.displayName} was confirmed but no supporting evidence was recorded, so the bonus point is withheld.`,
        status: 'blocked',
      }),
      basePointsAchieved: 0,
      bonusPointsAchieved: 0,
    }
  }

  const points = confirmed ? rule.bonusPoints : 0
  return {
    indicatorKey: rule.key,
    displayName: rule.displayName,
    target: rule.target,
    targetLabel: rule.targetLabel,
    numerator: confirmed ? 1 : 0,
    denominator: 1,
    actual: confirmed ? 1 : 0,
    basePointsAvailable: rule.basePoints,
    bonusPointsAvailable: rule.bonusPoints,
    basePointsAchieved: 0,
    bonusPointsAchieved: points,
    status: 'scored',
    warnings: [],
    explanation: confirmed
      ? `Confirmed with evidence: ${rule.bonusPoints} bonus point${rule.bonusPoints === 1 ? '' : 's'} awarded.`
      : 'Not confirmed: no bonus points awarded.',
    ruleSource: rule.source,
  }
}

// ---------------------------------------------------------------------------
// EAP demographic disaggregation
// ---------------------------------------------------------------------------

export const EAP_DEMOGRAPHIC_KEYS = [
  'african_male',
  'coloured_male',
  'indian_male',
  'african_female',
  'coloured_female',
  'indian_female',
] as const

export type EapDemographicKey = (typeof EAP_DEMOGRAPHIC_KEYS)[number]

export const EAP_DEMOGRAPHIC_LABELS: Record<EapDemographicKey, string> = {
  african_male: 'African male',
  coloured_male: 'Coloured male',
  indian_male: 'Indian male',
  african_female: 'African female',
  coloured_female: 'Coloured female',
  indian_female: 'Indian female',
}

export const EAP_FEMALE_KEYS: EapDemographicKey[] = ['african_female', 'coloured_female', 'indian_female']

/** Economically Active Population distribution, supplied by a versioned admin target set. */
export type EapDistribution = Record<EapDemographicKey, number>

export type EapHeadcounts = Partial<Record<EapDemographicKey, number>>

/**
 * The five-step EAP-weighted calculation used across Management Control and
 * Skills Development.
 *
 * 1. share            = headcount(band) / total denominator
 * 2. adjusted EAP     = eap(band) / Σ eap(bands in scope)
 * 3. split target     = adjusted EAP × overall compliance target
 * 4. max band points  = adjusted EAP × available points
 * 5. band points      = min(share ÷ split target, 1) × max band points
 *
 * Scoping to female-only bands re-normalises the EAP over those bands, which is
 * what the reference workbook does and what verification practice expects.
 */
export function scoreEapDisaggregated(args: {
  rule: IndicatorRule
  headcounts: EapHeadcounts
  denominator: number | null
  eap: EapDistribution
  femaleOnly: boolean
  extraWarnings?: string[]
}): IndicatorResult {
  const { rule, headcounts, denominator, eap, femaleOnly } = args
  const warnings = [...(args.extraWarnings ?? [])]
  const keys: EapDemographicKey[] = femaleOnly ? EAP_FEMALE_KEYS : [...EAP_DEMOGRAPHIC_KEYS]
  const availablePoints = rule.basePoints + rule.bonusPoints

  if (denominator == null || !Number.isFinite(denominator) || denominator <= 0) {
    return missingInputResult({
      rule,
      denominator: denominator ?? null,
      reason: `${rule.denominatorLabel} is missing or zero, so ${rule.displayName.toLowerCase()} cannot be scored.`,
    })
  }

  const eapTotal = keys.reduce((sum, key) => sum + (eap[key] ?? 0), 0)
  if (!Number.isFinite(eapTotal) || eapTotal <= 0) {
    return missingInputResult({
      rule,
      denominator,
      reason: `The selected EAP target set has no positive weighting for the demographic bands required by ${rule.displayName.toLowerCase()}.`,
      status: 'blocked',
    })
  }

  const bands: EapBandResult[] = []
  let totalPoints = 0
  let totalHeadcount = 0

  for (const key of keys) {
    const headcount = headcounts[key] ?? 0
    totalHeadcount += headcount
    const share = headcount / denominator
    const adjustedEap = (eap[key] ?? 0) / eapTotal
    const splitTarget = adjustedEap * rule.target
    const maxBandPoints = adjustedEap * availablePoints
    const pointsAwarded =
      splitTarget > 0 ? Math.min(share / splitTarget, 1) * maxBandPoints : 0

    totalPoints += pointsAwarded
    bands.push({
      bandKey: key,
      label: EAP_DEMOGRAPHIC_LABELS[key],
      headcount,
      sharePercentage: share,
      adjustedEapPercentage: adjustedEap,
      splitComplianceTarget: splitTarget,
      maximumBandPoints: maxBandPoints,
      pointsAwarded: roundPoints(pointsAwarded),
    })
  }

  const points = roundPoints(Math.min(totalPoints, availablePoints))
  const actual = totalHeadcount / denominator
  const isBonus = rule.bonusPoints > 0 && rule.basePoints === 0

  return {
    indicatorKey: rule.key,
    displayName: rule.displayName,
    target: rule.target,
    targetLabel: rule.targetLabel,
    numerator: totalHeadcount,
    denominator,
    actual,
    basePointsAvailable: rule.basePoints,
    bonusPointsAvailable: rule.bonusPoints,
    basePointsAchieved: isBonus ? 0 : points,
    bonusPointsAchieved: isBonus ? points : 0,
    status: 'scored',
    warnings,
    explanation:
      `${formatPercentage(actual)} overall against a ${rule.targetLabel} target, scored across ${keys.length} EAP bands. ` +
      `Each band earns min(band share ÷ split target, 100%) × band points; the bands sum to ${points.toFixed(2)} of ${availablePoints} points.`,
    ruleSource: rule.source,
    eapBands: bands,
  }
}

export function formatPercentage(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return `${(value * 100).toFixed(2)}%`
}
