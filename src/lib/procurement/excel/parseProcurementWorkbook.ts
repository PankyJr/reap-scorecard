import * as XLSX from 'xlsx'
import type {
  ProcurementExcelColumnMapping,
  ProcurementExcelParseIssue,
  ProcurementExcelParseResult,
  ProcurementExcelParseSuccess,
  ProcurementExcelCell,
} from './types'
import {
  MAX_PROCUREMENT_EXCEL_DATA_ROWS,
  PROCUREMENT_CATEGORY_ALLOCATION_INFO_MESSAGE,
  PROCUREMENT_SUPPLIER_SHEET_NAME_HINTS,
} from './constants'
import {
  buildProcurementColumnAutoMap,
  collectKeywordHitsInSheet,
  findLikelyHeaderRowIndex,
  pickBestSupplierSheet,
  procurementCategoryAllocationLikely,
  supplierSheetNamePriority,
  workbookHasProcurementOrTmpsContext,
} from './detect'
import { buildSuppliersFromMappedSheet, maxMappedColumnIndex, procurementRowSkimDiagnostics } from './buildSuppliers'
import { isProcurementExcelImportDebugEnabled } from './importDebug'
import {
  packSparseDataRowToHeaderColumns,
  usedRangeColumnCount,
} from './alignProcurementDataRow'
import { readSheetDenseAoAWithMerges } from './denseSheetAoA'
import { tryDetectTmpsTotalFromRows } from './tmpsDetection'
import { unwrapCellValue } from './parseSpend'

function cellValueToSerializable(
  raw: unknown,
  issues: ProcurementExcelParseIssue[],
  context: string,
): ProcurementExcelCell {
  const inner = unwrapCellValue(raw)
  if (inner == null || inner === '') return null
  if (typeof inner === 'number') {
    if (Number.isNaN(inner) || !Number.isFinite(inner)) {
      issues.push({
        level: 'warning',
        message: `${context}: invalid numeric cell — treated as empty.`,
      })
      return null
    }
    return inner
  }
  const s = String(inner).trim()
  if (s.startsWith('#')) {
    issues.push({
      level: 'warning',
      message: `${context}: Excel error ${s} — treated as empty.`,
    })
    return null
  }
  return s
}

function mappingMapToObject(
  m: Map<string, string>,
): ProcurementExcelColumnMapping {
  const o: ProcurementExcelColumnMapping = {}
  for (const [k, v] of m) {
    o[k as keyof ProcurementExcelColumnMapping] = v
  }
  return o
}

function suggestedTmpsFromAllSheets(
  sheetNames: string[],
  getRows: (name: string) => unknown[][],
): number | null {
  for (const name of sheetNames) {
    const t = tryDetectTmpsTotalFromRows(getRows(name))
    if (t != null) return t
  }
  return null
}

