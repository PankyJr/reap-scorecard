'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  aggregateCategoryTotals,
  calculateProcurementResults,
} from '@/lib/procurement/assessment'
import {
  TMPS_EXCLUSIONS,
  TMPS_INCLUSIONS,
  calculateProcurementTmpsTotals,
  type ProcurementTmpsInputs,
} from '@/lib/procurement/tmps'
import {
  calculateSupplierRow,
  type ProcurementSupplierInput,
} from '@/lib/procurement/rows'
import { PROCUREMENT_CATEGORIES } from '@/lib/procurement/config'
import { formatCurrency, formatPercentFromRatio } from '@/lib/procurement/format'
import { SuppliersTable } from './SuppliersTable'
import { ProcurementExcelImport } from './ProcurementExcelImport'
import type { SupplierFormRow } from '@/lib/procurement/supplierFormRow'
import { buttonStyles } from '@/components/ui/buttonStyles'
import {
  AlertCircle,
  Calendar,
  Info,
  Plus,
  TrendingUp,
} from 'lucide-react'

const assessmentSchema = z.object({
  assessment_year: z
    .string()
    .min(1, 'Assessment year is required')
    .refine((s) => {
      const n = parseInt(s, 10)
      return Number.isFinite(n) && n >= 2000 && n <= 2100
    }, 'Enter a year between 2000 and 2100'),
  tmps_opening_inventory: z.string().optional(),
  tmps_closing_inventory: z.string().optional(),
  tmps_cost_of_sales: z.string().optional(),
  tmps_other_operating_expenses: z.string().optional(),
  tmps_finance_costs: z.string().optional(),
  tmps_capital_expenditure: z.string().optional(),
  tmps_employee_costs: z.string().optional(),
  tmps_depreciation: z.string().optional(),
  tmps_utilities: z.string().optional(),
  tmps_service_fees: z.string().optional(),
  tmps_recharge_for_services: z.string().optional(),
  tmps_purchase_of_goods: z.string().optional(),
  tmps_purchase_of_services: z.string().optional(),
  suppliers_json: z.string().min(1, 'Add at least one supplier'),
})

type AssessmentFormValues = z.infer<typeof assessmentSchema>

type TmpsFieldKey =
  | 'tmps_opening_inventory'
  | 'tmps_closing_inventory'
  | 'tmps_cost_of_sales'
  | 'tmps_other_operating_expenses'
  | 'tmps_finance_costs'
  | 'tmps_capital_expenditure'
  | 'tmps_employee_costs'
  | 'tmps_depreciation'
  | 'tmps_utilities'
  | 'tmps_service_fees'
  | 'tmps_recharge_for_services'
  | 'tmps_purchase_of_goods'
  | 'tmps_purchase_of_services'

function validateBeforeSubmit(
  yearStr: string,
  tmpsTotal: number,
  rows: SupplierFormRow[],
): string | null {
  const y = parseInt(yearStr, 10)
  if (!Number.isFinite(y) || y < 2000 || y > 2100) {
    return 'Enter an assessment year between 2000 and 2100.'
  }
  if (tmpsTotal <= 0) {
    return 'TMPS total must be greater than zero. Increase inclusions or reduce exclusions until the total is positive.'
  }
  if (rows.length < 1) {
    return 'Add at least one supplier before saving.'
  }
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const name = (r.supplier_name ?? '').trim()
    const v = Number(r.value_ex_vat)
    if (!name) {
      return `Supplier row ${i + 1}: enter a supplier name.`
    }
    if (!Number.isFinite(v) || v < 0) {
      return `“${name}”: B-BBEE Spend must be zero or a positive number.`
    }
    if (v === 0) {
      return `“${name}”: enter B-BBEE Spend greater than zero, or remove the row.`
    }
  }
  return null
}

export type ProcurementAssessmentFormInitial = {
  assessment_year: number
  tmps: Partial<ProcurementTmpsInputs>
  suppliers: SupplierFormRow[]
  import_workbook_name?: string | null
  import_sheet_name?: string | null
}

