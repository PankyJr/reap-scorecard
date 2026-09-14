// Builds the fictional supplier register workbook used in REAP Formal Procurement
// Scorecard training captures. Development utility - not shipped to clients.
import * as XLSX from 'xlsx'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const RECOGNITION = {
  '1': 1.35,
  '2': 1.25,
  '3': 1.1,
  '4': 1.0,
  '5': 0.8,
  '6': 0.6,
  '7': 0.5,
  '8': 0.1,
  'Non-Compliant': 0,
}

// name, type, level, blackOwned, blackWomenOwned, designatedGroup, spend
const suppliers = [
  ['Vaal Steel & Tube Supplies (Pty) Ltd', 'Generic', '2', 'No', 'No', 'No', 11400000],
  ['Highveld Packaging Solutions (Pty) Ltd', 'Generic', '4', 'No', 'No', 'No', 8600000],
  ['Sandton Freight & Logistics (Pty) Ltd', 'Generic', '5', 'No', 'No', 'No', 7300000],
  ['Cape Reach Instrumentation (Pty) Ltd', 'Generic', '4', 'No', 'No', 'No', 5900000],
  ['Lebone Industrial Chemicals (Pty) Ltd', 'Generic', '3', 'Yes', 'No', 'No', 4850000],
  ['Amanzi Pumps & Valves (Pty) Ltd', 'Generic', '6', 'Yes', 'No', 'No', 4200000],
  ['Kopano Electrical Wholesalers (Pty) Ltd', 'Generic', '2', 'Yes', 'No', 'No', 3900000],
  ['Global Drive Systems SA (Pty) Ltd', 'Generic', 'Non-Compliant', 'No', 'No', 'No', 3400000],
  ['Northern Cape Aggregates (Pty) Ltd', 'Generic', '7', 'No', 'No', 'No', 2900000],
  ['Overberg Lubricants (Pty) Ltd', 'Generic', '8', 'No', 'No', 'No', 1900000],
  ['Mzansi Bearings & Drives (Pty) Ltd', 'QSE', '1', 'Yes', 'Yes', 'Yes', 1850000],
  ['Thuso Safety Equipment (Pty) Ltd', 'QSE', '2', 'Yes', 'No', 'No', 1620000],
  ['Nkosi Fabrication Works (Pty) Ltd', 'QSE', '1', 'Yes', 'No', 'Yes', 1240000],
  ['Kganya Electrical Contractors CC', 'EME', '1', 'Yes', 'No', 'No', 1240000],
  ['Zenzele Engineering Spares (Pty) Ltd', 'QSE', '3', 'Yes', 'No', 'No', 1180000],
  ['Sibanye Tools & Hardware (Pty) Ltd', 'EME', '2', 'Yes', 'No', 'No', 1080000],
  ['Rustenburg Bolt & Nut Supplies (Pty) Ltd', 'QSE', '4', 'No', 'No', 'No', 980000],
  ['Motheo Transport Services (Pty) Ltd', 'EME', '1', 'Yes', 'Yes', 'No', 940000],
  ['Sizwe IT Solutions (Pty) Ltd', 'QSE', '1', 'Yes', 'No', 'No', 760000],
  ['Bokamoso Office Supplies CC', 'EME', '1', 'Yes', 'Yes', 'No', 720000],
  ['Ubuntu Cleaning Services (Pty) Ltd', 'EME', '1', 'Yes', 'Yes', 'Yes', 640000],
  ['Imbewu Training & Development (Pty) Ltd', 'QSE', '5', 'Yes', 'Yes', 'No', 520000],
  ['Marula Valve Services (Pty) Ltd', 'EME', '4', 'No', 'No', 'No', 480000],
  ['Phambili Print & Signage CC', 'EME', '2', 'Yes', 'No', 'No', 360000],
  // Deliberate data-quality rows: these demonstrate import validation feedback.
  ['Kalahari Crane Hire (Pty) Ltd', 'QSE', '3', 'Yes', 'No', 'No', 'TBC'],
  ['Vaalwater Signage CC', 'EME', '1', 'Yes', 'No', 'No', 0],
]

const header = [
  'Supplier Name',
  'Vendor Code',
  'Supplier Type',
  'B-BBEE Level',
  '51% Black Owned',
  '30% Black Women Owned',
  '51% Black Designated Groups',
  'Certificate Expiry',
  'B-BBEE Spend (ZAR)',
]

const rows = suppliers.map((supplier, index) => {
  const [name, type, level, bo, bwo, bdg, spend] = supplier
  return [
    name,
    `VC-${String(1041 + index * 7)}`,
    type,
    level,
    bo,
    bwo,
    bdg,
    ['2027-02-28', '2027-05-31', '2026-11-30', '2027-08-31'][index % 4],
    spend,
  ]
})

