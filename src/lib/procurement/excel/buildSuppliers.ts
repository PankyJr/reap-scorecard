import type { ProcurementSupplierInput } from '@/lib/procurement/rows'
import type {
  ProcurementExcelCell,
  ProcurementExcelColumnMapping,
  ProcurementExcelMappedField,
  ProcurementExcelParseIssue,
} from './types'
import { PROCUREMENT_EXCEL_MAPPED_FIELDS } from './types'
import {
  PROCUREMENT_EXCEL_HEADER_ONLY_NO_DATA_ROWS,
  PROCUREMENT_EXCEL_NO_SUPPLIER_LINES_BELOW_HEADER,
  PROCUREMENT_EXCEL_NO_SUPPLIERS_MAPPING_OR_SPEND,
} from './constants'
import { normalizeHeaderLabel } from './detect'
import { parseSpend } from './parseSpend'

export { parseSpend } from './parseSpend'

function parsePercentOrBoolean(raw: unknown): { pct: number | null; bool: boolean | null } {
  if (raw == null || raw === '') return { pct: null, bool: null }
  if (typeof raw === 'boolean') return { pct: null, bool: raw }
  const s = String(raw).trim().toLowerCase()
  if (['yes', 'y', 'true', '1', 'x'].includes(s)) return { pct: null, bool: true }
  if (['no', 'n', 'false', '0', ''].includes(s)) return { pct: null, bool: false }
  const n = parseSpend(raw)
  if (Number.isFinite(n)) {
    if (n >= 0 && n <= 1 && !String(raw).includes('%')) {
      return { pct: n * 100, bool: null }
    }
    return { pct: n, bool: null }
  }
  return { pct: null, bool: null }
}

/** Aligns with SuppliersTable bulk import */
export function normalizeRecognitionLevel(raw: unknown): string {
  const s = String(raw ?? '').trim()
  if (!s) return 'Non-Compliant'
  if (s === 'Non-compliant' || s === 'Non-Compliant') return 'Non-Compliant'
  const lower = s.toLowerCase()
  if (lower === 'non-compliant' || lower === 'non compliant') return 'Non-Compliant'
  const levelWord = /^level\s*([1-8])$/i.exec(s)
  if (levelWord) return levelWord[1]
  if (/^[1-8]$/.test(s)) return s
  const nc = /^level\s*(nc|non)/i.exec(s)
  if (nc) return 'Non-Compliant'
  return 'Non-Compliant'
}

function columnIndexForMapping(
  headers: string[],
  mapping: ProcurementExcelColumnMapping,
  field: ProcurementExcelMappedField,
): number {
  const mapped = mapping[field]
  if (mapped == null || mapped === '') return -1
  const idx = headers.findIndex((h) => h === mapped)
  if (idx >= 0) return idx
  const norm = normalizeHeaderLabel(mapped)
  return headers.findIndex((h) => normalizeHeaderLabel(h) === norm)
}

/** Workbook “DESIGNATED” flag column (black designated group designation), normalized label only. */
function columnIndexForDesignatedFlag(headers: string[]): number {
  return headers.findIndex((h) => normalizeHeaderLabel(h) === 'designated')
}

/**
 * Column for 51% black designated group suppliers (header pattern), excluding the plain
 * “DESIGNATED” flag column so DESIGNATED + 51% BDGS can be combined with AND logic.
 */
function columnIndexFor51BdgsHeader(headers: string[]): number {
  return headers.findIndex((h) => {
    const raw = String(h ?? '').trim()
    if (!raw) return false
    const n = normalizeHeaderLabel(h)
    if (n === 'designated') return false
    if (n === 'bdgs' || n === 'bdg') return true
    const lower = raw.toLowerCase().replace(/\s+/g, ' ')
    if (/\b51\s*%?\s*bdg?s?\b/i.test(lower)) return true
    if (/black\s+designated\s+group/i.test(lower)) return true
    return false
  })
}

/** Y/N or ≥51% share — same interpretation as the BO column for “51%” style cells. */
function cellQualifies51Bdgs(raw: unknown): boolean {
  const { pct, bool } = parsePercentOrBoolean(raw)
  if (bool === true) return true
  if (pct != null) return pct >= 51
  return false
}