function tmpsNumToInput(v: number | null | undefined): string {
  if (v == null || v === undefined) return ''
  const n = Number(v)
  if (!Number.isFinite(n)) return ''
  return String(n)
}

function buildFormDefaults(
  initial?: ProcurementAssessmentFormInitial,
): AssessmentFormValues {
  const year = initial?.assessment_year ?? new Date().getFullYear()
  const t = initial?.tmps ?? {}
  return {
    assessment_year: String(year),
    tmps_opening_inventory: tmpsNumToInput(t.tmps_opening_inventory),
    tmps_closing_inventory: tmpsNumToInput(t.tmps_closing_inventory),
    tmps_cost_of_sales: tmpsNumToInput(t.tmps_cost_of_sales),
    tmps_other_operating_expenses: tmpsNumToInput(
      t.tmps_other_operating_expenses,
    ),
    tmps_finance_costs: tmpsNumToInput(t.tmps_finance_costs),
    tmps_capital_expenditure: tmpsNumToInput(t.tmps_capital_expenditure),
    tmps_employee_costs: tmpsNumToInput(t.tmps_employee_costs),
    tmps_depreciation: tmpsNumToInput(t.tmps_depreciation),
    tmps_utilities: tmpsNumToInput(t.tmps_utilities),
    tmps_service_fees: tmpsNumToInput(t.tmps_service_fees),
    tmps_recharge_for_services: tmpsNumToInput(t.tmps_recharge_for_services),
    tmps_purchase_of_goods: tmpsNumToInput(t.tmps_purchase_of_goods),
    tmps_purchase_of_services: tmpsNumToInput(t.tmps_purchase_of_services),
    suppliers_json: '',
  }
}

interface NewProcurementAssessmentFormProps {
  formId: string
  initialError?: string
  initialData?: ProcurementAssessmentFormInitial
  submitLabel?: string
}

