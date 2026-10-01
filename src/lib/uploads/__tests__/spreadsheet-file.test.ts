import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { checkSpreadsheetFile } from '../spreadsheet-file'
import { analyseGenericScorecardWorkbook } from '@/lib/scorecard/generic/workbook-import/analyse'

const MAX = 8 * 1024 * 1024
const bytes = (text: string) => new TextEncoder().encode(text)

function realXlsx(sheetName = 'Suppliers'): Uint8Array {
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([['Name', 'Spend'], ['A', 1]]), sheetName)
  return new Uint8Array(XLSX.write(book, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer)
}

function realXls(): Uint8Array {
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([['A', 1]]), 'Sheet1')
  return new Uint8Array(XLSX.write(book, { type: 'array', bookType: 'biff8' }) as ArrayBuffer)
}

describe('checkSpreadsheetFile', () => {
  it('accepts a real .xlsx and a real .xls', () => {
    expect(checkSpreadsheetFile({ filename: 'book.xlsx', bytes: realXlsx(), maxBytes: MAX })).toEqual({ ok: true, kind: 'xlsx' })
    expect(checkSpreadsheetFile({ filename: 'book.xls', bytes: realXls(), maxBytes: MAX })).toEqual({ ok: true, kind: 'xls' })
  })

  it('refuses a text file renamed to .xlsx, in plain words', () => {
    const result = checkSpreadsheetFile({ filename: 'notes.xlsx', bytes: bytes('this is not a spreadsheet'), maxBytes: MAX })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain('“notes.xlsx” is not a valid Excel workbook')
    expect(result.error).toMatch(/Save As/)
  })

  it('refuses a PDF, whatever its name', () => {
    const pdf = bytes('%PDF-1.7\n...')
    expect(checkSpreadsheetFile({ filename: 'report.pdf', bytes: pdf, maxBytes: MAX }).ok).toBe(false)
    expect(checkSpreadsheetFile({ filename: 'report.xlsx', bytes: pdf, maxBytes: MAX }).ok).toBe(false)
  })

  it('refuses a ZIP that is not a workbook (a Word document renamed to .xlsx)', () => {
    const fakeZip = new Uint8Array([0x50, 0x4b, 0x03, 0x04, ...bytes('word/document.xml')])
    const result = checkSpreadsheetFile({ filename: 'letter.xlsx', bytes: fakeZip, maxBytes: MAX })
    expect(result.ok).toBe(false)
  })

  it('names a password-protected workbook as such', () => {
    const ole = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0])
    const result = checkSpreadsheetFile({ filename: 'locked.xlsx', bytes: ole, maxBytes: MAX })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/password-protected/)
  })

  it('refuses an empty file, an oversized file and a wrong extension', () => {
    expect(checkSpreadsheetFile({ filename: 'a.xlsx', bytes: new Uint8Array(), maxBytes: MAX })).toMatchObject({ ok: false, error: expect.stringMatching(/is empty/) })
    expect(checkSpreadsheetFile({ filename: 'a.xlsx', bytes: realXlsx(), maxBytes: 10 })).toMatchObject({ ok: false, error: expect.stringMatching(/larger than/) })
    expect(checkSpreadsheetFile({ filename: 'a.csv', bytes: bytes('a,b'), maxBytes: MAX })).toMatchObject({ ok: false, error: expect.stringMatching(/not an Excel workbook/) })
  })

  it('refuses .xls where only .xlsx can be read', () => {
    const result = checkSpreadsheetFile({ filename: 'old.xls', bytes: realXls(), maxBytes: MAX, xlsxOnly: true })
    expect(result.ok).toBe(false)
  })
})

describe('Generic Scorecard upload refuses what it cannot use', () => {
  it('refuses a non-workbook instead of showing "1 of 22 sheets"', () => {
    expect(() =>
      analyseGenericScorecardWorkbook({ filename: 'notes.xlsx', buffer: Buffer.from('this is not a spreadsheet') }),
    ).toThrow(/is not a valid Excel workbook/)
  })

  it('refuses a real workbook that has none of the scorecard sheets', () => {
    expect(() =>
      analyseGenericScorecardWorkbook({ filename: 'suppliers.xlsx', buffer: Buffer.from(realXlsx('Suppliers')) }),
    ).toThrow(/none of the REAP Generic Scorecard sheets/)
  })

  const golden = resolve(process.cwd(), 'test-fixtures/golden/golden-populated-workbook.xlsx')
  it.skipIf(!existsSync(golden))('still accepts the real scorecard workbook', () => {
    const buffer = readFileSync(golden)
    const analysis = analyseGenericScorecardWorkbook({ filename: 'golden.xlsx', buffer })
    expect(analysis.recognisedSheetCount).toBeGreaterThan(20)
  })
})
