#!/usr/bin/env node
/**
 * Real-workbook verification for 51% Flow Through.
 * Does not commit or upload Excel files. Paths may be passed as args or
 * default to Downloads locations used during the audit.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
const XLSX = require('xlsx')

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')

async function loadTs(rel) {
  const abs = path.join(root, rel)
  return import(pathToFileURL(abs).href)
}

function defaultWorkbookPaths() {
  const downloads = path.join(process.env.HOME || '', 'Downloads')
  return {
    old: process.argv[2] || path.join(downloads, 'Procurement test.xlsx'),
    revised:
      process.argv[3] || path.join(downloads, 'Procurement test (002).xlsx'),
  }
}

function flowThroughCellCounts(filePath) {
  const wb = XLSX.read(fs.readFileSync(filePath), {
    type: 'buffer',
    cellFormula: true,
    cellText: true,
    raw: true,
  })
  const sheetName = wb.SheetNames.find((n) => n.trim() === 'Procurement')
  if (!sheetName) {
    throw new Error(`No Procurement sheet in ${filePath}`)
  }
  const ws = wb.Sheets[sheetName]
  const headers = []
  for (let c = 0; c < 30; c++) {
    const addr = XLSX.utils.encode_cell({ r: 17, c })
    headers.push(String(ws[addr]?.v ?? '').trim())
  }
  const flowIdx = headers.findIndex((h) =>
    /flow[\s-]*through/i.test(h.replace(/%/g, '')),
  )
  const counts = { Yes: 0, No: 0, Blank: 0, Other: 0 }
  if (flowIdx < 0) {
    return { headers, flowIdx, counts, hasColumn: false }
  }
  for (let r = 18; r <= 925; r++) {
    const addr = XLSX.utils.encode_cell({ r, c: flowIdx })
    const raw = String(ws[addr]?.v ?? '').trim()
    if (!raw) counts.Blank++
    else if (/^yes$/i.test(raw)) counts.Yes++
    else if (/^no$/i.test(raw)) counts.No++
    else counts.Other++
  }
  return { headers, flowIdx, counts, hasColumn: true }
}

async function scoreWorkbook(filePath, tmps) {
  const { parseProcurementExcelBuffer } = await loadTs(
    'src/lib/procurement/excel/parseProcurementWorkbook.ts',
  )
  const { buildSuppliersFromMappedSheet } = await loadTs(
    'src/lib/procurement/excel/buildSuppliers.ts',
  )
  const { calculateSupplierRow } = await loadTs(
    'src/lib/procurement/rows.ts',
  )
  const { aggregateCategoryTotals, calculateProcurementResults } = await loadTs(
    'src/lib/procurement/assessment.ts',
  )

  const parsed = parseProcurementExcelBuffer({
    buffer: fs.readFileSync(filePath),
    filename: path.basename(filePath),
  })
  if (!parsed.ok) {
    throw new Error(JSON.stringify(parsed.issues))
  }
  const built = buildSuppliersFromMappedSheet({
    headers: parsed.columnHeaders,
    dataRows: parsed.dataRows,
    mapping: parsed.autoMapping,
  })
  const calculated = built.suppliers.map(calculateSupplierRow)
  const totals = aggregateCategoryTotals(calculated)
  const result = calculateProcurementResults({
    totals,
    totalMeasuredSpend: tmps,
  })

  const examples = {}
  for (const name of ['IKOPEKELA', 'ACHINTYA']) {
    const row = calculated.find((s) =>
      s.supplier_name.toUpperCase().includes(name),
    )
    if (row) {
      examples[name] = {
        spend: row.value_ex_vat,
        recognition_percent: row.recognition_percent,
        flow_through: !!row.is_51_percent_flow_through,
        bbbee_spend: row.bbbee_spend,
        effective_rate:
          row.value_ex_vat > 0 ? row.bbbee_spend / row.value_ex_vat : 0,
      }
    }
  }

  return {
    file: path.basename(filePath),
    suppliers: built.suppliers.length,
    skipped: built.skippedRows,
    flowThroughEnabled: built.suppliers.filter(
      (s) => s.is_51_percent_flow_through,
    ).length,
    autoMapping: parsed.autoMapping,
    totals,
    score: result.totalScore,
    examples,
    warningsSample: built.rowWarnings.slice(0, 5),
  }
}

const { old, revised } = defaultWorkbookPaths()
for (const f of [old, revised]) {
  if (!fs.existsSync(f)) {
    console.error(`Missing workbook: ${f}`)
    process.exit(1)
  }
}

const oldCells = flowThroughCellCounts(old)
const revisedCells = flowThroughCellCounts(revised)
const oldScore = await scoreWorkbook(old, 3_601_504_216.01)
const revisedScore = await scoreWorkbook(revised, 4_780_350_716.94)

const report = {
  old: {
    path: old,
    hasFlowThroughColumn: oldCells.hasColumn,
    cellCounts: oldCells.counts,
    ...oldScore,
  },
  revised: {
    path: revised,
    hasFlowThroughColumn: revisedCells.hasColumn,
    cellCounts: revisedCells.counts,
    flowHeader: revisedCells.headers[revisedCells.flowIdx] ?? null,
    ...revisedScore,
  },
  expectations: {
    revisedYes: 186,
    revisedNo: 5,
    revisedBlank: 717,
    oldScore: 26.4881247015,
    revisedScore: 25.9379675409,
    ikopekela: 2_117_537_163.504,
    achintya: 287_344_526.9274,
  },
}

const checks = {
  oldDefaultsFalse:
    !oldCells.hasColumn && oldScore.flowThroughEnabled === 0,
  revisedMapsFlowThrough:
    revisedScore.autoMapping.flow_through === '51% Flow through' ||
    /flow through/i.test(String(revisedScore.autoMapping.flow_through ?? '')),
  revisedYesCount: revisedCells.counts.Yes === 186,
  revisedNoCount: revisedCells.counts.No === 5,
  revisedBlankCount: revisedCells.counts.Blank === 717,
  oldScoreParity: Math.abs(oldScore.score - 26.4881247015) < 1e-8,
  revisedScoreParity: Math.abs(revisedScore.score - 25.9379675409) < 1e-8,
  ikopekela:
    Math.abs((revisedScore.examples.IKOPEKELA?.bbbee_spend ?? 0) - 2_117_537_163.504) <
    1e-3,
  achintya:
    Math.abs((revisedScore.examples.ACHINTYA?.bbbee_spend ?? 0) - 287_344_526.9274) <
    1e-3,
  rowsPast27: oldScore.suppliers > 27 && revisedScore.suppliers > 27,
}

report.checks = checks
report.ok = Object.values(checks).every(Boolean)

console.log(JSON.stringify(report, null, 2))
process.exit(report.ok ? 0 : 2)
