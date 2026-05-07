import { describe, expect, it } from 'vitest'
import { buildEngineInputs } from '../build-inputs'
import { buildReconciliation } from '../reconciliation'
import { calculateFullScorecard } from '../calculate'
import { PRIMARY_REFERENCE_FINAL_SCORE_KEY } from '../types'
import { validMetricRow } from './fixtures'
import { fullBoardRow, ownershipMinimalForTotalScore } from './aggregation-fixtures'

const MC = 'Management Control'
const OWN = 'Ownership'
const REF = 'Full Scorecard Reference'

function mcMetric(
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
    pillar: MC,
    source_sheet: opts.source_sheet ?? '3 Board Members',
    numeric_value: numericValue,
    value_type: opts.value_type ?? 'number',
    validation_state: opts.validation_state ?? 'valid',
    validation_message: opts.validation_message ?? null,
  })
}

function otherReferenceSummaries(mcAchieved: number, mcAvail: number) {
  return [
    validMetricRow({
      metric_key: 'full_scorecard.reference.management_control.points_achieved',
      numeric_value: mcAchieved,
      pillar: REF,
    }),
    validMetricRow({
      metric_key: 'full_scorecard.reference.management_control.available_points',
      numeric_value: mcAvail,
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

describe('management control engine', () => {
  it('computes proportional board points', () => {
    const input = buildEngineInputs(fullBoardRow())
    const board = calculateFullScorecard({ input, engineVersion: 'test' }).pillars
      .flatMap((p) => p.sections)
      .flatMap((s) => s.indicators)
      .find((i) => i.key === 'management_control.board')
    expect(board?.status).toBe('calculated')
    expect(board?.achievedPoints).toBe(3)
  })

  it('caps when actual exceeds target on board row', () => {
    const input = buildEngineInputs([
      mcMetric('management_control.board.black_people.percentage', 0.9, {
        value_type: 'percentage',
        source_sheet: '3 Board Members',
      }),
      mcMetric('management_control.board.black_people.target', 0.3, {
        value_type: 'percentage',
        source_sheet: '3 Board Members',
      }),
      mcMetric('management_control.board.black_people.available_points', 5, { source_sheet: '3 Board Members' }),
      ...fullBoardRow().slice(3),
    ])
    const board = calculateFullScorecard({ input, engineVersion: 'test' }).pillars
      .flatMap((p) => p.sections)
      .flatMap((s) => s.indicators)
      .find((i) => i.key === 'management_control.board')
    expect(board?.achievedPoints).toBe(6)
  })

  it('is not_calculated when percentage missing', () => {
    const input = buildEngineInputs([
      mcMetric('management_control.board.black_people.target', 0.5, {
        value_type: 'percentage',
        source_sheet: '3 Board Members',
      }),
      mcMetric('management_control.board.black_people.available_points', 2, { source_sheet: '3 Board Members' }),
    ])
    const board = calculateFullScorecard({ input, engineVersion: 'test' }).pillars
      .flatMap((p) => p.sections)
      .flatMap((s) => s.indicators)
      .find((i) => i.key === 'management_control.board')
    expect(board?.status).toBe('not_calculated')
  })

  it('is not_calculated when target is zero', () => {
    const input = buildEngineInputs([
      mcMetric('management_control.board.black_people.percentage', 0.2, {
        value_type: 'percentage',
        source_sheet: '3 Board Members',
      }),
      mcMetric('management_control.board.black_people.target', 0, {
        value_type: 'percentage',
        source_sheet: '3 Board Members',
      }),
      mcMetric('management_control.board.black_people.available_points', 2, { source_sheet: '3 Board Members' }),
    ])
    const board = calculateFullScorecard({ input, engineVersion: 'test' }).pillars
      .flatMap((p) => p.sections)
      .flatMap((s) => s.indicators)
      .find((i) => i.key === 'management_control.board')
    expect(board?.status).toBe('not_calculated')
  })

  it('excludes warning-state metrics from proportional scoring', () => {
    const input = buildEngineInputs([
      mcMetric('management_control.board.black_people.percentage', 0.4, {
        value_type: 'percentage',
        source_sheet: '3 Board Members',
        validation_state: 'warning',
        validation_message: 'Ambiguous row',
      }),
      mcMetric('management_control.board.black_people.target', 0.5, {
        value_type: 'percentage',
        source_sheet: '3 Board Members',
      }),
      mcMetric('management_control.board.black_people.available_points', 2, { source_sheet: '3 Board Members' }),
      ...fullBoardRow().slice(3),
    ])
    const board = calculateFullScorecard({ input, engineVersion: 'test' }).pillars
      .flatMap((p) => p.sections)
      .flatMap((s) => s.indicators)
      .find((i) => i.key === 'management_control.board')
    expect(board?.status).toBe('calculated')
    expect(board?.achievedPoints).toBe(1)
  })

  it('sums MC total from children without double-counting pillar', () => {
    const input = buildEngineInputs([...fullBoardRow()])
    const pillar = calculateFullScorecard({ input, engineVersion: 'test' }).pillars.find(
      (p) => p.key === 'management_control',
    )
    const total = pillar?.sections
      .flatMap((s) => s.indicators)
      .find((i) => i.key === 'management_control.total')
    expect(total?.status).toBe('calculated')
    expect(pillar?.achievedPoints).toBe(total?.achievedPoints)
    const subKeys = [
      'management_control.board',
      'management_control.executive_directors',
      'management_control.other_executive_management',
      'management_control.senior_management',
      'management_control.middle_management',
      'management_control.junior_management',
      'management_control.employees_with_disabilities',
    ]
    const subs = pillar?.sections.flatMap((s) => s.indicators).filter((i) => subKeys.includes(i.key)) ?? []
    expect(subs.filter((s) => s.status === 'calculated').length).toBe(1)
  })

  it('reconciles MC pillar to Full Scorecard reference when available points align', () => {
    const ownershipAchieved = 7.5
    const mcAchieved = 3
    const mcAvail = 4
    const input = buildEngineInputs([
      ...ownershipMinimalForTotalScore(),
      ...fullBoardRow(),
      validMetricRow({
        metric_key: PRIMARY_REFERENCE_FINAL_SCORE_KEY,
        numeric_value: ownershipAchieved + mcAchieved,
        pillar: REF,
      }),
      validMetricRow({
        metric_key: 'full_scorecard.reference.ownership.points_achieved',
        numeric_value: ownershipAchieved,
        pillar: REF,
      }),
      validMetricRow({
        metric_key: 'full_scorecard.reference.ownership.available_points',
        numeric_value: 15,
        pillar: REF,
      }),
      ...otherReferenceSummaries(mcAchieved, mcAvail),
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
    const mc = rec.elements.find((e) => e.elementKey === 'management_control')
    expect(mc?.status).toBe('matched')
    expect(mc?.calculatedAchievedPoints).toBe(mcAchieved)
  })

  it('reconciles variance when reference MC achieved differs', () => {
    const input = buildEngineInputs([
      ...ownershipMinimalForTotalScore(),
      ...fullBoardRow(),
      validMetricRow({
        metric_key: PRIMARY_REFERENCE_FINAL_SCORE_KEY,
        numeric_value: 100,
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
      ...otherReferenceSummaries(99, 4),
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
    const mc = rec.elements.find((e) => e.elementKey === 'management_control')
    expect(mc?.status).toBe('variance')
  })
})
