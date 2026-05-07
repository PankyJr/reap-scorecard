import { describe, expect, it } from 'vitest'
import type { ParsedWorkbookResult } from '../../types'
import { extractSkillsDevelopmentSheetMetrics } from '../skills-development-sheets'

function workbookWithSheets(sheets: Array<{ name: string; rows: unknown[][] }>): ParsedWorkbookResult {
  return {
    filename: 'fixture.xlsx',
    fileSize: 1,
    detectedSheetNames: sheets.map((s) => s.name),
    sheets: sheets.map((s) => ({
      sheetKey: s.name.toLowerCase().replace(/\s+/g, '_'),
      sheetName: s.name,
      rowCount: s.rows.length,
      columnCount: 16,
      rows: s.rows,
      cells: {},
      parseWarnings: [],
    })),
  }
}

describe('skills development real layout extraction', () => {
  it('maps top skills scoring rows without false extraction from lower calculation blocks', () => {
    const parsed = workbookWithSheets([
      {
        name: 'Skills Development ',
        rows: [
          ['Measurement Category & Criteria', 'Target', 'Available Points', 'Achieved %', 'Points Achieved'],
          ['Training Expenditure for black people', 0.06, 8, '', ''],
          ['Number of black people participating in learnerships', 0.025, 4, '', ''],
          ['Training for Black People with Disabilities', 0.003, 4, '', ''],
          ['Total', '', 20, '', ''],
          ['Black People Expenditure'],
          ['Total points awarded'],
        ],
      },
    ])
    const { metrics } = extractSkillsDevelopmentSheetMetrics(parsed)
    expect(metrics.find((m) => m.metricKey === 'skills_development.expenditure.black_people.target')?.numericValue).toBe(
      0.06,
    )
    expect(
      metrics.find((m) => m.metricKey === 'skills_development.expenditure.black_people.available_points')?.numericValue,
    ).toBe(8)
    expect(
      metrics.find((m) => m.metricKey === 'skills_development.expenditure.disabled_black_people.target')?.numericValue,
    ).toBe(0.003)
    expect(metrics.find((m) => m.metricKey === 'skills_development.total.available_points')?.numericValue).toBe(20)
  })

  it('does not extract learnership rows from interns roster-only sheet', () => {
    const parsed = workbookWithSheets([
      {
        name: 'Interns & Learners ',
        rows: [
          ['Delegate name', 'Surname', 'Race', 'Gender'],
          ['Edward Sample', '', 'Coloured', 'Male'],
        ],
      },
    ])
    const { metrics } = extractSkillsDevelopmentSheetMetrics(parsed)
    expect(metrics.some((m) => m.metricKey.startsWith('skills_development.learnerships.'))).toBe(false)
  })

  it('extracts leviable amount from EMP201 Leviable Amount row', () => {
    const parsed = workbookWithSheets([
      {
        name: '13 EMP201',
        rows: [
          ['Total', 0],
          ['Leviable Amount', 0],
        ],
      },
    ])
    const { metrics } = extractSkillsDevelopmentSheetMetrics(parsed)
    expect(metrics.find((m) => m.metricKey === 'skills_development.leviable_amount')?.numericValue).toBe(0)
  })
})
