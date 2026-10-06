/**
 * Build the golden populated workbook fixture.
 *
 *   node scripts/build-golden-workbook.mjs
 *
 * Copies the real reference workbook and populates it with FICTIONAL data,
 * preserving the file's exact sheet names (including the nine padded ones such
 * as 'Skills Development ' and ' Yes Targets Calc'), layouts, blank rows and
 * quirks. Never build this fixture from scratch — the point is to exercise the
 * real template's shape.
 *
 * ## Why literal values instead of a recalculation pass
 *
 * LibreOffice is not available in this environment, so formulas cannot be
 * recalculated. SheetJS round-trips a cell's cached value (`.v`) alongside its
 * formula (`.f`), so every cell this script does NOT touch keeps both. For the
 * cells it does populate, the script writes the cached value that a recalc
 * would have produced, computing it with the same arithmetic as the workbook's
 * own formula (documented per cell below). The result is byte-for-byte
 * deterministic and needs no spreadsheet engine to reproduce.
 *
 * ## Deliberate divergence from the template's formula wiring
 *
 * The reference template wires Ownership!D4 (voting, black people),
 * D6 (economic interest, black people) and D11 (net value) all to the same
 * cell, =H22 — so those three indicators structurally share one number. A
 * golden file needs every indicator to land on a DIFFERENT value, otherwise a
 * transposition or a mis-mapped row can pass unnoticed. D6, D7 and D11 are
 * therefore written as literals rather than formulas. Every other derived cell
 * keeps its formula and gets a cached value consistent with the shareholder
 * block.
 */
import * as XLSX from 'xlsx'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const SOURCE = resolve('tmp/full-scorecard-reference/Generic-Scorecard Calculator.xlsx')
const TARGET = resolve('test-fixtures/golden/golden-populated-workbook.xlsx')

const wb = XLSX.read(readFileSync(SOURCE), { type: 'buffer', cellFormula: true, cellText: true, raw: true })

/** Write a literal value, removing any formula that was there. */
function setLiteral(sheet, address, value) {
  const existing = sheet[address] ?? {}
  delete existing.f
  existing.v = value
  existing.t = typeof value === 'number' ? 'n' : 's'
  delete existing.w
  sheet[address] = existing
  return value
}

/** Update a formula cell's cached value, keeping the formula. */
function setCached(sheet, address, value) {
  const existing = sheet[address] ?? {}
  existing.v = value
  existing.t = 'n'
  delete existing.w
  sheet[address] = existing
  return value
}

function expandRef(sheet, lastAddress) {
  const range = XLSX.utils.decode_range(sheet['!ref'])
  const target = XLSX.utils.decode_cell(lastAddress)
  range.e.r = Math.max(range.e.r, target.r)
  range.e.c = Math.max(range.e.c, target.c)
  sheet['!ref'] = XLSX.utils.encode_range(range)
}

// ---------------------------------------------------------------------------
// Ownership
// ---------------------------------------------------------------------------
// Shareholder block, rows 17-19. Columns:
//   A Name | B Shares | C Share % | D Black % | E Black Women %
//   F Schemes & BDG % | G New Entrants %
// Derived (template formulas): H=C*D, I=C*E, J=C*F, K=C*G; row 22 = SUM.
const own = wb.Sheets['Ownership']

const shareholders = [
  { row: 17, name: 'Golden Test Shareholder A', shares: 500_000, share: 0.5, black: 0.15, women: 0.08, bdg: 0.03, entrant: 0.02 },
  { row: 18, name: 'Golden Test Shareholder B', shares: 300_000, share: 0.3, black: 0.12, women: 0.05, bdg: 0.02, entrant: 0.01 },
  { row: 19, name: 'Golden Test Shareholder C', shares: 200_000, share: 0.2, black: 0.0725, women: 0.025, bdg: 0.0, entrant: 0.0 },
]

let h22 = 0
let i22 = 0
let j22 = 0
let k22 = 0

