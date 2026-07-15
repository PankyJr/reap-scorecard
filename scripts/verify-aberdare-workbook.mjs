/**
 * Local-only verification against the real Aberdare workbook.
 * Output is written under artifacts/aberdare-demo/ (gitignored verification files).
 *
 * Usage:
 *   node scripts/verify-aberdare-workbook.mjs
 *
 * Looks for:
 *   client-inputs/aberdare/BBBEE Spend Report.xlsx
 *   client-inputs/aberdare/BBBEE Spend Report(1).xlsx
 */
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const XLSX = require('xlsx')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const candidates = [
  path.join(root, 'client-inputs/aberdare/BBBEE Spend Report.xlsx'),
  path.join(root, 'client-inputs/aberdare/BBBEE Spend Report(1).xlsx'),
  path.join(root, 'BBBEE Spend Report.xlsx'),
]

const workbookPath = candidates.find((p) => fs.existsSync(p))
if (!workbookPath) {
  console.error(
    'No Aberdare workbook found. Place it under client-inputs/aberdare/ and retry.',
  )
  process.exit(1)
}

const EXPECTED = {
  supplierRows: 940,
  totalAmountExVat: 5_377_124_451.21,
  explicitImportRows: 33,
  explicitImportSpend: 596_773_734.27,
  importSpendExemptValue: 499_962_148.65,
  localSpendExemptValue: 19_912_247.73,
  negativeSpendRows: 2,
}

function nearly(a, b, tol = 0.02) {
  return Math.abs(a - b) <= tol
}

const wb = XLSX.readFile(workbookPath)
const sheet = wb.Sheets[wb.SheetNames[0]]
const rows = XLSX.utils.sheet_to_json(sheet, {
  header: 1,
  defval: null,
  raw: true,
})

const header = rows[0]
const data = rows.slice(1).filter((r) => r && r.some((c) => c != null && String(c).trim() !== ''))

function isTotals(row, precedingSum) {
  const company = String(row[0] ?? '').trim()
  const code = String(row[2] ?? '').trim()
  const name = String(row[3] ?? '').trim()
  const amount = Number(row[4])
  const identityEmpty = (!company || company === '6') && (!code || code === '6') && (!name || name === '6')
  if (!identityEmpty || !Number.isFinite(amount)) return false
  if (precedingSum !== 0 && Math.abs(amount - precedingSum) <= 0.02) return true
  return identityEmpty && Math.abs(amount) > 1_000_000
}

const suppliers = []
let running = 0
let totals = null

for (let i = 0; i < data.length; i++) {
  const row = data[i]
  if (isTotals(row, running)) {
    totals = { amount: Number(row[4]), importExempt: Number(row[25]) || 0, localExempt: Number(row[27]) || 0 }
    continue
  }
  const amount = Number(row[4])
  const importFlag = String(row[24] ?? '').trim().toUpperCase()
  const accred = String(row[1] ?? '').trim()
  suppliers.push({
    amount,
    importFlag,
    accred,
    importExempt: typeof row[25] === 'number' ? row[25] : 0,
    localExempt: typeof row[27] === 'number' ? row[27] : 0,
    multiplier: String(row[33] ?? ''),
  })
  running += amount
}

const sourceSpend = suppliers.reduce((s, r) => s + r.amount, 0)
const imports = suppliers.filter((s) => s.importFlag === 'Y')
const importSpend = imports.reduce((s, r) => s + r.amount, 0)
const importExempt = suppliers.reduce((s, r) => s + r.importExempt, 0)
const localExempt = suppliers.reduce((s, r) => s + r.localExempt, 0)
const negatives = suppliers.filter((s) => s.amount < 0)
const levelSix = suppliers.filter((s) => s.accred.toLowerCase() === '6')

const checks = {
  workbookPath: path.relative(root, workbookPath),
  headersOk:
    String(header[0]).includes('Company') &&
    String(header[1]).toLowerCase().includes('accred'),
  supplierCount: suppliers.length,
  supplierCountOk: suppliers.length === EXPECTED.supplierRows,
  sourceSpend,
  sourceSpendOk: nearly(sourceSpend, EXPECTED.totalAmountExVat),
  totalsRowDetected: Boolean(totals),
  totalsMatchesSum: totals ? nearly(totals.amount, sourceSpend) : false,
  explicitImportCount: imports.length,
  explicitImportCountOk: imports.length === EXPECTED.explicitImportRows,
  explicitImportSpend: importSpend,
  explicitImportSpendOk: nearly(importSpend, EXPECTED.explicitImportSpend),
  importSpendExemptTotal: importExempt,
  importExemptOk: nearly(importExempt, EXPECTED.importSpendExemptValue),
  localSpendExemptTotal: localExempt,
  localExemptOk: nearly(localExempt, EXPECTED.localSpendExemptValue),
  negativeSpendRows: negatives.length,
  negativeSpendRowsOk: negatives.length === EXPECTED.negativeSpendRows,
  combinedNegativeSpend: negatives.reduce((s, r) => s + r.amount, 0),
  levelSixCount: levelSix.length,
  levelSixRemainsValid: levelSix.length > 0,
  columns: header.length,
}

const outDir = path.join(root, 'artifacts/aberdare-demo')
fs.mkdirSync(outDir, { recursive: true })
const outJson = path.join(outDir, 'verification-local.json')
const outTxt = path.join(outDir, 'verification-local.txt')
fs.writeFileSync(outJson, JSON.stringify(checks, null, 2))
fs.writeFileSync(
  outTxt,
  Object.entries(checks)
    .map(([k, v]) => `${k}: ${typeof v === 'number' ? v : JSON.stringify(v)}`)
    .join('\n') + '\n',
)

const failed = Object.entries(checks).filter(
  ([k, v]) => k.endsWith('Ok') && v === false,
)
console.log('Aberdare workbook verification')
console.log(JSON.stringify(checks, null, 2))
console.log(`Wrote ${path.relative(root, outJson)}`)
if (failed.length) {
  console.error('FAILED checks:', failed.map(([k]) => k).join(', '))
  process.exit(1)
}
console.log('All expected reconciliation checks passed.')
