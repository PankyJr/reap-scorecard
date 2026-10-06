import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { NextRequest } from 'next/server'
import {
  SUPPLIER_TEMPLATE_EXAMPLE_ROW,
  SUPPLIER_TEMPLATE_HEADERS,
  supplierTemplateCsv,
  supplierTemplateXlsx,
} from '../supplierTemplate'
import { parseProcurementExcelBuffer } from '../excel/parseProcurementWorkbook'
import { buildSuppliersFromMappedSheet } from '../excel/buildSuppliers'
import { checkSpreadsheetFile } from '@/lib/uploads/spreadsheet-file'
import type { ProcurementExcelParseSuccess } from '../excel/types'
import { GET } from '@/app/api/procurement/supplier-template/route'

function parse(buffer: Buffer, filename: string): ProcurementExcelParseSuccess {
  const parsed = parseProcurementExcelBuffer({ buffer, filename })
  if (!parsed.ok || parsed.supplierImportBlockedReason) throw new Error('template not recognised')
  return parsed
}

const EXPECTED_MAPPING = {
  supplier_name: 'Supplier name',
  spend_amount: 'Amount spent ex VAT (ZAR)',
  bbb_level: 'B-BBEE level',
  certificate_expiry: 'Certificate expiry date',
  black_ownership: 'Black owned %',
  black_women_ownership: 'Black women owned %',
  bdgs_51: '51% black designated group (yes/no)',
  supplier_type: 'Supplier type (EME, QSE or Generic)',
  flow_through: '51% flow-through (yes/no)',
  vat_number: 'VAT number',
  company_registration: 'Company registration number',
}

describe('supplier list template', () => {
  it('uses only columns the importer matches on its own', () => {
    expect(Object.values(EXPECTED_MAPPING).sort()).toEqual([...SUPPLIER_TEMPLATE_HEADERS].sort())
    for (const [buffer, name] of [
      [supplierTemplateXlsx(), 'template.xlsx'],
      [Buffer.from(supplierTemplateCsv(), 'utf8'), 'template.csv'],
    ] as const) {
      const parsed = parse(buffer, name)
      expect(parsed.autoMapping).toEqual(EXPECTED_MAPPING)
    }
  })

  it('has one example row, clearly marked, that is never imported', () => {
    expect(SUPPLIER_TEMPLATE_EXAMPLE_ROW[0]).toMatch(/^EXAMPLE ROW/)
    const parsed = parse(supplierTemplateXlsx(), 'template.xlsx')
    const built = buildSuppliersFromMappedSheet({
      headers: parsed.columnHeaders,
      dataRows: parsed.dataRows,
      mapping: parsed.autoMapping,
      keepProblemsForReview: true,
    })
    expect(built.suppliers).toEqual([])
    expect(built.rowWarnings).toEqual(['Row 1 is the template’s example row, so it was not imported.'])
  })

  it('imports a filled-in row with every field', () => {
    const book = XLSX.read(supplierTemplateXlsx(), { type: 'buffer' })
    XLSX.utils.sheet_add_aoa(
      book.Sheets.Suppliers,
      [['Thabo Supplies (Pty) Ltd', 250000, 'Level 1', '31/03/2027', 60, 35, 'yes', 'EME', 'no', '4987654321', '2019/555555/07']],
      { origin: -1 },
    )
    const filled = XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer
    const parsed = parse(filled, 'filled.xlsx')
    const built = buildSuppliersFromMappedSheet({
      headers: parsed.columnHeaders,
      dataRows: parsed.dataRows,
      mapping: parsed.autoMapping,
      keepProblemsForReview: true,
    })
    expect(built.suppliers).toEqual([
      {
        supplier_name: 'Thabo Supplies (Pty) Ltd',
        supplier_type: 'EME',
        level: '1',
        value_ex_vat: 250000,
        is_51_black_owned: true,
        is_30_black_women_owned: true,
        is_51_bdgs: true,
        is_51_percent_flow_through: false,
        vat_number: '4987654321',
        company_registration: '2019/555555/07',
        expiry: '2027-03-31',
      },
    ])
  })

  it('passes the upload check in both formats', () => {
    expect(checkSpreadsheetFile({ filename: 't.xlsx', bytes: supplierTemplateXlsx(), maxBytes: 4_000_000 }).ok).toBe(true)
    expect(
      checkSpreadsheetFile({ filename: 't.csv', bytes: Buffer.from(supplierTemplateCsv()), maxBytes: 4_000_000, allowCsv: true }).ok,
    ).toBe(true)
  })

  it('is served as a download in either format', async () => {
    const xlsx = await GET(new NextRequest('http://localhost/api/procurement/supplier-template'))
    expect(xlsx.status).toBe(200)
    expect(xlsx.headers.get('content-type')).toContain('spreadsheetml')
    expect(xlsx.headers.get('content-disposition')).toContain('procurement-supplier-list-template.xlsx')
    const csv = await GET(new NextRequest('http://localhost/api/procurement/supplier-template?format=csv'))
    expect(csv.headers.get('content-type')).toContain('text/csv')
    expect(await csv.text()).toContain('Supplier name,Amount spent ex VAT (ZAR)')
  })
})
