export interface ProcurementTmpsInputs {
  tmps_opening_inventory?: number | null
  tmps_closing_inventory?: number | null
  tmps_cost_of_sales?: number | null
  tmps_other_operating_expenses?: number | null
  tmps_finance_costs?: number | null
  tmps_capital_expenditure?: number | null

  tmps_employee_costs?: number | null
  tmps_depreciation?: number | null
  tmps_utilities?: number | null
  tmps_service_fees?: number | null
  tmps_recharge_for_services?: number | null
  tmps_purchase_of_goods?: number | null
  tmps_purchase_of_services?: number | null
}

export interface ProcurementTmpsTotals {
  inclusionsTotal: number
  exclusionsTotal: number
  tmpsTotal: number
}

export type ProcurementTmpsInputKey = keyof ProcurementTmpsInputs

export const TMPS_INCLUSIONS: Array<{
  key: ProcurementTmpsInputKey
  label: string
}> = [
  { key: 'tmps_opening_inventory', label: 'Opening inventory' },
  { key: 'tmps_closing_inventory', label: 'Closing inventory' },
  { key: 'tmps_cost_of_sales', label: 'Cost of sales' },
  { key: 'tmps_other_operating_expenses', label: 'Other operating expenses' },
  { key: 'tmps_finance_costs', label: 'Finance costs' },
  { key: 'tmps_capital_expenditure', label: 'Capital expenditure' },
]

export const TMPS_EXCLUSIONS: Array<{
  key: ProcurementTmpsInputKey
  label: string
}> = [
  { key: 'tmps_employee_costs', label: 'Employee costs' },
  { key: 'tmps_depreciation', label: 'Depreciation' },
  { key: 'tmps_utilities', label: 'Utilities' },
  { key: 'tmps_service_fees', label: 'Service fees' },
  { key: 'tmps_recharge_for_services', label: 'Recharge for services' },
  { key: 'tmps_purchase_of_goods', label: 'Purchase of goods' },
  { key: 'tmps_purchase_of_services', label: 'Purchase of services' },
]

function asNonNegativeNumber(value: number | null | undefined): number {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return 0
  return n >= 0 ? n : 0
}

/**
 * Implements the workbook TMPS denominator logic:
 * TMPS Total = Total Inclusions - Total Exclusions
 *
 * Inclusions:
 * opening inventory + closing inventory + cost of sales +
 * other operating expenses + finance costs + capital expenditure
 *
 * Exclusions:
 * employee costs + depreciation + utilities + service fees +
 * recharge for services + purchase of goods + purchase of services
 */
export function calculateProcurementTmpsTotals(
  inputs: ProcurementTmpsInputs,
): ProcurementTmpsTotals {
  const inclusionsTotal =
    asNonNegativeNumber(inputs.tmps_opening_inventory) +
    asNonNegativeNumber(inputs.tmps_closing_inventory) +
    asNonNegativeNumber(inputs.tmps_cost_of_sales) +
    asNonNegativeNumber(inputs.tmps_other_operating_expenses) +
    asNonNegativeNumber(inputs.tmps_finance_costs) +
    asNonNegativeNumber(inputs.tmps_capital_expenditure)

  const exclusionsTotal =
    asNonNegativeNumber(inputs.tmps_employee_costs) +
    asNonNegativeNumber(inputs.tmps_depreciation) +
    asNonNegativeNumber(inputs.tmps_utilities) +
    asNonNegativeNumber(inputs.tmps_service_fees) +
    asNonNegativeNumber(inputs.tmps_recharge_for_services) +
    asNonNegativeNumber(inputs.tmps_purchase_of_goods) +
    asNonNegativeNumber(inputs.tmps_purchase_of_services)

  const tmpsTotal = inclusionsTotal - exclusionsTotal

  return {
    inclusionsTotal,
    exclusionsTotal,
    tmpsTotal,
  }
}

export type ProcurementTmpsRecord = Record<
  string,
  number | string | null | undefined
>

function coerceNumberOrNull(
  value: number | string | null | undefined,
): number | null {
  if (value === null || value === undefined) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/**
 * Converts Supabase/numeric values into the typed TMPS input shape.
 * Used for display and parity checks; does not affect scoring logic.
 */
export function coerceProcurementTmpsInputsFromRecord(
  record: ProcurementTmpsRecord,
): ProcurementTmpsInputs {
  return {
    tmps_opening_inventory: coerceNumberOrNull(record.tmps_opening_inventory),
    tmps_closing_inventory: coerceNumberOrNull(record.tmps_closing_inventory),
    tmps_cost_of_sales: coerceNumberOrNull(record.tmps_cost_of_sales),
    tmps_other_operating_expenses: coerceNumberOrNull(
      record.tmps_other_operating_expenses,
    ),
    tmps_finance_costs: coerceNumberOrNull(record.tmps_finance_costs),
    tmps_capital_expenditure: coerceNumberOrNull(
      record.tmps_capital_expenditure,
    ),

    tmps_employee_costs: coerceNumberOrNull(record.tmps_employee_costs),
    tmps_depreciation: coerceNumberOrNull(record.tmps_depreciation),
    tmps_utilities: coerceNumberOrNull(record.tmps_utilities),
    tmps_service_fees: coerceNumberOrNull(record.tmps_service_fees),
    tmps_recharge_for_services: coerceNumberOrNull(
      record.tmps_recharge_for_services,
    ),
    tmps_purchase_of_goods: coerceNumberOrNull(record.tmps_purchase_of_goods),
    tmps_purchase_of_services: coerceNumberOrNull(
      record.tmps_purchase_of_services,
    ),
  }
}

