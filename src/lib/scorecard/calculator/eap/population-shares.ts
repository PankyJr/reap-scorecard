/**
 * Workforce (EAP) targets as the scorecard engine reads them.
 *
 * The Economically Active Population (EAP) is the share of the working-age
 * population in each race and gender group. The generic scorecard compares a
 * client's senior, middle and junior management (Management Control) and its
 * skills spend (Skills Development) against these shares. It needs exactly six
 * values: African, Coloured and Indian, each male and female.
 *
 * `eap_target_set_values` has a (band_key, demographic_key) key. These shares
 * apply to every occupational band, so they are stored under one band key,
 * EAP_POPULATION_BAND_KEY. The engine reads only `demographic_key` and
 * `target_value` (see eapDistributionFromSnapshot), so older rows in another
 * band are ignored rather than mixed in.
 *
 * Values are stored as fractions (0.435). The admin screen captures them as
 * percentages (43.5), the way the Commission for Employment Equity publishes them.
 */

export const EAP_POPULATION_BAND_KEY = 'all'

export const EAP_POPULATION_KEYS = [
  'african_male',
  'coloured_male',
  'indian_male',
  'african_female',
  'coloured_female',
  'indian_female',
] as const

export type EapPopulationKey = (typeof EAP_POPULATION_KEYS)[number]

export const EAP_POPULATION_LABELS: Record<EapPopulationKey, string> = {
  african_male: 'African men',
  coloured_male: 'Coloured men',
  indian_male: 'Indian men',
  african_female: 'African women',
  coloured_female: 'Coloured women',
  indian_female: 'Indian women',
}

/** Form field name for one share. */
export function eapShareFieldName(key: EapPopulationKey): string {
  return `share_${key}`
}

export type EapShares = Record<EapPopulationKey, number>

export type EapSharesParse =
  | { ok: true; shares: EapShares }
  | { ok: false; errors: string[] }

/**
 * Read the six percentage fields from a form and return fractions.
 * Every field is required; each must be 0–100; together they cannot exceed
 * 100% (the other groups, such as white people, make up the remainder).
 */
export function parseEapSharesFromPercentages(read: (field: string) => string | null): EapSharesParse {
  const errors: string[] = []
  const shares = {} as EapShares
  for (const key of EAP_POPULATION_KEYS) {
    const raw = (read(eapShareFieldName(key)) ?? '').trim().replace(/\s|%/g, '').replace(',', '.')
    const label = EAP_POPULATION_LABELS[key]
    if (raw === '') {
      errors.push(`Enter a percentage for ${label}.`)
      continue
    }
    const pct = Number(raw)
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      errors.push(`${label} must be a percentage between 0 and 100.`)
      continue
    }
    shares[key] = roundFraction(pct / 100)
  }
  if (errors.length > 0) return { ok: false, errors }
  const check = validateEapShares(shares)
  return check.ok ? { ok: true, shares } : { ok: false, errors: check.errors }
}

/** Validate stored fractions (used before a set can be activated). */
export function validateEapShares(values: Partial<Record<string, number>>): { ok: boolean; errors: string[] } {
  const errors: string[] = []
  let total = 0
  for (const key of EAP_POPULATION_KEYS) {
    const value = values[key]
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      errors.push(`${EAP_POPULATION_LABELS[key]} has no value yet.`)
      continue
    }
    if (value < 0 || value > 1) errors.push(`${EAP_POPULATION_LABELS[key]} must be between 0% and 100%.`)
    total += value
  }
  if (errors.length > 0) return { ok: false, errors }
  if (total <= 0) errors.push('All six shares are zero. Enter the published EAP figures.')
  if (total > 1.0005) {
    errors.push(`The six shares add up to ${formatPercent(total)}, which is more than 100%. Check for a typing error.`)
  }
  return { ok: errors.length === 0, errors }
}

/** Shares from stored rows; rows for other bands or demographics are ignored. */
export function sharesFromRows(
  rows: Array<{ band_key?: string | null; demographic_key: string; target_value: number | string | null }>,
): Partial<EapShares> {
  const out: Partial<EapShares> = {}
  for (const row of rows) {
    if (!(EAP_POPULATION_KEYS as readonly string[]).includes(row.demographic_key)) continue
    const value = Number(row.target_value)
    if (!Number.isFinite(value)) continue
    out[row.demographic_key as EapPopulationKey] = value > 1 ? value / 100 : value
  }
  return out
}

/** True when a set still holds only the old per-band "black people / black women" rows. */
export function hasOnlyLegacyBandRows(rows: Array<{ demographic_key: string }>): boolean {
  if (rows.length === 0) return false
  return rows.every((row) => !(EAP_POPULATION_KEYS as readonly string[]).includes(row.demographic_key))
}

export function sharesToRows(targetSetId: string, shares: EapShares) {
  return EAP_POPULATION_KEYS.map((key) => ({
    target_set_id: targetSetId,
    band_key: EAP_POPULATION_BAND_KEY,
    demographic_key: key,
    target_value: shares[key],
  }))
}

export function formatPercent(fraction: number): string {
  return `${(fraction * 100).toFixed(1).replace(/\.0$/, '')}%`
}

function roundFraction(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000
}
