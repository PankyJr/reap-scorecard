import { z } from 'zod'
import type {
  ProcurementSupplierInput,
} from '@/lib/procurement/rows'
import {
  TMPS_CUSTOM_LINES_MAX,
  type ProcurementTmpsCustomLine,
} from '@/lib/procurement/tmpsCustom'
import type { ProcurementTmpsInputs } from '@/lib/procurement/tmps'

const tmpsCustomLineSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().max(500),
  amount: z.number().nonnegative(),
})

export function parseTmpsCustomLinesFromFormJson(
  raw: string | null | undefined,
): ProcurementTmpsCustomLine[] {
  if (raw == null || !String(raw).trim()) return []
  try {
    const data = JSON.parse(String(raw)) as unknown
    if (!Array.isArray(data)) return []
    const out: ProcurementTmpsCustomLine[] = []
    for (const item of data) {
      if (!item || typeof item !== 'object') continue
      const rec = item as Record<string, unknown>
      const id =
        typeof rec.id === 'string' && rec.id.trim()
          ? rec.id.trim().slice(0, 80)
          : `line-${out.length}`
      const label =
        typeof rec.label === 'string' ? rec.label.trim().slice(0, 500) : ''
      const amountRaw = rec.amount
      const amount =
        typeof amountRaw === 'number' && Number.isFinite(amountRaw)
          ? Math.max(0, amountRaw)
          : Math.max(0, Number(amountRaw) || 0)
      if (!label && amount === 0) continue
      const row: ProcurementTmpsCustomLine = {
        id,
        label: label || 'Custom line',
        amount,
      }
      const r = tmpsCustomLineSchema.safeParse(row)
      if (r.success) {
        out.push(r.data)
      }
      if (out.length >= TMPS_CUSTOM_LINES_MAX) break
    }
    return out
  } catch {
    return []
  }
}

export const supplierSchema: z.ZodType<ProcurementSupplierInput> = z.object({
  supplier_name: z.string().min(1, 'Supplier name is required'),
  supplier_code: z.string().optional(),
  vat_number: z.string().optional(),
  company_registration: z.string().optional(),
  bo_etc: z.string().optional(),
  fts: z.string().optional(),
  des: z.string().optional(),
  prop: z.string().optional(),
  supplier_type: z.enum(['EME', 'QSE', 'Generic']),
  level: z.string().min(1, 'Level is required'),
  value_ex_vat: z
    .number('Value (ex VAT) is required')
    .nonnegative('Value must be zero or positive'),
  is_51_black_owned: z.boolean(),
  is_30_black_women_owned: z.boolean(),
  is_51_bdgs: z.boolean(),
  expiry: z.string().optional(),
  empower: z.string().optional(),
})

export const optionalNonNegativeNumber = z.preprocess(
  (v: unknown) => (v === '' || v == null ? undefined : v),
  z.coerce.number().nonnegative().optional(),
)

export const assessmentPayloadSchema = z.object({
  company_id: z.string().uuid(),
  assessment_year: z.coerce
    .number('Assessment year is required')
    .int()
    .min(2000)
    .max(2100),
  tmps_opening_inventory: optionalNonNegativeNumber,
  tmps_closing_inventory: optionalNonNegativeNumber,
  tmps_cost_of_sales: optionalNonNegativeNumber,
  tmps_other_operating_expenses: optionalNonNegativeNumber,
  tmps_finance_costs: optionalNonNegativeNumber,
  tmps_capital_expenditure: optionalNonNegativeNumber,

  tmps_employee_costs: optionalNonNegativeNumber,
  tmps_depreciation: optionalNonNegativeNumber,
  tmps_utilities: optionalNonNegativeNumber,
  tmps_service_fees: optionalNonNegativeNumber,
  tmps_recharge_for_services: optionalNonNegativeNumber,
  tmps_purchase_of_goods: optionalNonNegativeNumber,
  tmps_purchase_of_services: optionalNonNegativeNumber,
  tmps_custom_inclusions: z
    .array(tmpsCustomLineSchema)
    .max(TMPS_CUSTOM_LINES_MAX)
    .default([]),
  tmps_custom_exclusions: z
    .array(tmpsCustomLineSchema)
    .max(TMPS_CUSTOM_LINES_MAX)
    .default([]),
  suppliers: z
    .array(supplierSchema)
    .min(1, 'Add at least one supplier to create an assessment'),
})

export const assessmentUpdatePayloadSchema = assessmentPayloadSchema.extend({
  assessment_id: z.string().uuid(),
})

export type AssessmentPayloadParsed = z.infer<typeof assessmentPayloadSchema>
export type AssessmentUpdatePayloadParsed = z.infer<
  typeof assessmentUpdatePayloadSchema
>

const TMPS_FORM_KEYS = [
  'tmps_opening_inventory',
  'tmps_closing_inventory',
  'tmps_cost_of_sales',
  'tmps_other_operating_expenses',
  'tmps_finance_costs',
  'tmps_capital_expenditure',
  'tmps_employee_costs',
  'tmps_depreciation',
  'tmps_utilities',
  'tmps_service_fees',
  'tmps_recharge_for_services',
  'tmps_purchase_of_goods',
  'tmps_purchase_of_services',
] as const

export function readTmpsFieldsFromFormData(formData: FormData) {
  const out: Record<(typeof TMPS_FORM_KEYS)[number], string | null> = {
    tmps_opening_inventory: null,
    tmps_closing_inventory: null,
    tmps_cost_of_sales: null,
    tmps_other_operating_expenses: null,
    tmps_finance_costs: null,
    tmps_capital_expenditure: null,
    tmps_employee_costs: null,
    tmps_depreciation: null,
    tmps_utilities: null,
    tmps_service_fees: null,
    tmps_recharge_for_services: null,
    tmps_purchase_of_goods: null,
    tmps_purchase_of_services: null,
  }
  for (const key of TMPS_FORM_KEYS) {
    out[key] = formData.get(key) as string | null
  }
  return out
}

export function parseSuppliersJsonFromForm(
  raw: string | null,
): { ok: true; data: unknown } | { ok: false } {
  try {
    return { ok: true, data: raw ? JSON.parse(raw) : [] }
  } catch {
    return { ok: false }
  }
}

export function tmpsNumericInputsFromAssessmentPayload(
  p: AssessmentPayloadParsed | AssessmentUpdatePayloadParsed,
): ProcurementTmpsInputs {
  return {
    tmps_opening_inventory: p.tmps_opening_inventory,
    tmps_closing_inventory: p.tmps_closing_inventory,
    tmps_cost_of_sales: p.tmps_cost_of_sales,
    tmps_other_operating_expenses: p.tmps_other_operating_expenses,
    tmps_finance_costs: p.tmps_finance_costs,
    tmps_capital_expenditure: p.tmps_capital_expenditure,
    tmps_employee_costs: p.tmps_employee_costs,
    tmps_depreciation: p.tmps_depreciation,
    tmps_utilities: p.tmps_utilities,
    tmps_service_fees: p.tmps_service_fees,
    tmps_recharge_for_services: p.tmps_recharge_for_services,
    tmps_purchase_of_goods: p.tmps_purchase_of_goods,
    tmps_purchase_of_services: p.tmps_purchase_of_services,
  }
}