function cellTruthyDesignated(raw: unknown): boolean {
  return parsePercentOrBoolean(raw).bool === true
}

/** Section / aggregate row labels — not company names (avoid skipping "Total …" suppliers). */
function isLikelyAggregateOrSectionRowLabel(name: string): boolean {
  const t = name.trim().toLowerCase()
  if (t === 'total' || t === 'grand total' || t === 'subtotal') return true
  return /^(total|subtotal)\s+(measured|procurement|spend|recognition|bbbee|b[\s-]?bbee)\b/i.test(
    name.trim(),
  )
}

/**
 * Generic scorecard Procurement tabs often list B-BBEE **category / criteria** roll-ups in the
 * same Vendor column as real suppliers. These are not company names.
 *
 * Patterns are anchored or specific so names like "Acme Supplies", "Kopano Tech Solutions",
 * or "… (Pty) Ltd" are not skipped.
 */
export function isLikelyProcurementCategoryRowLabel(name: string): boolean {
  const raw = name.trim()
  if (!raw) return false
  const t = raw.replace(/\s+/g, ' ').trim()
  const lower = t.toLowerCase()

  if (/^all\s+b[\s-]?bbee\s+suppliers$/i.test(lower)) return true
  if (/^from\s+all\s+qses?$/i.test(lower)) return true
  if (/^from\s+all\s+emes?$/i.test(lower)) return true
  if (/^spend\s+with\s+at\s+least/i.test(lower)) return true
  if (/^bonus:\s*spend/i.test(lower)) return true

  if (/^spend\s+with\b/i.test(lower) && /black\s+owned\s+supplier/i.test(lower)) return true
  if (/^spend\s+with\b/i.test(lower) && /black\s+women\s+owned\s+supplier/i.test(lower)) return true

  if ((/^bonus\b/i.test(lower) || /^spend\b/i.test(lower)) && /black\s+designated\s+group/i.test(lower)) {
    return true
  }

  return false
}

/**
 * Generic scorecard Procurement tabs may place **section titles** or a pasted **measurement /
 * points header** row in the Vendor column. These are not suppliers and often have non-numeric
 * spend — skip quietly (no {@link BuildSuppliersResult.rowWarnings} for invalid spend).
 */
export function isLikelyProcurementScorecardSectionOrHeaderRowLabel(name: string): boolean {
  const raw = name.trim()
  if (!raw) return false
  const t = raw.toLowerCase().replace(/\s+/g, ' ')

  if (/measurement\s+category\s*(&|and)\s*criteria/i.test(t)) return true

  if (/\btarget\b/.test(t) && /\bavailable\s+points?\b/.test(t)) return true
  if (/\bachieved\b/.test(t) && (raw.includes('%') || t.includes('%')) && /\bpoints?\s+achieved\b/.test(t)) {
    return true
  }

  if (/^(target|available\s+points?|achieved\s*%|points?\s+achieved)$/i.test(raw.trim())) {
    return true
  }

  return false
}

/** Largest column index referenced by the current mapping (inclusive). */
export function maxMappedColumnIndex(
  headers: string[],
  mapping: ProcurementExcelColumnMapping,
): number {
  let maxI = Math.max(0, headers.length - 1)
  for (const f of PROCUREMENT_EXCEL_MAPPED_FIELDS) {
    const i = columnIndexForMapping(headers, mapping, f)
    if (i > maxI) maxI = i
  }
  return maxI
}

export interface BuildSuppliersSkipDetail {
  /** 1-based index within `dataRows` (first data row after header = 1). */
  dataRowIndex: number
  reason: string
}

export interface BuildSuppliersResult {
  suppliers: ProcurementSupplierInput[]
  rowWarnings: string[]
  issues: ProcurementExcelParseIssue[]
  skippedRows: number
  /**
   * When zero suppliers were produced: distinguishes template/category-only sheets from
   * mapping or invalid spend on named rows (drives UI copy).
   */
  emptyImportKind:
    | 'none'
    | 'header_only'
    | 'category_template'
    | 'needs_mapping'
  /** Present when {@link buildSuppliersFromMappedSheet} was called with `collectSkipDetails`. */
  skipDetails?: BuildSuppliersSkipDetail[]
}

