import * as fs from 'node:fs'
import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { packSparseDataRowToHeaderColumns } from '../alignProcurementDataRow'
import { buildSuppliersFromMappedSheet, isLikelyProcurementCategoryRowLabel, isLikelyProcurementScorecardSectionOrHeaderRowLabel } from '../buildSuppliers'
import { readSheetDenseAoAWithMerges } from '../denseSheetAoA'
import { parseSpend } from '../parseSpend'
import { parseProcurementExcelBuffer } from '../parseProcurementWorkbook'
import { tryDetectTmpsTotalFromRows } from '../tmpsDetection'
import { aggregateCategoryTotals, calculateProcurementResults } from '@/lib/procurement/assessment'
import { calculateSupplierRow } from '@/lib/procurement/rows'

function buildWorkbookBuffer(sheetName: string, aoa: (string | number | null)[][]) {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

function buildWorkbookMulti(
  sheets: { name: string; aoa: (string | number | null)[][] }[],
) {
  const wb = XLSX.utils.book_new()
  for (const { name, aoa } of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    XLSX.utils.book_append_sheet(wb, ws, name)
  }
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

describe('tryDetectTmpsTotalFromRows', () => {
  it('reads total measured procurement spend when present', () => {
    const rows: unknown[][] = [
      ['Note', 'x'],
      ['Total measured procurement spend', '', 521_001.25],
    ]
    expect(tryDetectTmpsTotalFromRows(rows)).toBeCloseTo(521_001.25)
  })

  it('does not treat bare TMPS label with 23 as monetary TMPS', () => {
    const rows: unknown[][] = [['TMPS', 23]]
    expect(tryDetectTmpsTotalFromRows(rows)).toBeNull()
  })

  it('does not pick up 23 / 29 from points-style rows', () => {
    const rows: unknown[][] = [
      ['Target', 'Available Points', 'Achieved %', 'Points Achieved'],
      ['All suppliers', 29, '80%', 23],
      ['Total measured procurement spend', '', 900_000],
    ]
    expect(tryDetectTmpsTotalFromRows(rows)).toBe(900_000)
  })

  it('returns null for total measured procurement label with false-positive 23', () => {
    const rows: unknown[][] = [['Total measured procurement spend', 23]]
    expect(tryDetectTmpsTotalFromRows(rows)).toBeNull()
  })
})

describe('buildSuppliersFromMappedSheet emptyImportKind', () => {
  it('marks category-only rows as category_template', () => {
    const built = buildSuppliersFromMappedSheet({
      headers: ['Vendor', 'ZAR'],
      dataRows: [
        ['All B-BBEE Suppliers', 1_000_000],
        ['From all QSEs', 400_000],
      ],
      mapping: { supplier_name: 'Vendor', spend_amount: 'ZAR' },
    })
    expect(built.suppliers).toHaveLength(0)
    expect(built.emptyImportKind).toBe('category_template')
    expect(built.issues[0]?.level).toBe('info')
  })

  it('marks header-only (no data rows) as header_only', () => {
    const built = buildSuppliersFromMappedSheet({
      headers: ['Vendor', 'ZAR'],
      dataRows: [],
      mapping: { supplier_name: 'Vendor', spend_amount: 'ZAR' },
    })
    expect(built.emptyImportKind).toBe('header_only')
  })
})

describe('packSparseDataRowToHeaderColumns', () => {
  it('maps left-to-right non-empty cells onto non-empty header columns', () => {
    const headers = ['Vendor', '', '', 'ZAR']
    const packed = packSparseDataRowToHeaderColumns(['Acme', 5000], headers)
    expect(packed).toHaveLength(4)
    expect(packed[0]).toBe('Acme')
    expect(packed[1]).toBeNull()
    expect(packed[2]).toBeNull()
    expect(packed[3]).toBe(5000)
  })

  it('leaves rows unchanged when non-empty counts differ', () => {
    const headers = ['Vendor', 'ZAR', 'ES']
    const raw = ['A', 'B']
    expect(packSparseDataRowToHeaderColumns(raw, headers)).toBe(raw)
  })
})

describe('parseSpend', () => {
  it('accepts ZAR / locale currency strings and wrapped cell values', () => {
    expect(parseSpend(125_000)).toBe(125_000)
    expect(parseSpend('125,000')).toBe(125_000)
    expect(parseSpend('125,000.50')).toBe(125_000.5)
    expect(parseSpend('R125,000')).toBe(125_000)
    expect(parseSpend('R 125 000.00')).toBe(125_000)
    expect(parseSpend('ZAR 1 234.5')).toBe(1234.5)
    expect(parseSpend('(1000)')).toBe(-1000)
    expect(parseSpend({ v: 45_000 } as unknown)).toBe(45_000)
    expect(parseSpend('1.234,56')).toBe(1234.56)
  })

  it('imports rows when ZAR is a formatted string', () => {
    const built = buildSuppliersFromMappedSheet({
      headers: ['Vendor', 'ZAR'],
      dataRows: [
        ['Acme Ltd', 'R 12 500,50'],
        ['Beta', '1,000.00'],
      ],
      mapping: { supplier_name: 'Vendor', spend_amount: 'ZAR' },
    })
    expect(built.suppliers).toHaveLength(2)
    expect(built.suppliers[0].value_ex_vat).toBe(12_500.5)
    expect(built.suppliers[1].value_ex_vat).toBe(1000)
  })

  it('does not skip legitimate vendors whose name starts with Total', () => {
    const built = buildSuppliersFromMappedSheet({
      headers: ['Vendor', 'ZAR'],
      dataRows: [['Total Solutions (Pty) Ltd', 7500]],
      mapping: { supplier_name: 'Vendor', spend_amount: 'ZAR' },
    })
    expect(built.suppliers).toHaveLength(1)
    expect(built.suppliers[0].supplier_name).toBe('Total Solutions (Pty) Ltd')
  })

  it('still skips obvious aggregate labels like Total Procurement', () => {
    const built = buildSuppliersFromMappedSheet({
      headers: ['Vendor', 'ZAR'],
      dataRows: [['Total procurement', 99_000]],
      mapping: { supplier_name: 'Vendor', spend_amount: 'ZAR' },
    })
    expect(built.suppliers).toHaveLength(0)
  })

  it('skips rows with negative parsed spend', () => {
    const built = buildSuppliersFromMappedSheet({
      headers: ['Vendor', 'ZAR'],
      dataRows: [['X', '(1000)']],
      mapping: { supplier_name: 'Vendor', spend_amount: 'ZAR' },
    })
    expect(built.suppliers).toHaveLength(0)
  })
})

describe('parseProcurementExcelBuffer', () => {
  it('detects Procurement sheet by name and maps supplier + spend', () => {
    const buf = buildWorkbookBuffer('Procurement', [
      ['Supplier Name', 'Invoice Value', 'BEE Level', 'Black Owned %'],
      ['Acme Ltd', 10000, 'Level 4', '60%'],
      ['Beta Pty', 5000, '2', '40%'],
    ])
    const res = parseProcurementExcelBuffer({
      buffer: buf,
      filename: 'client.xlsx',
    })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.selectedSheetName).toBe('Procurement')
    expect(res.detectionMethod).toBe('exact_sheet_name')
    expect(res.supplierImportBlockedReason).toBeUndefined()
    expect(res.columnHeaders[0]).toContain('Supplier')
    const built = buildSuppliersFromMappedSheet({
      headers: res.columnHeaders,
      dataRows: res.dataRows,
      mapping: res.autoMapping,
    })
    expect(built.suppliers).toHaveLength(2)
    expect(built.suppliers[0].supplier_name).toBe('Acme Ltd')
    expect(built.suppliers[0].value_ex_vat).toBe(10000)
    expect(built.suppliers[0].level).toBe('4')
    expect(built.suppliers[0].is_51_black_owned).toBe(true)
  })

  it('prefers Procurement over TMPS when TMPS is listed first in the workbook', () => {
    const buf = buildWorkbookMulti([
      {
        name: 'TMPS',
        aoa: [
          ['Line item', 'Amount'],
          ['Opening inventory', 1000],
          ['Employee costs', 200],
        ],
      },
      {
        name: 'Procurement',
        aoa: [
          ['Supplier Name', 'Procurement Spend'],
          ['Vendor A', 500],
          ['Vendor B', 300],
        ],
      },
    ])
    const res = parseProcurementExcelBuffer({ buffer: buf, filename: 'mixed.xlsx' })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.selectedSheetName).toBe('Procurement')
    expect(res.supplierImportBlockedReason).toBeUndefined()
    const built = buildSuppliersFromMappedSheet({
      headers: res.columnHeaders,
      dataRows: res.dataRows,
      mapping: res.autoMapping,
    })
    expect(built.suppliers.length).toBeGreaterThanOrEqual(2)
  })

  it('uses preferred_sheet to read a specific tab', () => {
    const buf = buildWorkbookMulti([
      {
        name: 'TMPS',
        aoa: [
          ['Supplier Name', 'Procurement Spend'],
          ['Only Here', 999],
        ],
      },
      {
        name: 'Other',
        aoa: [['x', 'y']],
      },
    ])
    const res = parseProcurementExcelBuffer({
      buffer: buf,
      filename: 'pref.xlsx',
      preferredSheet: 'TMPS',
    })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.selectedSheetName).toBe('TMPS')
    expect(res.detectionMethod).toBe('manual_sheet')
    const built = buildSuppliersFromMappedSheet({
      headers: res.columnHeaders,
      dataRows: res.dataRows,
      mapping: res.autoMapping,
    })
    expect(built.suppliers).toHaveLength(1)
    expect(built.suppliers[0].supplier_name).toBe('Only Here')
    expect(built.suppliers[0].value_ex_vat).toBe(999)
  })

  it('falls back to header scan when sheet name is unusual', () => {
    const buf = buildWorkbookBuffer('Spend 2025', [
      ['Vendor', 'Spend', 'B-BBEE'],
      ['X', 1000, 'Level 1'],
    ])
    const res = parseProcurementExcelBuffer({
      buffer: buf,
      filename: 'flex.xlsx',
    })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.detectionMethod).toBe('header_keywords')
    expect(res.selectedSheetName).toBe('Spend 2025')
  })

  it('returns blocked success when only TMPS-style sheet exists (no supplier register)', () => {
    const buf = buildWorkbookBuffer('TMPS', [
      ['Line item', 'Amount'],
      ['Opening inventory', 1000],
      ['Employee costs', 200],
    ])
    const res = parseProcurementExcelBuffer({
      buffer: buf,
      filename: 'tmps-only.xlsx',
    })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.supplierImportBlockedReason).toBe('no_supplier_register')
    expect(res.selectedSheetName).toBeNull()
    expect(res.dataRows).toHaveLength(0)
    expect(res.supplierImportBlockedWorkbookContext).toBe('procurement_or_tmps')
  })

  it('returns blocked success when no sheet has supplier + spend headers', () => {
    const buf = buildWorkbookBuffer('Random', [['xx', 'yy', 'zz']])
    const res = parseProcurementExcelBuffer({
      buffer: buf,
      filename: 'bad.xlsx',
    })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.supplierImportBlockedReason).toBe('no_supplier_register')
    expect(res.selectedSheetName).toBeNull()
    expect(res.supplierImportBlockedWorkbookContext).toBe('generic')
  })

  it('maps ZAR over % of Spend on Generic Scorecard–style procurement headers', () => {
    const headers = [
      'Vendor',
      'USD',
      'ZAR',
      '% of Spend',
      'BO',
      'BWO',
      'B-BBEE Level',
      'B-BBEE Recognition %',
      'B-BBEE Suppliers',
      'QSE',
      'EME',
    ]
    const row: (string | number | null)[] = Array(headers.length).fill(null)
    row[0] = 'Acme Pty Ltd'
    row[1] = 900
    row[2] = 45000
    row[3] = 0.12
    row[4] = '60%'
    row[5] = '35%'
    row[6] = 'Level 4'
    row[7] = '120%'
    row[8] = ''
    row[9] = 'x'
    row[10] = ''

    const buf = buildWorkbookBuffer('Procurement', [headers, row])
    const res = parseProcurementExcelBuffer({ buffer: buf, filename: 'generic.xlsx' })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.autoMapping.spend_amount).toBe('ZAR')
    expect(res.autoMapping.supplier_name).toBe('Vendor')
    expect(res.autoMapping.procurement_recognition).toBe('B-BBEE Recognition %')
    expect(res.autoMapping.spend_amount).not.toBe('% of Spend')

    const built = buildSuppliersFromMappedSheet({
      headers: res.columnHeaders,
      dataRows: res.dataRows,
      mapping: res.autoMapping,
    })
    expect(built.suppliers).toHaveLength(1)
    expect(built.suppliers[0].supplier_name).toBe('Acme Pty Ltd')
    expect(built.suppliers[0].value_ex_vat).toBe(45000)
    expect(built.suppliers[0].is_51_black_owned).toBe(true)
    expect(built.suppliers[0].is_30_black_women_owned).toBe(true)
    expect(built.suppliers[0].supplier_type).toBe('QSE')
  })

  it('expands stale !ref from cell keys so dense read includes all rows', () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Vendor', 'USD', 'ZAR'],
      ['Acme Ltd', 100, 10_000],
      ['Beta Co', 50, 5000],
    ])
    ws['!ref'] = 'A1:C1'
    const rows = readSheetDenseAoAWithMerges(ws)
    expect(rows.length).toBeGreaterThanOrEqual(3)
    expect(rows[1]?.[0]).toBe('Acme Ltd')
    expect(rows[2]?.[0]).toBe('Beta Co')
    expect(rows[2]?.[2]).toBe(5000)
  })
})

