import { describe, expect, it } from 'vitest'
import { getLevelBand } from '../level-bands'
import {
  calculateProportionalPoints,
  clamp,
  coerceMetricNumber,
  roundScore,
  safeDivide,
  sumScores,
} from '../safe-math'
import { buildEngineInputs } from '../build-inputs'
import { buildReconciliation } from '../reconciliation'
import { calculateFullScorecard } from '../calculate'
import { runFullScorecardEngine } from '../index'
import { PRIMARY_REFERENCE_FINAL_SCORE_KEY } from '../types'
import { errorMetricRow, pillarWithOwnershipSummary, validMetricRow } from './fixtures'

describe('level bands', () => {
  it('maps score to expected level band', () => {
    expect(getLevelBand(100).level).toBe('Level 1')
    expect(getLevelBand(96).level).toBe('Level 2')
    expect(getLevelBand(83).level).toBe('Level 4')
    expect(getLevelBand(38).level).toBe('Non-compliant')
  })
})

describe('safe math helpers', () => {
  it('handles divide clamp round and sum safely', () => {
    expect(safeDivide(4, 2)).toBe(2)
    expect(safeDivide(4, 0)).toBeNull()
    expect(clamp(12, 0, 10)).toBe(10)
    expect(roundScore(12.3456)).toBe(12.35)
    expect(calculateProportionalPoints({ actual: 5, target: 10, availablePoints: 20 })).toBe(10)
    expect(sumScores([1, 2, null, undefined])).toBe(3)
    expect(coerceMetricNumber('1,200.50')).toBe(1200.5)
  })
})

describe('build inputs', () => {
  it('ignores metrics in error state', () => {
    const rows = [
      validMetricRow({
        metric_key: 'npat.value',
        pillar: 'NPAT',
        numeric_value: 1000,
        source_sheet: 'NPAT',
      }),
      errorMetricRow({
        metric_key: 'npat.target_base_value',
        pillar: 'NPAT',
        source_sheet: 'NPAT',
      }),
    ]
    const input = buildEngineInputs(rows)
    expect(input.byMetricKey['npat.value']).toBeDefined()
    expect(input.byMetricKey['npat.target_base_value']).toBeUndefined()
    expect(input.warnings.some((w) => w.code === 'metric_ignored_error_state')).toBe(true)
  })
})

