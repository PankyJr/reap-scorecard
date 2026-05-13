'use client'

import { flushSync } from 'react-dom'
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
import { formatCurrency, formatPercentFromRatio, formatPoints } from '@/lib/procurement/format'
import {
  TMPS_CUSTOM_LINES_MAX,
  newTmpsCustomLineFormRow,
  normalizeStoredCustomLinesToFormRows,
  serializeTmpsCustomFormRows,
  type ProcurementTmpsCustomLine,
  type TmpsCustomLineFormRow,
} from '@/lib/procurement/tmpsCustom'
import {
  computeProcurementScoringDenominator,
  tmpsDenominatorSourceShortNote,
  tmpsDenominatorSourceTitle,
  type ProcurementTmpsDenominatorSource,
} from '@/lib/procurement/tmpsDenominator'
import { SuppliersTable } from './SuppliersTable'
import { ProcurementExcelImport } from './ProcurementExcelImport'
import {
  serializeSupplierRowsForAssessment,
  type SupplierFormRow,
} from '@/lib/procurement/supplierFormRow'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { ProcurementScorecardTable } from '@/components/procurement/ProcurementScorecardTable'
import { PROCUREMENT_MAX_POINTS } from '@/lib/procurement/insights'
import {
  AlertCircle,
  Calendar,
  Info,
  Plus,
  Trash2,
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
  scoringDenominator: number,
  rows: SupplierFormRow[],
): string | null {
  const y = parseInt(yearStr, 10)
  if (!Number.isFinite(y) || y < 2000 || y > 2100) {
    return 'Enter an assessment year between 2000 and 2100.'
  }
  if (scoringDenominator <= 0) {
    return 'Choose a TMPS denominator greater than zero (calculated TMPS pad or supplier spend as TMPS).'
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
  tmpsCustomInclusions?: ProcurementTmpsCustomLine[]
  tmpsCustomExclusions?: ProcurementTmpsCustomLine[]
  tmpsDenominatorSource?: ProcurementTmpsDenominatorSource
  tmpsManualAmount?: number | null
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
    suppliers_json: initial?.suppliers?.length
      ? serializeSupplierRowsForAssessment(initial.suppliers)
      : '',
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
  const [customInclusionRows, setCustomInclusionRows] = useState<
    TmpsCustomLineFormRow[]
  >(() =>
    normalizeStoredCustomLinesToFormRows(initialData?.tmpsCustomInclusions),
  )
  const [customExclusionRows, setCustomExclusionRows] = useState<
    TmpsCustomLineFormRow[]
  >(() =>
    normalizeStoredCustomLinesToFormRows(initialData?.tmpsCustomExclusions),
  )
  const [tmpsDenominatorSource, setTmpsDenominatorSource] =
    useState<ProcurementTmpsDenominatorSource>(() => {
      const raw = initialData?.tmpsDenominatorSource ?? 'calculated'
      if (raw === 'manual') {
        const sum = (initialData?.suppliers ?? []).reduce(
          (s, r) => s + (Number(r.value_ex_vat) || 0),
          0,
        )
        return sum > 0 ? 'import_supplier_total' : 'calculated'
      }
      return raw
    })

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

  const wOpen = watch('tmps_opening_inventory')
  const wClose = watch('tmps_closing_inventory')
  const wCos = watch('tmps_cost_of_sales')
  const wOoe = watch('tmps_other_operating_expenses')
  const wFin = watch('tmps_finance_costs')
  const wCapex = watch('tmps_capital_expenditure')
  const wEmp = watch('tmps_employee_costs')
  const wDep = watch('tmps_depreciation')
  const wUtil = watch('tmps_utilities')
  const wSvc = watch('tmps_service_fees')
  const wRech = watch('tmps_recharge_for_services')
  const wPog = watch('tmps_purchase_of_goods')
  const wPos = watch('tmps_purchase_of_services')

  const tmpsValues = useMemo(
    () => ({
      tmps_opening_inventory: Number(wOpen || 0),
      tmps_closing_inventory: Number(wClose || 0),
      tmps_cost_of_sales: Number(wCos || 0),
      tmps_other_operating_expenses: Number(wOoe || 0),
      tmps_finance_costs: Number(wFin || 0),
      tmps_capital_expenditure: Number(wCapex || 0),
      tmps_employee_costs: Number(wEmp || 0),
      tmps_depreciation: Number(wDep || 0),
      tmps_utilities: Number(wUtil || 0),
      tmps_service_fees: Number(wSvc || 0),
      tmps_recharge_for_services: Number(wRech || 0),
      tmps_purchase_of_goods: Number(wPog || 0),
      tmps_purchase_of_services: Number(wPos || 0),
    }),
    [
      wOpen,
      wClose,
      wCos,
      wOoe,
      wFin,
      wCapex,
      wEmp,
      wDep,
      wUtil,
      wSvc,
      wRech,
      wPog,
      wPos,
    ],
  )

  const customInclusionsPayload = useMemo(
    () => serializeTmpsCustomFormRows(customInclusionRows),
    [customInclusionRows],
  )
  const customExclusionsPayload = useMemo(
    () => serializeTmpsCustomFormRows(customExclusionRows),
    [customExclusionRows],
  )

  const tmpsTotals = useMemo(
    () =>
      calculateProcurementTmpsTotals(tmpsValues, {
        inclusions: customInclusionsPayload,
        exclusions: customExclusionsPayload,
      }),
    [tmpsValues, customInclusionsPayload, customExclusionsPayload],
  )
  const calculatedTmpsFromPad = tmpsTotals.tmpsTotal

  const supplierValuePayload = useMemo(
    () =>
      rows.map((r) => ({
        value_ex_vat: Number(r.value_ex_vat) || 0,
      })),
    [rows],
  )

  const scoringResolution = useMemo(
    () =>
      computeProcurementScoringDenominator({
        source: tmpsDenominatorSource,
        tmpsInputs: tmpsValues,
        tmpsCustomInclusions: customInclusionsPayload,
        tmpsCustomExclusions: customExclusionsPayload,
        tmpsManualAmount: undefined,
        suppliers: supplierValuePayload,
      }),
    [
      tmpsDenominatorSource,
      tmpsValues,
      customInclusionsPayload,
      customExclusionsPayload,
      supplierValuePayload,
    ],
  )

  const effectiveTmpsDenominator = scoringResolution.denominator
  const suppliersJson = watch('suppliers_json')

  const preview = useMemo(() => {
    if (!rows.length || effectiveTmpsDenominator <= 0 || !suppliersJson) {
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
      totalMeasuredSpend: effectiveTmpsDenominator,
    })
  }, [rows, suppliersJson, effectiveTmpsDenominator])

  const supplierExVatTotal = useMemo(
    () =>
      rows.reduce((sum, row) => sum + (Number(row.value_ex_vat) || 0), 0),
    [rows],
  )

  useEffect(() => {
    if (
      tmpsDenominatorSource === 'import_supplier_total' &&
      supplierExVatTotal <= 0
    ) {
      setTmpsDenominatorSource('calculated')
    }
  }, [tmpsDenominatorSource, supplierExVatTotal])

  const tmpsSupplierSpendMismatch =
    effectiveTmpsDenominator > 0 &&
    rows.length > 0 &&
    supplierExVatTotal > effectiveTmpsDenominator

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
    effectiveTmpsDenominator > 0
      ? totalRecognisedBbbee / effectiveTmpsDenominator
      : 0

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
      effectiveTmpsDenominator,
      rows,
    )
    if (clientErr) {
      setServerError(clientErr)
      return
    }

    setServerError(undefined)
    flushSync(() => {
      setValue(
        'suppliers_json',
        serializeSupplierRowsForAssessment(rows),
        { shouldDirty: true },
      )
    })
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
      <input
        type="hidden"
        name="tmps_custom_inclusions_json"
        value={JSON.stringify(customInclusionsPayload)}
        readOnly
      />
      <input
        type="hidden"
        name="tmps_custom_exclusions_json"
        value={JSON.stringify(customExclusionsPayload)}
        readOnly
      />
      <input
        type="hidden"
        name="tmps_denominator_source"
        value={tmpsDenominatorSource}
        readOnly
      />
      <input type="hidden" name="tmps_manual_amount" value="" readOnly />
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
                What number divides your supplier spend?
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
                <span className="font-medium text-slate-800">Do this in order:</span>{' '}
                (1) Pick one option below — that decides TMPS. (2) Only if you chose{' '}
                <strong>Calculated TMPS</strong>, fill the pad (inclusions and exclusions).{' '}
                (3) Add suppliers in Step 3. Each category % is{' '}
                <span className="font-medium text-slate-800">category spend ÷ TMPS</span>.
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Amounts are in <span className="font-medium text-slate-700">Rands (ZAR)</span>
                , same meanings as your finance workbook.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/40 p-5 shadow-sm">
              <h4 className="text-sm font-semibold text-slate-900">
                1 · Pick what counts as TMPS
              </h4>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                One choice. Supplier lines stay the same — only the number we divide by
                (the denominator) changes.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
                <button
                  type="button"
                  aria-pressed={tmpsDenominatorSource === 'calculated'}
                  onClick={() => setTmpsDenominatorSource('calculated')}
                  className={[
                    'rounded-2xl border px-4 py-3 text-left text-sm transition',
                    tmpsDenominatorSource === 'calculated'
                      ? 'border-[#0b5259] bg-[#0b5259]/10 ring-2 ring-[#0b5259]/30'
                      : 'border-slate-200 bg-white hover:border-slate-300',
                  ].join(' ')}
                >
                  <p className="font-semibold text-slate-900">Calculated TMPS</p>
                  <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Use the pad below
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    We add <strong>inclusions</strong>, subtract <strong>exclusions</strong>{' '}
                    (and any custom lines). Pick this when your pad gives a positive total.
                  </p>
                </button>
                <button
                  type="button"
                  aria-pressed={tmpsDenominatorSource === 'import_supplier_total'}
                  disabled={supplierExVatTotal <= 0}
                  onClick={() =>
                    supplierExVatTotal > 0 &&
                    setTmpsDenominatorSource('import_supplier_total')
                  }
                  className={[
                    'rounded-2xl border px-4 py-3 text-left text-sm transition',
                    tmpsDenominatorSource === 'import_supplier_total'
                      ? 'border-[#0b5259] bg-[#0b5259]/10 ring-2 ring-[#0b5259]/30'
                      : 'border-slate-200 bg-white hover:border-slate-300',
                    supplierExVatTotal <= 0
                      ? 'cursor-not-allowed opacity-50'
                      : '',
                  ].join(' ')}
                >
                  <p className="font-semibold text-slate-900">Use supplier spend as TMPS</p>
                  <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    When the pad is empty or zero
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    TMPS = sum of supplier <strong>B-BBEE Spend (ex VAT)</strong> from step 3
                    {supplierExVatTotal > 0
                      ? ` — now ${formatCurrency(supplierExVatTotal)}.`
                      : '. Add supplier lines in step 3 first.'}
                  </p>
                </button>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 text-xs text-slate-700">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Live scoring denominator (TMPS)
                </p>
                <p className="mt-1 text-lg font-bold tabular-nums tracking-tight text-slate-950">
                  {formatCurrency(effectiveTmpsDenominator)}
                </p>
                <p className="mt-0.5 text-sm font-medium text-slate-800">
                  {tmpsDenominatorSource === 'calculated'
                    ? 'From TMPS pad (inclusions − exclusions)'
                    : 'From supplier lines (sum of spend)'}
                </p>
                <details className="mt-2 group">
                  <summary className="cursor-pointer text-[11px] font-semibold text-[#0b5259] underline decoration-[#0b5259]/30 underline-offset-2 hover:decoration-[#0b5259]">
                    How this is used in the score
                  </summary>
                  <p className="mt-2 rounded-lg bg-white/80 px-2 py-2 text-[11px] leading-relaxed text-slate-600">
                    {tmpsDenominatorSourceShortNote(tmpsDenominatorSource)}
                  </p>
                </details>
              </div>

              {tmpsDenominatorSource === 'calculated' && calculatedTmpsFromPad <= 0 ? (
                <div
                  className="mt-4 rounded-xl border border-amber-200/90 bg-amber-50/60 px-4 py-3 text-xs text-amber-950"
                  role="status"
                >
                  <p className="font-semibold text-amber-950">
                    Calculated TMPS is R0 — you cannot save yet
                  </p>
                  <p className="mt-2 font-medium text-amber-900/95">Do one of the following:</p>
                  <ol className="mt-1.5 list-decimal space-y-1 pl-4 leading-relaxed text-amber-900/90">
                    <li>
                      Fill <strong>Inclusions</strong> and <strong>Exclusions</strong> below
                      until the pad total is above zero, or
                    </li>
                    <li>
                      Go to <strong>Step 3</strong>, add suppliers, then choose{' '}
                      <strong>Use supplier spend as TMPS</strong> (sum of B-BBEE Spend lines).
                    </li>
                  </ol>
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/40 p-5 shadow-sm">
              <div className="border-b border-slate-100 pb-4 mb-5">
                <h4 className="text-sm font-semibold text-slate-900">
                  2 · Inclusions
                  {tmpsDenominatorSource !== 'calculated' ? (
                    <span className="ml-2 font-normal text-slate-500">
                      (optional — not used for your current TMPS choice)
                    </span>
                  ) : null}
                </h4>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                  {tmpsDenominatorSource === 'calculated'
                    ? 'Amounts that add into TMPS. Match your workbook; leave unused lines at zero.'
                    : 'Optional: your TMPS choice does not use this pad for scoring. Fill for reference or skip.'}
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
              {customInclusionRows.length > 0 ? (
                <div className="mt-6 space-y-4">
                  {customInclusionRows.map((row) => (
                    <div
                      key={row.id}
                      className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Additional inclusion
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            setCustomInclusionRows((prev) =>
                              prev.filter((r) => r.id !== row.id),
                            )
                          }
                          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-800"
                          aria-label="Remove this line"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          Remove
                        </button>
                      </div>
                      <div className="mt-3 space-y-1.5">
                        <label
                          className="text-xs font-medium text-slate-700"
                          htmlFor={`tmps-custom-inc-label-${row.id}`}
                        >
                          Description
                        </label>
                        <input
                          id={`tmps-custom-inc-label-${row.id}`}
                          type="text"
                          value={row.label}
                          onChange={(e) =>
                            setCustomInclusionRows((prev) =>
                              prev.map((r) =>
                                r.id === row.id
                                  ? { ...r, label: e.target.value }
                                  : r,
                              ),
                            )
                          }
                          placeholder="e.g. Purchase of goods"
                          className={tmpsInputClass}
                          autoComplete="off"
                        />
                      </div>
                      <div className="mt-4 space-y-1.5">
                        <label
                          className="text-xs font-medium text-slate-700"
                          htmlFor={`tmps-custom-inc-amt-${row.id}`}
                        >
                          Amount (ZAR)
                        </label>
                        <input
                          id={`tmps-custom-inc-amt-${row.id}`}
                          type="text"
                          inputMode="decimal"
                          value={row.amount}
                          onChange={(e) =>
                            setCustomInclusionRows((prev) =>
                              prev.map((r) =>
                                r.id === row.id
                                  ? { ...r, amount: e.target.value }
                                  : r,
                              ),
                            )
                          }
                          placeholder="0"
                          className={tmpsInputClass}
                          autoComplete="off"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={
                    customInclusionRows.length >= TMPS_CUSTOM_LINES_MAX
                  }
                  onClick={() =>
                    setCustomInclusionRows((prev) => [
                      ...prev,
                      newTmpsCustomLineFormRow(),
                    ])
                  }
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#0b5259]/30 bg-white px-3 py-1.5 text-xs font-semibold text-[#0b5259] shadow-sm transition hover:bg-[#0b5259]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b5259] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Add block
                </button>
                <span className="text-xs text-slate-500">
                  Optional lines you name — amounts add to inclusions (max{' '}
                  {TMPS_CUSTOM_LINES_MAX} per side).
                </span>
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm">
                <span className="font-semibold text-slate-700">
                  Total inclusions
                </span>
                <span className="font-semibold tabular-nums text-slate-900">
                  {formatCurrency(tmpsTotals.inclusionsTotal)}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/40 p-5 shadow-sm">
              <div className="border-b border-slate-100 pb-4 mb-5">
                <h4 className="text-sm font-semibold text-slate-900">
                  3 · Exclusions
                  {tmpsDenominatorSource !== 'calculated' ? (
                    <span className="ml-2 font-normal text-slate-500">
                      (optional — not used for your current TMPS choice)
                    </span>
                  ) : null}
                </h4>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                  {tmpsDenominatorSource === 'calculated'
                    ? 'Amounts subtracted from inclusions. Enter all that apply so TMPS matches your methodology.'
                    : 'Same as inclusions: optional when your TMPS choice is fixed or supplier total.'}
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
              {customExclusionRows.length > 0 ? (
                <div className="mt-6 space-y-4">
                  {customExclusionRows.map((row) => (
                    <div
                      key={row.id}
                      className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Additional exclusion
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            setCustomExclusionRows((prev) =>
                              prev.filter((r) => r.id !== row.id),
                            )
                          }
                          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-800"
                          aria-label="Remove this line"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          Remove
                        </button>
                      </div>
                      <div className="mt-3 space-y-1.5">
                        <label
                          className="text-xs font-medium text-slate-700"
                          htmlFor={`tmps-custom-exc-label-${row.id}`}
                        >
                          Description
                        </label>
                        <input
                          id={`tmps-custom-exc-label-${row.id}`}
                          type="text"
                          value={row.label}
                          onChange={(e) =>
                            setCustomExclusionRows((prev) =>
                              prev.map((r) =>
                                r.id === row.id
                                  ? { ...r, label: e.target.value }
                                  : r,
                              ),
                            )
                          }
                          placeholder="e.g. Intercompany recharge"
                          className={tmpsInputClass}
                          autoComplete="off"
                        />
                      </div>
                      <div className="mt-4 space-y-1.5">
                        <label
                          className="text-xs font-medium text-slate-700"
                          htmlFor={`tmps-custom-exc-amt-${row.id}`}
                        >
                          Amount (ZAR)
                        </label>
                        <input
                          id={`tmps-custom-exc-amt-${row.id}`}
                          type="text"
                          inputMode="decimal"
                          value={row.amount}
                          onChange={(e) =>
                            setCustomExclusionRows((prev) =>
                              prev.map((r) =>
                                r.id === row.id
                                  ? { ...r, amount: e.target.value }
                                  : r,
                              ),
                            )
                          }
                          placeholder="0"
                          className={tmpsInputClass}
                          autoComplete="off"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={
                    customExclusionRows.length >= TMPS_CUSTOM_LINES_MAX
                  }
                  onClick={() =>
                    setCustomExclusionRows((prev) => [
                      ...prev,
                      newTmpsCustomLineFormRow(),
                    ])
                  }
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#0b5259]/30 bg-white px-3 py-1.5 text-xs font-semibold text-[#0b5259] shadow-sm transition hover:bg-[#0b5259]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b5259] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Add block
                </button>
                <span className="text-xs text-slate-500">
                  Optional lines — amounts add to exclusions (max{' '}
                  {TMPS_CUSTOM_LINES_MAX} per side).
                </span>
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-sm">
                <span className="font-semibold text-slate-700">
                  Total exclusions
                </span>
                <span className="font-semibold tabular-nums text-slate-900">
                  {formatCurrency(tmpsTotals.exclusionsTotal)}
                </span>
              </div>
            </div>

            <div
              className={[
                'rounded-2xl border px-5 py-5',
                calculatedTmpsFromPad < 0
                  ? 'border-amber-300 bg-amber-50'
                  : 'border-slate-900 bg-slate-950 text-white',
              ].join(' ')}
            >
              <p
                className={
                  calculatedTmpsFromPad < 0
                    ? 'text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-800'
                    : 'text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300'
                }
              >
                Calculated TMPS from pad (live)
              </p>
              <p
                className={[
                  'mt-2 text-3xl font-semibold tracking-tight tabular-nums',
                  calculatedTmpsFromPad < 0
                    ? 'text-amber-950'
                    : 'text-white',
                ].join(' ')}
              >
                {Number.isFinite(calculatedTmpsFromPad)
                  ? formatCurrency(calculatedTmpsFromPad)
                  : '0.00'}
              </p>
              <p
                className={[
                  'mt-2 text-xs leading-relaxed',
                  calculatedTmpsFromPad < 0
                    ? 'text-amber-900'
                    : 'text-slate-300',
                ].join(' ')}
              >
                {formatCurrency(tmpsTotals.inclusionsTotal)} inclusions −{' '}
                {formatCurrency(tmpsTotals.exclusionsTotal)} exclusions (plus custom TMPS
                lines). Procurement scoring uses the denominator you selected above, not
                necessarily this pad total.
              </p>
              {calculatedTmpsFromPad < 0 ? (
                <p className="mt-3 text-xs font-medium text-amber-900">
                  Exclusions exceed inclusions on the pad. You can still save using{' '}
                  <strong>Use supplier spend as TMPS</strong> if that fits your case.
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
                Scoring denominator
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-white">
                {formatCurrency(
                  Number.isFinite(effectiveTmpsDenominator)
                    ? effectiveTmpsDenominator
                    : 0,
                )}
              </p>
              <p className="mt-1 text-[11px] leading-snug text-white/65">
                {tmpsDenominatorSourceTitle(tmpsDenominatorSource)}
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
                {effectiveTmpsDenominator > 0
                  ? formatPercentFromRatio(bbbeeShareOfTmps, 1)
                  : '—'}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Recognised B-BBEE spend ÷ scoring denominator (when &gt; 0)
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                Recognised spend can be higher than your chosen denominator when recognition
                rules uplift a line&apos;s B-BBEE spend above its supplier value.
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
                Shown when the scoring denominator is positive and suppliers are entered
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
                    , which is above your scoring denominator of{' '}
                    <span className="font-medium tabular-nums">
                      {formatCurrency(effectiveTmpsDenominator)}
                    </span>
                    . That denominator drives procurement percentages; when
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
                tmpsTotal={effectiveTmpsDenominator}
                onApplySuppliers={(incoming, meta) => {
                  setRows(incoming)
                  setValue('suppliers_json', serializeSupplierRowsForAssessment(incoming))
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

        {/* Preview — light Excel-style document card when suppliers exist */}
        {rows.length > 0 ? (
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="mb-3 inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.24em] text-slate-500">
                  Live Preview
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  Procurement Score Preview
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                  Uses your current supplier rows and the selected scoring denominator.
                </p>
              </div>

              {preview ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 sm:text-right">
                  <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                    Total points
                  </div>
                  <div className="mt-1 text-3xl font-bold tabular-nums text-slate-950 sm:text-4xl">
                    {formatPoints(preview.totalScore)}
                    <span className="text-xl font-bold text-slate-400 sm:text-2xl">
                      {' '}
                      / {formatPoints(PROCUREMENT_MAX_POINTS, 0)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left">
                  <p className="text-sm font-semibold text-amber-950">
                    Points will appear once TMPS is set
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-amber-900/90">
                    {effectiveTmpsDenominator <= 0
                      ? 'Your scoring denominator is zero or negative. Fill the TMPS pad (Step 2) so inclusions minus exclusions is positive, or choose “Use supplier spend as TMPS” after entering supplier spend in Step 3.'
                      : 'The score preview is updating. If this stays for more than a few seconds, try editing a supplier field to refresh.'}
                  </p>
                  {supplierExVatTotal > 0 && effectiveTmpsDenominator <= 0 ? (
                    <button
                      type="button"
                      onClick={() => setTmpsDenominatorSource('import_supplier_total')}
                      className="mt-3 inline-flex items-center justify-center rounded-xl border border-amber-300 bg-white px-4 py-2 text-xs font-semibold text-amber-950 shadow-sm transition hover:bg-amber-50"
                    >
                      Use supplier spend as TMPS
                    </button>
                  ) : null}
                </div>
              )}
            </div>

            {preview ? (
              <ProcurementScorecardTable
                result={preview}
                tmpsDenominatorNote={tmpsDenominatorSourceTitle(tmpsDenominatorSource)}
              />
            ) : null}
          </section>
        ) : null}
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
            disabled={isSubmitting || effectiveTmpsDenominator <= 0}
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