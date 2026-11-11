/**
 * Design rule 19: one date format and one money format, everywhere.
 *
 *   formatDate('2026-10-06')   -> "06 Oct 2026"
 *   formatMoney(1250000)       -> "R 1 250 000"
 *   formatPointsOf(7.25, 25)   -> "7.25 of 25"
 *
 * Display only. Never feed these strings back into a calculation.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "06 Oct 2026", in South African time. "—" when there is no date. */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return '—'
  const parts = new Intl.DateTimeFormat('en-ZA', {
    timeZone: 'Africa/Johannesburg',
    day: '2-digit',
    month: 'numeric',
    year: 'numeric',
  }).formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('day')} ${MONTHS[Number(get('month')) - 1]} ${get('year')}`
}

/** "R 1 250 000": whole rands, a space before the figure and between thousands. */
export function formatMoney(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—'
  const sign = value < 0 ? '-' : ''
  const digits = Math.round(Math.abs(value)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${sign}R ${digits}`
}

/** Points always to two decimals (design rule 8). */
export function formatPts(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return value.toFixed(2)
}

/** A ceiling: whole numbers stay whole ("25"), fractions keep two decimals. */
export function formatCeiling(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

/** Design rule 9: a number never stands alone. "7.25 of 25". */
export function formatPointsOf(achieved: number | null | undefined, available: number | null | undefined): string {
  return `${formatPts(achieved)} of ${formatCeiling(available)}`
}

/** "2 min ago", "3 hours ago", "yesterday", then the date. */
export function timeAgo(value: string | Date | null | undefined, now: Date = new Date()): string {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000)
  if (!Number.isFinite(seconds)) return '—'
  if (seconds < 45) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
  const days = Math.round(hours / 24)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  return formatDate(date)
}