for (const s of shareholders) {
  setLiteral(own, `A${s.row}`, s.name)
  setLiteral(own, `B${s.row}`, s.shares)
  setLiteral(own, `C${s.row}`, s.share)
  setLiteral(own, `D${s.row}`, s.black)
  setLiteral(own, `E${s.row}`, s.women)
  setLiteral(own, `F${s.row}`, s.bdg)
  setLiteral(own, `G${s.row}`, s.entrant)
  // Mirror the template's own H/I/J/K formulas.
  h22 += setCached(own, `H${s.row}`, s.share * s.black)
  i22 += setCached(own, `I${s.row}`, s.share * s.women)
  j22 += setCached(own, `J${s.row}`, s.share * s.bdg)
  k22 += setCached(own, `K${s.row}`, s.share * s.entrant)
}

// Round to kill float drift so the fixture pins exact decimals.
const r6 = (n) => Math.round(n * 1e6) / 1e6
h22 = r6(h22) // 0.1255
i22 = r6(i22) // 0.06
j22 = r6(j22) // 0.021
k22 = r6(k22) // 0.013 — sub-target, so new entrants scores proportionally

setCached(own, 'H22', h22)
setCached(own, 'I22', i22)
setCached(own, 'J22', j22)
setCached(own, 'K22', k22)
setCached(own, 'B22', shareholders.reduce((t, s) => t + s.shares, 0))
setCached(own, 'C22', r6(shareholders.reduce((t, s) => t + s.share, 0)))

// Verified level (column D) per indicator. Every value distinct, and every one
// BELOW its target so the proportional maths is exercised rather than capped.
setCached(own, 'D4', h22) //   0.1255  voting, black people      (=H22, faithful)
setCached(own, 'D5', i22) //   0.06    voting, black women       (=I22, faithful)
setLiteral(own, 'D6', 0.2) //  0.2     economic, black people    (literal — see header)
setLiteral(own, 'D7', 0.075) // 0.075  economic, black women     (literal)
setCached(own, 'D8', j22) //   0.021   designated groups         (=J22, faithful)
setCached(own, 'D10', k22) //  0.065   new entrants              (=K22, faithful)
setLiteral(own, 'D11', 0.15) // 0.15   net value                 (literal)

// ---------------------------------------------------------------------------
// NPAT Calculation
// ---------------------------------------------------------------------------
// B10 industry profit norm after tax is left exactly as the real file has it.
// Deemed NPAT = revenue x margin x 25%  =  40,000,000 x 0.05725310234761103 x 0.25
//             = 572,531.0234761103
// Actual NPAT = 2,000,000  ->  ACTUAL WINS (actual > deemed), pinned deliberately.
const npat = wb.Sheets['NPAT Calculation']
const INDUSTRY_MARGIN = npat.B10.v
const REVENUE = 40_000_000
const ACTUAL_NPAT = 2_000_000
const DEEMED_NPAT = REVENUE * INDUSTRY_MARGIN * 0.25

setLiteral(npat, 'B15', REVENUE)
setCached(npat, 'B17', DEEMED_NPAT)
setCached(npat, 'B21', DEEMED_NPAT)
setLiteral(npat, 'B23', ACTUAL_NPAT)
setCached(npat, 'B27', Math.max(ACTUAL_NPAT, DEEMED_NPAT))
setCached(npat, 'C31', ACTUAL_NPAT * 0.02)
setCached(npat, 'C33', ACTUAL_NPAT * 0.01)
setCached(npat, 'C35', ACTUAL_NPAT * 0.01)

// ---------------------------------------------------------------------------
// SED — beneficiary rows 13-15 under the row-12 header
//   A Qualifying Beneficiaries | B Claimed | C Recognised Amount
// ---------------------------------------------------------------------------
const sed = wb.Sheets['SED']
const sedRows = [
  { row: 13, name: 'Golden Test SED Beneficiary A', claimed: 7_500, recognised: 6_000 },
  { row: 14, name: 'Golden Test SED Beneficiary B', claimed: 5_000, recognised: 4_500 },
  { row: 15, name: 'Golden Test SED Beneficiary C', claimed: 2_000, recognised: 1_500 },
]
for (const r of sedRows) {
  setLiteral(sed, `A${r.row}`, r.name)
  setLiteral(sed, `B${r.row}`, r.claimed)
  setLiteral(sed, `C${r.row}`, r.recognised)
}
const SED_TOTAL = sedRows.reduce((t, r) => t + r.recognised, 0) // 12,000
setCached(sed, 'C28', SED_TOTAL)
setCached(sed, 'B9', Math.max(ACTUAL_NPAT, DEEMED_NPAT))
setCached(sed, 'D5', SED_TOTAL / Math.max(ACTUAL_NPAT, DEEMED_NPAT))
setCached(sed, 'B32', Math.max(ACTUAL_NPAT, DEEMED_NPAT) * 0.01)
setCached(sed, 'B33', SED_TOTAL)
setCached(sed, 'B34', Math.max(ACTUAL_NPAT, DEEMED_NPAT) * 0.01 - SED_TOTAL)

