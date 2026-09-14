import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as XLSX from 'xlsx'
import { describe, expect, it } from 'vitest'
import { importManagementControlScoringWorkbook } from '../elements/management-control/scoring-import'

/**
 * Management Control scoring inputs.
 *
 * Split across two sheets: the 'Management Control' F/G block holds the three
 * direct groups (9 of the 19 points), and 'Employment Equity' holds the six
 * EAP-disaggregated blocks plus the disability block (the other 10).
 *
 * The template mislabels Management Control!F19 as "Black Executive
 * Management" — identical to F16 — so the female other-executive row can only
 * be told apart by section position.
 */

const GOLDEN = resolve(process.cwd(), 'test-fixtures/golden/golden-populated-workbook.xlsx')
const hasGolden = existsSync(GOLDEN)

function workbookWith(sheets: Record<string, unknown[][]>): Buffer {
  const wb = XLSX.utils.book_new()
  for (const [name, rows] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name)
  }
  return XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }) as Buffer
}

/** Minimal 'Management Control' F/G block; `offset` floats it. */
function mcSheet(offset = 0, totals = { board: [20, 20], exec: [8, 8], other: [50, 50] }) {
  const rows: unknown[][] = []
  for (let i = 0; i < offset; i += 1) rows.push([])
  const push = (f: string, g: unknown) => rows.push(['', '', '', '', '', f, g])
  push('Black Board Members', 8)
  push('Total Board Members', totals.board[0])
  push('Black Female Board Members', 3)
  push('Total Board Members', totals.board[1])
  push('Black Executive Directors', 3)
  push('Total Executive Directors ', totals.exec[0])
  push('Black Female Executive Directors', 1)
  push('Total Executive Directors', totals.exec[1])
  push('Black Executive Management', 21)
  push('Total Executive Management', totals.other[0])
  push('Black Executive Management', 11) // mislabelled female row, as in the template
  push('Total Executive Management', totals.other[1])
  return rows
}

/** Minimal 'Employment Equity' with one band block plus disabilities. */
function eeSheet() {
  const rows: unknown[][] = []
  const block = (title: string, counts: (number | null)[], total: number) => {
    rows.push([title])
    rows.push(['Input Data ', 'Male ', '', '', 'Female ', '', '', 'Total staff'])
    rows.push(['', 'African', 'Coloured ', 'Indian ', 'African ', 'Coloured ', 'Indian'])
    rows.push(['Total employees per race ', ...counts, total])
  }
  block('Black People at Senior Management', [40, 4, 2, 30, 4, 1], 200)
  block('Black Women at Senior Management', [null, null, null, 30, 4, 1], 200)
  block('Black People at Middle Management', [130, 13, 5, 110, 12, 3], 500)
  block('Black Women at Middle Management', [null, null, null, 110, 12, 3], 500)
  block('Black People at Junior Management', [330, 33, 12, 290, 29, 8], 1000)
  block('Black Women at Junior Management', [null, null, null, 290, 29, 8], 1000)
  rows.push(['Black Disabled Employees'])
  rows.push(['Black ', 13])
  rows.push(['Total ', 2000])
  return rows
}

