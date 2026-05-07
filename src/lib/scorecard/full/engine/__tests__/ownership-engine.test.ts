import { describe, expect, it } from 'vitest'
import { buildEngineInputs } from '../build-inputs'
import { buildReconciliation } from '../reconciliation'
import { calculateFullScorecard } from '../calculate'
import { PRIMARY_REFERENCE_FINAL_SCORE_KEY } from '../types'
import { validMetricRow } from './fixtures'

const OWN = 'Ownership'
const REF = 'Full Scorecard Reference'

function ownMetric(
  key: string,
  numericValue: number | null,
  opts: {
    value_type?: string
    validation_state?: 'valid' | 'warning' | 'error'
    validation_message?: string | null
  } = {},
) {
  return validMetricRow({
    metric_key: key,
    pillar: OWN,
    source_sheet: OWN,
    numeric_value: numericValue,
    value_type: opts.value_type ?? 'number',
    validation_state: opts.validation_state ?? 'valid',
    validation_message: opts.validation_message ?? null,
  })
}

function fullVotingBlackPeople() {
  return [
    ownMetric('ownership.voting_rights.black_people.percentage', 0.25, { value_type: 'percentage' }),
    ownMetric('ownership.voting_rights.black_people.target', 0.5, { value_type: 'percentage' }),
    ownMetric('ownership.voting_rights.black_people.available_points', 4),
  ]
}

function fullVotingBlackWomen() {
  return [
    ownMetric('ownership.voting_rights.black_women.percentage', 0.1, { value_type: 'percentage' }),
    ownMetric('ownership.voting_rights.black_women.target', 0.2, { value_type: 'percentage' }),
    ownMetric('ownership.voting_rights.black_women.available_points', 4),
  ]
}

function fullEconomicAndNet() {
  return [
    ownMetric('ownership.economic_interest.black_people.percentage', 0.3, { value_type: 'percentage' }),
    ownMetric('ownership.economic_interest.black_people.target', 0.6, { value_type: 'percentage' }),
    ownMetric('ownership.economic_interest.black_people.available_points', 2),
    ownMetric('ownership.economic_interest.black_women.percentage', 0.1, { value_type: 'percentage' }),
    ownMetric('ownership.economic_interest.black_women.target', 0.2, { value_type: 'percentage' }),
    ownMetric('ownership.economic_interest.black_women.available_points', 1),
    ownMetric('ownership.economic_interest.designated_groups.percentage', 0.05, { value_type: 'percentage' }),
    ownMetric('ownership.economic_interest.designated_groups.target', 0.1, { value_type: 'percentage' }),
    ownMetric('ownership.economic_interest.designated_groups.available_points', 1),
    ownMetric('ownership.net_value.percentage', 0.2, { value_type: 'percentage' }),
    ownMetric('ownership.net_value.target', 0.4, { value_type: 'percentage' }),
    ownMetric('ownership.net_value.available_points', 3),
  ]
}

function referenceBundle() {
  return [
    validMetricRow({
      metric_key: PRIMARY_REFERENCE_FINAL_SCORE_KEY,
      numeric_value: 7.5,
      pillar: REF,
    }),
    validMetricRow({
      metric_key: 'full_scorecard.reference.ownership.points_achieved',
      numeric_value: 7.5,
      pillar: REF,
    }),
    validMetricRow({
      metric_key: 'full_scorecard.reference.ownership.available_points',
      numeric_value: 15,
      pillar: REF,
    }),
  ]
}

