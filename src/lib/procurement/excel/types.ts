/**
 * Procurement-only Excel upload types.
 * Designed so additional modules (Ownership, SD, etc.) can follow the same pattern later.
 */

export type ProcurementExcelMappedField =
  | 'supplier_name'
  | 'spend_amount'
  | 'bbb_level'
  | 'black_ownership'
  | 'black_women_ownership'
  | 'procurement_recognition'
  | 'supplier_type'

export const PROCUREMENT_EXCEL_MAPPED_FIELDS: ProcurementExcelMappedField[] = [
  'supplier_name',
  'spend_amount',
  'bbb_level',
  'black_ownership',
  'black_women_ownership',
  'procurement_recognition',
  'supplier_type',
]

export const PROCUREMENT_EXCEL_REQUIRED_FIELDS: ProcurementExcelMappedField[] = [
  'supplier_name',
  'spend_amount',
]

export type ProcurementExcelFieldLabels = Record<
  ProcurementExcelMappedField,
  { label: string; required: boolean }
>

export const PROCUREMENT_EXCEL_FIELD_META: ProcurementExcelFieldLabels = {
  supplier_name: { label: 'Supplier name', required: true },
  spend_amount: { label: 'Spend amount (B-BBEE spend / ex VAT)', required: true },
  bbb_level: { label: 'B-BBEE level', required: false },
  black_ownership: { label: 'Black ownership', required: false },
  black_women_ownership: { label: 'Black women ownership', required: false },
  procurement_recognition: { label: 'Procurement recognition %', required: false },
  supplier_type: { label: 'Supplier type (EME / QSE)', required: false },
}

export type ProcurementExcelDetectionMethod =
  | 'exact_sheet_name'
  | 'header_keywords'
  | 'manual_sheet'
  | 'none'

/** When {@link ProcurementExcelParseSuccess.supplierImportBlockedReason} is set — drives blocked-import copy in the UI. */
export type ProcurementExcelSupplierImportBlockedWorkbookContext =
  | 'procurement_or_tmps'
  | 'generic'

export interface ProcurementExcelParseIssue {
  level: 'error' | 'warning' | 'info'
  message: string
}

export type ProcurementExcelColumnMapping = Partial<
  Record<ProcurementExcelMappedField, string | null>
>

/** Serializable cell for JSON transport */
export type ProcurementExcelCell = string | number | null

/** First data rows after header — import diagnostics when zero suppliers loaded. */
export interface ProcurementExcelRowSkimSample {
  dataRowIndex: number
  supplierRaw: ProcurementExcelCell | null
  spendRaw: ProcurementExcelCell | null
  spendParsed: number
  skipReason: string | null
  included: boolean
}

export interface ProcurementExcelParseSuccess {
  ok: true
  workbookName: string
  sheetNames: string[]
  detectionMethod: ProcurementExcelDetectionMethod
  selectedSheetName: string | null
  headerRowIndex: number | null
  columnHeaders: string[]
  /** Data rows only (no header); aligned to columnHeaders length */
  dataRows: ProcurementExcelCell[][]
  totalRowCountInSheet: number
  truncated: boolean
  autoMapping: ProcurementExcelColumnMapping
  issues: ProcurementExcelParseIssue[]
  suggestedTmpsTotal: number | null
  keywordHitsBySheet: Record<string, string[]>
  /** Workbook read OK but no tab had supplier+spend headers (e.g. TMPS-only file). */
  supplierImportBlockedReason?: 'no_supplier_register'
  /**
   * When import is blocked, whether the workbook looked procurement/TMPS-related (tab names,
   * cell text, or a suggested TMPS figure) vs unrelated — used for context-aware messaging only.
   */
  supplierImportBlockedWorkbookContext?: ProcurementExcelSupplierImportBlockedWorkbookContext
  /**
   * Present only when procurement Excel import debug is enabled (development or
   * `PROCUREMENT_EXCEL_DEBUG=1`) — used for server-side diagnostics, not required by the UI.
   */
  debugImportSnapshot?: {
    headerRowIndex0Based: number
    /** Up to 20 unprocessed worksheet rows immediately after the detected header row. */
    first20RawRowsAfterHeaderInWorkbook: unknown[][]
    /** Min width used when serializing each data row (sheet ref, mapped columns, scan). */
    baseSerializedRowWidth?: number
  }
  /**
   * When no supplier rows were read, first rows with supplier/spend/skip diagnostics
   * (merged cells / formatting issues).
   */
  emptyImportRowSkim?: ProcurementExcelRowSkimSample[]
}

export interface ProcurementExcelParseFailure {
  ok: false
  workbookName: string
  issues: ProcurementExcelParseIssue[]
}

export type ProcurementExcelParseResult =
  | ProcurementExcelParseSuccess
  | ProcurementExcelParseFailure
