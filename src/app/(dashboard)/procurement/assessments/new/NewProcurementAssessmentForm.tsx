'use client'

import { flushSync, useFormStatus } from 'react-dom'
import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { aggregateCategoryTotals, calculateProcurementResults } from '@/lib/procurement/assessment'
import {
  TMPS_EXCLUSIONS,
  TMPS_INCLUSIONS,
  calculateProcurementTmpsTotals,
  type ProcurementTmpsInputs,
} from '@/lib/procurement/tmps'
import { calculateSupplierRow } from '@/lib/procurement/rows'
import { formatCurrency, formatCurrencyZar } from '@/lib/procurement/format'
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
  sumSupplierValueExVat,
  type ProcurementTmpsDenominatorSource,
} from '@/lib/procurement/tmpsDenominator'
import { SuppliersTable } from './SuppliersTable'
import { ProcurementExcelImport } from './ProcurementExcelImport'
import { serializeSupplierRowsForSave, supplierRowsToInputs, type SupplierFormRow } from '@/lib/procurement/supplierFormRow'
import { payloadByteLength } from '@/lib/procurement/supplierPayload'
import { SUPPLIER_PAYLOAD_MAX_BYTES, formatMegabytes } from '@/lib/procurement/uploadLimits'
import {
  analyseNeedsAttention,
  certificateReferenceDate,
  expiredAndNotCounting,
  markNonCompliant,
  mergeDuplicateRows,
  removeRows,
} from '@/lib/procurement/needsAttention'
import { biggestProcurementGapSentence, summariseProcurementScore } from '@/lib/procurement/scoreSummary'
import { serializeReviewDecisions } from '@/lib/procurement/reviewDecisions'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { ProgressSteps, type ProgressStep } from '@/components/ui/ProgressSteps'
import { Panel, MoreOptions } from '@/components/ui/Panel'
import { Notice } from '@/components/ui/Notice'
import { Term } from '@/components/ui/Term'
import { NeedsAttentionPanel, type NeedsAttentionActions } from '@/components/procurement/NeedsAttentionPanel'
import { ProcurementScoreLines } from '@/components/procurement/ProcurementScoreLines'
import { ProcurementScoreHeadline, procurementLineViews } from '@/components/procurement/ProcurementScoreSummary'

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
  // Filled in from the supplier rows when the form is sent (see onValid).
  suppliers_json: z.string().optional(),
})

type AssessmentFormValues = z.infer<typeof assessmentSchema>

type TmpsFieldKey = Exclude<keyof AssessmentFormValues, 'assessment_year' | 'suppliers_json'>

type Step = 1 | 2 | 3

