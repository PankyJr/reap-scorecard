import { describe, expect, it } from 'vitest'
import type { ParsedWorkbookResult } from '../../types'
import { extractManagementControlSheetMetrics } from '../management-control-sheets'

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

describe('management control real layout extraction', () => {
  it('maps target/available from Management Control summary rows', () => {
    const parsed = workbookWithSheets([
      {
        name: 'Management Control',
        rows: [
          ['Measurement Category & Criteria', 'Amended Codes Scorecard', 'Target Points', 'Achieved %', 'Points Awarded'],
          ['excercisable voting rights of black board members', 0.5, 2, '', ''],
          ['excercisable voting rights of black female board members', 0.25, 1, '', ''],
          ['Black Executive Directors as a % of all executive directors', 0.5, 2, '', ''],
          ['Black female Executive Directors as a % of all executive directors', 0.25, 1, '', ''],
          ['Black other Executive Managers as a % of all Executive Managers', 0.6, 4, '', ''],
          ['Black Female other Executive Managers as a % of all Executive Managers', 0.3, 4, '', ''],
          ['Total', '', 14, '', ''],
        ],
      },
    ])
    const { metrics } = extractManagementControlSheetMetrics(parsed)
    expect(metrics.find((m) => m.metricKey === 'management_control.board.black_people.target')?.numericValue).toBe(0.5)
    expect(metrics.find((m) => m.metricKey === 'management_control.board.black_people.available_points')?.numericValue).toBe(2)
    expect(metrics.find((m) => m.metricKey === 'management_control.executive_directors.black_people.target')?.numericValue).toBe(
      0.5,
    )
    expect(
      metrics.find((m) => m.metricKey === 'management_control.other_executive_management.black_women.available_points')
        ?.numericValue,
    ).toBe(4)
    expect(metrics.find((m) => m.metricKey === 'management_control.total.available_points')?.numericValue).toBe(14)
  })

  it('does not emit board metrics from roster-only board sheet rows', () => {
    const parsed = workbookWithSheets([
      {
        name: '3 Board Members ',
        rows: [
          ['Board Member Name and Surname', 'Executive / Non Executive', 'Gender', 'Race'],
          ['Skhumbuzo Sample', 'Executive', 'Male', 'African'],
        ],
      },
    ])
    const { metrics } = extractManagementControlSheetMetrics(parsed)
    expect(metrics.some((m) => m.metricKey.startsWith('management_control.board.'))).toBe(false)
  })

  it('extracts employment equity targets/available for senior and disability rows', () => {
    const parsed = workbookWithSheets([
      {
        name: 'Employment Equity',
        rows: [
          ['Measurement Category & Criteria', 'Target', 'Available Points', 'Achieved %', 'Points Achieved'],
          ['Senior Management'],
          ['composition of Black employees in Senior Management', 0.6, 2, '', ''],
          ['composition of Black Female employees in Senior Management', 0.3, 1, '', ''],
          ['Employees With Disabilities'],
          ['Black employees with disabilities as a % of all employees', 0.02, 2, '', ''],
        ],
      },
    ])
    const { metrics } = extractManagementControlSheetMetrics(parsed)
    expect(metrics.find((m) => m.metricKey === 'management_control.senior_management.black_people.target')?.numericValue).toBe(
      0.6,
    )
    expect(
      metrics.find((m) => m.metricKey === 'management_control.senior_management.black_women.available_points')
        ?.numericValue,
    ).toBe(1)
    expect(
      metrics.find((m) => m.metricKey === 'management_control.employees_with_disabilities.black_people.target')
        ?.numericValue,
    ).toBe(0.02)
  })
})
