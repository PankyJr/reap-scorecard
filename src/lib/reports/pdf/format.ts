/**
 * Plain, locale-independent formatters for server-generated PDF reports.
 *
 * The server's default locale is not guaranteed (Netlify functions run with
 * whatever the image ships), so nothing here calls toLocaleString or Intl.
 * The same input always produces the same text.
 */

/** Shown wherever a value is missing. Never replaced by a guess. */
export const MISSING = '—'

const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

/** South Africa has no daylight saving: SAST is always UTC+2. */
const SAST_OFFSET_MS = 2 * 60 * 60 * 1000

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/** "R 1,234,567.89"; negative as "-R 1,234.00"; missing as "—". */
export function formatRand(value: number | null | undefined): string {
  if (!isFiniteNumber(value)) return MISSING
  const negative = value < 0
  const [whole, cents] = Math.abs(value).toFixed(2).split('.')
  return `${negative ? '-' : ''}R ${groupThousands(whole)}.${cents}`
}

/** A ratio (0.153 = 15.3%) as "15.3%". Missing as "—". */
export function formatPercent(
  ratio: number | null | undefined,
  fractionDigits = 1,
): string {
  if (!isFiniteNumber(ratio)) return MISSING
  return `${(ratio * 100).toFixed(fractionDigits)}%`
}

/** A ratio as a whole percentage, trailing zeros dropped: 0.6 → "60%", 1.35 → "135%", 0.125 → "12.5%". */
export function formatRecognitionPercent(
  ratio: number | null | undefined,
): string {
  if (!isFiniteNumber(ratio)) return MISSING
  return `${trimNumber(ratio * 100, 1)}%`
}

/** Points to two decimals: 1.6 → "1.60". Missing as "—". */
export function formatPoints(value: number | null | undefined): string {
  if (!isFiniteNumber(value)) return MISSING
  return value.toFixed(2)
}

/** A number with up to `maxDigits` decimals and no trailing zeros: 19 → "19", 2.5 → "2.5". */
export function trimNumber(value: number, maxDigits = 2): string {
  const fixed = value.toFixed(maxDigits)
  return fixed.includes('.') ? fixed.replace(/\.?0+$/, '') : fixed
}

/**
 * Element subtotal format used across the app: achieved to two decimals,
 * available with no trailing ".00" — "12.57 / 19".
 *
 * Mirrors the rule documented for `formatElementPoints()` in the generic
 * engine's ux/display-values; kept local so this module has no app imports.
 */
export function formatElementPoints(
  achieved: number | null | undefined,
  available: number | null | undefined,
): string {
  const a = isFiniteNumber(achieved) ? achieved.toFixed(2) : MISSING
  const b = isFiniteNumber(available) ? trimNumber(available, 2) : MISSING
  return `${a} / ${b}`
}

/** Indicator format: both sides to two decimals — "1.60 / 2.00". */
export function formatIndicatorPoints(
  achieved: number | null | undefined,
  available: number | null | undefined,
): string {
  return `${formatPoints(achieved)} / ${formatPoints(available)}`
}

/** "6 October 2026", in South African time. */
export function formatDateLong(date: Date): string {
  const sast = new Date(date.getTime() + SAST_OFFSET_MS)
  return `${sast.getUTCDate()} ${MONTHS_LONG[sast.getUTCMonth()]} ${sast.getUTCFullYear()}`
}

/** "2026-10-06" for a UTC calendar date. */
export function formatIsoDate(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** The calendar day of `date` in South African time, as a UTC-midnight Date. */
export function sastCalendarDay(date: Date): Date {
  const sast = new Date(date.getTime() + SAST_OFFSET_MS)
  return new Date(
    Date.UTC(sast.getUTCFullYear(), sast.getUTCMonth(), sast.getUTCDate()),
  )
}

function validUtcDate(y: number, m: number, d: number): Date | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  const date = new Date(Date.UTC(y, m - 1, d))
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return null
  }
  return date
}

/**
 * Reads a stored calendar date. Accepts "2025-03-31" (optionally followed by
 * a time), "2025/03/31", and the South African day-first forms "31/03/2025"
 * and "31-03-2025". Returns null for anything else — the caller reports the
 * value as unreadable rather than guessing.
 */
export function parseCalendarDate(
  value: string | null | undefined,
): Date | null {
  if (typeof value !== 'string') return null
  const text = value.trim()
  if (!text) return null

  const ymd = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:$|[T\s])/.exec(text)
  if (ymd) return validUtcDate(Number(ymd[1]), Number(ymd[2]), Number(ymd[3]))

  const dmy = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(text)
  if (dmy) return validUtcDate(Number(dmy[3]), Number(dmy[2]), Number(dmy[1]))

  return null
}

/**
 * A download filename that is safe in a Content-Disposition header on every
 * browser: ASCII letters, digits and hyphens only, at most 80 characters,
 * always ending in ".pdf".
 */
export function safePdfFilename(
  parts: ReadonlyArray<string | null | undefined>,
  fallback = 'report',
): string {
  const slug = parts
    .filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
    .join(' ')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '')
  return `${slug || fallback}.pdf`
}
