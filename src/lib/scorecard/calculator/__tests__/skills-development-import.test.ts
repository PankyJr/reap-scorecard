import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import * as XLSX from 'xlsx'
import { describe, expect, it } from 'vitest'
import { importSkillsDevelopmentWorkbook } from '../elements/skills-development/import'

/**
 * Skills Development import from the real 'Skills Development ' sheet
 * (trailing space).
 *
 * The extractor reads the sheet's INPUT rows, not its computed point cells
 * H44 / H73 / H102 — those hold the workbook's own EAP five-step scoring, which
 * the engine recomputes, and in an unpopulated template they are cached
 * #DIV/0! errors.
 */

const GOLDEN = resolve(process.cwd(), 'test-fixtures/golden/golden-populated-workbook.xlsx')
const hasGolden = existsSync(GOLDEN)

/** Build a minimal 'Skills Development ' sheet; `offset` floats the whole block. */
function skillsWorkbook(rows: unknown[][], sheetName = 'Skills Development '): Buffer {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), sheetName)
  return XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }) as Buffer
}

function layout(offset = 0, overrides: { leviable?: unknown; staff?: unknown } = {}) {
  const rows: unknown[][] = []
  for (let i = 0; i < offset; i += 1) rows.push([])
  rows.push(['Black People Expenditure '])
  rows.push(['Input Data ', 'Male ', '', '', 'Female ', '', '', 'Leviable Amount '])
  rows.push(['', 'African', 'Coloured ', 'Indian ', 'African ', 'Coloured ', 'Indian'])
  rows.push(['Total employees per race ', 120000, 12000, 4000, 90000, 9000, 2000, overrides.leviable ?? 10000000])
  rows.push(['Training Expenditure on Bursaries '])
  rows.push(['Input Data ', 'Male ', '', '', 'Female ', '', '', 'Leviable Amount '])
  rows.push(['', 'African', 'Coloured ', 'Indian ', 'African ', 'Coloured ', 'Indian'])
  rows.push(['Total employees per race ', 60000, 6000, 2000, 45000, 4500, 1000, 10000000])
  rows.push(['Learnerships '])
  rows.push(['Input Data ', 'Male ', '', '', 'Female ', '', '', 'Total Staff'])
  rows.push(['', 'African', 'Coloured ', 'Indian ', 'African ', 'Coloured ', 'Indian'])
  rows.push(['Total employees per race ', 30, 3, 1, 25, 3, 1, overrides.staff ?? 2000])
  rows.push(['Training Expenditure for Black People with Disabilties '])
  rows.push(['Recognised spend ', 18000])
  rows.push(['Total Leviable Amount ', 10000000])
  rows.push(['Bonus Points: Absorption of Learners '])
  rows.push(['Completed Learners ', 12])
  rows.push(['Total Headcount ', 2000])
  return rows
}

const BANDS = ['african_male', 'coloured_male', 'indian_male', 'african_female', 'coloured_female', 'indian_female'] as const