function validateBeforeSubmit(yearStr: string, scoringDenominator: number, rows: SupplierFormRow[], blockingCount: number): { message: string; step: Step } | null {
  const y = parseInt(yearStr, 10)
  if (!Number.isFinite(y) || y < 2000 || y > 2100) {
    return { message: 'Enter a year between 2000 and 2100.', step: 1 }
  }
  if (rows.length < 1) {
    return { message: 'Add at least one supplier before saving.', step: 1 }
  }
  for (let i = 0; i < rows.length; i++) {
    if (!(rows[i].supplier_name ?? '').trim()) {
      return { message: `Supplier ${i + 1} has no name. Open it in the supplier list and enter one, or remove it.`, step: 1 }
    }
  }
  if (blockingCount > 0) {
    return {
      message: `${blockingCount} supplier${blockingCount === 1 ? ' has' : 's have'} a zero or negative amount. Enter the amount or remove ${blockingCount === 1 ? 'it' : 'them'} under “Check suppliers” before saving.`,
      step: 2,
    }
  }
  if (scoringDenominator <= 0) {
    return { message: 'The total spend is zero. Use the total of the supplier list, or enter what counts from the financial statements.', step: 3 }
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
  /** Duplicate groups already kept as separate suppliers. */
  keptDuplicateKeys?: string[]
}

function tmpsNumToInput(v: number | null | undefined): string {
  if (v == null) return ''
  const n = Number(v)
  return Number.isFinite(n) ? String(n) : ''
}

function buildFormDefaults(initial?: ProcurementAssessmentFormInitial): AssessmentFormValues {
  const year = initial?.assessment_year ?? new Date().getFullYear()
  const t = initial?.tmps ?? {}
  return {
    assessment_year: String(year),
    tmps_opening_inventory: tmpsNumToInput(t.tmps_opening_inventory),
    tmps_closing_inventory: tmpsNumToInput(t.tmps_closing_inventory),
    tmps_cost_of_sales: tmpsNumToInput(t.tmps_cost_of_sales),
    tmps_other_operating_expenses: tmpsNumToInput(t.tmps_other_operating_expenses),
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

const TMPS_FIELD_KEYS: TmpsFieldKey[] = [
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
]

interface NewProcurementAssessmentFormProps {
  formId: string
  initialError?: string
  initialData?: ProcurementAssessmentFormInitial
  submitLabel?: string
}

/**
 * The procurement-only journey: the supplier list (upload or by hand), a
 * "Needs attention" check with one-click fixes, the total measured spend, then
 * save. The score is visible throughout and marked Incomplete while anything
 * still needs attention.
 */
export function NewProcurementAssessmentForm({ formId, initialError, initialData, submitLabel }: NewProcurementAssessmentFormProps) {
  const [serverError, setServerError] = useState(initialError)
  const [rows, setRows] = useState<SupplierFormRow[]>(() => initialData?.suppliers ?? [])
  /** Bumped when a whole new list arrives, so the supplier table starts fresh. */
  const [listVersion, setListVersion] = useState(0)
  const [showImport, setShowImport] = useState(false)
  const [importMeta, setImportMeta] = useState<{ workbookName: string; sheetName: string } | null>(() => {
    const wb = initialData?.import_workbook_name?.trim()
    const sh = initialData?.import_sheet_name?.trim()
    return wb || sh ? { workbookName: wb ?? '', sheetName: sh ?? '' } : null
  })
  const [step, setStep] = useState<Step>(1)
  const [keptDuplicateKeys, setKeptDuplicateKeys] = useState<Set<string>>(() => new Set(initialData?.keptDuplicateKeys ?? []))
  const [customInclusionRows, setCustomInclusionRows] = useState<TmpsCustomLineFormRow[]>(() =>
    normalizeStoredCustomLinesToFormRows(initialData?.tmpsCustomInclusions),
  )
  const [customExclusionRows, setCustomExclusionRows] = useState<TmpsCustomLineFormRow[]>(() =>
    normalizeStoredCustomLinesToFormRows(initialData?.tmpsCustomExclusions),
  )
  /** The source the person chose; until they choose, the supplier list total is used when there is nothing else. */
  const [chosenSource, setChosenSource] = useState<ProcurementTmpsDenominatorSource | null>(() => {
    if (!initialData?.tmpsDenominatorSource) return null
    return initialData.tmpsDenominatorSource === 'manual' ? null : initialData.tmpsDenominatorSource
  })

  useEffect(() => {
    if (initialError !== undefined) setServerError(initialError)
  }, [initialError])

  // The save is a form post to a server action; this is true while it runs.
  const { pending: saving } = useFormStatus()

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

  const yearText = watch('assessment_year')
  const tmpsWatched = watch(TMPS_FIELD_KEYS)
  const tmpsValues = useMemo(() => {
    const out: Record<string, number> = {}
    TMPS_FIELD_KEYS.forEach((key, index) => {
      out[key] = Number(tmpsWatched[index] || 0)
    })
    return out as ProcurementTmpsInputs
  }, [tmpsWatched])

  const customInclusionsPayload = useMemo(() => serializeTmpsCustomFormRows(customInclusionRows), [customInclusionRows])
  const customExclusionsPayload = useMemo(() => serializeTmpsCustomFormRows(customExclusionRows), [customExclusionRows])
  const tmpsTotals = useMemo(
    () => calculateProcurementTmpsTotals(tmpsValues, { inclusions: customInclusionsPayload, exclusions: customExclusionsPayload }),
    [tmpsValues, customInclusionsPayload, customExclusionsPayload],
  )

  // Score and checks follow the list a moment behind typing, so typing stays quick with thousands of suppliers.
  const deferredRows = useDeferredValue(rows)
  const supplierListTotal = useMemo(() => sumSupplierValueExVat(deferredRows), [deferredRows])

  const tmpsSource: ProcurementTmpsDenominatorSource =
    chosenSource === 'import_supplier_total' && supplierListTotal <= 0
      ? 'calculated'
      : chosenSource ?? (tmpsTotals.tmpsTotal > 0 || supplierListTotal <= 0 ? 'calculated' : 'import_supplier_total')

  const tmpsDenominator = useMemo(
    () =>
      computeProcurementScoringDenominator({
        source: tmpsSource,
        tmpsInputs: tmpsValues,
        tmpsCustomInclusions: customInclusionsPayload,
        tmpsCustomExclusions: customExclusionsPayload,
        tmpsManualAmount: undefined,
        suppliers: deferredRows,
      }).denominator,
    [tmpsSource, tmpsValues, customInclusionsPayload, customExclusionsPayload, deferredRows],
  )

  const result = useMemo(() => {
    if (!deferredRows.length || tmpsDenominator <= 0) return null
    const calculated = supplierRowsToInputs(deferredRows).map((row) => calculateSupplierRow(row))
    return calculateProcurementResults({ totals: aggregateCategoryTotals(calculated), totalMeasuredSpend: tmpsDenominator })
  }, [deferredRows, tmpsDenominator])
  const summary = useMemo(() => (result ? summariseProcurementScore(result) : null), [result])

  const referenceDate = certificateReferenceDate(parseInt(yearText ?? '', 10))
  const attention = useMemo(
    () => analyseNeedsAttention(deferredRows, { referenceDate, totalMeasuredSpend: tmpsDenominator, keptDuplicateKeys }),
    [deferredRows, referenceDate, tmpsDenominator, keptDuplicateKeys],
  )

  const expiredNotCounting = useMemo(() => expiredAndNotCounting(deferredRows, referenceDate), [deferredRows, referenceDate])

  /** What the last one-click fix did, said back in plain words. */
  const [lastFix, setLastFix] = useState<string | null>(null)
  const attentionActions: NeedsAttentionActions = useMemo(() => {
    const count = (n: number, one: string, many: string) => `${n.toLocaleString('en-ZA')} ${n === 1 ? one : many}`
    return {
      onMarkNonCompliant: (ids) => {
        setRows((prev) => markNonCompliant(prev, ids))
        setLastFix(`${count(ids.length, 'supplier is', 'suppliers are')} now non-compliant and count${ids.length === 1 ? 's' : ''} as nothing.`)
      },
      onSetLevel: (id, level) => {
        setRows((prev) => prev.map((row) => (row.id === id ? { ...row, level } : row)))
        setLastFix(`Level saved: ${level === 'Non-Compliant' ? 'Non-compliant' : `Level ${level}`}.`)
      },
      onMerge: (ids) => {
        setRows((prev) => mergeDuplicateRows(prev, ids))
        setLastFix(`${count(ids.length, 'row was', 'rows were')} merged into one supplier, with the spend added together.`)
      },
      onKeepSeparate: (key) => {
        setKeptDuplicateKeys((prev) => new Set(prev).add(key))
        setLastFix('Kept as separate suppliers.')
      },
      onRemove: (ids) => {
        setRows((prev) => removeRows(prev, ids))
        setLastFix(`${count(ids.length, 'supplier was', 'suppliers were')} removed from the list.`)
      },
      onSetAmount: (id, value) => {
        setRows((prev) => prev.map((row) => (row.id === id ? { ...row, value_ex_vat: value } : row)))
        setLastFix(`Amount saved: ${formatCurrencyZar(value)}.`)
      },
    }
  }, [])

  const goTo = (next: Step) => {
    setStep(next)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const onValid = (data: AssessmentFormValues) => {
    const problem = validateBeforeSubmit(data.assessment_year, tmpsDenominator, rows, attention.blockingCount)
    if (problem) {
      setServerError(problem.message)
      setStep(problem.step)
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

  const inputClass =
    'block w-full rounded-control border border-line-strong bg-surface px-3 py-2.5 text-base tabular-nums text-ink placeholder:text-faint focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand/20'

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
              className={`mt-1 ${inputClass}`}
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
              className={`mt-1 ${inputClass}`}
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
    { label: 'Suppliers', state: step === 1 ? 'current' : 'done' },
    { label: 'Check suppliers', state: step === 2 ? 'current' : step > 2 ? 'done' : 'todo' },
    { label: 'Total spend', state: step === 3 ? 'current' : 'todo' },
    { label: 'See result', state: 'todo' },
  ]

  const scoreSoFar = (
    <Panel
      title="Score so far"
      description={
        attention.count > 0
          ? 'Updates as you change suppliers. It stays marked Incomplete until nothing needs attention.'
          : 'Updates as you change suppliers. It is saved when you press Save.'
      }
    >
      <div data-tour="results scorecard-results" className="space-y-5">
        {summary ? (
          <>
            <ProcurementScoreHeadline summary={summary} incomplete={attention.count > 0} gapSentence={biggestProcurementGapSentence(summary)}>
              {expiredNotCounting.count > 0 ? (
                <p className="rounded-control border border-warn/30 bg-warn-soft px-3 py-2 text-[15px] text-ink">
                  {expiredNotCounting.count.toLocaleString('en-ZA')}{' '}
                  {expiredNotCounting.count === 1 ? 'supplier isn’t counting because its certificate' : 'suppliers aren’t counting because their certificates'}{' '}
                  expired ({formatCurrencyZar(expiredNotCounting.spend)} of spend).
                </p>
              ) : null}
              {tmpsSource === 'import_supplier_total' && step < 3 ? (
                <p className="text-sm text-muted">
                  For now the total spend is the total of the supplier list ({formatCurrencyZar(tmpsDenominator)}); you can change
                  it in the next steps.
                </p>
              ) : null}
            </ProcurementScoreHeadline>
            <ProcurementScoreLines lines={procurementLineViews(summary)} />
          </>
        ) : (
          <Notice
            tone="warn"
            title="The score appears once there are suppliers and a total spend"
            action={
              rows.length === 0 ? (
                <button type="button" onClick={() => goTo(1)} className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
                  Add suppliers
                </button>
              ) : (
                <button type="button" onClick={() => goTo(3)} className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
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
  )

  const errorBlock =
    serverError || Object.keys(errors).length > 0 ? (
      <Notice tone="bad" title="Before you can save">
        {serverError ? <p>{serverError}</p> : <p>{errors.assessment_year?.message ?? 'Check the highlighted fields and try again.'}</p>}
      </Notice>
    ) : null

  return (
    <>
      <input type="hidden" {...register('suppliers_json')} />
      <input type="hidden" name="import_workbook_name" value={importMeta?.workbookName ?? ''} readOnly />
      <input type="hidden" name="import_sheet_name" value={importMeta?.sheetName ?? ''} readOnly />
      <input type="hidden" name="tmps_custom_inclusions_json" value={JSON.stringify(customInclusionsPayload)} readOnly />
      <input type="hidden" name="tmps_custom_exclusions_json" value={JSON.stringify(customExclusionsPayload)} readOnly />
      <input type="hidden" name="tmps_denominator_source" value={tmpsSource} readOnly />
      <input type="hidden" name="tmps_manual_amount" value="" readOnly />
      <input type="hidden" name="review_decisions_json" value={serializeReviewDecisions({ keptDuplicates: [...keptDuplicateKeys] })} readOnly />

      <div className="space-y-6" data-tour="scorecard-inputs">
        <ProgressSteps steps={steps} label="Procurement steps" />

        {/* Step: suppliers */}
        <div hidden={step !== 1} className="space-y-6">
          <Panel title="Which year?" description="The year the spend was in. Certificates are checked against the end of this year.">
            <label className="block max-w-[12rem]" htmlFor="assessment_year">
              <span className="text-[15px] font-semibold text-ink">Year</span>
              <input
                id="assessment_year"
                type="number"
                inputMode="numeric"
                min={2000}
                max={2100}
                {...register('assessment_year')}
                className={`mt-2 ${inputClass}`}
              />
              {errors.assessment_year?.message ? (
                <span className="mt-1 block text-sm font-medium text-bad">{errors.assessment_year.message}</span>
              ) : null}
            </label>
          </Panel>

          <Panel
            title="Supplier list"
            description="The suppliers the company paid in the year, with what was spent with each (without VAT), their B-BBEE level and ownership. Upload a list or add suppliers by hand."
            actions={rows.length > 0 ? <span className="text-[15px] text-muted">{rows.length.toLocaleString('en-ZA')} suppliers</span> : null}
          >
            <div className="space-y-6">
              {rows.length === 0 || showImport ? (
                <ProcurementExcelImport
                  replacing={rows.length > 0}
                  onApplySuppliers={(incoming, meta) => {
                    setRows(incoming)
                    setListVersion((v) => v + 1)
                    setKeptDuplicateKeys(new Set())
                    setImportMeta(meta)
                    setShowImport(false)
                    setServerError(undefined)
                  }}
                />
              ) : (
                <div className="flex flex-col gap-3 rounded-control bg-sunken px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[15px] text-ink">
                    <strong className="tabular-nums">{rows.length.toLocaleString('en-ZA')}</strong> suppliers, spending{' '}
                    <strong className="tabular-nums">{formatCurrencyZar(supplierListTotal)}</strong>
                    {importMeta?.workbookName ? <span className="break-all text-muted"> · from {importMeta.workbookName}</span> : null}
                  </p>
                  <button type="button" onClick={() => setShowImport(true)} className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
                    Upload a different list
                  </button>
                </div>
              )}
              {showImport && rows.length > 0 ? (
                <p className="text-[15px] text-muted">
                  A new list replaces the {rows.length.toLocaleString('en-ZA')} suppliers below.{' '}
                  <button type="button" onClick={() => setShowImport(false)} className="font-semibold text-brand hover:underline">
                    Keep the current list
                  </button>
                </p>
              ) : null}
              <SuppliersTable key={listVersion} rows={rows} onChangeRows={setRows} />
            </div>
          </Panel>

          <div className="flex justify-end">
            <button type="button" disabled={rows.length === 0} onClick={() => goTo(2)} className={buttonStyles({ variant: 'primary', size: 'lg' })}>
              Next: check suppliers
            </button>
          </div>
        </div>

        {/* Step: check suppliers */}
        <div hidden={step !== 2} className="space-y-6">
          <Panel
            title="Needs attention"
            description="Problems that would make the score wrong. Each one has a fix you can apply with one click; nothing is changed until you press it."
          >
            <div className="space-y-4">
              {lastFix ? (
                <Notice tone="ok" role="status">
                  {lastFix}
                </Notice>
              ) : null}
              <NeedsAttentionPanel attention={attention} referenceDate={referenceDate} totalMeasuredSpend={tmpsDenominator} actions={attentionActions} />
            </div>
          </Panel>
          {scoreSoFar}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" onClick={() => goTo(1)} className={buttonStyles({ variant: 'secondary' })}>
              Back to suppliers
            </button>
            <button type="button" onClick={() => goTo(3)} className={buttonStyles({ variant: 'primary', size: 'lg' })}>
              Next: total spend
            </button>
          </div>
        </div>

        {/* Step: total spend */}
        <div hidden={step !== 3} className="space-y-6">
          <Panel
            title="Total measured procurement spend"
            description={
              <>
                <Term k="tmps">Total measured procurement spend</Term> is everything the company spent on goods and services in
                the year, without VAT, leaving out salaries and wages, depreciation and the stock it already had at the start of the
                year.
              </>
            }
          >
            <div className="space-y-5">
              <div className={`rounded-control px-4 py-4 ${tmpsDenominator > 0 ? 'bg-brand text-brand-ink' : 'bg-warn-soft text-ink'}`}>
                <p className={tmpsDenominator > 0 ? 'text-sm text-brand-ink/80' : 'text-sm text-muted'}>Total measured procurement spend</p>
                <p className="mt-1 font-serif text-3xl font-semibold tabular-nums">{formatCurrencyZar(tmpsDenominator)}</p>
                <p className={tmpsDenominator > 0 ? 'mt-1 text-sm text-brand-ink/80' : 'mt-1 text-sm text-ink'}>
                  {tmpsDenominator <= 0
                    ? tmpsTotals.tmpsTotal < 0
                      ? 'What is left out is more than what counts. Check the amounts under More options, or use the total of the supplier list.'
                      : 'Enter what counts under More options, or use the total of the supplier list.'
                    : tmpsSource === 'import_supplier_total'
                      ? 'The total of your supplier list. If the financial statements give a different figure, use More options.'
                      : 'Worked out from the financial statements: what counts minus what is left out.'}
                </p>
              </div>

              {supplierListTotal > 0 && tmpsSource !== 'import_supplier_total' ? (
                <button
                  type="button"
                  onClick={() => setChosenSource('import_supplier_total')}
                  className={buttonStyles({ variant: 'secondary', size: 'sm' })}
                >
                  Use the supplier list total ({formatCurrencyZar(supplierListTotal)})
                </button>
              ) : null}

              <MoreOptions label="More options: work it out from the financial statements" defaultOpen={tmpsSource === 'calculated' && tmpsTotals.inclusionsTotal > 0}>
                <p className="text-[15px] text-ink">
                  Enter what counts (such as cost of sales) and what is left out (such as salaries). Leave lines you do not use
                  empty. Amounts are in rand, as in the financial statements.
                </p>
                <div className="grid gap-6 lg:grid-cols-2">
                  <div>
                    <h3 className="text-base font-semibold text-ink">What counts</h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {TMPS_INCLUSIONS.map(({ key, label }) => (
                        <label key={key} htmlFor={`tmps-${key}`} className="block text-sm font-medium text-ink">
                          {label}
                          <input id={`tmps-${key}`} type="text" inputMode="decimal" {...register(key as TmpsFieldKey)} className={`mt-1 ${inputClass}`} />
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
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {TMPS_EXCLUSIONS.map(({ key, label }) => (
                        <label key={key} htmlFor={`tmps-${key}`} className="block text-sm font-medium text-ink">
                          {label}
                          <input id={`tmps-${key}`} type="text" inputMode="decimal" {...register(key as TmpsFieldKey)} className={`mt-1 ${inputClass}`} />
                        </label>
                      ))}
                    </div>
                    <p className="mt-3 flex justify-between border-t border-line pt-3 text-[15px] font-semibold text-ink">
                      <span>Total left out</span>
                      <span className="tabular-nums">{formatCurrency(tmpsTotals.exclusionsTotal)}</span>
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-[15px] text-muted">Amounts that are not in the lists above (up to {TMPS_CUSTOM_LINES_MAX} on each side).</p>
                  {customLines('inclusion', customInclusionRows, setCustomInclusionRows)}
                  {customLines('exclusion', customExclusionRows, setCustomExclusionRows)}
                </div>
                <p className="text-[15px] text-ink">
                  From the financial statements: <strong className="tabular-nums">{formatCurrencyZar(tmpsTotals.tmpsTotal)}</strong>
                </p>
                <button
                  type="button"
                  disabled={tmpsTotals.tmpsTotal <= 0 || tmpsSource === 'calculated'}
                  onClick={() => setChosenSource('calculated')}
                  className={buttonStyles({ variant: 'secondary', size: 'sm' })}
                >
                  {tmpsSource === 'calculated' ? 'Using the financial statements figure' : 'Use this figure'}
                </button>
              </MoreOptions>
            </div>
          </Panel>

          {tmpsDenominator > 0 && supplierListTotal > tmpsDenominator ? (
            <Notice tone="warn" title="The suppliers add up to more than the total spend">
              The suppliers total {formatCurrencyZar(supplierListTotal)}, which is more than the total spend of{' '}
              {formatCurrencyZar(tmpsDenominator)}. Percentages may look higher than they should (points are still capped). Check
              the total spend or the supplier amounts.
            </Notice>
          ) : null}

          {scoreSoFar}
        </div>
      </div>

      {errorBlock ? <div className="mt-6">{errorBlock}</div> : null}

      <div className="mt-6 flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between" hidden={step !== 3}>
        <button type="button" onClick={() => goTo(2)} className={buttonStyles({ variant: 'secondary' })}>
          Back to check suppliers
        </button>
        <button
          type="button"
          onClick={handleSubmit(onValid, () => goTo(1))}
          disabled={isSubmitting || saving}
          aria-busy={isSubmitting || saving}
          className={buttonStyles({ variant: 'primary', size: 'lg' })}
        >
          {isSubmitting || saving ? `Saving ${rows.length.toLocaleString('en-ZA')} suppliers…` : (submitLabel ?? 'Save and see result')}
        </button>
      </div>
    </>
  )
}