describe('isLikelyProcurementCategoryRowLabel', () => {
  it('flags scorecard category / criteria vendor labels', () => {
    expect(isLikelyProcurementCategoryRowLabel('All B-BBEE Suppliers')).toBe(true)
    expect(isLikelyProcurementCategoryRowLabel('From all QSEs')).toBe(true)
    expect(isLikelyProcurementCategoryRowLabel('From all EMEs')).toBe(true)
    expect(
      isLikelyProcurementCategoryRowLabel('Spend with at least 51% Black Owned supplier'),
    ).toBe(true)
    expect(
      isLikelyProcurementCategoryRowLabel('Bonus: Spend with 51% Black Designated Group suppliers'),
    ).toBe(true)
  })

  it('does not flag real supplier names', () => {
    expect(isLikelyProcurementCategoryRowLabel('Acme Supplies (Pty) Ltd')).toBe(false)
    expect(isLikelyProcurementCategoryRowLabel('Beta Logistics')).toBe(false)
    expect(isLikelyProcurementCategoryRowLabel('Kopano Tech Solutions')).toBe(false)
    expect(isLikelyProcurementCategoryRowLabel('Ubuntu Office Furniture')).toBe(false)
    expect(isLikelyProcurementCategoryRowLabel('Total Solutions (Pty) Ltd')).toBe(false)
  })
})

