import { z } from 'zod'
import type {
  ProcurementSupplierInput,
} from '@/lib/procurement/rows'

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
