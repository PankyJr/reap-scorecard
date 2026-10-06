import { calculateProportionalPoints, coerceMetricNumber, safeDivide } from '@/lib/scorecard/full/engine/safe-math'

/**
 * SED beneficiary scoring rule — grounded in existing full-scorecard engine.
 *
 * Verified sources:
 * - `indicator-config.ts` → `sed.annual_spend.availablePoints = 5`
 * - Engine proportional formula → `calculateProportionalPoints`
 * - Engine/fixture tests commonly use target `0.01` for SED annual spend
 *
 * Derivation not performed by the full workbook extractor today, but required for
 * beneficiary workbooks: percentage = recognisedAmount / NPAT.
 *
 * Claimed column is intentionally unused until REAP confirms its meaning.
 */
export const SED_BENEFICIARY_RULE_VERSION = 'sed-beneficiary-v1'

export const SED_DEFAULT_AVAILABLE_POINTS = 5

/** Suggested Generic-style target used in existing SED engine tests; user may override. */
export const SED_SUGGESTED_TARGET_PERCENT = 0.01

export function calculateSedBeneficiaryScore(args: {
  totalRecognisedAmount: number
  npatAmount: number | null | undefined
  targetPercent: number | null | undefined
  availablePoints?: number | null | undefined
}): {
  percentage: number | null
  pointsAchieved: number | null
  pointsAvailable: number
  targetPercent: number | null
  warnings: string[]
  explanation: string
  inputsUsed: Record<string, number | string | null>
} {
  const pointsAvailable =
    args.availablePoints != null && Number.isFinite(args.availablePoints)
      ? args.availablePoints
      : SED_DEFAULT_AVAILABLE_POINTS

  const warnings: string[] = []
  const npat = coerceMetricNumber(args.npatAmount)
  const target =
    args.targetPercent != null && Number.isFinite(args.targetPercent)
      ? args.targetPercent
      : null

  if (npat == null || npat <= 0) {
    warnings.push(
      'NPAT for the measurement year is required to derive the SED compliance percentage from recognised contributions.',
    )
  }
  if (target == null || target <= 0) {
    warnings.push(
      'A SED target percentage is required to score points. Suggested Generic-style target from engine fixtures is 1% (0.01); confirm for this entity.',
    )
  }

  const percentage = npat != null && npat > 0 ? safeDivide(args.totalRecognisedAmount, npat) : null

  const pointsAchieved =
    percentage != null && target != null && target > 0
      ? calculateProportionalPoints({
          actual: percentage,
          target,
          availablePoints: pointsAvailable,
        })
      : null

  const explanation =
    pointsAchieved != null
      ? `Recognised SED contributions ÷ NPAT = ${(percentage! * 100).toFixed(4)}%. Points = min(actual/target, 1) × ${pointsAvailable} (rule ${SED_BENEFICIARY_RULE_VERSION}).`
      : `Recognised total R${args.totalRecognisedAmount.toLocaleString('en-ZA')} imported. Points not scored until NPAT and target % are provided (rule ${SED_BENEFICIARY_RULE_VERSION}).`

  return {
    percentage,
    pointsAchieved,
    pointsAvailable,
    targetPercent: target,
    warnings,
    explanation,
    inputsUsed: {
      totalRecognisedAmount: args.totalRecognisedAmount,
      npatAmount: npat,
      targetPercent: target,
      availablePoints: pointsAvailable,
      percentage,
      claimedColumnUsedInScoring: 'no',
    },
  }
}