// ---------------------------------------------------------------------------
// Golden workbook
// ---------------------------------------------------------------------------
describe.skipIf(!hasGolden)('golden workbook Management Control', () => {
  const preview = importManagementControlScoringWorkbook({ workbookBuffer: readFileSync(GOLDEN) })

  it('reads the three direct groups from the F/G block', () => {
    expect(preview.board).toEqual({ total: 20, black: 8, blackWomen: 3 })
    expect(preview.executiveDirectors).toEqual({ total: 8, black: 3, blackWomen: 1 })
    expect(preview.otherExecutiveManagement).toEqual({ total: 50, black: 21, blackWomen: 11 })
  })

  it('tells the mislabelled female other-executive row apart from the male one', () => {
    // F16 and F19 carry the SAME label in the template.
    expect(preview.otherExecutiveManagement.black).toBe(21)
    expect(preview.otherExecutiveManagement.blackWomen).toBe(11)
    expect(preview.otherExecutiveManagement.black).not.toBe(preview.otherExecutiveManagement.blackWomen)
  })

  it('reads the occupational bands from Employment Equity', () => {
    expect(preview.seniorManagement.total).toBe(200)
    expect(preview.seniorManagement.byDemographic).toEqual({
      african_male: 40, coloured_male: 4, indian_male: 2,
      african_female: 30, coloured_female: 4, indian_female: 1,
    })
    expect(preview.middleManagement.total).toBe(500)
    expect(preview.middleManagement.byDemographic.african_male).toBe(130)
    expect(preview.juniorManagement.total).toBe(1000)
    expect(preview.juniorManagement.byDemographic.african_male).toBe(330)
  })

  it('reads disabilities and total employees', () => {
    expect(preview.blackEmployeesWithDisabilities).toBe(13)
    expect(preview.totalEmployees).toBe(2_000)
  })

  it('reads the EAP row the workbook itself asserts', () => {
    expect(preview.workbookEapDistribution).toEqual({
      african_male: 0.435, coloured_male: 0.046, indian_male: 0.017,
      african_female: 0.375, coloured_female: 0.042, indian_female: 0.01,
    })
    expect(preview.workbookEapSource).toMatch(/Employment Equity/)
  })

  it('records true-row provenance', () => {
    expect(preview.provenance.board).toBe('G4/G5')
    expect(preview.provenance.seniorManagement).toBe('B29:G29')
    expect(preview.provenance.blackEmployeesWithDisabilities).toBe('B204')
  })
})

// ---------------------------------------------------------------------------
// Floating layout
// ---------------------------------------------------------------------------
describe('floating layout', () => {
  it.each([0, 4, 9])('finds the F/G block when shifted down by %i rows', (offset) => {
    const preview = importManagementControlScoringWorkbook({
      workbookBuffer: workbookWith({ 'Management Control': mcSheet(offset), 'Employment Equity': eeSheet() }),
    })
    expect(preview.board).toEqual({ total: 20, black: 8, blackWomen: 3 })
    expect(preview.otherExecutiveManagement.blackWomen).toBe(11)
    expect(preview.seniorManagement.total).toBe(200)
  })
})

// ---------------------------------------------------------------------------
// Mismatched totals — warn, do not zero-fill
// ---------------------------------------------------------------------------
describe('mismatched group totals', () => {
  it('uses the black row total and warns, naming both figures', () => {
    const preview = importManagementControlScoringWorkbook({
      workbookBuffer: workbookWith({
        'Management Control': mcSheet(0, { board: [20, 25], exec: [8, 8], other: [50, 50] }),
        'Employment Equity': eeSheet(),
      }),
    })
    expect(preview.board.total).toBe(20)
    expect(preview.notes.some((n) => n.includes('20') && n.includes('25'))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Named misses — never a silent zero
// ---------------------------------------------------------------------------
describe('missing data', () => {
  it('errors by name when the Management Control sheet is absent', () => {
    const preview = importManagementControlScoringWorkbook({
      workbookBuffer: workbookWith({ 'Employment Equity': eeSheet() }),
    })
    expect(preview.board.total).toBeNull()
    expect(preview.errors.some((e) => /Management Control/i.test(e))).toBe(true)
  })

  it('errors by name when Employment Equity is absent, keeping the direct groups', () => {
    const preview = importManagementControlScoringWorkbook({
      workbookBuffer: workbookWith({ 'Management Control': mcSheet() }),
    })
    expect(preview.board.total).toBe(20)
    expect(preview.seniorManagement.total).toBeNull()
    expect(preview.errors.some((e) => /Employment Equity/i.test(e))).toBe(true)
  })

  it('leaves a band null rather than zero-filling it when its block is missing', () => {
    const rows = eeSheet().filter((r) => String(r[0] ?? '') !== 'Black People at Junior Management')
    const preview = importManagementControlScoringWorkbook({
      workbookBuffer: workbookWith({ 'Management Control': mcSheet(), 'Employment Equity': rows }),
    })
    expect(preview.juniorManagement.total).toBeNull()
    expect(preview.errors.some((e) => /junior/i.test(e))).toBe(true)
    expect(preview.seniorManagement.total).toBe(200)
  })
})