export function parseProcurementExcelBuffer(args: {
  buffer: Buffer
  filename: string
  /** When set, parse this tab for suppliers (must exist and pass header detection). */
  preferredSheet?: string | null
}): ProcurementExcelParseResult {
  const issues: ProcurementExcelParseIssue[] = []
  const workbookName = args.filename || 'workbook'

  let workbook: XLSX.WorkBook
  try {
    workbook = XLSX.read(args.buffer, {
      type: 'buffer',
      cellFormula: false,
      cellText: true,
      raw: true,
      dense: false,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown read error'
    return {
      ok: false,
      workbookName,
      issues: [
        {
          level: 'error',
          message: `Could not read this Excel file (${msg}). Try saving as .xlsx or .xls and upload again.`,
        },
      ],
    }
  }

  const sheetNames = workbook.SheetNames.filter(Boolean)
  if (sheetNames.length === 0) {
    return {
      ok: false,
      workbookName,
      issues: [{ level: 'error', message: 'The workbook has no sheets.' }],
    }
  }

  const sheetRows = new Map<string, unknown[][]>()
  const keywordHitsBySheet: Record<string, string[]> = {}

  for (const name of sheetNames) {
    const ws = workbook.Sheets[name]
    if (!ws) continue
    const rows = readSheetDenseAoAWithMerges(ws)
    sheetRows.set(name, rows)
    keywordHitsBySheet[name] = collectKeywordHitsInSheet(rows)
  }

  const getRows = (n: string) => sheetRows.get(n) ?? []

  const preferred = args.preferredSheet?.trim() || null
  let selectedSheet: string | null = null
  let detectionMethod: ProcurementExcelParseSuccess['detectionMethod'] = 'none'

  if (preferred) {
    if (!sheetNames.includes(preferred)) {
      return {
        ok: false,
        workbookName,
        issues: [
          {
            level: 'error',
            message: `No sheet named “${preferred}” in this workbook. Available tabs: ${sheetNames.join(', ')}.`,
          },
        ],
      }
    }
    const headerTry = findLikelyHeaderRowIndex(getRows(preferred))
    if (!headerTry) {
      return {
        ok: false,
        workbookName,
        issues: [
          {
            level: 'error',
            message: `Could not find a header row with both a supplier column and a spend column on “${preferred}”. Try another tab or use a supplier register layout.`,
          },
        ],
      }
    }
    selectedSheet = preferred
    detectionMethod = 'manual_sheet'
  } else {
    selectedSheet = pickBestSupplierSheet(sheetNames, getRows)
    if (!selectedSheet) {
      const suggestedTmpsTotal = suggestedTmpsFromAllSheets(sheetNames, getRows)
      const procurementOrTmpsContext =
        suggestedTmpsTotal != null ||
        workbookHasProcurementOrTmpsContext(sheetNames, getRows)
      const blockedIssues: ProcurementExcelParseIssue[] = []
      if (suggestedTmpsTotal != null) {
        blockedIssues.push({
          level: 'info',
          message: `A possible TMPS total was read (${suggestedTmpsTotal.toLocaleString('en-ZA', { maximumFractionDigits: 2 })}). This is not applied automatically—enter TMPS inclusions and exclusions in the form above.`,
        })
      }
      return {
        ok: true,
        workbookName,
        sheetNames,
        detectionMethod: 'none',
        selectedSheetName: null,
        headerRowIndex: null,
        columnHeaders: [],
        dataRows: [],
        totalRowCountInSheet: 0,
        truncated: false,
        autoMapping: {},
        issues: blockedIssues,
        suggestedTmpsTotal,
        keywordHitsBySheet,
        supplierImportBlockedReason: 'no_supplier_register',
        supplierImportBlockedWorkbookContext: procurementOrTmpsContext
          ? 'procurement_or_tmps'
          : 'generic',
      }
    }

    const pr = supplierSheetNamePriority(selectedSheet)
    detectionMethod =
      pr < PROCUREMENT_SUPPLIER_SHEET_NAME_HINTS.length
        ? 'exact_sheet_name'
        : 'header_keywords'
  }

  const rows = getRows(selectedSheet!)
  const headerFind = findLikelyHeaderRowIndex(rows)
  if (!headerFind) {
    issues.push({
      level: 'error',
      message: `Could not find a header row with both a supplier column and a spend column on “${selectedSheet}”.`,
    })
    return {
      ok: false,
      workbookName,
      issues,
    }
  }

  const { index: headerRowIndex, headers } = headerFind
  const autoMap = buildProcurementColumnAutoMap(headers)
  const autoMapping = mappingMapToObject(autoMap)

  const selectedWs = workbook.Sheets[selectedSheet!]
  let scanMax = headers.length
  const scanEnd = Math.min(rows.length, headerRowIndex + 1 + 500)
  for (let rr = headerRowIndex + 1; rr < scanEnd; rr++) {
    scanMax = Math.max(scanMax, (rows[rr] ?? []).length)
  }
  const baseRowWidth = Math.max(
    headers.length,
    usedRangeColumnCount(selectedWs, headers.length),
    maxMappedColumnIndex(headers, autoMapping) + 1,
    scanMax,
  )

  const dataRows: ProcurementExcelCell[][] = []
  let totalDataRows = 0
  let truncated = false

  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const rawRow = rows[r] ?? []
    const any = rawRow.some((v) => v != null && String(v).trim() !== '')
    if (!any) continue
    totalDataRows++
    if (dataRows.length >= MAX_PROCUREMENT_EXCEL_DATA_ROWS) {
      truncated = true
      break
    }
    const aligned = packSparseDataRowToHeaderColumns(rawRow, headers)
    const rowWidth = Math.max(baseRowWidth, rawRow.length, aligned.length)
    const outRow: ProcurementExcelCell[] = []
    const alignedLen = aligned.length
    for (let c = 0; c < rowWidth; c++) {
      const raw = c < alignedLen ? aligned[c] : rawRow[c]
      outRow.push(
        cellValueToSerializable(
          raw,
          issues,
          `“${selectedSheet}” data row ${r + 1}, column ${c + 1}`,
        ),
      )
    }
    dataRows.push(outRow)
  }

  if (truncated) {
    issues.push({
      level: 'warning',
      message: `Only the first ${MAX_PROCUREMENT_EXCEL_DATA_ROWS} data rows were loaded. Split the file or remove unused rows if you need more.`,
    })
  }

  let suggestedTmpsTotal: number | null = tryDetectTmpsTotalFromRows(rows)
  if (suggestedTmpsTotal == null) {
    for (const name of sheetNames) {
      if (name === selectedSheet) continue
      const t = tryDetectTmpsTotalFromRows(getRows(name))
      if (t != null) {
        suggestedTmpsTotal = t
        issues.push({
          level: 'info',
          message: `A possible TMPS total was read from sheet “${name}” (${t.toLocaleString('en-ZA', { maximumFractionDigits: 2 })}). Confirm against your finance workbook before saving.`,
        })
        break
      }
    }
  }

  if (detectionMethod === 'manual_sheet') {
    issues.push({
      level: 'info',
      message: `Using sheet “${selectedSheet}” (tab you selected).`,
    })
  } else {
    issues.push({
      level: 'info',
      message: `Using sheet “${selectedSheet}” (${detectionMethod === 'exact_sheet_name' ? 'matched supplier-register tab name' : 'detected supplier-style headers'}).`,
    })
  }

  const supplierProbe = buildSuppliersFromMappedSheet({
    headers,
    dataRows,
    mapping: autoMapping,
  })
  const emptyImportRowSkim =
    supplierProbe.suppliers.length === 0
      ? procurementRowSkimDiagnostics({
          headers,
          dataRows,
          mapping: autoMapping,
          limit: 20,
        }).rows
      : undefined
  if (
    procurementCategoryAllocationLikely(headers) &&
    supplierProbe.suppliers.length > 0
  ) {
    issues.push({
      level: 'info',
      message: PROCUREMENT_CATEGORY_ALLOCATION_INFO_MESSAGE,
    })
  }

  const debugImportSnapshot =
    isProcurementExcelImportDebugEnabled()
      ? {
          headerRowIndex0Based: headerRowIndex,
          first20RawRowsAfterHeaderInWorkbook: rows
            .slice(headerRowIndex + 1, headerRowIndex + 21)
            .map((row) => [...(row ?? [])]),
          baseSerializedRowWidth: baseRowWidth,
        }
      : undefined

  return {
    ok: true,
    workbookName,
    sheetNames,
    detectionMethod,
    selectedSheetName: selectedSheet,
    headerRowIndex,
    columnHeaders: headers,
    dataRows,
    totalRowCountInSheet: totalDataRows,
    truncated,
    autoMapping,
    issues,
    suggestedTmpsTotal,
    keywordHitsBySheet,
    ...(emptyImportRowSkim !== undefined ? { emptyImportRowSkim } : {}),
    ...(debugImportSnapshot ? { debugImportSnapshot } : {}),
  }
}
