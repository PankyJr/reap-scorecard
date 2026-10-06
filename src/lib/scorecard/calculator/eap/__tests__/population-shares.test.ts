import { describe, expect, it } from 'vitest'
import {
  EAP_POPULATION_BAND_KEY,
  EAP_POPULATION_KEYS,
  eapShareFieldName,
  hasOnlyLegacyBandRows,
  parseEapSharesFromPercentages,
  sharesFromRows,
  sharesToRows,
  validateEapShares,
} from '../population-shares'
import {
  isUsableEapSnapshot,
  validateEapSetForGenericEngine,
} from '@/app/(dashboard)/scorecards/calculator/[assessmentId]/generic/eap-target-validation'
import { eapDistributionFromSnapshot } from '@/lib/scorecard/generic/persistence'
import { SYNTHETIC_EAP } from '@/lib/scorecard/generic/__tests__/fixtures'

/**
 * The admin screen used to save "black people / black women per band", which
 * the scorecard engine refuses. These tests pin that what the screen saves now
 * is exactly what the engine reads.
 */

const PERCENT_FORM: Record<string, string> = {
  [eapShareFieldName('african_male')]: '43.5',
  [eapShareFieldName('coloured_male')]: '4.6',
  [eapShareFieldName('indian_male')]: '1.7',
  [eapShareFieldName('african_female')]: '37.5',
  [eapShareFieldName('coloured_female')]: '4.2',
  [eapShareFieldName('indian_female')]: '1',
}
const read = (form: Record<string, string>) => (field: string) => form[field] ?? null

describe('parseEapSharesFromPercentages', () => {
  it('turns the six percentages into the fractions the engine uses', () => {
    const parsed = parseEapSharesFromPercentages(read(PERCENT_FORM))
    expect(parsed).toEqual({ ok: true, shares: SYNTHETIC_EAP })
  })

  it('accepts a comma decimal and a trailing percent sign', () => {
    const parsed = parseEapSharesFromPercentages(read({ ...PERCENT_FORM, [eapShareFieldName('african_male')]: '43,5 %' }))
    expect(parsed.ok).toBe(true)
    if (parsed.ok) expect(parsed.shares.african_male).toBe(0.435)
  })

  it('names every missing field in plain words', () => {
    const parsed = parseEapSharesFromPercentages(read({}))
    expect(parsed.ok).toBe(false)
    if (parsed.ok) return
    expect(parsed.errors).toHaveLength(6)
    expect(parsed.errors[0]).toBe('Enter a percentage for African men.')
  })

  it('refuses values outside 0–100', () => {
    const parsed = parseEapSharesFromPercentages(read({ ...PERCENT_FORM, [eapShareFieldName('indian_female')]: '120' }))
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) expect(parsed.errors[0]).toMatch(/Indian women must be a percentage between 0 and 100/)
  })

  it('refuses shares that add up to more than 100%', () => {
    const parsed = parseEapSharesFromPercentages(read({ ...PERCENT_FORM, [eapShareFieldName('african_male')]: '60' }))
    expect(parsed.ok).toBe(false)
    if (!parsed.ok) expect(parsed.errors[0]).toMatch(/more than 100%/)
  })

  it('refuses all zeros', () => {
    const zeros = Object.fromEntries(EAP_POPULATION_KEYS.map((k) => [eapShareFieldName(k), '0']))
    const parsed = parseEapSharesFromPercentages(read(zeros))
    expect(parsed.ok).toBe(false)
  })
})

describe('what the admin screen saves is what the scorecard reads', () => {
  const rows = sharesToRows('set-1', SYNTHETIC_EAP)

  it('stores six rows under one band key', () => {
    expect(rows).toHaveLength(6)
    expect(new Set(rows.map((r) => r.band_key))).toEqual(new Set([EAP_POPULATION_BAND_KEY]))
  })

  it('passes the engine-side validation that the old per-band shape failed', () => {
    expect(validateEapSetForGenericEngine(rows)).toEqual({ ok: true })
  })

  it('produces the same distribution the golden benchmark uses', () => {
    const snapshot = { id: 'set-1', name: 'National EAP 2026', version: 1, values: rows }
    expect(isUsableEapSnapshot(snapshot)).toBe(true)
    expect(eapDistributionFromSnapshot(snapshot).distribution).toEqual(SYNTHETIC_EAP)
  })

  it('reads the shares back for the edit form, ignoring old per-band rows', () => {
    const mixed = [
      ...rows,
      { band_key: 'senior_management', demographic_key: 'black_people', target_value: 0.6 },
    ]
    expect(sharesFromRows(mixed)).toEqual(SYNTHETIC_EAP)
    expect(validateEapShares(sharesFromRows(mixed)).ok).toBe(true)
  })
})

describe('sets saved in the old per-band format', () => {
  const legacy = [
    { band_key: 'senior_management', demographic_key: 'black_people', target_value: 0.6 },
    { band_key: 'senior_management', demographic_key: 'black_women', target_value: 0.3 },
  ]

  it('are recognised so the screen can ask for the six shares', () => {
    expect(hasOnlyLegacyBandRows(legacy)).toBe(true)
    expect(hasOnlyLegacyBandRows(sharesToRows('s', SYNTHETIC_EAP))).toBe(false)
    expect(hasOnlyLegacyBandRows([])).toBe(false)
  })

  it('cannot be activated', () => {
    expect(validateEapShares(sharesFromRows(legacy)).ok).toBe(false)
  })

  it('are never treated as a usable frozen snapshot', () => {
    expect(isUsableEapSnapshot({ values: legacy })).toBe(false)
    expect(isUsableEapSnapshot(null)).toBe(false)
    expect(isUsableEapSnapshot({})).toBe(false)
  })
})
