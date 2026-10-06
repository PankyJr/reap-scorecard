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
import { calculateSupplierRow } from '@/lib/procurement/rows'
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
  serializeSupplierRowsForSave,
  supplierRowsToInputs,
  type SupplierFormRow,
} from '@/lib/procurement/supplierFormRow'
import { payloadByteLength } from '@/lib/procurement/supplierPayload'
import { SUPPLIER_PAYLOAD_MAX_BYTES, formatMegabytes } from '@/lib/procurement/uploadLimits'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { ProcurementScorecardTable } from '@/components/procurement/ProcurementScorecardTable'
import { PROCUREMENT_MAX_POINTS } from '@/lib/procurement/insights'
import { ChevronsDown, ChevronsUp, Plus, Trash2 } from 'lucide-react'
import { ProgressSteps, type ProgressStep } from '@/components/ui/ProgressSteps'
import { Panel, MoreOptions } from '@/components/ui/Panel'
import { Notice } from '@/components/ui/Notice'
import { Term } from '@/components/ui/Term'

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
    return 'Enter a year between 2000 and 2100.'
  }
  if (scoringDenominator <= 0) {
    return 'The total spend is zero. Enter at least one amount that counts, or use the total of the supplier list.'
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
      return `“${name}”: the spend must be a positive number.`
    }
    if (v === 0) {
      return `“${name}”: enter the amount spent with this supplier, or remove the row.`
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
  /** Hides Excel import + supplier table so long lists don’t block preview/save. */
  const [supplierWorkspaceMinimized, setSupplierWorkspaceMinimized] =
    useState(false)
  /** Guided steps: 1 = total spend, 2 = suppliers. Editing opens on suppliers. */
  const [step, setStep] = useState<1 | 2>(() => (initialData?.suppliers?.length ? 2 : 1))
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

  useEffect(() => {
    if (rows.length === 0) {
      setSupplierWorkspaceMinimized(false)
    }
  }, [rows.length])

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

  const preview = useMemo(() => {
    if (!rows.length || effectiveTmpsDenominator <= 0) {
      return null
    }
    const calculatedRows = supplierRowsToInputs(rows).map((p) => calculateSupplierRow(p))
    const totals = aggregateCategoryTotals(calculatedRows)

    return calculateProcurementResults({
      totals,
      totalMeasuredSpend: effectiveTmpsDenominator,
    })
  }, [rows, effectiveTmpsDenominator])

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
        is_51_percent_flow_through: !!row.is_51_percent_flow_through,
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
      if (effectiveTmpsDenominator <= 0 || /year/i.test(clientErr)) setStep(1)
      return
    }

    const payload = serializeSupplierRowsForSave(rows)
    if (payloadByteLength(payload) > SUPPLIER_PAYLOAD_MAX_BYTES) {
      setServerError(
        `This supplier list is too large to save in one go (${formatMegabytes(payloadByteLength(payload))}; the limit is ${formatMegabytes(SUPPLIER_PAYLOAD_MAX_BYTES)}). Shorten long notes, or split the list.`,
      )
      return
    }
    setServerError(undefined)
    flushSync(() => {
      setValue('suppliers_json', payload, { shouldDirty: true })
    })
    const form = document.getElementById(formId) as HTMLFormElement | null
    form?.requestSubmit()
  }

  const tmpsInputClass =
    'block w-full rounded-control border border-line-strong bg-surface px-3 py-2.5 text-base tabular-nums text-ink placeholder:text-faint focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand/20'

  const goTo = (next: 1 | 2) => {
    if (next === 2) {
      setValue('suppliers_json', serializeSupplierRowsForAssessment(rows))
    }
    setStep(next)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const customLines = (
    kind: 'inclusion' | 'exclusion',
    list: TmpsCustomLineFormRow[],
    setList: React.Dispatch<React.SetStateAction<TmpsCustomLineFormRow[]>>,
  ) => (
    <div className="space-y-3">
      {list.map((row) => (
        <div key={row.id} className="grid gap-2 rounded-control border border-line p-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto] sm:items-end">
          <label className="block text-sm font-medium text-ink" htmlFor={`tmps-custom-${kind}-label-${row.id}`}>
            Description
            <input
              id={`tmps-custom-${kind}-label-${row.id}`}
              type="text"
              value={row.label}
              onChange={(e) => setList((prev) => prev.map((r) => (r.id === row.id ? { ...r, label: e.target.value } : r)))}
              placeholder={kind === 'inclusion' ? 'For example, purchase of goods' : 'For example, intercompany recharge'}
              className={`mt-1 ${tmpsInputClass}`}
              autoComplete="off"
            />
          </label>
          <label className="block text-sm font-medium text-ink" htmlFor={`tmps-custom-${kind}-amt-${row.id}`}>
            Amount (R)
            <input
              id={`tmps-custom-${kind}-amt-${row.id}`}
              type="text"
              inputMode="decimal"
              value={row.amount}
              onChange={(e) => setList((prev) => prev.map((r) => (r.id === row.id ? { ...r, amount: e.target.value } : r)))}
              placeholder="0"
              className={`mt-1 ${tmpsInputClass}`}
              autoComplete="off"
            />
          </label>
          <button
            type="button"
            onClick={() => setList((prev) => prev.filter((r) => r.id !== row.id))}
            className={buttonStyles({ variant: 'ghost', size: 'sm', className: 'text-bad' })}
            aria-label="Remove this line"
          >
            <Trash2 className="h-4 w-4" aria-hidden /> Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        disabled={list.length >= TMPS_CUSTOM_LINES_MAX}
        onClick={() => setList((prev) => [...prev, newTmpsCustomLineFormRow()])}
        className={buttonStyles({ variant: 'ghost', size: 'sm' })}
      >
        <Plus className="h-4 w-4" aria-hidden /> Add your own {kind} line
      </button>
    </div>
  )

  const steps: ProgressStep[] = [
    { label: 'Start', state: 'done' },
    { label: 'Total spend', state: step === 1 ? 'current' : 'done' },
    { label: 'Suppliers', state: step === 2 ? 'current' : 'todo' },
    { label: 'See result', state: 'todo' },
  ]

  return (
    <>
      <input type="hidden" {...register('suppliers_json')} />
      <input type="hidden" name="import_workbook_name" value={excelImportMeta?.workbookName ?? ''} readOnly />
      <input type="hidden" name="import_sheet_name" value={excelImportMeta?.sheetName ?? ''} readOnly />
      <input type="hidden" name="tmps_custom_inclusions_json" value={JSON.stringify(customInclusionsPayload)} readOnly />
      <input type="hidden" name="tmps_custom_exclusions_json" value={JSON.stringify(customExclusionsPayload)} readOnly />
      <input type="hidden" name="tmps_denominator_source" value={tmpsDenominatorSource} readOnly />
      <input type="hidden" name="tmps_manual_amount" value="" readOnly />

      <div className="space-y-6" data-tour="scorecard-inputs">
        <ProgressSteps steps={steps} label="Procurement steps" />

        {/* Step 2 of the journey: total spend (TMPS) and year */}
        <div hidden={step !== 1} className="space-y-6">
          <Panel
            title="Total spend"
            description={
              <>
                Every procurement percentage is a supplier’s spend divided by the company’s{' '}
                <Term k="tmps">total measured procurement spend (TMPS)</Term> for the year. Amounts are in rand, as in the
                financial statements.
              </>
            }
          >
            <div className="space-y-6">
              <label className="block max-w-[12rem]" htmlFor="assessment_year">
                <span className="text-[15px] font-semibold text-ink">Year</span>
                <input
                  id="assessment_year"
                  type="number"
                  inputMode="numeric"
                  min={2000}
                  max={2100}
                  {...register('assessment_year')}
                  className={`mt-2 ${tmpsInputClass}`}
                />
                {errors.assessment_year?.message ? (
                  <span className="mt-1 block text-sm font-medium text-bad">{errors.assessment_year.message}</span>
                ) : null}
              </label>

              <fieldset>
                <legend className="text-[15px] font-semibold text-ink">How should the total spend be set?</legend>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    aria-pressed={tmpsDenominatorSource === 'calculated'}
                    onClick={() => setTmpsDenominatorSource('calculated')}
                    className={`rounded-control border p-4 text-left transition-colors ${
                      tmpsDenominatorSource === 'calculated' ? 'border-brand bg-brand-soft ring-2 ring-brand' : 'border-line hover:border-brand'
                    }`}
                  >
                    <span className="block text-base font-semibold text-ink">Work it out from the financial statements</span>
                    <span className="mt-1 block text-[15px] text-muted">
                      Enter what counts (such as cost of sales) and what is left out (such as salaries). Most accurate.
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={tmpsDenominatorSource === 'import_supplier_total'}
                    disabled={supplierExVatTotal <= 0}
                    onClick={() => supplierExVatTotal > 0 && setTmpsDenominatorSource('import_supplier_total')}
                    className={`rounded-control border p-4 text-left transition-colors ${
                      tmpsDenominatorSource === 'import_supplier_total' ? 'border-brand bg-brand-soft ring-2 ring-brand' : 'border-line hover:border-brand'
                    } ${supplierExVatTotal <= 0 ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    <span className="block text-base font-semibold text-ink">Use the total of the supplier list</span>
                    <span className="mt-1 block text-[15px] text-muted">
                      {supplierExVatTotal > 0
                        ? `The suppliers add up to ${formatCurrency(supplierExVatTotal)}. Use this when there are no financial statements.`
                        : 'Available once you have added suppliers on the next step.'}
                    </span>
                  </button>
                </div>
              </fieldset>

              {tmpsDenominatorSource === 'calculated' ? (
                <div className="grid gap-6 lg:grid-cols-2">
                  <div>
                    <h3 className="text-base font-semibold text-ink">What counts</h3>
                    <p className="text-sm text-muted">Leave lines you do not use empty.</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {TMPS_INCLUSIONS.map(({ key, label }) => (
                        <label key={key} htmlFor={`tmps-${key}`} className="block text-sm font-medium text-ink">
                          {label}
                          <input
                            id={`tmps-${key}`}
                            type="text"
                            inputMode="decimal"
                            aria-label={`TMPS inclusion: ${label}`}
                            {...register(key as TmpsFieldKey)}
                            className={`mt-1 ${tmpsInputClass}`}
                          />
                        </label>
                      ))}
                    </div>
                    <p className="mt-3 flex justify-between border-t border-line pt-3 text-[15px] font-semibold text-ink">
                      <span>Total that counts</span>
                      <span className="tabular-nums">{formatCurrency(tmpsTotals.inclusionsTotal)}</span>
                    </p>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-ink">What is left out</h3>
                    <p className="text-sm text-muted">Subtracted from the total that counts.</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {TMPS_EXCLUSIONS.map(({ key, label }) => (
                        <label key={key} htmlFor={`tmps-${key}`} className="block text-sm font-medium text-ink">
                          {label}
                          <input
                            id={`tmps-${key}`}
                            type="text"
                            inputMode="decimal"
                            aria-label={`TMPS exclusion: ${label}`}
                            {...register(key as TmpsFieldKey)}
                            className={`mt-1 ${tmpsInputClass}`}
                          />
                        </label>
                      ))}
                    </div>
                    <p className="mt-3 flex justify-between border-t border-line pt-3 text-[15px] font-semibold text-ink">
                      <span>Total left out</span>
                      <span className="tabular-nums">{formatCurrency(tmpsTotals.exclusionsTotal)}</span>
                    </p>
                  </div>
                  <div className="lg:col-span-2">
                    <MoreOptions label="Add your own lines" defaultOpen={customInclusionRows.length + customExclusionRows.length > 0}>
                      <p className="text-[15px] text-muted">For amounts that are not in the lists above (up to {TMPS_CUSTOM_LINES_MAX} on each side).</p>
                      {customLines('inclusion', customInclusionRows, setCustomInclusionRows)}
                      {customLines('exclusion', customExclusionRows, setCustomExclusionRows)}
                    </MoreOptions>
                  </div>
                </div>
              ) : null}

              <div className={`rounded-control px-4 py-4 ${effectiveTmpsDenominator > 0 ? 'bg-brand text-brand-ink' : 'bg-warn-soft text-ink'}`}>
                <p className={effectiveTmpsDenominator > 0 ? 'text-sm text-white/80' : 'text-sm text-muted'}>Total spend (TMPS)</p>
                <p className="mt-1 font-serif text-3xl font-semibold tabular-nums">{formatCurrency(Number.isFinite(effectiveTmpsDenominator) ? effectiveTmpsDenominator : 0)}</p>
                <p className={effectiveTmpsDenominator > 0 ? 'mt-1 text-sm text-white/80' : 'mt-1 text-sm text-ink'}>
                  {effectiveTmpsDenominator > 0
                    ? tmpsDenominatorSourceShortNote(tmpsDenominatorSource)
                    : calculatedTmpsFromPad < 0
                      ? 'What is left out is more than what counts. Check the amounts, or use the total of the supplier list.'
                      : 'Enter at least one amount that counts, or use the total of the supplier list once you have added suppliers.'}
                </p>
              </div>
            </div>
          </Panel>

          <div className="flex justify-end">
            <button type="button" onClick={() => goTo(2)} className={buttonStyles({ variant: 'primary', size: 'lg' })}>
              Next: suppliers
            </button>
          </div>
        </div>

        {/* Step 3 of the journey: suppliers, with the live score */}
        <div hidden={step !== 2} className="space-y-6">
          <div className="flex flex-col gap-2 rounded-card border border-line bg-surface px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[15px] text-ink">
              Total spend (TMPS): <strong className="tabular-nums">{formatCurrency(effectiveTmpsDenominator)}</strong>
              <span className="text-muted"> · {tmpsDenominatorSourceTitle(tmpsDenominatorSource)}</span>
            </p>
            <button type="button" onClick={() => goTo(1)} className="text-[15px] font-semibold text-brand hover:underline">
              Change total spend
            </button>
          </div>

          <Panel
            title="Suppliers"
            description={
              <>
                List each supplier with what was spent with them (excluding VAT), their B-BBEE level and ownership. Upload a
                spreadsheet, paste rows, or add them one by one.
              </>
            }
            actions={
              rows.length > 0 ? (
                <span className="text-[15px] text-muted">
                  {rows.length} supplier{rows.length === 1 ? '' : 's'}
                </span>
              ) : null
            }
          >
            {supplierWorkspaceMinimized ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[15px] text-muted">The supplier list is hidden to keep the page short. All rows are kept.</p>
                <button type="button" onClick={() => setSupplierWorkspaceMinimized(false)} className={buttonStyles({ variant: 'secondary' })}>
                  <ChevronsDown className="h-4 w-4" aria-hidden /> Show suppliers
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <ProcurementExcelImport
                  tmpsTotal={effectiveTmpsDenominator}
                  onApplySuppliers={(incoming, meta) => {
                    setRows(incoming)
                    setValue('suppliers_json', serializeSupplierRowsForAssessment(incoming))
                    setServerError(undefined)
                    if (meta) setExcelImportMeta(meta)
                  }}
                />
                <SuppliersTable setValue={setValue} fieldName="suppliers_json" rows={rows} onChangeRows={setRows} />
                {rows.length > 8 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setValue('suppliers_json', serializeSupplierRowsForAssessment(rows))
                      setSupplierWorkspaceMinimized(true)
                    }}
                    className={buttonStyles({ variant: 'ghost', size: 'sm' })}
                  >
                    <ChevronsUp className="h-4 w-4" aria-hidden /> Hide the supplier list
                  </button>
                ) : null}
              </div>
            )}
          </Panel>

          {tmpsSupplierSpendMismatch ? (
            <Notice tone="warn" title="The suppliers add up to more than the total spend">
              The suppliers total {formatCurrency(supplierExVatTotal)}, which is more than the total spend of{' '}
              {formatCurrency(effectiveTmpsDenominator)}. Percentages may look higher than expected (points are still capped).
              Check the total spend or the supplier amounts.
            </Notice>
          ) : null}

          {rows.length > 0 ? (
            <Panel
              title="Score so far"
              description="Updates as you change suppliers. It is saved when you press Save."
            >
              <div data-tour="results scorecard-results" className="space-y-5">
                {preview ? (
                  <>
                    <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
                      <p className="font-serif text-4xl font-semibold tabular-nums text-ink">
                        {formatPoints(preview.totalScore)}
                        <span className="ml-2 font-sans text-lg font-normal text-muted">
                          of {formatPoints(PROCUREMENT_MAX_POINTS, 0)} points
                        </span>
                      </p>
                      <p className="text-[15px] text-muted">
                        <Term k="recognisedSpend">Recognised spend</Term>{' '}
                        <strong className="tabular-nums text-ink">{formatCurrency(totalRecognisedBbbee)}</strong> (
                        {formatPercentFromRatio(bbbeeShareOfTmps, 1)} of total spend)
                      </p>
                    </div>
                    <ProcurementScorecardTable result={preview} tmpsDenominatorNote={tmpsDenominatorSourceTitle(tmpsDenominatorSource)} />
                  </>
                ) : (
                  <Notice
                    tone="warn"
                    title="The score appears once the total spend is set"
                    action={
                      supplierExVatTotal > 0 && effectiveTmpsDenominator <= 0 ? (
                        <button type="button" onClick={() => setTmpsDenominatorSource('import_supplier_total')} className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
                          Use the total of the supplier list
                        </button>
                      ) : (
                        <button type="button" onClick={() => goTo(1)} className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
                          Set the total spend
                        </button>
                      )
                    }
                  >
                    Every percentage is divided by the total spend, which is still zero.
                  </Notice>
                )}
              </div>
            </Panel>
          ) : null}
        </div>
      </div>

      {serverError || Object.keys(errors).length > 0 ? (
        <div className="mt-6">
          <Notice tone="bad" title="Before you can save">
            {serverError ? (
              <p>{serverError}</p>
            ) : rhfErrorMessages.length > 0 ? (
              <ul className="list-disc space-y-1 pl-5">
                {rhfErrorMessages.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            ) : (
              <p>Check the highlighted fields and try again.</p>
            )}
          </Notice>
        </div>
      ) : null}

      <div className="mt-6 flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between" hidden={step !== 2}>
        <button type="button" onClick={() => goTo(1)} className={buttonStyles({ variant: 'secondary' })}>
          Back to total spend
        </button>
        <button
          type="button"
          onClick={handleSubmit(onValid, () => setStep(1))}
          disabled={isSubmitting || effectiveTmpsDenominator <= 0}
          className={buttonStyles({ variant: 'primary', size: 'lg' })}
        >
          {isSubmitting ? 'Saving…' : submitLabel ?? 'Save and see result'}
        </button>
      </div>
    </>
  )
}
