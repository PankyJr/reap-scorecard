import { describe, expect, it } from 'vitest'
import {
  REQUIRED_EAP_DEMOGRAPHICS,
  validateEapSetForGenericEngine,
} from '../eap-target-validation'
import { calculateGenericScorecard } from '@/lib/scorecard/generic'
import { eapDistributionFromSnapshot } from '@/lib/scorecard/generic/persistence'
import { completeScorecardInputs, SYNTHETIC_EAP } from '@/lib/scorecard/generic/__tests__/fixtures'

/**
 * Regression guard for the EAP wiring.
 *
 * Management Control and Skills Development scored nothing because:
 *   1. nothing attached an EAP target set to a generic assessment, and
 *   2. the generic calculate path never built `eap_target_snapshot`,
 * so `eapDistributionFromSnapshot` always returned null and every
 * EAP-disaggregated indicator was blocked.
 */

/** A snapshot in the shape the calculate path now freezes. */
function snapshotFrom(values: Record<string, number>) {
  return {
    id: 'set-1',
    name: 'EAP targets (client workbook)',
    year: 2026,
    version: 1,
    status: 'active',
    values: Object.entries(values).map(([demographic_key, target_value]) => ({
      demographic_key,
      target_value,
    })),
    snapped_at: '2026-08-11T00:00:00.000Z',
  }
}

const WORKBOOK_EAP = {
  african_male: 0.435,
  coloured_male: 0.046,
  indian_male: 0.017,
  african_female: 0.375,
  coloured_female: 0.042,
  indian_female: 0.01,
}

describe('EAP set validation on attach', () => {
  it('accepts a set carrying the six population shares', () => {
    const rows = Object.entries(WORKBOOK_EAP).map(([demographic_key, target_value]) => ({
      demographic_key,
      target_value,
    }))
    expect(validateEapSetForGenericEngine(rows)).toEqual({ ok: true })
  })

  it('refuses a Management Control band-shaped set by name, without converting it', () => {
    // What the admin grid stores: band_key x {black_people, black_women}.
    const rows = [
      { demographic_key: 'black_people', target_value: 0.6 },
      { demographic_key: 'black_women', target_value: 0.3 },
    ]
    const result = validateEapSetForGenericEngine(rows)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatch(/Management Control band targets/i)
    expect(result.error).toMatch(/six population shares/i)
  })

  it('names the missing shares when a set is only partly captured', () => {
    const result = validateEapSetForGenericEngine([
      { demographic_key: 'african_male', target_value: 0.435 },
    ])
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatch(/coloured_male/)
    expect(result.error).toMatch(/indian_female/)
  })

  it('refuses an empty set', () => {
    expect(validateEapSetForGenericEngine([]).ok).toBe(false)
  })

  it('requires exactly the demographics the engine reads', () => {
    expect([...REQUIRED_EAP_DEMOGRAPHICS].sort()).toEqual(
      Object.keys(SYNTHETIC_EAP).sort(),
    )
  })
})

describe('a frozen snapshot drives the EAP-dependent indicators', () => {
  it('produces a usable distribution from the snapshot the calculate path stores', () => {
    const { distribution, label } = eapDistributionFromSnapshot(snapshotFrom(WORKBOOK_EAP))
    expect(distribution).not.toBeNull()
    expect(distribution!.african_male).toBe(0.435)
    expect(distribution!.indian_female).toBe(0.01)
    expect(label).toMatch(/EAP targets/)
  })

  it('yields null — and therefore blocks scoring — for a band-shaped snapshot', () => {
    const { distribution } = eapDistributionFromSnapshot(
      snapshotFrom({ black_people: 0.6, black_women: 0.3 }),
    )
    expect(distribution).toBeNull()
  })

  it('scores the EAP-disaggregated Management Control indicators only once a set is present', () => {
    const base = completeScorecardInputs()

    const withoutEap = calculateGenericScorecard({
      ...base,
      managementControl: { ...base.managementControl, eapDistribution: null, eapTargetSetLabel: null },
    })
    const withEap = calculateGenericScorecard(base)

    const mcOf = (r: typeof withEap) => r.elements.find((e) => e.elementKey === 'management_control')!
    const seniorOf = (r: typeof withEap) =>
      mcOf(r).indicators.find((i) => i.indicatorKey === 'management_control.senior_management.black_people')!

    // Blocked without a set, scored with one.
    expect(seniorOf(withoutEap).status).toBe('blocked')
    expect(seniorOf(withEap).status).toBe('scored')
    expect(mcOf(withEap).basePointsAchieved).toBeGreaterThan(mcOf(withoutEap).basePointsAchieved)
  })

  it('scores Skills Development only once a set is present', () => {
    const base = completeScorecardInputs()
    const withoutEap = calculateGenericScorecard({
      ...base,
      skillsDevelopment: { ...base.skillsDevelopment, eapDistribution: null, eapTargetSetLabel: null },
    })
    const withEap = calculateGenericScorecard(base)

    const skillsOf = (r: typeof withEap) => r.elements.find((e) => e.elementKey === 'skills_development')!
    const generalOf = (r: typeof withEap) =>
      skillsOf(r).indicators.find((i) => i.indicatorKey === 'skills_development.expenditure.black_people')!

    // The three EAP-disaggregated indicators are blocked without a set...
    expect(generalOf(withoutEap).status).toBe('blocked')
    expect(generalOf(withEap).status).toBe('scored')
    // ...but disabled-learner spend is plain proportional, so it still scores
    // 4 points without one. The element total must still rise with a set.
    expect(skillsOf(withoutEap).basePointsAchieved).toBe(4)
    expect(skillsOf(withEap).basePointsAchieved).toBeGreaterThan(
      skillsOf(withoutEap).basePointsAchieved,
    )
  })
})
