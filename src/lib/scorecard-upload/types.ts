/**
 * Client-safe types for full scorecard workbook import preview (no raw JSON blobs).
 */

export type ScorecardWorkbookKind =
  | 'full_scorecard'
  | 'supplier_register_only'
  | 'unrelated'

/** How well we understood a pillar / register tab */
export type ScorecardSheetSummaryStatus =
  | 'summary_detected'
  | 'row_data_detected'
  | 'partial'
  | 'empty_or_unclear'
  | 'missing_sheet'

export interface ScorecardSummaryBlock {
  status: ScorecardSheetSummaryStatus
  /** Short human lines (max ~6 in UI) */
  bullets: string[]
  /** Optional labelled values for the preview panel */
  figures?: { label: string; value: string }[]
}

export interface ScorecardSheetPresenceRow {
  /** Canonical label we look for */
  expectedLabel: string
  /** Actual tab name in the workbook, if matched */
  actualSheetName: string | null
  /** complete = tab + useful parse; summary = tab parsed as calculator/summary; partial = tab present, weak parse; missing = tab absent */
  coverage: 'complete' | 'summary' | 'partial' | 'missing'
  detail: string
}

export interface ScorecardProcurementPreview {
  sheetName: string | null
  supplierRowCount: number
  /** ZAR total from mapped supplier rows when available */
  totalSpendZar: number | null
  totalSpendDisplay: string | null
  /** Requirement (8): summary without line-level suppliers */
  message: string | null
  sampleSuppliers: { name: string; spendDisplay: string }[]
}

export interface ScorecardTmpsPreview {
  sheetName: string | null
  suggestedTotal: number | null
  suggestedTotalDisplay: string | null
  bullets: string[]
}

export interface FullScorecardPreview {
  sheets: ScorecardSheetPresenceRow[]
  ownership: ScorecardSummaryBlock
  managementControl: ScorecardSummaryBlock
  employmentEquity: ScorecardSummaryBlock
  skillsDevelopment: ScorecardSummaryBlock
  tmps: ScorecardTmpsPreview
  procurement: ScorecardProcurementPreview
  edSd: ScorecardSummaryBlock
  sed: ScorecardSummaryBlock
  fullScorecard: ScorecardSummaryBlock
  npat: ScorecardSummaryBlock
  /** Sheets we only detected by name (Instructions, Cat A, …) without pillar-specific parsers */
  otherRegisters: ScorecardSummaryBlock
  missingOrUnclearSections: string[]
}

export interface FullScorecardParseIssue {
  level: 'error' | 'warning' | 'info'
  message: string
}

export interface FullScorecardParseSuccess {
  ok: true
  workbookName: string
  workbookKind: ScorecardWorkbookKind
  issues: FullScorecardParseIssue[]
  /** Set when workbookKind === 'full_scorecard' */
  preview?: FullScorecardPreview
  /** Short guidance when not a full scorecard workbook */
  guidance?: string
}

export interface FullScorecardParseFailure {
  ok: false
  workbookName: string
  issues: FullScorecardParseIssue[]
}

export type FullScorecardParseResult = FullScorecardParseSuccess | FullScorecardParseFailure
