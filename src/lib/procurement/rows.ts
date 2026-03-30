import { RECOGNITION_BY_LEVEL } from './config'

export type SupplierType = 'EME' | 'QSE' | 'Generic'

export interface ProcurementSupplierInput {
  supplier_name: string
  supplier_code?: string
  vat_number?: string
  company_registration?: string
  bo_etc?: string
  fts?: string
  des?: string
  prop?: string
  supplier_type: SupplierType
  level: string
  value_ex_vat: number
  is_51_black_owned: boolean
  is_30_black_women_owned: boolean
  is_51_bdgs: boolean
  expiry?: string
  empower?: string
}

export interface ProcurementSupplierCalculated {
  recognition_percent: number
  bbbee_spend: number
  eme_amount: number
  qse_amount: number
  black_owned_amount: number
  black_women_amount: number
  bdgs_amount: number
}

export type ProcurementSupplierWithCalculated = ProcurementSupplierInput &
  ProcurementSupplierCalculated

export function getRecognitionPercent(level: string): number {
  const key = level in RECOGNITION_BY_LEVEL ? level : 'Non-Compliant'
  return RECOGNITION_BY_LEVEL[key]
}

export function calculateSupplierRow(
  input: ProcurementSupplierInput
): ProcurementSupplierWithCalculated {
  const value = Number(input.value_ex_vat) || 0
  const recognition_percent = getRecognitionPercent(input.level)
  const bbbee_spend = value * recognition_percent

  const eme_amount =
    input.supplier_type === 'EME' && bbbee_spend > 0 ? bbbee_spend : 0
  const qse_amount =
    input.supplier_type === 'QSE' && bbbee_spend > 0 ? bbbee_spend : 0
  const black_owned_amount =
    input.is_51_black_owned && bbbee_spend > 0 ? bbbee_spend : 0
  const black_women_amount =
    input.is_30_black_women_owned && bbbee_spend > 0 ? bbbee_spend : 0
  const bdgs_amount =
    input.is_51_bdgs && bbbee_spend > 0 ? bbbee_spend : 0

  return {
    ...input,
    recognition_percent,
    bbbee_spend,
    eme_amount,
    qse_amount,
    black_owned_amount,
    black_women_amount,
    bdgs_amount,
  }
}

