import {
  buildSuppliersFromMappedSheet,
  previewProcurementDataRows,
  procurementRowSkimDiagnostics,
} from './buildSuppliers'
import type { ProcurementExcelParseSuccess } from './types'

/**
 * Enable verbose procurement Excel import logs (server terminal or `next dev` stdout).
 * - Always on when `NODE_ENV === 'development'`
 * - Or set `PROCUREMENT_EXCEL_DEBUG=1` in `.env.local` for ad-hoc investigation
 */
export function isProcurementExcelImportDebugEnabled(): boolean {
  return (
    process.env.NODE_ENV === 'development' ||
    process.env.PROCUREMENT_EXCEL_DEBUG === '1'
  )
}

function safeJson(value: unknown, maxLen = 12000): string {
  try {
    const s = JSON.stringify(value, null, 2)
    return s.length > maxLen ? `${s.slice(0, maxLen)}\n…(truncated)` : s
  } catch {
    return String(value)
  }
}

/**
 * Logs one structured snapshot after a parse (and a build using auto-mapping).
 * Does not throw; no-ops when debug is disabled.
 */
export function logProcurementExcelImportDiagnostics(args: {
  filename: string
  preferredSheet: string | null
  parsed: ProcurementExcelParseSuccess
}): void {
  if (!isProcurementExcelImportDebugEnabled()) return

  const { filename, preferredSheet, parsed } = args

  if (parsed.supplierImportBlockedReason) {
    console.info(
      '[PROCUREMENT_EXCEL_IMPORT_DEBUG]',
      safeJson({
        filename,
        preferredSheet,
        blocked: parsed.supplierImportBlockedReason,
        blockedWorkbookContext: parsed.supplierImportBlockedWorkbookContext,
        workbookTabs: parsed.sheetNames,
        suggestedTmpsTotal: parsed.suggestedTmpsTotal,
        note:
          'No tab had both supplier-name and spend columns in the same header row. If this is a generic B-BBEE workbook, supplier lines are usually on a separate register tab—not the Preferential Procurement summary.',
      }),
    )
    return
  }

  const built = buildSuppliersFromMappedSheet({
    headers: parsed.columnHeaders,
    dataRows: parsed.dataRows,
    mapping: parsed.autoMapping,
    collectSkipDetails: true,
    skipDetailsLimit: 100,
  })

  const skim = procurementRowSkimDiagnostics({
    headers: parsed.columnHeaders,
    dataRows: parsed.dataRows,
    mapping: parsed.autoMapping,
    limit: 20,
  })

  const firstRawRows = parsed.dataRows.slice(0, 20).map((row, i) => ({
    dataRowIndex: i + 1,
    cells: row,
  }))

  const rowPreReadProbe = previewProcurementDataRows({
    headers: parsed.columnHeaders,
    dataRows: parsed.dataRows,
    mapping: parsed.autoMapping,
    limit: 20,
  })

  const scorecardSummaryHint =
    'Generic scorecard "Procurement" sheets are often compliance summaries (row labels in one column, % / points in others)—not line-level supplier registers. See src/lib/scorecard/full/extractors/procurement-sheet.ts.'

  console.info(
    '[PROCUREMENT_EXCEL_IMPORT_DEBUG]',
    safeJson({
      filename,
      preferredSheet,
      workbookTabs: parsed.sheetNames,
      selectedSupplierSheet: parsed.selectedSheetName,
      detectionMethod: parsed.detectionMethod,
      headerRowIndex0Based: parsed.headerRowIndex,
      detectedHeaders: parsed.columnHeaders,
      autoMappedFields: parsed.autoMapping,
      mappedColumnIndexes: skim.mappedIndexes,
      firstDataRowSerializedLength: skim.firstDataRowLength,
      dataRowCount: parsed.dataRows.length,
      first20SerializedDataRows: firstRawRows,
      first20RawWorkbookRowsAfterHeader:
        parsed.debugImportSnapshot?.first20RawRowsAfterHeaderInWorkbook ?? null,
      baseSerializedRowWidth: parsed.debugImportSnapshot?.baseSerializedRowWidth ?? null,
      rowSkimFirst20: skim.rows,
      emptyImportRowSkim: parsed.emptyImportRowSkim,
      rowPreReadProbe,
      build: {
        supplierCount: built.suppliers.length,
        skippedRowCount: built.skippedRows,
        first10ParsedSuppliers: built.suppliers.slice(0, 10),
        skipDetails: built.skipDetails ?? [],
        rowWarningsSample: built.rowWarnings.slice(0, 15),
        buildIssues: built.issues,
      },
      layoutHint: scorecardSummaryHint,
      uiNote:
        'Step 3 "Rows" counts SuppliersTable state and only updates after "Apply suppliers to this assessment"—Excel rows read ≠ Rows badge until Apply.',
    }),
  )
}
