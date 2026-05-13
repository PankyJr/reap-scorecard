'use client'

import { useCallback, useMemo, useRef, useState, useTransition } from 'react'
import {
  aggregateCategoryTotals,
  calculateProcurementResults,
} from '@/lib/procurement/assessment'
import { calculateSupplierRow } from '@/lib/procurement/rows'
import { formatCurrency, formatPercentFromRatio } from '@/lib/procurement/format'
import { PROCUREMENT_CATEGORIES } from '@/lib/procurement/config'
import { buildSuppliersFromMappedSheet } from '@/lib/procurement/excel/buildSuppliers'
import {
  PROCUREMENT_EXCEL_HEADER_ONLY_NO_DATA_ROWS,
  PROCUREMENT_EXCEL_NO_SUPPLIER_LINES_BELOW_HEADER,
  PROCUREMENT_EXCEL_NO_REGISTER_GENERIC_WORKBOOK,
  PROCUREMENT_EXCEL_NO_REGISTER_WITH_PROCUREMENT_OR_TMPS_CONTEXT,
} from '@/lib/procurement/excel/constants'
import type {
  ProcurementExcelColumnMapping,
  ProcurementExcelMappedField,
  ProcurementExcelParseSuccess,
  ProcurementExcelSupplierImportBlockedWorkbookContext,
  ProcurementExcelCell,
} from '@/lib/procurement/excel/types'
import {
  PROCUREMENT_EXCEL_FIELD_META,
  PROCUREMENT_EXCEL_MAPPED_FIELDS,
  PROCUREMENT_EXCEL_REQUIRED_FIELDS,
} from '@/lib/procurement/excel/types'
import { procurementExcelParseAction } from './excelParseAction'
import type { SupplierFormRow } from '@/lib/procurement/supplierFormRow'
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Upload,
} from 'lucide-react'
import { buttonStyles } from '@/components/ui/buttonStyles'

function formatCellPreview(v: ProcurementExcelCell | null | undefined): string {
  if (v == null || v === '') return '—'
  if (typeof v === 'number') return String(v)
  const s = String(v).trim().replace(/\s+/g, ' ')
  if (!s) return '—'
  return s.length > 48 ? `${s.slice(0, 48)}…` : s
}

function createRowId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function toFormRows(
  suppliers: ReturnType<typeof buildSuppliersFromMappedSheet>['suppliers'],
): SupplierFormRow[] {
  return suppliers.map((s) => ({
    id: createRowId(),
    supplier_name: s.supplier_name,
    supplier_code: '',
    vat_number: '',
    company_registration: '',
    bo_etc: '',
    fts: '',
    des: '',
    prop: '',
    supplier_type: s.supplier_type,
    level: s.level,
    value_ex_vat: s.value_ex_vat,
    is_51_black_owned: s.is_51_black_owned,
    is_30_black_women_owned: s.is_30_black_women_owned,
    is_51_bdgs: s.is_51_bdgs,
    expiry: '',
    empower: '',
  }))
}

const NONE_VALUE = ''

function mappingToSelectValue(
  mapping: ProcurementExcelColumnMapping,
  field: ProcurementExcelMappedField,
  headers: string[],
): string {
  const v = mapping[field]
  if (v == null || v === '') return NONE_VALUE
  if (headers.includes(v)) return v
  return NONE_VALUE
}

function detectionLabel(
  m: ProcurementExcelParseSuccess['detectionMethod'],
): string {
  if (m === 'exact_sheet_name') return 'Matched supplier-register tab name'
  if (m === 'header_keywords') return 'Detected supplier-style headers'
  if (m === 'manual_sheet') return 'Tab you selected'
  return '—'
}

function blockedSupplierRegisterMessage(
  context?: ProcurementExcelSupplierImportBlockedWorkbookContext,
): string {
  if (context === 'procurement_or_tmps') {
    return PROCUREMENT_EXCEL_NO_REGISTER_WITH_PROCUREMENT_OR_TMPS_CONTEXT
  }
  return PROCUREMENT_EXCEL_NO_REGISTER_GENERIC_WORKBOOK
}

interface ProcurementExcelImportProps {
  tmpsTotal: number
  onApplySuppliers: (
    rows: SupplierFormRow[],
    meta?: { workbookName: string; sheetName: string },
  ) => void
}