describe('isLikelyProcurementScorecardSectionOrHeaderRowLabel', () => {
  it('flags measurement / points header rows in the vendor column', () => {
    expect(isLikelyProcurementScorecardSectionOrHeaderRowLabel('Measurement Category & Criteria')).toBe(
      true,
    )
    expect(
      isLikelyProcurementScorecardSectionOrHeaderRowLabel('Measurement Category and Criteria'),
    ).toBe(true)
    expect(
      isLikelyProcurementScorecardSectionOrHeaderRowLabel(
        'Target / Available Points / Achieved % / Points Achieved',
      ),
    ).toBe(true)
    expect(isLikelyProcurementScorecardSectionOrHeaderRowLabel('Target')).toBe(true)
    expect(isLikelyProcurementScorecardSectionOrHeaderRowLabel('Available Points')).toBe(true)
  })

  it('does not flag real supplier names', () => {
    expect(isLikelyProcurementScorecardSectionOrHeaderRowLabel('Acme Supplies (Pty) Ltd')).toBe(false)
    expect(isLikelyProcurementScorecardSectionOrHeaderRowLabel('Kopano Tech Solutions')).toBe(false)
  })
})

describe('full scorecard procurement fixture (category rows vs suppliers)', () => {
  const genericHeaders = [
    'Vendor',
    'USD',
    'ZAR',
    '% of Spend',
    'ES',
    'BO',
    'BWO',
    'DESIGNATED',
    'LOCAL',
    'Comments',
    'B-BBEE Level',
    'B-BBEE Recognition %',
    'B-BBEE Suppliers',
    'QSE',
    'EME',
  ]

  function row(
    vendor: string,
    zar: number | string | null,
  ): (string | number | null)[] {
    const r: (string | number | null)[] = Array(genericHeaders.length).fill(null)
    r[0] = vendor
    r[2] = zar
    return r
  }

  it('imports exactly 4 suppliers, skips category and section rows, and emits no spend rowWarnings (synthetic sheet)', () => {
    const aoa: (string | number | null)[][] = [
      genericHeaders,
      row('Measurement Category & Criteria', '—'),
      row('Target / Available Points / Achieved % / Points Achieved', ''),
      row('All B-BBEE Suppliers', 1_000_000),
      row('From all QSEs', 400_000),
      row('From all EMEs', 300_000),
      row('Spend with at least 51% Black Owned supplier', 250_000),
      row('Spend with at least 30% Black Women Owned supplier', 120_000),
      row('Bonus: Spend with 51% Black Designated Group suppliers', 80_000),
      row('Acme Supplies (Pty) Ltd', 125_000.5),
      row('Beta Logistics', 89_000),
      row('Kopano Tech Solutions', 245_000),
      row('Ubuntu Office Furniture', 62_000.75),
    ]
    const buf = buildWorkbookBuffer('Procurement', aoa)
    const res = parseProcurementExcelBuffer({
      buffer: buf,
      filename: 'full_scorecard_upload_test_workbook.xlsx',
      preferredSheet: 'Procurement',
    })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    const built = buildSuppliersFromMappedSheet({
      headers: res.columnHeaders,
      dataRows: res.dataRows,
      mapping: res.autoMapping,
    })
    expect(built.rowWarnings).toHaveLength(0)
    expect(built.suppliers).toHaveLength(4)
    expect(built.suppliers.map((s) => s.supplier_name)).toEqual([
      'Acme Supplies (Pty) Ltd',
      'Beta Logistics',
      'Kopano Tech Solutions',
      'Ubuntu Office Furniture',
    ])
    const total = built.suppliers.reduce((s, x) => s + x.value_ex_vat, 0)
    expect(total).toBeCloseTo(521_001.25, 2)
  })

  it.skipIf(
    !fs.existsSync(
      path.join(
        process.cwd(),
        'src/lib/scorecard-upload/__tests__/fixtures/full_scorecard_upload_test_workbook.xlsx',
      ),
    ),
  )('imports 4 suppliers from checked-in full_scorecard_upload_test_workbook.xlsx when present', () => {
    const fixturePath = path.join(
      process.cwd(),
      'src/lib/scorecard-upload/__tests__/fixtures/full_scorecard_upload_test_workbook.xlsx',
    )
    const buf = fs.readFileSync(fixturePath)
    const res = parseProcurementExcelBuffer({
      buffer: buf,
      filename: 'full_scorecard_upload_test_workbook.xlsx',
      preferredSheet: 'Procurement',
    })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    const built = buildSuppliersFromMappedSheet({
      headers: res.columnHeaders,
      dataRows: res.dataRows,
      mapping: res.autoMapping,
    })
    expect(built.suppliers).toHaveLength(4)
    expect(built.rowWarnings).toHaveLength(0)
    const total = built.suppliers.reduce((s, x) => s + x.value_ex_vat, 0)
    expect(total).toBeCloseTo(521_001.25, 2)
  })
})

