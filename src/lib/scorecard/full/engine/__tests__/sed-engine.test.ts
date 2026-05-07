import { describe, expect, it } from 'vitest'
import { buildEngineInputs } from '../build-inputs'
import { buildReconciliation } from '../reconciliation'
import { calculateFullScorecard } from '../calculate'
import { PRIMARY_REFERENCE_FINAL_SCORE_KEY } from '../types'
import { validMetricRow } from './fixtures'

const SED_PILLAR = 'SED'
const REF = 'Full Scorecard Reference'

function sedMetric(
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
    pillar: SED_PILLAR,
    source_sheet: opts.source_sheet ?? 'SED',
    numeric_value: numericValue,
    value_type: opts.value_type ?? 'number',
    validation_state: opts.validation_state ?? 'valid',
    validation_message: opts.validation_message ?? null,
  })
}

function annualSpendTriple() {
  return [
    sedMetric('socio_economic_development.annual_spend.percentage', 0.02, {
      value_type: 'percentage',
    }),
    sedMetric('socio_economic_development.annual_spend.target', 0.01, {
      value_type: 'percentage',
    }),
    sedMetric('socio_economic_development.annual_spend.available_points', 5),
  ]
}

function referenceSed(achieved: number, available: number) {
  return [
    validMetricRow({
      metric_key: 'full_scorecard.reference.socio_economic_development.available_points',
      numeric_value: available,
      pillar: REF,
    }),
    validMetricRow({
      metric_key: 'full_scorecard.reference.socio_economic_development.possible_points_1',
      numeric_value: available,
      pillar: REF,
    }),
    validMetricRow({
      metric_key: 'full_scorecard.reference.socio_economic_development.points_achieved',
      numeric_value: achieved,
      pillar: REF,
    }),
  ]
}

describe('SED engine', () => {
  it('computes proportional annual spend points', () => {
    const input = buildEngineInputs([
      ...annualSpendTriple(),
      sedMetric('socio_economic_development.annual_spend.amount', 500_000, {
        value_type: 'currency',
      }),
    ])
    const annual = calculateFullScorecard({ input, engineVersion: 'test' }).pillars
      .flatMap((p) => p.sections)
      .flatMap((s) => s.indicators)
      .find((i) => i.key === 'sed.annual_spend')
    expect(annual?.status).toBe('calculated')
    expect(annual?.achievedPoints).toBe(5)
    expect(annual?.availablePoints).toBe(5)
  })

  it('caps when actual exceeds target', () => {
    const input = buildEngineInputs([
      sedMetric('socio_economic_development.annual_spend.percentage', 0.05, {
        value_type: 'percentage',
      }),
      sedMetric('socio_economic_development.annual_spend.target', 0.02, {
        value_type: 'percentage',
      }),
      sedMetric('socio_economic_development.annual_spend.available_points', 4),
    ])
    const annual = calculateFullScorecard({ input, engineVersion: 'test' }).pillars
      .flatMap((p) => p.sections)
      .flatMap((s) => s.indicators)
      .find((i) => i.key === 'sed.annual_spend')
    expect(annual?.achievedPoints).toBe(4)
  })

  it('is not_calculated when percentage missing', () => {
    const input = buildEngineInputs([
      sedMetric('socio_economic_development.annual_spend.target', 0.01, { value_type: 'percentage' }),
      sedMetric('socio_economic_development.annual_spend.available_points', 5),
    ])
    const annual = calculateFullScorecard({ input, engineVersion: 'test' }).pillars
      .flatMap((p) => p.sections)
      .flatMap((s) => s.indicators)
      .find((i) => i.key === 'sed.annual_spend')
    expect(annual?.status).toBe('not_calculated')
  })

  it('is not_calculated when target missing', () => {
    const input = buildEngineInputs([
      sedMetric('socio_economic_development.annual_spend.percentage', 0.02, {
        value_type: 'percentage',
      }),
      sedMetric('socio_economic_development.annual_spend.available_points', 5),
    ])
    const annual = calculateFullScorecard({ input, engineVersion: 'test' }).pillars
      .flatMap((p) => p.sections)
      .flatMap((s) => s.indicators)
      .find((i) => i.key === 'sed.annual_spend')
    expect(annual?.status).toBe('not_calculated')
  })

  it('excludes warning-state metrics from proportional scoring', () => {
    const input = buildEngineInputs([
      sedMetric('socio_economic_development.annual_spend.percentage', 0.02, {
        value_type: 'percentage',
        validation_state: 'warning',
        validation_message: 'Ambiguous SED row',
      }),
      sedMetric('socio_economic_development.annual_spend.target', 0.01, {
        value_type: 'percentage',
      }),
      sedMetric('socio_economic_development.annual_spend.available_points', 5),
    ])
    const annual = calculateFullScorecard({ input, engineVersion: 'test' }).pillars
      .flatMap((p) => p.sections)
      .flatMap((s) => s.indicators)
      .find((i) => i.key === 'sed.annual_spend')
    expect(annual?.status).toBe('not_calculated')
  })

  it('sums SED total from child without double-counting pillar rollup', () => {
    const input = buildEngineInputs(annualSpendTriple())
    const pillar = calculateFullScorecard({ input, engineVersion: 'test' }).pillars.find(
      (p) => p.key === 'sed',
    )
    const total = pillar?.sections
      .flatMap((s) => s.indicators)
      .find((i) => i.key === 'sed.total')
    expect(total?.status).toBe('calculated')
    expect(pillar?.achievedPoints).toBe(total?.achievedPoints)
    expect(pillar?.achievedPoints).toBe(5)
  })

  it('reconciles SED pillar to Full Scorecard reference', () => {
    const base = annualSpendTriple()
    const prelim = calculateFullScorecard({ input: buildEngineInputs(base), engineVersion: 'test' })
    const sedPillar = prelim.pillars.find((p) => p.key === 'sed')
    const achieved = sedPillar?.achievedPoints
    const available = sedPillar?.availablePoints
    expect(achieved).not.toBeNull()
    expect(available).not.toBeNull()

    const input = buildEngineInputs([
      ...base,
      ...referenceSed(achieved!, available!),
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
    const sed = rec.elements.find((e) => e.elementKey === 'socio_economic_development')
    expect(sed?.status).toBe('matched')
    expect(sed?.calculatedAchievedPoints).toBe(achieved)
    expect(sed?.achievedVariance).toBe(0)
  })

  it('reconciles variance when reference SED achieved differs', () => {
    const input = buildEngineInputs([
      ...annualSpendTriple(),
      ...referenceSed(0, 5),
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
    const sed = rec.elements.find((e) => e.elementKey === 'socio_economic_development')
    expect(sed?.status).toBe('variance')
    expect(sed?.achievedVariance).not.toBe(0)
  })
})