export function buildSuppliersFromMappedSheet(args: {
  headers: string[]
  dataRows: ProcurementExcelCell[][]
  mapping: ProcurementExcelColumnMapping
  /** When set, populate `skipDetails` (capped) for import diagnostics. */
  collectSkipDetails?: boolean
  skipDetailsLimit?: number
}): BuildSuppliersResult {
  const {
    headers,
    dataRows,
    mapping,
    collectSkipDetails = false,
    skipDetailsLimit = 40,
  } = args
  const issues: ProcurementExcelParseIssue[] = []
  const rowWarnings: string[] = []
  const suppliers: ProcurementSupplierInput[] = []
  let skippedRows = 0
  let emptyImportKind: BuildSuppliersResult['emptyImportKind'] = 'none'
  const skipDetails: BuildSuppliersSkipDetail[] = []
  const pushSkip = (dataRowIndex: number, reason: string) => {
    if (
      collectSkipDetails &&
      skipDetails.length < skipDetailsLimit
    ) {
      skipDetails.push({ dataRowIndex, reason })
    }
  }

  const idxName = columnIndexForMapping(headers, mapping, 'supplier_name')
  const idxSpend = columnIndexForMapping(headers, mapping, 'spend_amount')
  const idxLevel = columnIndexForMapping(headers, mapping, 'bbb_level')
  const idxBo = columnIndexForMapping(headers, mapping, 'black_ownership')
  const idxBwo = columnIndexForMapping(headers, mapping, 'black_women_ownership')
  const idxType = columnIndexForMapping(headers, mapping, 'supplier_type')
  const idxQseStandalone = headers.findIndex(
    (h) => normalizeHeaderLabel(h) === 'qse',
  )
  const idxEmeStandalone = headers.findIndex(
    (h) => normalizeHeaderLabel(h) === 'eme',
  )

  if (idxName < 0 || idxSpend < 0) {
    issues.push({
      level: 'error',
      message:
        'Supplier name and spend amount columns must be mapped before rows can be read.',
    })
    return {
      suppliers,
      rowWarnings,
      issues,
      skippedRows,
      emptyImportKind: 'needs_mapping',
    }
  }

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i] ?? []
    const nameRaw = row[idxName]
    const name = String(nameRaw ?? '').trim()
    if (!name) {
      skippedRows++
      pushSkip(
        i + 1,
        `empty supplier name (spendRaw=${JSON.stringify(row[idxSpend] ?? null)}, spendParsed=${parseSpend(row[idxSpend] ?? null)})`,
      )
      continue
    }

    if (isLikelyAggregateOrSectionRowLabel(name)) {
      skippedRows++
      pushSkip(
        i + 1,
        `treated as aggregate/section row (“${name.slice(0, 40)}”)`,
      )
      continue
    }

    if (isLikelyProcurementCategoryRowLabel(name)) {
      skippedRows++
      pushSkip(
        i + 1,
        `treated as procurement category / criteria row (“${name.slice(0, 60)}”)`,
      )
      continue
    }

    if (isLikelyProcurementScorecardSectionOrHeaderRowLabel(name)) {
      skippedRows++
      pushSkip(
        i + 1,
        `treated as scorecard section / header row (“${name.slice(0, 80)}”)`,
      )
      continue
    }

    const spend = parseSpend(row[idxSpend] ?? null)
    if (!Number.isFinite(spend) || spend < 0) {
      skippedRows++
      const rawSpend = row[idxSpend] ?? null
      pushSkip(
        i + 1,
        `spend not a valid non-negative number (supplierRaw=${JSON.stringify(nameRaw)}, spendRaw=${JSON.stringify(rawSpend)}, spendParsed=${spend})`,
      )
      if (
        !isLikelyProcurementScorecardSectionOrHeaderRowLabel(name) &&
        !isLikelyProcurementCategoryRowLabel(name)
      ) {
        rowWarnings.push(
          `Row ${i + 1} (“${name.slice(0, 48)}${name.length > 48 ? '…' : ''}”): spend is not a valid number — skipped.`,
        )
      }
      continue
    }
    if (spend === 0) {
      skippedRows++
      pushSkip(
        i + 1,
        `spend is zero (supplierRaw=${JSON.stringify(nameRaw)}, spendRaw=${JSON.stringify(row[idxSpend] ?? null)})`,
      )
      rowWarnings.push(
        `Row ${i + 1} (“${name.slice(0, 48)}${name.length > 48 ? '…' : ''}”): spend is zero — skipped.`,
      )
      continue
    }

    const level =
      idxLevel >= 0
        ? normalizeRecognitionLevel(row[idxLevel])
        : 'Non-Compliant'

    let supplier_type: ProcurementSupplierInput['supplier_type'] = 'Generic'
    if (idxType >= 0) {
      const rawType = row[idxType]
      const t = String(rawType ?? '')
        .trim()
        .toUpperCase()
      if (t === 'EME') supplier_type = 'EME'
      else if (t === 'QSE') supplier_type = 'QSE'
      else if (['Y', 'YES', 'X', 'TRUE', '1'].includes(t)) {
        const hn = normalizeHeaderLabel(headers[idxType])
        if (hn === 'qse') supplier_type = 'QSE'
        else if (hn === 'eme') supplier_type = 'EME'
      }
    }

    if (supplier_type === 'Generic' && (idxQseStandalone >= 0 || idxEmeStandalone >= 0)) {
      const entityFlagOnly = (raw: unknown) => {
        const s = String(raw ?? '').trim().toUpperCase()
        return ['Y', 'YES', 'X', 'TRUE', '1'].includes(s) || s === 'EME' || s === 'QSE'
      }
      const emeOn =
        idxEmeStandalone >= 0 && entityFlagOnly(row[idxEmeStandalone])
      const qseOn =
        idxQseStandalone >= 0 && entityFlagOnly(row[idxQseStandalone])
      if (emeOn && !qseOn) supplier_type = 'EME'
      else if (qseOn && !emeOn) supplier_type = 'QSE'
    }

    let is_51_black_owned = false
    if (idxBo >= 0) {
      const { pct, bool } = parsePercentOrBoolean(row[idxBo])
      if (bool === true) is_51_black_owned = true
      else if (pct != null) is_51_black_owned = pct >= 51
    }

    let is_30_black_women_owned = false
    if (idxBwo >= 0) {
      const { pct, bool } = parsePercentOrBoolean(row[idxBwo])
      if (bool === true) is_30_black_women_owned = true
      else if (pct != null) is_30_black_women_owned = pct >= 30
    }

    const idxBdgsMapped = columnIndexForMapping(headers, mapping, 'bdgs_51')
    const idxDesignated = columnIndexForDesignatedFlag(headers)
    const idx51BdgsAuto = columnIndexFor51BdgsHeader(headers)

    let is_51_bdgs = false
    if (
      idxDesignated >= 0 &&
      idx51BdgsAuto >= 0 &&
      idxDesignated !== idx51BdgsAuto
    ) {
      is_51_bdgs =
        cellTruthyDesignated(row[idxDesignated]) &&
        cellQualifies51Bdgs(row[idx51BdgsAuto])
    } else if (idxBdgsMapped >= 0) {
      is_51_bdgs = cellQualifies51Bdgs(row[idxBdgsMapped])
    } else if (idx51BdgsAuto >= 0) {
      is_51_bdgs = cellQualifies51Bdgs(row[idx51BdgsAuto])
    }

    suppliers.push({
      supplier_name: name,
      supplier_type,
      level,
      value_ex_vat: spend,
      is_51_black_owned,
      is_30_black_women_owned,
      is_51_bdgs,
    })
  }

  if (suppliers.length === 0) {
    if (dataRows.length === 0) {
      emptyImportKind = 'header_only'
      issues.push({
        level: 'info',
        message: PROCUREMENT_EXCEL_HEADER_ONLY_NO_DATA_ROWS,
      })
    } else if (rowWarnings.length === 0) {
      emptyImportKind = 'category_template'
      issues.push({
        level: 'info',
        message: PROCUREMENT_EXCEL_NO_SUPPLIER_LINES_BELOW_HEADER,
      })
    } else {
      emptyImportKind = 'needs_mapping'
      issues.push({
        level: 'warning',
        message: PROCUREMENT_EXCEL_NO_SUPPLIERS_MAPPING_OR_SPEND,
      })
    }
  }

  return {
    suppliers,
    rowWarnings,
    issues,
    skippedRows,
    emptyImportKind,
    ...(collectSkipDetails && skipDetails.length > 0 ? { skipDetails } : {}),
  }
}

