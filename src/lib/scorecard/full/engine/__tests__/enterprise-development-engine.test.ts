import { describe, expect, it } from 'vitest'
import { buildEngineInputs } from '../build-inputs'
import { buildReconciliation } from '../reconciliation'
import { calculateFullScorecard } from '../calculate'
import { PRIMARY_REFERENCE_FINAL_SCORE_KEY } from '../types'
import { validMetricRow } from './fixtures'

const ESD = 'Procurement / ESD'
const REF = 'Full Scorecard Reference'

function edMetric(
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
    pillar: ESD,
    source_sheet: opts.source_sheet ?? 'ED & SD',
    numeric_value: numericValue,
    value_type: opts.value_type ?? 'number',
    validation_state: opts.validation_state ?? 'valid',
    validation_message: opts.validation_message ?? null,
  })
}

function annualValueTriple() {
  return [
    edMetric('enterprise_development.annual_value.percentage', 0.1, { value_type: 'percentage' }),
    edMetric('enterprise_development.annual_value.target', 0.2, { value_type: 'percentage' }),
    edMetric('enterprise_development.annual_value.available_points', 4),
  ]
}

function graduationBonusTriple() {
  return [
    edMetric('enterprise_development.bonus.graduation.percentage', 0.5, { value_type: 'percentage' }),
    edMetric('enterprise_development.bonus.graduation.target', 0.5, { value_type: 'percentage' }),
    edMetric('enterprise_development.bonus.graduation.available_points', 1),
  ]
}

function referenceEnterpriseDevelopment(achieved: number, available: number) {
  return [
    validMetricRow({
      metric_key: 'full_scorecard.reference.enterprise_development.available_points',
      numeric_value: available,
      pillar: REF,
    }),
    validMetricRow({
      metric_key: 'full_scorecard.reference.enterprise_development.possible_points_1',
      numeric_value: available,
      pillar: REF,
    }),
    validMetricRow({
      metric_key: 'full_scorecard.reference.enterprise_development.points_achieved',
      numeric_value: achieved,
      pillar: REF,
    }),
  ]
}

