export function safeDivide(numerator: number | null, denominator: number | null): number | null {
  if (numerator == null || denominator == null) return null
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return null
  if (denominator === 0) return null
  return numerator / denominator
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function roundScore(value: number | null, decimals = 2): number | null {
  if (value == null || !Number.isFinite(value)) return null
  const multiplier = 10 ** decimals
  return Math.round(value * multiplier) / multiplier
}

export function calculateProportionalPoints(args: {
  actual: number | null
  target: number | null
  availablePoints: number | null
}): number | null {
  const ratio = safeDivide(args.actual, args.target)
  if (ratio == null || args.availablePoints == null) return null
  return roundScore(clamp(ratio, 0, 1) * args.availablePoints)
}

export function sumScores(values: Array<number | null | undefined>): number | null {
  const numbers = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  if (numbers.length === 0) return null
  return roundScore(numbers.reduce((acc, value) => acc + value, 0))
}

export function coerceMetricNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const cleaned = value.replace(/[,\s%R$£€]/g, '')
    if (!cleaned) return null
    const parsed = Number(cleaned)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}
