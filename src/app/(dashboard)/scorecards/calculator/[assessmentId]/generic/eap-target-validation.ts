/**
 * EAP target set validation — pure, so it can be unit tested.
 *
 * The generic engine's EAP five-step needs the six race/gender population
 * shares. See eap-target-set.ts for how a set is frozen onto an assessment.
 *
 * KNOWN MODEL CONFLICT (separate ticket): `eap_target_set_values` is also used
 * by the Management Control admin grid, which stores
 * `band_key x {black_people, black_women}` — a different thing entirely. A set
 * in that shape cannot drive the engine, so validation fails with a named
 * error rather than guessing or converting.
 */

export const REQUIRED_EAP_DEMOGRAPHICS = [
  'african_male',
  'coloured_male',
  'indian_male',
  'african_female',
  'coloured_female',
  'indian_female',
] as const

/** The demographics the Management Control admin grid stores instead. */
const BAND_SHAPE_DEMOGRAPHICS = ['black_people', 'black_women']

export type EapTargetValueRow = { demographic_key: string; target_value: number | string | null }

export type EapValidation = { ok: true } | { ok: false; error: string }

export function validateEapSetForGenericEngine(values: EapTargetValueRow[]): EapValidation {
  if (values.length === 0) {
    return { ok: false, error: 'That EAP target set has no values captured yet.' }
  }

  const present = new Set(values.map((v) => v.demographic_key))
  const missing = REQUIRED_EAP_DEMOGRAPHICS.filter((key) => !present.has(key))
  if (missing.length === 0) return { ok: true }

  const looksLikeBandShape = BAND_SHAPE_DEMOGRAPHICS.some((key) => present.has(key))
  if (looksLikeBandShape) {
    return {
      ok: false,
      error:
        'That EAP target set holds Management Control band targets (black people / black women per band), ' +
        'not the six population shares the scorecard needs (African, Coloured and Indian, male and female). ' +
        'It cannot be used here. Capture a set with those six values.',
    }
  }

  return {
    ok: false,
    error: `That EAP target set is missing required population shares: ${missing.join(', ')}.`,
  }
}
