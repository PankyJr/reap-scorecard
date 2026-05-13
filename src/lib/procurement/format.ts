export function formatCurrency(value: number | null | undefined): string {
  const numeric = Number(value ?? 0)
  return numeric.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** South African Rand display for reports and client-facing views (includes the R prefix). */
export function formatCurrencyZar(value: number | null | undefined): string {
  return `R ${formatCurrency(value)}`
}

/** Formats a ratio in [0, 1] (or above) as a percentage string, e.g. 0.90012 → "90.01%". */
export function formatPercentage(
  ratio: number,
  fractionDigits = 2,
): string {
  return formatPercentFromRatio(ratio, fractionDigits)
}

export function formatPoints(value: number, fractionDigits = 2): string {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? n.toFixed(fractionDigits) : (0).toFixed(fractionDigits)
}

export function formatPercentFromRatio(
  ratio: number,
  fractionDigits = 1,
): string {
  const numeric = Number.isFinite(ratio) ? ratio : 0
  const pct = numeric * 100
  return `${pct.toFixed(fractionDigits)}%`
}

export function formatWholePercentFromRatio(ratio: number): string {
  return formatPercentFromRatio(ratio, 0)
}

