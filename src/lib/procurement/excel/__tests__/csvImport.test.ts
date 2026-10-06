import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { checkSpreadsheetFile } from '@/lib/uploads/spreadsheet-file'
import { decodeCsvText, parseProcurementExcelBuffer } from '../parseProcurementWorkbook'
import { buildSuppliersFromMappedSheet } from '../buildSuppliers'
import type { ProcurementExcelParseSuccess } from '../types'

const MAX = 4 * 1024 * 1024
const utf8 = (text: string) => Buffer.from(text, 'utf8')

function parseOk(buffer: Buffer, filename: string): ProcurementExcelParseSuccess {
  const result = parseProcurementExcelBuffer({ buffer, filename })
  if (!result.ok) throw new Error(result.issues.map((i) => i.message).join(' '))
  return result
}

function suppliersOf(parsed: ProcurementExcelParseSuccess) {
  return buildSuppliersFromMappedSheet({ headers: parsed.columnHeaders, dataRows: parsed.dataRows, mapping: parsed.autoMapping }).suppliers
}

describe('CSV supplier lists', () => {
  it('are accepted by the upload check only where CSV is allowed', () => {
    const csv = utf8('Supplier name,Amount (ZAR)\nAcme,100\n')
    expect(checkSpreadsheetFile({ filename: 'list.csv', bytes: csv, maxBytes: MAX, allowCsv: true })).toEqual({ ok: true, kind: 'csv' })
    expect(checkSpreadsheetFile({ filename: 'list.csv', bytes: csv, maxBytes: MAX }).ok).toBe(false)
    const wrong = checkSpreadsheetFile({ filename: 'list.pdf', bytes: csv, maxBytes: MAX, allowCsv: true })
    expect(wrong).toMatchObject({ ok: false, error: expect.stringMatching(/or a CSV file \(\.csv\)/) })
  })

  it('refuses a workbook or binary file renamed to .csv, in plain words', () => {
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([['a']]), 'S')
    const xlsx = new Uint8Array(XLSX.write(book, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer)
    const renamed = checkSpreadsheetFile({ filename: 'list.csv', bytes: xlsx, maxBytes: MAX, allowCsv: true })
    expect(renamed).toMatchObject({ ok: false, error: expect.stringMatching(/is not a CSV text file/) })
    const binary = checkSpreadsheetFile({ filename: 'x.csv', bytes: new Uint8Array([65, 0, 66]), maxBytes: MAX, allowCsv: true })
    expect(binary.ok).toBe(false)
  })

  it('reads a comma-separated list with quotes and thousands separators', () => {
    const parsed = parseOk(utf8('﻿Supplier name,Amount (ZAR),B-BBEE level\n"Acme, Ltd","1,234.50",2\nBeta,500,Level 4\n'), 'suppliers.csv')
    expect(parsed.sheetNames).toHaveLength(1)
    expect(suppliersOf(parsed).map((s) => [s.supplier_name, s.value_ex_vat, s.level])).toEqual([
      ['Acme, Ltd', 1234.5, '2'],
      ['Beta', 500, '4'],
    ])
  })

  it('reads a semicolon-separated list (Excel in a comma-decimal region)', () => {
    const parsed = parseOk(utf8('Supplier name;Amount (ZAR);B-BBEE level\nAcme;1200;2\nBeta;500;4\n'), 'suppliers.csv')
    expect(suppliersOf(parsed).map((s) => s.supplier_name)).toEqual(['Acme', 'Beta'])
  })

  it('reads an older Windows-1252 CSV without garbling accented names', () => {
    const latin = Buffer.from([...utf8('Supplier name,Amount (ZAR)\n'), 0x42, 0xe9, 0x74, 0x61, ...utf8(',10\n')])
    expect(decodeCsvText(latin)).toContain('Béta')
    expect(suppliersOf(parseOk(latin, 'old.csv'))[0].supplier_name).toBe('Béta')
  })
})
