/**
 * Full Scorecard Calculator — shared types.
 * Element keys are unambiguous; never use bare `sd`.
 */

export const SCORECARD_ELEMENT_KEYS = [
  'socio_economic_development',
  'enterprise_development',
  'supplier_development',
  'management_control',
] as const

export type ScorecardElementKey = (typeof SCORECARD_ELEMENT_KEYS)[number]

export type AssessmentScopeMode = 'full' | 'single' | 'selected'

export type AssessmentStatus = 'draft' | 'final'

export type ElementWorkStatus =
  | 'not_started'
  | 'file_uploaded'
  | 'needs_review'
  | 'ready_to_calculate'
  | 'calculated'
  | 'complete'
  | 'error'

export type HeaderAliasMap = Record<string, readonly string[]>

export type ImportRowValidationStatus = 'valid' | 'warning' | 'rejected'

export type CalculatorImportRow = {
  /** Source worksheet for multi-sheet imports (for example Management Control registers). */
  sourceSheet?: string
  sourceRowNumber: number
  values: Record<string, string | number | null>
  validationStatus: ImportRowValidationStatus
  validationMessages: string[]
}

export type CalculatorImportPreview = {
  sheetName: string
  detectedHeaders: Record<string, string>
  rows: CalculatorImportRow[]
  validRowCount: number
  warningCount: number
  rejectedRowCount: number
  platformTotalRecognised: number | null
  workbookDisplayedTotal: number | null
  totalsMatch: boolean | null
  notes: string[]
  /** Optional importer contract version for auditability. */
  importVersion?: string
}

export type CalculationBreakdown = {
  formulaName: string
  ruleVersion: string
  inputsUsed: Record<string, number | string | null>
  target: number | null
  actual: number | null
  pointsAvailable: number | null
  pointsAchieved: number | null
  caps: Record<string, number | null>
  thresholds: Record<string, number | null>
  exclusions: string[]
  warnings: string[]
  explanation: string
}

export type ElementContextualInputs = {
  /** Net Profit After Tax for the measurement year (currency). Required for SED % derivation. */
  npatAmount?: number | null
  /** Compliance target as a fraction (e.g. 0.01 = 1%). */
  targetPercent?: number | null
  /** Override available points; defaults come from verified indicator config. */
  availablePoints?: number | null
  /** Optional free-form notes for the element workspace. */
  notes?: string | null
  /** Extra adapter-specific fields. */
  [key: string]: unknown
}

export type ElementAdapterHelp = {
  summary: string
  uploadHints: string[]
  outstandingBusinessRules: string[]
}

export type ScorecardElementAdapter = {
  elementKey: ScorecardElementKey
  elementName: string
  shortName: string
  acceptedSheetNames: readonly string[]
  headerAliases: HeaderAliasMap
  ruleVersion: string
  help: ElementAdapterHelp
  parseWorkbook: (args: {
    workbookBuffer: ArrayBuffer | Buffer
    preferredSheetName?: string | null
  }) => CalculatorImportPreview
  calculate: (args: {
    rows: CalculatorImportRow[]
    contextualInputs: ElementContextualInputs
  }) => CalculationBreakdown
  /** Whether this adapter can produce points without additional REAP templates. */
  scoringReady: boolean
}
