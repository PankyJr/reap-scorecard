/**
 * Explicit display typing for workbook-review summary values.
 * Never infer currency from substring matching alone.
 */

export type DisplayValueType = 'currency' | 'percentage' | 'count' | 'points' | 'year' | 'text'

export type TypedDisplayValue = {
  key: string
  label: string
  type: DisplayValueType
  value: string | number | null
  /** Optional suffix for counts, e.g. "employees". */
  unit?: string
}

export function formatRand(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return `R${Math.round(value).toLocaleString('en-ZA')}`
}

export function formatPoints(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return value.toFixed(2)
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—'
  // Values are stored as fractions (0.25 → 25.00%).
  return `${(value * 100).toFixed(2)}%`
}

export function formatTypedDisplayValue(entry: TypedDisplayValue): string {
  const { type, value, unit } = entry
  if (value == null || value === '') return '—'
  if (type === 'text') return String(value)
  if (typeof value !== 'number' || !Number.isFinite(value)) return String(value)

  switch (type) {
    case 'currency':
      return formatRand(value)
    case 'percentage':
      return formatPercent(value)
    case 'points':
      return formatPoints(value)
    case 'year':
      return String(Math.round(value))
    case 'count': {
      const count = Number.isInteger(value) ? String(value) : value.toFixed(0)
      return unit ? `${count} ${unit}` : count
    }
    default:
      return String(value)
  }
}

/** Build a typed summary entry. */
export function typed(
  key: string,
  label: string,
  type: DisplayValueType,
  value: string | number | null | undefined,
  unit?: string,
): TypedDisplayValue {
  return {
    key,
    label,
    type,
    value: value === undefined ? null : value,
    ...(unit ? { unit } : {}),
  }
}