// ---------------------------------------------------------------------------
// ED & SD — beneficiary rows under the row-24 (ED) and row-43 (SD) headers
//   A Beneficiary Name | B Type of contribution | C amount (R)
// ---------------------------------------------------------------------------
const edsd = wb.Sheets['ED & SD']
const edRows = [
  { row: 25, name: 'Golden Test ED Beneficiary A', type: 'Grant', amount: 9_000 },
  { row: 26, name: 'Golden Test ED Beneficiary B', type: 'Grant', amount: 5_500 },
]
const sdRows = [
  { row: 45, name: 'Golden Test SD Beneficiary A', type: 'Grant', amount: 18_000 },
  { row: 46, name: 'Golden Test SD Beneficiary B', type: 'Grant', amount: 11_000 },
]
for (const r of [...edRows, ...sdRows]) {
  setLiteral(edsd, `A${r.row}`, r.name)
  setLiteral(edsd, `B${r.row}`, r.type)
  setLiteral(edsd, `C${r.row}`, r.amount)
}
const ED_TOTAL = edRows.reduce((t, r) => t + r.amount, 0) // 14,500
const SD_TOTAL = sdRows.reduce((t, r) => t + r.amount, 0) // 29,000
const APPLICABLE_NPAT = Math.max(ACTUAL_NPAT, DEEMED_NPAT)
setCached(edsd, 'C39', ED_TOTAL)
setCached(edsd, 'C60', SD_TOTAL)
setCached(edsd, 'B19', APPLICABLE_NPAT)
setCached(edsd, 'D5', ED_TOTAL / APPLICABLE_NPAT)
setCached(edsd, 'D8', SD_TOTAL / APPLICABLE_NPAT)
expandRef(edsd, 'C60')

// ---------------------------------------------------------------------------
// Skills Development
// ---------------------------------------------------------------------------
// The sheet computes its results through a formula chain from four feeder
// tabs. The extractor reads the INPUT rows (23 / 52 / 81 / 109 / 115), not the
// computed point cells H44 / H73 / H102 — those hold the workbook's own EAP
// five-step scoring, which the engine recomputes, and in the unpopulated
// template they are cached #DIV/0! errors.
//
// Band order is fixed by rows 22 / 51 / 80:
//   B = African male, C = Coloured male, D = Indian male,
//   E = African female, F = Coloured female, G = Indian female
//
// Individual delegate rows are deliberately NOT fabricated: the extractor never
// reads them, and inventing thousands of fictional people adds risk with no
// coverage. The feeder SUM cells carry the cached totals instead.
const skills = wb.Sheets['Skills Development ']
const catA = wb.Sheets['Category A']
const catBCDE = wb.Sheets['Category BCDE']
const catFG = wb.Sheets['Category F&G']
const catHcount = wb.Sheets['Category BCD(Hcount)']
const emp201 = wb.Sheets['13 EMP201']

const LEVIABLE = 10_000_000
const TOTAL_STAFF = 2_000