describe('enterprise development engine', () => {
  it('computes proportional annual value points', () => {
    const input = buildEngineInputs(annualValueTriple())
    const ind = calculateFullScorecard({ input, engineVersion: 'test' }).pillars
      .flatMap((p) => p.sections)
      .flatMap((s) => s.indicators)
      .find((i) => i.key === 'esd.enterprise_development_annual_value')
    expect(ind?.status).toBe('calculated')
    expect(ind?.achievedPoints).toBe(2)
    expect(ind?.availablePoints).toBe(4)
  })

  it('caps when actual exceeds target', () => {
    const input = buildEngineInputs([
      edMetric('enterprise_development.annual_value.percentage', 0.5, { value_type: 'percentage' }),
      edMetric('enterprise_development.annual_value.target', 0.2, { value_type: 'percentage' }),
      edMetric('enterprise_development.annual_value.available_points', 3),
    ])
    const ind = calculateFullScorecard({ input, engineVersion: 'test' }).pillars
      .flatMap((p) => p.sections)
      .flatMap((s) => s.indicators)
      .find((i) => i.key === 'esd.enterprise_development_annual_value')
    expect(ind?.achievedPoints).toBe(3)
  })

  it('is not_calculated when percentage missing', () => {
    const input = buildEngineInputs([
      edMetric('enterprise_development.annual_value.target', 0.2, { value_type: 'percentage' }),
      edMetric('enterprise_development.annual_value.available_points', 4),
    ])
    const ind = calculateFullScorecard({ input, engineVersion: 'test' }).pillars
      .flatMap((p) => p.sections)
      .flatMap((s) => s.indicators)
      .find((i) => i.key === 'esd.enterprise_development_annual_value')
    expect(ind?.status).toBe('not_calculated')
  })

  it('is not_calculated when target missing', () => {
    const input = buildEngineInputs([
      edMetric('enterprise_development.annual_value.percentage', 0.1, { value_type: 'percentage' }),
      edMetric('enterprise_development.annual_value.available_points', 4),
    ])
    const ind = calculateFullScorecard({ input, engineVersion: 'test' }).pillars
      .flatMap((p) => p.sections)
      .flatMap((s) => s.indicators)
      .find((i) => i.key === 'esd.enterprise_development_annual_value')
    expect(ind?.status).toBe('not_calculated')
  })

  it('excludes warning-state metrics from proportional scoring', () => {
    const input = buildEngineInputs([
      edMetric('enterprise_development.annual_value.percentage', 0.1, {
        value_type: 'percentage',
        validation_state: 'warning',
        validation_message: 'Ambiguous ED row',
      }),
      edMetric('enterprise_development.annual_value.target', 0.2, { value_type: 'percentage' }),
      edMetric('enterprise_development.annual_value.available_points', 4),
      ...graduationBonusTriple(),
    ])
    const annual = calculateFullScorecard({ input, engineVersion: 'test' }).pillars
      .flatMap((p) => p.sections)
      .flatMap((s) => s.indicators)
      .find((i) => i.key === 'esd.enterprise_development_annual_value')
    expect(annual?.status).toBe('not_calculated')
    const grad = calculateFullScorecard({ input, engineVersion: 'test' }).pillars
      .flatMap((p) => p.sections)
      .flatMap((s) => s.indicators)
      .find((i) => i.key === 'esd.enterprise_development_bonus_graduation')
    expect(grad?.status).toBe('calculated')
    expect(grad?.achievedPoints).toBe(1)
  })

  it('sums Enterprise Development total from calculated children', () => {
    const input = buildEngineInputs([...annualValueTriple(), ...graduationBonusTriple()])
    const pillar = calculateFullScorecard({ input, engineVersion: 'test' }).pillars.find(
      (p) => p.key === 'procurement_esd',
    )
    const total = pillar?.sections
      .flatMap((s) => s.indicators)
      .find((i) => i.key === 'esd.enterprise_development_total')
    expect(total?.status).toBe('calculated')
    const subKeys = [
      'esd.enterprise_development_annual_value',
      'esd.enterprise_development_bonus_graduation',
      'esd.enterprise_development_bonus_job_creation',
    ]
    const subs = pillar?.sections.flatMap((s) => s.indicators).filter((i) => subKeys.includes(i.key)) ?? []
    const sumCalc = subs.reduce(
      (acc, i) => acc + (i.status === 'calculated' ? (i.achievedPoints ?? 0) : 0),
      0,
    )
    expect(total?.achievedPoints).toBeCloseTo(sumCalc, 1)
    expect(subs.filter((s) => s.status === 'calculated').length).toBe(2)
  })

  it('reconciles Enterprise Development total to Full Scorecard reference', () => {
    const base = [...annualValueTriple(), ...graduationBonusTriple()]
    const prelim = calculateFullScorecard({ input: buildEngineInputs(base), engineVersion: 'test' })
    const totalInd = prelim.pillars
      .flatMap((p) => p.sections)
      .flatMap((s) => s.indicators)
      .find((i) => i.key === 'esd.enterprise_development_total')
    const achieved = totalInd?.achievedPoints
    const available = totalInd?.availablePoints
    expect(achieved).not.toBeNull()
    expect(available).not.toBeNull()

    const input = buildEngineInputs([
      ...base,
      ...referenceEnterpriseDevelopment(achieved!, available!),
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
    const row = rec.elements.find((e) => e.elementKey === 'enterprise_development')
    expect(row?.status).toBe('matched')
    expect(row?.calculatedAchievedPoints).toBe(achieved)
    expect(row?.achievedVariance).toBe(0)
  })

  it('reconciles variance when reference ED achieved differs', () => {
    const input = buildEngineInputs([
      ...annualValueTriple(),
      ...referenceEnterpriseDevelopment(0, 5),
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
    const row = rec.elements.find((e) => e.elementKey === 'enterprise_development')
    expect(row?.status).toBe('variance')
    expect(row?.achievedVariance).not.toBe(0)
  })
})
