/**
 * Client-facing point display for Aberdare Live Procurement.
 * Internal scoring stays full-precision; UI impact is derived from rounded scores
 * so arithmetic visible to users always reconciles.
 */

export const ABERDARE_POINTS_DISPLAY_DECIMALS = 2

export function roundPointsForDisplay(
  value: number,
  fractionDigits = ABERDARE_POINTS_DISPLAY_DECIMALS,
): number {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return 0
  const factor = 10 ** fractionDigits
  return Math.round(n * factor) / factor
}

export function formatAberdarePoints(
  value: number,
  fractionDigits = ABERDARE_POINTS_DISPLAY_DECIMALS,
): string {
  return roundPointsForDisplay(value, fractionDigits).toFixed(fractionDigits)
}

/**
 * Displayed impact = rounded(projected) − rounded(current).
 * Prefer this over formatting the raw pointsDifference for UI.
 */
export function displayedPointsImpact(
  currentScore: number,
  projectedScore: number,
  fractionDigits = ABERDARE_POINTS_DISPLAY_DECIMALS,
): number {
  const displayedCurrent = roundPointsForDisplay(currentScore, fractionDigits)
  const displayedProjected = roundPointsForDisplay(
    projectedScore,
    fractionDigits,
  )
  // Re-round after subtraction to absorb IEEE float noise (e.g. 25.43 − 27.05).
  return roundPointsForDisplay(
    displayedProjected - displayedCurrent,
    fractionDigits,
  )
}

export function formatAberdarePointsImpact(
  currentScore: number,
  projectedScore: number,
  fractionDigits = ABERDARE_POINTS_DISPLAY_DECIMALS,
): string {
  const impact = displayedPointsImpact(
    currentScore,
    projectedScore,
    fractionDigits,
  )
  const abs = formatAberdarePoints(Math.abs(impact), fractionDigits)
  if (impact > 0) return `+${abs}`
  if (impact < 0) return `-${abs}`
  return formatAberdarePoints(0, fractionDigits)
}

/** Explainable TMPS bridge for the Aberdare provisional demo rule. */
export function buildAberdareTmpsBridge(args: {
  sourceSpendTotal: number
  explicitImportSpend: number
  combinedNegativeSpend: number
  /** Engine TMPS after provisional import exclusion (from sumSupplierValueExVat). */
  provisionalEligibleTmps: number
}): {
  sourceMinusImport: number
  absoluteNegativeSpend: number
  differenceFromSourceMinusImport: number
  provisionalEligibleTmps: number
  negativesExcludedFromTmps: true
} {
  const sourceMinusImport = args.sourceSpendTotal - args.explicitImportSpend
  const absoluteNegativeSpend = Math.abs(args.combinedNegativeSpend)
  return {
    sourceMinusImport,
    absoluteNegativeSpend,
    differenceFromSourceMinusImport:
      args.provisionalEligibleTmps - sourceMinusImport,
    provisionalEligibleTmps: args.provisionalEligibleTmps,
    negativesExcludedFromTmps: true,
  }
}
