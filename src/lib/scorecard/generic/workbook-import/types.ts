import type { FinancialInputs } from '../financial'
import type { OwnershipInputs } from '../elements/ownership'
import type { ManagementControlInputs } from '../elements/management-control'
import type { SkillsDevelopmentInputs } from '../elements/skills-development'
import type { ContributionRecord } from '../elements/contributions'
import type { SheetImportClass } from './sheets'

export type ElementImportDecision =
  | 'import'
  | 'skip'
  | 'keep_existing'
  | 'replace_existing'
  | 'merge_missing'

export type DetectedSheetSummary = {
  sheetName: string
  sheetKey: string
  expectedKey: string | null
  canonicalName: string | null
  classification: SheetImportClass
  rowCount: number
  columnCount: number
  parseWarningCount: number
  excelErrorCount: number
  elementKeys: string[]
  notes: string
}

export type GenericWorkbookElementPreview = {
  elementKey: string
  displayName: string
  willPopulate: boolean
  validRows: number
  warningRows: number
  rejectedRows: number
  missingInputs: string[]
  warnings: string[]
  summary: Record<string, unknown>
  proposedFinancial?: FinancialInputs
  proposedOwnership?: OwnershipInputs
  proposedManagementControl?: ManagementControlInputs
  proposedSkills?: SkillsDevelopmentInputs
  proposedContributions?: ContributionRecord[]
  managementControlImport?: {
    sheetName: string
    validRowCount: number
    warningCount: number
    rejectedRowCount: number
    importVersion: string
  }
  sedImport?: {
    sheetName: string
    validRowCount: number
    warningCount: number
    rejectedRowCount: number
    platformTotalRecognised: number | null
    workbookDisplayedTotal: number | null
  }
}

export type GenericWorkbookAnalysis = {
  importVersion: string
  filename: string
  fileSize: number
  checksumSha256: string
  analysedAt: string
  expectedSheetCount: number
  detectedSheetCount: number
  recognisedSheetCount: number
  unsupportedSheetCount: number
  detectedSheets: DetectedSheetSummary[]
  missingExpectedSheets: string[]
  elements: GenericWorkbookElementPreview[]
  workbookDefects: string[]
  demonstrationWarnings: string[]
  metricsExtracted: number
  extractionIssueCount: number
  defaultDecisions: Record<string, ElementImportDecision>
}

export type WorkbookImportStatus =
  | 'no_workbook_uploaded'
  | 'workbook_uploaded'
  | 'analysing_workbook'
  | 'review_required'
  | 'ready_to_import'
  | 'imported'
  | 'imported_with_warnings'
  | 'manually_corrected'
  | 'needs_recalculation'
  | 'calculated'
  | 'complete'
  | 'error'

export type AppliedWorkbookImport = {
  financial: FinancialInputs | null
  ownership: OwnershipInputs | null
  managementControl: ManagementControlInputs | null
  skillsDevelopment: SkillsDevelopmentInputs | null
  enterpriseDevelopmentRecords: ContributionRecord[] | null
  supplierDevelopmentRecords: ContributionRecord[] | null
  socioEconomicDevelopmentRecords: ContributionRecord[] | null
  decisions: Record<string, ElementImportDecision>
  warningsAccepted: boolean
  procurementNote: string
}