export function ProcurementExcelImport({
  tmpsTotal,
  onApplySuppliers,
}: ProcurementExcelImportProps) {
  const [isPending, startTransition] = useTransition()
  const [parseError, setParseError] = useState<string | null>(null)
  const [parsed, setParsed] = useState<ProcurementExcelParseSuccess | null>(null)
  const [mapping, setMapping] = useState<ProcurementExcelColumnMapping>({})
  const [sheetChoice, setSheetChoice] = useState('')
  const fileRef = useRef<File | null>(null)

  const runParse = useCallback((file: File, preferredSheet: string | null) => {
    setParseError(null)
    startTransition(async () => {
      const fd = new FormData()
      fd.set('file', file)
      if (preferredSheet) {
        fd.set('preferred_sheet', preferredSheet)
      }
      const res = await procurementExcelParseAction(fd)
      if (!res.ok) {
        setParseError(res.issues.map((i) => i.message).join(' '))
        return
      }
      setParsed(res.data)
      setMapping({ ...res.data.autoMapping })
      setSheetChoice(res.data.selectedSheetName ?? '')
    })
  }, [])

  const updateMapping = useCallback(
    (field: ProcurementExcelMappedField, columnName: string) => {
      setMapping((prev) => {
        const next = { ...prev }
        if (!columnName || columnName === NONE_VALUE) {
          next[field] = null
        } else {
          next[field] = columnName
        }
        return next
      })
    },
    [],
  )

  const onFile = useCallback(
    (fileList: FileList | null) => {
      const file = fileList?.[0]
      if (!file) return
      fileRef.current = file
      setParseError(null)
      setParsed(null)
      setMapping({})
      setSheetChoice('')
      runParse(file, null)
    },
    [runParse],
  )

  const importBlocked = Boolean(parsed?.supplierImportBlockedReason)
  const hasHeaderRow =
    parsed && parsed.columnHeaders.length > 0 && !importBlocked

  const built = useMemo(() => {
    if (!parsed || importBlocked) return null
    return buildSuppliersFromMappedSheet({
      headers: parsed.columnHeaders,
      dataRows: parsed.dataRows,
      mapping,
    })
  }, [parsed, mapping, importBlocked])

  const missingRequired = useMemo(() => {
    return PROCUREMENT_EXCEL_REQUIRED_FIELDS.filter((f) => {
      const v = mapping[f]
      return v == null || v === ''
    })
  }, [mapping])

  const requiredSatisfied =
    !importBlocked && hasHeaderRow && missingRequired.length === 0

  const totalSpend = useMemo(() => {
    if (!built?.suppliers.length) return null
    return built.suppliers.reduce((s, r) => s + r.value_ex_vat, 0)
  }, [built])

  const uniqueSuppliers = built?.suppliers.length ?? 0

  const scorePreview = useMemo(() => {
    if (!built?.suppliers.length || tmpsTotal <= 0) return null
    const calculated = built.suppliers.map((r) => calculateSupplierRow(r))
    const totals = aggregateCategoryTotals(calculated)
    return calculateProcurementResults({
      totals,
      totalMeasuredSpend: tmpsTotal,
    })
  }, [built, tmpsTotal])

  const emptySupplierGuidance =
    parsed && !importBlocked && built
      ? built.emptyImportKind === 'header_only'
        ? PROCUREMENT_EXCEL_HEADER_ONLY_NO_DATA_ROWS
        : built.emptyImportKind === 'category_template'
          ? PROCUREMENT_EXCEL_NO_SUPPLIER_LINES_BELOW_HEADER
          : null
      : null

  const builtIssuesDisplay =
    !built?.issues.length
      ? []
      : !emptySupplierGuidance
        ? built.issues
        : built.issues.filter((i) => i.message !== emptySupplierGuidance)

  const handleApply = () => {
    if (!built?.suppliers.length || !requiredSatisfied || !parsed) return
    onApplySuppliers(toFormRows(built.suppliers), {
      workbookName: parsed.workbookName,
      sheetName: sheetChoice || parsed.selectedSheetName || '',
    })
    fileRef.current = null
    setParsed(null)
    setMapping({})
    setParseError(null)
    setSheetChoice('')
  }

  const onSheetSelectChange = (value: string) => {
    const file = fileRef.current
    if (!file) return
    runParse(file, value === '' ? null : value)
  }

  return (
    <div className="rounded-[28px] border border-slate-200/80 bg-gradient-to-b from-slate-50/60 to-white p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            <FileSpreadsheet className="h-3.5 w-3.5 text-[#0b5259]" aria-hidden />
            Excel import
          </p>
          <h3 className="mt-1.5 text-lg font-semibold tracking-tight text-slate-950">
            Upload a procurement workbook
          </h3>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-600">
            Optional path: we detect a supplier register tab, suggest column mappings, and can
            load supplier lines into this assessment. Your TMPS inputs above are still
            required to save. Manual entry below always remains available.
          </p>
        </div>
      </div>

      <div className="mt-5">
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white px-4 py-10 transition hover:border-[#0b5259]/40 hover:bg-slate-50/50">
          <input
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="sr-only"
            disabled={isPending}
            onChange={(e) => {
              onFile(e.target.files)
              e.target.value = ''
            }}
          />
          {isPending ? (
            <Loader2 className="h-8 w-8 animate-spin text-[#0b5259]" aria-hidden />
          ) : (
            <Upload className="h-8 w-8 text-slate-400" aria-hidden />
          )}
          <p className="mt-3 text-sm font-semibold text-slate-800">
            {isPending ? 'Reading workbook…' : 'Drop a file here or click to browse'}
          </p>
          <p className="mt-1 text-xs text-slate-500">.xlsx or .xls · supplier-style sheets</p>
        </label>
      </div>

      {parseError ? (
        <div
          className="mt-4 rounded-2xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          <div className="flex gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p>{parseError}</p>
          </div>
        </div>
      ) : null}

      {parsed ? (
        <div className="mt-6 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Detected file summary
            </p>

            {importBlocked ? (
              <div
                className="mt-3 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm leading-relaxed text-amber-950"
                role="status"
              >
                {blockedSupplierRegisterMessage(
                  parsed.supplierImportBlockedWorkbookContext,
                )}
              </div>
            ) : null}

            <div className="mt-4 space-y-2">
              <label
                htmlFor="procurement-excel-sheet"
                className="text-xs font-semibold text-slate-700"
              >
                Sheet used for suppliers
              </label>
              <select
                id="procurement-excel-sheet"
                disabled={isPending}
                value={sheetChoice}
                onChange={(e) => onSheetSelectChange(e.target.value)}
                className="w-full max-w-md rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0b5259]/60 focus:ring-2 focus:ring-[#0b5259]/15"
              >
                <option value="">Best matching tab (automatic)</option>
                {parsed.sheetNames.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">
                If the wrong tab was chosen, pick the sheet that has supplier names and spend
                in the header row. TMPS / finance summary tabs are for reference only.
              </p>
            </div>

            <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Workbook</dt>
                <dd className="font-medium text-slate-900">{parsed.workbookName}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Sheet used</dt>
                <dd className="font-medium text-slate-900">
                  {parsed.selectedSheetName ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Rows read</dt>
                <dd className="font-medium tabular-nums text-slate-900">
                  {parsed.dataRows.length}
                  {parsed.truncated ? ` (truncated; ${parsed.totalRowCountInSheet} in sheet)` : ''}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Detection</dt>
                <dd className="font-medium text-slate-900">
                  {detectionLabel(parsed.detectionMethod)}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-slate-500">Workbook tabs</dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {parsed.sheetNames.map((n) => (
                    <span
                      key={n}
                      className={
                        n === parsed.selectedSheetName
                          ? 'rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-900'
                          : 'rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600'
                      }
                    >
                      {n}
                    </span>
                  ))}
                </dd>
              </div>
            </dl>
            {parsed.suggestedTmpsTotal != null ? (
              <p className="mt-3 rounded-xl border border-amber-200/80 bg-amber-50/60 px-3 py-2 text-xs leading-relaxed text-amber-950">
                <span className="font-semibold">Possible TMPS figure in file: </span>
                {formatCurrency(parsed.suggestedTmpsTotal)}. This is not applied automatically—
                reconcile with your TMPS schedule and enter inclusions / exclusions above.
              </p>
            ) : null}
          </div>

          {emptySupplierGuidance ? (
            <div className="rounded-2xl border border-sky-200/80 bg-sky-50/70 px-4 py-3 text-sm leading-relaxed text-sky-950">
              <p className="font-medium">No supplier lines to import</p>
              <p className="mt-1 text-sky-900/90">{emptySupplierGuidance}</p>
            </div>
          ) : null}

          {hasHeaderRow ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Columns detected in header row
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {parsed.columnHeaders
                  .filter((h) => h.trim())
                  .map((h) => (
                    <li
                      key={h}
                      className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
                    >
                      {h}
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}

          {hasHeaderRow ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Column mapping
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Required fields must point at the correct columns. Optional fields improve
                recognition and category allocation.
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <th className="py-2 pr-3">Field</th>
                      <th className="py-2 pr-3">Detected column</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PROCUREMENT_EXCEL_MAPPED_FIELDS.map((field) => {
                      const meta = PROCUREMENT_EXCEL_FIELD_META[field]
                      const sel = mappingToSelectValue(
                        mapping,
                        field,
                        parsed.columnHeaders,
                      )
                      const found = Boolean(sel && sel !== NONE_VALUE)
                      return (
                        <tr key={field} className="border-b border-slate-100 last:border-0">
                          <td className="py-3 pr-3 align-middle">
                            {meta.label}
                            {meta.required ? (
                              <span className="ml-1 text-red-600" aria-hidden>
                                *
                              </span>
                            ) : null}
                          </td>
                          <td className="py-3 pr-3 align-middle">
                            <select
                              className="w-full max-w-[240px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#0b5259]/60 focus:ring-2 focus:ring-[#0b5259]/15"
                              value={sel}
                              onChange={(e) => updateMapping(field, e.target.value)}
                              aria-label={`Map column for ${meta.label}`}
                            >
                              <option value={NONE_VALUE}>
                                {meta.required ? '— Select column —' : '— Not mapped —'}
                              </option>
                              {parsed.columnHeaders
                                .filter((h) => h.trim())
                                .map((h) => (
                                  <option key={h} value={h}>
                                    {h}
                                  </option>
                                ))}
                            </select>
                          </td>
                          <td className="py-3 align-middle">
                            {found ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                                Found
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-800">
                                <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                                Needs mapping
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {requiredSatisfied === false && hasHeaderRow ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm leading-relaxed text-amber-950">
              <p className="font-semibold">Missing required columns</p>
              <p className="mt-2">
                We found procurement-related data, but some required fields are missing.
                Please confirm or map the missing columns so we can calculate the procurement
                score accurately.
              </p>
              <p className="mt-2 text-xs font-medium">
                Still needed:{' '}
                {missingRequired
                  .map((f) => PROCUREMENT_EXCEL_FIELD_META[f].label)
                  .join(', ')}
              </p>
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Warnings and notes
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
              {parsed.issues.length === 0 &&
              builtIssuesDisplay.length === 0 &&
              !(built?.rowWarnings?.length) ? (
                <li className="text-slate-500">No additional notes.</li>
              ) : null}
              {parsed.issues.map((issue, i) => (
                <li
                  key={i}
                  className={
                    issue.level === 'error'
                      ? 'text-red-700'
                      : issue.level === 'warning'
                        ? 'text-amber-800'
                        : 'text-slate-600'
                  }
                >
                  <span className="font-medium capitalize">{issue.level}: </span>
                  {issue.message}
                </li>
              ))}
              {builtIssuesDisplay.map((issue, i) => (
                <li key={`b-${i}`} className="text-amber-800">
                  <span className="font-medium capitalize">{issue.level}: </span>
                  {issue.message}
                </li>
              ))}
              {built?.rowWarnings?.slice(0, 8).map((w, i) => (
                <li key={`w-${i}`} className="text-slate-600">
                  {w}
                </li>
              ))}
              {built && (built.rowWarnings?.length ?? 0) > 8 ? (
                <li className="text-slate-500">
                  …and {(built.rowWarnings?.length ?? 0) - 8} more row messages (not shown).
                </li>
              ) : null}
            </ul>
            {parsed.emptyImportRowSkim && parsed.emptyImportRowSkim.length > 0 ? (
              <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800">
                <summary className="cursor-pointer font-semibold text-slate-700">
                  Import row diagnostics (first {parsed.emptyImportRowSkim.length} data rows)
                </summary>
                <p className="mt-2 text-slate-600">
                  Shown when the server could not load any supplier rows with auto-mapping. Each
                  line is one row after the header: supplier cell, spend cell, parsed spend, and
                  skip reason if the row was excluded.
                </p>
                <ul className="mt-2 max-h-64 space-y-1.5 overflow-y-auto font-mono text-[11px] leading-snug">
                  {parsed.emptyImportRowSkim.map((r) => (
                    <li key={r.dataRowIndex}>
                      <span className="text-slate-500">#{r.dataRowIndex}</span>{' '}
                      {r.included ? (
                        <span className="text-emerald-700">included</span>
                      ) : (
                        <span className="text-amber-800">skip: {r.skipReason ?? '—'}</span>
                      )}{' '}
                      <span className="text-slate-600">
                        supplier={formatCellPreview(r.supplierRaw)} · spend={formatCellPreview(r.spendRaw)} ·
                        parsed={r.spendParsed}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-900 bg-slate-950 px-4 py-5 text-slate-50 shadow-sm sm:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Procurement upload result
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs text-slate-400">Suppliers loaded</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-white">
                  {uniqueSuppliers}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Total spend (mapped)</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-white">
                  {totalSpend != null ? formatCurrency(totalSpend) : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">TMPS in form</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-white">
                  {tmpsTotal > 0 ? formatCurrency(tmpsTotal) : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Est. procurement points</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-white">
                  {scorePreview ? scorePreview.totalScore.toFixed(2) : '—'}
                </p>
              </div>
            </div>
            {hasHeaderRow ? (
              <div className="mt-4 space-y-2 border-t border-white/10 pt-4 text-xs leading-relaxed text-slate-400">
                <p>
                  <span className="font-semibold text-slate-300">Mapped fields: </span>
                  {PROCUREMENT_EXCEL_MAPPED_FIELDS.filter((f) => {
                    const v = mapping[f]
                    return v != null && v !== ''
                  })
                    .map((f) => PROCUREMENT_EXCEL_FIELD_META[f].label)
                    .join(', ') || '—'}
                </p>
                <p>
                  <span className="font-semibold text-slate-300">Missing required: </span>
                  {missingRequired.length
                    ? missingRequired
                        .map((f) => PROCUREMENT_EXCEL_FIELD_META[f].label)
                        .join(', ')
                    : 'None'}
                </p>
                <p className="text-slate-500">
                  Recognition percentages in the engine follow the B-BBEE level column when
                  mapped; a separate recognition % column is shown for transparency only.
                </p>
              </div>
            ) : null}
            {tmpsTotal <= 0 && requiredSatisfied && uniqueSuppliers > 0 ? (
              <p className="mt-3 text-xs leading-relaxed text-slate-400">
                Enter a positive TMPS total above to preview procurement points from this
                import.
              </p>
            ) : null}
            {scorePreview && tmpsTotal > 0 ? (
              <div className="mt-5 grid grid-cols-1 gap-2 border-t border-white/10 pt-4 md:grid-cols-2">
                {PROCUREMENT_CATEGORIES.map((def) => {
                  const cat = scorePreview.categories.find((c) => c.key === def.key)
                  if (!cat) return null
                  return (
                    <div
                      key={def.key}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs"
                    >
                      <p className="font-semibold text-white">{def.name}</p>
                      <p className="mt-1 tabular-nums text-slate-300">
                        {cat.pointsAchieved.toFixed(2)} / {def.availablePoints} pts · achieved{' '}
                        {formatPercentFromRatio(cat.achievedPercent, 1)}
                      </p>
                    </div>
                  )
                })}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              className={buttonStyles({
                variant: 'secondary',
                size: 'md',
                className: 'rounded-2xl',
              })}
              onClick={() => {
                fileRef.current = null
                setParsed(null)
                setMapping({})
                setParseError(null)
                setSheetChoice('')
              }}
            >
              Dismiss import
            </button>
            <button
              type="button"
              disabled={!requiredSatisfied || !built?.suppliers.length}
              className={buttonStyles({
                variant: 'primary',
                size: 'md',
                className: 'rounded-2xl font-semibold',
              })}
              onClick={handleApply}
            >
              Apply suppliers to this assessment
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
