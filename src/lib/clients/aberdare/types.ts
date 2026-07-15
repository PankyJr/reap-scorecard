import type {
  ComplianceStatus,
  SimulatorSupplier,
  SupplierScenarioOverride,
} from '@/lib/procurement/simulator'

/** Provisional import classification for Aberdare spend rows. */
export type AberdareImportClassification =
  | 'imported'
  | 'local'
  | 'not_explicitly_imported'

export type AberdareNormalisedFlag = 'yes' | 'no' | 'unknown' | 'not_provided'

export interface AberdareProvisionalImportRules {
  /** Only Import = Y is treated as imported. */
  treatOnlyExplicitYAsImported: true
  /** Exclude explicit imports from provisional TMPS / scoring. */
  excludeExplicitImportsFromScoring: true
  /**
   * Do not also subtract Import Spend Exempt Value when whole Import=Y rows
   * are already excluded (avoids double-counting).
   */
  subtractImportSpendExemptValue: false
  /** Spend Exempt / Local Spend Exempt Val are not applied to scoring. */
  applySpendExemptToScoring: false
}

export const ABERDARE_PROVISIONAL_IMPORT_RULES: AberdareProvisionalImportRules = {
  treatOnlyExplicitYAsImported: true,
  excludeExplicitImportsFromScoring: true,
  subtractImportSpendExemptValue: false,
  applySpendExemptToScoring: false,
}

export const ABERDARE_EXPECTED_RECONCILIATION = {
  supplierRows: 940,
  aggregateRows: 1,
  totalSourceRowsAfterHeader: 941,
  totalAmountExVat: 5_377_124_451.21,
  explicitImportRows: 33,
  explicitImportSpend: 596_773_734.27,
  importSpendExemptValue: 499_962_148.65,
  localSpendExemptValue: 19_912_247.73,
  negativeSpendRows: 2,
  combinedNegativeSpend: -67_218_246.02,
} as const

export const ABERDARE_CLIENT = {
  legalName: 'Aberdare Cables (Pty) Ltd',
  reportingEntity: 'ABFI',
  tagline: 'ENLIGHTENING THE FUTURE',
  poweredBy: 'Powered by REAP Solutions',
} as const

/** Full normalised Aberdare row — scoring uses the embedded SimulatorSupplier. */
export interface AberdareSupplierRow {
  id: string
  sourceRowNumber: number
  company: string
  vendorCode: string
  vendorName: string
  amountExVat: number
  accredLevelRaw: string
  level: string
  complianceStatus: ComplianceStatus
  importRaw: string
  importClassification: AberdareImportClassification
  importSpendExemptValue: number | null
  spendExemptRaw: string
  spendExemptNormalised: AberdareNormalisedFlag
  localSpendExemptValue: number | null
  certificateRaw: string
  certificateNormalised: string
  multiplierRaw: string
  multiplierPercent: number | null
  expectedRecognitionPercent: number
  multiplierMatchesRecognition: boolean
  supplierType: SimulatorSupplier['supplier_type']
  is51BlackOwned: boolean
  is30BlackWomenOwned: boolean
  is51Bdgs: boolean
  blackOwnedPercent: number | null
  blackFemaleOwnedPercent: number | null
  emeAmount: number | null
  qseAmount: number | null
  designatedGroupType: string
  region: string
  paymentTerm: string
  paymentTermDescription: string
  placeholderUnknownFields: string[]
  /** Scoring shape reused by the shared engine. */
  simulator: SimulatorSupplier
  /** Additional display fields preserved for detail drawer. */
  details: Record<string, string | number | boolean | null>
}

export interface AberdareTotalsRow {
  sourceRowNumber: number
  amountExVat: number
  importSpendExemptValue: number | null
  localSpendExemptValue: number | null
  raw: Record<string, unknown>
}

export interface AberdareReconciliation {
  expected: typeof ABERDARE_EXPECTED_RECONCILIATION
  supplierCount: number
  sourceSpendTotal: number
  totalsRowSpend: number | null
  spendMatchesTotalsRow: boolean
  spendMatchesExpected: boolean
  explicitImportCount: number
  explicitImportSpend: number
  importSpendMatchesExpected: boolean
  importSpendExemptTotal: number
  importExemptMatchesExpected: boolean
  localSpendExemptTotal: number
  localExemptMatchesExpected: boolean
  negativeSpendRows: number
  combinedNegativeSpend: number
  unknownPlaceholderFieldCount: number
  multiplierDiscrepancyCount: number
  mismatches: string[]
}

export interface AberdareParseResult {
  suppliers: AberdareSupplierRow[]
  totalsRow: AberdareTotalsRow | null
  reconciliation: AberdareReconciliation
  reportingEntities: string[]
  sourceFileName: string
  warnings: string[]
}

export type AberdareScenarioOverrides = Record<string, SupplierScenarioOverride>

export interface AberdareSessionOverridesState {
  overrides: AberdareScenarioOverrides
  scenarioName: string
  updatedAt: string
}
