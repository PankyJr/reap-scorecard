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

/**
 * An element subtotal, as shown on the Result page section headers and on the
 * Assessment Hub cards: "12.57 / 19".
 *
 * Achieved keeps two decimals because indicator points are fractional.
 * Available drops a trailing ".00" because element budgets are whole points,
 * and "19.00" reads as a measurement rather than a ceiling.
 */
export function formatElementPoints(
  achieved: number | null | undefined,
  available: number | null | undefined,
): string {
  const budget =
    available == null || !Number.isFinite(available)
      ? '—'
      : Number.isInteger(available)
        ? String(available)
        : available.toFixed(2)
  return `${formatPoints(achieved)} / ${budget}`
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

/**
 * An engine "still needed" line reads "<indicator>: <explanation>", and some
 * explanations already start with the indicator's name ("Bonus: job creation:
 * Bonus: job creation has not been confirmed…"). Show such a line once.
 */
export function plainMissingInput(item: string): string {
  // The label may itself contain ': ', so try each separator in turn.
  for (let i = item.indexOf(': '); i > 0; i = item.indexOf(': ', i + 2)) {
    const rest = item.slice(i + 2)
    if (rest.startsWith(item.slice(0, i))) return rest
  }
  return item
}
