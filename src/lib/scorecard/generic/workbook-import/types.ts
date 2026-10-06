import type { FinancialInputs } from '../financial'
import type { OwnershipInputs } from '../elements/ownership'
import type { ManagementControlInputs } from '../elements/management-control'
import type { SkillsDevelopmentInputs } from '../elements/skills-development'
import type { ContributionRecord } from '../elements/contributions'
import type { TypedDisplayValue } from '../ux/display-values'
import type { SheetClassification } from './sheet-catalog'

export type { TypedDisplayValue }

export type ImportElementKey =
  | 'financial'
  | 'ownership'
  | 'management_control'
  | 'skills_development'
  | 'enterprise_development'
  | 'supplier_development'
  | 'socio_economic_development'

export type ElementImportDecision =
  | 'import'
  | 'skip'
  | 'keep_existing'
  | 'replace_existing'
  | 'merge_missing_only'

export type DetectedSheetPreview = {
  detectedName: string
  canonicalName: string | null
  classification: SheetClassification | 'unsupported'
  populates: string
  notes: string | null
  rowCount: number
  columnCount: number
  warningCount: number
  excelErrorCount: number
}

export type ElementImportPreview = {
  elementKey: ImportElementKey
  displayName: string
  willPopulate: boolean
  validRowCount: number
  warningCount: number
  rejectedRowCount: number
  missingInputs: string[]
  warnings: string[]
  /** Explicitly typed summary values for display — never infer formatting from key names. */
  summary: TypedDisplayValue[]
  /** Proposed payload when the user chooses import/replace/merge. */
  proposed: unknown
}

export type GenericWorkbookAnalysis = {
  importVersion: string
  filename: string
  fileSize: number
  checksumSha256: string
  analysedAt: string
  sheetCount: number
  sheets: DetectedSheetPreview[]
  expectedSheetCount: number
  recognisedSheetCount: number
  unsupportedSheets: string[]
  workbookDefects: string[]
  demonstrationRowWarnings: string[]
  procurementNotice: string
  elements: ElementImportPreview[]
  financial: FinancialInputs
  ownership: OwnershipInputs
  managementControl: ManagementControlInputs
  skillsDevelopment: SkillsDevelopmentInputs
  enterpriseDevelopmentContributions: ContributionRecord[]
  supplierDevelopmentContributions: ContributionRecord[]
  socioEconomicDevelopmentContributions: ContributionRecord[]
  /** Privacy-safe MC register import snapshot (no identity numbers). */
  managementControlImportSnapshot: unknown | null
  sedImportSnapshot: unknown | null
}

export type ConfirmImportRequest = {
  analysis: GenericWorkbookAnalysis
  decisions: Record<ImportElementKey, ElementImportDecision>
  acceptWarnings: boolean
  acknowledgeProcurementSeparate: boolean
  acknowledgeMissingFields: boolean
}
