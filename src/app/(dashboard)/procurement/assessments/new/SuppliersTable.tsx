'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  calculateSupplierRow,
  type ProcurementSupplierInput,
  type ProcurementSupplierWithCalculated,
} from '@/lib/procurement/rows'
import { formatCurrency } from '@/lib/procurement/format'
import type { SupplierFormRow } from '@/lib/procurement/supplierFormRow'
import type { Path, PathValue, UseFormSetValue } from 'react-hook-form'

export type { SupplierFormRow } from '@/lib/procurement/supplierFormRow'

interface SuppliersTableProps<
  FormValues extends Record<string, unknown>,
  TFieldName extends Path<FormValues>,
> {
  setValue: UseFormSetValue<FormValues>
  fieldName: TFieldName
  rows: SupplierFormRow[]
  onChangeRows(rows: SupplierFormRow[]): void
}

function createRowId() {
  return `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`
}

function parseBooleanFlag(value: string): boolean {
  const normalized = value.trim().toLowerCase()
  return ['1', 'true', 'yes', 'y'].includes(normalized)
}

/** Spreadsheet paste (Excel / Google Sheets) uses tab between columns. */
function splitLineIntoCells(line: string): string[] {
  if (line.includes('\t')) {
    return line.split('\t').map((c) => c.trim())
  }
  return parseCsvLine(line)
}

function parseCsvLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (char === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
      continue
    }
    current += char
  }

  values.push(current.trim())
  return values
}

/** Accepts plain numbers and common spreadsheet formats (spaces, thousand commas). */
function parseSpendCell(raw: string): number {
  const t = raw
    .trim()
    .replace(/\u00a0/g, ' ')
    .replace(/\s/g, '')
    .replace(/,/g, '')
  if (t === '' || t === '-') return 0
  const n = Number(t)
  return Number.isFinite(n) ? n : NaN
}

const HEADER_NAME_HINTS = new Set([
  'supplier name',
  'name',
  'supplier',
  'company',
  'vendor',
  'description',
])

const HEADER_SPEND_HINTS = new Set([
  'b-bbee spend',
  'bbee spend',
  'spend',
  'amount',
  'value',
  'ex-vat',
  'ex vat',
  'value ex vat',
  'total',
  'rand',
])

/** Maps pasted level text to internal select values (1–8, Non-Compliant). */
function normalizeBulkRecognitionLevel(raw: string): string {
  const s = raw.trim()
  if (!s) return 'Non-Compliant'
  if (s === 'Non-compliant' || s === 'Non-Compliant') return 'Non-Compliant'
  const lower = s.toLowerCase()
  if (lower === 'non-compliant' || lower === 'non compliant') return 'Non-Compliant'
  const levelWord = /^level\s*([1-8])$/i.exec(s)
  if (levelWord) return levelWord[1]
  if (/^[1-8]$/.test(s)) return s
  return 'Non-Compliant'
}

function isLikelyHeaderRow(cols: string[]): boolean {
  if (cols.length < 2) return false
  const a = (cols[0] ?? '').trim().toLowerCase()
  const b = (cols[1] ?? '').trim().toLowerCase()
  const looksName =
    HEADER_NAME_HINTS.has(a) ||
    (a.includes('supplier') && a.includes('name')) ||
    a === 'name'
  const looksSpend =
    HEADER_SPEND_HINTS.has(b) ||
    b.includes('spend') ||
    b.includes('amount') ||
    (b.includes('bbee') && b.includes('spend'))
  return looksName && looksSpend
}

type BulkImportResult = {
  rows: SupplierFormRow[]
  skippedBlankLines: number
  skippedHeaderRows: number
  skippedInvalidRows: number
  warnings: string[]
}