// ---------------------------------------------------------------------------
// Golden workbook — the real sheet
// ---------------------------------------------------------------------------
describe.skipIf(!hasGolden)('golden workbook Skills Development sheet', () => {
  const buffer = readFileSync(GOLDEN)
  const preview = importSkillsDevelopmentWorkbook({ workbookBuffer: buffer })

  it('finds the sheet despite its trailing space', () => {
    expect(preview.sheetName).toBe('Skills Development ')
  })

  it('reads the leviable amount and total staff from their labelled anchors', () => {
    expect(preview.leviableAmount).toBe(10_000_000)
    expect(preview.totalEmployees).toBe(2_000)
    expect(preview.provenance.leviableAmount).toBe('H23')
    expect(preview.provenance.totalEmployees).toBe('H81')
  })

  it('reads general training spend per EAP band from row 23', () => {
    expect(preview.generalTrainingSpendByBand).toEqual({
      african_male: 120_000,
      coloured_male: 12_000,
      indian_male: 4_000,
      african_female: 90_000,
      coloured_female: 9_000,
      indian_female: 2_000,
    })
    expect(preview.provenance.generalTrainingSpend).toBe('B23:G23')
  })

  it('reads bursary spend per EAP band from row 52', () => {
    expect(preview.bursarySpendByBand).toEqual({
      african_male: 60_000,
      coloured_male: 6_000,
      indian_male: 2_000,
      african_female: 45_000,
      coloured_female: 4_500,
      indian_female: 1_000,
    })
    expect(preview.provenance.bursarySpend).toBe('B52:G52')
  })

  it('reads learner headcount per EAP band from row 81', () => {
    expect(preview.learnerHeadcountByBand).toEqual({
      african_male: 30,
      coloured_male: 3,
      indian_male: 1,
      african_female: 25,
      coloured_female: 3,
      indian_female: 1,
    })
    expect(preview.provenance.learnerHeadcount).toBe('B81:G81')
  })

  it('reads disabled-learner spend and completed learners', () => {
    expect(preview.disabilityTrainingSpend).toBe(18_000)
    expect(preview.provenance.disabilityTrainingSpend).toBe('B109')
    expect(preview.learnersCompleted).toBe(12)
    expect(preview.provenance.learnersCompleted).toBe('B115')
  })

  it('never reads the three sections into each other', () => {
    // General, bursary and learnership blocks share the label
    // "Total employees per race" — they must be told apart by section.
    expect(preview.generalTrainingSpendByBand!.african_male).toBe(120_000)
    expect(preview.bursarySpendByBand!.african_male).toBe(60_000)
    expect(preview.learnerHeadcountByBand!.african_male).toBe(30)
  })

  it('leaves learners absorbed null and says why', () => {
    expect(preview.learnersAbsorbed).toBeNull()
    expect(preview.notes.some((n) => /absor/i.test(n) && /manual|not.*workbook|capture/i.test(n))).toBe(true)
  })

  it('names the four eligibility gates as manual confirmations', () => {
    expect(preview.notes.some((n) => /workplace skills plan|WSP|gate/i.test(n))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Floating layout — sections located by label, not fixed rows
// ---------------------------------------------------------------------------
describe('floating layout', () => {
  it.each([0, 5, 14])('finds every section when shifted down by %i rows', (offset) => {
    const preview = importSkillsDevelopmentWorkbook({ workbookBuffer: skillsWorkbook(layout(offset)) })
    expect(preview.leviableAmount).toBe(10_000_000)
    expect(preview.totalEmployees).toBe(2_000)
    expect(preview.generalTrainingSpendByBand!.african_male).toBe(120_000)
    expect(preview.bursarySpendByBand!.african_male).toBe(60_000)
    expect(preview.learnerHeadcountByBand!.african_male).toBe(30)
    expect(preview.disabilityTrainingSpend).toBe(18_000)
    expect(preview.learnersCompleted).toBe(12)
  })

  it('tracks provenance to the shifted rows, not the unshifted ones', () => {
    const preview = importSkillsDevelopmentWorkbook({ workbookBuffer: skillsWorkbook(layout(5)) })
    // block starts at row 6 (offset 5), so "Total employees per race" is row 9
    expect(preview.provenance.generalTrainingSpend).toBe('B9:G9')
  })
})

// ---------------------------------------------------------------------------
// Missing caches — a named error, never a silent zero
// ---------------------------------------------------------------------------
describe('stripped or unrecalculated workbook', () => {
  it('errors by name when the leviable amount is zero', () => {
    const preview = importSkillsDevelopmentWorkbook({ workbookBuffer: skillsWorkbook(layout(0, { leviable: 0 })) })
    expect(preview.leviableAmount).toBeNull()
    expect(preview.errors.some((e) => /leviable/i.test(e) && /recalculat|zero|save/i.test(e))).toBe(true)
  })

  it('errors by name when a cached formula result is an Excel error', () => {
    const rows = layout(0)
    rows[3][1] = '#DIV/0!' // general training, African male
    const preview = importSkillsDevelopmentWorkbook({ workbookBuffer: skillsWorkbook(rows) })
    expect(preview.errors.some((e) => /#DIV\/0!|recalculat/i.test(e))).toBe(true)
    expect(preview.generalTrainingSpendByBand).toBeNull()
  })

  it('errors when the sheet is absent entirely', () => {
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['nothing']]), 'Other')
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' }) as Buffer
    const preview = importSkillsDevelopmentWorkbook({ workbookBuffer: buffer })
    expect(preview.errors.some((e) => /Skills Development/i.test(e))).toBe(true)
    expect(preview.leviableAmount).toBeNull()
  })

  it('never returns a zero-filled band map when a section is missing', () => {
    const rows = layout(0).filter((r) => r[0] !== 'Learnerships ')
    const preview = importSkillsDevelopmentWorkbook({ workbookBuffer: skillsWorkbook(rows) })
    expect(preview.learnerHeadcountByBand).toBeNull()
    expect(preview.errors.some((e) => /learnership/i.test(e))).toBe(true)
    for (const band of BANDS) {
      expect(preview.generalTrainingSpendByBand![band]).toBeGreaterThan(0)
    }
  })
})