function otherPillarReferenceRows() {
  return [
    validMetricRow({
      metric_key: 'full_scorecard.reference.management_control.available_points',
      numeric_value: 19,
      pillar: REF,
    }),
    validMetricRow({
      metric_key: 'full_scorecard.reference.management_control.possible_points_1',
      numeric_value: 19,
      pillar: REF,
    }),
    validMetricRow({
      metric_key: 'full_scorecard.reference.management_control.points_achieved',
      numeric_value: 0,
      pillar: REF,
    }),
    validMetricRow({
      metric_key: 'full_scorecard.reference.skills_development.available_points',
      numeric_value: 25,
      pillar: REF,
    }),
    validMetricRow({
      metric_key: 'full_scorecard.reference.skills_development.possible_points_1',
      numeric_value: 25,
      pillar: REF,
    }),
    validMetricRow({
      metric_key: 'full_scorecard.reference.skills_development.points_achieved',
      numeric_value: 0,
      pillar: REF,
    }),
    validMetricRow({
      metric_key: 'full_scorecard.reference.preferential_procurement.available_points',
      numeric_value: 25,
      pillar: REF,
    }),
    validMetricRow({
      metric_key: 'full_scorecard.reference.preferential_procurement.possible_points_1',
      numeric_value: 25,
      pillar: REF,
    }),
    validMetricRow({
      metric_key: 'full_scorecard.reference.preferential_procurement.points_achieved',
      numeric_value: 0,
      pillar: REF,
    }),
    validMetricRow({
      metric_key: 'full_scorecard.reference.enterprise_development.available_points',
      numeric_value: 5,
      pillar: REF,
    }),
    validMetricRow({
      metric_key: 'full_scorecard.reference.enterprise_development.possible_points_1',
      numeric_value: 5,
      pillar: REF,
    }),
    validMetricRow({
      metric_key: 'full_scorecard.reference.enterprise_development.points_achieved',
      numeric_value: 0,
      pillar: REF,
    }),
    validMetricRow({
      metric_key: 'full_scorecard.reference.supplier_development.available_points',
      numeric_value: 10,
      pillar: REF,
    }),
    validMetricRow({
      metric_key: 'full_scorecard.reference.supplier_development.possible_points_1',
      numeric_value: 10,
      pillar: REF,
    }),
    validMetricRow({
      metric_key: 'full_scorecard.reference.supplier_development.points_achieved',
      numeric_value: 0,
      pillar: REF,
    }),
    validMetricRow({
      metric_key: 'full_scorecard.reference.socio_economic_development.available_points',
      numeric_value: 5,
      pillar: REF,
    }),
    validMetricRow({
      metric_key: 'full_scorecard.reference.socio_economic_development.possible_points_1',
      numeric_value: 5,
      pillar: REF,
    }),
    validMetricRow({
      metric_key: 'full_scorecard.reference.socio_economic_development.points_achieved',
      numeric_value: 0,
      pillar: REF,
    }),
  ]
}

