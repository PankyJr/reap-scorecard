import { describe, expect, it } from 'vitest'
import type { ParsedWorkbookResult } from '../../types'
import { extractSedSheetMetrics } from '../sed-sheet'

function workbookWithSed(rows: unknown[][]): ParsedWorkbookResult {
  return {
    filename: 'fixture.xlsx',
    fileSize: 1,
    detectedSheetNames: ['SED'],
    sheets: [
      {
        sheetKey: 'sed',
        sheetName: 'SED',
        rowCount: rows.length,
        columnCount: 6,
        rows,
        cells: {},
        parseWarnings: [],
      },
    ],
  }
}

describe('extractSedSheetMetrics', () => {
  it('matches main compliance row when label text is in column B and A is blank', () => {
    const rows: unknown[][] = [
      ['', '', '', '', null, null],
      ['', '', '', '', null, null],
      ['', 'Socio-economic development as % of NPAT', 0.12, 0.15, 5, null],
    ]
    const { metrics } = extractSedSheetMetrics(workbookWithSed(rows))
    const pct = metrics.find((m) => m.metricKey === 'socio_economic_development.annual_spend.percentage')
    expect(pct?.numericValue).toBe(0.12)
    expect(pct?.sourceCell).toBe('C3')
    expect(pct?.sourceSheet).toBe('SED')
  })

  it('matches SED as percentage of NPAT wording without socio-economic phrase', () => {
    const rows: unknown[][] = [
      ['SED as a percentage of NPAT', 0.08, 0.01, 5, null, null],
    ]
    const { metrics } = extractSedSheetMetrics(workbookWithSed(rows))
    const pct = metrics.find((m) => m.metricKey === 'socio_economic_development.annual_spend.percentage')
    expect(pct?.numericValue).toBe(0.08)
    expect(pct?.sourceCell).toBe('B1')
  })

  it('matches numbered SED sheet tab name', () => {
    const parsed: ParsedWorkbookResult = {
      filename: 'fixture.xlsx',
      fileSize: 1,
      detectedSheetNames: ['6 SED'],
      sheets: [
        {
          sheetKey: 'sed',
          sheetName: '6 SED',
          rowCount: 1,
          columnCount: 5,
          rows: [['SED as % of NPAT', 0.1, 0.05, 5, null]],
          cells: {},
          parseWarnings: [],
        },
      ],
    }
    const { metrics } = extractSedSheetMetrics(parsed)
    expect(metrics.find((m) => m.metricKey === 'socio_economic_development.annual_spend.percentage')?.numericValue).toBe(
      0.1,
    )
  })

  it('extracts target/available/NPAT/donation from real A-E + F/G layout', () => {
    const rows: unknown[][] = [
      ['Measurement Category & Criteria', 'Target', 'Available Points', 'Achieved %', 'Points Achieved'],
      ['Socio-Economic Development'],
      ['Socio-Economic Development support measured a...', 0.01, 5, '', ''],
      ['Total'],
      ['Net Profit Tax', 0],
      ['Socio Economic Development'],
      ['Qualifying Beneficiaries', 'Claimed', 'Recognised Amount', 'Notes'],
      ['', 0, 0, '', '', 'Beneficiaries', 'Total donation for 2024'],
      ['', '', '', '', '', 'Steelpoort Community', 75440],
      ['', '', '', '', '', 'UBJ foundation', 401000],
      ['', '', '', '', '', 'Total', 476440],
    ]
    const { metrics, issues } = extractSedSheetMetrics(workbookWithSed(rows))
    expect(metrics.find((m) => m.metricKey === 'socio_economic_development.annual_spend.target')?.numericValue).toBe(
      0.01,
    )
    expect(
      metrics.find((m) => m.metricKey === 'socio_economic_development.annual_spend.available_points')?.numericValue,
    ).toBe(5)
    const pct = metrics.find((m) => m.metricKey === 'socio_economic_development.annual_spend.percentage')
    expect(pct?.numericValue).toBeNull()
    expect(pct?.validationMessage).toContain('Achieved percentage missing from SED D3')
    expect(metrics.find((m) => m.metricKey === 'socio_economic_development.npat.amount')?.numericValue).toBe(0)
    expect(metrics.find((m) => m.metricKey === 'socio_economic_development.annual_spend.amount')?.numericValue).toBe(
      476440,
    )
    expect(
      issues.some((i) => i.metricKey === 'socio_economic_development.annual_spend.percentage'),
    ).toBe(true)
  })
})