describe('reconciliation', () => {
  const refPillar = 'Full Scorecard Reference'

  it('overall matched when final score equals calculated total', () => {
    const input = buildEngineInputs([
      validMetricRow({
        metric_key: PRIMARY_REFERENCE_FINAL_SCORE_KEY,
        numeric_value: 80,
        pillar: refPillar,
        source_cell: 'B99',
      }),
    ])
    const rec = buildReconciliation({ input, calculatedTotal: 80, pillars: [] })
    expect(rec.overall.status).toBe('matched')
    expect(rec.overall.variance).toBe(0)
    expect(rec.overall.referenceMetricKey).toBe(PRIMARY_REFERENCE_FINAL_SCORE_KEY)
    expect(rec.overall.referenceSourceCell).toBe('B99')
    expect(rec.elements).toHaveLength(7)
  })

  it('overall variance when totals differ', () => {
    const input = buildEngineInputs([
      validMetricRow({
        metric_key: PRIMARY_REFERENCE_FINAL_SCORE_KEY,
        numeric_value: 70,
        pillar: refPillar,
      }),
    ])
    const rec = buildReconciliation({ input, calculatedTotal: 75, pillars: [] })
    expect(rec.overall.status).toBe('variance')
    expect(rec.overall.variance).toBe(5)
  })

  it('overall not_available when reference final score is missing', () => {
    const input = buildEngineInputs([])
    const rec = buildReconciliation({ input, calculatedTotal: 10, pillars: [] })
    expect(rec.overall.status).toBe('not_available')
    expect(rec.overall.reason?.toLowerCase()).toContain('not extracted')
  })

  it('overall not_calculated when calculated total is missing', () => {
    const input = buildEngineInputs([
      validMetricRow({
        metric_key: PRIMARY_REFERENCE_FINAL_SCORE_KEY,
        numeric_value: 50,
        pillar: refPillar,
      }),
    ])
    const rec = buildReconciliation({ input, calculatedTotal: null, pillars: [] })
    expect(rec.overall.status).toBe('not_calculated')
  })

  it('overall ambiguous_reference when final score metric is ambiguous', () => {
    const input = buildEngineInputs([
      validMetricRow({
        metric_key: PRIMARY_REFERENCE_FINAL_SCORE_KEY,
        numeric_value: 50,
        pillar: refPillar,
        validation_message: 'Ambiguous row match for "final_score" (2 candidate rows).',
      }),
    ])
    const rec = buildReconciliation({ input, calculatedTotal: 50, pillars: [] })
    expect(rec.overall.status).toBe('ambiguous_reference')
  })

  it('pillar-level ownership matched when reference and engine agree', () => {
    const input = buildEngineInputs([
      validMetricRow({
        metric_key: 'full_scorecard.reference.ownership.available_points',
        numeric_value: 25,
        pillar: refPillar,
        source_cell: 'B2',
      }),
      validMetricRow({
        metric_key: 'full_scorecard.reference.ownership.points_achieved',
        numeric_value: 20,
        pillar: refPillar,
        source_cell: 'C2',
      }),
      validMetricRow({
        metric_key: 'full_scorecard.reference.final_score',
        numeric_value: 20,
        pillar: refPillar,
      }),
    ])
    const pillars = [pillarWithOwnershipSummary({ availablePoints: 25, achievedPoints: 20 })]
    const rec = buildReconciliation({ input, calculatedTotal: 20, pillars })
    const ownership = rec.elements.find((e) => e.elementKey === 'ownership')
    expect(ownership?.status).toBe('matched')
    expect(ownership?.achievedVariance).toBe(0)
    expect(ownership?.referenceAvailableSourceCell).toBe('B2')
    expect(ownership?.referenceAchievedSourceCell).toBe('C2')
  })

  it('pillar-level ambiguous_reference when reference ownership row is ambiguous', () => {
    const input = buildEngineInputs([
      validMetricRow({
        metric_key: 'full_scorecard.reference.ownership.available_points',
        numeric_value: null,
        pillar: refPillar,
        validation_message: 'Ambiguous row match for element "ownership" (2 candidate rows).',
      }),
      validMetricRow({
        metric_key: 'full_scorecard.reference.ownership.points_achieved',
        numeric_value: null,
        pillar: refPillar,
        validation_message: 'Ambiguous row match for element "ownership" (2 candidate rows).',
      }),
      validMetricRow({
        metric_key: PRIMARY_REFERENCE_FINAL_SCORE_KEY,
        numeric_value: 20,
        pillar: refPillar,
      }),
    ])
    const pillars = [pillarWithOwnershipSummary()]
    const rec = buildReconciliation({ input, calculatedTotal: 20, pillars })
    const ownership = rec.elements.find((e) => e.elementKey === 'ownership')
    expect(ownership?.status).toBe('ambiguous_reference')
  })

  it('pillar-level not_available when reference achieved is missing', () => {
    const input = buildEngineInputs([
      validMetricRow({
        metric_key: 'full_scorecard.reference.ownership.available_points',
        numeric_value: 25,
        pillar: refPillar,
      }),
      validMetricRow({
        metric_key: PRIMARY_REFERENCE_FINAL_SCORE_KEY,
        numeric_value: 20,
        pillar: refPillar,
      }),
    ])
    const pillars = [pillarWithOwnershipSummary()]
    const rec = buildReconciliation({ input, calculatedTotal: 20, pillars })
    const ownership = rec.elements.find((e) => e.elementKey === 'ownership')
    expect(ownership?.status).toBe('not_available')
  })

  it('pillar-level not_calculated when indicator is not calculated', () => {
    const input = buildEngineInputs([
      validMetricRow({
        metric_key: 'full_scorecard.reference.ownership.available_points',
        numeric_value: 25,
        pillar: refPillar,
      }),
      validMetricRow({
        metric_key: 'full_scorecard.reference.ownership.points_achieved',
        numeric_value: 20,
        pillar: refPillar,
      }),
      validMetricRow({
        metric_key: PRIMARY_REFERENCE_FINAL_SCORE_KEY,
        numeric_value: 0,
        pillar: refPillar,
      }),
    ])
    const pillars = [pillarWithOwnershipSummary({ status: 'not_calculated', achievedPoints: null })]
    const rec = buildReconciliation({ input, calculatedTotal: null, pillars })
    const ownership = rec.elements.find((e) => e.elementKey === 'ownership')
    expect(ownership?.status).toBe('not_calculated')
  })
})

describe('engine indicator behavior', () => {
  it('marks ownership voting rights not_calculated when proportional inputs are incomplete', () => {
    const input = buildEngineInputs([
      validMetricRow({
        metric_key: 'ownership.voting_rights.black_people.percentage',
        numeric_value: 0.25,
        pillar: 'Ownership',
        source_sheet: 'Ownership',
        value_type: 'percentage',
      }),
    ])
    const result = calculateFullScorecard({ input, engineVersion: 'test-version' })
    const voting = result.pillars
      .find((p) => p.key === 'ownership')
      ?.sections.flatMap((s) => s.indicators)
      .find((i) => i.key === 'ownership.voting_rights')
    expect(voting?.status).toBe('not_calculated')
    expect(voting?.warnings.some((w) => w.includes('Skipped proportional'))).toBe(true)
  })

  it('collects warnings and returns stable top-level shape', () => {
    const result = runFullScorecardEngine([
      validMetricRow({
        metric_key: 'full_scorecard.reference.ownership.available_points',
        numeric_value: 25,
        pillar: 'Full Scorecard Reference',
      }),
    ])

    expect(result).toHaveProperty('engineVersion')
    expect(result).toHaveProperty('overall')
    expect(result.overall.scoreCompleteness).toBe('partial')
    expect(Array.isArray(result.overall.missingPillarsForCompleteScore)).toBe(true)
    expect(result.validationSummary?.elements).toHaveLength(7)
    expect(result.validationSummary?.interpretationHints?.length).toBeGreaterThan(0)
    expect(result).toHaveProperty('pillars')
    expect(result).toHaveProperty('reconciliation')
    expect(result.reconciliation).toHaveProperty('overall')
    expect(result.reconciliation).toHaveProperty('elements')
    expect(Array.isArray(result.warnings)).toBe(true)
    expect(Array.isArray(result.errors)).toBe(true)
    expect(result.warnings.length).toBeGreaterThan(0)
  })
})
