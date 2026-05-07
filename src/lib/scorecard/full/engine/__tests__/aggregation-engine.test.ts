import { describe, expect, it } from 'vitest'
import { buildEngineInputs } from '../build-inputs'
import { buildReconciliation } from '../reconciliation'
import { calculateFullScorecard } from '../calculate'
import { getLevelBand } from '../level-bands'
import { PRIMARY_REFERENCE_FINAL_SCORE_KEY } from '../types'
import { validMetricRow } from './fixtures'
import { fullBoardRow, ownershipMinimalForTotalScore } from './aggregation-fixtures'

const PP = 'Procurement / ESD'
const SK = 'Skills Development'
const SED = 'SED'
const REF = 'Full Scorecard Reference'

function ppMetric(
  key: string,
  numericValue: number | null,
  opts: { value_type?: string; source_sheet?: string } = {},
) {
  return validMetricRow({
    metric_key: key,
    pillar: PP,
    source_sheet: opts.source_sheet ?? 'Procurement',
    numeric_value: numericValue,
    value_type: opts.value_type ?? 'number',
  })
}

function skillsMetric(key: string, numericValue: number | null, opts: { value_type?: string } = {}) {
  return validMetricRow({
    metric_key: key,
    pillar: SK,
    source_sheet: SK,
    numeric_value: numericValue,
    value_type: opts.value_type ?? 'number',
  })
}

function sedMetric(key: string, numericValue: number | null, opts: { value_type?: string } = {}) {
  return validMetricRow({
    metric_key: key,
    pillar: SED,
    source_sheet: 'SED',
    numeric_value: numericValue,
    value_type: opts.value_type ?? 'number',
  })
}

function edMetric(key: string, numericValue: number | null, opts: { value_type?: string } = {}) {
  return validMetricRow({
    metric_key: key,
    pillar: PP,
    source_sheet: 'ED & SD',
    numeric_value: numericValue,
    value_type: opts.value_type ?? 'number',
  })
}

function sdMetric(key: string, numericValue: number | null, opts: { value_type?: string } = {}) {
  return validMetricRow({
    metric_key: key,
    pillar: PP,
    source_sheet: 'ED & SD',
    numeric_value: numericValue,
    value_type: opts.value_type ?? 'number',
  })
}

function preferentialProcurementPair() {
  return [
    ppMetric('preferential_procurement.b_bbee_procurement_spend.percentage', 0.6, {
      value_type: 'percentage',
    }),
    ppMetric('preferential_procurement.b_bbee_procurement_spend.target', 0.75, {
      value_type: 'percentage',
    }),
    ppMetric('preferential_procurement.b_bbee_procurement_spend.available_points', 5),
    ppMetric('preferential_procurement.qse_eme_procurement.percentage', 0.2, {
      value_type: 'percentage',
    }),
    ppMetric('preferential_procurement.qse_eme_procurement.target', 0.2, { value_type: 'percentage' }),
    ppMetric('preferential_procurement.qse_eme_procurement.available_points', 2),
  ]
}

function enterpriseDevelopmentPair() {
  return [
    edMetric('enterprise_development.annual_value.percentage', 0.1, { value_type: 'percentage' }),
    edMetric('enterprise_development.annual_value.target', 0.2, { value_type: 'percentage' }),
    edMetric('enterprise_development.annual_value.available_points', 4),
    edMetric('enterprise_development.bonus.graduation.percentage', 0.5, { value_type: 'percentage' }),
    edMetric('enterprise_development.bonus.graduation.target', 0.5, { value_type: 'percentage' }),
    edMetric('enterprise_development.bonus.graduation.available_points', 1),
  ]
}