// Bursaries come from Category A alone (Skills Development!B52 = 'Category A'!O2).
const BURSARY = { B: 60_000, C: 6_000, D: 2_000, E: 45_000, F: 4_500, G: 1_000 }
// General training = Category A + Category BCDE + Category F&G.
const GENERAL = { B: 120_000, C: 12_000, D: 4_000, E: 90_000, F: 9_000, G: 2_000 }
const BCDE = { B: 40_000, C: 4_000, D: 1_500, E: 30_000, F: 3_000, G: 700 }
// Category F&G is the remainder, so the three feeders reconcile to GENERAL.
const FG = Object.fromEntries(
  Object.keys(GENERAL).map((k) => [k, GENERAL[k] - BURSARY[k] - BCDE[k]]),
)
// Learner headcounts come from Category BCD(Hcount)!P2:U2.
const LEARNERS = { B: 30, C: 3, D: 1, E: 25, F: 3, G: 1 }
// Disabled-learner spend: Category A!U2 + Category BCDE!U2 + Category F&G!U1.
const DISABILITY = { catA: 8_000, bcde: 7_000, fg: 3_000 }
const DISABILITY_TOTAL = DISABILITY.catA + DISABILITY.bcde + DISABILITY.fg // 18,000

const COLS = ['B', 'C', 'D', 'E', 'F', 'G']
// Feeder sheets expose their totals one column to the right of the label block.
const FEEDER_COLS = ['O', 'P', 'Q', 'R', 'S', 'T']
const HCOUNT_COLS = ['P', 'Q', 'R', 'S', 'T', 'U']

// Feeder totals (cached sums).
COLS.forEach((c, i) => {
  setCached(catA, `${FEEDER_COLS[i]}2`, BURSARY[c])
  setCached(catBCDE, `${FEEDER_COLS[i]}2`, BCDE[c])
  setCached(catFG, `${FEEDER_COLS[i]}1`, FG[c])
  setCached(catHcount, `${HCOUNT_COLS[i]}2`, LEARNERS[c])
})
setCached(catA, 'U2', DISABILITY.catA)
setCached(catBCDE, 'U2', DISABILITY.bcde)
setCached(catFG, 'U1', DISABILITY.fg)

// Skills Development input rows.
COLS.forEach((c) => {
  setCached(skills, `${c}23`, GENERAL[c]) // general training spend per band
  setCached(skills, `${c}52`, BURSARY[c]) // bursary spend per band
  setCached(skills, `${c}81`, LEARNERS[c]) // learner headcount per band
})
setLiteral(skills, 'H23', LEVIABLE) // leviable amount (spend denominator)
setLiteral(skills, 'H52', LEVIABLE) // bursary leviable
setLiteral(skills, 'H81', TOTAL_STAFF) // total staff (learnership denominator)
setCached(skills, 'B109', DISABILITY_TOTAL) // recognised disabled-learner spend
setCached(skills, 'B110', LEVIABLE) // = H23
setLiteral(skills, 'B115', 12) // completed learners
setLiteral(skills, 'B116', TOTAL_STAFF) // total headcount
// NOTE: the workbook has no "learners absorbed" cell. Its D15 measures
// completed / headcount, which the rule set rejects in favour of
// absorbed / completed, so the absorption bonus stays a manual input.

// 13 EMP201: SDL is 1% of the leviable payroll, so leviable = SDL x 100.
// Eleven months at 8,000 plus one at 12,000 = 100,000 SDL -> 10,000,000.
const SDL_MONTHS = [8000, 8000, 8000, 8000, 8000, 8000, 8000, 8000, 8000, 8000, 8000, 12000]
SDL_MONTHS.forEach((v, i) => setLiteral(emp201, `B${19 + i}`, v))
const SDL_TOTAL = SDL_MONTHS.reduce((a, b) => a + b, 0)
setCached(emp201, 'B31', SDL_TOTAL)
setCached(emp201, 'B32', SDL_TOTAL * 100)

// ---------------------------------------------------------------------------
// Management Control
// ---------------------------------------------------------------------------
// Split across two sheets:
//   'Management Control'  F/G block, rows 4-20  -> the three DIRECT groups (9 pts)
//   'Employment Equity'   six EAP blocks + a disability block (10 pts)
//
// NOTE the template mislabels F19 as "Black Executive Management" — identical
// to F16. Only D16 = G19/G20 reveals it is the FEMALE row, so the importer
// resolves it by section position, never by label alone.
const mc = wb.Sheets['Management Control']
const ee = wb.Sheets['Employment Equity']

const BOARD = { total: 20, black: 8, blackWomen: 3 }
const EXEC_DIR = { total: 8, black: 3, blackWomen: 1 }
const OTHER_EXEC = { total: 50, black: 21, blackWomen: 11 }

