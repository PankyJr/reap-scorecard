import type { ProcurementSupplierInput } from '@/lib/procurement/rows'
import {
  calculateProcurementTmpsTotals,
  type ProcurementTmpsInputs,
  type ProcurementTmpsTotals,
} from '@/lib/procurement/tmps'
import type { ProcurementTmpsCustomLine } from '@/lib/procurement/tmpsCustom'

/** How the procurement scoring denominator (TMPS) was chosen. */
export type ProcurementTmpsDenominatorSource =
  | 'calculated'
  | 'manual'
  | 'import_supplier_total'

export const TMPS_DENOMINATOR_SOURCES: readonly ProcurementTmpsDenominatorSource[] =
  ['calculated', 'manual', 'import_supplier_total'] as const

export function parseTmpsDenominatorSource(
  raw: string | null | undefined,
): ProcurementTmpsDenominatorSource {
  const s = String(raw ?? '').trim()
  if (s === 'manual' || s === 'import_supplier_total') return s
  return 'calculated'
}

export function sumSupplierValueExVat(
  suppliers: ReadonlyArray<Pick<ProcurementSupplierInput, 'value_ex_vat'>>,
): number {
  return suppliers.reduce((sum, r) => {
    const v = Number(r.value_ex_vat)
    return sum + (Number.isFinite(v) && v >= 0 ? v : 0)
  }, 0)
}

export function computeProcurementScoringDenominator(args: {
  source: ProcurementTmpsDenominatorSource
  tmpsInputs: ProcurementTmpsInputs
  tmpsCustomInclusions: ProcurementTmpsCustomLine[]
  tmpsCustomExclusions: ProcurementTmpsCustomLine[]
  tmpsManualAmount: number | null | undefined
  suppliers: ReadonlyArray<Pick<ProcurementSupplierInput, 'value_ex_vat'>>
}): {
  denominator: number
  tmpsTotals: ProcurementTmpsTotals
  source: ProcurementTmpsDenominatorSource
} {
  const tmpsTotals = calculateProcurementTmpsTotals(args.tmpsInputs, {
    inclusions: args.tmpsCustomInclusions,
    exclusions: args.tmpsCustomExclusions,
  })

  if (args.source === 'manual') {
    const m = Math.max(0, Number(args.tmpsManualAmount ?? 0) || 0)
    return { denominator: m, tmpsTotals, source: 'manual' }
  }

  if (args.source === 'import_supplier_total') {
    const d = sumSupplierValueExVat(args.suppliers)
    return { denominator: d, tmpsTotals, source: 'import_supplier_total' }
  }

  return {
    denominator: tmpsTotals.tmpsTotal,
    tmpsTotals,
    source: 'calculated',
  }
}

export function tmpsDenominatorSourceTitle(
  source: ProcurementTmpsDenominatorSource,
): string {
  if (source === 'manual') return 'Fixed TMPS amount (manual)'
  if (source === 'import_supplier_total') {
    return 'Imported supplier spend used as TMPS denominator'
  }
  return 'Calculated TMPS (inclusions − exclusions)'
}

export function tmpsDenominatorSourceShortNote(
  source: ProcurementTmpsDenominatorSource,
): string {
  if (source === 'manual') {
    return 'Category spend is divided by the fixed amount you entered instead of the TMPS pad total.'
  }
  if (source === 'import_supplier_total') {
    return 'Each category divides supplier spend by the total of supplier-line amounts (ex VAT) on your grid — that total is your TMPS denominator.'
  }
  return 'Category spend is divided by inclusions minus exclusions from the TMPS pad (plus any custom TMPS lines).'
}