function supplierDevelopmentPair() {
  return [
    sdMetric('supplier_development.annual_value.percentage', 0.15, { value_type: 'percentage' }),
    sdMetric('supplier_development.annual_value.target', 0.3, { value_type: 'percentage' }),
    sdMetric('supplier_development.annual_value.available_points', 5),
    sdMetric('supplier_development.bonus.graduation.percentage', 1, { value_type: 'percentage' }),
    sdMetric('supplier_development.bonus.graduation.target', 0.8, { value_type: 'percentage' }),
    sdMetric('supplier_development.bonus.graduation.available_points', 2),
  ]
}

function skillsExpenditureRow() {
  return [
    skillsMetric('skills_development.expenditure.black_people.percentage', 0.04, {
      value_type: 'percentage',
    }),
    skillsMetric('skills_development.expenditure.black_people.target', 0.06, {
      value_type: 'percentage',
    }),
    skillsMetric('skills_development.expenditure.black_people.available_points', 8),
  ]
}

function sedAnnualRow() {
  return [
    sedMetric('socio_economic_development.annual_spend.percentage', 0.02, { value_type: 'percentage' }),
    sedMetric('socio_economic_development.annual_spend.target', 0.01, { value_type: 'percentage' }),
    sedMetric('socio_economic_development.annual_spend.available_points', 5),
  ]
}

function allFivePillarsMetrics() {
  return [
    ...ownershipMinimalForTotalScore(),
    ...fullBoardRow(),
    ...skillsExpenditureRow(),
    ...preferentialProcurementPair(),
    ...enterpriseDevelopmentPair(),
    ...supplierDevelopmentPair(),
    ...sedAnnualRow(),
    validMetricRow({
      metric_key: 'npat.value',
      numeric_value: 1_000_000,
      pillar: 'NPAT',
      source_sheet: 'NPAT',
    }),
  ]
}

