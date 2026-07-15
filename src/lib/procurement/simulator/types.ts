import type { SupplierType } from '@/lib/procurement/rows'

export type ComplianceStatus =
  | 'compliant'
  | 'non-compliant'
  | 'unknown'
  | 'expired'

export type LocalImportStatus = 'local' | 'imported'

/** Baseline supplier row from a monthly SAP-style upload (prototype model). */
export interface SimulatorSupplier {
  id: string
  supplier_name: string
  supplier_code: string
  supplier_type: SupplierType
  level: string
  value_ex_vat: number
  is_51_black_owned: boolean
  is_30_black_women_owned: boolean
  is_51_bdgs: boolean
  is_imported: boolean
  compliance_status: ComplianceStatus
  expiry?: string
}

/** Scenario-only edits keyed by supplier id. Never mutates baseline. */
export interface SupplierScenarioOverride {
  level?: string
  supplier_type?: SupplierType
  value_ex_vat?: number
  is_imported?: boolean
  compliance_status?: ComplianceStatus
  is_51_black_owned?: boolean
  is_30_black_women_owned?: boolean
  is_51_bdgs?: boolean
  /** When true, supplier is omitted from scenario scoring totals. */
  excluded?: boolean
}

export interface SimulatorBaselineMeta {
  companyName: string
  reportingPeriod: string
  lastUploadDate: string
  uploadLabel: string
}

export interface ProcurementPositionSummary {
  totalScore: number
  maxPoints: number
  totalMeasuredSpend: number
  recognisedBbbeeSpend: number
  importedSpend: number
  nonCompliantSpend: number
  supplierCount: number
  activeSupplierCount: number
  reportingPeriod: string
}

export interface ScenarioChangeRecord {
  supplierId: string
  supplierName: string
  before: SupplierScenarioOverride | undefined
  after: SupplierScenarioOverride | undefined
  timestamp: number
}

export interface SavedLocalScenario {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  overrides: Record<string, SupplierScenarioOverride>
}