function parseBulkSuppliers(text: string): BulkImportResult {
  const warnings: string[] = []
  let skippedBlankLines = 0
  let skippedHeaderRows = 0
  let skippedInvalidRows = 0

  const rawLines = text.split(/\r\n|\n|\r/)
  const parsedRows: SupplierFormRow[] = []

  for (let lineIndex = 0; lineIndex < rawLines.length; lineIndex++) {
    const line = rawLines[lineIndex]
    const trimmed = line.trim()
    if (!trimmed) {
      skippedBlankLines++
      continue
    }

    const cols = splitLineIntoCells(trimmed)
    if (cols.length === 0) {
      skippedBlankLines++
      continue
    }

    if (isLikelyHeaderRow(cols)) {
      skippedHeaderRows++
      continue
    }

    const supplierName = (cols[0] ?? '').trim()
    if (!supplierName) {
      skippedInvalidRows++
      warnings.push(`Line ${lineIndex + 1}: skipped — missing supplier name in the first column.`)
      continue
    }

    const spendRaw = cols[1] ?? ''
    const spend = parseSpendCell(spendRaw)
    if (Number.isNaN(spend) || spend < 0) {
      skippedInvalidRows++
      warnings.push(
        `Line ${lineIndex + 1} (“${supplierName.slice(0, 40)}${supplierName.length > 40 ? '…' : ''}”): skipped — B-BBEE Spend must be a valid number.`,
      )
      continue
    }
    if (spend === 0) {
      skippedInvalidRows++
      warnings.push(
        `Line ${lineIndex + 1} (“${supplierName.slice(0, 40)}${supplierName.length > 40 ? '…' : ''}”): skipped — B-BBEE Spend must be greater than zero.`,
      )
      continue
    }

    const supplierTypeRaw = (cols[2] ?? 'Generic').trim().toUpperCase()
    const supplierType: SupplierFormRow['supplier_type'] =
      supplierTypeRaw === 'EME' || supplierTypeRaw === 'QSE' ? supplierTypeRaw : 'Generic'

    const levelRaw = (cols[3] ?? '').trim()
    const level = normalizeBulkRecognitionLevel(levelRaw)

    parsedRows.push({
      id: createRowId(),
      supplier_name: supplierName,
      value_ex_vat: spend,
      supplier_type: supplierType,
      level,
      is_51_black_owned: parseBooleanFlag(cols[4] ?? ''),
      is_30_black_women_owned: parseBooleanFlag(cols[5] ?? ''),
      is_51_bdgs: parseBooleanFlag(cols[6] ?? ''),
      supplier_code: cols[7] ?? '',
      vat_number: cols[8] ?? '',
      company_registration: cols[9] ?? '',
      bo_etc: cols[10] ?? '',
      fts: cols[11] ?? '',
      des: cols[12] ?? '',
      prop: cols[13] ?? '',
      expiry: cols[14] ?? '',
      empower: cols[15] ?? '',
    })
  }

  return {
    rows: parsedRows,
    skippedBlankLines,
    skippedHeaderRows,
    skippedInvalidRows,
    warnings,
  }
}

function describeBuckets(row: ProcurementSupplierWithCalculated): string {
  const buckets: string[] = []
  if (row.bbbee_spend > 0) buckets.push('B-BBEE spend')
  if (row.eme_amount > 0) buckets.push('EME')
  if (row.qse_amount > 0) buckets.push('QSE')
  if (row.black_owned_amount > 0) buckets.push('51% black owned (BO)')
  if (row.black_women_amount > 0) buckets.push('30% black women owned (BFO)')
  if (row.bdgs_amount > 0) buckets.push('51% black designated groups (BDG)')
  return buckets.join(' · ') || 'No recognised contribution'
}

const LEVEL_OPTIONS: { value: string; label: string }[] = [
  { value: '1', label: 'Level 1' },
  { value: '2', label: 'Level 2' },
  { value: '3', label: 'Level 3' },
  { value: '4', label: 'Level 4' },
  { value: '5', label: 'Level 5' },
  { value: '6', label: 'Level 6' },
  { value: '7', label: 'Level 7' },
  { value: '8', label: 'Level 8' },
  { value: 'Non-Compliant', label: 'Non-compliant' },
]

export function SuppliersTable<
  FormValues extends Record<string, unknown>,
  TFieldName extends Path<FormValues>,
