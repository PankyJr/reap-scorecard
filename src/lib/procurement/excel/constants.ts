import type { ProcurementExcelMappedField } from './types'

/**
 * Supplier-register tabs only (ordered: more specific names first for tie-breaks).
 * Do NOT include TMPS / "Total Measured Procurement Spend" here — those are finance
 * summary sheets, detected separately for optional TMPS hints only.
 */
export const PROCUREMENT_SUPPLIER_SHEET_NAME_HINTS: string[] = [
  'preferential procurement',
  'procurement',
  'supplier spend',
  'supplier procurement',
  'b-bbee procurement',
  'bbbee procurement',
  'enterprise supplier',
  'supplier register',
  'suppliers',
]

/** Shown when header exists but every data row was skipped (e.g. category lines only). */
export const PROCUREMENT_EXCEL_NO_SUPPLIER_LINES_BELOW_HEADER =
  'Supplier columns were detected, but this sheet has no supplier rows below the header. Add supplier lines under the Procurement tab, or upload a workbook that includes supplier-level procurement data.'

/** Shown when the parser found no data rows after the header row. */
export const PROCUREMENT_EXCEL_HEADER_ONLY_NO_DATA_ROWS =
  'A supplier-style header was detected, but there are no data rows under it yet. Add supplier lines under the Procurement tab, or upload a workbook that includes supplier-level procurement data.'

/** When spend/mapping failed on rows that look like real supplier names. */
export const PROCUREMENT_EXCEL_NO_SUPPLIERS_MAPPING_OR_SPEND =
  'No supplier rows could be read with the current mapping. Check column mapping and that spend values are numeric.'

/** Shown when a workbook looks procurement/TMPS-related but has no supplier register tab. */
export const PROCUREMENT_EXCEL_NO_REGISTER_WITH_PROCUREMENT_OR_TMPS_CONTEXT =
  'We found procurement or TMPS-related information, but no supplier-level register was detected. To calculate procurement supplier recognition, please upload or select a sheet with supplier names and spend amounts.'

/** When the workbook does not look procurement/TMPS-specific (e.g. unrelated schedules). */
export const PROCUREMENT_EXCEL_NO_REGISTER_GENERIC_WORKBOOK =
  'We could not find a supplier register in this workbook. To import procurement suppliers, please upload or select a sheet with supplier names and spend amounts.'

/** Shown when the sheet mixes supplier lines with category-allocation style columns. */
export const PROCUREMENT_CATEGORY_ALLOCATION_INFO_MESSAGE =
  'This sheet appears to use procurement category allocation columns. We detected supplier rows, but category allocation may need confirmation.'

/** Scan sheet text for these tokens (header row / first rows). */
export const PROCUREMENT_HEADER_SCAN_KEYWORDS: string[] = [
  'supplier',
  'vendor',
  'company name',
  'company',
  'spend',
  'amount',
  'invoice value',
  'procurement recognition',
  'b-bbee',
  'bbbee',
  'bee level',
  'black owned',
  'black woman',
  'black women',
  'eme',
  'qse',
  'value adding supplier',
  'tmps',
  'total measured procurement spend',
]

type SynonymList = { field: ProcurementExcelMappedField; synonyms: string[] }

/**
 * Column auto-mapping (except spend — see `pickSpendColumn` / `buildProcurementColumnAutoMap`).
 * Order matters: map `supplier_type` before `procurement_recognition` so short headers
 * like "EME" / "QSE" become type, not recognition %.
 */
export const PROCUREMENT_COLUMN_SYNONYMS: SynonymList[] = [
  {
    field: 'supplier_name',
    synonyms: [
      'supplier',
      'vendor',
      'company',
      'company name',
      'supplier name',
      'supplier / vendor',
      'entity',
    ],
  },
  {
    field: 'bbb_level',
    synonyms: [
      'b-bbee level',
      'bbbee level',
      'bee level',
      'status level',
      'level',
    ],
  },
  {
    field: 'black_ownership',
    synonyms: [
      '51% bo',
      'black owned',
      'black ownership',
      'bo %',
      'black owned %',
      'black ownership %',
      '% black owned',
      'bo',
    ],
  },
  {
    field: 'black_women_ownership',
    synonyms: [
      '30% bwo',
      'black women owned',
      'black woman owned',
      'bwo %',
      'black woman ownership',
      'black women ownership %',
      'bwo',
    ],
  },
  {
    field: 'supplier_type',
    synonyms: [
      'supplier type',
      'entity type',
      'eme/qse',
      'eme / qse',
      'classification',
      'eme',
      'qse',
    ],
  },
  {
    field: 'procurement_recognition',
    synonyms: [
      'b-bbee recognition',
      'bbbee recognition',
      'b-bbee recognition %',
      'recognition %',
      'procurement recognition',
    ],
  },
]

export const MAX_PROCUREMENT_EXCEL_DATA_ROWS = 8000
