export function formatCurrency(value: number | null | undefined): string {
  const numeric = Number(value ?? 0)
  return numeric.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
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

