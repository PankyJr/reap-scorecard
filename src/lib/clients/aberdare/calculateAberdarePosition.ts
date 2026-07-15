import {
  calculateProcurementPosition,
  type ProcurementPositionComparison,
} from '@/lib/procurement/simulator'
import type { SimulatorSupplier, SupplierScenarioOverride } from '@/lib/procurement/simulator'
import {
  ABERDARE_PROVISIONAL_IMPORT_RULES,
  type AberdareParseResult,
  type AberdareProvisionalImportRules,
  type AberdareSupplierRow,
} from './types'

export function toSimulatorBaseline(
  suppliers: readonly AberdareSupplierRow[],
): SimulatorSupplier[] {
  return suppliers.map((s) => ({ ...s.simulator }))
}

export function buildAberdareActualPosition(
  rows: readonly AberdareSupplierRow[],
  reportingPeriod: string,
  rules: AberdareProvisionalImportRules = ABERDARE_PROVISIONAL_IMPORT_RULES,
): ProcurementPositionComparison {
  return calculateAberdareScenario(rows, {}, reportingPeriod, rules)
}

export function calculateAberdareScenario(
  rows: readonly AberdareSupplierRow[],
  overrides: Readonly<Record<string, SupplierScenarioOverride>>,
  reportingPeriod: string,
  rules: AberdareProvisionalImportRules = ABERDARE_PROVISIONAL_IMPORT_RULES,
): ProcurementPositionComparison {
  const baselineSuppliers = toSimulatorBaseline(rows)
  return calculateProcurementPosition({
    baselineSuppliers,
    scenarioOverrides: overrides,
    reportingPeriod,
    excludeExplicitImportsFromScoring: rules.excludeExplicitImportsFromScoring,
  })
}

export function summariseAberdareUpload(parseResult: AberdareParseResult): {
  supplierCount: number
  reportingEntity: string
  sourceSpend: number
  importedSpendExcluded: number
  eligibleProvisionalSpend: number
} {
  const entity =
    parseResult.reportingEntities[0] ??
    parseResult.suppliers[0]?.company ??
    'ABFI'
  const sourceSpend = parseResult.reconciliation.sourceSpendTotal
  const importedSpendExcluded = parseResult.reconciliation.explicitImportSpend
  return {
    supplierCount: parseResult.suppliers.length,
    reportingEntity: entity,
    sourceSpend,
    importedSpendExcluded,
    eligibleProvisionalSpend: sourceSpend - importedSpendExcluded,
  }
}

/** Pick a high-spend Level 1 supplier suitable for demonstration scenarios. */
export function findDemoLevel1Supplier(
  rows: readonly AberdareSupplierRow[],
): AberdareSupplierRow | undefined {
  return [...rows]
    .filter(
      (r) =>
        r.level === '1' &&
        r.importClassification !== 'imported' &&
        r.amountExVat > 0,
    )
    .sort((a, b) => b.amountExVat - a.amountExVat)[0]
}

/** Pick a high-spend explicit import for reclassification demos. */
export function findDemoImportedSupplier(
  rows: readonly AberdareSupplierRow[],
): AberdareSupplierRow | undefined {
  return [...rows]
    .filter((r) => r.importClassification === 'imported' && r.amountExVat > 0)
    .sort((a, b) => b.amountExVat - a.amountExVat)[0]
}
