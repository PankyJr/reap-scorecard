import { describe, expect, it } from 'vitest'
import {
  countEngineWarningStrings,
  countIndicatorsByStatus,
  countIndicatorsInPillar,
  formatScorecardNumber,
  indicatorActionRequired,
  indicatorStatusPresentation,
} from '../full-scorecard-detail-present'

describe('full-scorecard-detail-present', () => {
  it('indicatorActionRequired returns Ready for clean calculated row', () => {
    expect(
      indicatorActionRequired({ status: 'calculated', warnings: [], missingMetricKeys: [] }),
    ).toBe('Ready')
  })

  it('indicatorActionRequired detects ambiguous wording', () => {
    expect(
      indicatorActionRequired({
        status: 'not_calculated',
        warnings: ['Ambiguous row match for foo'],
        missingMetricKeys: [],
      }),
    ).toBe('Ambiguous workbook rows')
  })

  it('indicatorActionRequired detects Excel errors in warnings', () => {
    expect(
      indicatorActionRequired({
        status: 'not_calculated',
        warnings: ['Excel error in cell'],
        missingMetricKeys: [],
      }),
    ).toBe('Formula/error cells')
  })

  it('formatScorecardNumber uses Pending for null', () => {
    expect(formatScorecardNumber(null)).toBe('Pending')
    expect(formatScorecardNumber(undefined)).toBe('Pending')
    expect(formatScorecardNumber(12)).toBe('12')
  })

  it('indicatorStatusPresentation returns Pending for not_calculated', () => {
    expect(
      indicatorStatusPresentation({
        status: 'not_calculated',
        warnings: [],
        missingMetricKeys: [],
      }).label,
    ).toBe('Pending')
  })

  it('countIndicatorsByStatus sums indicator rows', () => {
    const pillars = [
      {
        sections: [
          {
            indicators: [{ status: 'calculated' }, { status: 'not_calculated' }],
          },
        ],
      },
    ]
    expect(countIndicatorsByStatus(pillars)).toEqual({ calculated: 1, notCalculated: 1 })
  })

  it('countIndicatorsInPillar counts within one pillar', () => {
    const pillar = {
      sections: [{ indicators: [{ status: 'calculated' }, { status: 'calculated' }] }],
    }
    expect(countIndicatorsInPillar(pillar)).toEqual({ calculated: 2, total: 2 })
  })

  it('countEngineWarningStrings includes top-level and nested warnings', () => {
    const pillars = [
      {
        warnings: ['a'],
        sections: [{ indicators: [{ warnings: ['b', 'c'] }] }],
      },
    ]
    expect(countEngineWarningStrings(pillars, [{ message: 'x' }])).toBe(4)
  })
})
