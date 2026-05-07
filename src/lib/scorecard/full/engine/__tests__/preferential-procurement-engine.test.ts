import { describe, expect, it } from 'vitest'
import { buildEngineInputs } from '../build-inputs'
import { buildReconciliation } from '../reconciliation'
import { calculateFullScorecard } from '../calculate'
import { PRIMARY_REFERENCE_FINAL_SCORE_KEY } from '../types'
import { validMetricRow } from './fixtures'

const PP = 'Procurement / ESD'
const REF = 'Full Scorecard Reference'

function ppMetric(
  key: string,
  numericValue: number | null,
  opts: {
    value_type?: string
    validation_state?: 'valid' | 'warning' | 'error'
    validation_message?: string | null
    source_sheet?: string
  } = {},
) {
  return validMetricRow({
    metric_key: key,
    pillar: PP,
    source_sheet: opts.source_sheet ?? 'Procurement',
    numeric_value: numericValue,
    value_type: opts.value_type ?? 'number',
    validation_state: opts.validation_state ?? 'valid',
    validation_message: opts.validation_message ?? null,
  })
}

function bBbeeTriple() {
  return [
    ppMetric('preferential_procurement.b_bbee_procurement_spend.percentage', 0.6, {
      value_type: 'percentage',
    }),
    ppMetric('preferential_procurement.b_bbee_procurement_spend.target', 0.75, {
      value_type: 'percentage',
    }),
    ppMetric('preferential_procurement.b_bbee_procurement_spend.available_points', 5),
  ]
}

function referencePreferentialProcurement(achieved: number, available: number) {
  return [
    validMetricRow({
      metric_key: 'full_scorecard.reference.preferential_procurement.available_points',
      numeric_value: available,
      pillar: REF,
    }),
    validMetricRow({
      metric_key: 'full_scorecard.reference.preferential_procurement.possible_points_1',
      numeric_value: available,
      pillar: REF,
    }),
    validMetricRow({
      metric_key: 'full_scorecard.reference.preferential_procurement.points_achieved',
      numeric_value: achieved,
      pillar: REF,
    }),
  ]
}

function qseTriple() {
  return [
    ppMetric('preferential_procurement.qse_eme_procurement.percentage', 0.2, {
      value_type: 'percentage',
    }),
    ppMetric('preferential_procurement.qse_eme_procurement.target', 0.2, {
      value_type: 'percentage',
    }),
    ppMetric('preferential_procurement.qse_eme_procurement.available_points', 2),
  ]
}

