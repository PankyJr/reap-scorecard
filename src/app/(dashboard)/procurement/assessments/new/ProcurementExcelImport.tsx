'use client'

import { useCallback, useMemo, useRef, useState, useTransition } from 'react'
import { flushSync } from 'react-dom'
import {
  aggregateCategoryTotals,
  calculateProcurementResults,
} from '@/lib/procurement/assessment'
import { calculateSupplierRow } from '@/lib/procurement/rows'
import { formatCurrency } from '@/lib/procurement/format'
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
import { ProcurementScorecardTable } from '@/components/procurement/ProcurementScorecardTable'

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
    is_51_percent_flow_through: !!s.is_51_percent_flow_through,
    expiry: '',
    empower: '',
  }))
}

const NONE_VALUE = ''

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

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
  const [sheetFilter, setSheetFilter] = useState('')
  const [columnHeaderFilter, setColumnHeaderFilter] = useState('')
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)
  const fileRef = useRef<File | null>(null)

  const clearSelectedFile = useCallback(() => {
    fileRef.current = null
    setSelectedFileName(null)
    setParseError(null)
    setParsed(null)
    setMapping({})
    setSheetChoice('')
    setSheetFilter('')
    setColumnHeaderFilter('')
  }, [])

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
      setSheetFilter('')
      setColumnHeaderFilter('')
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

      if (file.size > MAX_UPLOAD_BYTES) {
        setParseError(
          `This file is too large (${formatFileSize(file.size)}). Please use a workbook under ${formatFileSize(MAX_UPLOAD_BYTES)}.`,
        )
        return
      }

      fileRef.current = file
      setSelectedFileName(file.name)
      setParseError(null)
      setParsed(null)
      setMapping({})
      setSheetChoice('')
      setSheetFilter('')
      setColumnHeaderFilter('')
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
  const flowThroughSuppliers =
    built?.suppliers.filter((supplier) => supplier.is_51_percent_flow_through)
      .length ?? 0

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

  const filteredSheetNames = useMemo(() => {
    if (!parsed) return []
    const all = parsed.sheetNames
    const q = sheetFilter.trim().toLowerCase()
    const base = !q ? all : all.filter((n) => n.toLowerCase().includes(q))
    const sel = sheetChoice.trim()
    if (sel && all.includes(sel) && !base.includes(sel)) {
      return [sel, ...base]
    }
    return base
  }, [parsed, sheetFilter, sheetChoice])

  const displayHeaders = useMemo(() => {
    if (!parsed) return []
    const raw = parsed.columnHeaders.filter((h) => h.trim())
    const q = columnHeaderFilter.trim().toLowerCase()
    const base = !q ? raw : raw.filter((h) => h.toLowerCase().includes(q))
    const pinned: string[] = []
    for (const f of PROCUREMENT_EXCEL_MAPPED_FIELDS) {
      const v = mapping[f]
      if (typeof v === 'string' && v && raw.includes(v) && !base.includes(v)) {
        pinned.push(v)
      }
    }
    if (pinned.length) {
      const pinSet = new Set(pinned)
      const rest = base.filter((h) => !pinSet.has(h))
      return [...pinned, ...rest]
    }
    return base
  }, [parsed, columnHeaderFilter, mapping])

  const handleApply = () => {
    if (!built?.suppliers.length || !requiredSatisfied || !parsed) return
    try {
      flushSync(() => {
        onApplySuppliers(toFormRows(built.suppliers), {
          workbookName: parsed.workbookName,
          sheetName: sheetChoice || parsed.selectedSheetName || '',
        })
      })
      fileRef.current = null
      setSelectedFileName(null)
      setParsed(null)
      setMapping({})
      setParseError(null)
      setSheetChoice('')
      setSheetFilter('')
      setColumnHeaderFilter('')
    } catch (err) {
      setParseError(
        err instanceof Error
          ? err.message
          : 'Could not apply imported suppliers. Try a smaller file or fewer rows.',
      )
      return
    }
    queueMicrotask(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          document
            .getElementById('procurement-supplier-find-anchor')
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
      })
    })
  }

  const onSheetSelectChange = (value: string) => {
    const file = fileRef.current
    if (!file) return
    runParse(file, value === '' ? null : value)
  }

  return (
    <div className="rounded-[28px] border border-line/80 bg-gradient-to-b from-slate-50/60 to-white p-4 sm:p-5 shadow-sm" data-tour="upload">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-sm font-medium text-muted">
            <FileSpreadsheet className="h-3.5 w-3.5 text-brand" aria-hidden />
            Excel import
          </p>
          <h3 className="mt-1.5 text-lg font-semibold tracking-tight text-ink">
            Upload a procurement workbook
          </h3>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">
            Optional path: we detect a supplier register tab, suggest column mappings, and can
            load supplier lines into this assessment. Your TMPS inputs above are still
            required to save. Manual entry below always remains available.
          </p>
        </div>
      </div>

      <div className="mt-5">
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line bg-surface px-4 py-10 transition hover:border-brand/40 hover:bg-sunken/50">
          <input
            type="file"
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
            className="sr-only"
            disabled={isPending}
            onChange={(e) => {
              onFile(e.target.files)
              e.target.value = ''
            }}
          />
          {isPending ? (
            <Loader2 className="h-8 w-8 animate-spin text-brand" aria-hidden />
          ) : (
            <Upload className="h-8 w-8 text-faint" aria-hidden />
          )}
          <p className="mt-3 text-sm font-semibold text-ink">
            {isPending ? 'Reading workbook…' : 'Drop a file here or click to browse'}
          </p>
          <p className="mt-1 text-sm text-muted">
            .xlsx, .xls or .csv · supplier register tab · max {formatFileSize(MAX_UPLOAD_BYTES)}
          </p>
          {selectedFileName ? (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <span className="rounded-full border border-line bg-sunken px-3 py-1 text-sm font-medium text-ink">
                {selectedFileName}
              </span>
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault()
                  clearSelectedFile()
                }}
                className="text-sm font-semibold text-muted underline-offset-2 hover:text-ink hover:underline"
              >
                Remove file
              </button>
            </div>
          ) : null}
        </label>
      </div>

      {parseError ? (
        <div
          className="mt-4 rounded-2xl border border-bad/30 bg-bad-soft/90 px-4 py-3 text-sm text-bad"
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
          <div className="rounded-2xl border border-line bg-surface px-4 py-4 shadow-sm sm:px-5">
            <p className="text-sm font-medium text-muted">
              Detected file summary
            </p>

            {importBlocked ? (
              <div
                className="mt-3 rounded-xl border border-warn/30 bg-warn-soft/90 px-4 py-3 text-sm leading-relaxed text-warn"
                role="status"
              >
                {blockedSupplierRegisterMessage(
                  parsed.supplierImportBlockedWorkbookContext,
                )}
              </div>
            ) : null}

            <div className="mt-4 space-y-2">
              <label
                htmlFor="procurement-excel-sheet-search"
                className="text-sm font-semibold text-ink"
              >
                Sheet used for suppliers
              </label>
              <input
                id="procurement-excel-sheet-search"
                type="search"
                disabled={isPending}
                value={sheetFilter}
                onChange={(e) => setSheetFilter(e.target.value)}
                placeholder="Search workbook tabs…"
                autoComplete="off"
                className="mt-1 w-full max-w-md rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none transition focus:border-brand/60 focus:ring-2 focus:ring-brand/15 disabled:opacity-60"
              />
              <div
                role="listbox"
                aria-label="Workbook tabs"
                className="max-h-48 max-w-md overflow-y-auto rounded-xl border border-line bg-sunken/80 p-2"
              >
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => onSheetSelectChange('')}
                  className={[
                    'w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition',
                    sheetChoice === ''
                      ? 'bg-brand text-white shadow-sm'
                      : 'bg-surface text-ink hover:bg-sunken',
                  ].join(' ')}
                >
                  Best matching tab (automatic)
                </button>
                {filteredSheetNames.length === 0 ? (
                  <p className="mt-2 px-2 py-3 text-center text-sm text-muted">
                    No tabs match your search. Clear the search or pick automatic.
                  </p>
                ) : (
                  filteredSheetNames.map((n) => (
                    <button
                      key={n}
                      type="button"
                      disabled={isPending}
                      onClick={() => onSheetSelectChange(n)}
                      className={[
                        'mt-1 w-full rounded-lg px-3 py-2.5 text-left text-sm transition',
                        sheetChoice === n
                          ? 'bg-brand text-white shadow-sm'
                          : 'bg-surface text-ink hover:bg-sunken',
                      ].join(' ')}
                    >
                      {n}
                    </button>
                  ))
                )}
              </div>
              <p className="text-sm text-muted">
                If the wrong tab was chosen, pick the sheet that has supplier names and spend
                in the header row. TMPS / finance summary tabs are for reference only. Use the
                search box to narrow long tab lists; click outside or Tab away when done.
              </p>
            </div>

            <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted">Workbook</dt>
                <dd className="font-medium text-ink">{parsed.workbookName}</dd>
              </div>
              <div>
                <dt className="text-muted">Sheet used</dt>
                <dd className="font-medium text-ink">
                  {parsed.selectedSheetName ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Rows read</dt>
                <dd className="font-medium tabular-nums text-ink">
                  {parsed.dataRows.length}
                  {parsed.truncated ? ` (truncated; ${parsed.totalRowCountInSheet} in sheet)` : ''}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Detection</dt>
                <dd className="font-medium text-ink">
                  {detectionLabel(parsed.detectionMethod)}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted">Workbook tabs</dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {parsed.sheetNames.map((n) => (
                    <span
                      key={n}
                      className={
                        n === parsed.selectedSheetName
                          ? 'rounded-full border border-ok/30 bg-ok-soft px-2 py-0.5 text-sm font-medium text-ok'
                          : 'rounded-full border border-line bg-sunken px-2 py-0.5 text-sm font-medium text-muted'
                      }
                    >
                      {n}
                    </span>
                  ))}
                </dd>
              </div>
            </dl>
            {parsed.suggestedTmpsTotal != null ? (
              <p className="mt-3 rounded-xl border border-warn/30 bg-warn-soft/60 px-3 py-2 text-sm leading-relaxed text-warn">
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
            <div className="rounded-2xl border border-line bg-surface px-4 py-4 shadow-sm sm:px-5">
              <p className="text-sm font-medium text-muted">
                Columns detected in header row
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {parsed.columnHeaders
                  .filter((h) => h.trim())
                  .map((h) => (
                    <li
                      key={h}
                      className="rounded-full border border-line bg-sunken px-2.5 py-1 text-sm font-medium text-ink"
                    >
                      {h}
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}

          {hasHeaderRow ? (
            <div className="rounded-2xl border border-line bg-surface px-4 py-4 shadow-sm sm:px-5">
              <p className="text-sm font-medium text-muted">
                Column mapping
              </p>
              <p className="mt-1 text-sm text-muted">
                Required fields must point at the correct columns. Optional fields improve
                recognition and category allocation.
              </p>
              <div className="mt-4 max-w-md">
                <label
                  htmlFor="procurement-excel-column-filter"
                  className="text-sm font-semibold text-ink"
                >
                  Find column name
                </label>
                <input
                  id="procurement-excel-column-filter"
                  type="search"
                  value={columnHeaderFilter}
                  onChange={(e) => setColumnHeaderFilter(e.target.value)}
                  placeholder="Type to narrow dropdown lists…"
                  autoComplete="off"
                  className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition focus:border-brand/60 focus:ring-2 focus:ring-brand/15"
                />
                <p className="mt-1 text-sm text-muted">
                  Mapped columns stay in each list even when they do not match the filter. Press{' '}
                  <kbd className="rounded border border-line-strong bg-sunken px-1 py-0.5 font-mono text-sm">
                    Esc
                  </kbd>{' '}
                  in a dropdown to close it quickly.
                </p>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-sm font-semibold  text-muted">
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
                        <tr key={field} className="border-b border-line last:border-0">
                          <td className="py-3 pr-3 align-middle">
                            {meta.label}
                            {meta.required ? (
                              <span className="ml-1 text-bad" aria-hidden>
                                *
                              </span>
                            ) : null}
                          </td>
                          <td className="py-3 pr-3 align-middle">
                            <select
                              className="w-full max-w-[240px] rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand/60 focus:ring-2 focus:ring-brand/15"
                              value={sel}
                              onChange={(e) => updateMapping(field, e.target.value)}
                              aria-label={`Map column for ${meta.label}`}
                            >
                              <option value={NONE_VALUE}>
                                {meta.required ? '— Select column —' : '— Not mapped —'}
                              </option>
                              {displayHeaders.map((h) => (
                                <option key={h} value={h}>
                                  {h}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3 align-middle">
                            {found ? (
                              <span className="inline-flex items-center gap-1 text-sm font-medium text-ok">
                                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                                Found
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-sm font-medium text-warn">
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
            <div className="rounded-2xl border border-warn/30 bg-warn-soft/80 px-4 py-3 text-sm leading-relaxed text-warn">
              <p className="font-semibold">Missing required columns</p>
              <p className="mt-2">
                We found procurement-related data, but some required fields are missing.
                Please confirm or map the missing columns so we can calculate the procurement
                score accurately.
              </p>
              <p className="mt-2 text-sm font-medium">
                Still needed:{' '}
                {missingRequired
                  .map((f) => PROCUREMENT_EXCEL_FIELD_META[f].label)
                  .join(', ')}
              </p>
            </div>
          ) : null}

          <div className="rounded-2xl border border-line bg-surface px-4 py-4 shadow-sm sm:px-5">
            <p className="text-sm font-medium text-muted">
              Warnings and notes
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-ink">
              {parsed.issues.length === 0 &&
              builtIssuesDisplay.length === 0 &&
              !(built?.rowWarnings?.length) ? (
                <li className="text-muted">No additional notes.</li>
              ) : null}
              {parsed.issues.map((issue, i) => (
                <li
                  key={i}
                  className={
                    issue.level === 'error'
                      ? 'text-bad'
                      : issue.level === 'warning'
                        ? 'text-warn'
                        : 'text-muted'
                  }
                >
                  <span className="font-medium capitalize">{issue.level}: </span>
                  {issue.message}
                </li>
              ))}
              {builtIssuesDisplay.map((issue, i) => (
                <li key={`b-${i}`} className="text-warn">
                  <span className="font-medium capitalize">{issue.level}: </span>
                  {issue.message}
                </li>
              ))}
              {built?.rowWarnings?.slice(0, 8).map((w, i) => (
                <li key={`w-${i}`} className="text-muted">
                  {w}
                </li>
              ))}
              {built && (built.rowWarnings?.length ?? 0) > 8 ? (
                <li className="text-muted">
                  …and {(built.rowWarnings?.length ?? 0) - 8} more row messages (not shown).
                </li>
              ) : null}
            </ul>
            {parsed.emptyImportRowSkim && parsed.emptyImportRowSkim.length > 0 ? (
              <details className="mt-3 rounded-lg border border-line bg-sunken px-3 py-2 text-sm text-ink">
                <summary className="cursor-pointer font-semibold text-ink">
                  Import row diagnostics (first {parsed.emptyImportRowSkim.length} data rows)
                </summary>
                <p className="mt-2 text-muted">
                  Shown when the server could not load any supplier rows with auto-mapping. Each
                  line is one row after the header: supplier cell, spend cell, parsed spend, and
                  skip reason if the row was excluded.
                </p>
                <ul className="mt-2 max-h-64 space-y-1.5 overflow-y-auto font-mono text-sm leading-snug">
                  {parsed.emptyImportRowSkim.map((r) => (
                    <li key={r.dataRowIndex}>
                      <span className="text-muted">#{r.dataRowIndex}</span>{' '}
                      {r.included ? (
                        <span className="text-ok">included</span>
                      ) : (
                        <span className="text-warn">skip: {r.skipReason ?? '—'}</span>
                      )}{' '}
                      <span className="text-muted">
                        supplier={formatCellPreview(r.supplierRaw)} · spend={formatCellPreview(r.spendRaw)} ·
                        parsed={r.spendParsed}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>

          <div className="rounded-2xl border border-brand bg-brand px-4 py-5 text-slate-50 shadow-sm sm:px-6">
            <p className="text-sm font-medium text-faint">
              Procurement upload result
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-faint">Suppliers loaded</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-white">
                  {uniqueSuppliers}
                </p>
              </div>
              <div>
                <p className="text-sm text-faint">Total spend (mapped)</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-white">
                  {totalSpend != null ? formatCurrency(totalSpend) : '—'}
                </p>
              </div>
              <div>
                <p className="text-sm text-faint">TMPS in form</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-white">
                  {tmpsTotal > 0 ? formatCurrency(tmpsTotal) : '—'}
                </p>
              </div>
              <div>
                <p className="text-sm text-faint">Est. procurement points</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-white">
                  {scorePreview ? scorePreview.totalScore.toFixed(2) : '—'}
                </p>
              </div>
            </div>
            {hasHeaderRow ? (
              <div className="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm leading-relaxed text-faint">
                <p>
                  <span className="font-semibold text-faint">Mapped fields: </span>
                  {PROCUREMENT_EXCEL_MAPPED_FIELDS.filter((f) => {
                    const v = mapping[f]
                    return v != null && v !== ''
                  })
                    .map((f) => PROCUREMENT_EXCEL_FIELD_META[f].label)
                    .join(', ') || '—'}
                </p>
                <p>
                  <span className="font-semibold text-faint">Missing required: </span>
                  {missingRequired.length
                    ? missingRequired
                        .map((f) => PROCUREMENT_EXCEL_FIELD_META[f].label)
                        .join(', ')
                    : 'None'}
                </p>
                <p>
                  <span className="font-semibold text-faint">51% Flow Through: </span>
                  {flowThroughSuppliers} supplier{flowThroughSuppliers === 1 ? '' : 's'} enabled
                </p>
                <p className="text-muted">
                  Recognition percentages in the engine follow the B-BBEE level column when
                  mapped; a separate recognition % column is shown for transparency only.
                </p>
              </div>
            ) : null}
            {tmpsTotal <= 0 && requiredSatisfied && uniqueSuppliers > 0 ? (
              <p className="mt-3 text-sm leading-relaxed text-faint">
                Enter a positive TMPS total above to preview procurement points from this
                import.
              </p>
            ) : null}
            {scorePreview && tmpsTotal > 0 ? (
              <div className="mt-5 border-t border-white/10 pt-4">
                <ProcurementScorecardTable
                  result={scorePreview}
                  tmpsDenominatorNote={`Preview uses TMPS ${formatCurrency(tmpsTotal)} from the assessment form (Step 2).`}
                />
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
