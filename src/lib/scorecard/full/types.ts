export type FullWorkbookStatus =
  | 'uploaded'
  | 'parsed'
  | 'extracted'
  | 'extracted_with_warnings'
  | 'scored'
  | 'scored_with_warnings'
  | 'validation_failed'
  | 'processing_error'

export type FullMetricValueType =
  | 'number'
  | 'text'
  | 'percentage'
  | 'boolean'
  | 'date'
  | 'currency'
  | 'error'
  | 'empty'

export type FullMetricValidationState = 'valid' | 'warning' | 'error'

export interface ParsedCellData {
  address: string
  rawValue: unknown
  displayValue: string
  cellType?: string
  formula?: string
}

export interface FullWorkbookSheetData {
  sheetKey: string
  sheetName: string
  rowCount: number
  columnCount: number
  rows: unknown[][]
  cells: Record<string, ParsedCellData>
  parseWarnings: string[]
}

export interface ParsedWorkbookResult {
  filename: string
  fileSize: number
  sheets: FullWorkbookSheetData[]
  detectedSheetNames: string[]
}

export type ValidationSeverity = 'error' | 'warning'

export interface FullWorkbookValidationIssue {
  issueType:
    | 'missing_required_sheet'
    | 'parse_warning'
    | 'required_metric_missing'
    | 'metric_value_error'
    | 'metric_value_warning'
  severity: ValidationSeverity
  sheetName?: string
  metricKey?: string
  cellRef?: string
  message: string
  metadata?: Record<string, unknown>
}

export interface FullWorkbookValidationResult {
  requiredSheets: string[]
  supportingSheets: string[]
  detectedSheets: string[]
  missingRequiredSheets: string[]
  issues: FullWorkbookValidationIssue[]
  hasBlockingErrors: boolean
}

export interface MetricDefinition {
  metricKey: string
  pillar: string
  section?: string
  label: string
  sourceSheet: string
  expectedType: Exclude<FullMetricValueType, 'error' | 'empty'>
  unit?: string
  required: boolean
  min?: number
  max?: number
  matcherTokens?: string[]
  sourceCell?: string
  sourceRange?: string
}

export interface ExtractedMetricValue {
  metricKey: string
  pillar: string
  section?: string
  label: string
  valueType: FullMetricValueType
  numericValue: number | null
  textValue: string | null
  booleanValue: boolean | null
  dateValue: string | null
  unit: string | null
  sourceSheet: string
  sourceCell: string | null
  sourceRange: string | null
  rawValue: string | null
  validationState: FullMetricValidationState
  validationMessage: string | null
}

export interface CanonicalExtractionResult {
  metrics: ExtractedMetricValue[]
  issues: FullWorkbookValidationIssue[]
}
