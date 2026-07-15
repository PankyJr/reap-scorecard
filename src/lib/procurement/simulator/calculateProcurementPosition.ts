import {
  aggregateCategoryTotals,
  calculateProcurementResults,
  type ProcurementAssessmentResult,
} from '@/lib/procurement/assessment'
import { PROCUREMENT_MAX_POINTS } from '@/lib/procurement/insights'
import { calculateSupplierRow, type ProcurementSupplierInput } from '@/lib/procurement/rows'
import { isProcurementSupplierCompliant } from '@/lib/procurement/insights'
import { sumSupplierValueExVat } from '@/lib/procurement/tmpsDenominator'
import { applyScenarioOverrides } from './applyScenarioOverrides'
import type {
  ProcurementPositionSummary,
  SimulatorSupplier,
  SupplierScenarioOverride,
} from './types'

export interface ProcurementPositionResult extends ProcurementPositionSummary {
  assessmentResult: ProcurementAssessmentResult
}

export interface ProcurementPositionComparison {
  actual: ProcurementPositionResult
  scenario: ProcurementPositionResult
  pointsDifference: number
  recognisedSpendDifference: number
  modifiedSupplierCount: number
  warnings: string[]
}

function toProcurementInput(s: SimulatorSupplier): ProcurementSupplierInput {
  return {
    supplier_name: s.supplier_name,
    supplier_code: s.supplier_code,
    supplier_type: s.supplier_type,
    level: s.level,
    value_ex_vat: s.value_ex_vat,
    is_51_black_owned: s.is_51_black_owned,
    is_30_black_women_owned: s.is_30_black_women_owned,
    is_51_bdgs: s.is_51_bdgs,
    expiry: s.expiry,
  }
}

function computePosition(
  suppliers: SimulatorSupplier[],
  excludedIds: Set<string>,
  reportingPeriod: string,
): ProcurementPositionResult {
  const active = suppliers.filter((s) => !excludedIds.has(s.id))
  const calculated = active.map((s) => calculateSupplierRow(toProcurementInput(s)))
  const totals = aggregateCategoryTotals(calculated)
  const totalMeasuredSpend = sumSupplierValueExVat(active)
  const assessmentResult = calculateProcurementResults({
    totals,
    totalMeasuredSpend,
  })

  let recognisedBbbeeSpend = 0
  let importedSpend = 0
  let nonCompliantSpend = 0

  // Imported spend is always measured across the full supplier list so that
  // provisional import exclusion from TMPS does not zero the informational total.
  for (const supplier of suppliers) {
    if (supplier.is_imported) {
      importedSpend += supplier.value_ex_vat
    }
  }

  for (let i = 0; i < calculated.length; i++) {
    const row = calculated[i]!
    recognisedBbbeeSpend += row.bbbee_spend
    if (!isProcurementSupplierCompliant(row.level)) {
      nonCompliantSpend += row.value_ex_vat
    }
  }

  return {
    totalScore: assessmentResult.totalScore,
    maxPoints: PROCUREMENT_MAX_POINTS,
    totalMeasuredSpend,
    recognisedBbbeeSpend,
    importedSpend,
    nonCompliantSpend,
    supplierCount: suppliers.length,
    activeSupplierCount: active.length,
    reportingPeriod,
    assessmentResult,
  }
}

function collectImportedSupplierIds(
  suppliers: readonly SimulatorSupplier[],
): Set<string> {
  const ids = new Set<string>()
  for (const supplier of suppliers) {
    if (supplier.is_imported) ids.add(supplier.id)
  }
  return ids
}

/**
 * Calculation boundary for the procurement scenario simulator.
 * Preserves baseline data; applies overrides only to a derived scenario copy.
 */
export function calculateProcurementPosition(args: {
  baselineSuppliers: readonly SimulatorSupplier[]
  scenarioOverrides?: Readonly<Record<string, SupplierScenarioOverride>>
  reportingPeriod: string
  /**
   * When true, suppliers with `is_imported` are excluded from TMPS and scoring
   * for both actual and scenario positions (scenario uses effective import flag
   * after overrides). Imported spend remains visible in summary totals.
   * Default false preserves existing prototype behaviour.
   */
  excludeExplicitImportsFromScoring?: boolean
}): ProcurementPositionComparison {
  const {
    baselineSuppliers,
    scenarioOverrides = {},
    reportingPeriod,
    excludeExplicitImportsFromScoring = false,
  } = args
  const warnings: string[] = []

  const baselineCopy = baselineSuppliers.map((s) => ({ ...s }))
  const actualExcluded = excludeExplicitImportsFromScoring
    ? collectImportedSupplierIds(baselineCopy)
    : new Set<string>()
  const actual = computePosition(baselineCopy, actualExcluded, reportingPeriod)

  const { scenarioSuppliers, excludedSupplierIds } = applyScenarioOverrides(
    baselineSuppliers,
    scenarioOverrides,
  )
  if (excludeExplicitImportsFromScoring) {
    for (const id of collectImportedSupplierIds(scenarioSuppliers)) {
      excludedSupplierIds.add(id)
    }
  }
  const scenario = computePosition(
    scenarioSuppliers,
    excludedSupplierIds,
    reportingPeriod,
  )

  if (excludeExplicitImportsFromScoring) {
    warnings.push(
      'Imported spend is currently excluded using the report’s Import indicator. Final exemption treatment will be confirmed with Aberdare.',
    )
  } else if (
    baselineSuppliers.some(
      (s) =>
        s.is_imported ||
        s.compliance_status === 'unknown' ||
        s.compliance_status === 'expired',
    )
  ) {
    warnings.push(
      'Imported spend, unknown certificates, and expired certificates are tracked for reporting. The current procurement scoring engine does not apply separate Code 400 imported-spend rules — totals are informational only.',
    )
  }

  const modifiedSupplierCount = Object.keys(scenarioOverrides).length

  return {
    actual,
    scenario,
    pointsDifference: scenario.totalScore - actual.totalScore,
    recognisedSpendDifference:
      scenario.recognisedBbbeeSpend - actual.recognisedBbbeeSpend,
    modifiedSupplierCount,
    warnings,
  }
}