describe('full scorecard aggregation (Phase 4J)', () => {
  it('Procurement / ESD combined total equals PP + ED + SD section totals', () => {
    const input = buildEngineInputs([
      ...preferentialProcurementPair(),
      ...enterpriseDevelopmentPair(),
      ...supplierDevelopmentPair(),
    ])
    const pillar = calculateFullScorecard({ input, engineVersion: 'test' }).pillars.find(
      (p) => p.key === 'procurement_esd',
    )
    const inds = pillar?.sections.flatMap((s) => s.indicators) ?? []
    const pp = inds.find((i) => i.key === 'procurement.preferential_total')
    const ed = inds.find((i) => i.key === 'esd.enterprise_development_total')
    const sd = inds.find((i) => i.key === 'esd.supplier_development_total')
    const combined = inds.find((i) => i.key === 'procurement_esd.combined_total')
    const sumSection = (pp?.achievedPoints ?? 0) + (ed?.achievedPoints ?? 0) + (sd?.achievedPoints ?? 0)
    expect(combined?.achievedPoints).toBeCloseTo(sumSection, 1)
    expect(pillar?.achievedPoints).toBeCloseTo(combined?.achievedPoints ?? 0, 1)
  })

  it('does not double-count PP / ED / SD child indicators in procurement pillar rollup', () => {
    const input = buildEngineInputs([
      ...preferentialProcurementPair(),
      ...enterpriseDevelopmentPair(),
      ...supplierDevelopmentPair(),
    ])
    const pillar = calculateFullScorecard({ input, engineVersion: 'test' }).pillars.find(
      (p) => p.key === 'procurement_esd',
    )
    const inds = pillar?.sections.flatMap((s) => s.indicators) ?? []
    const keysToSum = [
      'procurement.preferential_b_bbee',
      'procurement.preferential_qse_eme',
      'esd.enterprise_development_annual_value',
      'esd.enterprise_development_bonus_graduation',
      'esd.supplier_development_annual_value',
      'esd.supplier_development_bonus_graduation',
      'procurement.preferential_total',
      'esd.enterprise_development_total',
      'esd.supplier_development_total',
      'procurement_esd.combined_total',
    ]
    const naive = inds
      .filter((i) => keysToSum.includes(i.key))
      .reduce((a, i) => a + (i.status === 'calculated' ? (i.achievedPoints ?? 0) : 0), 0)
    expect(naive).toBeGreaterThan(pillar?.achievedPoints ?? 0)
    expect(pillar?.achievedPoints).toBeCloseTo(inds.find((i) => i.key === 'procurement_esd.combined_total')?.achievedPoints ?? 0, 1)
  })

  it('overall total sums the five major pillars when all are calculated', () => {
    const input = buildEngineInputs(allFivePillarsMetrics())
    const result = calculateFullScorecard({ input, engineVersion: 'test' })
    const sumPillars = result.pillars
      .filter((p) =>
        ['ownership', 'management_control', 'skills_development', 'procurement_esd', 'sed'].includes(p.key),
      )
      .reduce((a, p) => a + (p.achievedPoints ?? 0), 0)
    expect(result.overall.totalScore).toBeCloseTo(sumPillars, 1)
    expect(result.overall.scoreCompleteness).toBe('complete')
    expect(result.overall.missingPillarsForCompleteScore).toHaveLength(0)
  })

  it('marks score partial and omits B-BBEE level when a major pillar is missing', () => {
    const input = buildEngineInputs([
      ...ownershipMinimalForTotalScore(),
      ...fullBoardRow(),
      ...skillsExpenditureRow(),
      ...preferentialProcurementPair(),
      ...enterpriseDevelopmentPair(),
      ...supplierDevelopmentPair(),
      validMetricRow({
        metric_key: 'npat.value',
        numeric_value: 1,
        pillar: 'NPAT',
        source_sheet: 'NPAT',
      }),
    ])
    const result = calculateFullScorecard({ input, engineVersion: 'test' })
    expect(result.overall.scoreCompleteness).toBe('partial')
    expect(result.overall.missingPillarsForCompleteScore).toContain('SED')
    expect(result.overall.bbbeeLevel).toBeNull()
    expect(result.overall.recognitionPercentage).toBeNull()
    expect(result.overall.totalScore).not.toBeNull()
    expect(result.warnings.some((w) => w.code === 'overall_score_incomplete')).toBe(true)
  })

  it('assigns B-BBEE level and recognition only when score is complete', () => {
    const input = buildEngineInputs(allFivePillarsMetrics())
    const result = calculateFullScorecard({ input, engineVersion: 'test' })
    expect(result.overall.totalScore).not.toBeNull()
    const band = getLevelBand(result.overall.totalScore)
    expect(result.overall.bbbeeLevel).toBe(band.level)
    expect(result.overall.recognitionPercentage).toBe(band.recognitionPercentage)
  })

  it('reconciles overall calculated total to Excel reference final score when they match', () => {
    const base = allFivePillarsMetrics()
    const prelim = calculateFullScorecard({ input: buildEngineInputs(base), engineVersion: 'test' })
    const total = prelim.overall.totalScore
    expect(total).not.toBeNull()
    const input = buildEngineInputs([
      ...base,
      validMetricRow({
        metric_key: PRIMARY_REFERENCE_FINAL_SCORE_KEY,
        numeric_value: total!,
        pillar: REF,
      }),
    ])
    const result = calculateFullScorecard({ input, engineVersion: 'test' })
    const rec = buildReconciliation({
      input,
      calculatedTotal: result.overall.totalScore,
      pillars: result.pillars,
    })
    expect(rec.overall.status).toBe('matched')
    expect(rec.overall.variance).toBe(0)
  })

  it('emits discounting TODO warning when reference flags discounting applicable', () => {
    const input = buildEngineInputs([
      ...allFivePillarsMetrics(),
      validMetricRow({
        metric_key: 'full_scorecard.reference.discounting_applicable',
        boolean_value: true,
        numeric_value: null,
        pillar: REF,
      }),
    ])
    const result = calculateFullScorecard({ input, engineVersion: 'test' })
    expect(result.overall.discountingApplicable).toBe(true)
    expect(result.warnings.some((w) => w.code === 'discounting_not_implemented')).toBe(true)
  })
})
