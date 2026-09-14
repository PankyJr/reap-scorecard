import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as XLSX from 'xlsx'
import { describe, expect, it } from 'vitest'
import { importEsdBeneficiaryWorkbook } from '../elements/enterprise-supplier-development/import'

/**
 * Row-level ED / SD beneficiary import from the real 'ED & SD' sheet.
 *
 * The tables float — a client inserting rows moves them — so they are located
 * by their section titles and "Beneficiary Name" headers, never by fixed rows.
 * The sheet's own C39 / C60 totals are treated as a checksum, not as the source
 * of truth.
 */

const GOLDEN = resolve(process.cwd(), 'test-fixtures/golden/golden-populated-workbook.xlsx')
const hasGolden = existsSync(GOLDEN)

/** Build an 'ED & SD'-shaped sheet from an array of rows (1-indexed gaps kept). */
function esdWorkbook(rows: unknown[][]): Buffer {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, ws, 'ED & SD')
  return XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }) as Buffer
}

/** Minimal real-shaped layout; `offset` blank rows pushed in front to float it. */
function layout(offset = 0, edAmounts = [9000, 5500], sdAmounts = [18000, 11000], totals?: { ed?: number; sd?: number }) {
  const blank = () => [] as unknown[]
  const rows: unknown[][] = []
  for (let i = 0; i < offset; i += 1) rows.push(blank())
  rows.push(['Enterprise Development and Supplier Development ', '', '', 'Sampled '])
  rows.push(['Beneficiary Name ', 'Type of contribution ', 'Enterprise Development (R amount)', 'BEE Certificate '])
  edAmounts.forEach((amount, i) => rows.push([`ED Beneficiary ${i + 1}`, 'Grant', amount]))
  rows.push(blank())
  rows.push(['Total ', '', totals?.ed ?? edAmounts.reduce((a, b) => a + b, 0)])
  rows.push(blank())
  rows.push(['Supplier Development ', '', '', 'Sampled '])
  rows.push(['Beneficiary Name ', 'Type of contribution ', 'Supplier  Development (R amount)', 'BEE Certificate '])
  sdAmounts.forEach((amount, i) => rows.push([`SD Beneficiary ${i + 1}`, 'Grant', amount]))
  rows.push(blank())
  rows.push(['Total ', '', totals?.sd ?? sdAmounts.reduce((a, b) => a + b, 0)])
  return rows
}

// ---------------------------------------------------------------------------
// (a) Golden workbook — the real sheet, real values, true provenance
// ---------------------------------------------------------------------------
describe.skipIf(!hasGolden)('golden workbook ED & SD beneficiary tables', () => {
  const buffer = readFileSync(GOLDEN)

  it('extracts the two Enterprise Development rows with true cell provenance', () => {
    const preview = importEsdBeneficiaryWorkbook({ workbookBuffer: buffer, element: 'enterprise_development' })
    expect(preview.sheetName).toBe('ED & SD')
    expect(preview.rows).toHaveLength(2)
    expect(preview.rows[0].beneficiaryName).toBe('Golden Test ED Beneficiary A')
    expect(preview.rows[0].amount).toBe(9000)
    expect(preview.rows[0].sourceRowNumber).toBe(25)
    expect(preview.rows[0].sourceCell).toBe('C25')
    expect(preview.rows[1].beneficiaryName).toBe('Golden Test ED Beneficiary B')
    expect(preview.rows[1].amount).toBe(5500)
    expect(preview.rows[1].sourceRowNumber).toBe(26)
    expect(preview.rows[1].sourceCell).toBe('C26')
    expect(preview.platformTotal).toBe(14500)
  })

  it('extracts the two Supplier Development rows with true cell provenance', () => {
    const preview = importEsdBeneficiaryWorkbook({ workbookBuffer: buffer, element: 'supplier_development' })
    expect(preview.rows).toHaveLength(2)
    expect(preview.rows[0].beneficiaryName).toBe('Golden Test SD Beneficiary A')
    expect(preview.rows[0].amount).toBe(18000)
    expect(preview.rows[0].sourceRowNumber).toBe(45)
    expect(preview.rows[0].sourceCell).toBe('C45')
    expect(preview.rows[1].amount).toBe(11000)
    expect(preview.rows[1].sourceRowNumber).toBe(46)
    expect(preview.platformTotal).toBe(29000)
  })

  it('reconciles against the sheet C39 / C60 totals', () => {
    const ed = importEsdBeneficiaryWorkbook({ workbookBuffer: buffer, element: 'enterprise_development' })
    const sd = importEsdBeneficiaryWorkbook({ workbookBuffer: buffer, element: 'supplier_development' })
    expect(ed.workbookDisplayedTotal).toBe(14500)
    expect(ed.totalsMatch).toBe(true)
    expect(sd.workbookDisplayedTotal).toBe(29000)
    expect(sd.totalsMatch).toBe(true)
  })

  it('never confuses the two tables with each other', () => {
    const ed = importEsdBeneficiaryWorkbook({ workbookBuffer: buffer, element: 'enterprise_development' })
    const sd = importEsdBeneficiaryWorkbook({ workbookBuffer: buffer, element: 'supplier_development' })
    expect(ed.rows.every((r) => r.beneficiaryName.includes('ED'))).toBe(true)
    expect(sd.rows.every((r) => r.beneficiaryName.includes('SD'))).toBe(true)
    expect(ed.platformTotal).not.toBe(sd.platformTotal)
  })
})

