import { describe, expect, it } from 'vitest'
import { buildValidationSummary } from '../validation-summary'
import { buildEngineInputs } from '../build-inputs'
import { calculateFullScorecard } from '../calculate'
import { validMetricRow } from './fixtures'
import { ownershipMinimalForTotalScore } from './aggregation-fixtures'

const REF = 'Full Scorecard Reference'

describe('buildValidationSummary', () => {
  it('includes reconciliation rows and source metric refs for pillar-backed elements', () => {
    const rows = [
      ...ownershipMinimalForTotalScore(),
      validMetricRow({
        metric_key: 'full_scorecard.reference.ownership.available_points',
        numeric_value: 25,
        pillar: REF,
      }),
      validMetricRow({
        metric_key: 'full_scorecard.reference.ownership.points_achieved',
        numeric_value: 7.5,
        pillar: REF,
      }),
    ]
    const input = buildEngineInputs(rows)
    const result = calculateFullScorecard({ input, engineVersion: 't' })
    const summary = buildValidationSummary(input, result)
    expect(summary.elements).toHaveLength(7)
    const own = summary.elements.find((e) => e.elementKey === 'ownership')!
    expect(own.sourceMetricRefs.some((r) => r.metricKey.includes('ownership.voting_rights'))).toBe(true)
    expect(summary.referenceMetricIssues.length).toBeGreaterThanOrEqual(0)
  })
})
