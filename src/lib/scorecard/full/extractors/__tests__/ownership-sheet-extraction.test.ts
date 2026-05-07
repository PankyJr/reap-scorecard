import { describe, expect, it } from 'vitest'
import type { ParsedWorkbookResult } from '../../types'
import { extractOwnershipSheetMetrics } from '../ownership-sheet'

function workbookWithOwnership(rows: unknown[][]): ParsedWorkbookResult {
  return {
    filename: 'fixture.xlsx',
    fileSize: 1,
    detectedSheetNames: ['Ownership'],
    sheets: [
      {
        sheetKey: 'ownership',
        sheetName: 'Ownership',
        rowCount: rows.length,
        columnCount: 6,
        rows,
        cells: {},
        parseWarnings: [],
      },
    ],
  }
}

describe('extractOwnershipSheetMetrics (generic layout)', () => {
  it('detects Voting Rights header in column B when column A is blank (merged title)', () => {
    const rows: unknown[][] = [
      ['', 'Exercisable Voting Rights', '', '', null, null],
      ['Black people', 0.25, 0.5, 4, null, null],
      ['Black women', 0.1, 0.2, 4, null, null],
      ['', 'Economic Interest', '', '', null, null],
      ['Black South Africans', 0.3, 0.6, 2, null, null],
      ['Black women', 0.05, 0.1, 1, null, null],
      ['Designated groups', 0.02, 0.04, 1, null, null],
      ['', 'Net Value', '', '', null, null],
      ['Net value', 0.15, 0.3, 3, null, null],
      ['Total ownership available points', null, null, 25, null, null],
    ]
    const { metrics, issues } = extractOwnershipSheetMetrics(workbookWithOwnership(rows))
    const keys = new Set(metrics.map((m) => m.metricKey))
    expect(keys.has('ownership.voting_rights.black_people.percentage')).toBe(true)
    expect(keys.has('ownership.economic_interest.black_people.percentage')).toBe(true)
    expect(metrics.find((m) => m.metricKey === 'ownership.voting_rights.black_people.percentage')?.sourceCell).toBe(
      'B2',
    )
    expect(metrics.find((m) => m.metricKey === 'ownership.voting_rights.black_people.percentage')?.sourceSheet).toBe(
      'Ownership',
    )
    expect(
      issues.some((i) => i.message.includes('Voting Rights section header') && i.message.includes('skipped')),
    ).toBe(false)
  })

  it('detects Voting power header variant', () => {
    const rows: unknown[][] = [
      ['', 'Voting power', '', '', null, null],
      ['Black people', 0.2, 0.4, 4, null, null],
      ['Black women', 0.1, 0.2, 4, null, null],
      ['', 'Economic interest', '', '', null, null],
      ['Black people', 0.1, 0.2, 1, null, null],
      ['Net value', '', '', '', null, null],
      ['Net value', 0.1, 0.2, 3, null, null],
      ['Total ownership available points', null, null, 25, null, null],
    ]
    const base = workbookWithOwnership(rows)
    const wb: ParsedWorkbookResult = {
      ...base,
      detectedSheetNames: ['5 Ownership'],
      sheets: [{ ...base.sheets[0], sheetName: '5 Ownership' }],
    }
    const { metrics, issues } = extractOwnershipSheetMetrics(wb)
    expect(issues.some((i) => i.message.includes('Voting Rights') && i.message.includes('skipped'))).toBe(false)
    expect(metrics.find((m) => m.metricKey === 'ownership.voting_rights.black_people.percentage')?.numericValue).toBe(
      0.2,
    )
  })

  it('matches Black South Africans under voting rights', () => {
    const rows: unknown[][] = [
      ['Voting rights', '', '', '', null, null],
      ['Black South Africans', 0.2, 0.4, 4, null, null],
      ['Black women', 0.1, 0.2, 4, null, null],
      ['Economic interest', '', '', '', null, null],
      ['Black people', 0.1, 0.2, 1, null, null],
      ['Black women', 0.05, 0.1, 1, null, null],
      ['Designated groups', 0.01, 0.02, 1, null, null],
      ['Net value', '', '', '', null, null],
      ['New entrant', 0.1, 0.2, 3, null, null],
      ['Total available ownership points', null, null, 25, null, null],
    ]
    const { metrics } = extractOwnershipSheetMetrics(workbookWithOwnership(rows))
    const bp = metrics.find((m) => m.metricKey === 'ownership.voting_rights.black_people.percentage')
    expect(bp?.numericValue).toBe(0.2)
  })

  it('extracts deterministic A-E ownership workbook layout by row order', () => {
    const rows: unknown[][] = [
      ['Indicator', 'Weighting points', 'Targets', 'Verified level', 'Entity score'],
      ['Black people', 4, '25% + 1', 0, 0],
      ['Black women', 2, 0.1, 0, 0],
      ['Black people', 4, 0.25, 0, 0],
      ['Black women', 2, 0.1, 0, 0],
      ['ESOP,Black designed groups,B-BEE Schemes', 3, 0.03, 0, 0],
      ['New entrants', 2, 0.02, 0, 0],
      ['Net value', 8, 0.25, 0, 0],
      ['', 25, '', '', 0],
    ]
    const { metrics } = extractOwnershipSheetMetrics(workbookWithOwnership(rows))
    expect(metrics.find((m) => m.metricKey === 'ownership.voting_rights.black_people.percentage')?.numericValue).toBe(
      0,
    )
    expect(metrics.find((m) => m.metricKey === 'ownership.voting_rights.black_people.target')?.numericValue).toBe(
      0.2501,
    )
    expect(
      metrics.find((m) => m.metricKey === 'ownership.economic_interest.designated_groups.available_points')
        ?.numericValue,
    ).toBe(3)
    expect(metrics.find((m) => m.metricKey === 'ownership.net_value.available_points')?.numericValue).toBe(8)
    expect(metrics.find((m) => m.metricKey === 'ownership.total.available_points')?.numericValue).toBe(25)
  })
})