describe('preferential procurement engine', () => {
  it('computes proportional B-BBEE procurement points', () => {
    const input = buildEngineInputs(bBbeeTriple())
    const ind = calculateFullScorecard({ input, engineVersion: 'test' }).pillars
      .flatMap((p) => p.sections)
      .flatMap((s) => s.indicators)
      .find((i) => i.key === 'procurement.preferential_b_bbee')
    expect(ind?.status).toBe('calculated')
    expect(ind?.achievedPoints).toBeCloseTo(4, 1)
    expect(ind?.availablePoints).toBe(5)
  })

  it('caps when actual exceeds target', () => {
    const input = buildEngineInputs([
      ppMetric('preferential_procurement.b_bbee_procurement_spend.percentage', 0.9, {
        value_type: 'percentage',
      }),
      ppMetric('preferential_procurement.b_bbee_procurement_spend.target', 0.5, {
        value_type: 'percentage',
      }),
      ppMetric('preferential_procurement.b_bbee_procurement_spend.available_points', 6),
    ])
    const ind = calculateFullScorecard({ input, engineVersion: 'test' }).pillars
      .flatMap((p) => p.sections)
      .flatMap((s) => s.indicators)
      .find((i) => i.key === 'procurement.preferential_b_bbee')
    expect(ind?.achievedPoints).toBe(6)
  })

  it('is not_calculated when percentage missing', () => {
    const input = buildEngineInputs([
      ppMetric('preferential_procurement.b_bbee_procurement_spend.target', 0.5, { value_type: 'percentage' }),
      ppMetric('preferential_procurement.b_bbee_procurement_spend.available_points', 5),
    ])
    const ind = calculateFullScorecard({ input, engineVersion: 'test' }).pillars
      .flatMap((p) => p.sections)
      .flatMap((s) => s.indicators)
      .find((i) => i.key === 'procurement.preferential_b_bbee')
    expect(ind?.status).toBe('not_calculated')
  })

  it('is not_calculated when target missing', () => {
    const input = buildEngineInputs([
      ppMetric('preferential_procurement.b_bbee_procurement_spend.percentage', 0.5, {
        value_type: 'percentage',
      }),
      ppMetric('preferential_procurement.b_bbee_procurement_spend.available_points', 5),
    ])
    const ind = calculateFullScorecard({ input, engineVersion: 'test' }).pillars
      .flatMap((p) => p.sections)
      .flatMap((s) => s.indicators)
      .find((i) => i.key === 'procurement.preferential_b_bbee')
    expect(ind?.status).toBe('not_calculated')
  })

  it('excludes warning-state metrics from proportional scoring', () => {
    const input = buildEngineInputs([
      ppMetric('preferential_procurement.b_bbee_procurement_spend.percentage', 0.6, {
        value_type: 'percentage',
        validation_state: 'warning',
        validation_message: 'Ambiguous Procurement row',
      }),
      ppMetric('preferential_procurement.b_bbee_procurement_spend.target', 0.75, {
        value_type: 'percentage',
      }),
      ppMetric('preferential_procurement.b_bbee_procurement_spend.available_points', 5),
      ...qseTriple(),
    ])
    const bb = calculateFullScorecard({ input, engineVersion: 'test' }).pillars
      .flatMap((p) => p.sections)
      .flatMap((s) => s.indicators)
      .find((i) => i.key === 'procurement.preferential_b_bbee')
    expect(bb?.status).toBe('not_calculated')
    const qse = calculateFullScorecard({ input, engineVersion: 'test' }).pillars
      .flatMap((p) => p.sections)
      .flatMap((s) => s.indicators)
      .find((i) => i.key === 'procurement.preferential_qse_eme')
    expect(qse?.status).toBe('calculated')
    expect(qse?.achievedPoints).toBe(2)
  })

  it('sums Preferential Procurement total from calculated children only (no double-count)', () => {
    const input = buildEngineInputs([...bBbeeTriple(), ...qseTriple()])
    const pillar = calculateFullScorecard({ input, engineVersion: 'test' }).pillars.find(
      (p) => p.key === 'procurement_esd',
    )
    const total = pillar?.sections
      .flatMap((s) => s.indicators)
      .find((i) => i.key === 'procurement.preferential_total')
    expect(total?.status).toBe('calculated')
    const subKeys = [
      'procurement.preferential_b_bbee',
      'procurement.preferential_qse_eme',
      'procurement.preferential_black_owned',
      'procurement.preferential_black_women_owned',
      'procurement.preferential_designated_group',
    ]
    const subs = pillar?.sections.flatMap((s) => s.indicators).filter((i) => subKeys.includes(i.key)) ?? []
    expect(subs.filter((s) => s.status === 'calculated').length).toBe(2)
    const sumChildren = subs.reduce(
      (acc, i) => acc + (i.status === 'calculated' ? (i.achievedPoints ?? 0) : 0),
      0,
    )
    expect(total?.achievedPoints).toBeCloseTo(sumChildren, 1)
  })

  it('reconciles Preferential Procurement total to Full Scorecard reference', () => {
    const base = [...bBbeeTriple(), ...qseTriple()]
    const prelim = calculateFullScorecard({ input: buildEngineInputs(base), engineVersion: 'test' })
    const totalInd = prelim.pillars
      .flatMap((p) => p.sections)
      .flatMap((s) => s.indicators)
      .find((i) => i.key === 'procurement.preferential_total')
    const achieved = totalInd?.achievedPoints
    const available = totalInd?.availablePoints
    expect(achieved).not.toBeNull()
    expect(available).not.toBeNull()

    const input = buildEngineInputs([
      ...base,
      ...referencePreferentialProcurement(achieved!, available!),
      validMetricRow({
        metric_key: PRIMARY_REFERENCE_FINAL_SCORE_KEY,
        numeric_value: achieved!,
        pillar: REF,
      }),
    ])
    const result = calculateFullScorecard({ input, engineVersion: 'test' })
    const rec = buildReconciliation({
      input,
      calculatedTotal: result.overall.totalScore,
      pillars: result.pillars,
    })
    const row = rec.elements.find((e) => e.elementKey === 'preferential_procurement')
    expect(row?.status).toBe('matched')
    expect(row?.calculatedAchievedPoints).toBe(achieved)
    expect(row?.achievedVariance).toBe(0)
  })

  it('reconciles variance when reference PP achieved differs', () => {
    const input = buildEngineInputs([
      ...bBbeeTriple(),
      ...qseTriple(),
      ...referencePreferentialProcurement(0, 25),
      validMetricRow({
        metric_key: PRIMARY_REFERENCE_FINAL_SCORE_KEY,
        numeric_value: 100,
        pillar: REF,
      }),
    ])
    const result = calculateFullScorecard({ input, engineVersion: 'test' })
    const rec = buildReconciliation({
      input,
      calculatedTotal: result.overall.totalScore,
      pillars: result.pillars,
    })
    const row = rec.elements.find((e) => e.elementKey === 'preferential_procurement')
    expect(row?.status).toBe('variance')
    expect(row?.achievedVariance).not.toBe(0)
  })
})
