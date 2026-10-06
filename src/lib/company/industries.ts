/**
 * Industries offered when a company is added, in plain words. Stored as the
 * label in companies.industry (free text before this list existed, so older
 * companies may hold other values; the form shows them as they are).
 *
 * `mayHaveSectorCode` marks industries that have their own gazetted B-BBEE
 * sector code. The app measures on the Generic Codes, so the form asks the
 * user to confirm with their verification agency which scorecard applies.
 * The list is for a verification expert to confirm (docs/FOR_STUART.md).
 */
export type Industry = { label: string; mayHaveSectorCode: boolean }

export const INDUSTRIES: readonly Industry[] = [
  { label: 'Agriculture', mayHaveSectorCode: true },
  { label: 'Forestry', mayHaveSectorCode: true },
  { label: 'Mining and quarrying', mayHaveSectorCode: false },
  { label: 'Manufacturing', mayHaveSectorCode: false },
  { label: 'Electricity, gas and water', mayHaveSectorCode: false },
  { label: 'Construction', mayHaveSectorCode: true },
  { label: 'Property', mayHaveSectorCode: true },
  { label: 'Wholesale and retail', mayHaveSectorCode: false },
  { label: 'Transport and logistics', mayHaveSectorCode: true },
  { label: 'Tourism and hospitality', mayHaveSectorCode: true },
  { label: 'Information and communication technology (ICT)', mayHaveSectorCode: true },
  { label: 'Financial services and insurance', mayHaveSectorCode: true },
  { label: 'Accounting and auditing', mayHaveSectorCode: true },
  { label: 'Marketing, advertising and communication', mayHaveSectorCode: true },
  { label: 'Defence', mayHaveSectorCode: true },
  { label: 'Professional and business services', mayHaveSectorCode: false },
  { label: 'Health and social care', mayHaveSectorCode: false },
  { label: 'Education and training', mayHaveSectorCode: false },
  { label: 'Security services', mayHaveSectorCode: false },
  { label: 'Cleaning and facilities management', mayHaveSectorCode: false },
  { label: 'Other', mayHaveSectorCode: false },
]

export function findIndustry(label: string | null | undefined): Industry | null {
  if (!label) return null
  return INDUSTRIES.find((industry) => industry.label === label.trim()) ?? null
}

export const MONTHS = [
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

/** "R30 000 000" style input to a number; null when blank or not a number. */
export function parseRand(raw: unknown): number | null {
  const cleaned = String(raw ?? '').replace(/[\sR,]/gi, '')
  if (cleaned === '') return null
  const value = Number(cleaned)
  return Number.isFinite(value) && value >= 0 ? value : null
}

/** "40", "40%" or "40.5" to a number from 0 to 100; null when blank or out of range. */
export function parsePercent(raw: unknown): number | null {
  const cleaned = String(raw ?? '').replace(/[\s%]/g, '').replace(',', '.')
  if (cleaned === '') return null
  const value = Number(cleaned)
  return Number.isFinite(value) && value >= 0 && value <= 100 ? value : null
}

/**
 * The measurement period for a scorecard year: the financial year that ends in
 * that year. February year-end, 2026: 1 March 2025 to 28 February 2026.
 */
export function measurementPeriodFor(year: number, yearEndMonth: number): { start: string; end: string } {
  const endDate = new Date(Date.UTC(year, yearEndMonth, 0))
  const startDate = new Date(Date.UTC(year - 1, yearEndMonth, 1))
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  return { start: iso(startDate), end: iso(endDate) }
}
