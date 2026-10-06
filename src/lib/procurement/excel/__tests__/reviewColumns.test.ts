import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { buildProcurementColumnAutoMap } from '../detect'
import { buildSuppliersFromMappedSheet, parseRecognitionLevelForReview } from '../buildSuppliers'
import { parseExpiryDate } from '../parseDate'
import { parseProcurementExcelBuffer } from '../parseProcurementWorkbook'
import { MAX_PROCUREMENT_EXCEL_DATA_ROWS } from '../constants'

describe('parseExpiryDate', () => {
  it('reads ISO, day-first and written dates', () => {
    expect(parseExpiryDate('2026-03-31')).toBe('2026-03-31')
    expect(parseExpiryDate('2026/3/31')).toBe('2026-03-31')
    expect(parseExpiryDate('31/03/2026')).toBe('2026-03-31')
    expect(parseExpiryDate('31-03-26')).toBe('2026-03-31')
    expect(parseExpiryDate('31.03.2026')).toBe('2026-03-31')
    expect(parseExpiryDate('31 March 2026')).toBe('2026-03-31')
    expect(parseExpiryDate('31-Mar-2026')).toBe('2026-03-31')
    expect(parseExpiryDate('March 31, 2026')).toBe('2026-03-31')
    expect(parseExpiryDate('2026-03-31T00:00:00')).toBe('2026-03-31')
  })

  it('reads an Excel date cell (a serial day number)', () => {
    expect(parseExpiryDate(46112)).toBe('2026-03-31')
    expect(parseExpiryDate('46112')).toBe('2026-03-31')
  })

  it('returns nothing rather than guessing', () => {
    expect(parseExpiryDate('')).toBeNull()
    expect(parseExpiryDate('n/a')).toBeNull()
    expect(parseExpiryDate('31/02/2026')).toBeNull()
    expect(parseExpiryDate('13/13/2026')).toBeNull()
    expect(parseExpiryDate(5)).toBeNull()
  })
})

describe('parseRecognitionLevelForReview', () => {
  it('keeps a missing or unknown level missing', () => {
    expect(parseRecognitionLevelForReview('')).toBe('')
    expect(parseRecognitionLevelForReview(null)).toBe('')
    expect(parseRecognitionLevelForReview('Unknown')).toBe('')
    expect(parseRecognitionLevelForReview('9')).toBe('')
  })
  it('reads levels and an explicit Non-compliant', () => {
    expect(parseRecognitionLevelForReview('Level 2')).toBe('2')
    expect(parseRecognitionLevelForReview(3)).toBe('3')
    expect(parseRecognitionLevelForReview('Non-compliant')).toBe('Non-Compliant')
    expect(parseRecognitionLevelForReview('NC')).toBe('Non-Compliant')
  })
})

describe('column matching for identifiers and dates', () => {
  it('matches VAT number, registration and certificate expiry columns', () => {
    const map = buildProcurementColumnAutoMap([
      'Supplier name',
      'Amount (ZAR)',
      'VAT number',
      'Company registration number',
      'Certificate expiry date',
    ])
    expect(map.get('vat_number')).toBe('VAT number')
    expect(map.get('company_registration')).toBe('Company registration number')
    expect(map.get('certificate_expiry')).toBe('Certificate expiry date')
    expect(map.get('spend_amount')).toBe('Amount (ZAR)')
  })

  it('does not take a bare "Number" column as a VAT or registration number', () => {
    const map = buildProcurementColumnAutoMap(['Number', 'Supplier name', 'Amount'])
    expect(map.has('vat_number')).toBe(false)
    expect(map.has('company_registration')).toBe(false)
  })

  it('keeps "Value ex VAT" as the spend column, not a VAT number', () => {
    const map = buildProcurementColumnAutoMap(['Supplier name', 'Value ex VAT'])
    expect(map.get('spend_amount')).toBe('Value ex VAT')
    expect(map.has('vat_number')).toBe(false)
  })

  it('recognises a "Spend (ex VAT)" column as spend, but never a recognised-spend column', () => {
    expect(buildProcurementColumnAutoMap(['Supplier name', 'Spend (ex VAT)']).get('spend_amount')).toBe('Spend (ex VAT)')
    expect(buildProcurementColumnAutoMap(['Supplier name', 'Spend excl VAT']).get('spend_amount')).toBe('Spend excl VAT')
    expect(buildProcurementColumnAutoMap(['Supplier name', 'Recognised spend']).has('spend_amount')).toBe(false)
  })
})

