import { describe, expect, it } from 'vitest'
import type { ParsedWorkbookResult } from '../../types'
import { extractFullScorecardReference } from '../../extractors/full-scorecard-reference'

function workbookWithFullScorecardSheet(rows: unknown[][]): ParsedWorkbookResult {
  return {
    filename: 'fixture.xlsx',
    fileSize: 1,
    detectedSheetNames: ['Full Scorecard'],
    sheets: [
      {
        sheetKey: 'full_scorecard',
        sheetName: 'Full Scorecard',
        rowCount: rows.length,
        columnCount: 5,
        rows,
        cells: {},
        parseWarnings: [],
      },
    ],
  }
}

describe('Full Scorecard reference extraction (Phase 4K)', () => {
  it('prefers exact "ownership" row when another row also matches ownership+available', () => {
    const rows: unknown[][] = [
      ['Ownership', 25, 20, 25, null],
      ['Ownership available breakdown', 1, 0, 1, null],
      ['Final score', 100, 100, 100, null],
    ]
    const { metrics } = extractFullScorecardReference(workbookWithFullScorecardSheet(rows))
    const ach = metrics.find((m) => m.metricKey === 'full_scorecard.reference.ownership.points_achieved')
    expect(ach?.numericValue).toBe(20)
    expect(ach?.sourceCell).toBe('C1')
  })

  it('does not match skills_development reference on lines that include preferential procurement wording', () => {
    const rows: unknown[][] = [
      ['Preferential procurement skills development available', 1, 0, 1, null],
      ['Skills development', 25, 10, 25, null],
    ]
    const { metrics } = extractFullScorecardReference(workbookWithFullScorecardSheet(rows))
    const hits = metrics.filter((m) => m.metricKey.startsWith('full_scorecard.reference.skills_development'))
    expect(hits.find((m) => m.metricKey.endsWith('points_achieved'))?.numericValue).toBe(10)
  })

  it('extracts final_score from Total generic B-BBEE score style label', () => {
    const rows: unknown[][] = [['Total generic B-BBEE score', 88.5, null, null, null]]
    const { metrics } = extractFullScorecardReference(workbookWithFullScorecardSheet(rows))
    const fs = metrics.find((m) => m.metricKey === 'full_scorecard.reference.final_score')
    expect(fs?.numericValue).toBe(88.5)
    expect(fs?.sourceCell).toBe('B1')
  })

  it('extracts final_score from column C when B is empty', () => {
    const rows: unknown[][] = [['Final score', null, 101.2, null, null]]
    const { metrics } = extractFullScorecardReference(workbookWithFullScorecardSheet(rows))
    const fs = metrics.find((m) => m.metricKey === 'full_scorecard.reference.final_score')
    expect(fs?.numericValue).toBe(101.2)
    expect(fs?.sourceCell).toBe('C1')
  })

  it('resolves Full Scorecard sheet when tab has numeric prefix', () => {
    const parsed: ParsedWorkbookResult = {
      filename: 'fixture.xlsx',
      fileSize: 1,
      detectedSheetNames: ['8 Full Scorecard'],
      sheets: [
        {
          sheetKey: 'full_scorecard',
          sheetName: '8 Full Scorecard',
          rowCount: 1,
          columnCount: 5,
          rows: [['Final score', 77, null, null, null]],
          cells: {},
          parseWarnings: [],
        },
      ],
    }
    const { metrics } = extractFullScorecardReference(parsed)
    expect(metrics.find((m) => m.metricKey === 'full_scorecard.reference.final_score')?.numericValue).toBe(77)
  })

  it('matches preferential procurement summary row with two-token label', () => {
    const rows: unknown[][] = [
      ['Preferential Procurement', 25, 18, 25, null],
      ['Enterprise development', 5, 2, 5, null],
    ]
    const { metrics } = extractFullScorecardReference(workbookWithFullScorecardSheet(rows))
    const ach = metrics.find((m) => m.metricKey === 'full_scorecard.reference.preferential_procurement.points_achieved')
    expect(ach?.numericValue).toBe(18)
    expect(ach?.sourceCell).toBe('C1')
  })

  it('surfaces candidate row labels when element reference rows are ambiguous', () => {
    const rows: unknown[][] = [
      ['Skills development', 25, 10, 25, null],
      ['Skills development', 25, 11, 25, null],
    ]
    const { metrics, issues } = extractFullScorecardReference(workbookWithFullScorecardSheet(rows))
    const ach = metrics.find((m) => m.metricKey === 'full_scorecard.reference.skills_development.points_achieved')
    expect(ach?.validationState).toBe('warning')
    expect(ach?.validationMessage?.toLowerCase()).toContain('ambiguous')
    expect(ach?.validationMessage).toContain('row 1')
    expect(issues.some((i) => i.message.includes('row 1'))).toBe(true)
  })

  it('extracts reference values from right-side element summary table', () => {
    const row16: unknown[] = Array(16).fill(null)
    row16[9] = 'Element'
    row16[10] = 'Available Points'
    row16[11] = 'Possible Points 1'
    row16[12] = 'Possible Points 2'

    const row17: unknown[] = Array(16).fill(null)
    row17[9] = 'Ownership'
    row17[10] = 25
    row17[11] = 25
    row17[12] = 25

    const row24: unknown[] = Array(16).fill(null)
    row24[9] = 'Total'
    row24[10] = 111
    row24[11] = 90.16
    row24[12] = 97.16

    const rows: unknown[][] = [row16, row17, row24]
    const { metrics } = extractFullScorecardReference(workbookWithFullScorecardSheet(rows))
    expect(metrics.find((m) => m.metricKey === 'full_scorecard.reference.ownership.available_points')?.numericValue).toBe(
      25,
    )
    expect(metrics.find((m) => m.metricKey === 'full_scorecard.reference.final_score')?.numericValue).toBe(90.16)
  })
})
