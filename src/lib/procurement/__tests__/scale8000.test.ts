import { describe, expect, it } from 'vitest'
import { buildSuppliersFromMappedSheet } from '../excel/buildSuppliers'
import { buildProcurementColumnAutoMap } from '../excel/detect'
import type { ProcurementExcelCell } from '../excel/types'
import { aggregateCategoryTotals, calculateProcurementResults } from '../assessment'
import { calculateSupplierRow } from '../rows'
import { summariseProcurementScore } from '../scoreSummary'
import { analyseNeedsAttention } from '../needsAttention'

const HEADERS = [
  'Supplier name',
  'Amount spent ex VAT (ZAR)',
  'B-BBEE level',
  'Certificate expiry date',
  'Black owned %',
  'Black women owned %',
  '51% black designated group (yes/no)',
  'Supplier type (EME, QSE or Generic)',
  '51% flow-through (yes/no)',
  'VAT number',
  'Company registration number',
]

function syntheticSheet(count: number): ProcurementExcelCell[][] {
  const rows: ProcurementExcelCell[][] = []
  for (let i = 0; i < count; i++) {
    rows.push([
      `Synthetic Supplier ${i} (Pty) Ltd`,
      1000 + ((i * 7919) % 250_000),
      i % 13 === 0 ? '' : `Level ${(i % 8) + 1}`,
      i % 9 === 0 ? '2025-06-30' : '2027-06-30',
      (i * 37) % 101,
      (i * 53) % 101,
      i % 17 === 0 ? 'yes' : 'no',
      ['EME', 'QSE', 'Generic'][i % 3],
      i % 23 === 0 ? 'yes' : 'no',
      `4${String(100_000_000 + i)}`,
      `2010/${String(100_000 + i)}/07`,
    ])
  }
  return rows
}

describe('8,000 suppliers', () => {
  it('build, score, summarise and check in well under a second', () => {
    const dataRows = syntheticSheet(8000)
    const mapping = Object.fromEntries(buildProcurementColumnAutoMap(HEADERS))

    const started = performance.now()
    const built = buildSuppliersFromMappedSheet({ headers: HEADERS, dataRows, mapping, keepProblemsForReview: true })
    const calculated = built.suppliers.map(calculateSupplierRow)
    const totals = aggregateCategoryTotals(calculated)
    const tmps = calculated.reduce((sum, row) => sum + row.value_ex_vat, 0)
    const result = calculateProcurementResults({ totals, totalMeasuredSpend: tmps })
    const summary = summariseProcurementScore(result)
    const attention = analyseNeedsAttention(
      built.suppliers.map((s, i) => ({ ...s, id: String(i) })),
      { referenceDate: '2026-10-06', totalMeasuredSpend: tmps },
    )
    const elapsed = performance.now() - started

    console.info(`[scale] 8,000 suppliers built, scored and checked in ${elapsed.toFixed(1)} ms`)
    expect(built.suppliers).toHaveLength(8000)
    expect(result.categories).toHaveLength(6)
    expect(summary.basePoints).toBeGreaterThan(0)
    expect(summary.basePoints).toBeLessThanOrEqual(25)
    // Every 13th supplier has no level; every 9th has a certificate that expired in 2025.
    expect(attention.missingLevel).toHaveLength(Math.ceil(8000 / 13))
    expect(attention.expired.length).toBeGreaterThan(0)
    expect(attention.duplicates).toHaveLength(0)
    expect(elapsed).toBeLessThan(1000)
  })
})