function FieldShell({
  children,
  label,
  hint,
  error,
  icon: Icon,
  stepLabel,
}: {
  children: React.ReactNode
  label: string
  hint?: string
  error?: string
  icon?: React.ComponentType<{ className?: string }>
  stepLabel?: string
}) {
  return (
    <div className="rounded-[24px] border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/70 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        {Icon ? (
          <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600">
            <Icon className="h-4 w-4" />
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          {stepLabel ? (
            <p className="mb-2 inline-flex items-center rounded-full border border-[#0b163d]/20 bg-[#0b163d]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0b163d]">
              {stepLabel}
            </p>
          ) : null}
          <label className="block text-sm font-semibold tracking-tight text-slate-900">
            {label}
          </label>

          {hint ? (
            <p className="mt-1 text-xs leading-5 text-slate-500">{hint}</p>
          ) : null}

          <div className="mt-3">{children}</div>

          {error ? (
            <p className="mt-2 text-xs font-medium text-red-600">{error}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function tmpsLineAmountForDisplay(
  amounts: ProcurementTmpsInputs,
  key: TmpsFieldKey,
): number {
  const n = Number(amounts[key] ?? 0)
  if (!Number.isFinite(n) || n < 0) return 0
  return n
}

function TmpsBreakdownBlock({
  lines,
  amounts,
  totalLabel,
  totalAmount,
}: {
  lines: ReadonlyArray<{ key: TmpsFieldKey; label: string }>
  amounts: ProcurementTmpsInputs
  totalLabel: string
  totalAmount: number
}) {
  return (
    <div
      className="mt-4 overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/80 to-white shadow-sm"
      role="region"
      aria-label={`${totalLabel} breakdown`}
    >
      <div className="border-b border-slate-200/80 bg-white/80 px-4 py-3 sm:px-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Line schedule
        </p>
        <p className="mt-0.5 text-xs text-slate-600">
          Amounts in ZAR — mirrors the fields above for review or screenshots.
        </p>
      </div>
      <div className="divide-y divide-slate-100 px-4 sm:px-5">
        {lines.map(({ key, label }) => (
          <div
            key={key}
            className="flex flex-wrap items-baseline justify-between gap-3 py-3.5 text-sm"
          >
            <span className="min-w-0 text-slate-700">{label}</span>
            <span className="shrink-0 tabular-nums font-semibold text-slate-900">
              {formatCurrency(tmpsLineAmountForDisplay(amounts, key))}
            </span>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-200/90 bg-slate-50/70 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <span className="text-sm font-semibold text-slate-900">
            {totalLabel}
          </span>
          <span className="text-sm font-semibold tabular-nums text-slate-900">
            {formatCurrency(totalAmount)}
          </span>
        </div>
      </div>
    </div>
  )
}

function PreviewMetric({
  label,
  value,
  emphasis = false,
}: {
  label: string
  value: React.ReactNode
  emphasis?: boolean
}) {
  return (
    <div
      className={[
        'rounded-2xl border px-4 py-4',
        emphasis ? 'border-white/10 bg-white/10' : 'border-white/10 bg-slate-950/40',
      ].join(' ')}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <div
        className={[
          'mt-2 font-semibold tracking-tight tabular-nums text-white',
          emphasis ? 'text-3xl' : 'text-xl',
        ].join(' ')}
      >
        {value}
      </div>
    </div>
  )
}

export function NewProcurementAssessmentForm({
  formId,
  initialError,
  initialData,
  submitLabel,
}: NewProcurementAssessmentFormProps) {
  const [serverError, setServerError] = useState(initialError)
  const [rows, setRows] = useState<SupplierFormRow[]>(
    () => initialData?.suppliers ?? [],
  )
  const [excelImportMeta, setExcelImportMeta] = useState<{
    workbookName: string
    sheetName: string
  } | null>(() => {
    const wb = initialData?.import_workbook_name?.trim()
    const sh = initialData?.import_sheet_name?.trim()
    if (!wb && !sh) return null
    return { workbookName: wb ?? '', sheetName: sh ?? '' }
  })
  const [showTmpsInclusionsBlock, setShowTmpsInclusionsBlock] =
    useState(false)
  const [showTmpsExclusionsBlock, setShowTmpsExclusionsBlock] =
    useState(false)

  useEffect(() => {
    if (initialError !== undefined) {
      setServerError(initialError)
    }
  }, [initialError])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<AssessmentFormValues>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: buildFormDefaults(initialData),
  })

  const tmpsValues = {
    tmps_opening_inventory: Number(watch('tmps_opening_inventory') || 0),
    tmps_closing_inventory: Number(watch('tmps_closing_inventory') || 0),
    tmps_cost_of_sales: Number(watch('tmps_cost_of_sales') || 0),
    tmps_other_operating_expenses: Number(
      watch('tmps_other_operating_expenses') || 0,
    ),
    tmps_finance_costs: Number(watch('tmps_finance_costs') || 0),
    tmps_capital_expenditure: Number(
      watch('tmps_capital_expenditure') || 0,
    ),
    tmps_employee_costs: Number(watch('tmps_employee_costs') || 0),
    tmps_depreciation: Number(watch('tmps_depreciation') || 0),
    tmps_utilities: Number(watch('tmps_utilities') || 0),
    tmps_service_fees: Number(watch('tmps_service_fees') || 0),
    tmps_recharge_for_services: Number(
      watch('tmps_recharge_for_services') || 0,
    ),
    tmps_purchase_of_goods: Number(watch('tmps_purchase_of_goods') || 0),
    tmps_purchase_of_services: Number(
      watch('tmps_purchase_of_services') || 0,
    ),
  }

  const tmpsTotals = calculateProcurementTmpsTotals(tmpsValues)
  const tmpsTotal = tmpsTotals.tmpsTotal
  const suppliersJson = watch('suppliers_json')

  const preview = useMemo(() => {
    if (!rows.length || tmpsTotal <= 0 || !suppliersJson) {
      return null
    }

    let parsed: ProcurementSupplierInput[] = []

    try {
      parsed = JSON.parse(suppliersJson || '[]')
    } catch {
      return null
    }

    const calculatedRows = parsed.map((p) => calculateSupplierRow(p))
    const totals = aggregateCategoryTotals(calculatedRows)

    return calculateProcurementResults({
      totals,
      totalMeasuredSpend: tmpsTotal,
    })
  }, [rows, suppliersJson, tmpsTotal])

  const supplierExVatTotal = useMemo(
    () =>
      rows.reduce((sum, row) => sum + (Number(row.value_ex_vat) || 0), 0),
    [rows],
  )

  const tmpsSupplierSpendMismatch =
    tmpsTotal > 0 &&
    rows.length > 0 &&
    supplierExVatTotal > tmpsTotal

  const totalRecognisedBbbee = useMemo(() => {
    return rows.reduce((sum, row) => {
      const calc = calculateSupplierRow({
        supplier_name: row.supplier_name,
        supplier_code: row.supplier_code,
        vat_number: row.vat_number,
        company_registration: row.company_registration,
        bo_etc: row.bo_etc,
        fts: row.fts,
        des: row.des,
        prop: row.prop,
        supplier_type: row.supplier_type,
        level: row.level,
        value_ex_vat: Number(row.value_ex_vat) || 0,
        is_51_black_owned: !!row.is_51_black_owned,
        is_30_black_women_owned: !!row.is_30_black_women_owned,
        is_51_bdgs: !!row.is_51_bdgs,
        expiry: row.expiry,
        empower: row.empower,
      })
      return sum + calc.bbbee_spend
    }, 0)
  }, [rows])

  const bbbeeShareOfTmps =
    tmpsTotal > 0 ? totalRecognisedBbbee / tmpsTotal : 0

  const rhfErrorMessages = useMemo(() => {
    const msgs: string[] = []
    const push = (m?: string) => {
      if (m && !msgs.includes(m)) msgs.push(m)
    }
    push(errors.assessment_year?.message)
    push(errors.suppliers_json?.message)
    return msgs
  }, [errors.assessment_year?.message, errors.suppliers_json?.message])

  const onValid = (data: AssessmentFormValues) => {
    const clientErr = validateBeforeSubmit(
      data.assessment_year,
      tmpsTotal,
      rows,
    )
    if (clientErr) {
      setServerError(clientErr)
      return
    }

    setServerError(undefined)
    const form = document.getElementById(formId) as HTMLFormElement | null
    form?.requestSubmit()
  }

  const tmpsInputClass =
    'w-full rounded-xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/60 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#0b5259]/70 focus:ring-4 focus:ring-[#0b5259]/15'

  return (
    <>
      <input type="hidden" {...register('suppliers_json')} />
      <input
        type="hidden"
        name="import_workbook_name"
        value={excelImportMeta?.workbookName ?? ''}
        readOnly
      />
      <input
        type="hidden"
        name="import_sheet_name"
        value={excelImportMeta?.sheetName ?? ''}
        readOnly
      />
      <div className="space-y-10">
        {/* Setup fields */}
        <section className="space-y-5">
          <div>
            <FieldShell
              label="Assessment year"
              hint="Step 1 · Reporting year for this procurement file (2000–2100)."
              error={errors.assessment_year?.message}
              icon={Calendar}
              stepLabel="Step 1"
            >
              <input
                id="assessment_year"
                type="number"
                min={2000}
                max={2100}
                {...register('assessment_year')}
                className="w-full rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/60 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#0b5259]/70 focus:ring-4 focus:ring-[#0b5259]/15"
              />
            </FieldShell>
          </div>

          <div className="space-y-6 rounded-[28px] border border-slate-200/80 bg-gradient-to-b from-slate-50/80 to-white p-5 shadow-sm sm:p-6">
            <div>
              <p className="inline-flex items-center rounded-full border border-[#0b163d]/20 bg-[#0b163d]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0b163d]">
                Step 2
              </p>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                TMPS (measured procurement)
              </p>
              <h3 className="mt-1 text-lg font-semibold tracking-tight text-slate-950">
                Total measured procurement spend
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
                TMPS is{' '}
                <span className="font-medium text-slate-800">inclusions</span> minus{' '}
                <span className="font-medium text-slate-800">exclusions</span>. That
                figure becomes the denominator for every procurement percentage. It must
                be <span className="font-medium text-slate-800">positive</span> before you
                can save.
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Enter amounts in <span className="font-medium text-slate-700">Rands</span>,
                using the same definitions as your finance workbook or TMPS schedule.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/40 p-5 shadow-sm">
              <div className="border-b border-slate-100 pb-4 mb-5">
                <h4 className="text-sm font-semibold text-slate-900">Inclusions</h4>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                  Amounts that form the starting base for TMPS. Align with your finance /
                  workbook definitions; leave lines you do not use at zero.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {TMPS_INCLUSIONS.map(({ key, label }) => (
                  <div key={key} className="space-y-1.5">
                    <label
                      htmlFor={`tmps-${key}`}
                      className="text-xs font-medium text-slate-700"
                    >
                      {label}
                    </label>
                    <input
                      id={`tmps-${key}`}
                      type="text"
                      inputMode="decimal"
                      aria-label={`TMPS inclusion: ${label}`}
                      {...register(key as TmpsFieldKey)}
                      className={tmpsInputClass}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-700">
                    Total inclusions
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setShowTmpsInclusionsBlock((open) => !open)
                    }
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#0b5259]/30 bg-white px-3 py-1 text-xs font-semibold text-[#0b5259] shadow-sm transition hover:bg-[#0b5259]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b5259]"
                    aria-expanded={showTmpsInclusionsBlock}
                  >
                    <Plus
                      className="h-3.5 w-3.5 shrink-0"
                      aria-hidden
                    />
                    {showTmpsInclusionsBlock ? 'Hide block' : 'Add block'}
                  </button>
                </div>
                <span className="font-semibold tabular-nums text-slate-900">
                  {formatCurrency(tmpsTotals.inclusionsTotal)}
                </span>
              </div>
              {showTmpsInclusionsBlock ? (
                <TmpsBreakdownBlock
                  lines={TMPS_INCLUSIONS}
                  amounts={tmpsValues}
                  totalLabel="Total inclusions"
                  totalAmount={tmpsTotals.inclusionsTotal}
                />
              ) : null}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/40 p-5 shadow-sm">
              <div className="border-b border-slate-100 pb-4 mb-5">
                <h4 className="text-sm font-semibold text-slate-900">Exclusions</h4>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                  Amounts subtracted from the inclusion base. Enter all applicable
                  exclusions so the TMPS denominator matches your methodology.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {TMPS_EXCLUSIONS.map(({ key, label }) => (
                  <div
                    key={key}
                    className={
                      key === 'tmps_recharge_for_services'
                        ? 'space-y-1.5 sm:col-span-2 lg:col-span-3'
                        : 'space-y-1.5'
                    }
                  >
                    <label
                      htmlFor={`tmps-${key}`}
                      className="text-xs font-medium text-slate-700"
                    >
                      {label}
                    </label>
                    <input
                      id={`tmps-${key}`}
                      type="text"
                      inputMode="decimal"
                      aria-label={`TMPS exclusion: ${label}`}
                      {...register(key as TmpsFieldKey)}
                      className={tmpsInputClass}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-700">
                    Total exclusions
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setShowTmpsExclusionsBlock((open) => !open)
                    }
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#0b5259]/30 bg-white px-3 py-1 text-xs font-semibold text-[#0b5259] shadow-sm transition hover:bg-[#0b5259]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b5259]"
                    aria-expanded={showTmpsExclusionsBlock}
                  >
                    <Plus
                      className="h-3.5 w-3.5 shrink-0"
                      aria-hidden
                    />
                    {showTmpsExclusionsBlock ? 'Hide block' : 'Add block'}
                  </button>
                </div>
                <span className="font-semibold tabular-nums text-slate-900">
                  {formatCurrency(tmpsTotals.exclusionsTotal)}
                </span>
              </div>
              {showTmpsExclusionsBlock ? (
                <TmpsBreakdownBlock
                  lines={TMPS_EXCLUSIONS}
                  amounts={tmpsValues}
                  totalLabel="Total exclusions"
                  totalAmount={tmpsTotals.exclusionsTotal}
                />
              ) : null}
            </div>

            <div
              className={[
                'rounded-2xl border px-5 py-5',
                tmpsTotal < 0
                  ? 'border-amber-300 bg-amber-50'
                  : 'border-slate-900 bg-slate-950 text-white',
              ].join(' ')}
            >
              <p
                className={
                  tmpsTotal < 0
                    ? 'text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-800'
                    : 'text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300'
                }
              >
                Resulting TMPS total (live)
              </p>
              <p
                className={[
                  'mt-2 text-3xl font-semibold tracking-tight tabular-nums',
                  tmpsTotal < 0 ? 'text-amber-950' : 'text-white',
                ].join(' ')}
              >
                {Number.isFinite(tmpsTotal) ? formatCurrency(tmpsTotal) : '0.00'}
              </p>
              <p
                className={[
                  'mt-2 text-xs leading-relaxed',
                  tmpsTotal < 0 ? 'text-amber-900' : 'text-slate-300',
                ].join(' ')}
              >
                {formatCurrency(tmpsTotals.inclusionsTotal)} inclusions −{' '}
                {formatCurrency(tmpsTotals.exclusionsTotal)} exclusions. This value is
                saved as measured procurement spend and used as the denominator for
                scoring.
              </p>
              {tmpsTotal < 0 ? (
                <p className="mt-3 text-xs font-medium text-amber-900">
                  Exclusions exceed inclusions. Adjust figures until the total is
                  positive to enable save and meaningful percentages.
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/40 px-5 py-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Live summary
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Updates as TMPS and supplier rows change—use this as a quick sanity check before
            you save.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-[#0b163d]/20 bg-gradient-to-br from-[#0b163d] to-[#0f255f] px-4 py-3 text-white shadow-[0_10px_26px_rgba(11,22,61,0.22)]">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
                TMPS total
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-white">
                {formatCurrency(Number.isFinite(tmpsTotal) ? tmpsTotal : 0)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Recognised B-BBEE spend
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                {formatCurrency(totalRecognisedBbbee)}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Recognition applied to each line&apos;s B-BBEE Spend, summed
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                B-BBEE spend vs TMPS
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                {tmpsTotal > 0
                  ? formatPercentFromRatio(bbbeeShareOfTmps, 1)
                  : '—'}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Recognised B-BBEE spend ÷ TMPS (when TMPS &gt; 0)
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Est. procurement points
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                {preview ? preview.totalScore.toFixed(2) : '—'}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Shown when TMPS is positive and suppliers are entered
              </p>
            </div>
          </div>

          {tmpsSupplierSpendMismatch ? (
            <div
              className="mt-4 rounded-xl border border-amber-200/90 bg-amber-50/40 px-4 py-3"
              role="status"
            >
              <div className="flex gap-3">
                <Info
                  className="mt-0.5 h-4 w-4 shrink-0 text-amber-700/90"
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-amber-950">
                    Supplier spend higher than TMPS
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-amber-900/90">
                    Total supplier B-BBEE Spend amounts add up to{' '}
                    <span className="font-medium tabular-nums">
                      {formatCurrency(supplierExVatTotal)}
                    </span>
                    , which is above your TMPS total of{' '}
                    <span className="font-medium tabular-nums">
                      {formatCurrency(tmpsTotal)}
                    </span>
                    . TMPS is the denominator for procurement percentages; when
                    supplier spend exceeds it, category shares can look higher
                    than you might expect (points are still capped). If that is
                    not what you intend, please review your TMPS lines and
                    supplier values before saving.
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </section>

        {/* Suppliers */}
        <section className="space-y-5 pt-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="inline-flex items-center rounded-full border border-[#0b163d]/20 bg-[#0b163d]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0b163d]">
                Step 3
              </p>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Supplier capture
              </p>
              <h3 className="mt-1.5 text-xl font-semibold tracking-tight text-slate-950">
                Suppliers and B-BBEE spend
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Each row is a supplier line used for recognition, category allocation, and the
                live score preview. Enter B-BBEE Spend per line (or paste many rows via bulk
                import).
              </p>
            </div>

            <div className="shrink-0 rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/80 px-4 py-3 text-right shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Rows
              </p>
              <p className="mt-0.5 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">
                {rows.length}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-200/80 bg-gradient-to-b from-white to-slate-50/70 px-4 py-4 sm:px-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Supplier workspace
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Manual entry, bulk paste, ownership flags (BO / BFO / BDG), and
                    recognition preview.
                  </p>
                </div>

                <div className="inline-flex items-center rounded-full border border-[#0b5259]/20 bg-[#0b5259]/10 px-3 py-1.5 text-xs font-medium text-[#0b5259]">
                  This assessment only
                </div>
              </div>
            </div>

            <div className="space-y-6 p-4 sm:p-5 lg:p-6">
              <ProcurementExcelImport
                tmpsTotal={tmpsTotal}
                onApplySuppliers={(incoming, meta) => {
                  setRows(incoming)
                  setValue(
                    'suppliers_json',
                    JSON.stringify(
                      incoming.map(({ id, ...rest }) => {
                        void id
                        return rest
                      }),
                    ),
                  )
                  setServerError(undefined)
                  if (meta) {
                    setExcelImportMeta(meta)
                  }
                }}
              />
              <SuppliersTable
                setValue={setValue}
                fieldName="suppliers_json"
                rows={rows}
                onChangeRows={setRows}
              />
            </div>
          </div>
        </section>

        {/* Preview */}
        {preview && (
          <section className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-950 text-slate-50">
            <div className="border-b border-white/10 px-5 py-5 sm:px-6 sm:py-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                  <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                    Live Preview
                  </div>

                  <h3 className="mt-3 text-xl font-semibold tracking-tight text-white sm:text-2xl">
                    Procurement Score Preview
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                    Uses your current supplier rows and the TMPS total as the measured
                    procurement denominator.
                  </p>
                </div>

                <div className="w-full max-w-xs">
                  <PreviewMetric
                    label="Total Points"
                    value={preview.totalScore.toFixed(2)}
                    emphasis
                  />
                </div>
              </div>
            </div>

            <div className="px-5 py-5 sm:px-6 sm:py-6">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {PROCUREMENT_CATEGORIES.map((def) => {
                  const cat = preview.categories.find((c) => c.key === def.key)
                  if (!cat) return null

                  return (
                    <div
                      key={def.key}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/[0.07]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold leading-6 text-white">
                            {def.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            Target {formatPercentFromRatio(def.targetPercent, 0)}
                          </p>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-right">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
                            Score
                          </p>
                          <p className="mt-1 text-sm font-semibold tabular-nums text-white">
                            {cat.pointsAchieved.toFixed(2)} /{' '}
                            {def.availablePoints}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>Achieved</span>
                          <span>
                            {formatPercentFromRatio(cat.achievedPercent, 1)}
                          </span>
                        </div>

                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-white"
                            style={{
                              width: `${Math.min(cat.achievedPercent * 100, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )}
      </div>

      {(serverError ||
        Object.keys(errors).length > 0) && (
        <div className="mt-6 rounded-[20px] border border-red-200 bg-red-50/90 p-4">
          <div className="flex items-start gap-3">
            <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-red-600">
              <AlertCircle className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-red-800">
                Before you can save
              </p>
              <div className="mt-1 text-sm leading-6 text-red-700">
                {serverError ? (
                  <p>{serverError}</p>
                ) : rhfErrorMessages.length > 0 ? (
                  <ul className="list-disc space-y-1 pl-5">
                    {rhfErrorMessages.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                ) : (
                  <p>Review the highlighted fields and try again.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 border-t border-slate-200/80 pt-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <TrendingUp className="h-4 w-4 shrink-0 text-slate-500" />
            <p className="font-medium">
              Confirm TMPS, suppliers, and the preview, then save the assessment.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSubmit(onValid)}
            disabled={isSubmitting || tmpsTotal <= 0}
            aria-label={submitLabel ?? 'Save procurement assessment'}
            className={buttonStyles({
              variant: 'primary',
              size: 'md',
              className: 'rounded-2xl px-8 py-3.5 font-semibold',
            })}
          >
            {isSubmitting
              ? 'Saving…'
              : submitLabel ?? 'Save procurement assessment'}
          </button>
        </div>
      </div>
    </>
  )
}