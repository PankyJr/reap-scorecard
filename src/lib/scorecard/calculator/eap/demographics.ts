/**
 * Demographic structure for EAP targets — mirrors verified Management Control engine metrics.
 * Do not invent categories outside this set.
 */

export const MC_EAP_BAND_KEYS = [
  'board',
  'executive_directors',
  'other_executive_management',
  'senior_management',
  'middle_management',
  'junior_management',
  'employees_with_disabilities',
] as const

export type McEapBandKey = (typeof MC_EAP_BAND_KEYS)[number]

export const MC_EAP_DEMOGRAPHIC_KEYS = ['black_people', 'black_women'] as const

export type McEapDemographicKey = (typeof MC_EAP_DEMOGRAPHIC_KEYS)[number]

export type EapTargetCell = {
  bandKey: McEapBandKey
  demographicKey: McEapDemographicKey
  targetValue: number
}

/** Disabilities band only has black_people in the verified metric definitions. */
export function isAllowedEapCell(bandKey: McEapBandKey, demographicKey: McEapDemographicKey): boolean {
  if (bandKey === 'employees_with_disabilities' && demographicKey === 'black_women') return false
  return true
}

export function expectedEapCells(): Array<{ bandKey: McEapBandKey; demographicKey: McEapDemographicKey }> {
  const cells: Array<{ bandKey: McEapBandKey; demographicKey: McEapDemographicKey }> = []
  for (const bandKey of MC_EAP_BAND_KEYS) {
    for (const demographicKey of MC_EAP_DEMOGRAPHIC_KEYS) {
      if (isAllowedEapCell(bandKey, demographicKey)) {
        cells.push({ bandKey, demographicKey })
      }
    }
  }
  return cells
}

export function validateEapTargetMatrix(values: EapTargetCell[]): {
  ok: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []
  const seen = new Set<string>()

  for (const cell of values) {
    const key = `${cell.bandKey}:${cell.demographicKey}`
    if (!MC_EAP_BAND_KEYS.includes(cell.bandKey)) {
      errors.push(`Unknown band "${cell.bandKey}".`)
      continue
    }
    if (!MC_EAP_DEMOGRAPHIC_KEYS.includes(cell.demographicKey)) {
      errors.push(`Unknown demographic "${cell.demographicKey}".`)
      continue
    }
    if (!isAllowedEapCell(cell.bandKey, cell.demographicKey)) {
      errors.push(`Demographic ${cell.demographicKey} is not valid for band ${cell.bandKey}.`)
      continue
    }
    if (!Number.isFinite(cell.targetValue) || cell.targetValue < 0 || cell.targetValue > 1) {
      errors.push(`Target for ${key} must be a fraction between 0 and 1 inclusive.`)
    }
    if (seen.has(key)) errors.push(`Duplicate target for ${key}.`)
    seen.add(key)
  }

  for (const expected of expectedEapCells()) {
    const key = `${expected.bandKey}:${expected.demographicKey}`
    if (!seen.has(key)) {
      warnings.push(`Missing target for ${key}.`)
    }
  }

  return { ok: errors.length === 0, errors, warnings }
}