// Black row and its total, then the female row and its (identical) total.
setLiteral(mc, 'G4', BOARD.black)
setLiteral(mc, 'G5', BOARD.total)
setLiteral(mc, 'G7', BOARD.blackWomen)
setLiteral(mc, 'G8', BOARD.total)
setLiteral(mc, 'G10', EXEC_DIR.black)
setLiteral(mc, 'G11', EXEC_DIR.total)
setLiteral(mc, 'G13', EXEC_DIR.blackWomen)
setLiteral(mc, 'G14', EXEC_DIR.total)
setLiteral(mc, 'G16', OTHER_EXEC.black)
setLiteral(mc, 'G17', OTHER_EXEC.total)
setLiteral(mc, 'G19', OTHER_EXEC.blackWomen)
setLiteral(mc, 'G20', OTHER_EXEC.total)

// Occupational bands. Denominators are large enough that no EAP band caps,
// so the proportional maths is exercised for all six indicators.
const MC_BANDS = [
  { row: 29, total: 200, counts: [40, 4, 2, 30, 4, 1] }, // senior — black people
  { row: 58, total: 200, counts: [null, null, null, 30, 4, 1] }, // senior — black women
  { row: 87, total: 500, counts: [130, 13, 5, 110, 12, 3] }, // middle — black people
  { row: 118, total: 500, counts: [null, null, null, 110, 12, 3] }, // middle — black women
  { row: 147, total: 1000, counts: [330, 33, 12, 290, 29, 8] }, // junior — black people
  { row: 176, total: 1000, counts: [null, null, null, 290, 29, 8] }, // junior — black women
]
for (const band of MC_BANDS) {
  COLS.forEach((c, i) => {
    if (band.counts[i] != null) setLiteral(ee, `${c}${band.row}`, band.counts[i])
  })
  setLiteral(ee, `H${band.row}`, band.total)
}
// Disability block: 13 black disabled employees of 2,000 total.
const MC_DISABLED = 13
const MC_TOTAL_EMPLOYEES = 2_000
setLiteral(ee, 'B204', MC_DISABLED)
setLiteral(ee, 'B205', MC_TOTAL_EMPLOYEES)

// ---------------------------------------------------------------------------
mkdirSync(dirname(TARGET), { recursive: true })
const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer', cellStyles: true })
writeFileSync(TARGET, buffer)

console.log(`wrote ${TARGET}`)
console.log(`  sheets            : ${wb.SheetNames.length} (padded names kept: ${wb.SheetNames.filter((n) => n !== n.trim()).length})`)
console.log(`  Ownership H22/I22/J22/K22 : ${h22} / ${i22} / ${j22} / ${k22}`)
console.log(`  industry margin   : ${INDUSTRY_MARGIN}`)
console.log(`  deemed NPAT       : ${DEEMED_NPAT}`)
console.log(`  actual NPAT       : ${ACTUAL_NPAT}   -> applicable: ${APPLICABLE_NPAT} (actual wins)`)
console.log(`  SED recognised    : ${SED_TOTAL}`)
console.log(`  ED / SD totals    : ${ED_TOTAL} / ${SD_TOTAL}`)
console.log(`  skills leviable   : ${LEVIABLE} | total staff: ${TOTAL_STAFF}`)
console.log(`  general spend     : ${JSON.stringify(GENERAL)}`)
console.log(`  bursary spend     : ${JSON.stringify(BURSARY)}`)
console.log(`  learner headcount : ${JSON.stringify(LEARNERS)}`)
console.log(`  disability spend  : ${DISABILITY_TOTAL} | EMP201 SDL: ${SDL_TOTAL} -> leviable ${SDL_TOTAL * 100}`)
console.log(`  feeder F&G split  : ${JSON.stringify(FG)}`)
console.log(`  MC board/exec/other : ${JSON.stringify(BOARD)} ${JSON.stringify(EXEC_DIR)} ${JSON.stringify(OTHER_EXEC)}`)
console.log(`  MC bands            : senior 200 | middle 500 | junior 1000`)
console.log(`  MC disabled         : ${MC_DISABLED} of ${MC_TOTAL_EMPLOYEES}`)
