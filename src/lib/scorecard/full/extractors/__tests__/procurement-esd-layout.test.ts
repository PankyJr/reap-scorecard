import { describe, expect, it } from 'vitest'
import type { ParsedWorkbookResult } from '../../types'
import { extractProcurementSheetPreferentialMetrics } from '../procurement-sheet'
import { extractEnterpriseDevelopmentSheetMetrics } from '../enterprise-development-sheet'
import { extractSupplierDevelopmentSheetMetrics } from '../supplier-development-sheet'
import { extractTmpsSheetPreferentialMetrics } from '../tmps-sheet'

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

describe('procurement/esd real layout extraction', () => {
  it('maps procurement A-E layout and derives achieved % from points achieved', () => {
    const parsed = workbookWithSheets([
      {
        name: 'Procurement ',
        rows: [
          ['Preferential Procurement'],
          ['Measurement Category & Criteria', 'Target', 'Available Points', 'Achieved %', 'Points Achieved'],
          ['All B-BBEE Suppliers', 0.8, 5, '', 5],
          ['From all QSEs', 0.15, 3, '', 0.5],
          ['From all EMEs', 0.15, 4, '', 0.5],
          ['Spend with atleast 51% Black Owned supplier', 0.5, 11, '', 1],
          ['spend with atleast 30% Black women owned suppliers', 0.12, 4, '', 4],
          ['Spend with atleast 51% black designated groups suppliers', 0.02, 2, '', 2],
          ['Total ', '', 27, '', ''],
        ],
      },
    ])
    const { metrics } = extractProcurementSheetPreferentialMetrics(parsed)
    expect(metrics.find((m) => m.metricKey === 'preferential_procurement.b_bbee_procurement_spend.target')?.numericValue).toBe(
      0.8,
    )
    expect(
      metrics.find((m) => m.metricKey === 'preferential_procurement.b_bbee_procurement_spend.available_points')
        ?.numericValue,
    ).toBe(5)
    expect(
      metrics.find((m) => m.metricKey === 'preferential_procurement.b_bbee_procurement_spend.percentage')?.numericValue,
    ).toBe(0.8)
    expect(metrics.find((m) => m.metricKey === 'preferential_procurement.qse_eme_procurement.available_points')?.numericValue).toBe(
      7,
    )
    expect(metrics.find((m) => m.metricKey === 'preferential_procurement.total.available_points')?.numericValue).toBe(27)
  })

  it('maps ED and SD annual rows from ED & SD target/available columns', () => {
    const parsed = workbookWithSheets([
      {
        name: 'ED & SD',
        rows: [
          ['Measurement Category & Criteria', 'Target', 'Available Points', 'Achieved %', 'Points Achieved'],
          ['Enterprise Development'],
          ['Enterprise Development support in line with annual target', 0.01, 5, '', ''],
          ['Supplier Management'],
          ['Supplier Management support for Qualifying contributions', 0.02, 10, '', ''],
        ],
      },
    ])
    const ed = extractEnterpriseDevelopmentSheetMetrics(parsed)
    expect(ed.metrics.find((m) => m.metricKey === 'enterprise_development.annual_value.target')?.numericValue).toBe(0.01)
    expect(ed.metrics.find((m) => m.metricKey === 'enterprise_development.annual_value.available_points')?.numericValue).toBe(5)
    const sd = extractSupplierDevelopmentSheetMetrics(parsed)
    expect(sd.metrics.find((m) => m.metricKey === 'supplier_development.annual_value.target')?.numericValue).toBe(0.02)
    expect(sd.metrics.find((m) => m.metricKey === 'supplier_development.annual_value.available_points')?.numericValue).toBe(10)
  })

  it('extracts TMPS total measured spend row', () => {
    const parsed = workbookWithSheets([
      {
        name: 'TMPS',
        rows: [
          ['TMPS'],
          ['Total Measured Procurement Spend', 123456],
        ],
      },
    ])
    const { metrics } = extractTmpsSheetPreferentialMetrics(parsed)
    expect(
      metrics.find((m) => m.metricKey === 'preferential_procurement.total_measured_procurement_spend.amount')
        ?.numericValue,
    ).toBe(123456)
  })
})