describe('buildSuppliersFromMappedSheet for review', () => {
  const headers = ['Supplier name', 'Amount (ZAR)', 'B-BBEE level', 'VAT number', 'Registration number', 'Expiry date']
  const mapping = Object.fromEntries(buildProcurementColumnAutoMap(headers))
  const dataRows = [
    ['EXAMPLE ROW – delete before you upload', 1000, 2, '4000000000', '', '2027-01-31'],
    ['Acme', 500, 'Level 2', '4123 456 789', '2001/123456/07', 46112],
    ['Zero Ltd', 0, 4, '', '', ''],
    ['Credit Ltd', -20, 4, '', '', ''],
    ['Blank level', 100, '', '', '', '31/13/2026'],
  ]

  it('keeps the old behaviour by default: odd amounts skipped, missing level Non-compliant', () => {
    const built = buildSuppliersFromMappedSheet({ headers, dataRows, mapping })
    expect(built.suppliers.map((s) => [s.supplier_name, s.level])).toEqual([
      ['Acme', '2'],
      ['Blank level', 'Non-Compliant'],
    ])
  })

  it('in review mode keeps odd amounts and leaves a missing level blank', () => {
    const built = buildSuppliersFromMappedSheet({ headers, dataRows, mapping, keepProblemsForReview: true })
    expect(built.suppliers.map((s) => [s.supplier_name, s.value_ex_vat, s.level])).toEqual([
      ['Acme', 500, '2'],
      ['Zero Ltd', 0, '4'],
      ['Credit Ltd', -20, '4'],
      ['Blank level', 100, ''],
    ])
  })

  it('reads VAT number, registration and expiry, and says when a date is not understood', () => {
    const built = buildSuppliersFromMappedSheet({ headers, dataRows, mapping, keepProblemsForReview: true })
    expect(built.suppliers[0]).toMatchObject({
      vat_number: '4123 456 789',
      company_registration: '2001/123456/07',
      expiry: '2026-03-31',
    })
    expect(built.suppliers[3].expiry).toBe('')
    expect(built.rowWarnings.some((w) => w.includes('“31/13/2026” was not understood'))).toBe(true)
  })

  it('never imports the template’s example row, and says so', () => {
    const built = buildSuppliersFromMappedSheet({ headers, dataRows, mapping, keepProblemsForReview: true })
    expect(built.suppliers.some((s) => s.supplier_name.startsWith('EXAMPLE'))).toBe(false)
    expect(built.rowWarnings[0]).toBe('Row 1 is the template’s example row, so it was not imported.')
  })
})

describe('large registers', () => {
  it('reads 8,000 suppliers without truncating', () => {
    expect(MAX_PROCUREMENT_EXCEL_DATA_ROWS).toBeGreaterThanOrEqual(8000)
    const aoa: (string | number)[][] = [['Supplier name', 'Amount (ZAR)', 'B-BBEE level']]
    for (let i = 0; i < 8000; i++) aoa.push([`Supplier ${i}`, 1000 + i, (i % 8) + 1])
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(aoa), 'Suppliers')
    const buffer = XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer
    const parsed = parseProcurementExcelBuffer({ buffer, filename: 'big.xlsx' })
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.truncated).toBe(false)
    expect(parsed.dataRows).toHaveLength(8000)
  })
})
