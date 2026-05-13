import * as XLSX from 'xlsx'
import { pickBestSupplierSheet } from '../procurement/excel/detect'
import {
  FULL_SCORECARD_CORE_QUARTET_IDS,
  FULL_SCORECARD_EXPECTED_SHEETS,
  FULL_SCORECARD_MIN_TAB_HITS,
} from './constants'
import { readSheetDenseAoAWithMerges } from './sheetGrid'
import type { ScorecardWorkbookKind } from './types'

export function normalizeWorkbookSheetTitle(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function buildSheetRowsIndexFromBuffer(buffer: Buffer): Map<string, unknown[][]> {
  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    cellFormula: false,
    cellText: true,
    raw: true,
    dense: false,
  })
  const map = new Map<string, unknown[][]>()
  for (const name of workbook.SheetNames) {
    const ws = workbook.Sheets[name]
    if (!ws) continue
    map.set(name, readSheetDenseAoAWithMerges(ws))
  }
  return map
}

export function resolveExpectedSheet(
  sheetNames: string[],
  def: (typeof FULL_SCORECARD_EXPECTED_SHEETS)[number],
): string | null {
  const targets = new Set<string>()
  targets.add(normalizeWorkbookSheetTitle(def.title))
  for (const a of def.aliases ?? []) {
    targets.add(normalizeWorkbookSheetTitle(a))
  }
  for (const name of sheetNames) {
    if (targets.has(normalizeWorkbookSheetTitle(name))) return name
  }
  return null
}

export function countFullScorecardTabHits(sheetNames: string[]): number {
  let hits = 0
  for (const def of FULL_SCORECARD_EXPECTED_SHEETS) {
    if (resolveExpectedSheet(sheetNames, def)) hits++
  }
  return hits
}

export function hasFullScorecardCoreQuartet(sheetNames: string[]): boolean {
  for (const id of FULL_SCORECARD_CORE_QUARTET_IDS) {
    const def = FULL_SCORECARD_EXPECTED_SHEETS.find((s) => s.id === id)
    if (!def) return false
    if (!resolveExpectedSheet(sheetNames, def)) return false
  }
  return true
}

/**
 * Classify upload: full legacy scorecard workbook vs procurement-only register vs unrelated.
 * Uses tab names first; supplier-register uses the same header heuristic as procurement import.
 */
export function detectScorecardWorkbookKind(args: {
  sheetNames: string[]
  getRows: (name: string) => unknown[][]
}): ScorecardWorkbookKind {
  const hits = countFullScorecardTabHits(args.sheetNames)
  if (hits >= FULL_SCORECARD_MIN_TAB_HITS || hasFullScorecardCoreQuartet(args.sheetNames)) {
    return 'full_scorecard'
  }

  const supplierSheet = pickBestSupplierSheet(args.sheetNames, args.getRows)
  if (supplierSheet != null) {
    return 'supplier_register_only'
  }

  return 'unrelated'
}