>({
  setValue,
  fieldName,
  rows,
  onChangeRows,
}: SuppliersTableProps<FormValues, TFieldName>) {
  const [bulkText, setBulkText] = useState('')
  const [bulkError, setBulkError] = useState<string | null>(null)
  const [bulkInfo, setBulkInfo] = useState<string | null>(null)
  const [bulkWarnings, setBulkWarnings] = useState<string[]>([])
  const [spendDraftById, setSpendDraftById] = useState<Record<string, string>>({})
  const lastSuppliersJsonRef = useRef('')

  const calculatedRows = useMemo(() => {
    return rows.map((row) =>
      calculateSupplierRow({
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
      }),
    )
  }, [rows])

  useEffect(() => {
    const payload = rows.map<ProcurementSupplierInput>((row) => ({
      supplier_name: row.supplier_name ?? '',
      supplier_code: row.supplier_code,
      vat_number: row.vat_number,
      company_registration: row.company_registration,
      bo_etc: row.bo_etc,
      fts: row.fts,
      des: row.des,
      prop: row.prop,
      supplier_type: row.supplier_type ?? 'Generic',
      level: row.level ?? 'Non-Compliant',
      value_ex_vat: Number(row.value_ex_vat) || 0,
      is_51_black_owned: !!row.is_51_black_owned,
      is_30_black_women_owned: !!row.is_30_black_women_owned,
      is_51_bdgs: !!row.is_51_bdgs,
      expiry: row.expiry,
      empower: row.empower,
    }))

    const json = JSON.stringify(payload)
    if (json !== lastSuppliersJsonRef.current) {
      lastSuppliersJsonRef.current = json
      setValue(fieldName, json as unknown as PathValue<FormValues, TFieldName>)
    }
  }, [fieldName, rows, setValue])

  const addRow = useCallback(() => {
    const newRow: SupplierFormRow = {
      id: createRowId(),
      supplier_name: '',
      supplier_code: '',
      vat_number: '',
      company_registration: '',
      bo_etc: '',
      fts: '',
      des: '',
      prop: '',
      supplier_type: 'Generic',
      level: 'Non-Compliant',
      value_ex_vat: 0,
      is_51_black_owned: false,
      is_30_black_women_owned: false,
      is_51_bdgs: false,
      expiry: '',
      empower: '',
    }
    onChangeRows([...rows, newRow])
  }, [onChangeRows, rows])

  const updateRow = useCallback((id: string, patch: Partial<SupplierFormRow>) => {
    onChangeRows(
      rows.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    )
  }, [onChangeRows, rows])

  const removeRow = useCallback((id: string) => {
    setSpendDraftById((d) => {
      if (!(id in d)) return d
      const next = { ...d }
      delete next[id]
      return next
    })
    onChangeRows(rows.filter((row) => row.id !== id))
  }, [onChangeRows, rows])

  const appendBulkRows = useCallback(() => {
    setBulkError(null)
    setBulkInfo(null)
    setBulkWarnings([])
    const result = parseBulkSuppliers(bulkText)
    if (!result.rows.length) {
      setBulkError(
        'No importable rows found. Each line needs a supplier name and a positive B-BBEE Spend in columns 1 and 2. Header rows are skipped automatically.',
      )
      if (result.warnings.length) setBulkWarnings(result.warnings.slice(0, 12))
      return
    }
    onChangeRows([...rows, ...result.rows])
    setBulkText('')
    const parts: string[] = [`Added ${result.rows.length} supplier${result.rows.length === 1 ? '' : 's'}.`]
    if (result.skippedHeaderRows > 0) parts.push(`${result.skippedHeaderRows} header row(s) ignored.`)
    if (result.skippedBlankLines > 0) parts.push(`${result.skippedBlankLines} blank line(s) ignored.`)
    if (result.warnings.length > 0) {
      parts.push(`${result.warnings.length} line(s) skipped — see details below.`)
      setBulkWarnings(result.warnings.slice(0, 20))
    }
    setBulkInfo(parts.join(' '))
  }, [bulkText, onChangeRows, rows])

  const fieldClass =
    'w-full rounded-lg border border-slate-200/90 bg-white px-2.5 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200/70'
  const fieldClassCompact =
    'w-full rounded-lg border border-slate-200/90 bg-white px-2.5 py-1.5 text-xs text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200/70'

  const labelClass = 'text-xs font-medium text-slate-700'

  const FieldLabel = ({ children }: { children: ReactNode }) => (
    <span className={labelClass}>{children}</span>
  )

  const TwoCol = ({ children }: { children: ReactNode }) => (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
        >
          <Plus className="h-4 w-4" />
          Add supplier row
        </button>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-emerald-200/50 bg-gradient-to-b from-emerald-50/50 via-white to-white p-4 shadow-sm sm:p-5">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-emerald-500/85"
          aria-hidden
        />
        <div className="pl-2 sm:pl-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900/80">
              Import from spreadsheet
            </p>
            <p className="text-[11px] text-slate-500">
              CSV (commas) or TSV (tabs) — paste from Excel or Google Sheets
            </p>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-700">
            <span className="font-semibold text-slate-900">Columns, left to right:</span>{' '}
            1 Name · 2 B-BBEE Spend · 3 Type (EME / QSE / Generic) · 4 Level (1–8 or
            Non-compliant) · 5 BO · 6 BFO · 7 BDG · 8 Code · 9 VAT · 10 Registration · 11 BO
            etc · 12 FTS · 13 DES · 14 PROP · 15 Expiry · 16 Empower / notes. Leave unused
            trailing columns empty.
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
            <span className="font-medium text-slate-800">BO, BFO, BDG:</span>{' '}
            <span className="font-mono text-slate-700">yes</span>,{' '}
            <span className="font-mono text-slate-700">no</span>,{' '}
            <span className="font-mono text-slate-700">true</span>,{' '}
            <span className="font-mono text-slate-700">false</span>,{' '}
            <span className="font-mono text-slate-700">1</span>, or{' '}
            <span className="font-mono text-slate-700">0</span>. Anything else is treated as
            no. Header rows are skipped when detected.
          </p>
        </div>
        <textarea
          value={bulkText}
          onChange={(e) => {
            setBulkText(e.target.value)
            setBulkError(null)
            setBulkInfo(null)
            setBulkWarnings([])
          }}
          rows={5}
          className="mt-4 w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-xs text-slate-900 shadow-sm outline-none transition focus:border-emerald-400/80 focus:ring-2 focus:ring-emerald-200/70"
          placeholder={
            'Example (tabs or commas):\nAcme Supplies\t125000.50\tGeneric\t4\tyes\tno\tno\nBeta Logistics,89000,QSE,2,no,yes,no'
          }
          aria-label="Bulk supplier paste from spreadsheet"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={appendBulkRows}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200/80 bg-emerald-700/5 px-4 py-2 text-xs font-semibold text-emerald-950 shadow-sm transition hover:bg-emerald-700/10"
          >
            <Plus className="h-3.5 w-3.5" />
            Add pasted rows
          </button>
          {bulkError ? (
            <p className="text-xs font-medium text-red-600">{bulkError}</p>
          ) : null}
          {bulkInfo ? (
            <p className="text-xs font-medium text-emerald-800">{bulkInfo}</p>
          ) : null}
        </div>
        {bulkWarnings.length > 0 ? (
          <div
            className="mt-3 rounded-xl border border-amber-200/90 bg-amber-50/80 px-3 py-2"
            role="status"
          >
            <p className="text-[11px] font-semibold text-amber-950">Import notes</p>
            <ul className="mt-1.5 max-h-40 list-disc space-y-1 overflow-y-auto pl-4 text-[11px] leading-relaxed text-amber-950/90">
              {bulkWarnings.map((w, idx) => (
                <li key={`${idx}-${w.slice(0, 24)}`}>{w}</li>
              ))}
            </ul>
            {bulkWarnings.length >= 20 ? (
              <p className="mt-2 text-[10px] text-amber-900/80">
                Showing the first 20 messages. Fix the paste and import again to clear warnings.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="space-y-3">
        {rows.map((row, i) => {
          const calc = calculatedRows[i]
          const supplierTitle = row.supplier_name?.trim()
            ? row.supplier_name.trim()
            : `Supplier ${i + 1}`

          return (
            <div
              key={row.id}
              className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                      <span className="text-sm font-semibold text-slate-700">
                        {i + 1}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {supplierTitle}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">
                        {(calc.recognition_percent * 100).toFixed(0)}% recognition · B-BBEE spend{' '}
                        {formatCurrency(calc.bbbee_spend)}
                        {row.value_ex_vat ? '' : ' · enter B-BBEE Spend to calculate'}
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  className="self-start rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                  aria-label="Remove supplier"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                {/* Supplier identity */}
                <div className="rounded-xl border border-slate-200/70 bg-slate-50/40 p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Supplier details
                    </p>
                  </div>

                  <TwoCol>
                    <div className="space-y-1.5">
                      <label className="block">
                        <FieldLabel>Supplier name</FieldLabel>
                      </label>
                      <input
                        value={row.supplier_name}
                        onChange={(e) =>
                          updateRow(row.id, {
                            supplier_name: e.target.value,
                          })
                        }
                        className={fieldClass}
                        placeholder="Name"
                        aria-label="Supplier name"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block">
                        <FieldLabel>Code</FieldLabel>
                      </label>
                      <input
                        value={row.supplier_code ?? ''}
                        onChange={(e) =>
                          updateRow(row.id, { supplier_code: e.target.value })
                        }
                        className={fieldClassCompact}
                        placeholder="e.g. Supplier code"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block">
                        <FieldLabel>VAT</FieldLabel>
                      </label>
                      <input
                        value={row.vat_number ?? ''}
                        onChange={(e) =>
                          updateRow(row.id, { vat_number: e.target.value })
                        }
                        className={fieldClassCompact}
                        placeholder="VAT number"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block">
                        <FieldLabel>Registration</FieldLabel>
                      </label>
                      <input
                        value={row.company_registration ?? ''}
                        onChange={(e) =>
                          updateRow(row.id, {
                            company_registration: e.target.value,
                          })
                        }
                        className={fieldClassCompact}
                        placeholder="Company registration"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="block">
                        <FieldLabel>BO etc</FieldLabel>
                      </label>
                      <input
                        value={row.bo_etc ?? ''}
                        onChange={(e) =>
                          updateRow(row.id, { bo_etc: e.target.value })
                        }
                        className={fieldClassCompact}
                        placeholder="Black ownership / verification notes"
                      />
                    </div>
                  </TwoCol>
                </div>

                {/* Classification + value */}
                <div className="rounded-xl border border-slate-200/70 bg-slate-50/40 p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Classification & allocation
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    <div className="space-y-3">
                      <TwoCol>
                        <div className="space-y-1.5">
                          <label className="block">
                            <FieldLabel>FTS</FieldLabel>
                          </label>
                          <input
                            value={row.fts ?? ''}
                            onChange={(e) =>
                              updateRow(row.id, { fts: e.target.value })
                            }
                            className={fieldClassCompact}
                            placeholder="FTS"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block">
                            <FieldLabel>DES</FieldLabel>
                          </label>
                          <input
                            value={row.des ?? ''}
                            onChange={(e) =>
                              updateRow(row.id, { des: e.target.value })
                            }
                            className={fieldClassCompact}
                            placeholder="DES"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block">
                            <FieldLabel>PROP</FieldLabel>
                          </label>
                          <input
                            value={row.prop ?? ''}
                            onChange={(e) =>
                              updateRow(row.id, { prop: e.target.value })
                            }
                            className={fieldClassCompact}
                            placeholder="PROP"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block">
                            <FieldLabel>Supplier type</FieldLabel>
                          </label>
                          <select
                            value={row.supplier_type}
                            onChange={(e) =>
                              updateRow(row.id, {
                                supplier_type:
                                  e.target.value as SupplierFormRow['supplier_type'],
                              })
                            }
                            className={fieldClassCompact}
                            aria-label="Supplier type"
                          >
                            <option value="EME">EME</option>
                            <option value="QSE">QSE</option>
                            <option value="Generic">Generic</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block">
                            <FieldLabel>Recognition level</FieldLabel>
                          </label>
                          <select
                            value={row.level}
                            onChange={(e) =>
                              updateRow(row.id, { level: e.target.value })
                            }
                            className={fieldClassCompact}
                            aria-label="Recognition level"
                          >
                            {LEVEL_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block">
                            <FieldLabel>B-BBEE Spend</FieldLabel>
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            autoComplete="off"
                            value={
                              spendDraftById[row.id] !== undefined
                                ? spendDraftById[row.id]
                                : row.value_ex_vat === 0
                                  ? ''
                                  : String(row.value_ex_vat)
                            }
                            onChange={(e) => {
                              const raw = e.target.value
                              setSpendDraftById((d) => ({ ...d, [row.id]: raw }))
                              if (raw === '' || raw === '.') {
                                updateRow(row.id, { value_ex_vat: 0 })
                                return
                              }
                              const cleaned = raw.replace(/,/g, '').replace(/\s/g, '')
                              const n = parseFloat(cleaned)
                              if (Number.isFinite(n)) {
                                updateRow(row.id, { value_ex_vat: n })
                              }
                            }}
                            onBlur={(e) => {
                              const raw = e.target.value
                              setSpendDraftById((d) => {
                                const next = { ...d }
                                delete next[row.id]
                                return next
                              })
                              const cleaned = raw.replace(/,/g, '').replace(/\s/g, '')
                              if (raw === '' || raw === '.') {
                                updateRow(row.id, { value_ex_vat: 0 })
                                return
                              }
                              const n = parseFloat(cleaned)
                              updateRow(row.id, {
                                value_ex_vat: Number.isFinite(n) ? n : 0,
                              })
                            }}
                            className={`${fieldClassCompact} text-right tabular-nums`}
                            aria-label="Supplier B-BBEE spend"
                          />
                        </div>
                      </TwoCol>
                    </div>

                    {/* Ownership flags */}
                    <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Ownership flags
                      </p>
                      <p className="mt-1 text-[11px] leading-snug text-slate-500">
                        Tick where applicable for this supplier line.
                      </p>

                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200/80 bg-white px-2.5 py-2 text-xs text-slate-800 shadow-sm transition hover:border-slate-300">
                          <input
                            type="checkbox"
                            checked={row.is_51_black_owned}
                            onChange={(e) =>
                              updateRow(row.id, {
                                is_51_black_owned: e.target.checked,
                              })
                            }
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          51% black owned (BO)
                        </label>

                        <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200/80 bg-white px-2.5 py-2 text-xs text-slate-800 shadow-sm transition hover:border-slate-300">
                          <input
                            type="checkbox"
                            checked={row.is_30_black_women_owned}
                            onChange={(e) =>
                              updateRow(row.id, {
                                is_30_black_women_owned: e.target.checked,
                              })
                            }
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          30% black women owned (BFO)
                        </label>

                        <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200/80 bg-white px-2.5 py-2 text-xs text-slate-800 shadow-sm transition hover:border-slate-300 sm:col-span-2">
                          <input
                            type="checkbox"
                            checked={row.is_51_bdgs}
                            onChange={(e) =>
                              updateRow(row.id, {
                                is_51_bdgs: e.target.checked,
                              })
                            }
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          51% black designated groups (BDG)
                        </label>
                      </div>

                      <div className="mt-3 space-y-2">
                        <div className="space-y-1.5">
                          <label className="block">
                            <FieldLabel>Expiry</FieldLabel>
                          </label>
                          <input
                            type="date"
                            value={row.expiry ?? ''}
                            onChange={(e) =>
                              updateRow(row.id, { expiry: e.target.value })
                            }
                            className={fieldClassCompact}
                            aria-label="Supplier expiry"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block">
                            <FieldLabel>Empower / notes</FieldLabel>
                          </label>
                          <textarea
                            value={row.empower ?? ''}
                            onChange={(e) =>
                              updateRow(row.id, { empower: e.target.value })
                            }
                            rows={2}
                            className={`${fieldClassCompact} min-h-[52px]`}
                            aria-label="Supplier empower notes"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recognition summary */}
                <div className="rounded-xl border border-slate-200/70 bg-slate-50/40 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Recognition summary
                  </p>

                  <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Recognition
                      </p>
                      <p className="mt-1 tabular-nums text-lg font-semibold text-slate-900">
                        {(calc.recognition_percent * 100).toFixed(0)}%
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        B-BBEE spend
                      </p>
                      <p className="mt-1 tabular-nums text-lg font-semibold text-slate-900">
                        {formatCurrency(calc.bbbee_spend)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 sm:col-span-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                        Contribution buckets
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">
                        {describeBuckets(calc)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200/90 bg-gradient-to-b from-slate-50/80 to-white px-5 py-8 text-center">
          <p className="text-sm font-semibold text-slate-800">Start with your supplier list</p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-600">
            Add rows manually, or paste from a spreadsheet using the import block above. Each row
            needs a name and a positive B-BBEE Spend amount.
          </p>
        </div>
      ) : null}
    </div>
  )
}
