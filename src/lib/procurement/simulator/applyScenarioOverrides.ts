import type {
  SimulatorSupplier,
  SupplierScenarioOverride,
} from './types'
import { resolveEffectiveLevel } from './resolveEffectiveLevel'

function mergeOverride(
  baseline: SimulatorSupplier,
  override: SupplierScenarioOverride | undefined,
): SimulatorSupplier {
  if (!override) return { ...baseline }

  const merged: SimulatorSupplier = {
    ...baseline,
    ...(override.level !== undefined ? { level: override.level } : {}),
    ...(override.supplier_type !== undefined
      ? { supplier_type: override.supplier_type }
      : {}),
    ...(override.value_ex_vat !== undefined
      ? { value_ex_vat: override.value_ex_vat }
      : {}),
    ...(override.is_imported !== undefined
      ? { is_imported: override.is_imported }
      : {}),
    ...(override.compliance_status !== undefined
      ? { compliance_status: override.compliance_status }
      : {}),
    ...(override.is_51_black_owned !== undefined
      ? { is_51_black_owned: override.is_51_black_owned }
      : {}),
    ...(override.is_30_black_women_owned !== undefined
      ? { is_30_black_women_owned: override.is_30_black_women_owned }
      : {}),
    ...(override.is_51_bdgs !== undefined
      ? { is_51_bdgs: override.is_51_bdgs }
      : {}),
  }

  merged.level = resolveEffectiveLevel(merged.level, merged.compliance_status)
  return merged
}

export function applyScenarioOverrides(
  baselineSuppliers: readonly SimulatorSupplier[],
  scenarioOverrides: Readonly<Record<string, SupplierScenarioOverride>>,
): {
  scenarioSuppliers: SimulatorSupplier[]
  excludedSupplierIds: Set<string>
} {
  const excludedSupplierIds = new Set<string>()

  const scenarioSuppliers = baselineSuppliers.map((supplier) => {
    const override = scenarioOverrides[supplier.id]
    if (override?.excluded) {
      excludedSupplierIds.add(supplier.id)
    }
    return mergeOverride(supplier, override)
  })

  return { scenarioSuppliers, excludedSupplierIds }
}

export function countModifiedSuppliers(
  scenarioOverrides: Readonly<Record<string, SupplierScenarioOverride>>,
): number {
  return Object.keys(scenarioOverrides).length
}

export function isSupplierModified(
  supplierId: string,
  scenarioOverrides: Readonly<Record<string, SupplierScenarioOverride>>,
): boolean {
  return supplierId in scenarioOverrides
}