export type ProcurementRowSkimDiagnosticRow = {
  dataRowIndex: number
  supplierRaw: ProcurementExcelCell
  spendRaw: ProcurementExcelCell
  spendParsed: number
  skipReason: string | null
  included: boolean
}

/** Server-side diagnostics: mapped column indexes + first N data rows with skip classification. */
export function procurementRowSkimDiagnostics(args: {
  headers: string[]
  dataRows: ProcurementExcelCell[][]
  mapping: ProcurementExcelColumnMapping
  limit?: number
}): {
  mappedIndexes: Partial<Record<ProcurementExcelMappedField, number>>
  firstDataRowLength: number
  rows: ProcurementRowSkimDiagnosticRow[]
} {
  const limit = args.limit ?? 20
  const fields: ProcurementExcelMappedField[] = [
    'supplier_name',
    'spend_amount',
    'bbb_level',
    'black_ownership',
    'black_women_ownership',
    'bdgs_51',
    'procurement_recognition',
    'supplier_type',
  ]
  const mappedIndexes: Partial<Record<ProcurementExcelMappedField, number>> = {}
  for (const f of fields) {
    mappedIndexes[f] = columnIndexForMapping(args.headers, args.mapping, f)
  }

  const idxName = mappedIndexes.supplier_name ?? -1
  const idxSpend = mappedIndexes.spend_amount ?? -1
  const rows: ProcurementRowSkimDiagnosticRow[] = []

  if (idxName < 0 || idxSpend < 0) {
    return {
      mappedIndexes,
      firstDataRowLength: args.dataRows[0]?.length ?? 0,
      rows: [],
    }
  }

  for (let i = 0; i < Math.min(limit, args.dataRows.length); i++) {
    const row = args.dataRows[i] ?? []
    const supplierRaw = row[idxName] ?? null
    const spendRaw = row[idxSpend] ?? null
    const name = String(supplierRaw ?? '').trim()
    const spendParsed = parseSpend(spendRaw)

    if (!name) {
      rows.push({
        dataRowIndex: i + 1,
        supplierRaw,
        spendRaw,
        spendParsed,
        skipReason: 'empty supplier name',
        included: false,
      })
      continue
    }

    if (isLikelyAggregateOrSectionRowLabel(name)) {
      rows.push({
        dataRowIndex: i + 1,
        supplierRaw,
        spendRaw,
        spendParsed,
        skipReason: `treated as aggregate/section row (“${name.slice(0, 40)}”)`,
        included: false,
      })
      continue
    }

    if (isLikelyProcurementCategoryRowLabel(name)) {
      rows.push({
        dataRowIndex: i + 1,
        supplierRaw,
        spendRaw,
        spendParsed,
        skipReason: `treated as procurement category / criteria row (“${name.slice(0, 60)}”)`,
        included: false,
      })
      continue
    }

    if (isLikelyProcurementScorecardSectionOrHeaderRowLabel(name)) {
      rows.push({
        dataRowIndex: i + 1,
        supplierRaw,
        spendRaw,
        spendParsed,
        skipReason: `treated as scorecard section / header row (“${name.slice(0, 80)}”)`,
        included: false,
      })
      continue
    }

    if (!Number.isFinite(spendParsed) || spendParsed < 0) {
      rows.push({
        dataRowIndex: i + 1,
        supplierRaw,
        spendRaw,
        spendParsed,
        skipReason: `spend not a valid non-negative number (raw=${JSON.stringify(spendRaw)})`,
        included: false,
      })
      continue
    }

    if (spendParsed === 0) {
      rows.push({
        dataRowIndex: i + 1,
        supplierRaw,
        spendRaw,
        spendParsed,
        skipReason: 'spend is zero',
        included: false,
      })
      continue
    }

    rows.push({
      dataRowIndex: i + 1,
      supplierRaw,
      spendRaw,
      spendParsed,
      skipReason: null,
      included: true,
    })
  }

  return {
    mappedIndexes,
    firstDataRowLength: args.dataRows[0]?.length ?? 0,
    rows,
  }
}

