import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { FULL_SCORECARD_EXPECTED_SHEETS } from '../constants'
import { parseFullScorecardWorkbook } from '../parseFullScorecardWorkbook'

function buildGenericFullScorecardBuffer(): Buffer {
  const wb = XLSX.utils.book_new()
  const defaultAoa = (title: string) => [
    [title, 'Notes'],
    ['Sample metric', 42],
  ]
  const special: Record<string, (string | number | null)[][]> = {
    TMPS: [
      ['Label', 'Amount'],
      ['Total measured procurement spend (TMPS)', 1_250_000],
    ],
    Procurement: [
      ['Vendor', 'USD', 'ZAR'],
      ['Acme Ltd', 100, 50_000],
      ['Beta (Pty) Ltd', 0, 25_000],
    ],
    'Full Scorecard': [
      ['Element', 'Points'],
      ['Total generic scorecard', 91.5],
    ],
    NPAT: [
      ['Item', 'ZAR'],
      ['Net profit after tax', 12_000_000],
    ],
  }

  for (const def of FULL_SCORECARD_EXPECTED_SHEETS) {
    const aoa = special[def.title] ?? defaultAoa(def.title)
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    XLSX.utils.book_append_sheet(wb, ws, def.title)
  }
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

describe('parseFullScorecardWorkbook', () => {
  it('classifies synthetic workbook with all expected tabs as full_scorecard', () => {
    const buf = buildGenericFullScorecardBuffer()
    const res = parseFullScorecardWorkbook({ buffer: buf, filename: 'fixture.xlsx' })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.workbookKind).toBe('full_scorecard')
    expect(res.preview).toBeDefined()
    expect(res.preview!.sheets.length).toBe(FULL_SCORECARD_EXPECTED_SHEETS.length)
    expect(res.preview!.procurement.supplierRowCount).toBeGreaterThanOrEqual(2)
    expect(res.preview!.tmps.suggestedTotal).toBeGreaterThan(0)
  })

  it('classifies a procurement-only workbook as supplier_register_only', () => {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([
      ['Vendor', 'ZAR'],
      ['Solo', 500],
    ])
    XLSX.utils.book_append_sheet(wb, ws, 'Procurement')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
    const res = parseFullScorecardWorkbook({ buffer: buf, filename: 'register.xlsx' })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.workbookKind).toBe('supplier_register_only')
    expect(res.preview).toBeUndefined()
    expect(res.guidance).toBeTruthy()
  })

  it('classifies unrelated workbook', () => {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([
      ['a', 'b'],
      [1, 2],
    ])
    XLSX.utils.book_append_sheet(wb, ws, 'Random')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
    const res = parseFullScorecardWorkbook({ buffer: buf, filename: 'other.xlsx' })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.workbookKind).toBe('unrelated')
    expect(res.preview).toBeUndefined()
  })

  it.skipIf(
    !fs.existsSync(
      path.join(
        process.cwd(),
        'src/lib/scorecard-upload/__tests__/fixtures/full_scorecard_upload_test_workbook.xlsx',
      ),
    ),
  )('parses full_scorecard_upload_test_workbook.xlsx when placed under __tests__/fixtures', () => {
    const fixturePath = path.join(
      process.cwd(),
      'src/lib/scorecard-upload/__tests__/fixtures/full_scorecard_upload_test_workbook.xlsx',
    )
    const buf = fs.readFileSync(fixturePath)
    const res = parseFullScorecardWorkbook({ buffer: buf, filename: 'full_scorecard_upload_test_workbook.xlsx' })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.workbookKind).toBe('full_scorecard')
    expect(res.preview?.sheets.length).toBeGreaterThan(0)
  })
})