// ---------------------------------------------------------------------------
// (c) Checksum mismatch — rows win, and the discrepancy is named
// ---------------------------------------------------------------------------
describe('sheet total disagrees with the rows', () => {
  it('imports the rows and warns, naming both figures', () => {
    // Rows sum to 14,500 but the sheet claims 99,999.
    const buffer = esdWorkbook(layout(0, [9000, 5500], [18000, 11000], { ed: 99999 }))
    const preview = importEsdBeneficiaryWorkbook({ workbookBuffer: buffer, element: 'enterprise_development' })

    expect(preview.rows).toHaveLength(2)
    expect(preview.platformTotal).toBe(14500)
    expect(preview.workbookDisplayedTotal).toBe(99999)
    expect(preview.totalsMatch).toBe(false)
    const named = preview.notes.some((n) => n.includes('14500') && n.includes('99999'))
    expect(named).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// (d) Floating tables — inserted rows must not break location
// ---------------------------------------------------------------------------
describe('floating tables', () => {
  it.each([0, 3, 11])('finds both tables when shifted down by %i rows', (offset) => {
    const buffer = esdWorkbook(layout(offset))
    const ed = importEsdBeneficiaryWorkbook({ workbookBuffer: buffer, element: 'enterprise_development' })
    const sd = importEsdBeneficiaryWorkbook({ workbookBuffer: buffer, element: 'supplier_development' })

    expect(ed.rows).toHaveLength(2)
    expect(ed.platformTotal).toBe(14500)
    expect(sd.rows).toHaveLength(2)
    expect(sd.platformTotal).toBe(29000)
    // Provenance must track the shift, not stay pinned to the unshifted rows.
    expect(ed.rows[0].sourceRowNumber).toBe(offset + 3)
  })
})

// ---------------------------------------------------------------------------
// Empty table — explicit, not silent
// ---------------------------------------------------------------------------
describe('empty beneficiary table', () => {
  it('returns no rows and says so', () => {
    const buffer = esdWorkbook(layout(0, [], [18000]))
    const preview = importEsdBeneficiaryWorkbook({ workbookBuffer: buffer, element: 'enterprise_development' })
    expect(preview.rows).toHaveLength(0)
    expect(preview.validRowCount).toBe(0)
    expect(preview.notes.some((n) => /no beneficiaries found/i.test(n))).toBe(true)
  })

  it('says so when the sheet is absent entirely', () => {
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['nothing']]), 'Other')
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }) as Buffer
    const preview = importEsdBeneficiaryWorkbook({ workbookBuffer: buffer, element: 'enterprise_development' })
    expect(preview.rows).toHaveLength(0)
    expect(preview.notes.some((n) => /ED & SD/i.test(n))).toBe(true)
  })
})