/** For diagnostics: same acceptance rules as {@link buildSuppliersFromMappedSheet} without mutating state. */
export function previewProcurementDataRows(args: {
  headers: string[]
  dataRows: ProcurementExcelCell[][]
  mapping: ProcurementExcelColumnMapping
  limit?: number
}): Array<{
  dataRowIndex: number
  supplierName: string
  spendRaw: ProcurementExcelCell
  spendParsed: number
  wouldInclude: boolean
  skipReason: string | null
}> {
  const limit = args.limit ?? 10
  const idxName = columnIndexForMapping(args.headers, args.mapping, 'supplier_name')
  const idxSpend = columnIndexForMapping(args.headers, args.mapping, 'spend_amount')
  const out: Array<{
    dataRowIndex: number
    supplierName: string
    spendRaw: ProcurementExcelCell
    spendParsed: number
    wouldInclude: boolean
    skipReason: string | null
  }> = []

  if (idxName < 0 || idxSpend < 0) {
    for (let i = 0; i < Math.min(limit, args.dataRows.length); i++) {
      out.push({
        dataRowIndex: i + 1,
        supplierName: '',
        spendRaw: null,
        spendParsed: NaN,
        wouldInclude: false,
        skipReason: 'missing supplier_name or spend_amount column index',
      })
    }
    return out
  }

  for (let i = 0; i < Math.min(limit, args.dataRows.length); i++) {
    const row = args.dataRows[i] ?? []
    const nameRaw = row[idxName]
    const name = String(nameRaw ?? '').trim()
    const spendRaw = row[idxSpend] ?? null
    const spend = parseSpend(spendRaw)

    if (!name) {
      out.push({
        dataRowIndex: i + 1,
        supplierName: name,
        spendRaw,
        spendParsed: spend,
        wouldInclude: false,
        skipReason: 'empty supplier name',
      })
      continue
    }

    if (isLikelyAggregateOrSectionRowLabel(name)) {
      out.push({
        dataRowIndex: i + 1,
        supplierName: name,
        spendRaw,
        spendParsed: spend,
        wouldInclude: false,
        skipReason: `treated as aggregate/section row (“${name.slice(0, 40)}”)`,
      })
      continue
    }

    if (isLikelyProcurementCategoryRowLabel(name)) {
      out.push({
        dataRowIndex: i + 1,
        supplierName: name,
        spendRaw,
        spendParsed: spend,
        wouldInclude: false,
        skipReason: `treated as procurement category / criteria row (“${name.slice(0, 60)}”)`,
      })
      continue
    }

    if (isLikelyProcurementScorecardSectionOrHeaderRowLabel(name)) {
      out.push({
        dataRowIndex: i + 1,
        supplierName: name,
        spendRaw,
        spendParsed: spend,
        wouldInclude: false,
        skipReason: `treated as scorecard section / header row (“${name.slice(0, 80)}”)`,
      })
      continue
    }

    if (!Number.isFinite(spend) || spend < 0) {
      out.push({
        dataRowIndex: i + 1,
        supplierName: name,
        spendRaw,
        spendParsed: spend,
        wouldInclude: false,
        skipReason: `spend not a valid non-negative number (raw=${JSON.stringify(spendRaw)})`,
      })
      continue
    }

    if (spend === 0) {
      out.push({
        dataRowIndex: i + 1,
        supplierName: name,
        spendRaw,
        spendParsed: spend,
        wouldInclude: false,
        skipReason: 'spend is zero',
      })
      continue
    }

    out.push({
      dataRowIndex: i + 1,
      supplierName: name,
      spendRaw,
      spendParsed: spend,
      wouldInclude: true,
      skipReason: null,
    })
  }

  return out
}