describe('ownership engine', () => {
  it('computes proportional voting rights points from Ownership sheet metrics', () => {
    const input = buildEngineInputs([
      ...fullVotingBlackPeople(),
      ...fullVotingBlackWomen(),
      ...fullEconomicAndNet(),
    ])
    const result = calculateFullScorecard({ input, engineVersion: 'test' })
    const voting = result.pillars
      .flatMap((p) => p.sections)
      .flatMap((s) => s.indicators)
      .find((i) => i.key === 'ownership.voting_rights')
    expect(voting?.status).toBe('calculated')
    // black people: 0.25/0.5 * 4 = 2; black women: 0.1/0.2 * 4 = 2
    expect(voting?.achievedPoints).toBe(4)
    expect(voting?.availablePoints).toBe(8)
  })

  it('caps proportional points when actual exceeds target', () => {
    const input2 = buildEngineInputs([
      ownMetric('ownership.voting_rights.black_people.percentage', 0.9, { value_type: 'percentage' }),
      ownMetric('ownership.voting_rights.black_people.target', 0.3, { value_type: 'percentage' }),
      ownMetric('ownership.voting_rights.black_people.available_points', 5),
      ...fullVotingBlackWomen(),
    ])
    const voting = calculateFullScorecard({ input: input2, engineVersion: 'test' }).pillars
      .flatMap((p) => p.sections)
      .flatMap((s) => s.indicators)
      .find((i) => i.key === 'ownership.voting_rights')
    expect(voting?.achievedPoints).toBe(7)
  })

  it('returns not_calculated when percentage metric is missing', () => {
    const input = buildEngineInputs([
      ownMetric('ownership.voting_rights.black_people.target', 0.5, { value_type: 'percentage' }),
      ownMetric('ownership.voting_rights.black_people.available_points', 4),
    ])
    const voting = calculateFullScorecard({ input, engineVersion: 'test' }).pillars
      .flatMap((p) => p.sections)
      .flatMap((s) => s.indicators)
      .find((i) => i.key === 'ownership.voting_rights')
    expect(voting?.status).toBe('not_calculated')
  })

  it('returns not_calculated when target is zero', () => {
    const input = buildEngineInputs([
      ownMetric('ownership.voting_rights.black_people.percentage', 0.25, { value_type: 'percentage' }),
      ownMetric('ownership.voting_rights.black_people.target', 0, { value_type: 'percentage' }),
      ownMetric('ownership.voting_rights.black_people.available_points', 4),
    ])
    const voting = calculateFullScorecard({ input, engineVersion: 'test' }).pillars
      .flatMap((p) => p.sections)
      .flatMap((s) => s.indicators)
      .find((i) => i.key === 'ownership.voting_rights')
    expect(voting?.status).toBe('not_calculated')
  })

  it('sums ownership pillar total from child indicators', () => {
    const input = buildEngineInputs([
      ...fullVotingBlackPeople(),
      ...fullVotingBlackWomen(),
      ...fullEconomicAndNet(),
    ])
    const ownership = calculateFullScorecard({ input, engineVersion: 'test' }).pillars.find(
      (p) => p.key === 'ownership',
    )
    const total = ownership?.sections
      .flatMap((s) => s.indicators)
      .find((i) => i.key === 'ownership.total')
    expect(total?.status).toBe('calculated')
    expect(ownership?.achievedPoints).toBe(total?.achievedPoints)
    expect(ownership?.status).toBe('calculated')
  })

  it('reconciles ownership pillar achieved against Full Scorecard reference', () => {
    const input = buildEngineInputs([
      ...fullVotingBlackPeople(),
      ...fullVotingBlackWomen(),
      ...fullEconomicAndNet(),
      ...referenceBundle(),
      ...otherPillarReferenceRows(),
      validMetricRow({
        metric_key: 'npat.value',
        numeric_value: 1000,
        pillar: 'NPAT',
        source_sheet: 'NPAT',
      }),
    ])
    const result = calculateFullScorecard({ input, engineVersion: 'test' })
    const rec = buildReconciliation({
      input,
      calculatedTotal: result.overall.totalScore,
      pillars: result.pillars,
    })
    const ownership = rec.elements.find((e) => e.elementKey === 'ownership')
    expect(ownership?.status).toBe('matched')
    expect(ownership?.calculatedAchievedPoints).toBe(ownership?.referenceAchievedPoints)
  })

  it('reconciles variance when reference ownership achieved differs', () => {
    const input = buildEngineInputs([
      ...fullVotingBlackPeople(),
      ...fullVotingBlackWomen(),
      ...fullEconomicAndNet(),
      validMetricRow({
        metric_key: PRIMARY_REFERENCE_FINAL_SCORE_KEY,
        numeric_value: 20,
        pillar: REF,
      }),
      validMetricRow({
        metric_key: 'full_scorecard.reference.ownership.points_achieved',
        numeric_value: 99,
        pillar: REF,
      }),
      validMetricRow({
        metric_key: 'full_scorecard.reference.ownership.available_points',
        numeric_value: 25,
        pillar: REF,
      }),
      ...otherPillarReferenceRows(),
      validMetricRow({
        metric_key: 'npat.value',
        numeric_value: 1000,
        pillar: 'NPAT',
        source_sheet: 'NPAT',
      }),
    ])
    const result = calculateFullScorecard({ input, engineVersion: 'test' })
    const rec = buildReconciliation({
      input,
      calculatedTotal: result.overall.totalScore,
      pillars: result.pillars,
    })
    const ownership = rec.elements.find((e) => e.elementKey === 'ownership')
    expect(ownership?.status).toBe('variance')
    expect(ownership?.achievedVariance).not.toBe(0)
  })

  it('does not use Ownership metrics in warning state for proportional scoring', () => {
    const input = buildEngineInputs([
      ownMetric('ownership.voting_rights.black_people.percentage', 0.25, {
        value_type: 'percentage',
        validation_state: 'warning',
        validation_message: 'Ambiguous Ownership sheet',
      }),
      ownMetric('ownership.voting_rights.black_people.target', 0.5, { value_type: 'percentage' }),
      ownMetric('ownership.voting_rights.black_people.available_points', 4),
      ...fullVotingBlackWomen(),
    ])
    const voting = calculateFullScorecard({ input, engineVersion: 'test' }).pillars
      .flatMap((p) => p.sections)
      .flatMap((s) => s.indicators)
      .find((i) => i.key === 'ownership.voting_rights')
    expect(voting?.status).toBe('calculated')
    // Only black women row counts: 0.1/0.2 * 4 = 2
    expect(voting?.achievedPoints).toBe(2)
  })
})