const tmpsRows = [
  ['Thandeka Industrial Holdings (Pty) Ltd'],
  ['Total measured procurement spend - financial year 2026'],
  [],
  ['Inclusions', 'Amount (ZAR)'],
  ['Opening inventory', 12400000],
  ['Closing inventory', 10850000],
  ['Cost of sales', 48600000],
  ['Other operating expenses', 14750000],
  ['Finance costs', 2180000],
  ['Capital expenditure', 6420000],
  ['Total inclusions', 95200000],
  [],
  ['Exclusions', 'Amount (ZAR)'],
  ['Employee costs', 11900000],
  ['Depreciation', 3450000],
  ['Utilities', 2380000],
  ['Service fees', 1620000],
  ['Recharge for services', 850000],
  ['Total exclusions', 20200000],
  [],
  ['Total measured procurement spend (TMPS)', 75000000],
]

const workbook = XLSX.utils.book_new()
const tmpsSheet = XLSX.utils.aoa_to_sheet(tmpsRows)
tmpsSheet['!cols'] = [{ wch: 46 }, { wch: 18 }]
XLSX.utils.book_append_sheet(workbook, tmpsSheet, 'TMPS Calculation')

const supplierSheet = XLSX.utils.aoa_to_sheet([header, ...rows])
supplierSheet['!cols'] = [
  { wch: 42 },
  { wch: 13 },
  { wch: 14 },
  { wch: 13 },
  { wch: 17 },
  { wch: 24 },
  { wch: 28 },
  { wch: 17 },
  { wch: 19 },
]
XLSX.utils.book_append_sheet(workbook, supplierSheet, 'Supplier Register')

const outDir = resolve('tmp/training-data')
mkdirSync(outDir, { recursive: true })
const outFile = resolve(outDir, 'Thandeka_Industrial_Supplier_Register_2026.xlsx')
XLSX.writeFile(workbook, outFile)

// Prior-year register: a smaller supplier base so the 2026 assessment can be
// compared against a weaker 2025 baseline during training.
const priorYear = XLSX.utils.book_new()
const priorRows = rows
  .filter((_, index) => index % 4 !== 3)
  .map((row) => (typeof row[8] === 'number' ? [...row.slice(0, 8), Math.round(row[8] * 0.86)] : row))
const priorSheet = XLSX.utils.aoa_to_sheet([header, ...priorRows])
priorSheet['!cols'] = supplierSheet['!cols']
XLSX.utils.book_append_sheet(priorYear, priorSheet, 'Supplier Register')
XLSX.writeFile(
  priorYear,
  resolve(outDir, 'Thandeka_Industrial_Supplier_Register_2025.xlsx'),
)

// --- Expected-score projection (used to sanity-check the demonstration data) ---
const TMPS = 75000000
const categories = [
  ['All B-BBEE Suppliers', 0.8, 5, () => true],
  ['All QSEs', 0.15, 3, (s) => s[1] === 'QSE'],
  ['All EMEs', 0.15, 4, (s) => s[1] === 'EME'],
  ['51% Black Owned', 0.5, 11, (s) => s[3] === 'Yes'],
  ['30% Black Women Owned', 0.12, 4, (s) => s[4] === 'Yes'],
  ['51% Black Designated Groups', 0.02, 2, (s) => s[5] === 'Yes'],
]

const valid = suppliers.filter((s) => typeof s[6] === 'number' && s[6] > 0)
const totalSpend = valid.reduce((sum, s) => sum + s[6], 0)
let total = 0
console.log(`Supplier rows: ${suppliers.length} (importable ${valid.length})`)
console.log(`Total supplier spend: R${totalSpend.toLocaleString('en-ZA')}`)
console.log(`TMPS: R${TMPS.toLocaleString('en-ZA')}\n`)
for (const [label, target, max, filter] of categories) {
  const recognised = valid
    .filter(filter)
    .reduce((sum, s) => sum + s[6] * RECOGNITION[s[2]], 0)
  const achieved = recognised / TMPS
  const points = Math.min((achieved / target) * max, max)
  total += points
  console.log(
    `${label.padEnd(30)} target ${(target * 100).toFixed(0).padStart(3)}%  achieved ${(achieved * 100).toFixed(2).padStart(6)}%  points ${points.toFixed(2)} / ${max}`,
  )
}
console.log(`\nProjected total: ${total.toFixed(2)} / 29`)
console.log(`Workbook written: ${outFile}`)