describe('buildSuppliers BDGS (51% black designated group)', () => {
  it('sets is_51_bdgs when DESIGNATED and 51% BDGS columns are both affirmative', () => {
    const headers = ['Vendor', 'ZAR', 'B-BBEE Level', 'DESIGNATED', '51% BDGS']
    const mapping = {
      supplier_name: 'Vendor',
      spend_amount: 'ZAR',
      bbb_level: 'B-BBEE Level',
    }
    const dataRows: (string | number | null)[][] = [
      ['Acme Ltd', 10_000, 'Level 4', 'yes', 'y'],
    ]
    const built = buildSuppliersFromMappedSheet({ headers, dataRows, mapping })
    expect(built.suppliers).toHaveLength(1)
    expect(built.suppliers[0].is_51_bdgs).toBe(true)
    const calc = calculateSupplierRow(built.suppliers[0])
    expect(calc.bdgs_amount).toBeGreaterThan(0)
    const totals = aggregateCategoryTotals([calc])
    const result = calculateProcurementResults({
      totals,
      totalMeasuredSpend: 50_000,
    })
    const bdgs = result.categories.find((c) => c.key === 'bdgs_51')
    expect(bdgs).toBeDefined()
    expect(bdgs!.pointsAchieved).toBeGreaterThan(0)
    expect(bdgs!.achievedPercent).toBeGreaterThan(0)
  })

  it('sets is_51_bdgs from 51% BDGS alone when there is no DESIGNATED column', () => {
    const headers = ['Vendor', 'ZAR', 'Level', '51% BDGS']
    const mapping = {
      supplier_name: 'Vendor',
      spend_amount: 'ZAR',
      bbb_level: 'Level',
    }
    const dataRows: (string | number | null)[][] = [['X Co', 8_000, '4', 'Yes']]
    const built = buildSuppliersFromMappedSheet({ headers, dataRows, mapping })
    expect(built.suppliers[0].is_51_bdgs).toBe(true)
  })

  it('does not set is_51_bdgs when DESIGNATED is yes but 51% BDGS is no (both columns present)', () => {
    const headers = ['Vendor', 'ZAR', 'Level', 'DESIGNATED', '51% BDGS']
    const mapping = {
      supplier_name: 'Vendor',
      spend_amount: 'ZAR',
      bbb_level: 'Level',
    }
    const dataRows: (string | number | null)[][] = [['Y Co', 3_000, '4', 'yes', 'no']]
    const built = buildSuppliersFromMappedSheet({ headers, dataRows, mapping })
    expect(built.suppliers[0].is_51_bdgs).toBe(false)
  })

  it('auto-maps 51% BDGS from a minimal xlsx and contributes to bdgs category totals', () => {
    const headers = [
      'Vendor',
      'ZAR',
      'B-BBEE Level',
      'DESIGNATED',
      '51% BDGS',
    ]
    const row: (string | number | null)[] = [
      'ProcureCo',
      20_000,
      'Level 4',
      'Yes',
      'Yes',
    ]
    const buf = buildWorkbookBuffer('Suppliers', [headers, row])
    const res = parseProcurementExcelBuffer({ buffer: buf, filename: 'bdgs.xlsx' })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.autoMapping.bdgs_51).toBe('51% BDGS')
    const built = buildSuppliersFromMappedSheet({
      headers: res.columnHeaders,
      dataRows: res.dataRows,
      mapping: res.autoMapping,
    })
    expect(built.suppliers[0].is_51_bdgs).toBe(true)
    const calc = calculateSupplierRow(built.suppliers[0])
    expect(calc.bdgs_amount).toBeCloseTo(calc.bbbee_spend, 6)
  })
})
